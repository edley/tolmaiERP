# WhatsApp Payment Proof Processor — Architecture & Implementation Plan

## 1. System Overview

A system that:
1. **Ingests** payment proof PDFs from WhatsApp channels
2. **Stores** raw PDFs and metadata in Supabase
3. **Processes** PDFs (OCR + extraction) to extract payment details
4. **Updates** the ERP receipt table with extracted data
5. **Provides** a secure web UI to monitor, review, and manage the pipeline

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  WhatsApp    │────▶│  Ingestor    │────▶│  Supabase    │────▶│  Processor   │
│  Channel     │     │  Service     │     │  (Storage +  │     │  (OCR +      │
│              │     │              │     │   DB)        │     │   Extract)   │
└──────────────┘     └──────────────┘     └──────────────┘     └──────┬───────┘
                                                                      │
                                                                      ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Vercel      │◀────│  Next.js UI  │◀────│  ERP System  │
│  (Deploy)    │     │  (Auth +     │     │  (Receipt     │
│              │     │   Dashboard) │     │   Table)      │
└──────────────┘     └──────────────┘     └──────────────┘
```

---

## 2. WhatsApp Integration — Options

Reading WhatsApp Channels programmatically has no official consumer API. Choose ONE:

### Option A: WhatsApp Business API (Recommended for Production)
- Register a WhatsApp Business Account (WABA) via Meta
- Users forward payment proofs to the business number
- Costs: ~$0.005/message after free tier
- Pro: Official, stable, reliable
- Con: Business verification needed, costs money

### Option B: WhatsApp Web JS (Quick Start / Prototype)
- Use `whatsapp-web.js` with a dedicated phone number
- Runs a headless browser that connects to WhatsApp Web
- Pro: Free, fast to prototype
- Con: Against WhatsApp ToS, risk of temporary ban

### Option C: Web Upload (Fallback / Co-Pilot)
- Users upload PDFs directly via the web UI
- Pro: No WhatsApp dependency, always works
- Con: Manual effort

> **Recommendation:** Start with **Option B** for prototyping, migrate to **Option A** for production.
> Always offer **Option C** as a fallback in the UI.

---

## 3. Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python (FastAPI) — async ingestion + processing workers |
| **Web App** | Next.js 14+ (App Router) — hosted on Vercel |
| **Database** | Supabase (PostgreSQL + Storage) |
| **Auth** | Supabase Auth (email/password or magic link) |
| **OCR** | Tesseract + PyMuPDF / pdfplumber |
| **ERP Adapter** | Pluggable (REST API or direct DB), configurable |
| **Background Jobs** | Celery + Redis (or simple cron-based polling) |
| **WhatsApp Client** | `whatsapp-web.js` (proto) / Meta WABA API (prod) |
| **Deployment** | Vercel (Next.js UI) + Railway/Render (Python workers) |
| **Monitoring** | Sentry + Supabase logs |
| **Git** | GitHub |

---

## 4. Supabase Schema

### Table: `payment_proofs`

```sql
CREATE TABLE payment_proofs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path       TEXT NOT NULL,                -- Supabase Storage path
  file_name       TEXT NOT NULL,
  file_size       BIGINT,
  mime_type       TEXT DEFAULT 'application/pdf',
  source          TEXT DEFAULT 'whatsapp',      -- 'whatsapp' | 'web_upload'
  status          TEXT DEFAULT 'pending',       -- 'pending' | 'processing' | 'completed' | 'failed'
  extracted_data  JSONB,                        -- OCR result
  erp_status      TEXT DEFAULT 'pending',       -- 'pending' | 'synced' | 'failed'
  erp_receipt_id  TEXT,                         -- ID from ERP after sync
  error_message   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### Table: `processing_log`

