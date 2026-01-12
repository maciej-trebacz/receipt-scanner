# PRD-09: Database Optimization

**Priority**: MEDIUM
**Dependencies**: None (Independent)
**Blocks**: None
**Can Run In Parallel With**: PRD-06, PRD-07, PRD-08, PRD-10

---

## Overview

Add database indexes for frequently queried columns and optimize slow queries before scaling.

## Current State

- No indexes beyond primary keys and foreign keys
- Reports query scans entire `receipts` table
- Receipt list queries may become slow at scale
- No query performance monitoring

## Requirements

### 1. Add Indexes

| Table | Column(s) | Index Type | Reason |
|-------|-----------|------------|--------|
| `receipts` | `user_id` | B-tree | Filter by user (created in PRD-02) |
| `receipts` | `date` | B-tree | Date range queries, sorting |
| `receipts` | `category_id` | B-tree | Filter by category |
| `receipts` | `status` | B-tree | Filter pending/failed |
| `receipts` | `user_id, date` | Composite | User's receipts by date |
| `receipt_items` | `product_type` | B-tree | Report aggregations |
| `credit_transactions` | `user_id` | B-tree | User history (created in PRD-02) |
| `credit_transactions` | `type` | B-tree | Filter by transaction type |

### 2. Query Optimization

- Review N+1 patterns in receipt list
- Add database-level aggregations for reports
- Consider partial indexes for status='pending'

## Technical Specification

### Migration SQL

```sql
-- 002_add_indexes.sql

-- Receipt indexes
CREATE INDEX IF NOT EXISTS idx_receipts_date ON receipts(date DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_category_id ON receipts(category_id);
CREATE INDEX IF NOT EXISTS idx_receipts_status ON receipts(status);
CREATE INDEX IF NOT EXISTS idx_receipts_user_date ON receipts(user_id, date DESC);

-- Partial index for pending receipts (commonly queried)
CREATE INDEX IF NOT EXISTS idx_receipts_pending ON receipts(user_id, created_at)
  WHERE status = 'pending' OR status = 'processing';

-- Receipt items indexes
CREATE INDEX IF NOT EXISTS idx_receipt_items_product_type ON receipt_items(product_type);
CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt_id ON receipt_items(receipt_id);

-- Credit transaction indexes
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created ON credit_transactions(user_id, created_at DESC);
```

### Drizzle Schema Updates

```typescript
// lib/db/schema.ts

// Add index definitions
export const receiptsIndexes = {
  dateIdx: index('idx_receipts_date').on(receipts.date),
  categoryIdx: index('idx_receipts_category_id').on(receipts.categoryId),
  statusIdx: index('idx_receipts_status').on(receipts.status),
  userDateIdx: index('idx_receipts_user_date').on(receipts.userId, receipts.date),
};

export const receiptItemsIndexes = {
  productTypeIdx: index('idx_receipt_items_product_type').on(receiptItems.productType),
};
```

### Query Optimizations

#### 1. Receipt List with Items (avoid N+1)

**Before** (N+1 problem):
```typescript
const receipts = await db.select().from(receiptsTable).where(...);
for (const receipt of receipts) {
  receipt.items = await db.select().from(receiptItems).where(eq(receiptItems.receiptId, receipt.id));
}
```

**After** (single query with join):
```typescript
const receiptsWithItems = await db.query.receipts.findMany({
  where: eq(receipts.userId, userId),
  with: {
    items: true,
    category: true,
  },
  orderBy: [desc(receipts.date)],
  limit: 20,
});
```

#### 2. Reports Aggregation

**Before** (fetch all, aggregate in JS):
```typescript
const receipts = await db.select().from(receiptsTable).where(...);
const total = receipts.reduce((sum, r) => sum + r.total, 0);
```

**After** (database aggregation):
```typescript
const stats = await db
  .select({
    totalSpent: sql<number>`SUM(${receipts.total})`,
    receiptCount: sql<number>`COUNT(*)`,
    avgPerReceipt: sql<number>`AVG(${receipts.total})`,
  })
  .from(receipts)
  .where(and(
    eq(receipts.userId, userId),
    gte(receipts.date, startDate),
    lte(receipts.date, endDate)
  ));
```

#### 3. Spending by Category

```typescript
const byCategory = await db
  .select({
    categoryId: receipts.categoryId,
    categoryName: categories.name,
    total: sql<number>`SUM(${receipts.total})`,
    count: sql<number>`COUNT(*)`,
  })
  .from(receipts)
  .leftJoin(categories, eq(receipts.categoryId, categories.id))
  .where(and(
    eq(receipts.userId, userId),
    gte(receipts.date, startDate)
  ))
  .groupBy(receipts.categoryId, categories.name)
  .orderBy(desc(sql`SUM(${receipts.total})`));
```

#### 4. Spending by Product Type

```typescript
const byProductType = await db
  .select({
    productType: receiptItems.productType,
    total: sql<number>`SUM(${receiptItems.totalPrice})`,
    count: sql<number>`COUNT(*)`,
  })
  .from(receiptItems)
  .innerJoin(receipts, eq(receiptItems.receiptId, receipts.id))
  .where(and(
    eq(receipts.userId, userId),
    gte(receipts.date, startDate),
    isNotNull(receiptItems.productType)
  ))
  .groupBy(receiptItems.productType)
  .orderBy(desc(sql`SUM(${receiptItems.totalPrice})`));
```

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `lib/db/migrations/002_add_indexes.sql` | Create | Index migration |
| `lib/db/schema.ts` | Modify | Add index definitions |
| `lib/db/queries.ts` | Modify | Optimize queries |
| `app/api/reports/route.ts` | Modify | Use DB aggregations |
| `app/api/receipts/route.ts` | Modify | Fix N+1 if present |

### Performance Monitoring

Add query timing in development:

```typescript
// lib/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';

const db = drizzle(client, {
  logger: process.env.NODE_ENV === 'development' ? {
    logQuery: (query, params) => {
      console.log('Query:', query);
      console.log('Params:', params);
      console.time('query');
    },
  } : undefined,
});
```

## Testing

### Index Verification

```sql
-- Verify indexes exist
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('receipts', 'receipt_items', 'credit_transactions');

-- Check index usage
SELECT
  relname as table,
  indexrelname as index,
  idx_scan as scans,
  idx_tup_read as tuples_read
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

### Query Performance Test

```typescript
// lib/db/db.test.ts
describe('Query performance', () => {
  beforeAll(async () => {
    // Seed 1000 receipts
    await seedTestData(1000);
  });

  it('fetches user receipts under 100ms', async () => {
    const start = performance.now();
    await getReceiptsByUser('user_test', { limit: 20 });
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
  });

  it('generates report under 200ms', async () => {
    const start = performance.now();
    await getReportStats('user_test', { period: 'month' });
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(200);
  });
});
```

## Acceptance Criteria

- [ ] All specified indexes created
- [ ] Indexes verified in database
- [ ] Receipt list query uses proper indexes
- [ ] Report queries use database aggregations
- [ ] No N+1 queries in receipt list
- [ ] Query times under thresholds:
  - Receipt list: < 100ms for 20 items
  - Reports: < 200ms
  - Single receipt: < 50ms

## Monitoring (Post-Launch)

Consider adding:
- Supabase Dashboard query monitoring
- Slow query logging (> 500ms)
- Index usage tracking
- Connection pool monitoring
