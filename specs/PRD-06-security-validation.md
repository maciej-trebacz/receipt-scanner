# PRD-06: Security & Validation

**Priority**: HIGH
**Dependencies**: PRD-01 (Authentication)
**Blocks**: None
**Can Run In Parallel With**: PRD-07, PRD-08, PRD-09, PRD-10

---

## Overview

Harden the application with input validation, rate limiting, and security headers before production launch.

## Current State

- Minimal input validation (only checks required fields)
- No rate limiting on any endpoint
- Basic path traversal check in image serving
- No security headers configured
- No request logging

## Requirements

### 1. Input Validation (Zod)

All user inputs must be validated:

| Endpoint | Fields to Validate |
|----------|-------------------|
| `POST /api/receipts` | storeName (max 200), total (positive), currency (enum), date (not future) |
| `PUT /api/receipts/[id]` | All receipt fields + items array |
| `POST /api/receipts/queue` | File type, file size |
| `GET /api/receipts` | limit (1-50), cursor (valid date) |
| `GET /api/reports` | period (enum), offset (integer) |

### 2. Rate Limiting

| Endpoint Pattern | Limit | Window | Notes |
|-----------------|-------|--------|-------|
| `POST /api/receipts/queue` | 10 | concurrent | Max 10 processing at once, queue excess |
| `POST /api/checkout` | 5 | 1 minute | Prevent payment spam |
| `POST /api/*` (mutations) | 30 | 1 minute | General mutation limit |
| `GET /api/*` (reads) | 100 | 1 minute | General read limit |

**Concurrent Upload Handling**: If user tries to upload more than 10 receipts while 10 are already processing, show message: "Please wait for current batch to finish processing."

### 3. Security Headers

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; img-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';
```

### 4. Multi-Currency Support

- Supported currencies: PLN, USD, EUR
- Store currency per receipt (already exists)
- Display in original currency
- User preference for default currency

## Technical Specification

### Dependencies

```bash
bun add zod @upstash/ratelimit @upstash/redis
```

### Files to Create

#### `lib/validations.ts`

```typescript
import { z } from 'zod';

export const SUPPORTED_CURRENCIES = ['PLN', 'USD', 'EUR'] as const;
export type Currency = typeof SUPPORTED_CURRENCIES[number];

export const receiptSchema = z.object({
  storeName: z.string().min(1).max(200),
  storeAddress: z.string().max(500).optional().nullable(),
  date: z.coerce.date().max(new Date(), 'Date cannot be in the future'),
  currency: z.enum(SUPPORTED_CURRENCIES).default('PLN'),
  subtotal: z.number().nonnegative().max(10000000).optional().nullable(),
  tax: z.number().nonnegative().max(10000000).optional().nullable(),
  total: z.number().positive().max(10000000),
  notes: z.string().max(2000).optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
});

export const receiptItemSchema = z.object({
  name: z.string().min(1).max(200),
  inferredName: z.string().max(200).optional().nullable(),
  productType: z.string().max(100).optional().nullable(),
  quantity: z.number().positive().max(10000).default(1),
  unitPrice: z.number().nonnegative().max(10000000).optional().nullable(),
  totalPrice: z.number().nonnegative().max(10000000),
  discount: z.number().nonnegative().max(10000000).optional().nullable(),
});

export const receiptWithItemsSchema = receiptSchema.extend({
  items: z.array(receiptItemSchema).max(500),
});

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().datetime().optional(),
});

export const reportParamsSchema = z.object({
  period: z.enum(['week', 'month', 'year', 'all']).default('month'),
  offset: z.coerce.number().int().min(-100).max(100).default(0),
});

// File upload validation
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` };
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type as any)) {
    return { valid: false, error: 'Invalid file type. Allowed: JPEG, PNG, WebP, HEIC' };
  }
  return { valid: true };
}
```

#### `lib/rate-limit.ts`

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Different rate limiters for different endpoints
// Note: Upload uses concurrent limit, not time-based
export const uploadLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'), // Fallback, actual concurrent check below
  analytics: true,
  prefix: 'ratelimit:upload',
});

// Concurrent upload tracking (separate from rate limit)
export async function checkConcurrentUploads(userId: string): Promise<{ allowed: boolean; current: number }> {
  const key = `concurrent:uploads:${userId}`;
  const current = parseInt(await redis.get(key) || '0');
  return { allowed: current < 10, current };
}

export async function incrementConcurrentUploads(userId: string): Promise<void> {
  const key = `concurrent:uploads:${userId}`;
  await redis.incr(key);
  await redis.expire(key, 3600); // 1 hour TTL as safety net
}

export async function decrementConcurrentUploads(userId: string): Promise<void> {
  const key = `concurrent:uploads:${userId}`;
  await redis.decr(key);
}

export const mutationLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 m'),
  analytics: true,
  prefix: 'ratelimit:mutation',
});

export const readLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'),
  analytics: true,
  prefix: 'ratelimit:read',
});

export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const result = await limiter.limit(identifier);
  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}
