# Pre-Implementation Setup Checklist

Complete this checklist before starting implementation. Fill in all placeholders so agents can work autonomously.

---

## 1. Decisions

### App Identity

- **App Name**: `Paragon`
- **Tagline** (for landing page hero): `Scan your receipts & track your spending with zero effort`

### Authentication

Social login providers to enable (check all that apply):
- [x] Email/Password
- [x] Google
- [x] Apple
- [x] Facebook

### Existing Data

What to do with existing receipts in the dev database:
- [x] Delete all existing receipts (fresh start)
- [ ] Keep them orphaned (user_id = NULL, filtered out in queries)
- [ ] Assign them to my user after I sign up (I'll provide my user ID)

### Rate Limiting

Maximum number of concurrent receipts to process: `10` (if they upload more tell them to wait for the current batch to finish)
API calls per minute per user: `100`

### Internationalization

Default language (if auto-detect fails):
- [x] English (for international users first)
- [ ] Polish (for Polish users first)

Should category names be translated?
- [x] Yes - "Groceries" shows as "Spożywcze" in Polish
- [ ] No - keep English category names for consistency

### Git Workflow

How should agents handle commits: 
Create feature branches per PRD, review them and merge them into main after they are done.

---

## 2. Clerk Setup

### 2.1 Create Application

1. Go to https://dashboard.clerk.com
2. Click "Add application"
3. Name: (use app name from above)
4. Select authentication methods (from decisions above)
5. Click "Create application"

### 2.2 Get API Keys

From Clerk Dashboard → API Keys:

```
CLERK_APP_ID=app_389wCaxBayH92AR812Lfcpjt5Fc
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_aG9seS1zdW5maXNoLTg1LmNsZXJrLmFjY291bnRzLmRldiQ
CLERK_SECRET_KEY=sk_test_z894FiITNTYRfcen5OoRbGcw8CFK9NKJgIYIaGUqaN
```

### 2.3 Configure URLs

In Clerk Dashboard → Configure → Paths:

| Setting | Value |
|---------|-------|
| Sign-in URL | `/sign-in` |
| Sign-up URL | `/sign-up` |
| After sign-in URL | `/dashboard` |
| After sign-up URL | `/dashboard` |

- [x] URLs configured

### 2.4 Configure Webhook (after first deploy)

In Clerk Dashboard → Configure → Webhooks:

1. Click "Add Endpoint"
2. Endpoint URL: `https://________________________________/api/webhooks/clerk`
3. Select events: `user.created`, `user.deleted`
4. Click "Create"
5. Copy signing secret:

```
CLERK_WEBHOOK_SECRET=whsec_____________________________________________
```

- [ ] Webhook configured (do after PRD-10 deployment)

---

## 3. Stripe Setup

### 3.1 Create Account

1. Go to https://dashboard.stripe.com
2. Create account or sign in
3. Stay in **Test Mode** (toggle in sidebar)

- [ ] Stripe account created
- [ ] Test mode enabled

### 3.2 Get API Keys

From Stripe Dashboard → Developers → API Keys:

```
STRIPE_SECRET_KEY=sk_test_____________________________________________

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_____________________________________________
```

### 3.3 Install Stripe CLI

```bash
brew install stripe/stripe-cli/stripe
stripe login
```

- [ ] Stripe CLI installed
- [ ] Logged in with `stripe login`

### 3.4 Configure Webhook (after first deploy)

In Stripe Dashboard → Developers → Webhooks:

1. Click "Add endpoint"
2. Endpoint URL: `https://________________________________/api/webhooks/stripe`
3. Select events: `checkout.session.completed`
4. Click "Add endpoint"
5. Click "Reveal" under Signing secret:

```
STRIPE_WEBHOOK_SECRET=whsec_____________________________________________
```

- [ ] Webhook configured (do after PRD-10 deployment)

### 3.5 Local Webhook Testing

For testing before deployment, run in a separate terminal:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

This outputs a temporary webhook secret for local dev:

```
STRIPE_WEBHOOK_SECRET_LOCAL=whsec_____________________________________________
```

---

## 4. Upstash Redis Setup

### 4.1 Create Database

1. Go to https://console.upstash.com
2. Click "Create Database"
3. Name: `receipt-scanner-ratelimit`
4. Region: (choose closest to your users, e.g., `us-east-1`)
5. Click "Create"

- [ ] Database created

### 4.2 Get Credentials

From Upstash Console → Your Database → REST API:

```
UPSTASH_REDIS_REST_URL=https://_____________________________________________.upstash.io

UPSTASH_REDIS_REST_TOKEN=____________________________________________
```

---

## 5. Sentry Setup (Optional - for PRD-10)

### 5.1 Create Project

1. Go to https://sentry.io
2. Create account or sign in
3. Create new project → Next.js
4. Name: `receipt-scanner`

- [ ] Sentry project created

### 5.2 Get DSN

From Sentry → Project Settings → Client Keys (DSN):

```
SENTRY_DSN=https://________________________________@sentry.io/____________

NEXT_PUBLIC_SENTRY_DSN=https://________________________________@sentry.io/____________
```

(These are the same value)

---

## 6. Supabase Production (for PRD-10)

### 6.1 Create Production Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Name: `receipt-scanner-prod`
4. Database password: (save securely)
5. Region: (same as Upstash/Vercel for low latency)

- [ ] Production project created

### 6.2 Get Production Credentials

From Supabase Dashboard → Settings → API:

```
SUPABASE_PROD_URL=https://________________________________.supabase.co

SUPABASE_PROD_ANON_KEY=eyJ____________________________________________
```

### 6.3 Storage Bucket

In Supabase Dashboard → Storage:

1. Click "New bucket"
2. Name: `receipts`
3. Public: No (unchecked)
4. Click "Create bucket"

- [ ] Storage bucket created

---

## 7. Vercel Setup (for PRD-10)

### 7.1 Connect Repository

```bash
cd projects/receipt-scanner
vercel link
```

- [ ] Repository linked to Vercel

### 7.2 Domain

Production URL (after first deploy):

```
https://________________________________.vercel.app
```

Or custom domain:

```
https://________________________________
```

---

## 8. Complete Environment File

After filling in all values above, create `.env.local`:

```bash
# Copy this entire block to projects/receipt-scanner/.env.local

# === EXISTING ===
GEMINI_API_KEY=____________________________________________
NEXT_PUBLIC_SUPABASE_URL=https://________________________________.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ____________________________________________

# === CLERK ===
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_____________________________________________
CLERK_SECRET_KEY=sk_test_____________________________________________
CLERK_WEBHOOK_SECRET=whsec_____________________________________________

# === STRIPE ===
STRIPE_SECRET_KEY=sk_test_____________________________________________
STRIPE_WEBHOOK_SECRET=whsec_____________________________________________
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_____________________________________________

# === UPSTASH ===
UPSTASH_REDIS_REST_URL=https://_____________________________________________.upstash.io
UPSTASH_REDIS_REST_TOKEN=____________________________________________

# === SENTRY (optional until PRD-10) ===
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=

# === APP ===
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] `.env.local` created with all values

---

## 9. Verification

Run these commands to verify setup:

```bash
cd projects/receipt-scanner

# Install dependencies
bun install

# Verify env vars load (should not error)
bun run -e "console.log('Clerk:', !!process.env.CLERK_SECRET_KEY)"
bun run -e "console.log('Stripe:', !!process.env.STRIPE_SECRET_KEY)"
bun run -e "console.log('Upstash:', !!process.env.UPSTASH_REDIS_REST_URL)"

# Start dev server
bun dev

# In another terminal, start Stripe webhook forwarding
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

- [ ] All verification commands pass
- [ ] Dev server starts without errors

---

## 10. Ready for Implementation

### Minimum Required (to start PRD-01 through PRD-05):
- [x] Decisions made (Section 1)
- [ ] Clerk setup complete (Section 2.1-2.3)
- [ ] `.env.local` has Clerk keys

### Required for PRD-04 (Payment):
- [ ] Stripe setup complete (Section 3.1-3.3)
- [ ] `.env.local` has Stripe keys
- [ ] Stripe CLI installed

### Required for PRD-06 (Security):
- [ ] Upstash setup complete (Section 4)
- [ ] `.env.local` has Upstash keys

### Required for PRD-10 (Deployment):
- [ ] Sentry setup complete (Section 5)
- [ ] Supabase production project (Section 6)
- [ ] Vercel linked (Section 7)
- [ ] All webhook URLs configured with production domain

---

## Notes / Additional Context

Use this space for any additional notes agents might need:

```
_____________________________________________________________________________

_____________________________________________________________________________

_____________________________________________________________________________

_____________________________________________________________________________

_____________________________________________________________________________
```
