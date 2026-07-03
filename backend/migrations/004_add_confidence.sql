-- Add confidence score and update status checks
ALTER TABLE proof_of_payment_receipt
ADD COLUMN IF NOT EXISTS confidence_score FLOAT;

-- Allow review_needed status
ALTER TABLE proof_of_payment_receipt
DROP CONSTRAINT IF EXISTS proof_of_payment_receipt_status_check;

ALTER TABLE proof_of_payment_receipt
ADD CONSTRAINT proof_of_payment_receipt_status_check
CHECK (status IN ('extracted', 'review_needed', 'synced', 'failed'));

-- Update payment_proofs status check too
ALTER TABLE payment_proofs
DROP CONSTRAINT IF EXISTS payment_proofs_status_check;

ALTER TABLE payment_proofs
ADD CONSTRAINT payment_proofs_status_check
CHECK (status IN ('pending', 'processing', 'completed', 'review_needed', 'failed'));
