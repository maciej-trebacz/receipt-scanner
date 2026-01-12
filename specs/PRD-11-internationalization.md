# PRD-11: Internationalization (i18n)

**Priority**: HIGH
**Dependencies**: None (but should be early - affects string handling in all PRDs)
**Blocks**: None
**Can Run In Parallel With**: All PRDs (but ideally complete before or alongside PRD-07, PRD-08)

---

## Overview

Add multi-language support starting with English and Polish. Language should be auto-detected from browser/OS settings with option to override in user preferences.

## Current State

- All strings hardcoded in English
- No language detection
- No translation infrastructure

## Requirements

### Supported Languages

| Code | Language | Status |
|------|----------|--------|
| `en` | English | Default |
| `pl` | Polish | Primary market |

### Language Detection Priority

1. User preference (stored in database, if authenticated)
2. Cookie/localStorage (for unauthenticated users who changed language)
3. Browser `Accept-Language` header
4. Default to English

### Language Switching

- **Profile page**: Language selector in account settings (authenticated)
- **Footer**: Language toggle (all pages, including landing)
- **Persist choice**: Cookie for guests, database for authenticated users

### What Needs Translation

| Category | Examples |
|----------|----------|
| **UI Labels** | "Scan Receipt", "Reports", "Profile", "Sign Out" |
| **Messages** | "Upload failed", "Changes saved", "No receipts yet" |
| **Landing Page** | Hero text, features, pricing, CTAs |
| **Forms** | Labels, placeholders, validation errors |
| **Dates** | "January 5, 2025" vs "5 stycznia 2025" |
| **Numbers** | "1,234.56" vs "1 234,56" |
| **Currency** | "$10.00" vs "10,00 zł" |

### NOT Translated

- User-generated content (store names, notes)
- Receipt data extracted by AI

### Category Names

**Decision**: Category names WILL be translated.
- "Groceries" → "Spożywcze"
- "Restaurants" → "Restauracje"
- etc.

Categories should be stored with a translation key (e.g., `category.groceries`) and looked up in the translation files.

## Technical Specification

### Recommended Library: next-intl

Best choice for Next.js App Router with:
- Server and client component support
- Automatic locale detection
- ICU message format (plurals, dates, numbers)
- Type-safe translations

### Dependencies

```bash
bun add next-intl
```

### Files to Create

#### `i18n/config.ts`

```typescript
export const locales = ['en', 'pl'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
  en: 'English',
  pl: 'Polski',
};
```

#### `i18n/request.ts`

```typescript
import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { defaultLocale, locales, Locale } from './config';

export default getRequestConfig(async () => {
  // 1. Check cookie (user preference)
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('locale')?.value as Locale | undefined;
  if (cookieLocale && locales.includes(cookieLocale)) {
    return { locale: cookieLocale, messages: (await import(`./messages/${cookieLocale}.json`)).default };
  }

  // 2. Check Accept-Language header
  const headersList = await headers();
  const acceptLanguage = headersList.get('accept-language');
  if (acceptLanguage) {
    const browserLocale = acceptLanguage.split(',')[0].split('-')[0] as Locale;
    if (locales.includes(browserLocale)) {
      return { locale: browserLocale, messages: (await import(`./messages/${browserLocale}.json`)).default };
    }
  }

  // 3. Default
  return { locale: defaultLocale, messages: (await import(`./messages/${defaultLocale}.json`)).default };
});
```

#### `i18n/messages/en.json`

