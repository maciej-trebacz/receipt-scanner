# Paragon: Prototype to Production MVP

## Current State

**Phase**: 6 of 8 complete (Async Processing with Vercel Workflow)
**Production Readiness**: ~35%

### What Works
- Core receipt scanning with Gemini AI extraction
- Async processing via Vercel Workflow (fire-and-forget uploads)
- Bounding box visualization for scanned items
- Reports with period navigation (week/month/year)
- Bulk upload with real-time progress
- Mobile-first responsive design
- 20 passing tests

### Critical Gaps

| Gap | Severity | Current State |
|-----|----------|---------------|
| **Authentication** | CRITICAL | Zero auth - all data public |
| **User System** | CRITICAL | No users table, no isolation |
| **Credit System** | CRITICAL | Doesn't exist (required for monetization) |
| **Payment Integration** | CRITICAL | None |
| **Profile Page** | HIGH | Route exists, page 404s |
| **Input Validation** | HIGH | Minimal - injection risks |
| **Error UX** | MEDIUM | Browser alerts, silent failures |
| **Database Indexes** | MEDIUM | None - will slow at scale |
| **Testing** | MEDIUM | 20 tests insufficient |

---

## Configuration

**Decisions Made** (see `SETUP_CHECKLIST.md` for details):
- App Name: **Paragon**
- Auth: Clerk (Email, Google, Apple, Facebook)
- Free credits: 5
- Pricing: $1.99/10, $4.99/30, $9.99/100
- Currency: Multi-currency (PLN, USD, EUR)
- i18n: English (default) + Polish, categories translated
- Data: Fresh start (delete existing receipts)

**Environment Variables**: See `SETUP_CHECKLIST.md` Section 8 for complete `.env.local` template.

---

## PRD Index

| PRD | Title | Priority | Dependencies | Parallelizable |
|-----|-------|----------|--------------|----------------|
| [PRD-01](./PRD-01-authentication.md) | Authentication (Clerk) | CRITICAL | None | No - Foundation |
| [PRD-02](./PRD-02-database-schema.md) | Database Schema | CRITICAL | PRD-01 | No |
| [PRD-03](./PRD-03-credit-system.md) | Credit System | CRITICAL | PRD-01, PRD-02 | No |
| [PRD-04](./PRD-04-payment-stripe.md) | Payment (Stripe) | CRITICAL | PRD-03 | No |
| [PRD-05](./PRD-05-profile-page.md) | Profile Page | HIGH | PRD-01, PRD-03, PRD-11 | After PRD-03 |
| [PRD-06](./PRD-06-security-validation.md) | Security & Validation | HIGH | PRD-01 | Yes |
| [PRD-07](./PRD-07-landing-page.md) | Landing Page | HIGH | PRD-11 | After PRD-11 |
| [PRD-08](./PRD-08-ux-polish.md) | UX Polish | MEDIUM | PRD-11 | After PRD-11 |
| [PRD-09](./PRD-09-database-optimization.md) | Database Optimization | MEDIUM | None | Yes |
| [PRD-10](./PRD-10-deployment.md) | Deployment Config | HIGH | None | Yes |
| [PRD-11](./PRD-11-internationalization.md) | Internationalization | HIGH | None | Yes - Do Early |

---

## Dependency Graph

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     START IMMEDIATELY (Independent)                          │
│                                                                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                                      │
│  │ PRD-09  │  │ PRD-10  │  │ PRD-11  │ ◄── Do early! Affects PRD-05/07/08  │
│  │ DB Opt  │  │ Deploy  │  │  i18n   │                                      │
│  └─────────┘  └─────────┘  └────┬────┘                                      │
│                                 │                                            │
│                    ┌────────────┼────────────┐                              │
│                    ▼            ▼            ▼                              │
│              ┌─────────┐  ┌─────────┐  ┌─────────┐                          │
│              │ PRD-07  │  │ PRD-08  │  │  (to    │                          │
│              │ Landing │  │ UX      │  │ PRD-05) │                          │
│              └─────────┘  └─────────┘  └─────────┘                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                      SEQUENTIAL CHAIN (Critical Path)                        │
│                                                                              │
│  ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐               │
│  │ PRD-01  │────▶│ PRD-02  │────▶│ PRD-03  │────▶│ PRD-04  │               │
│  │  Auth   │     │ Schema  │     │ Credits │     │ Payment │               │
│  └────┬────┘     └─────────┘     └────┬────┘     └─────────┘               │
│       │                               │                                      │
│       │                               └──────▶ PRD-05 Profile               │
│       │                                        (also needs PRD-11)          │
│       │                                                                      │
│       └──────────────────────────────────────▶ PRD-06 Security              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Execution Strategy

### Phase 1: Foundation + i18n (Start Immediately)
Run in parallel:
- **PRD-01**: Authentication - blocks most features
- **PRD-11**: Internationalization - do early, affects string handling everywhere

### Phase 2: Schema + Independent Work
After PRD-01 completes:
- **PRD-02**: Database Schema (sequential after PRD-01)
- **PRD-09**: Database Optimization (independent)
- **PRD-10**: Deployment Configuration (independent)

