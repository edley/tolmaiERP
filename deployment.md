# Tolmai ERP — Deployment Guide

## Prerequisites

- Node.js 20+ (24.x recommended for Vercel)
- npm 10+
- A Supabase project (free tier works)
- A Vercel account (for production deployment)

## Environment Variables

Copy `.env.example` to `.env` and fill in:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_FUNCTIONS_URL=https://your-project.supabase.co/functions/v1
VITE_ADMIN_EMAIL=admin@example.com
```

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL (from Project Settings → API) |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key (same page) |
| `VITE_SUPABASE_FUNCTIONS_URL` | No | For waitlist email notification via Edge Function |
| `VITE_ADMIN_EMAIL` | No | Admin email for waitlist notifications |

## Local Development

```bash
npm install
npm run dev
```

Starts dev server at `http://localhost:5173` with hot module replacement.

## Build

```bash
npm run build
```

Runs `tsc -b` (TypeScript type-check) then `vite build` (production bundle). Output goes to `dist/`.

### Build Notes

- TypeScript strict mode is enabled — all types must be correct for the build to pass
- The build may show a chunk size warning (>500 kB), which is normal for a SPA of this size
- To verify the build locally: `npm run preview`

## Supabase Setup

### 1. Create a Supabase project
Go to https://supabase.com and create a new project.

### 2. Apply the schema
Run the SQL files in **order** using the Supabase SQL Editor:

```sql
-- 1. Base schema (tables, indexes, initial seed)
-- Open supabase-schema.sql, copy contents, run in SQL Editor

-- 2. Migration (adds allocation_types, user_profiles, companies, etc.)
-- Open supabase-migration.sql, copy contents, run in SQL Editor

-- 3. RLS policies (company-scoped security)
-- Open supabase-rls.sql, copy contents, run in SQL Editor

-- 4. Optional: sample data (US GAAP chart + 20+ journal entries)
-- Open supabase-seed.sql, copy contents, run in SQL Editor
```

**Note:** The `supabase-migration.sql` includes `IF NOT EXISTS` / `IF EXISTS` guards and can safely be re-run.

### 3. Enable Auth
- Go to **Authentication → Settings** in Supabase dashboard
- Enable email/password sign-up (or your preferred provider)
- Optionally disable "Confirm email" for development

### 4. Key tables created
- `accounts` — Chart of Accounts
- `journal_entries`, `journal_entry_items`, `journal_entry_item_allocations`
- `payments`, `payment_lines`, `payment_line_allocations`
- `receipts`, `receipt_lines`, `receipt_line_allocations`
- `ledger_entries`
- `allocation_mappings`, `allocation_types`
- `companies`, `user_companies`, `user_profiles`
- `accounting_periods`, `payment_modes`, `transaction_types`
- `budget_gl_accounts`, `budget_allocation_codes`, `budget_expense_types`
- `trial_balances`, `field_audit_log`, `user_tasks`, `waitlist_signups`

## Deploy to Vercel

### Via Vercel CLI (recommended for development deployment)

```bash
npm i -g vercel
vercel --prod
```

### Via Vercel Dashboard (recommended for production)

1. Push your repository to GitHub/GitLab/Bitbucket
2. Go to https://vercel.com and import the repository
3. Configure:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
   - **Node.js version:** 24.x
4. Add environment variables in Vercel Dashboard → Project Settings → Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - (Optional) `VITE_SUPABASE_FUNCTIONS_URL`
   - (Optional) `VITE_ADMIN_EMAIL`
5. Deploy

### Vercel Configuration (`vercel.json`)

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

This ensures all routes serve `index.html` for client-side routing. The app uses React Router v7 for all navigation.

### Project Settings (`.vercel/project.json`)

```json
{
  "framework": "vite",
  "nodeVersion": "24.x"
}
```

## Deployment Checklist

- [ ] Environment variables set in Vercel Dashboard
- [ ] Supabase schema applied (all SQL files in order)
- [ ] `npm run build` passes locally
- [ ] Vercel project connected to git repository
- [ ] SPA rewrite rule in `vercel.json`
- [ ] After deploy, test authentication
- [ ] Test creating a payment, receipt, and journal entry
- [ ] Verify allocation dropdowns appear for GL codes with `allocation_allow = true`
- [ ] Check browser console for any Supabase query errors

## Common Issues

### "Failed to fetch" errors in console
- Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set correctly
- Verify CORS settings in Supabase Dashboard → Authentication → Settings
- Ensure RLS policies from `supabase-rls.sql` have been applied

### SPA 404 on page refresh
- Ensure `vercel.json` has the rewrite rule: `{ "source": "/(.*)", "destination": "/index.html" }`
- No additional Vercel configuration needed — the SPA preset handles this

### "column company_id does not exist" errors
- Run `supabase-migration.sql` — it adds `company_id` columns to tables that need them
- The migration uses `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for safety

### Nothing shows in list views
- Check the Accounting Period dropdown — it filters all transaction lists by period
- Change period filter or leave it blank to see all records
- If using the old localStorage data, a full page refresh may be needed after Supabase migration

### Allocation button doesn't appear
- Verify the GL account has `allocation_allow = true` in Chart of Accounts
- Check the `allocation_mappings` table has entries for that GL code with `active = true`
- Allow a moment for the hooks to fetch data (they load asynchronously)

## Edge Functions (Optional)

The waitlist notification function requires a separate deployment:

```bash
cd supabase/functions/notify-waitlist
supabase functions deploy notify-waitlist --no-verify-jwt
```

Requires `RESEND_API_KEY` set in Supabase Dashboard → Edge Functions settings.