```json
{
  "common": {
    "appName": "Paragon",
    "loading": "Loading...",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "back": "Back",
    "retry": "Retry",
    "close": "Close"
  },
  "nav": {
    "dashboard": "Dashboard",
    "receipts": "Receipts",
    "reports": "Reports",
    "profile": "Profile",
    "signIn": "Sign In",
    "signUp": "Get Started",
    "signOut": "Sign Out"
  },
  "categories": {
    "groceries": "Groceries",
    "restaurants": "Restaurants",
    "transport": "Transport",
    "entertainment": "Entertainment",
    "shopping": "Shopping",
    "health": "Health",
    "utilities": "Utilities",
    "other": "Other"
  },
  "landing": {
    "hero": {
      "title": "Scan your receipts & track your spending with zero effort",
      "subtitle": "Snap a photo of any receipt. Our AI instantly extracts and categorizes every item. Track spending with beautiful reports.",
      "cta": "Start Free",
      "learnMore": "Learn More",
      "freeCredits": "{count} free scans included. No credit card required."
    },
    "features": {
      "title": "Everything you need",
      "subtitle": "Stop manually entering receipts. Let AI do the work while you focus on what matters.",
      "capture": {
        "title": "Instant Capture",
        "description": "Take a photo or upload an image. Works with any receipt format."
      },
      "ai": {
        "title": "AI Extraction",
        "description": "Advanced AI reads every line item, total, tax, and store details."
      },
      "reports": {
        "title": "Smart Reports",
        "description": "See spending by category, store, or time period. Spot trends instantly."
      },
      "mobile": {
        "title": "Mobile First",
        "description": "Designed for on-the-go. Scan receipts right after purchase."
      }
    },
    "howItWorks": {
      "title": "How it works",
      "subtitle": "Three simple steps to expense tracking",
      "step1": {
        "title": "Snap a photo",
        "description": "Take a picture of your receipt with your phone camera or upload an existing image."
      },
      "step2": {
        "title": "AI extracts data",
        "description": "Our AI reads the receipt and extracts store name, items, prices, and totals."
      },
      "step3": {
        "title": "Track & analyze",
        "description": "View spending reports, filter by category, and understand where your money goes."
      }
    },
    "pricing": {
      "title": "Simple pricing",
      "subtitle": "Start free with {count} credits. Buy more when you need them.",
      "perCredit": "{price} per credit",
      "credits": "{count} credits",
      "neverExpires": "Never expires",
      "receiptScans": "{count} receipt scans",
      "mostPopular": "Most Popular",
      "bestValue": "Best Value",
      "buyNow": "Buy Now",
      "startFree": "Start Free with {count} Credits"
    },
    "cta": {
      "title": "Ready to simplify expense tracking?",
      "subtitle": "Join thousands of users who save time with AI-powered receipt scanning. Start free today.",
      "button": "Get Started Free",
      "noCreditCard": "No credit card required. {count} free scans included."
    }
  },
  "dashboard": {
    "welcome": "Welcome back{name, select, other {, {name}} }!",
    "weeklyStats": "This Week",
    "totalSpent": "Total Spent",
    "receiptsScanned": "Receipts",
    "avgPerReceipt": "Avg per Receipt",
    "scanReceipt": "Scan Receipt",
    "recentScans": "Recent Scans",
    "viewAll": "View All"
  },
  "receipts": {
    "title": "Receipts",
    "empty": {
      "title": "No receipts yet",
      "description": "Scan your first receipt to start tracking expenses",
      "cta": "Scan Receipt"
    },
    "noResults": {
      "title": "No results found",
      "description": "Try adjusting your filters or date range",
      "clearFilters": "Clear Filters"
    },
    "status": {
      "pending": "Pending",
      "processing": "Processing",
      "completed": "Completed",
      "failed": "Failed"
    },
    "filters": {
      "dateRange": "Date Range",
      "category": "Category",
      "allCategories": "All Categories"
    }
  },
  "receipt": {
    "store": "Store",
    "date": "Date",
    "items": "Items",
    "subtotal": "Subtotal",
    "tax": "Tax",
    "total": "Total",
    "notes": "Notes",
    "category": "Category",
    "addNote": "Add a note...",
    "reanalyze": "Re-analyze",
    "deleteConfirm": {
      "title": "Delete Receipt",
      "description": "Are you sure you want to delete this receipt? This action cannot be undone."
    }
  },
  "reports": {
    "title": "Reports",
    "period": {
      "week": "Week",
      "month": "Month",
      "year": "Year",
      "all": "All Time"
    },
    "summary": {
      "totalSpent": "Total Spent",
      "receipts": "Receipts",
      "avgPerReceipt": "Avg per Receipt"
    },
    "byCategory": "By Category",
    "byStore": "By Store",
    "byDay": "Daily Spending",
    "noData": "No spending data for this period"
  },
  "profile": {
    "title": "Profile",
    "accountInfo": "Account Info",
    "name": "Name",
    "email": "Email",
    "memberSince": "Member since",
    "language": "Language",
    "currency": "Preferred Currency",
    "credits": "Credits",
    "creditsAvailable": "credits available",
    "buyCredits": "Buy Credits",
    "transactionHistory": "Transaction History",
    "viewAllTransactions": "View All",
    "noTransactions": "No transactions yet",
    "accountSettings": "Account Settings",
    "passwordSecurity": "Password & Security",
    "manage": "Manage",
    "deleteAccount": "Delete Account",
    "deleteAccountDescription": "Permanently delete your account and all data",
    "deleteConfirm": {
      "title": "Are you sure?",
      "description": "This action cannot be undone. This will permanently delete your account and remove all your data including receipts and credits."
    }
  },
  "credits": {
    "title": "Buy Credits",
    "currentBalance": "Current balance: {count} credits",
    "oneCredit": "1 credit = 1 receipt scan",
    "neverExpire": "Credits never expire",
    "securePayment": "Secure payment via Stripe",
    "success": {
      "title": "Payment Successful!",
      "description": "{count} credits have been added to your account.",
      "newBalance": "New balance: {count} credits",
      "startScanning": "Start Scanning"
    },
    "balance": {
      "low": "Low balance",
      "empty": "No credits"
    },
    "insufficient": {
      "title": "No credits remaining",
      "description": "Purchase more credits to continue scanning receipts",
      "cta": "Buy Credits"
    }
  },
  "transactions": {
    "types": {
      "signup_bonus": "Signup Bonus",
      "purchase": "Purchase",
      "usage": "Receipt Scan",
      "refund": "Refund"
    }
  },
  "upload": {
    "dropzone": "Drop receipt image here or click to select",
    "scanning": "Scanning...",
    "processing": "Processing receipt..."
  },
  "errors": {
    "generic": "Something went wrong. Please try again.",
    "uploadFailed": "Upload failed",
    "saveFailed": "Failed to save changes",
    "deleteFailed": "Failed to delete",
    "reanalyzeFailed": "Re-analysis failed",
    "unauthorized": "Please sign in to continue",
    "notFound": "Not found",
    "insufficientCredits": "You need at least 1 credit to scan a receipt",
    "rateLimited": "Too many requests. Please wait a moment."
  },
  "success": {
    "saved": "Changes saved",
    "deleted": "Deleted successfully",
    "uploaded": "Upload complete"
  }
}
```