### Phase 3: Features
After PRD-02 and PRD-11 complete:
- **PRD-03**: Credit System → **PRD-04**: Payment (sequential)
- **PRD-06**: Security & Validation (after PRD-01)
- **PRD-07**: Landing Page (after PRD-11)
- **PRD-08**: UX Polish (after PRD-11)

### Phase 4: Profile
After PRD-03 and PRD-11:
- **PRD-05**: Profile Page

### Optimal Parallel Assignment

```
Agent 1 (Critical Path):     Agent 2 (i18n + UI):       Agent 3 (Infrastructure):
┌────────────────────┐      ┌────────────────────┐     ┌────────────────────┐
│ PRD-01 Auth        │      │ PRD-11 i18n        │     │ PRD-09 DB Opt      │
│        ↓           │      │        ↓           │     │        ↓           │
│ PRD-02 Schema      │      │ PRD-07 Landing     │     │ PRD-10 Deploy      │
│        ↓           │      │        ↓           │     │        ↓           │
│ PRD-03 Credits     │      │ PRD-08 UX Polish   │     │ PRD-06 Security    │
│        ↓           │      │                    │     │                    │
│ PRD-04 Payment     │      │                    │     │                    │
│        ↓           │      │                    │     │                    │
│ PRD-05 Profile     │◄─────│ (needs i18n done)  │     │                    │
└────────────────────┘      └────────────────────┘     └────────────────────┘
```

---

## Git Workflow

**Branch Strategy**: Create feature branch per PRD, review and merge to main after done.

```bash
# Example for PRD-01
git checkout -b prd-01-authentication
# ... implement ...
git push -u origin prd-01-authentication
# Create PR for review
```

---

## PRD Format

Each PRD contains:

1. **Overview** - What and why
2. **Current State** - What exists now
3. **Requirements** - What needs to be built
4. **Technical Specification** - How to build it
   - Files to create
   - Files to modify
   - Code examples
5. **Testing** - How to verify
6. **Acceptance Criteria** - Definition of done

---

## Agent Handoff Notes

### PRD-01 (Authentication)
- Must be first - creates foundation for all other features
- Clerk keys already in `SETUP_CHECKLIST.md`
- Enable: Email/Password, Google, Apple, Facebook

### PRD-02 (Database Schema)
- Delete existing receipts (fresh start decision)
- Run migrations on dev database first
- Test cascade deletes

### PRD-03 (Credit System)
- 5 free credits on signup
- Test concurrent credit deductions
- Ensure no negative balances possible

### PRD-04 (Payment)
- Pricing: $1.99/10, $4.99/30, $9.99/100
- Use Stripe test mode
- Test webhook with Stripe CLI

### PRD-05 (Profile Page)
- Depends on auth (Clerk components) + credits + i18n
- Include language selector in settings

### PRD-06 (Security)
- 10 concurrent uploads max (not per minute)
- 100 API calls/minute
- Needs Upstash Redis account

### PRD-07 (Landing Page)
- Headline: "Scan your receipts & track your spending with zero effort"
- Must use i18n translation keys
- No backend changes needed

### PRD-08 (UX Polish)
- Install sonner for toasts
- Grep for `alert(` to find all replacements
- Must use i18n translation keys

### PRD-09 (Database Optimization)
- Run on dev database first
- Verify indexes with EXPLAIN ANALYZE

### PRD-10 (Deployment)
- Needs Vercel account access
- Needs Sentry account for error tracking

### PRD-11 (Internationalization)
- Start early - affects PRD-05/07/08
- Languages: English (default), Polish
- Translate category names (Groceries → Spożywcze)

---

## Verification Checklist

Final integration testing after all PRDs complete:

### Authentication & Users
- [ ] Can sign up with email
- [ ] Can sign up with Google/Apple/Facebook
- [ ] New user gets 5 free credits
- [ ] Cannot access other users' receipts

### Credits & Payment
- [ ] Can scan receipt (deducts 1 credit)
- [ ] Blocked from scanning with 0 credits
- [ ] Can purchase credits via Stripe
- [ ] Credits added after successful payment
- [ ] Profile shows transaction history

### UI & UX
- [ ] Landing page shows for unauthenticated users
- [ ] All alerts replaced with toasts
- [ ] Empty states display correctly
- [ ] Loading skeletons appear while fetching

### Internationalization
- [ ] App displays in Polish when browser is Polish
- [ ] App displays in English when browser is English
- [ ] Language switcher changes language
- [ ] Language preference persists after refresh
- [ ] All UI text translated (no hardcoded strings)
- [ ] Category names translated

### Infrastructure
- [ ] Rate limiting prevents abuse
- [ ] Database queries performant (indexes working)
- [ ] Sentry captures errors
- [ ] Production deployment successful

---

## Test Commands

```bash
cd projects/receipt-scanner

bun test                    # Run unit tests
bunx playwright test        # Run E2E tests
bunx tsc --noEmit          # Check TypeScript
bun run build              # Build for production
```
