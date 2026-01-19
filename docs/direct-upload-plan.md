# Fix 413 Errors: Direct Client Upload to Supabase

## Problem
Files go through serverless function before Supabase Storage → 4.5MB Vercel limit → 413 errors on larger uploads.

## Solution
Upload directly from browser to Supabase Storage using signed URLs, bypassing Vercel entirely.

## Flow Change

**Current:**
```
Browser → POST /api/receipts/queue (file) → Supabase Storage → Workflow
         ↑ 4.5MB limit hits here
```

**New:**
```
Browser → POST /api/upload/signed-url (metadata) → returns signed URL
Browser → PUT to Supabase directly (file, no size limit)
Browser → POST /api/receipts/queue (storagePath only) → Workflow
```

## Implementation

### 1. New API Route: `/api/upload/signed-url`
**File:** `app/api/upload/signed-url/route.ts`

- Accepts: `{ filename, contentType }`
- Validates file type
- Uses Supabase service role key to generate signed upload URL
- Returns: `{ signedUrl, storagePath }`

### 2. Add Supabase Service Role Client
**File:** `lib/db/supabase.ts`

- Add `createServiceRoleClient()` function using `SUPABASE_SERVICE_ROLE_KEY`
- Needed for `createSignedUploadUrl()` (requires service role, not anon key)

### 3. Update Queue Route: `/api/receipts/queue`
**File:** `app/api/receipts/queue/route.ts`

- Accept JSON body with `storagePaths` array instead of FormData files
- Skip file upload (already done client-side)
- Keep HEIC conversion server-side (move to workflow if needed)

### 4. Client-Side Upload Utility
**File:** `lib/upload.ts`

- `uploadToStorage(file: File)` function
- Gets signed URL from API
- Uploads directly to Supabase via PUT
- Returns storage path

### 5. Update Components
**Files:**
- `components/receipt-capture.tsx`
- `components/bulk-upload.tsx`

- Use new `uploadToStorage()` utility
- Call queue API with paths instead of files

## HEIC Handling
Current server-side HEIC→JPEG conversion won't work with direct uploads. Options:
1. Convert HEIC client-side before upload (heic2any library)
2. Move conversion to workflow (process-receipt.ts)

Recommend option 2 - move to workflow since:
- Workflow already handles the image for Gemini
- Keeps client lightweight
- No extra client dependency

## Files to Modify/Create

| File | Change |
|------|--------|
| `app/api/upload/signed-url/route.ts` | **NEW** - signed URL generation |
| `lib/db/supabase.ts` | Add service role client |
| `lib/upload.ts` | **NEW** - client upload utility |
| `app/api/receipts/queue/route.ts` | Accept paths instead of files |
| `lib/workflows/process-receipt.ts` | Handle HEIC conversion |
| `components/receipt-capture.tsx` | Use direct upload |
| `components/bulk-upload.tsx` | Use direct upload |
| `.env.local` | Add `SUPABASE_SERVICE_ROLE_KEY` |

## Environment Variable
Need to add `SUPABASE_SERVICE_ROLE_KEY` - available in Supabase dashboard under Settings → API.

## Verification
1. Upload small file (< 4.5MB) - should work as before
2. Upload large file (> 4.5MB, e.g., high-res photo) - should now work
3. HEIC upload - should convert and process correctly
4. Bulk upload - all files should upload in parallel