#### `i18n/messages/pl.json`

```json
{
  "common": {
    "appName": "Paragon",
    "loading": "Ładowanie...",
    "save": "Zapisz",
    "cancel": "Anuluj",
    "delete": "Usuń",
    "edit": "Edytuj",
    "back": "Wstecz",
    "retry": "Ponów",
    "close": "Zamknij"
  },
  "nav": {
    "dashboard": "Pulpit",
    "receipts": "Paragony",
    "reports": "Raporty",
    "profile": "Profil",
    "signIn": "Zaloguj się",
    "signUp": "Rozpocznij",
    "signOut": "Wyloguj się"
  },
  "categories": {
    "groceries": "Spożywcze",
    "restaurants": "Restauracje",
    "transport": "Transport",
    "entertainment": "Rozrywka",
    "shopping": "Zakupy",
    "health": "Zdrowie",
    "utilities": "Rachunki",
    "other": "Inne"
  },
  "landing": {
    "hero": {
      "title": "Skanuj paragony i śledź wydatki bez wysiłku",
      "subtitle": "Zrób zdjęcie dowolnego paragonu. Nasza AI natychmiast odczyta i skategoryzuje każdą pozycję. Analizuj wydatki z pomocą przejrzystych raportów.",
      "cta": "Zacznij za darmo",
      "learnMore": "Dowiedz się więcej",
      "freeCredits": "{count} darmowych skanów. Bez karty kredytowej."
    },
    "features": {
      "title": "Wszystko czego potrzebujesz",
      "subtitle": "Koniec z ręcznym przepisywaniem paragonów. Pozwól AI wykonać pracę za Ciebie.",
      "capture": {
        "title": "Błyskawiczne skanowanie",
        "description": "Zrób zdjęcie lub wgraj plik. Działa z każdym formatem paragonu."
      },
      "ai": {
        "title": "Ekstrakcja AI",
        "description": "Zaawansowana AI odczytuje każdą pozycję, sumę, podatek i dane sklepu."
      },
      "reports": {
        "title": "Inteligentne raporty",
        "description": "Zobacz wydatki według kategorii, sklepu lub okresu. Odkryj trendy w mgnieniu oka."
      },
      "mobile": {
        "title": "Mobile First",
        "description": "Zaprojektowane do użycia w biegu. Skanuj paragony zaraz po zakupach."
      }
    },
    "howItWorks": {
      "title": "Jak to działa",
      "subtitle": "Trzy proste kroki do śledzenia wydatków",
      "step1": {
        "title": "Zrób zdjęcie",
        "description": "Zrób zdjęcie paragonu telefonem lub wgraj istniejący obraz."
      },
      "step2": {
        "title": "AI odczytuje dane",
        "description": "Nasza AI odczytuje paragon i wyodrębnia nazwę sklepu, produkty, ceny i sumy."
      },
      "step3": {
        "title": "Śledź i analizuj",
        "description": "Przeglądaj raporty wydatków, filtruj według kategorii i zrozum gdzie idą Twoje pieniądze."
      }
    },
    "pricing": {
      "title": "Proste ceny",
      "subtitle": "Zacznij za darmo z {count} kredytami. Dokup więcej gdy potrzebujesz.",
      "perCredit": "{price} za kredyt",
      "credits": "{count} kredytów",
      "neverExpires": "Nigdy nie wygasają",
      "receiptScans": "{count} skanów paragonów",
      "mostPopular": "Najpopularniejszy",
      "bestValue": "Najlepsza wartość",
      "buyNow": "Kup teraz",
      "startFree": "Zacznij za darmo z {count} kredytami"
    },
    "cta": {
      "title": "Gotowy uprościć śledzenie wydatków?",
      "subtitle": "Dołącz do tysięcy użytkowników, którzy oszczędzają czas dzięki skanowaniu paragonów przez AI. Zacznij za darmo już dziś.",
      "button": "Rozpocznij za darmo",
      "noCreditCard": "Bez karty kredytowej. {count} darmowych skanów w zestawie."
    }
  },
  "dashboard": {
    "welcome": "Witaj ponownie{name, select, other {, {name}} }!",
    "weeklyStats": "Ten tydzień",
    "totalSpent": "Suma wydatków",
    "receiptsScanned": "Paragony",
    "avgPerReceipt": "Średnia na paragon",
    "scanReceipt": "Skanuj paragon",
    "recentScans": "Ostatnie skany",
    "viewAll": "Zobacz wszystkie"
  },
  "receipts": {
    "title": "Paragony",
    "empty": {
      "title": "Brak paragonów",
      "description": "Zeskanuj pierwszy paragon, aby rozpocząć śledzenie wydatków",
      "cta": "Skanuj paragon"
    },
    "noResults": {
      "title": "Brak wyników",
      "description": "Spróbuj zmienić filtry lub zakres dat",
      "clearFilters": "Wyczyść filtry"
    },
    "status": {
      "pending": "Oczekuje",
      "processing": "Przetwarzanie",
      "completed": "Zakończono",
      "failed": "Błąd"
    },
    "filters": {
      "dateRange": "Zakres dat",
      "category": "Kategoria",
      "allCategories": "Wszystkie kategorie"
    }
  },
  "receipt": {
    "store": "Sklep",
    "date": "Data",
    "items": "Pozycje",
    "subtotal": "Suma częściowa",
    "tax": "Podatek",
    "total": "Suma",
    "notes": "Notatki",
    "category": "Kategoria",
    "addNote": "Dodaj notatkę...",
    "reanalyze": "Analizuj ponownie",
    "deleteConfirm": {
      "title": "Usuń paragon",
      "description": "Czy na pewno chcesz usunąć ten paragon? Tej operacji nie można cofnąć."
    }
  },
  "reports": {
    "title": "Raporty",
    "period": {
      "week": "Tydzień",
      "month": "Miesiąc",
      "year": "Rok",
      "all": "Wszystko"
    },
    "summary": {
      "totalSpent": "Suma wydatków",
      "receipts": "Paragony",
      "avgPerReceipt": "Średnia na paragon"
    },
    "byCategory": "Według kategorii",
    "byStore": "Według sklepu",
    "byDay": "Wydatki dzienne",
    "noData": "Brak danych o wydatkach w tym okresie"
  },
  "profile": {
    "title": "Profil",
    "accountInfo": "Informacje o koncie",
    "name": "Imię",
    "email": "Email",
    "memberSince": "Członek od",
    "language": "Język",
    "currency": "Preferowana waluta",
    "credits": "Kredyty",
    "creditsAvailable": "dostępnych kredytów",
    "buyCredits": "Kup kredyty",
    "transactionHistory": "Historia transakcji",
    "viewAllTransactions": "Zobacz wszystkie",
    "noTransactions": "Brak transakcji",
    "accountSettings": "Ustawienia konta",
    "passwordSecurity": "Hasło i bezpieczeństwo",
    "manage": "Zarządzaj",
    "deleteAccount": "Usuń konto",
    "deleteAccountDescription": "Trwale usuń swoje konto i wszystkie dane",
    "deleteConfirm": {
      "title": "Czy na pewno?",
      "description": "Tej operacji nie można cofnąć. Spowoduje to trwałe usunięcie Twojego konta i wszystkich danych, w tym paragonów i kredytów."
    }
  },
  "credits": {
    "title": "Kup kredyty",
    "currentBalance": "Aktualny stan: {count} kredytów",
    "oneCredit": "1 kredyt = 1 skan paragonu",
    "neverExpire": "Kredyty nigdy nie wygasają",
    "securePayment": "Bezpieczna płatność przez Stripe",
    "success": {
      "title": "Płatność zakończona!",
      "description": "{count} kredytów zostało dodanych do Twojego konta.",
      "newBalance": "Nowy stan: {count} kredytów",
      "startScanning": "Zacznij skanować"
    },
    "balance": {
      "low": "Niski stan",
      "empty": "Brak kredytów"
    },
    "insufficient": {
      "title": "Brak kredytów",
      "description": "Kup więcej kredytów, aby kontynuować skanowanie paragonów",
      "cta": "Kup kredyty"
    }
  },
  "transactions": {
    "types": {
      "signup_bonus": "Bonus powitalny",
      "purchase": "Zakup",
      "usage": "Skan paragonu",
      "refund": "Zwrot"
    }
  },
  "upload": {
    "dropzone": "Upuść zdjęcie paragonu tutaj lub kliknij, aby wybrać",
    "scanning": "Skanowanie...",
    "processing": "Przetwarzanie paragonu..."
  },
  "errors": {
    "generic": "Coś poszło nie tak. Spróbuj ponownie.",
    "uploadFailed": "Nie udało się wgrać pliku",
    "saveFailed": "Nie udało się zapisać zmian",
    "deleteFailed": "Nie udało się usunąć",
    "reanalyzeFailed": "Nie udało się ponownie przeanalizować",
    "unauthorized": "Zaloguj się, aby kontynuować",
    "notFound": "Nie znaleziono",
    "insufficientCredits": "Potrzebujesz co najmniej 1 kredytu, aby zeskanować paragon",
    "rateLimited": "Zbyt wiele żądań. Poczekaj chwilę."
  },
  "success": {
    "saved": "Zapisano zmiany",
    "deleted": "Usunięto pomyślnie",
    "uploaded": "Wgrywanie zakończone"
  }
}
```

