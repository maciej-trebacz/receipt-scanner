# PRD-08: Error Handling & UX Polish

**Priority**: MEDIUM
**Dependencies**: None (Independent)
**Blocks**: None
**Can Run In Parallel With**: PRD-06, PRD-07, PRD-09, PRD-10

---

## Overview

Replace browser alerts with toast notifications, add loading states, empty states, and clean up legacy code.

## Current State

- 4 places use browser `alert()` for errors
- Silent failures on some API calls
- No skeleton loaders
- No empty states for lists
- Hardcoded "Mav" username
- Commented-out "Smart Search" code
- Legacy `/api/scan` and `/api/upload` routes still exist

## Requirements

### 1. Toast Notifications

Replace all `alert()` calls with toast notifications:

| Location | Current | Replacement |
|----------|---------|-------------|
| `app/page.tsx:81` | `alert()` on upload failure | Error toast with retry action |
| `app/receipts/[id]/page.tsx:102-104` | `alert()` on save failure | Error toast |
| `app/receipts/[id]/page.tsx:112` | `alert()` on delete failure | Error toast |
| `app/receipts/[id]/page.tsx:121` | `alert()` on reanalyze failure | Error toast |

### 2. Loading States

- Skeleton loaders for receipt lists
- Skeleton loaders for stats cards
- Button loading states during actions
- Page-level loading indicators

### 3. Empty States

- No receipts: "Scan your first receipt" + CTA
- No transactions: "No transactions yet"
- No search results: "No receipts match your filters"
- Failed receipt: "Processing failed" + retry button

### 4. Code Cleanup

- Remove hardcoded "Mav" username
- Remove commented "Smart Search" block
- Remove legacy `/api/scan` route
- Remove legacy `/api/upload` route

## Technical Specification

### Dependencies

```bash
bun add sonner
```

### Files to Create

#### `components/ui/sonner.tsx`

```typescript
'use client';

import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: 'group toast bg-background text-foreground border shadow-lg',
          description: 'text-muted-foreground',
          actionButton: 'bg-primary text-primary-foreground',
          cancelButton: 'bg-muted text-muted-foreground',
          error: 'bg-destructive text-destructive-foreground border-destructive',
          success: 'bg-green-500 text-white border-green-500',
        },
      }}
    />
  );
}
```

#### `components/skeletons/receipt-card-skeleton.tsx`

```typescript
import { Card, CardContent } from '@/components/ui/card';

export function ReceiptCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
            <div className="h-3 w-24 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-5 w-16 bg-muted rounded animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}

export function ReceiptListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <ReceiptCardSkeleton key={i} />
      ))}
    </div>
  );
}
```

#### `components/skeletons/stats-skeleton.tsx`

```typescript
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function StatsCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="h-4 w-24 bg-muted rounded animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="h-8 w-20 bg-muted rounded animate-pulse" />
      </CardContent>
    </Card>
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatsCardSkeleton />
      <StatsCardSkeleton />
      <StatsCardSkeleton />
      <StatsCardSkeleton />
    </div>
  );
}
```

#### `components/empty-states/no-receipts.tsx`

```typescript
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Receipt } from 'lucide-react';

export function NoReceipts() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Receipt className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-lg mb-2">No receipts yet</h3>
      <p className="text-muted-foreground mb-6 max-w-sm">
        Scan your first receipt to start tracking expenses
      </p>
      <Button asChild>
        <Link href="/">Scan Receipt</Link>
      </Button>
    </div>
  );
}
```

#### `components/empty-states/no-results.tsx`

```typescript
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NoResultsProps {
  onClear?: () => void;
}

export function NoResults({ onClear }: NoResultsProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Search className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-lg mb-2">No results found</h3>
      <p className="text-muted-foreground mb-6">
        Try adjusting your filters or date range
      </p>
      {onClear && (
        <Button variant="outline" onClick={onClear}>
          Clear Filters
        </Button>
      )}
    </div>
  );
}
```

### Files to Modify

#### `app/layout.tsx`

Add Toaster:

```typescript
import { Toaster } from '@/components/ui/sonner';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
```

#### `app/page.tsx` (or `app/dashboard/page.tsx`)

Replace alerts and add loading:

