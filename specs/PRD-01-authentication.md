# PRD-01: Authentication (Clerk)

**Priority**: CRITICAL
**Dependencies**: None (Foundation - must complete first)
**Blocks**: PRD-02, PRD-03, PRD-04, PRD-05, PRD-06

---

## Overview

Add user authentication using Clerk to enable multi-user support and data isolation.

## Current State

- Zero authentication - all API endpoints are public
- No user concept - all receipts visible to everyone
- Hardcoded "Mav" username in welcome message

## Requirements

### Functional Requirements

1. **User Registration**
   - Email/password signup
   - Email verification
   - Social login: Google, Apple, Facebook

2. **User Login**
   - Email/password
   - Magic link (optional)
   - Session persistence

3. **Protected Routes**
   - All routes protected except: `/`, `/sign-in`, `/sign-up`
   - Redirect unauthenticated users to `/sign-in`

4. **User Sync**
   - Sync Clerk users to local database via webhook
   - Store: id (Clerk user ID), email, name, credits (default: 5)
   - Handle user deletion (cascade)

### Non-Functional Requirements

- Session should persist across browser restarts
- Auth check should add < 50ms to request latency
- Support SSR and client-side auth checks

## Technical Specification

### Dependencies to Install

```bash
bun add @clerk/nextjs
```

### Environment Variables

**Note**: Clerk keys are already configured in `docs/SETUP_CHECKLIST.md`. Copy them to `.env.local`.

```env
# From SETUP_CHECKLIST.md
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...  # Configure after first deploy

# Clerk URL configuration
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

### Files to Create

#### 1. `middleware.ts` (project root)

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher(['/', '/sign-in(.*)', '/sign-up(.*)']);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
```

#### 2. `lib/auth.ts`

```typescript
import { auth, currentUser } from '@clerk/nextjs/server';
import { getUser } from './db/queries';

export async function requireAuth() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('Unauthorized');
  }
  return userId;
}

export async function getCurrentUser() {
  const userId = await requireAuth();
  const user = await getUser(userId);
  if (!user) {
    throw new Error('User not found in database');
  }
  return user;
}

export async function requireOwnership(receiptUserId: string) {
  const userId = await requireAuth();
  if (receiptUserId !== userId) {
    throw new Error('Forbidden');
  }
}
```

#### 3. `app/sign-in/[[...sign-in]]/page.tsx`

```typescript
import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn />
    </div>
  );
}
```

#### 4. `app/sign-up/[[...sign-up]]/page.tsx`

```typescript
import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp />
    </div>
  );
}
```

#### 5. `app/api/webhooks/clerk/route.ts`

```typescript
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { createUser, deleteUser } from '@/lib/db/queries';

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    throw new Error('Missing CLERK_WEBHOOK_SECRET');
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Missing svix headers', { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Webhook verification failed:', err);
    return new Response('Invalid signature', { status: 400 });
  }

  if (evt.type === 'user.created') {
    const { id, email_addresses, first_name, last_name } = evt.data;
    const email = email_addresses[0]?.email_address;
    const name = [first_name, last_name].filter(Boolean).join(' ') || null;

    await createUser({
      id,
      email,
      name,
      credits: 5, // Free credits on signup
    });
  }

  if (evt.type === 'user.deleted') {
    const { id } = evt.data;
    if (id) {
      await deleteUser(id);
    }
  }

  return new Response('OK', { status: 200 });
}
```

### Files to Modify

#### 1. `app/layout.tsx`

Add ClerkProvider wrapper:

```typescript
import { ClerkProvider } from '@clerk/nextjs';

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

#### 2. `components/desktop-nav.tsx`

Add UserButton:

```typescript
import { UserButton } from '@clerk/nextjs';

// In the nav component:
<UserButton afterSignOutUrl="/" />
```

#### 3. All API routes

Add auth check at the start of each route handler:

```typescript
import { requireAuth } from '@/lib/auth';

export async function GET(req: Request) {
  const userId = await requireAuth();
  // ... rest of handler, filter by userId
}
```

## Testing

### Manual Testing

1. Visit `/receipts` while logged out → should redirect to `/sign-in`
2. Sign up with new email → should create user in database with 5 credits
3. Sign in → should redirect to dashboard
4. API call without auth → should return 401
5. Delete Clerk user → should cascade delete from database

### Automated Tests

```typescript
// lib/auth.test.ts
describe('requireAuth', () => {
  it('throws when not authenticated', async () => {
    // Mock auth() to return null userId
    await expect(requireAuth()).rejects.toThrow('Unauthorized');
  });

  it('returns userId when authenticated', async () => {
    // Mock auth() to return valid userId
    const result = await requireAuth();
    expect(result).toBe('user_123');
  });
});
```

## Acceptance Criteria

- [ ] Unauthenticated users cannot access `/receipts`, `/reports`, `/profile`
- [ ] Sign up creates user in local database with 5 credits
- [ ] Sign in works with email/password
- [ ] UserButton appears in navigation when signed in
- [ ] Deleting user in Clerk cascades to local database
- [ ] All existing API routes check authentication
- [ ] Auth adds < 50ms latency to requests

## Rollback Plan

1. Remove ClerkProvider from layout
2. Remove middleware.ts
3. Revert API route auth checks
4. Keep user/credit tables for future use