#### `components/language-switcher.tsx`

```typescript
'use client';

import { useTransition } from 'react';
import { useLocale } from 'next-intl';
import { locales, localeNames, Locale } from '@/i18n/config';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function LanguageSwitcher() {
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  const handleChange = (newLocale: Locale) => {
    startTransition(() => {
      // Set cookie
      document.cookie = `locale=${newLocale};path=/;max-age=31536000`;
      // Reload to apply
      window.location.reload();
    });
  };

  return (
    <Select value={locale} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {locales.map((loc) => (
          <SelectItem key={loc} value={loc}>
            {localeNames[loc]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

#### `components/footer.tsx`

```typescript
import { LanguageSwitcher } from '@/components/language-switcher';
import { useTranslations } from 'next-intl';

export function Footer() {
  const t = useTranslations('common');

  return (
    <footer className="border-t py-6 mt-auto">
      <div className="container flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} {t('appName')}
        </p>
        <LanguageSwitcher />
      </div>
    </footer>
  );
}
```

### Files to Modify

#### `next.config.ts`

```typescript
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig = {
  // ... existing config
};

export default withNextIntl(nextConfig);
```

#### `app/layout.tsx`

```typescript
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

export default async function RootLayout({ children }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

#### Example Component Migration

**Before:**
```typescript
export function NoReceipts() {
  return (
    <div>
      <h3>No receipts yet</h3>
      <p>Scan your first receipt to start tracking expenses</p>
      <Button>Scan Receipt</Button>
    </div>
  );
}
```

**After:**
```typescript
import { useTranslations } from 'next-intl';

export function NoReceipts() {
  const t = useTranslations('receipts.empty');

  return (
    <div>
      <h3>{t('title')}</h3>
      <p>{t('description')}</p>
      <Button>{t('cta')}</Button>
    </div>
  );
}
```

### Database Changes

Add language preference to users table (in PRD-02 schema):

```sql
ALTER TABLE users ADD COLUMN language TEXT DEFAULT 'en';
```

Update `lib/db/schema.ts`:

```typescript
export const users = pgTable('users', {
  // ... existing columns
  language: text('language').default('en'),
});
```

### Formatting Utilities

#### `lib/format.ts`

```typescript
import { useLocale } from 'next-intl';

export function useFormatters() {
  const locale = useLocale();

  return {
    formatCurrency: (amount: number, currency: string = 'PLN') => {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
      }).format(amount);
    },

    formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions) => {
      return new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        ...options,
      }).format(new Date(date));
    },

    formatNumber: (num: number) => {
      return new Intl.NumberFormat(locale).format(num);
    },

    formatRelativeTime: (date: Date | string) => {
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
      const diff = Date.now() - new Date(date).getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));

      if (days === 0) return rtf.format(0, 'day'); // "today"
      if (days === 1) return rtf.format(-1, 'day'); // "yesterday"
      if (days < 7) return rtf.format(-days, 'day');
      if (days < 30) return rtf.format(-Math.floor(days / 7), 'week');
      return rtf.format(-Math.floor(days / 30), 'month');
    },
  };
}
```

## Integration with Other PRDs

### PRD-05 (Profile Page)
- Add language selector to account settings
- Save language preference to database

### PRD-07 (Landing Page)
- All copy must use translation keys
- Hero, features, pricing, CTAs

### PRD-08 (UX Polish)
- Toast messages must use translation keys
- Empty states must use translation keys

## Testing

```typescript
// i18n/messages.test.ts
import en from './messages/en.json';
import pl from './messages/pl.json';

describe('Translations', () => {
  it('has all keys in both languages', () => {
    const enKeys = getAllKeys(en);
    const plKeys = getAllKeys(pl);

    // Check no missing keys in Polish
    for (const key of enKeys) {
      expect(plKeys).toContain(key);
    }

    // Check no extra keys in Polish
    for (const key of plKeys) {
      expect(enKeys).toContain(key);
    }
  });

  it('has no empty translations', () => {
    const checkEmpty = (obj: any, path = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const fullPath = path ? `${path}.${key}` : key;
        if (typeof value === 'string') {
          expect(value.trim()).not.toBe('');
        } else {
          checkEmpty(value, fullPath);
        }
      }
    };

    checkEmpty(en);
    checkEmpty(pl);
  });
});
```

## Acceptance Criteria

- [ ] next-intl installed and configured
- [ ] English and Polish translation files complete
- [ ] Language auto-detected from browser
- [ ] Language switcher in footer (all pages)
- [ ] Language selector in profile settings
- [ ] Language preference saved to database for authenticated users
- [ ] Language preference saved to cookie for guests
- [ ] All UI strings use translation keys (no hardcoded text)
- [ ] Dates formatted according to locale
- [ ] Numbers formatted according to locale
- [ ] Currency formatted according to locale
- [ ] Translation test passes (no missing keys)

## Future Languages

To add a new language:

1. Create `i18n/messages/{code}.json`
2. Add to `locales` array in `i18n/config.ts`
3. Add locale name to `localeNames`

No code changes needed beyond that.
