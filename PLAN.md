# tolmailERP — Invoice & Receipt Processing System

## 1. System Overview

Full-stack system to ingest, classify, extract, and manage financial documents (receipts, invoices, payment proofs, IDs, etc.) from multiple sources:

1. **Ingests** PDFs from web upload (multi-file drag & drop), WhatsApp (Meta Cloud API), and optionally email
2. **Classifies** documents by type (receipt/invoice/payment_proof/id/passport/etc.) — non-financial docs skip extraction
3. **Extracts** structured data via LLM (NVIDIA Llama 3.3 70B or OpenAI) with confidence scoring + regex fallback
4. **Routes** by confidence: auto-save (≥0.85), flag for review (0.5–0.85), fallback to regex (<0.5)
5. **Auto-syncs** extracted data to ERP system
6. **Provides** a single-page 3-tab web UI (Dashboard, Proofs & Receipts, Receipts) with inline editing

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐
│  Web Upload  │───▶│  FastAPI     │───▶│  Classify    │───▶│  Receipt         │
│  (multi-PDF) │    │  Backend     │    │  doc type    │    │  Pipeline        │
├──────────────┤    │  :8000       │    └──────┬───────┘    │  (OCR → LLM →    │
│  WhatsApp    │───▶│              │           │            │   Regex → ERP)   │
│  Webhook     │    │              │           ├─ receipt   │                  │
├──────────────┤    │              │           ├─ invoice   │  (future)        │
│  Email       │───▶│              │           ├─ id        │                  │
│  (future)    │    │              │           ├─ passport  │  Skip extraction │
└──────────────┘    └──────┬───────┘           └─ other     └──────────────────┘
                           │
                    ┌──────▼──────┐
                    │  Supabase   │
                    │  (DB +      │
                    │   Storage)  │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Next.js UI │
                    │  (Vercel)   │
                    │  Dashboard  │
                    │  /Proofs    │
                    │  /Receipts  │
                    └─────────────┘
```

---

## 2. Current State — What's Built

### Backend (FastAPI)

| Component | File | Status |
|-----------|------|--------|
| PDF upload (single + multi-file) | `routers/upload.py` | ✅ Done |
| Proofs CRUD + date filtering + logs | `routers/proofs.py` | ✅ Done |
| Receipts CRUD + PATCH with auto-review | `routers/receipts.py` | ✅ Done |
| WhatsApp webhook (GET verify + POST receive) | `routers/whatsapp.py` | ✅ Done |
| Document classifier (LLM-based) | `services/document_classifier.py` | ✅ Done |
| Receipt processor (OCR → LLM → Regex → ERP) | `services/receipt_processor.py` | ✅ Done |
| LLM extractor (NVIDIA + OpenAI provider) | `services/llm_extractor.py` | ✅ Done |
| WhatsApp client (media download + send message) | `services/whatsapp_client.py` | ✅ Done |
| Auto-ERP sync in process_proof | `services/receipt_processor.py` | ✅ Done |
| Config / settings | `config.py` | ✅ Done |
| Supabase client | `supabase_client.py` | ✅ Done |
| App entry (FastAPI with CORS) | `main.py` | ✅ Done |

### Web App (Next.js 14, App Router)

| Feature | File | Status |
|---------|------|--------|
| Supabase Auth (email/password login) | `app/login/page.tsx` | ✅ Done |
| Single-page 3-tab app | `app/page.tsx` | ✅ Done |
| Dashboard tab — stat cards + date filter + multi-file upload | `app/page.tsx` | ✅ Done |
| Proofs tab — accordion rows + inline edit + doc type filter | `app/page.tsx` | ✅ Done |
| Receipts tab — full list + inline edit + search | `app/page.tsx` | ✅ Done |
| Receipt detail page (standalone) | `app/receipts/[id]/page.tsx` | ✅ Done |
| API client helpers | `lib/api.ts` | ✅ Done |
| Sticking stat cards → navigate to tab with filter | `app/page.tsx` | ✅ Done |
| Document type breakdown + filter on Dashboard | `app/page.tsx` | ✅ Done |
| Confidence badges (green/yellow/red) | `app/page.tsx` | ✅ Done |

### Database (Supabase / PostgreSQL)

| Table | Purpose | Status |
|-------|---------|--------|
| `payment_proofs` | Raw upload metadata, status, document_type, ERP info | ✅ Done |
| `proof_of_payment_receipt` | Extracted receipt data (13 fields + confidence) | ✅ Done |
| `processing_log` | Audit trail: OCR, LLM, classification, routing decisions | ✅ Done |

### Migrations

| File | Purpose |
|------|---------|
| `001-006` | Initial schema, status values |
| `007_add_reviewed_status.sql` | Adds `reviewed`/`ready_to_process` statuses |
| `008_add_receipt_fields.sql` | Adds purchase_currency, transaction_currency, transaction_amount, card_number, card_type, payee, address |
| `009_add_document_type.sql` | Adds document_type + document_type_confidence to payment_proofs |

---

## 3. Receipt Extraction Pipeline

```
Upload PDF
   │
   ├─→ Supabase Storage
   ├─→ payment_proofs insert (status: pending)
   └─→ Background thread: process_proof()
         │
         ├─ 1. OCR (pdfplumber) → raw text
         ├─ 2. Classify document type (LLM)
         │     ├─ receipt / invoice / payment_proof → continue
         │     ├─ id / passport / driving_license / birth_certificate / other → skip extraction, mark completed
         │     └─ unclassified → skip extraction
         │
         ├─ 3. LLM primary extraction (NVIDIA Llama 3.3 70B or OpenAI GPT-4o-mini)
         │     Fields: amount, currency, payer_name, bank_issuer, receipt_number,
         │     payment_date, description, purchase_currency, transaction_currency,
         │     transaction_amount, card_number, card_type, payee, address, confidence
         │
         ├─ 4. Confidence routing:
         │     ├─ ≥ 0.85 → auto-save (completed/extracted)
         │     ├─ 0.5–0.85 → flag for review (review_needed/review_needed)
         │     └─ < 0.5 → LLM fallback → still failing → regex fallback
         │
         ├─ 5. Insert proof_of_payment_receipt
         ├─ 6. Update payment_proofs.status + extracted_data + processing_method
         └─ 7. Auto-ERP sync: erp_status=synced, erp_receipt_id=ERP-{proof_id}
