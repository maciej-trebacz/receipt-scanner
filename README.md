# Receipt Scanner

Scan receipts, extract data with AI, track expenses with reports.

## Tech Stack

- **Next.js 16** with App Router
- **React 19** + TypeScript
- **Tailwind CSS 4** with glassmorphic design
- **Shadcn** (radix-maia style)
- **Hugeicons**
- **SQLite** (libsql) + Drizzle ORM
- **Gemini 2.0 Flash** for OCR
- **Bun** runtime

## Quick Start

```bash
cd projects/receipt-scanner
bun install
bun lib/db/migrate.ts   # Create tables
bun lib/db/seed.ts      # Seed categories
bun dev
```

Open [http://localhost:3000](http://localhost:3000)

## Features

- Camera/gallery capture with live preview
- AI-powered receipt scanning (Gemini 2.0 Flash)
- Inferred readable item names and product types
- Bounding box highlighting on hover
- Receipt CRUD with category assignment
- Responsive design (mobile bottom nav, desktop header nav)
- Reports with spending breakdowns by product type, store, and day
- Period navigation (week/month/year with prev/next arrows)

## Environment Variables

```env
GEMINI_API_KEY=your_key_here
```

## Available Components

Shadcn UI components installed:

- AlertDialog, Badge, Button, Card
- Combobox, DropdownMenu, Field
- Input, InputGroup, Label
- Select, Separator, Textarea

Add more with:

```bash
bunx shadcn@latest add <component>
```

## Project Status

See [context.md](./context.md) for detailed roadmap and status.
