# PRD-10: Deployment Configuration

**Priority**: HIGH (for launch)
**Dependencies**: None (Independent)
**Blocks**: None
**Can Run In Parallel With**: PRD-06, PRD-07, PRD-08, PRD-09

---

## Overview

Configure production deployment on Vercel with Supabase, including environment validation, error tracking, and monitoring.

## Current State

- No `vercel.json` configuration
- Environment variables not validated at startup
- No error tracking service
- No analytics

## Requirements

### 1. Vercel Configuration

- Environment variable references
- Security headers
- Workflow configuration
- Build settings

### 2. Environment Validation

- Validate all required env vars at build/startup
- Fail fast with clear error messages
- Type-safe environment access

### 3. Error Tracking

- Integrate Sentry for error monitoring
- Capture unhandled exceptions
- Track API errors

### 4. Supabase Production Setup

- Production project configuration
- Storage bucket setup
- Database migrations

## Technical Specification

### Files to Create

#### `vercel.json`

```json
{
  "buildCommand": "bun run build",
  "devCommand": "bun run dev",
  "installCommand": "bun install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    },
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "no-store, max-age=0" }
      ]
    }
  ],
  "crons": []
}
```

#### `lib/env.ts`

```typescript
import { z } from 'zod';

const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),

  // Clerk
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
  CLERK_SECRET_KEY: z.string().startsWith('sk_'),
  CLERK_WEBHOOK_SECRET: z.string().startsWith('whsec_').optional(),

  // Stripe
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_'),

  // Gemini
  GEMINI_API_KEY: z.string().min(1),

  // Rate Limiting (Upstash)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),

  // Sentry
  SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// Validate at module load time
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

export const env = parsed.data;

// Type-safe access
export type Env = z.infer<typeof envSchema>;
```

#### `instrumentation.ts` (Sentry)

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const Sentry = await import('@sentry/nextjs');
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
      environment: process.env.NODE_ENV,
    });
  }
}
```

#### `sentry.client.config.ts`

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

#### `sentry.server.config.ts`

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
});
```

### Environment Variables Setup

#### Required for Production

```env
# Supabase (Production)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Clerk (Production)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...

# Stripe (Production)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Gemini
GEMINI_API_KEY=...

# Upstash (Rate Limiting)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Sentry
SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...

# App
NEXT_PUBLIC_APP_URL=https://receipt-scanner.vercel.app
```

### Supabase Production Setup

#### 1. Create Production Project

```bash
# Via Supabase Dashboard or CLI
supabase projects create receipt-scanner-prod --org-id xxx
```

#### 2. Run Migrations

```bash
# Push schema to production
supabase db push --project-ref xxx
```

#### 3. Storage Bucket Configuration

```sql
-- Create receipts bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false);

-- Storage policies
CREATE POLICY "Users can upload receipts"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'receipts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own receipts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'receipts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

### Vercel Deployment Steps

1. **Connect Repository**
   ```bash
   vercel link
   ```

2. **Set Environment Variables**
   ```bash
   vercel env add GEMINI_API_KEY production
   vercel env add STRIPE_SECRET_KEY production
   # ... etc
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

4. **Configure Webhooks**
   - Clerk: `https://your-domain.vercel.app/api/webhooks/clerk`
   - Stripe: `https://your-domain.vercel.app/api/webhooks/stripe`

### Files to Modify

#### `next.config.ts`

```typescript
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig = {
  // ... existing config
};

export default withSentryConfig(nextConfig, {
  silent: true,
  org: 'your-org',
  project: 'receipt-scanner',
});
```

#### `package.json`

Add Sentry dependency:

```json
{
  "dependencies": {
    "@sentry/nextjs": "^8.0.0"
  }
}
```

### Pre-Launch Checklist

```markdown
## Infrastructure
- [ ] Supabase production project created
- [ ] Database migrations applied
- [ ] Storage bucket configured
- [ ] Storage policies set

## Vercel
- [ ] Repository connected
- [ ] Environment variables set
- [ ] Custom domain configured (optional)
- [ ] Preview deployments working

## Webhooks
- [ ] Clerk webhook URL configured
- [ ] Clerk webhook secret in env
- [ ] Stripe webhook URL configured
- [ ] Stripe webhook secret in env

## Monitoring
- [ ] Sentry project created
- [ ] Sentry DSN in env vars
- [ ] Test error captured
- [ ] Vercel Analytics enabled

## Security
- [ ] All secrets using Vercel env vars
- [ ] No secrets in code
- [ ] HTTPS enforced
- [ ] Security headers verified

## Testing
- [ ] Sign up flow works
- [ ] Receipt upload works
- [ ] Payment flow works
- [ ] Webhooks receive events
```

### Monitoring Dashboard

After deployment, monitor via:

1. **Vercel Dashboard**
   - Deployment status
   - Function logs
   - Analytics

2. **Sentry**
   - Error tracking
   - Performance monitoring

3. **Supabase Dashboard**
   - Database health
   - Storage usage
   - API requests

4. **Stripe Dashboard**
   - Payment success rate
   - Webhook delivery

## Acceptance Criteria

- [ ] `vercel.json` present with correct config
- [ ] Environment validation runs at startup
- [ ] Missing env vars cause clear error
- [ ] Sentry captures errors in production
- [ ] Security headers present on all responses
- [ ] Production deployment successful
- [ ] All webhooks receiving events
- [ ] Database migrations applied
- [ ] Storage bucket accessible

## Rollback Plan

1. **Quick rollback**: Vercel instant rollback to previous deployment
2. **Database**: Keep migration rollback scripts ready
3. **Env vars**: Document all required variables for quick restore
