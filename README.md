# WhatsApp Payment Proof Processor

Ingest payment proof PDFs, extract data via OCR, sync to ERP.

## Architecture

- **Backend**: Python FastAPI — upload, OCR, data extraction, ERP sync
- **Web App**: Next.js 14 — dashboard, upload, proof viewer
- **Storage**: Supabase (PostgreSQL + Storage + Auth)
- **Deployment**: Vercel (web) + Railway/Render (backend)

## Getting Started

See [PLAN.md](./PLAN.md) for full architecture and implementation steps.

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate    # Windows
pip install -r requirements.txt
cp .env.example .env      # Fill in your Supabase credentials
uvicorn app.main:app --reload
```

### Web App

```bash
cd web
npm install
cp .env.example .env.local
npm run dev
```

### Database

Run `backend/migrations/001_initial.sql` in Supabase SQL Editor.

## Deployment

- **Web**: `vercel deploy` (from `web/` directory)
- **Backend**: Railway or Render (from `backend/` with Dockerfile)
