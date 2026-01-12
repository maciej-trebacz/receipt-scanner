# PRD-05: Profile Page

**Priority**: HIGH
**Dependencies**: PRD-01 (Authentication), PRD-03 (Credit System)
**Blocks**: None

---

## Overview

Create the Profile page that currently 404s when accessed via navigation. Shows user info, credit balance, transaction history, and account settings.

## Current State

- `/profile` route exists in navigation
- No `app/profile/page.tsx` file - results in 404
- User info available via Clerk
- Transaction history available via `credit_transactions` table

## Requirements

### Page Sections

1. **User Info**
   - Name (from Clerk)
   - Email (from Clerk)
   - Member since date
   - Preferred currency selector

2. **Credit Balance**
   - Current balance (prominent)
   - "Buy Credits" CTA button
   - Link to full transaction history

3. **Transaction History**
   - Last 10 transactions
   - Type, amount, date, description
   - "View All" link if > 10

4. **Account Settings**
   - Change password (Clerk hosted)
   - Delete account (with confirmation)
   - Sign out button

## Technical Specification

### Files to Create

#### `app/profile/page.tsx`

```typescript
import { currentUser } from '@clerk/nextjs/server';
import { getCurrentUser } from '@/lib/auth';
import { getTransactions } from '@/lib/credits';
import { UserInfo } from '@/components/user-info';
import { CreditSection } from '@/components/credit-section';
import { TransactionHistory } from '@/components/transaction-history';
import { AccountSettings } from '@/components/account-settings';

export default async function ProfilePage() {
  const clerkUser = await currentUser();
  const dbUser = await getCurrentUser();
  const transactions = await getTransactions(dbUser.id, { limit: 10 });

  return (
    <div className="container max-w-2xl py-8 space-y-8">
      <h1 className="text-2xl font-bold">Profile</h1>

      <UserInfo
        name={clerkUser?.fullName ?? clerkUser?.firstName ?? 'User'}
        email={clerkUser?.emailAddresses[0]?.emailAddress ?? ''}
        createdAt={dbUser.createdAt}
        preferredCurrency={dbUser.preferredCurrency}
      />

      <CreditSection credits={dbUser.credits} />

      <TransactionHistory
        transactions={transactions}
        showViewAll={transactions.length >= 10}
      />

      <AccountSettings />
    </div>
  );
}
```

#### `components/user-info.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencySelector } from '@/components/currency-selector';

interface UserInfoProps {
  name: string;
  email: string;
  createdAt: Date;
  preferredCurrency: string;
}

