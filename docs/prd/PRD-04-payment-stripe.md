# PRD-04: Payment Integration (Stripe)

**Priority**: CRITICAL
**Dependencies**: PRD-03 (Credit System)
**Blocks**: None

---

## Overview

Integrate Stripe for credit purchases, enabling users to buy credit packages.

## Credit Packages

| Package | Credits | Price | Per-Credit | Savings |
|---------|---------|-------|------------|---------|
| Starter | 10 | $1.99 | $0.199 | - |
| Popular | 30 | $4.99 | $0.166 | 17% |
| Best Value | 100 | $9.99 | $0.100 | 50% |

## Purchase Flow

```
User clicks "Buy Credits"
         │
         ▼
┌─────────────────────┐
│   Select Package    │
│   ┌───┐ ┌───┐ ┌───┐ │
│   │10 │ │30 │ │100│ │
│   └───┘ └───┘ └───┘ │
└─────────────────────┘
         │
         ▼
    Stripe Checkout
    (hosted page)
         │
    ┌────┴────┐
    │         │
 Success   Cancel
    │         │
    ▼         ▼
 Webhook   Return to
 adds      credits
 credits   page
    │
    ▼
 Success page
 with new balance
```

## Technical Specification

### Dependencies

```bash
bun add stripe @stripe/stripe-js
```

### Environment Variables

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Files to Create

#### `lib/stripe.ts`

```typescript
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export const CREDIT_PACKAGES = [
  { id: 'credits_10', credits: 10, price: 199, name: 'Starter' },
  { id: 'credits_30', credits: 30, price: 499, name: 'Popular' },
  { id: 'credits_100', credits: 100, price: 999, name: 'Best Value' },
] as const;

export function getPackage(id: string) {
  return CREDIT_PACKAGES.find(p => p.id === id);
}
```

#### `app/api/checkout/route.ts`

```typescript
import { getCurrentUser } from '@/lib/auth';
import { stripe, getPackage } from '@/lib/stripe';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  const { packageId } = await req.json();

  const pkg = getPackage(packageId);
  if (!pkg) {
    return Response.json({ error: 'Invalid package' }, { status: 400 });
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${pkg.credits} Credits`,
            description: `Receipt Scanner credits package`,
          },
          unit_amount: pkg.price,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/credits/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/credits`,
    metadata: {
      userId: user.id,
      credits: pkg.credits.toString(),
      packageId: pkg.id,
    },
  });

  return Response.json({ url: session.url });
}
```

#### `app/api/webhooks/stripe/route.ts`

```typescript
import { stripe } from '@/lib/stripe';
import { addCredits } from '@/lib/credits';
import { headers } from 'next/headers';

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    const userId = session.metadata?.userId;
    const credits = parseInt(session.metadata?.credits ?? '0');
    const paymentIntentId = typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id;

    if (userId && credits > 0) {
      await addCredits(
        userId,
        credits,
        'purchase',
        paymentIntentId,
        `Purchased ${credits} credits`
      );
      console.log(`Added ${credits} credits to user ${userId}`);
    }
  }

  return Response.json({ received: true });
}
```

#### `app/credits/page.tsx`

```typescript
import { getCurrentUser } from '@/lib/auth';
import { getCredits } from '@/lib/credits';
import { CREDIT_PACKAGES } from '@/lib/stripe';
import { CreditPackageCard } from '@/components/credit-package-card';

export default async function CreditsPage() {
  const user = await getCurrentUser();
  const credits = await getCredits(user.id);

  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-2xl font-bold mb-2">Buy Credits</h1>
      <p className="text-muted-foreground mb-8">
        Current balance: <span className="font-semibold">{credits} credits</span>
      </p>

      <div className="grid md:grid-cols-3 gap-4">
        {CREDIT_PACKAGES.map((pkg) => (
          <CreditPackageCard key={pkg.id} package={pkg} />
        ))}
      </div>

      <div className="mt-8 text-sm text-muted-foreground">
        <p>• 1 credit = 1 receipt scan</p>
        <p>• Credits never expire</p>
        <p>• Secure payment via Stripe</p>
      </div>
    </div>
  );
}
```