```typescript
import { toast } from 'sonner';
import { StatsSkeleton } from '@/components/skeletons/stats-skeleton';
import { ReceiptListSkeleton } from '@/components/skeletons/receipt-card-skeleton';

// Remove hardcoded "Mav":
// Before: <h1>Welcome back, Mav!</h1>
// After:  <h1>Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!</h1>

// Replace alert:
// Before: alert('Failed to upload');
// After:
toast.error('Upload failed', {
  description: 'Please try again',
  action: {
    label: 'Retry',
    onClick: () => handleUpload(),
  },
});

// Remove commented Smart Search block (lines ~184-195)
```

#### `app/receipts/[id]/page.tsx`

Replace all alerts:

```typescript
import { toast } from 'sonner';

// Save error
// Before: alert('Failed to save changes');
// After:
toast.error('Failed to save', {
  description: 'Your changes could not be saved. Please try again.',
});

// Delete error
// Before: alert('Failed to delete receipt');
// After:
toast.error('Failed to delete', {
  description: 'The receipt could not be deleted. Please try again.',
});

// Reanalyze error
// Before: alert('Failed to reanalyze');
// After:
toast.error('Reanalysis failed', {
  description: 'Please try again or contact support.',
});

// Success cases
toast.success('Changes saved');
toast.success('Receipt deleted');
toast.success('Reanalysis started');
```

#### `components/receipt-list.tsx`

Add empty state:

```typescript
import { NoReceipts } from '@/components/empty-states/no-receipts';
import { NoResults } from '@/components/empty-states/no-results';
import { ReceiptListSkeleton } from '@/components/skeletons/receipt-card-skeleton';

// In component:
if (isLoading) {
  return <ReceiptListSkeleton />;
}

if (receipts.length === 0) {
  if (hasFilters) {
    return <NoResults onClear={clearFilters} />;
  }
  return <NoReceipts />;
}
```

### Files to Delete

```bash
rm app/api/scan/route.ts      # Legacy sync scan
rm app/api/upload/route.ts    # Legacy upload
```

Or if you want to keep them temporarily, add deprecation warning:

```typescript
// app/api/scan/route.ts
export async function POST() {
  return Response.json(
    { error: 'This endpoint is deprecated. Use /api/receipts/queue instead.' },
    { status: 410 } // Gone
  );
}
```

## Testing

```typescript
// components/receipt-list.test.tsx
describe('ReceiptList', () => {
  it('shows skeleton while loading', () => {
    render(<ReceiptList isLoading={true} receipts={[]} />);
    expect(screen.getByTestId('receipt-skeleton')).toBeInTheDocument();
  });

  it('shows empty state when no receipts', () => {
    render(<ReceiptList isLoading={false} receipts={[]} />);
    expect(screen.getByText('No receipts yet')).toBeInTheDocument();
  });

  it('shows no results when filtered with no matches', () => {
    render(<ReceiptList isLoading={false} receipts={[]} hasFilters={true} />);
    expect(screen.getByText('No results found')).toBeInTheDocument();
  });
});
```

## Acceptance Criteria

- [ ] All `alert()` calls replaced with toast notifications
- [ ] Toast appears bottom-right
- [ ] Error toasts are red/destructive styled
- [ ] Success toasts are green
- [ ] Skeleton loaders show while data loading
- [ ] Empty state shows when no receipts
- [ ] "No results" shows when filters match nothing
- [ ] Hardcoded "Mav" removed from welcome message
- [ ] Commented "Smart Search" code removed
- [ ] Legacy `/api/scan` removed or deprecated
- [ ] Legacy `/api/upload` removed or deprecated

## Visual Reference

### Toast Examples

```
┌─────────────────────────────────────┐
│ ✓ Changes saved                     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ✗ Upload failed                     │
│   Please try again                  │
│                          [Retry]    │
└─────────────────────────────────────┘
```

### Empty State

```
┌─────────────────────────────────────┐
│                                     │
│            ┌─────┐                  │
│            │  📄 │                  │
│            └─────┘                  │
│                                     │
│       No receipts yet               │
│                                     │
│   Scan your first receipt to        │
│   start tracking expenses           │
│                                     │
│        [Scan Receipt]               │
│                                     │
└─────────────────────────────────────┘
```
