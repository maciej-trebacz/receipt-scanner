# PRD-02: Database Schema Changes

**Priority**: CRITICAL
**Dependencies**: PRD-01 (Authentication)
**Blocks**: PRD-03 (Credit System)

---

## Overview

Extend the database schema to support multi-user functionality with user ownership of receipts and credit tracking.

## Current State

- 3 tables: `categories`, `receipts`, `receipt_items`
- No user concept - receipts have no owner
- No credit tracking

## Requirements

### New Tables

1. **users** - Store user profiles synced from Clerk
2. **credit_transactions** - Audit trail for credit changes

### Modified Tables

1. **receipts** - Add `user_id` foreign key

## Technical Specification

### Schema Changes (Drizzle)

#### `lib/db/schema.ts`

```typescript
import { pgTable, text, integer, uuid, timestamp } from 'drizzle-orm/pg-core';

// New: Users table
export const users = pgTable('users', {
  id: text('id').primaryKey(), // Clerk user ID
  email: text('email').notNull(),
  name: text('name'),
  credits: integer('credits').notNull().default(5),
  preferredCurrency: text('preferred_currency').default('PLN'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// New: Credit transactions table
export const creditTransactions = pgTable('credit_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(), // positive = add, negative = deduct
  type: text('type').notNull(), // 'signup_bonus', 'purchase', 'usage', 'refund'
  description: text('description'),
  receiptId: uuid('receipt_id').references(() => receipts.id, { onDelete: 'set null' }),
  stripePaymentId: text('stripe_payment_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Modified: Add user_id to receipts
export const receipts = pgTable('receipts', {
  // ... existing columns ...
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
});
```

### SQL Migration

```sql
-- 001_add_users.sql

-- Create users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  credits INTEGER NOT NULL DEFAULT 5,
  preferred_currency TEXT DEFAULT 'PLN',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create credit_transactions table
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  receipt_id UUID REFERENCES receipts(id) ON DELETE SET NULL,
  stripe_payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add user_id to receipts
ALTER TABLE receipts ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE;

-- Create indexes
CREATE INDEX idx_receipts_user_id ON receipts(user_id);
CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(type);
```

### Query Functions

#### `lib/db/queries.ts`

```typescript
// User operations
export async function createUser(data: {
  id: string;
  email: string;
  name: string | null;
  credits?: number;
}) {
  const [user] = await db.insert(users).values(data).returning();

  // Log signup bonus
  await db.insert(creditTransactions).values({
    userId: user.id,
    amount: user.credits,
    type: 'signup_bonus',
    description: 'Welcome bonus credits',
  });

  return user;
}

export async function getUser(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user;
}

export async function deleteUser(id: string) {
  // Receipts and transactions cascade automatically
  await db.delete(users).where(eq(users.id, id));
}

export async function updateUserCredits(id: string, credits: number) {
  await db.update(users)
    .set({ credits, updatedAt: new Date() })
    .where(eq(users.id, id));
}

// Credit transaction operations
export async function getTransactions(userId: string, options?: { limit?: number }) {
  return db.select()
    .from(creditTransactions)
    .where(eq(creditTransactions.userId, userId))
    .orderBy(desc(creditTransactions.createdAt))
    .limit(options?.limit ?? 50);
}
```

### Data Migration Strategy

**Decision**: Delete all existing receipts (fresh start).

Before running the migration, clear existing data:

```sql
-- Clear existing data for fresh start
TRUNCATE TABLE receipt_items CASCADE;
TRUNCATE TABLE receipts CASCADE;
```

This ensures a clean slate for the multi-user system.

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `lib/db/schema.ts` | Modify | Add users, creditTransactions tables; add userId to receipts |
| `lib/db/queries.ts` | Modify | Add user CRUD, transaction queries |
| `lib/db/migrations/001_add_users.sql` | Create | SQL migration |

## Testing

```typescript
// lib/db/db.test.ts
describe('User operations', () => {
  it('creates user with default credits', async () => {
    const user = await createUser({
      id: 'user_test123',
      email: 'test@example.com',
      name: 'Test User',
    });
    expect(user.credits).toBe(5);
  });

  it('logs signup bonus transaction', async () => {
    await createUser({ id: 'user_test456', email: 'test2@example.com', name: null });
    const transactions = await getTransactions('user_test456');
    expect(transactions[0].type).toBe('signup_bonus');
    expect(transactions[0].amount).toBe(5);
  });

  it('cascades delete to receipts', async () => {
    // Create user, create receipt, delete user, verify receipt gone
  });
});
```

## Acceptance Criteria

- [ ] `users` table exists with correct schema
- [ ] `credit_transactions` table exists with correct schema
- [ ] `receipts.user_id` column exists with foreign key
- [ ] Creating a user logs a signup bonus transaction
- [ ] Deleting a user cascades to receipts and transactions
- [ ] Indexes exist on frequently queried columns
- [ ] Existing queries still work (backward compatible)

## Rollback Plan

```sql
-- Revert migration
ALTER TABLE receipts DROP COLUMN user_id;
DROP TABLE credit_transactions;
DROP TABLE users;
```
