# Tolmai ERP — Plan & Progress

## Project Overview

Tolmai ERP is a Frappe/ERPNext-inspired accounting system built with **React 19 + TypeScript + Vite** on the frontend and **Supabase** (PostgreSQL + RLS) as the backend. It provides double-entry accounting with journal entries, payments, receipts, general ledger, financial reports, and allocation management.

## What We've Achieved

### Allocation System Overhaul (Latest Sprint)

**Goal:** Replace hardcoded/static allocation data with a dynamic, database-driven system sourced from Supabase, removing all dependency on hardcoded constants and localStorage for allocation mappings/types.

#### Before
- `CashTransactionForm.tsx`, `CashReceiptForm.tsx`, `JournalEntryForm.tsx` each had **~80 lines** of hardcoded `DEMO_MAPPINGS` and `DEMO_TYPE_NAMES` constants
- Allocation data was defined inline, duplicated across three files — changing a single code required editing all three
- No Supabase persistence for allocation types or custom mappings
- Users couldn't add/modify allocation codes or types from the UI in a way that would persist

#### After
- **`useAllocationMappings.ts`** — A new hook that:
  - Fetches allocation mappings from Supabase (`allocation_mappings` table), scoped to the current company
  - Auto-seeds demo data into the table when it's empty
  - Falls back to in-memory demo data if Supabase is unavailable or seeding fails
  - Supports CRUD: `addMapping`, `updateMapping`, `deleteMapping` — writes to Supabase, falls back to local state
- **`useAllocationTypes.ts`** — Same pattern for allocation types (`allocation_types` table), with auto-seed and in-memory fallback
- **`AllocationMappings.tsx`** page — Now uses the hook, reads/writes from Supabase, supports inline editing, toggling active state, bulk delete
- **`AllocationTypes.tsx`** page — Same treatment, manages type definitions per GL code
- **All three transaction forms** — Now import `useAllocationMappings()` and `useAllocationTypes()` instead of hardcoded data; allocation codes and type names are derived directly from the hook data
- **`supabase-migration.sql`** — Added `allocation_types` table with `company_id`, RLS, indexes, and trigger

### Data Persistence & Cache Fixes

**Problem:** Newly created payments, receipts, and journal entries would disappear from the list UI after creation.

**Root cause:** In `fetchPayments()`, `fetchReceipts()`, and `fetchJournalEntries()`, when the Supabase query returned 0 rows (e.g., due to a period filter mismatch or transient RLS issue), the in-memory cache (`demoPayments`, `demoReceipts`, `demoEntries`) was **wiped to empty** and `fromDb` was set to `true`, preventing the localStorage fallback from running.

**Fix:** Changed all three fetch functions to only update the cache from Supabase when data is actually returned (`data.length > 0`). When Supabase returns empty, the existing in-memory cache is preserved and the localStorage fallback can still restore data.

### Vercel Deployment

- Successfully deployed to `https://tolmai-erp.vercel.app`
- SPA rewrite rule in `vercel.json` ensures all routes serve `index.html`
- Node 24.x build environment
- Build: `tsc -b && vite build`

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Supabase as source of truth for allocation data | Users need to manage allocation codes/types from the UI and have changes persist across sessions and devices |
| In-memory fallback when Supabase is unavailable | Ensures the app works during development or when offline without requiring a full Supabase setup |
| Auto-seeding on first use | Eliminates manual setup; the tables are populated with sensible defaults when first queried |
| Module-level cache variable (not React state) for demo data | Shared across hook instances so that two components using the same hook see consistent data without a double fetch |
| Hardcoded demo data replaced with hook-driven data in transaction forms | Single source of truth; no duplication; changes made in the Allocation Mappings/Types pages immediately reflect in transaction forms |

## Recent File Changes

| File | Change |
|------|--------|
| `src/hooks/useAllocationMappings.ts` | New — Supabase-backed hook with fallback and CRUD |
| `src/hooks/useAllocationTypes.ts` | New — Supabase-backed hook with fallback and CRUD |
| `src/lib/allocationMappings.ts` | Simplified to `resolveMappingAccounts` helper only |
| `src/lib/allocationTypes.ts` | Simplified to `resolveTypeAccounts` and `getTypeNamesForGlCode` helpers |
| `src/types/index.ts` | Added `company_id` field to `AllocationType` interface |
| `supabase-migration.sql` | Added `allocation_types` table creation |
| `src/components/CashTransactionForm.tsx` | Removed `DEMO_MAPPINGS`/`DEMO_TYPE_NAMES`; uses hooks instead |
| `src/components/CashReceiptForm.tsx` | Same |
| `src/components/JournalEntryForm.tsx` | Same |
| `src/components/AllocationMappings.tsx` | Updated to use `useAllocationMappings` hook |
| `src/components/AllocationTypes.tsx` | Updated to use `useAllocationTypes` hook |
| `src/pages/Payments/Payments.tsx` | Period filter note updated |
| `src/hooks/usePayments.ts` | Fixed cache-wiping bug in `fetchPayments` |
| `src/hooks/useReceipts.ts` | Fixed same bug in `fetchReceipts` |
| `src/hooks/useJournalEntries.ts` | Fixed same bug in `fetchEntries` |

## Next Steps / Known Issues

- **Allocation button visibility:** If `useAllocationMappings` data is still loading when the user selects a GL account, the Allocation button briefly shows as "—" before appearing. Add loading indicators.
- **Supabase migration must be applied** for `allocation_types` table and `company_id` column on existing deployments.
- **Budget-related features** (`$19,500 remaining` message) are separate from allocation — controlled by `useBudgetCheck` querying `budget_gl_accounts`.
