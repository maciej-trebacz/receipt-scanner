# PRD-07: Landing Page

**Priority**: HIGH
**Dependencies**: None (Independent)
**Blocks**: None
**Can Run In Parallel With**: PRD-06, PRD-08, PRD-09, PRD-10

---

## Overview

Create a marketing landing page for unauthenticated users. The current `/` shows the dashboard for everyone - we need to show a landing page for visitors and redirect authenticated users to the dashboard.

## Current State

- `/` shows dashboard with receipt capture for all users
- No marketing content
- No pricing information visible
- Hardcoded "Mav" username in greeting

## Requirements

### Landing Page Sections

1. **Hero**
   - Headline: "Scan your receipts & track your spending with zero effort"
   - Subheadline: AI-powered receipt scanning that just works
   - CTA: "Start Free" → sign up
   - Hero image/screenshot of app

2. **Features**
   - AI-powered extraction
   - Instant categorization
   - Spending reports
   - Mobile-friendly

3. **How It Works**
   - 1. Snap a photo
   - 2. AI extracts data
   - 3. Track & analyze

4. **Pricing**
   - Free tier: 5 credits on signup
   - Credit packages (link to pricing)

5. **CTA Section**
   - Final push to sign up
   - "Start Free - No credit card required"

### Authenticated Behavior

- Redirect authenticated users to `/dashboard`
- Or conditionally render dashboard content

## Technical Specification

### Files to Create

#### `app/page.tsx` (replace existing)

```typescript
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Hero } from '@/components/landing/hero';
import { Features } from '@/components/landing/features';
import { HowItWorks } from '@/components/landing/how-it-works';
import { Pricing } from '@/components/landing/pricing';
import { CTA } from '@/components/landing/cta';

export default async function HomePage() {
  const { userId } = await auth();

  if (userId) {
    redirect('/dashboard');
  }

  return (
    <div className="flex flex-col">
      <Hero />
      <Features />
      <HowItWorks />
      <Pricing />
      <CTA />
    </div>
  );
}
```

#### `app/dashboard/page.tsx` (move current home content)

```typescript
// Move existing app/page.tsx content here
// This is the authenticated dashboard

import { getCurrentUser } from '@/lib/auth';
// ... rest of current dashboard code

export default async function DashboardPage() {
  const user = await getCurrentUser();

  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">
        Welcome back, {user.name?.split(' ')[0] ?? 'there'}!
      </h1>
      {/* ... rest of dashboard */}
    </div>
  );
}
```

#### `components/landing/hero.tsx`

```typescript
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function Hero() {
  return (
    <section className="relative py-20 md:py-32 overflow-hidden">
      <div className="container">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Scan your receipts & track your spending{' '}
            <span className="text-primary">with zero effort</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Snap a photo of any receipt. Our AI instantly extracts and categorizes
            every item. Track spending with beautiful reports.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="text-lg px-8">
              <Link href="/sign-up">Start Free</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-lg px-8">
              <Link href="#features">Learn More</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            5 free scans included. No credit card required.
          </p>
        </div>
      </div>

      {/* App screenshot */}
      <div className="mt-16 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent z-10 h-32 bottom-0" />
        <div className="container">
          <div className="relative mx-auto max-w-4xl rounded-xl border bg-muted/50 shadow-2xl overflow-hidden">
            {/* Placeholder for app screenshot */}
            <div className="aspect-[16/10] bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
              <span className="text-muted-foreground">App Screenshot</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
```

#### `components/landing/features.tsx`

```typescript
import { Camera, Sparkles, BarChart3, Smartphone } from 'lucide-react';

const features = [
  {
    icon: Camera,
    title: 'Instant Capture',
    description: 'Take a photo or upload an image. Works with any receipt format.',
  },
  {
    icon: Sparkles,
    title: 'AI Extraction',
    description: 'Advanced AI reads every line item, total, tax, and store details.',
  },
  {
    icon: BarChart3,
    title: 'Smart Reports',
    description: 'See spending by category, store, or time period. Spot trends instantly.',
  },
  {
    icon: Smartphone,
    title: 'Mobile First',
    description: 'Designed for on-the-go. Scan receipts right after purchase.',
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 bg-muted/30">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Everything you need</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Stop manually entering receipts. Let AI do the work while you focus on
            what matters.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature) => (
            <div key={feature.title} className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary mb-4">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

#### `components/landing/how-it-works.tsx`

```typescript
const steps = [
  {
    step: '1',
    title: 'Snap a photo',
    description: 'Take a picture of your receipt with your phone camera or upload an existing image.',
  },
  {
    step: '2',
    title: 'AI extracts data',
    description: 'Our AI reads the receipt and extracts store name, items, prices, and totals.',
  },
  {
    step: '3',
    title: 'Track & analyze',
    description: 'View spending reports, filter by category, and understand where your money goes.',
  },
];