```

### Files to Modify

#### `middleware.ts`

Add rate limiting:

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { uploadLimiter, mutationLimiter, readLimiter } from '@/lib/rate-limit';

const isPublicRoute = createRouteMatcher(['/', '/sign-in(.*)', '/sign-up(.*)']);
const isUploadRoute = createRouteMatcher(['/api/receipts/queue']);
const isMutationRoute = createRouteMatcher(['/api/(.*)', { method: 'POST|PUT|DELETE' }]);

export default clerkMiddleware(async (auth, request) => {
  // Auth check
  if (!isPublicRoute(request)) {
    await auth.protect();
  }

  // Rate limiting
  const { userId } = await auth();
  if (userId) {
    const identifier = userId;
    let limiter = readLimiter;

    if (isUploadRoute(request)) {
      limiter = uploadLimiter;
    } else if (request.method !== 'GET') {
      limiter = mutationLimiter;
    }

    const { success, remaining, reset } = await checkRateLimit(limiter, identifier);

    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests', retryAfter: reset },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
            'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
          },
        }
      );
    }
  }

  return NextResponse.next();
});
```

#### `next.config.ts`

Add security headers:

```typescript
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; img-src 'self' data: blob: https://*.supabase.co; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; style-src 'self' 'unsafe-inline'; frame-src https://js.stripe.com https://hooks.stripe.com;",
          },
        ],
      },
    ];
  },
};
```

#### `app/api/image/[...path]/route.ts`

Improve path validation:

```typescript
import { join, normalize, resolve } from 'path';

export async function GET(req: Request, { params }: { params: { path: string[] } }) {
  const pathSegments = params.path;

  // Reconstruct and normalize the path
  const requestedPath = pathSegments.join('/');
  const normalizedPath = normalize(requestedPath);

  // Ensure path doesn't escape uploads directory
  const uploadsDir = resolve('./data/uploads');
  const fullPath = resolve(uploadsDir, normalizedPath);

  if (!fullPath.startsWith(uploadsDir)) {
    return Response.json({ error: 'Invalid path' }, { status: 400 });
  }

  // Validate file extension
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'];
  const ext = fullPath.substring(fullPath.lastIndexOf('.')).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    return Response.json({ error: 'Invalid file type' }, { status: 400 });
  }

  // ... rest of file serving logic
}
```

#### API Routes (example: `/api/receipts/route.ts`)

Add validation:

```typescript
import { receiptWithItemsSchema, paginationSchema } from '@/lib/validations';

export async function POST(req: Request) {
  const body = await req.json();

  const result = receiptWithItemsSchema.safeParse(body);
  if (!result.success) {
    return Response.json(
      { error: 'Validation failed', details: result.error.flatten() },
      { status: 400 }
    );
  }

  const validatedData = result.data;
  // ... use validatedData
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const params = Object.fromEntries(searchParams);

  const result = paginationSchema.safeParse(params);
  if (!result.success) {
    return Response.json(
      { error: 'Invalid parameters', details: result.error.flatten() },
      { status: 400 }
    );
  }

  const { limit, cursor } = result.data;
  // ... use validated params
}
```

### Environment Variables

```env
# Upstash Redis (for rate limiting)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

## Testing

```typescript
// lib/validations.test.ts
describe('Receipt validation', () => {
  it('rejects negative total', () => {
    const result = receiptSchema.safeParse({ storeName: 'Test', total: -10 });
    expect(result.success).toBe(false);
  });

  it('rejects future dates', () => {
    const future = new Date();
    future.setDate(future.getDate() + 1);
    const result = receiptSchema.safeParse({ storeName: 'Test', total: 10, date: future });
    expect(result.success).toBe(false);
  });

  it('rejects invalid currency', () => {
    const result = receiptSchema.safeParse({ storeName: 'Test', total: 10, currency: 'GBP' });
    expect(result.success).toBe(false);
  });

  it('accepts valid receipt', () => {
    const result = receiptSchema.safeParse({
      storeName: 'Test Store',
      total: 99.99,
      currency: 'PLN',
      date: new Date(),
    });
    expect(result.success).toBe(true);
  });
});

// Rate limit testing
describe('Rate limiting', () => {
  it('blocks after limit exceeded', async () => {
    // Make 11 upload requests
    // 11th should return 429
  });
});
```

## Acceptance Criteria

- [ ] All API inputs validated with Zod schemas
- [ ] Invalid inputs return 400 with error details
- [ ] File uploads limited to 10MB
- [ ] Only JPEG/PNG/WebP/HEIC accepted
- [ ] Rate limiting works per user
- [ ] 429 response includes Retry-After header
- [ ] Security headers present on all responses
- [ ] Path traversal blocked in image serving
- [ ] Multi-currency (PLN, USD, EUR) supported

## Security Checklist

- [ ] No SQL injection possible (Drizzle ORM parameterized)
- [ ] No XSS (React escapes by default)
- [ ] CSRF protection (Clerk handles)
- [ ] Rate limiting prevents abuse
- [ ] File type validation server-side
- [ ] Path traversal blocked
- [ ] Security headers set
- [ ] Sensitive data not logged
