# Paragon Fix Plan

## Phase 1: Foundation (Start Here)

### PRD-01: Authentication (Clerk) - CRITICAL
> Blocks: PRD-02, PRD-03, PRD-04, PRD-05, PRD-06

- [ ] Install @clerk/nextjs dependency
- [ ] Add Clerk environment variables to .env.local
- [ ] Create middleware.ts with route protection
- [ ] Create lib/auth.ts with requireAuth, getCurrentUser, requireOwnership
- [ ] Create app/sign-in/[[...sign-in]]/page.tsx
- [ ] Create app/sign-up/[[...sign-up]]/page.tsx
- [ ] Wrap app/layout.tsx with ClerkProvider
- [ ] Add UserButton to desktop-nav.tsx
- [ ] Create app/api/webhooks/clerk/route.ts for user sync
- [ ] Add auth check to all API routes

### PRD-11: Internationalization - HIGH (Do Early)
> Affects: PRD-05, PRD-07, PRD-08

- [ ] Install next-intl dependency
- [ ] Create i18n.ts config with English/Polish
- [ ] Create messages/en.json with all UI strings
- [ ] Create messages/pl.json with Polish translations
- [ ] Wrap layout with NextIntlClientProvider
- [ ] Create LanguageSwitcher component
- [ ] Add language detection middleware
- [ ] Translate all hardcoded strings in components
- [ ] Translate category names (Groceries → Spożywcze)

## Phase 2: Database & Schema

### PRD-02: Database Schema - CRITICAL
> Requires: PRD-01
> Blocks: PRD-03

- [ ] Add users table to lib/db/schema.ts
- [ ] Add credit_transactions table to lib/db/schema.ts
- [ ] Add user_id column to receipts table
- [ ] Create SQL migration file
- [ ] Add createUser, getUser, deleteUser to queries.ts
- [ ] Add getTransactions, updateUserCredits to queries.ts
- [ ] Clear existing receipt data (fresh start)
- [ ] Run and verify migration
- [ ] Add database indexes

### PRD-09: Database Optimization - MEDIUM (Independent)
- [ ] Add index on receipts(user_id)
- [ ] Add index on receipts(date)
- [ ] Add index on receipts(category_id)
- [ ] Add index on receipts(status)
- [ ] Add index on credit_transactions(user_id)
- [ ] Review N+1 queries in receipt list
- [ ] Verify indexes with EXPLAIN ANALYZE

## Phase 3: Credits & Payments

### PRD-03: Credit System - CRITICAL
> Requires: PRD-01, PRD-02
> Blocks: PRD-04, PRD-05

- [ ] Create lib/credits.ts with credit operations
- [ ] Implement hasCredits, deductCredit, addCredits
- [ ] Log signup bonus (5 credits) in createUser
- [ ] Add credit check to app/api/receipts/queue/route.ts
- [ ] Deduct credit on successful workflow completion
- [ ] Create CreditBalance component
- [ ] Add credit display to navigation
- [ ] Handle insufficient credits (402 response)
- [ ] Create app/api/credits/route.ts

### PRD-04: Payment (Stripe) - CRITICAL
> Requires: PRD-03

- [ ] Install stripe dependency
- [ ] Create lib/stripe.ts with Stripe client
- [ ] Define credit packages (10/$1.99, 30/$4.99, 100/$9.99)
- [ ] Create app/api/checkout/route.ts
- [ ] Create app/api/webhooks/stripe/route.ts
- [ ] Handle checkout.session.completed event
- [ ] Create app/credits/page.tsx (purchase UI)
- [ ] Create app/credits/success/page.tsx
- [ ] Test webhook with Stripe CLI

## Phase 4: Security & Validation

### PRD-06: Security & Validation - HIGH
> Requires: PRD-01

- [ ] Install zod and @upstash/ratelimit dependencies
- [ ] Create lib/validations.ts with Zod schemas
- [ ] Add receiptSchema, receiptItemSchema validation
- [ ] Add paginationSchema, reportParamsSchema
- [ ] Create lib/rate-limit.ts with Upstash Redis
- [ ] Implement concurrent upload limit (10 max)
- [ ] Add rate limiting to middleware.ts
- [ ] Add security headers to next.config.ts
- [ ] Improve path validation in /api/image route
- [ ] Validate all API inputs with Zod

### PRD-10: Deployment Config - HIGH (Independent)
- [ ] Create vercel.json with environment config
- [ ] Create lib/env.ts with Zod validation
- [ ] Add security headers to vercel.json
- [ ] Set up Sentry for error tracking
- [ ] Configure production environment variables
- [ ] Test production build

## Phase 5: User Interface

### PRD-05: Profile Page - HIGH
> Requires: PRD-01, PRD-03, PRD-11

- [ ] Create app/profile/page.tsx
- [ ] Display user info from Clerk
- [ ] Show credit balance with purchase CTA
- [ ] Create TransactionHistory component
- [ ] Add language selector (from i18n)
- [ ] Add sign out functionality
- [ ] Style with Tailwind/Shadcn

### PRD-07: Landing Page - HIGH
> Requires: PRD-11

- [ ] Create landing page for unauthenticated users
- [ ] Hero section with tagline
- [ ] Features section (AI extraction, reports, mobile)
- [ ] Pricing section with credit packages
- [ ] "Start Free" CTA
- [ ] Move authenticated home to /dashboard
- [ ] Redirect authenticated users from / to /dashboard
- [ ] Use i18n translation keys

### PRD-08: UX Polish - MEDIUM
> Requires: PRD-11

- [ ] Install sonner for toast notifications
- [ ] Replace all alert() calls with toast
- [ ] Add skeleton loaders for lists
- [ ] Add empty states for no receipts
- [ ] Add loading states for buttons
- [ ] Remove hardcoded "Mav" username
- [ ] Clean up unused code
- [ ] Use i18n translation keys

## Completed

- [x] Core receipt scanning with Gemini AI
- [x] Async processing via Vercel Workflow
- [x] Bounding box visualization
- [x] Reports with period navigation
- [x] Bulk upload with progress
- [x] Mobile-first responsive design
- [x] 20 passing tests

## Notes

- **Dependency Order**: PRD-01 → PRD-02 → PRD-03 → PRD-04 → PRD-05
- **Independent PRDs**: PRD-09, PRD-10, PRD-11 can start immediately
- **PRD-11 affects**: PRD-05, PRD-07, PRD-08 (must use translation keys)
- **Git workflow**: Create feature branch per PRD (e.g., prd-01-authentication)
- **Testing**: Run `bun test` after each implementation