```sql
CREATE TABLE processing_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proof_id        UUID REFERENCES payment_proofs(id),
  stage           TEXT,                          -- 'download' | 'ocr' | 'extract' | 'erp_sync'
  status          TEXT,                          -- 'success' | 'failure'
  message         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### Table: `erp_receipts` (mirror/cache of ERP receipt table — optional)

```sql
CREATE TABLE erp_receipts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id     TEXT UNIQUE,                   -- ID in the ERP
  proof_id        UUID REFERENCES payment_proofs(id),
  amount          DECIMAL(12,2),
  currency        TEXT DEFAULT 'USD',
  payer_name      TEXT,
  payer_email     TEXT,
  receipt_number  TEXT,
  payment_date    DATE,
  raw_data        JSONB,
  synced_at       TIMESTAMPTZ DEFAULT NOW()
);
```

### Supabase Storage Bucket

- Bucket name: `payment-proofs`
- Public access: **disabled**
- Access: via signed URLs (Supabase Auth required)

---

## 5. Project Structure

```
whatsapp-payment-processor/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI entry
│   │   ├── config.py             # Settings / env vars
│   │   ├── database.py           # Supabase/SQLAlchemy session
│   │   ├── models.py             # SQLAlchemy models
│   │   ├── routers/
│   │   │   ├── upload.py         # Web upload endpoint
│   │   │   ├── proofs.py         # CRUD for payment_proofs
│   │   │   └── erp.py            # ERP integration
│   │   ├── services/
│   │   │   ├── whatsapp.py       # WhatsApp client
│   │   │   ├── ocr.py            # PDF -> text extraction
│   │   │   ├── extractor.py      # Parse text -> payment struct
│   │   │   └── erp_sync.py       # ERP adapter
│   │   └── workers/
│   │       └── processor.py      # Background processing
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── web/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Dashboard
│   │   ├── login/
│   │   ├── proofs/
│   │   │   ├── page.tsx          # List all proofs
│   │   │   └── [id]/page.tsx     # Proof detail
│   │   └── upload/
│   │       └── page.tsx          # Manual upload
│   ├── components/
│   │   ├── ProofTable.tsx
│   │   ├── UploadZone.tsx
│   │   └── StatusBadge.tsx
│   ├── lib/
│   │   ├── supabase.ts           # Supabase client
│   │   └── api.ts                # API helpers
│   ├── package.json
│   ├── next.config.js
│   └── .env.example
├── .github/
│   └── workflows/
│       └── deploy.yml
├── PLAN.md
└── README.md
```

---

## 6. Data Flow (End-to-End)

```
1. WhatsApp Channel message arrives (PDF attachment)
       │
2. whatsapp-web.js / WABA API webhook receives the message
       │
3. Download PDF → Upload to Supabase Storage
       │
4. Insert record into payment_proofs table (status: pending)
       │
5. Background worker picks up pending proof
       │
6. Download PDF from storage → Run OCR (Tesseract)
       │
