# Tolmai ERP — UI Design Spec (Salesforce Cosmos / SLDS 2 Inspired)

## Typography

| Token | Value | Usage |
|-------|-------|-------|
| Font family | `Inter`, system sans-serif | All UI text |
| Page title | `700` weight, `1.25rem` (`text-xl`), `#16325c` | `h1` in PageLayout |
| Section heading | `700` weight, `0.875rem` (`text-sm`), `#514f4d` | "Journal Line Items", "Line Items" |
| Field label | `700` weight, `0.625rem` (`text-[10px]`), uppercase, `0.05em` letter-spacing | All form labels |
| Body / cell | `400` weight, `0.8125rem` (`text-sm`), `#16325c` | Table data, inputs |
| Small / meta | `500` weight, `0.75rem` (`text-xs`), `#514f4d` | Helper text, counts |
| Mono | `font-mono` | Numbers, amounts, codes |

## Color Palette

### Primary
```css
--slds-brand:        #0070d2;    /* Primary blue — buttons, links, active nav */
--slds-brand-hover:  #005fb2;    /* Darker blue — hover states */
--slds-brand-light:  #e8f4fe;    /* Light blue — selected rows, active bg */
```

### Text
```css
--slds-text-heading: #16325c;    /* Dark navy — titles, labels, table body */
--slds-text-body:    #514f4d;    /* Medium gray — secondary text */
--slds-text-muted:   #c9c7c5;    /* Light gray — placeholders, disabled */
--slds-text-link:    #0070d2;    /* Links */
--slds-text-white:   #ffffff;
```

### Surface / Background
```css
--slds-page-bg:      #f3f3f3;    /* Page background (Layout.tsx) */
--slds-card-bg:      #ffffff;    /* Card / form backgrounds */
--slds-row-hover:    #fafaf9;    /* Table row hover */
--slds-header-bg:    #f3f3f3;    /* Section header bg */
--slds-toolbar-bg:   #fafaf9;    /* Line items toolbar bg */
--slds-footer-bg:    #f3f3f3;    /* Summary footer bg */
```

### Borders
```css
--slds-border:       #dddbda;    /* Standard border */
--slds-border-hover: #0070d2;    /* Input hover/focus border */
--slds-border-focus: #0070d2;    /* Input focus ring (1px) */
```

### Semantic
```css
--slds-success:      #007a33;    /* DR badge, balanced state */
--slds-success-bg:   #d2f4e0;   /* Success background */
--slds-success-text: #007a33;    /* Success text */
--slds-error:        #c23934;    /* CR badge, errors, validation */
--slds-error-bg:     #fef0f0;   /* Error background */
--slds-error-text:   #c23934;    /* Error text */
--slds-warning:      #ff9e00;    /* Draft status dot */
--slds-warning-bg:   #fef7e0;   /* Draft badge bg */
--slds-warning-text: #6b5200;    /* Draft badge text */
--slds-amber:        #f9d84a;    /* Draft badge border */
```

### Status Badges
```css
/* Draft */
--badge-draft-bg:    #fef7e0;
--badge-draft-text:  #6b5200;
--badge-draft-border:#f9d84a;
--badge-draft-dot:   #ff9e00;

/* Submitted */
--badge-submitted-bg:    #e8f4fe;
--badge-submitted-text:  #0070d2;
--badge-submitted-border:#0070d2;

/* Posted / Approved */
--badge-posted-bg:    #d2f4e0;
--badge-posted-text:  #007a33;
--badge-posted-border:#007a33;

/* Cancelled */
--badge-cancelled-bg:    #fef0f0;
--badge-cancelled-text:  #c23934;
--badge-cancelled-border:#c23934;
```

### DR / CR Toggle Colors
```css
/* Debit (DR) */
--dr-bg:   #d2f4e0;
--dr-text: #007a33;
--dr-border:#007a33;

/* Credit (CR) */
--cr-bg:   #fef0f0;
--cr-text: #c23934;
--cr-border:#c23934;
```

## Spacing & Sizing

| Element | Size | Notes |
|---------|------|-------|
| Page padding | `px-8 py-5` | Content area |
| Card padding | `p-4` | Filter cards, info sections |
| Section gap | `gap-6` | Between major sections |
| Form row gap | `gap-x-3` | Between fields in a row |
| Input height | `h-7` | Compact inputs |
| Line item row padding | `px-4 py-2` | Table rows |
| Toolbar padding | `px-4 py-2.5` | Line items toolbar |
| Footer padding | `px-4 py-2.5` | Summary footer |
| Label → field gap | `mb-1` or `leading-tight` | Tight coupling |

## Borders & Corners

| Token | Value | Usage |
|-------|-------|-------|
| Input border | `1px solid #dddbda`, `rounded` (`4px`) | All inputs |
| Table border | `1px solid #dddbda` | Line items table |
| Badge radius | `rounded-full` | Status badges |
| Card radius | `rounded-lg` (`8px`) | Filter cards |
| Table radius | `rounded-t-lg` / `rounded-b-lg` | Line items table |
| Sidebar active | `border-l-3` (`3px`) | Active nav item |