export function HowItWorks() {
  return (
    <section className="py-20">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">How it works</h2>
          <p className="text-muted-foreground">Three simple steps to expense tracking</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {steps.map((item, index) => (
            <div key={item.step} className="relative">
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-border" />
              )}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground text-2xl font-bold mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

#### `components/landing/pricing.tsx`

```typescript
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';

const packages = [
  { credits: 10, price: '$1.99', perCredit: '$0.20' },
  { credits: 30, price: '$4.99', perCredit: '$0.17', popular: true },
  { credits: 100, price: '$9.99', perCredit: '$0.10', best: true },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-20 bg-muted/30">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Simple pricing</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Start free with 5 credits. Buy more when you need them.
            <br />
            1 credit = 1 receipt scan.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {packages.map((pkg) => (
            <Card key={pkg.credits} className={pkg.popular ? 'border-primary shadow-lg' : ''}>
              {pkg.popular && (
                <div className="bg-primary text-primary-foreground text-center py-1 text-sm font-medium">
                  Most Popular
                </div>
              )}
              {pkg.best && (
                <div className="bg-green-500 text-white text-center py-1 text-sm font-medium">
                  Best Value
                </div>
              )}
              <CardHeader>
                <CardTitle>{pkg.credits} Credits</CardTitle>
                <CardDescription>{pkg.perCredit} per credit</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-4">{pkg.price}</div>
                <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    {pkg.credits} receipt scans
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Never expires
                  </li>
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-8">
          <Button asChild size="lg">
            <Link href="/sign-up">Start Free with 5 Credits</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
```

#### `components/landing/cta.tsx`

```typescript
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function CTA() {
  return (
    <section className="py-20">
      <div className="container">
        <div className="bg-primary rounded-2xl p-8 md:p-16 text-center text-primary-foreground">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to simplify expense tracking?
          </h2>
          <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
            Join thousands of users who save time with AI-powered receipt scanning.
            Start free today.
          </p>
          <Button asChild size="lg" variant="secondary" className="text-lg px-8">
            <Link href="/sign-up">Get Started Free</Link>
          </Button>
          <p className="mt-4 text-sm opacity-75">
            No credit card required. 5 free scans included.
          </p>
        </div>
      </div>
    </section>
  );
}
```

### Files to Modify

#### `components/desktop-nav.tsx`

Show different nav for authenticated vs unauthenticated:

```typescript
import { auth } from '@clerk/nextjs/server';
import { SignInButton, UserButton } from '@clerk/nextjs';

export async function DesktopNav() {
  const { userId } = await auth();

  return (
    <nav>
      {userId ? (
        // Authenticated nav
        <div className="flex items-center gap-4">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/receipts">Receipts</Link>
          <Link href="/reports">Reports</Link>
          <CreditBalance />
          <UserButton />
        </div>
      ) : (
        // Unauthenticated nav
        <div className="flex items-center gap-4">
          <Link href="#features">Features</Link>
          <Link href="#pricing">Pricing</Link>
          <SignInButton mode="modal">
            <Button variant="ghost">Sign In</Button>
          </SignInButton>
          <Button asChild>
            <Link href="/sign-up">Get Started</Link>
          </Button>
        </div>
      )}
    </nav>
  );
}
```

#### `app/layout.tsx`

Conditionally show mobile nav:

```typescript
// Only show mobile nav for authenticated users
{userId && <NavBar />}
```

## Acceptance Criteria

- [ ] Unauthenticated users see landing page at `/`
- [ ] Authenticated users redirected to `/dashboard`
- [ ] Hero section with clear value proposition
- [ ] Features section highlights key benefits
- [ ] How it works section explains the flow
- [ ] Pricing section shows credit packages
- [ ] CTAs link to sign-up page
- [ ] Navigation adapts based on auth state
- [ ] Hardcoded "Mav" username removed
- [ ] Mobile responsive design

## Assets Needed

- [ ] App screenshot for hero (can use placeholder initially)
- [ ] Feature icons (using Lucide icons)
- [ ] Logo (if different from text)
