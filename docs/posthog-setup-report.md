# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into Paragone (receipt-scanner). The integration includes client-side event tracking via `instrumentation-client.ts`, server-side tracking via `posthog-node`, and a reverse proxy setup through Next.js rewrites to avoid ad blockers.

## Events implemented

| Event | Description | File | Type |
|-------|-------------|------|------|
| `receipt_uploaded` | User uploads a receipt image for scanning | `app/dashboard/page.tsx` | client |
| `receipt_scan_confirmed` | User confirms the receipt image and initiates AI scanning | `components/receipt-capture.tsx` | client |
| `receipt_saved` | User saves a receipt after reviewing/editing extracted data | `components/receipt-form.tsx` | client |
| `receipt_deleted` | User deletes a receipt from their records | `app/receipts/[id]/page.tsx` | client |
| `receipt_reanalyzed` | User requests re-analysis of an existing receipt | `app/receipts/[id]/page.tsx` | client |
| `bulk_upload_started` | User initiates bulk upload of multiple receipts | `components/bulk-upload.tsx` | client |
| `checkout_started` | User clicks to purchase a credit package | `app/credits/page.tsx` | client |
| `credits_purchased` | Stripe webhook confirms successful credit purchase | `app/api/webhooks/stripe/route.ts` | server |
| `user_created` | New user account created via Clerk webhook | `app/api/webhooks/clerk/route.ts` | server |
| `user_deleted` | User account deleted via Clerk webhook | `app/api/webhooks/clerk/route.ts` | server |
| `reports_viewed` | User views spending reports for a specific period | `app/reports/page.tsx` | client |
| `receipt_processing_completed` | Receipt AI processing workflow completes successfully | `lib/workflows/process-receipt.ts` | server |
| `receipt_processing_failed` | Receipt AI processing workflow fails | `lib/workflows/process-receipt.ts` | server |

## Configuration files

- **Client initialization**: `instrumentation-client.ts` - PostHog JS SDK init with exception capture
- **Server client**: `lib/posthog-server.ts` - PostHog Node SDK singleton
- **Reverse proxy**: `next.config.ts` - rewrites for `/ingest/*` to EU PostHog servers

## Next steps

Create an "Analytics basics" dashboard in PostHog with the following recommended insights:

### Suggested insights

1. **Receipt scanning funnel**
   - Steps: `receipt_uploaded` → `receipt_scan_confirmed` → `receipt_saved`
   - Insight type: Funnel
   - Shows conversion through the core receipt scanning flow

2. **Credit purchase funnel**
   - Steps: `checkout_started` → `credits_purchased`
   - Insight type: Funnel
   - Tracks checkout conversion rate

3. **User retention**
   - Event: `receipt_saved`
   - Insight type: Retention
   - Shows how often users return to save receipts

4. **Feature usage over time**
   - Events: `receipt_uploaded`, `bulk_upload_started`, `reports_viewed`
   - Insight type: Trends
   - Track feature adoption

5. **Processing success rate**
   - Events: `receipt_processing_completed` vs `receipt_processing_failed`
   - Insight type: Ratio
   - Monitor AI processing reliability

### Dashboard setup

1. Go to [PostHog EU Dashboard](https://eu.posthog.com)
2. Navigate to Dashboards → New dashboard
3. Name it "Analytics basics"
4. Add the insights above using the event names from the table

### Agent skill

An agent skill folder has been left in your project at `.claude/skills/nextjs-app-router/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.
