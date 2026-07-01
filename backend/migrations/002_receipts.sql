-- Run this in Supabase SQL Editor after 001_initial.sql

-- Proof of Payment Receipt table (holds extracted data from PDFs)
CREATE TABLE proof_of_payment_receipt (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proof_id UUID REFERENCES payment_proofs(id) ON DELETE SET NULL,
    receipt_number TEXT,
    amount DECIMAL(12,2),
    currency TEXT DEFAULT 'USD',
    payer_name TEXT,
    payer_email TEXT,
    payment_date DATE,
    notes TEXT,
    raw_text TEXT,
    status TEXT DEFAULT 'extracted' CHECK (status IN ('extracted', 'synced', 'failed')),
    erp_receipt_id TEXT,
    synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_receipt_proof ON proof_of_payment_receipt(proof_id);
CREATE INDEX idx_receipt_status ON proof_of_payment_receipt(status);

-- Auto-update updated_at
CREATE TRIGGER set_receipt_updated_at
    BEFORE UPDATE ON proof_of_payment_receipt
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE proof_of_payment_receipt ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all receipts"
    ON proof_of_payment_receipt FOR SELECT
    USING (true);

CREATE POLICY "Users can insert receipts"
    ON proof_of_payment_receipt FOR INSERT
    WITH CHECK (true);
