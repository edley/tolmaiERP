# Tolmai ERP

A Frappe/ERPNext-inspired ERP built with React + Supabase.

## Modules

- **Chart of Accounts** — Hierarchical account tree (assets, liabilities, equity, income, expenses)
- **Journal Entries** — Double-entry transaction recording (draft → submitted → cancelled)
- **General Ledger** — Immutable ledger with running balance, filterable by account/date
- **Cash Book** — Cash account transactions with opening/closing balance
- **Financial Reports** — Trial Balance, Balance Sheet, Profit & Loss

## Setup

1. Create a Supabase project at https://supabase.com
2. Copy `.env.example` to `.env` and fill in your credentials
3. Run `supabase-schema.sql` in Supabase SQL Editor (creates tables + indexes + RLS)
4. (Optional) Run `supabase-seed.sql` for 80+ realistic journal entries and 100+ accounts
5. `npm run dev` to start

## Data Flow

```
Journal Entry (draft) → Submit → Journal Entry (submitted) + Ledger Entries
                                         ↓
                               Cash Book (filtered by cash accounts)
                               General Ledger (all entries)
                               Financial Reports (aggregated)
```

## Tech Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- Supabase (Postgres + Auth + RLS)
- React Router v7
- Recharts / Lucide icons