```

### LLM Provider Support

| Provider | Cost | Model | Config |
|----------|------|-------|--------|
| **NVIDIA** (default) | Free | `meta/llama-3.3-70b-instruct` | `LLM_PROVIDER=nvidia` |
| **OpenAI** | Paid | `gpt-4o-mini` | `LLM_PROVIDER=openai` |

Both use OpenAI-compatible client — only `base_url` and `model` differ.

### Document Types

| Type | Pipeline |
|------|----------|
| `receipt` | Full extraction |
| `invoice` | Full extraction |
| `payment_proof` | Full extraction |
| `id` | Skip — store only |
| `passport` | Skip — store only |
| `driving_license` | Skip — store only |
| `birth_certificate` | Skip — store only |
| `other` | Skip — store only |
| `unclassified` | Skip — store only |

---

## 4. Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python 3.11+ (FastAPI) |
| **Web App** | Next.js 14 (App Router) + Tailwind CSS |
| **Database** | Supabase (PostgreSQL + Storage + Auth) |
| **Auth** | Supabase Auth (email/password) |
| **OCR** | pdfplumber (text extraction from PDFs) |
| **LLM Extraction** | NVIDIA Llama 3.3 70B (free) or OpenAI GPT-4o-mini |
| **WhatsApp API** | Meta Cloud API (Graph API v22.0) |
| **Tunneling (dev)** | ngrok |
| **Icons** | lucide-react |

---

## 5. Supabase Schema

### `payment_proofs`

```sql
CREATE TABLE payment_proofs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path         TEXT NOT NULL,
  file_name         TEXT NOT NULL,
  file_size         BIGINT,
  mime_type         TEXT DEFAULT 'application/pdf',
  source            TEXT DEFAULT 'web_upload',
  status            TEXT DEFAULT 'pending',
  extracted_data    JSONB,
  processing_method TEXT,
  document_type     TEXT DEFAULT 'unclassified',
  document_type_confidence DOUBLE PRECISION,
  erp_status        TEXT DEFAULT 'pending',
  erp_receipt_id    TEXT,
  error_message     TEXT,
  tenant_id         TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
```

### `proof_of_payment_receipt`

```sql
CREATE TABLE proof_of_payment_receipt (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proof_id           UUID REFERENCES payment_proofs(id),
  receipt_number     TEXT,
  amount             DOUBLE PRECISION,
  currency           TEXT DEFAULT 'USD',
  payer_name         TEXT,
  bank_issuer        TEXT,
  description        TEXT,
  payment_date       TEXT,
  purchase_currency  TEXT,
  transaction_currency TEXT,
  transaction_amount DOUBLE PRECISION,
  card_number        TEXT,
  card_type          TEXT,
  payee              TEXT,
  address            TEXT,
  notes              TEXT,
  status             TEXT DEFAULT 'extracted',
  confidence_score   DOUBLE PRECISION,
  raw_text           TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);
