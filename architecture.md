# Tolmai ERP — Architecture

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend framework | React 19 with TypeScript 6 |
| Build tool | Vite 8 |
| Styling | Tailwind CSS v4 |
| Routing | React Router v7 |
| Backend / Database | Supabase (PostgreSQL + Auth + RLS) |
| Icons | Lucide React |
| Charts | Recharts |
| Animations | Framer Motion |
| Deployment | Vercel (SPA) |

## Architecture Overview

```
┌────────────────────────────────────────────────────────────┐
│                        Browser                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                React Application (SPA)                │  │
│  │                                                       │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │  │
│  │  │   Pages (28) │─▶│  Components  │─▶│  Contexts  │  │  │
│  │  └──────┬──────┘  └──────┬───────┘  │  (5)       │  │  │
│  │         │                │          └────────────┘  │  │
│  │         ▼                ▼                           │  │
│  │  ┌──────────────────────────────────────────────┐   │  │
│  │  │            Hooks Layer (14 hooks)             │   │  │
│  │  │  useAccounts · usePayments · useReceipts ·    │   │  │
│  │  │  useJournalEntries · useAllocationMappings ·  │   │  │
│  │  │  useAllocationTypes · useBudgetCheck · ...    │   │  │
│  │  └──────────────────────┬───────────────────────┘   │  │
│  │                         │                            │  │
│  │  ┌──────────────────────▼───────────────────────┐   │  │
│  │  │            Lib Layer (25 modules)             │   │  │
│  │  │  supabase.ts · payments.ts · receipts.ts ·   │   │  │
│  │  │  journalEntries.ts · allocationMappings.ts ·  │   │  │
│  │  │  allocationTypes.ts · auth.ts · rbac.ts · ...│   │  │
│  │  └──────────────────────┬───────────────────────┘   │  │
│  │                         │                            │  │
│  │  ┌──────────────────────▼───────────────────────┐   │  │
│  │  │        localStorage (offline fallback)        │   │  │
│  │  │  payments · receipts · journalEntries ·       │   │  │
│  │  │  paymentModes · fieldAuditLog · ...           │   │  │
│  │  └──────────────────────────────────────────────┘   │  │
│  └──────────────────────┬──────────────────────────────┘  │
└─────────────────────────┼─────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │    Supabase Client     │
              │  (@supabase/supabase-js)│
              └───────────┬───────────┘
                          │
              ┌───────────▼───────────┐
              │    Supabase Cloud      │
              │  ┌─────────────────┐  │
              │  │  PostgreSQL DB   │  │
              │  │  + RLS Policies  │  │
              │  └─────────────────┘  │
              │  ┌─────────────────┐  │
              │  │  Auth Service    │  │
              │  └─────────────────┘  │
              │  ┌─────────────────┐  │
              │  │ Edge Functions   │  │
              │  └─────────────────┘  │
              └───────────────────────┘
```

## Layer Descriptions

### Pages (`src/pages/`)
28 route-level components, each in its own subdirectory. They compose `Components`, `Hooks`, and `Contexts` to render full-page views. Examples: `Payments/`, `JournalEntries/`, `ChartOfAccounts/`.

### Components (`src/components/`)
Reusable UI building blocks:
- **Form components:** `CashTransactionForm`, `CashReceiptForm`, `JournalEntryForm`, `AccountForm`
- **Layout:** `DataTable`, `Modal`, `LookupField`, `EditableNumber`, `PageLayout`
- **Navigation:** `Layout/Sidebar`, `Layout/Header`, `Layout/index`
- **Auth:** `MFA/MFAChallenge`, `MFA/MFAEnroll`, `MFA/MFAGate`, `MFASettings`
- **UI primitives:** `ui/button`, `ui/dropdown-menu`, `ui/login-form`, `ui/logo`, etc.

### Contexts (`src/contexts/`)
5 React contexts providing global state:

| Context | Purpose |
|---------|---------|
| `AuthContext` | Current user, session, login/logout, MFA status |
| `CompanyContext` | Current company selection, company list |
| `PeriodContext` | Current accounting period, period list |
| `ThemeContext` | Theme toggle (light/dark) |
| `ViewFilterContext` | List view filter ('all', 'recent', '10days') |

### Hooks (`src/hooks/`)
14 custom hooks encapsulating business logic and data access:

| Hook | Data Source | Fallback |
|------|------------|----------|
| `useAccounts` | Supabase `accounts` | In-memory demo |
| `usePayments` | Supabase `payments` + `payment_lines` | localStorage + in-memory |
| `useReceipts` | Supabase `receipts` + `receipt_lines` | localStorage + in-memory |
| `useJournalEntries` | Supabase `journal_entries` + `journal_entry_items` | localStorage + in-memory |
| `useAllocationMappings` | Supabase `allocation_mappings` | In-memory demo |
| `useAllocationTypes` | Supabase `allocation_types` | In-memory demo |
| `useBudgetCheck` | Supabase `budget_gl_accounts` | None |
| `useLedger` | Supabase `ledger_entries` | In-memory demo |
| `useTrialBalance` | Supabase `trial_balances` | Computed |
| `usePaymentModes` | Supabase `payment_modes` | localStorage + hardcoded |
| `useTransactionTypes` | Supabase `transaction_types` | In-memory demo |
| `useExpenseTypeReport` | Supabase computed | None |
| `useAllocationReport` | Supabase computed | None |
| `useRBAC` | Auth context + permissions lib | None |

### Lib (`src/lib/`)
25 modules for shared utilities, API wrappers, and offline persistence:

| File | Purpose |
|------|---------|
| `supabase.ts` | Supabase client init, `isOnline()` check |
| `auth.ts` | Login, signup, MFA operations |
| `payments.ts` | localStorage CRUD for payments |
| `receipts.ts` | localStorage CRUD for receipts |
| `journalEntries.ts` | localStorage CRUD for journal entries |
| `allocationMappings.ts` | `resolveMappingAccounts()` helper |
| `allocationTypes.ts` | `resolveTypeAccounts()`, `getTypeNamesForGlCode()` |
| `paymentModes.ts` | Payment mode definitions + localStorage |
| `fieldAuditLog.ts` | Field-level change tracking |
| `demo.ts` | Demo data builders, `isSupabaseConfigured()` |
| `rbac.ts` | Permission/role definitions |
| `menus.ts` | Navigation menu structure |
| `accounting.ts` | Double-entry accounting logic |

### Types (`src/types/index.ts`)
Central type definitions: `Account`, `JournalEntry`, `JournalEntryItem`, `AllocationMapping`, `AllocationType`, `LedgerEntry`, `Company`, `UserProfile`, `TrialBalanceRow`, etc.

## Data Flow Patterns

### CRUD Pattern (e.g., Payments)
```
User action → Form → Hook (createPayment) → persistPayment (localStorage)
                                          → demoPayments updated (in-memory)
                                          → setPayments (React state)
                                          → persistToDb (Supabase)
                                          → onSuccess → refetch → fetchPayments
```

### Allocation Data Flow
```
Allocation Mappings Page        Transaction Form
┌────────────────────┐         ┌────────────────────┐
│ useAllocationMappings│         │ useAllocationMappings │
│   .mappings        │         │   .mappings        │
│   .addMapping()    │         │                    │
│   .updateMapping() │         │  canAlloc =         │
│   .deleteMapping() │         │  mappings.some(...) │
└─────────┬──────────┘         └─────────┬──────────┘
          │                              │
          ▼                              ▼
  ┌──────────────────────────────────────────┐
  │           Supabase alllocation_mappings    │
  │           (company-scoped via RLS)        │
  └──────────────────────────────────────────┘
```

### Fetch with Fallback (used by all data hooks)
```
fetchData()
  ├─ Online + Supabase configured?
  │   ├─ Yes → Query Supabase (company-scoped)
  │   │   ├─ Has data → set state, update cache
  │   │   └─ Empty   → keep existing cache, try localStorage
  │   └─ No  → Try localStorage
  │       ├─ Has data → restore into state
  │       └─ Empty   → use in-memory demo data
```

## Key Database Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `accounts` | Chart of Accounts | `id`, `code`, `name`, `type`, `parent_id`, `allocation_allow`, `company_id` |
| `journal_entries` | Journal entry headers | `id`, `entry_number`, `status`, `period_id`, `company_id` |
| `journal_entry_items` | JE line items | `id`, `journal_entry_id`, `account_id`, `debit`, `credit` |
| `payments` | Payment voucher headers | `id`, `voucher_number`, `mode_of_payment_id`, `period_id`, `company_id` |
| `payment_lines` | Payment line items | `id`, `payment_id`, `gl_account_id`, `amount` |
| `payment_line_allocations` | Payment allocation splits | `payment_line_id`, `allocation_code`, `expense_type`, `amount` |
| `receipts` | Receipt voucher headers | `id`, `voucher_number`, `mode_of_payment_id`, `period_id`, `company_id` |
| `receipt_lines` | Receipt line items | `id`, `receipt_id`, `gl_account_id`, `amount` |
| `receipt_line_allocations` | Receipt allocation splits | `receipt_line_id`, `allocation_code`, `expense_type`, `amount` |
| `journal_entry_item_allocations` | JE allocation splits | `journal_entry_item_id`, `allocation_code`, `expense_type`, `amount` |
| `allocation_mappings` | GL code → allocation code | `gl_code`, `allocation_code`, `active`, `company_id` |
| `allocation_types` | GL code → type names | `gl_code`, `name`, `active`, `company_id` |
| `ledger_entries` | Immutable general ledger | `account_id`, `debit`, `credit`, `posting_date`, `period_id` |
| `accounting_periods` | Fiscal periods | `name`, `start_date`, `end_date`, `status`, `company_id` |
| `companies` | Multi-company tenants | `name`, `tax_id`, `currency`, `fiscal_year_start` |

## Allocation System

### Two-Level Allocation
1. **Allocation Codes** (`allocation_mappings`): Broad categories per GL code (e.g., ADMIN, SALES, IT for GL 6310)
2. **Allocation Types** (`allocation_types`): Sub-categories per GL code (e.g., New Receipt, Invoice for GL 1210)

### Component Responsibilities
- **Allocation Mappings page** (`/allocation-mappings`): CRUD for `allocation_mappings` table
- **Allocation Types page** (`/allocation-types`): CRUD for `allocation_types` table
- **Transaction forms** (payment/receipt/JE): Read from both tables to populate allocation dropdowns

### Caching Strategy
- **Module-level cache:** `let demoPayments`, `let demoReceipts`, `let demoEntries`, `let inMemoryCache` — shared across all hook instances
- **localStorage:** Persistent fallback for transaction data (payments, receipts, journal entries)
- **In-memory demo:** Fallback for reference data (accounts, allocation mappings, allocation types, transaction types)
- **Supabase:** Source of truth — all writes go to Supabase; reads prefer Supabase and fall back through the chain

## Security

- **RLS (Row-Level Security):** All business tables have `FOR ALL` policies scoped to `company_id IN (SELECT public.user_company_ids())`
- **RBAC (Role-Based Access Control):** Superuser, Manager, Team Leader, User roles with per-doc-type CRUD permissions
- **MFA:** TOTP-based multi-factor authentication via authenticator apps
- **Session tracking:** Active session monitoring with force-logout capability