export function UserInfo({ name, email, createdAt, preferredCurrency }: UserInfoProps) {
  const [currency, setCurrency] = useState(preferredCurrency);

  const handleCurrencyChange = async (newCurrency: string) => {
    setCurrency(newCurrency);
    await fetch('/api/user/preferences', {
      method: 'PATCH',
      body: JSON.stringify({ preferredCurrency: newCurrency }),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Info</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Name</div>
            <div className="font-medium">{name}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Email</div>
            <div className="font-medium">{email}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Member since</div>
            <div className="font-medium">
              {new Date(createdAt).toLocaleDateString()}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Preferred Currency</div>
            <CurrencySelector value={currency} onChange={handleCurrencyChange} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### `components/credit-section.tsx`

```typescript
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface CreditSectionProps {
  credits: number;
}

export function CreditSection({ credits }: CreditSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Credits</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-4xl font-bold">{credits}</div>
            <div className="text-sm text-muted-foreground">credits available</div>
          </div>
          <Button asChild>
            <Link href="/credits">Buy Credits</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### `components/transaction-history.tsx`

```typescript
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  createdAt: Date;
}

interface TransactionHistoryProps {
  transactions: Transaction[];
  showViewAll?: boolean;
}

export function TransactionHistory({ transactions, showViewAll }: TransactionHistoryProps) {
  const typeLabels: Record<string, string> = {
    signup_bonus: 'Signup Bonus',
    purchase: 'Purchase',
    usage: 'Receipt Scan',
    refund: 'Refund',
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Transaction History</CardTitle>
        {showViewAll && (
          <Link href="/profile/transactions" className="text-sm text-primary hover:underline">
            View All
          </Link>
        )}
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transactions yet</p>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <div className="font-medium">{typeLabels[tx.type] ?? tx.type}</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(tx.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className={cn(
                  "font-semibold",
                  tx.amount > 0 ? "text-green-600" : "text-red-600"
                )}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

#### `components/account-settings.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function AccountSettings() {
  const { signOut, openUserProfile } = useClerk();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      // Delete user via Clerk - webhook will cascade delete data
      await fetch('/api/user', { method: 'DELETE' });
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Failed to delete account:', error);
      setDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">Password & Security</div>
            <div className="text-sm text-muted-foreground">
              Manage your password and security settings
            </div>
          </div>
          <Button variant="outline" onClick={() => openUserProfile()}>
            Manage
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">Sign Out</div>
            <div className="text-sm text-muted-foreground">
              Sign out of your account
            </div>
          </div>
          <Button variant="outline" onClick={() => signOut()}>
            Sign Out
          </Button>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div>
            <div className="font-medium text-destructive">Delete Account</div>
            <div className="text-sm text-muted-foreground">
              Permanently delete your account and all data
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your
                  account and remove all your data including receipts and credits.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? 'Deleting...' : 'Delete Account'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### `components/currency-selector.tsx`

```typescript
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const CURRENCIES = [
  { value: 'PLN', label: 'PLN (zł)' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
];

interface CurrencySelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function CurrencySelector({ value, onChange }: CurrencySelectorProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {CURRENCIES.map((currency) => (
          <SelectItem key={currency.value} value={currency.value}>
            {currency.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

#### `app/api/user/preferences/route.ts`

```typescript
import { getCurrentUser, requireAuth } from '@/lib/auth';
import { updateUserPreferences } from '@/lib/db/queries';

export async function PATCH(req: Request) {
  const userId = await requireAuth();
  const { preferredCurrency } = await req.json();

  if (preferredCurrency && !['PLN', 'USD', 'EUR'].includes(preferredCurrency)) {
    return Response.json({ error: 'Invalid currency' }, { status: 400 });
  }

  await updateUserPreferences(userId, { preferredCurrency });

  return Response.json({ success: true });
}
```

## Acceptance Criteria

- [ ] `/profile` route renders without 404
- [ ] Shows user name and email from Clerk
- [ ] Shows member since date
- [ ] Shows current credit balance
- [ ] "Buy Credits" button links to `/credits`
- [ ] Shows last 10 transactions with type, amount, date
- [ ] Transaction amounts colored (green +, red -)
- [ ] Currency selector saves preference
- [ ] "Manage" opens Clerk security settings
- [ ] "Sign Out" signs user out
- [ ] Delete account shows confirmation dialog
- [ ] Delete account cascades to all user data

## UI Mockup

```
┌─────────────────────────────────────────────┐
│  Profile                                    │
├─────────────────────────────────────────────┤
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │ Account Info                          │  │
│  │                                       │  │
│  │ Name           Email                  │  │
│  │ John Doe       john@example.com       │  │
│  │                                       │  │
│  │ Member since   Currency               │  │
│  │ Jan 1, 2025    [PLN ▼]               │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │ Credits                               │  │
│  │                                       │  │
│  │  47                    [Buy Credits]  │  │
│  │  credits available                    │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │ Transaction History         View All  │  │
│  │                                       │  │
│  │ Purchase              Jan 10    +30   │  │
│  │ Receipt Scan          Jan 9      -1   │  │
│  │ Receipt Scan          Jan 8      -1   │  │
│  │ Signup Bonus          Jan 1      +5   │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │ Account Settings                      │  │
│  │                                       │  │
│  │ Password & Security       [Manage]    │  │
│  │ Sign Out                  [Sign Out]  │  │
│  │ ─────────────────────────────────     │  │
│  │ Delete Account            [Delete]    │  │
│  └───────────────────────────────────────┘  │
│                                             │
└─────────────────────────────────────────────┘
```