```

### `processing_log`

```sql
CREATE TABLE processing_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proof_id   UUID REFERENCES payment_proofs(id),
  stage      TEXT,
  status     TEXT,
  message    TEXT,
  details    JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Status Values

**payment_proofs.status**: `pending` | `processing` | `completed` | `review_needed` | `failed` | `ready_to_process`

**proof_of_payment_receipt.status**: `extracted` | `review_needed` | `reviewed` | `synced` | `failed` | `completed`

---

## 6. Project Structure

```
tolmaiERP/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                  # FastAPI entry, CORS, router registration
│   │   ├── config.py                # Pydantic settings from .env
│   │   ├── supabase_client.py       # Supabase client singleton
│   │   ├── routers/
│   │   │   ├── upload.py            # POST /api/upload (single + multi-file)
│   │   │   ├── proofs.py            # GET /api/proofs, GET /api/proofs/{id}, GET /api/logs
│   │   │   ├── receipts.py          # GET /api/receipts, PATCH /api/receipts/{id}
│   │   │   └── whatsapp.py          # GET/POST /api/whatsapp/webhook
│   │   └── services/
│   │       ├── document_classifier.py   # LLM-based doc type classification
│   │       ├── receipt_processor.py     # Main pipeline: OCR → classify → LLM → regex → ERP
│   │       ├── llm_extractor.py         # LLM extraction (NVIDIA/OpenAI provider)
│   │       └── whatsapp_client.py       # Meta Cloud API media download + message send
│   ├── migrations/
│   │   ├── 001-006_*.sql
│   │   ├── 007_add_reviewed_status.sql
│   │   ├── 008_add_receipt_fields.sql
│   │   └── 009_add_document_type.sql
│   ├── .env
│   ├── requirements.txt
│   └── Dockerfile
├── web/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                  # Single-page 3-tab app (Dashboard/Proofs/Receipts)
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── receipts/
│   │       └── [id]/
│   │           └── page.tsx          # Standalone receipt detail
│   └── lib/
│       ├── supabase.ts               # Supabase browser client
│       └── api.ts                    # API helper functions
├── PLAN.md
└── README.md
```

---

## 7. Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **LLM Provider** | NVIDIA (free) or OpenAI | NVIDIA Llama 3.3 70B is free, returns higher confidence (0.97 vs 0.3) |
| **UI Architecture** | Single-page 3-tab | No route navigation confusion, state management via useState + key props |
| **Upload Flow** | Async with polling | Background thread processes PDF, frontend polls `/api/logs` every 2s |
| **WhatsApp API** | Meta Cloud API | Official, free for inbound + 24h replies, no ToS risk |
| **DB Access** | Supabase REST only | Avoids SQLAlchemy/psycopg2 dependency, simpler deployment |
| **ERP Sync** | Auto in process_proof | Updates ERp status directly at end of processing pipeline |
| **Document Classification** | LLM before extraction | Prevents wasted LLM calls on non-financial documents |
| **Multi-file Upload** | Sequential per-file processing | Each file gets its own background thread with DB context |

---

## 8. Implementation Phases

### Phase 1 — Foundation ✅
- [x] Initialize Python backend (FastAPI)
- [x] Initialize Next.js 14 web app with Tailwind
- [x] Configure Supabase project (DB + Storage + Auth)
- [x] Set up Supabase schema + SQL migrations
- [x] Initialize Git repo + push to GitHub

### Phase 2 — Core Backend ✅
- [x] Supabase client + config
- [x] PDF upload API (single + multi-file)
- [x] PDF OCR service (pdfplumber)
- [x] LLM extraction (NVIDIA + OpenAI provider support)
- [x] Hybrid extraction pipeline (LLM → LLM fallback → Regex)
- [x] Confidence scoring + routing
- [x] processing_log audit trail
- [x] Auto-ERP sync

### Phase 3 — Web UI ✅
- [x] Supabase Auth (email/password login)
- [x] Single-page 3-tab app (Dashboard / Proofs / Receipts)
- [x] Dashboard: stat cards, date filter, multi-file drag & drop upload
- [x] Proofs: accordion rows, status + document type badges, filterable
- [x] Receipts: full list, inline edit, search, status filters
- [x] Receipt detail page (standalone)
- [x] Confidence badges (green / yellow / red)
- [x] Clickable stat cards → navigate to tab with filter
- [x] Document type breakdown + filter