## Shadows

```css
--slds-shadow-sm:   0 1px 2px rgba(0,0,0,0.04);  /* Cards, tables */
--slds-shadow-md:   0 4px 12px rgba(0,0,0,0.08);  /* Dropdowns */
--slds-shadow-lg:   0 8px 24px rgba(0,0,0,0.12);  /* Modals */
```

## Component Patterns

### Buttons

**Primary (Save/Submit)**
```html
<button class="h-7 px-4 text-xs font-semibold text-white bg-[#0070d2] rounded
               hover:bg-[#005fb2] disabled:opacity-40 disabled:cursor-not-allowed
               transition-colors inline-flex items-center gap-1.5">
  Save
</button>
```

**Secondary (Cancel)**
```html
<button class="h-7 px-3 text-xs font-medium text-[#514f4d] bg-white
               border border-[#dddbda] rounded hover:bg-[#f3f3f3] transition-colors">
  Cancel
</button>
```

**Tertiary (Add Line)**
```html
<button class="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold
               text-[#0070d2] hover:text-[#005fb2] hover:bg-[#e8f4fe] rounded transition-colors">
  + Add Line
</button>
```

### Form Fields

**Text / Date Input**
```html
<input class="w-full h-7 px-2 text-xs border border-[#dddbda] rounded
              text-[#16325c] hover:border-[#0070d2] focus:border-[#0070d2]
              focus:ring-1 focus:ring-[#0070d2] focus:outline-none" />
```

**Number Input (with $ prefix)**
```html
<div class="relative">
  <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
  <input type="number" step="0.01" min="0"
         class="w-full h-8 pl-5 pr-2.5 text-sm border rounded text-[#16325c]
                font-mono text-right hover:border-[#0070d2] focus:border-[#0070d2]
                focus:ring-1 focus:ring-[#0070d2] focus:outline-none" />
</div>
```

**Field Label**
```html
<label class="text-[10px] font-bold text-[#514f4d] uppercase tracking-wider block leading-tight">
  Field Name <span class="text-[#c23934]">*</span>
</label>
```

### Status Badges

```html
<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full
             text-[10px] font-semibold bg-[#fef7e0] text-[#6b5200]
             border border-[#f9d84a]">
  <span class="w-1.5 h-1.5 rounded-full bg-[#ff9e00]" />
  Draft
</span>
```

### DR/CR Toggle Button

```html
<button class="w-full h-8 text-xs font-bold rounded border transition-colors
               bg-[#d2f4e0] text-[#007a33] border-[#007a33]">
  DR
</button>
<!-- or -->
<button class="w-full h-8 text-xs font-bold rounded border transition-colors
               bg-[#fef0f0] text-[#c23934] border-[#c23934]">
  CR
</button>
```

### Line Items Table

- **Toolbar** — `#fafaf9` bg, section title + count + total on left, "Add Line" button on right
- **Header row** — white bg, uppercase labels, `11px` bold, `#514f4d`
- **Data rows** — alternating `#dddbda` bottom border, `hover:bg-[#fafaf9]`
- **Left accent** — `border-l-2 border-l-emerald-400` for DR rows, `border-l-2 border-l-red-400` for CR rows
- **Footer** — `#f3f3f3` bg, balance status on left, grand total on right

### Validation / Balance Status Bar

```html
<!-- Balanced -->
<div class="grid grid-cols-3 gap-3 px-4 py-1.5 text-xs font-medium border-b
            bg-[#d2f4e0] text-[#007a33] border-[#007a33]">
  <span>✓ Balanced</span>
  <span class="text-center">DR: $1,000.00</span>
  <span class="text-right">CR: $1,000.00</span>
</div>

<!-- Not Balanced -->
<div class="grid grid-cols-3 gap-3 px-4 py-1.5 text-xs font-medium border-b
            bg-[#fef0f0] text-[#c23934] border-[#c23934]">
  <span>✕ Not Balanced</span>
  <span class="text-center">DR: $1,000.00</span>
  <span class="text-right">CR: $950.00 (Diff $50.00)</span>
</div>
```

---

## Screen Layouts

### Payment Voucher (CashTransactionForm)

**Double-Entry Logic:**
- The payment mode's GL account (e.g., Bank/Cash) is **DR (debit)** — the contra account
- Each allocation line item is **CR (credit)** — the expense/other GL accounts
- DR total must always equal CR total
- When posted to ledger: `DR Bank $1,200` | `CR Expense A $500` | `CR Expense B $200` | `CR Expense C $500`

