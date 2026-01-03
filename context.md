# Receipt Scanner

## Overview

Mobile-first web app to scan receipts via camera/upload, extract data with AI, and track expenses.

## Status

**Phase**: Core Features Complete (Phases 1-4)
**Tests**: 20 passing

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16.1.1 (App Router) |
| Runtime | Bun |
| Language | TypeScript 5 |
| UI | React 19.2.3 |
| Styling | Tailwind CSS 4 |
| Components | Shadcn (radix-maia style) |
| Icons | Hugeicons |
| Database | SQLite (libsql) + Drizzle ORM |
| AI | Gemini 3 Flash Preview |

## Commands

```bash
cd projects/receipt-scanner

bun dev                    # Dev server on :3000
bun build                  # Production build
bun start                  # Production server
bun test                   # Run all tests
bun lib/db/migrate.ts      # Run database migrations
bun lib/db/seed.ts         # Seed default categories
```

## Project Structure

```
receipt-scanner/
├── app/
│   ├── api/
│   │   ├── upload/route.ts        # Image upload
│   │   ├── scan/route.ts          # Gemini OCR
│   │   ├── receipts/
│   │   │   ├── route.ts           # List/Create receipts
│   │   │   ├── route.test.ts      # API tests
│   │   │   └── [id]/route.ts      # Single receipt CRUD
│   │   ├── categories/route.ts    # List categories
│   │   └── image/[...path]/route.ts  # Serve images
│   ├── receipts/
│   │   ├── page.tsx               # Receipt list
│   │   └── [id]/page.tsx          # Receipt detail/edit
│   ├── page.tsx                   # Home with capture
│   ├── layout.tsx                 # Root layout + nav
│   └── globals.css
├── components/
│   ├── ui/                        # Shadcn components (14)
│   ├── receipt-capture.tsx        # Camera/gallery input
│   ├── receipt-card.tsx           # Receipt summary card
│   ├── receipt-list.tsx           # Filterable list
│   ├── receipt-form.tsx           # Edit form
│   ├── category-picker.tsx        # Category dropdown
│   └── nav-bar.tsx                # Bottom navigation
├── lib/
│   ├── db/
│   │   ├── schema.ts              # Drizzle schema
│   │   ├── index.ts               # DB connection
│   │   ├── migrate.ts             # Create tables
│   │   ├── seed.ts                # Seed categories
│   │   └── db.test.ts             # DB tests
│   ├── gemini.ts                  # AI extraction
│   ├── gemini.test.ts             # Parsing tests
│   └── utils.ts
├── data/
│   ├── receipts.db                # SQLite database
│   └── uploads/receipts/          # Uploaded images
├── drizzle.config.ts
└── .env.local.example
```

## Database Schema

**categories**: id, name, icon, color, createdAt
**receipts**: id, storeName, storeAddress, date, currency, subtotal, tax, total, imagePath, categoryId, notes, createdAt, updatedAt
**receipt_items**: id, receiptId, name, inferredName, productType, boundingBox, quantity, unitPrice, totalPrice, discount, sortOrder

## Environment Variables

```env
GEMINI_API_KEY=your_key_here
```

## Completed Features

- [x] Camera/gallery capture with preview
- [x] Gemini 3 Flash OCR integration
- [x] Receipt CRUD operations
- [x] Category assignment
- [x] Receipt list with filtering
- [x] Receipt detail/edit view
- [x] Mobile-first bottom navigation
- [x] SQLite database with Drizzle ORM
- [x] AI-inferred readable item names (raw name shown on hover)
- [x] AI-inferred product types (e.g., "bread", "milk", "vegetables")
- [x] Bounding boxes for receipt items with hover highlighting
- [x] Desktop split layout (image left, data right)
- [x] 20 passing tests

## Remaining Phases

### Phase 5: Reports
- [ ] `/api/reports` endpoint with aggregations
- [ ] Budget summary component (CSS bars)
- [ ] `/reports` page with spending by category

### Phase 6: Test Coverage
- [ ] Edge case tests
- [ ] Shared test utilities

### Phase 7: Polish
- [ ] Loading states (Suspense)
- [ ] Error handling
- [ ] Empty states