### Phase 4 — Document Classification ✅
- [x] LLM-based document type classifier
- [x] Classify before extraction — skip non-financial docs
- [x] document_type + document_type_confidence on payment_proofs
- [x] Document type badge + dropdown filter in Proofs tab
- [x] Document type stats on Dashboard

### Phase 5 — WhatsApp Integration ✅ (built, needs prod deployment)
- [x] Whatsapp client (media download + send message)
- [x] Webhook GET (verification) + POST (inbound messages)
- [x] Inbound PDF processing via same pipeline
- [x] Confirmation reply messages
- [ ] Configure Meta Developer Portal webhook URL
- [ ] Deploy backend with live WhatsApp webhook

### Phase 6 — ERP Integration ✅
- [x] Auto-ERP sync in process_proof
- [x] erp_status + erp_receipt_id on payment_proofs
- [ ] ERP database connection (ERP_DB_URL)

### Phase 7 — Invoice Pipeline (future)
- [ ] Invoice LLM prompt + extraction
- [ ] `invoices` + `invoice_line_items` tables
- [ ] Invoice-specific frontend tab
- [ ] Invoice ERP mapper

### Phase 8 — Deployment (next)
- [ ] Run SQL migrations in Supabase Editor
- [ ] Deploy backend to Railway / Render
- [ ] Deploy frontend to Vercel
- [ ] Custom domain
- [ ] Sentry monitoring

---

## 9. Environment Variables

### Backend (`backend/.env`)

```
SUPABASE_URL=https://pwcvdhuuyaspwlxljsib.supabase.co
SUPABASE_SERVICE_KEY=...
SUPABASE_ANON_KEY=...
SUPABASE_BUCKET=payment-proofs
DATABASE_URL=postgresql://postgres:postgres@...

OPENAI_API_KEY=sk-...                    # Optional — for OpenAI provider
LLM_PROVIDER=nvidia                       # nvidia or openai
LLM_MODEL=gpt-4o-mini                     # OpenAI model
NVIDIA_API_KEY=nvapi-...                  # NVIDIA API key (free)
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=meta/llama-3.3-70b-instruct
LLM_CONFIDENCE_THRESHOLD_AUTO=0.85
LLM_CONFIDENCE_THRESHOLD_REVIEW=0.5

ERP_DB_URL=
ERP_RECEIPT_TABLE=receipts

WHATSAPP_ENABLED=false
WHATSAPP_PHONE_NUMBER_ID=1194934513702775
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_WEBHOOK_VERIFY_TOKEN=tolmaierp-verify-2026
WHATSAPP_API_VERSION=v22.0

CORS_ORIGINS=http://localhost:3000
```

### Web (`web/.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=https://pwcvdhuuyaspwlxljsib.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 10. Local Development

```bash
# Backend
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd web
npm install
npm run dev          # :3000

# WhatsApp webhook (expose backend)
ngrok http 8000
```

---

## 11. Relevant Files

| File | Purpose |
|------|---------|
| `backend/app/services/document_classifier.py` | LLM document type classifier |
| `backend/app/services/receipt_processor.py` | Main extraction pipeline |
| `backend/app/services/llm_extractor.py` | LLM extraction (NVIDIA/OpenAI) |
| `backend/app/services/whatsapp_client.py` | Meta Cloud API client |
| `backend/app/routers/upload.py` | Web upload endpoint |
| `backend/app/routers/proofs.py` | Proofs CRUD + logs + doc_type filter |
| `backend/app/routers/receipts.py` | Receipts CRUD with all 13 fields |
| `backend/app/routers/whatsapp.py` | WhatsApp webhook |
| `backend/app/config.py` | All env var settings |
| `web/app/page.tsx` | Single-page 3-tab app |
| `web/app/receipts/[id]/page.tsx` | Standalone receipt detail |
| `web/lib/api.ts` | API client helpers |

---

## 12. Future / In Progress

- [ ] Run `007`, `008`, `009` migrations in Supabase SQL Editor
- [ ] Configure Meta webhook URL → test full WhatsApp inbound flow
- [ ] Invoice pipeline (new `invoices` table + extraction + UI)
- [ ] Email ingestion (inbound webhook via SendGrid/Mailgun or IMAP polling)
- [ ] Deploy backend to production
- [ ] Deploy frontend to Vercel
- [ ] Custom domain + SSL
- [ ] Sentry monitoring
