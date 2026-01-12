# PRD-03: Credit System

**Priority**: CRITICAL
**Dependencies**: PRD-01 (Authentication), PRD-02 (Database Schema)
**Blocks**: PRD-04 (Payment), PRD-05 (Profile Page)

---

## Overview

Implement a prepaid credit system for monetization. Users receive 5 free credits on signup, and processing each receipt costs 1 credit.

## Current State

- No credit system
- Receipt processing is free and unlimited

## Requirements

### Credit Rules

| Action | Credit Cost |
|--------|-------------|
| Sign up | +5 (bonus) |
| Process new receipt | -1 |
| Re-analyze existing receipt | -1 |
| Purchase credits | +N (from package) |
| Refund (admin) | +N |

### Credit Check Flow

1. User initiates receipt upload
2. Check if `user.credits >= 1`
3. If no credits: return 402 Payment Required
4. If has credits: proceed with upload
5. On **successful** completion: deduct 1 credit
6. On failure: no deduction (user can retry)

### UI Requirements

1. **Credit Balance Display**
   - Show in header/nav (both mobile and desktop)
   - Format: "5 credits" or coin icon + number

2. **Low Credit Warning**
   - When credits < 3: show warning badge
   - When credits = 0: disable upload button

3. **Insufficient Credits**
   - Block upload with clear message
   - CTA to purchase page

## Technical Specification

### New Files

#### `lib/credits.ts`

```typescript
import { db } from './db';
import { users, creditTransactions } from './db/schema';
import { eq, sql } from 'drizzle-orm';

export async function getCredits(userId: string): Promise<number> {
  const [user] = await db.select({ credits: users.credits })
    .from(users)
    .where(eq(users.id, userId));
  return user?.credits ?? 0;
}

export async function hasCredits(userId: string, required: number = 1): Promise<boolean> {
  const credits = await getCredits(userId);
  return credits >= required;
}

export async function deductCredit(
  userId: string,
  amount: number,
  receiptId: string,
  description?: string
): Promise<void> {
  await db.transaction(async (tx) => {
    // Deduct from user balance
    await tx.update(users)
      .set({
        credits: sql`${users.credits} - ${amount}`,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    // Log transaction
    await tx.insert(creditTransactions).values({
      userId,
      amount: -amount,
      type: 'usage',
      description: description ?? 'Receipt processing',
      receiptId,
    });
  });
}

export async function addCredits(
  userId: string,
  amount: number,
  type: 'purchase' | 'refund' | 'bonus',
  stripePaymentId?: string,
  description?: string
): Promise<void> {
  await db.transaction(async (tx) => {
    // Add to user balance
    await tx.update(users)
      .set({
        credits: sql`${users.credits} + ${amount}`,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    // Log transaction
    await tx.insert(creditTransactions).values({
      userId,
      amount,
      type,
      description,
      stripePaymentId,
    });
  });
}

export async function refundCredit(
  userId: string,
  amount: number,
  receiptId: string,
  reason: string
): Promise<void> {
  await addCredits(userId, amount, 'refund', undefined, `Refund: ${reason}`);
}
```

#### `app/api/credits/route.ts`

```typescript
import { getCurrentUser } from '@/lib/auth';
import { getCredits, getTransactions } from '@/lib/credits';

export async function GET() {
  try {
    const user = await getCurrentUser();
    const credits = await getCredits(user.id);

    return Response.json({ credits });
  } catch (error) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
```

#### `components/credit-balance.tsx`

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

export function CreditBalance() {
  const { data, isLoading } = useQuery({
    queryKey: ['credits'],
    queryFn: () => fetch('/api/credits').then(r => r.json()),
    refetchInterval: 30000, // Refresh every 30s
  });

  if (isLoading) {
    return <div className="h-6 w-16 animate-pulse bg-muted rounded" />;
  }

  const credits = data?.credits ?? 0;
  const isLow = credits < 3;
  const isEmpty = credits === 0;

  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2 py-1 rounded-full text-sm font-medium",
      isEmpty && "bg-destructive/10 text-destructive",
      isLow && !isEmpty && "bg-warning/10 text-warning",
      !isLow && "bg-muted text-muted-foreground"
    )}>
      <CoinIcon className="h-4 w-4" />
      <span>{credits}</span>
      {isEmpty && <span className="text-xs">(empty)</span>}
    </div>
  );
}
```

### Modified Files

#### `app/api/receipts/queue/route.ts`

Add credit check before processing:

```typescript
import { getCurrentUser } from '@/lib/auth';
import { hasCredits } from '@/lib/credits';