7. Extract structured data (amount, payer, date, ref#)
       │
8. Update payment_proofs.extracted_data + status → completed
       │
9. ERP adapter sends data to ERP receipt table
       │
10. Update payment_proofs.erp_status → synced (or failed)
       │
11. User views everything in Next.js dashboard
```

---

## 7. Implementation Phases

### Phase 1 — Foundation (This Session)
- [ ] Initialize Python backend (FastAPI)
- [ ] Initialize Next.js web app
- [ ] Configure Supabase project (DB + Storage + Auth)
- [ ] Set up Supabase schema (SQL migration)
- [ ] Create `.env.example` files
- [ ] Initialize Git repo + push to GitHub

### Phase 2 — Core Backend
- [ ] Supabase client + models
- [ ] PDF upload API endpoint
- [ ] PDF OCR service (Tesseract)
- [ ] Payment data extraction logic
- [ ] Background processor worker

### Phase 3 — WhatsApp Integration
- [ ] Configure WhatsApp client (web.js or WABA)
- [ ] Incoming message handler
- [ ] Auto-download PDF attachment
- [ ] Error handling + reconnection

### Phase 4 — ERP Integration
- [ ] Build ERP adapter (configurable)
- [ ] Map extracted fields to ERP receipt schema
- [ ] Sync with retry logic
- [ ] Audit log

### Phase 5 — Web UI
- [ ] Supabase Auth (login page)
- [ ] Dashboard with metrics
- [ ] Proof list with filters + search
- [ ] Proof detail with extracted data viewer
- [ ] Manual upload page
- [ ] Responsive design

### Phase 6 — Deployment
- [ ] Deploy Next.js to Vercel
- [ ] Deploy Python backend to Railway/Render
- [ ] Configure custom domain
- [ ] Set up CI/CD (GitHub Actions)
- [ ] Production environment variables

---

## 8. Dependencies

### Python (`requirements.txt`)

```
fastapi
uvicorn[standard]
supabase
sqlalchemy
psycopg2-binary
python-multipart
python-dotenv
pydantic
pydantic-settings
pdfplumber              # PDF text extraction
pytesseract             # OCR fallback
Pillow                  # Image processing for OCR
whatsapp-web.js         # via subprocess or REST bridge
celery                  # Background tasks
redis                   # Celery broker
httpx                   # HTTP client for ERP API
sentry-sdk
boto3                   # (optional) if using S3 alongside Supabase
```

### Node.js (`package.json`)

```json
{
  "dependencies": {
    "next": "^14",
    "react": "^18",
    "react-dom": "^18",
    "@supabase/supabase-js": "^2",
    "@supabase/ssr": "^0",
    "lucide-react": "^0",
    "clsx": "^2",
    "tailwind-merge": "^2"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "^20",
    "@types/react": "^18",
    "tailwindcss": "^3",
    "postcss": "^8",
    "autoprefixer": "^10"
  }
}
```

---

## 9. Prerequisites & Installation

### Tools Required
- **Python** 3.11+
- **Node.js** 18+ (LTS)
- **Docker** (for local Redis)
- **Tesseract OCR** engine
- **Supabase** account (free tier)
- **GitHub** account
- **Vercel** account (free tier)
- **Railway** or **Render** account (for Python backend)

### Local Setup

```bash
# 1. Clone & structure
mkdir whatsapp-payment-processor && cd "$_"
git init
mkdir backend web

# 2. Python backend
cd backend
python -m venv .venv
.venv\Scripts\activate    # Windows
pip install -r requirements.txt

# 3. Web app
cd ../web
npx create-next-app@latest . --typescript --tailwind --app

# 4. Tesseract OCR
# Windows: download from https://github.com/UB-Mannheim/tesseract/wiki
# Add to PATH
```

### Environment Variables

**.env.example** (backend):
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=service-role-key
SUPABASE_BUCKET=payment-proofs
DATABASE_URL=postgresql://postgres:password@host:5432/postgres
TESSERACT_PATH=C:\Program Files\Tesseract-OCR\tesseract.exe
ERP_API_URL=https://your-erp.com/api/receipts
ERP_API_KEY=erp-api-key
WHATSAPP_TYPE=webjs          # webjs | waba
REDIS_URL=redis://localhost:6379
SENTRY_DSN=your-dsn
```

**.env.example** (web):
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=anon-key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 10. Security Considerations

| Concern | Mitigation |
|---------|-----------|
| **WhatsApp credentials** | Stored in env vars, never committed |
| **Supabase data** | Row Level Security (RLS) on all tables |
| **API endpoints** | Require valid Supabase JWT in Authorization header |
| **PDF storage** | Supabase Storage with RLS, signed URLs only |
| **ERP credentials** | Server-side only, never exposed to frontend |
| **File uploads** | Validate MIME type, file size limits (10MB) |
| **Auth** | Supabase Auth (email + password or magic link) |
| **HTTPS** | Enforced by Vercel + Railway/Render |

---

## 11. RLS Policies (Supabase)

```sql
-- payment_proofs: users can only see their own (or all if admin)
CREATE POLICY "Users can view own proofs"
  ON payment_proofs FOR SELECT
  USING (auth.uid() = user_id);

-- admins can see everything
CREATE POLICY "Admins can view all proofs"
  ON payment_proofs FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');
```

> Add `user_id UUID REFERENCES auth.users` column if per-user isolation is needed.

---

## 12. What We'll Build First

We start with **Phase 1** in this session:
1. Create project skeleton (backend + web)
2. Supabase project setup with schema
3. Python backend with upload + basic processing
4. Next.js UI with Supabase Auth
5. Git init + push to GitHub

---

## 13. Decisions Made

| Question | Decision |
|----------|----------|
| WhatsApp approach | **Web Upload First** — manual PDF upload via UI. WhatsApp added later. |
| ERP system | **Direct Database** — connect to ERP database directly |
| Auth method | **Email + Password** via Supabase Auth |
| User model | **Multi-tenant** — each tenant sees only their data |
| Deployment | Vercel (web) + Railway/Render (Python backend) |
