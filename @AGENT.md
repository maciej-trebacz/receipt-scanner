# Agent Build Instructions

## Project: Paragon (Receipt Scanner)

A receipt scanning and expense tracking app built with Next.js 16, React 19, and Bun.

## Project Setup

```bash
# Install dependencies (Bun, not npm)
bun install

# Copy environment variables
cp .env.local.example .env.local
# Then fill in required values (see docs/SETUP_CHECKLIST.md)
```

## Running Development

```bash
# Start development server (runs on http://localhost:3000)
bun dev

# Note: User typically runs dev server in separate terminal
# Don't start it automatically
```

## Running Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test lib/db/db.test.ts

# Run E2E tests (requires dev server running)
bunx playwright test
```

## Build Commands

```bash
# Production build
bun run build

# Type check (no emit)
bunx tsc --noEmit

# Lint (if configured)
bun run lint
```

## Database

```bash
# Generate Drizzle migrations
bunx drizzle-kit generate

# Push schema changes to database
bunx drizzle-kit push

# Open Drizzle Studio (database GUI)
bunx drizzle-kit studio
```

## Adding Dependencies

```bash
# Add a package (use bun, not npm)
bun add <package>

# Add dev dependency
bun add -d <package>

# Add Shadcn component
bunx shadcn@latest add <component>
```

## Key Directories

| Path | Purpose |
|------|---------|
| `app/` | Next.js App Router pages and API routes |
| `components/` | React components (Shadcn + custom) |
| `lib/` | Utilities: auth, db, credits, validations |
| `specs/` | PRD specifications (PRD-01 through PRD-11) |
| `docs/` | Setup checklist and original PRDs |
| `data/` | Local SQLite database and uploads |

## Environment Variables

Required in `.env.local`:

```env
# Database (Supabase)
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# AI (Gemini)
GEMINI_API_KEY=...

# Auth (Clerk) - PRD-01
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Payments (Stripe) - PRD-04
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Rate Limiting (Upstash) - PRD-06
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

## Feature Development Quality Standards

### Testing Requirements

- Run `bun test` after each implementation
- Focus on testing new functionality
- Aim for meaningful coverage, not metrics
- Run E2E tests for user flows: `bunx playwright test`

### Git Workflow

1. Create feature branch per PRD:
   ```bash
   git checkout -b prd-01-authentication
   ```

2. Commit with conventional format:
   ```bash
   git add .
   git commit -m "feat(auth): add Clerk middleware and route protection"
   ```

3. Push and create PR:
   ```bash
   git push -u origin prd-01-authentication
   ```

### Feature Completion Checklist

Before marking a PRD complete:

- [ ] All tests pass (`bun test`)
- [ ] TypeScript compiles (`bunx tsc --noEmit`)
- [ ] Build succeeds (`bun run build`)
- [ ] Code formatted properly
- [ ] All changes committed and pushed
- [ ] @fix_plan.md tasks marked complete
- [ ] Relevant specs/ PRD updated if needed

## Key Learnings

- **Bun, not npm**: Always use `bun` for package management
- **App Router**: Next.js 16 uses App Router (app/ directory)
- **Clerk**: Use `auth()` and `currentUser()` from `@clerk/nextjs/server`
- **Drizzle**: Use `db.select().from(table)` syntax
- **Vercel Workflow**: Async receipt processing, don't block on AI calls
- **Week starts Monday**: All reports use Monday as week start

## Common Issues

1. **Port 3000 in use**: Kill existing process or use different port
2. **Database connection**: Check DATABASE_URL in .env.local
3. **Clerk redirect loop**: Ensure sign-in/sign-up routes are public in middleware
4. **Stripe webhook fails**: Use Stripe CLI for local testing: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