```
┌─────────────────────────────────────────────────────────────────┐
│  [Payment Number]                        [Draft]     Cancel Save │  ← Header row
├─────────────────────────────────────────────────────────────────┤
│  Period *    Date *    Amount *    Mode *                        │  ← Row 1
│  [──▼──]    [date]    [$1,200]   [──▼──]                       │
│  Paid To *              Invoice No.   Description   Contra (DR)  │  ← Row 2
│  [John Smith]          [INV-001]     [optional]    [✓ DR 1120·Bank $1,200] │
├─────────────────────────────────────────────────────────────────┤
│  Line Items                   2 lines | Total $1,200.00          │  ← Toolbar
│  #  GL Account *       DR/CR   Amount *     Running   Actions    │  ← Header
│  1  [5000·Purchases ▼]  [CR]   $500.00     $500.00   [↑↓🗑]    │  ← CR rows (red accent)
│  2  [6000·Consulting ▼] [CR]   $200.00     $700.00   [↑↓🗑]    │
│  3  [7000·Rent ▼]       [CR]   $500.00     $1,200.00 [↑↓🗑]    │
├─────────────────────────────────────────────────────────────────┤
│  ✓ Balanced      DR (Contra): $1,200.00  CR (Allocations): $1,200.00 │  ← Status bar
│  DR = CR — Ready to post to ledger                              │  ← Footer
│                                                Bank · 1120 Bank │
│                                                [GL Codes]       │
├─────────────────────────────────────────────────────────────────┤
│  Payment Mode GL Code Configuration (collapsible)               │
│  Payment Mode     GL Account (Cash/Bank)                        │
│  🟠 Cash          [1110·Cash ▼]                                 │
│  🔵 Bank          [1120·Bank ▼]                                 │
│  🔵 Mobile Money  [1130·MobileMoney ▼]                          │
└─────────────────────────────────────────────────────────────────┘
```

### Journal Entry (JournalEntryForm)

**Double-Entry Logic:**
- Each line item has a DR/CR toggle — lines can be either debit or credit
- DR total must equal CR total
- When posted to ledger: `DR Account A $X` | `CR Account B $X`

```
┌─────────────────────────────────────────────────────────┐
│  [JE-00001]                            [Draft] Cancel Save │  ← Header row
├─────────────────────────────────────────────────────────┤
│  Journal Type *  Date *    Period *   Voucher Total *  Related To │
│  [──▼──]        [date]    [──▼──]    [$0.00]          [INV-001] │
│  Description *                                                 │
│  [Brief explanation of this transaction]                        │
├─────────────────────────────────────────────────────────┤
│  Journal Line Items           2 lines | Total $1,000.00         │  ← Toolbar
│  #  GL Account *    DR/CR   Amount *    Memo     Actions        │  ← Header
│  1  [1000·Cash ▼]  [DR]    $500.00     [memo]   [↑↓🗑]        │  ← DR row (green accent)
│  2  [4000·Rev ▼]   [CR]    $500.00     [memo]   [↑↓🗑]        │  ← CR row (red accent)
├─────────────────────────────────────────────────────────┤
│  ✓ Balanced            DR: $1,000.00  CR: $1,000.00           │  ← Status bar
│  Debits equal Credits — Ready to save                         │  ← Footer
│                                          Grand Total $2,000.00 │
└─────────────────────────────────────────────────────────┘
```

---

## Interaction Patterns

### Page Transitions
- Page header is `sticky top-0 z-10` with its own background
- Content scrolls independently below

### Modal Forms
- Full-screen modal (`size="full"`) for Payment and Journal Entry
- Header bar with title + close button
- Form fills remaining height with `flex flex-col h-full`
- Line items area scrolls independently with `flex-1 overflow-y-auto`

### Keyboard Navigation
- Tab through fields in natural reading order
- Number inputs use `step="0.01"` for currency
- Date inputs use native date picker

### Responsive
- Desktop: multi-column grid layout for header fields
- Mobile: single-column stacked layout with visible labels
- Line items table collapses to card-style per row on small screens

---

## Quick Reference: Key CSS Variables to Add to `index.css`

```css
@theme {
  /* Brand */
  --color-brand: #0070d2;
  --color-brand-hover: #005fb2;
  --color-brand-light: #e8f4fe;

  /* Text */
  --color-text-heading: #16325c;
  --color-text-body: #514f4d;
  --color-text-muted: #c9c7c5;

  /* Surface */
  --color-page-bg: #f3f3f3;
  --color-card-bg: #ffffff;
  --color-row-hover: #fafaf9;
  --color-toolbar-bg: #fafaf9;
  --color-footer-bg: #f3f3f3;

  /* Border */
  --color-border: #dddbda;
  --color-border-hover: #0070d2;

  /* Semantic */
  --color-success: #007a33;
  --color-success-bg: #d2f4e0;
  --color-error: #c23934;
  --color-error-bg: #fef0f0;
  --color-warning: #ff9e00;
  --color-warning-bg: #fef7e0;
  --color-warning-text: #6b5200;
}
```

These tokens map directly to Tailwind utility classes: `bg-brand`, `text-text-heading`, `border-border`, etc.