export async function POST(req: Request) {
  const user = await getCurrentUser();

  // Check credits before starting
  if (!await hasCredits(user.id, 1)) {
    return Response.json(
      { error: 'insufficient_credits', message: 'You need at least 1 credit to scan a receipt' },
      { status: 402 }
    );
  }

  // ... existing upload logic ...

  // Note: Credit deduction happens in workflow on success
}
```

#### `lib/workflows/process-receipt.ts`

Add credit deduction on success:

```typescript
import { deductCredit } from '@/lib/credits';

// After successful Gemini extraction and DB save:
await deductCredit(receipt.userId, 1, receipt.id, 'Receipt scan');
```

#### `components/desktop-nav.tsx`

Add credit display:

```typescript
import { CreditBalance } from './credit-balance';

// In nav:
<div className="flex items-center gap-4">
  <CreditBalance />
  <UserButton />
</div>
```

#### `components/nav-bar.tsx`

Add credit display (mobile):

```typescript
// Show credits above or near the scan button
```

#### `components/receipt-capture.tsx`

Handle insufficient credits:

```typescript
const { data: creditData } = useQuery({ queryKey: ['credits'], ... });

const handleUpload = async () => {
  if (creditData?.credits < 1) {
    toast.error('No credits remaining', {
      description: 'Purchase more credits to continue scanning receipts',
      action: {
        label: 'Buy Credits',
        onClick: () => router.push('/credits'),
      },
    });
    return;
  }
  // ... existing upload logic
};
```

## Error Handling

| Scenario | Response | User Message |
|----------|----------|--------------|
| No credits | 402 | "You need at least 1 credit to scan a receipt" |
| Credit deduction fails | Retry 3x, then fail receipt | "Processing failed, no credits deducted" |
| Race condition (parallel uploads) | Transaction isolation | Credits cannot go negative |

## Testing

```typescript
// lib/credits.test.ts
describe('Credit operations', () => {
  it('deducts credit and logs transaction', async () => {
    await createUser({ id: 'test', email: 'test@test.com', name: null, credits: 5 });
    await deductCredit('test', 1, 'receipt-123');

    const credits = await getCredits('test');
    expect(credits).toBe(4);

    const transactions = await getTransactions('test');
    expect(transactions[0].amount).toBe(-1);
    expect(transactions[0].type).toBe('usage');
  });

  it('prevents negative balance', async () => {
    await createUser({ id: 'test2', email: 'test2@test.com', name: null, credits: 0 });
    const canProcess = await hasCredits('test2', 1);
    expect(canProcess).toBe(false);
  });

  it('handles concurrent deductions safely', async () => {
    // Create user with 1 credit, attempt 2 parallel deductions
    // Only 1 should succeed
  });
});
```

## Acceptance Criteria

- [ ] New users start with 5 credits
- [ ] Credit balance shown in header (desktop + mobile)
- [ ] Upload blocked when credits = 0
- [ ] Warning shown when credits < 3
- [ ] Credit deducted only on successful processing
- [ ] Failed processing does not deduct credits
- [ ] Transaction history recorded for all credit changes
- [ ] Cannot have negative credit balance

## UI Mockup

```
┌─────────────────────────────────────────────┐
│  Receipt Scanner    [🪙 5]  [User Avatar]   │
├─────────────────────────────────────────────┤
│                                             │
│  Welcome back!                              │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │                                     │   │
│  │         + Scan Receipt              │   │
│  │                                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘

When credits = 0:
┌─────────────────────────────────────────────┐
│  [🪙 0 (empty)]                             │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │   No credits remaining              │   │
│  │   [Buy Credits]                     │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```