#### `components/credit-package-card.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface CreditPackage {
  id: string;
  credits: number;
  price: number;
  name: string;
}

export function CreditPackageCard({ package: pkg }: { package: CreditPackage }) {
  const [loading, setLoading] = useState(false);
  const isPopular = pkg.name === 'Popular';
  const isBestValue = pkg.name === 'Best Value';

  const handlePurchase = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: pkg.id }),
      });
      const { url } = await res.json();
      window.location.href = url;
    } catch (error) {
      console.error('Checkout error:', error);
      setLoading(false);
    }
  };

  return (
    <Card className={cn(
      "relative",
      isPopular && "border-primary shadow-lg",
      isBestValue && "border-green-500"
    )}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
          Most Popular
        </div>
      )}
      {isBestValue && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium">
          Best Value
        </div>
      )}

      <CardHeader>
        <CardTitle>{pkg.credits} Credits</CardTitle>
        <CardDescription>{pkg.name} package</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="text-3xl font-bold mb-4">
          ${(pkg.price / 100).toFixed(2)}
        </div>
        <div className="text-sm text-muted-foreground mb-4">
          ${(pkg.price / 100 / pkg.credits).toFixed(3)} per credit
        </div>
        <Button
          onClick={handlePurchase}
          disabled={loading}
          className="w-full"
          variant={isPopular ? "default" : "outline"}
        >
          {loading ? 'Loading...' : 'Buy Now'}
        </Button>
      </CardContent>
    </Card>
  );
}
```

#### `app/credits/success/page.tsx`

```typescript
import { redirect } from 'next/navigation';
import { stripe } from '@/lib/stripe';
import { getCurrentUser } from '@/lib/auth';
import { getCredits } from '@/lib/credits';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;

  if (!session_id) {
    redirect('/credits');
  }

  const session = await stripe.checkout.sessions.retrieve(session_id);
  const user = await getCurrentUser();
  const credits = await getCredits(user.id);

  return (
    <div className="container max-w-md py-16 text-center">
      <div className="text-6xl mb-4">🎉</div>
      <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
      <p className="text-muted-foreground mb-4">
        {session.metadata?.credits} credits have been added to your account.
      </p>
      <p className="text-lg font-semibold mb-8">
        New balance: {credits} credits
      </p>
      <Button asChild>
        <Link href="/">Start Scanning</Link>
      </Button>
    </div>
  );
}
```

### Stripe Dashboard Setup

1. Create products for each credit package
2. Configure webhook endpoint: `https://your-domain.com/api/webhooks/stripe`
3. Subscribe to `checkout.session.completed` event
4. Copy webhook signing secret to env

## Testing

### Test Card Numbers

- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`

### Webhook Testing

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test event
stripe trigger checkout.session.completed
```

### Automated Tests

```typescript
// app/api/webhooks/stripe/route.test.ts
describe('Stripe webhook', () => {
  it('adds credits on checkout.session.completed', async () => {
    const mockEvent = {
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: { userId: 'user_123', credits: '30' },
          payment_intent: 'pi_123',
        },
      },
    };
    // Verify credits were added
  });

  it('rejects invalid signatures', async () => {
    // Send request with bad signature, expect 400
  });
});
```

## Acceptance Criteria

- [ ] Credits page shows 3 packages with correct prices
- [ ] Clicking "Buy Now" redirects to Stripe Checkout
- [ ] Successful payment adds credits to user account
- [ ] Success page shows new balance
- [ ] Cancelled payment returns to credits page
- [ ] Transaction logged in credit_transactions table
- [ ] Webhook handles duplicate events idempotently

## Security Considerations

- Webhook signature verification required
- No client-side credit manipulation possible
- Credits only added via verified webhook
- Package prices server-side only
- HTTPS required for Stripe integration
