-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Payment proofs table
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

CREATE INDEX idx_payment_proofs_tenant ON payment_proofs(tenant_id);
CREATE INDEX idx_payment_proofs_status ON payment_proofs(status);
CREATE INDEX idx_payment_proofs_created ON payment_proofs(created_at DESC);

-- Processing logs table
CREATE TABLE processing_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proof_id UUID REFERENCES payment_proofs(id) ON DELETE CASCADE,
    stage TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'failure')),
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_processing_log_proof ON processing_log(proof_id);

-- Auto-update updated_at
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

-- Row Level Security
ALTER TABLE payment_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_log ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policies
CREATE POLICY "Users can view own tenant proofs"
    ON payment_proofs FOR SELECT
    USING (tenant_id = auth.uid()::UUID);

CREATE POLICY "Users can insert own tenant proofs"
    ON payment_proofs FOR INSERT
    WITH CHECK (tenant_id = auth.uid()::UUID);

CREATE POLICY "Admins can view all proofs"
    ON payment_proofs FOR SELECT
    USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can insert any"
    ON payment_proofs FOR INSERT
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Processing log policies (same pattern)
CREATE POLICY "Users can view own tenant logs"
    ON processing_log FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM payment_proofs p
            WHERE p.id = proof_id AND p.tenant_id = auth.uid()::UUID
        )
    );

-- Storage bucket RLS
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own tenant files"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'payment-proofs'
        AND auth.jwt() ->> 'role' IS NOT NULL
    );

CREATE POLICY "Users can read own tenant files"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'payment-proofs');
