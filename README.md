# Tolmai ERP

A Frappe/ERPNext-inspired ERP built with React + Supabase.

## Modules

- **Chart of Accounts** — Hierarchical account tree (assets, liabilities, equity, income, expenses) with CRUD, tree view, and GL account assignments
- **Journal Entries** — Double-entry transaction recording (draft → submitted → approved → posted → cancelled) with full audit trail
- **General Ledger** — Immutable ledger with running balance, filterable by account/date/period, Excel export
- **Cash Book** — Cash account transactions with opening/closing balance
- **Bank Report** — Per-bank-account transaction view with period/account filters, CR/DR/Net/Count stats, credit/debit columns, fixed-header scrollable table, Excel export
- **Bank Accounts (Payment Modes)** — Company-scoped bank accounts with bank account no, account type (Savings/Checking/Payroll/Cash), address, location, and GL account assignment
- **Receipts** — Full lifecycle (draft → submitted → approved → posted → cancelled) with period filtering, payment mode selection, audit trail
- **Payments** — Full lifecycle (draft → submitted → approved → posted → cancelled) with period filtering, payment mode selection, audit trail
- **Financial Reports** — Trial Balance, Balance Sheet, Profit & Loss, Expense Type Report
- **Allocation Types** — Configurable allocation classification with percentage validation
- **Allocation Mappings** — GL account → allocation code mapping with percentage enforcement
- **Accounting Periods** — Month-based periods with open/closed status
- **User Tasks** — Per-user, per-company task manager with due dates, completion percentage, color-coded status (overdue/today/soon/future/done), inline editing, accessible from avatar menu
- **Waitlist** — Email signup stored in Supabase with optional email notification via Edge Function

## Features

- **Company Isolation** — All data scoped per company via `company_id` and RLS policies
- **RBAC** — Role-based access control (Superuser, Manager, Team Leader, User) with per-doc-type CRUD permissions
- **CRUD Task Bar** — Visual permission indicators per doc type in PageLayout headers
- **Live Clock** — Date/time display in the top navigation bar and all create/edit modals
- **Company Badge** — `Company : {name}` shown in modal headers on all create/edit dialogs
- **Excel Export** — Reports and list views support `.xlsx` download
- **Audit Trail** — Immutable change log for journal entries, receipts, and payments
- **Demo Mode** — Offline-first with localStorage fallback when Supabase is not configured

## Setup

1. Create a Supabase project at https://supabase.com
2. Copy `.env.example` to `.env` and fill in your credentials:
   - `VITE_SUPABASE_URL` — Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` — Supabase anon/public key
   - `VITE_ADMIN_EMAIL` — Admin email for Superuser auto-detection
   - `VITE_SUPABASE_FUNCTIONS_URL` — Edge Functions base URL (optional, for waitlist email)
3. Run `supabase-schema.sql` in Supabase SQL Editor (creates all tables + indexes + RLS policies)
4. (Optional) Run `supabase-seed.sql` for sample data
5. `npm run dev` to start

## Data Flow

```
Journal Entry (draft) → Submit → Journal Entry (submitted) + Ledger Entries
                                         ↓
                               Cash Book (filtered by cash accounts)
                               General Ledger (all entries)
                               Bank Report (per bank account)
                               Financial Reports (aggregated)
```

## Edge Functions

| Function | File | Purpose | Env Vars |
|----------|------|---------|----------|
| `notify-waitlist` | `supabase/functions/notify-waitlist/` | Sends email notification via Resend when someone joins the waitlist | `RESEND_API_KEY`, `ADMIN_EMAIL` |

Deploy: `supabase functions deploy notify-waitlist --no-verify-jwt`

## Tech Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- Supabase (Postgres + Auth + RLS)
- React Router v7
- Framer Motion (animations)
- Recharts (charts)
- Lucide icons
