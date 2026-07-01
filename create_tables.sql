-- ============================================================
-- WhatsApp Payment Proof Processor — Database Setup
-- Run this in Supabase SQL Editor (Ctrl+Enter to execute)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Payment proofs table
CREATE TABLE payment_proofs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT DEFAULT 'application/pdf',
    source TEXT DEFAULT 'web_upload',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    extracted_data JSONB,
    erp_status TEXT DEFAULT 'pending' CHECK (erp_status IN ('pending', 'synced', 'failed')),
    erp_receipt_id TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes for performance
CREATE INDEX idx_payment_proofs_tenant ON payment_proofs(tenant_id);
CREATE INDEX idx_payment_proofs_status ON payment_proofs(status);
CREATE INDEX idx_payment_proofs_created ON payment_proofs(created_at DESC);

-- 3. Processing logs table
CREATE TABLE processing_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proof_id UUID REFERENCES payment_proofs(id) ON DELETE CASCADE,
    stage TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'failure')),
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_processing_log_proof ON processing_log(proof_id);

-- 4. Auto-update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_payment_proofs_updated_at
    BEFORE UPDATE ON payment_proofs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Create storage bucket for PDF files
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;
