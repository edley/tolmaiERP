ALTER TABLE proof_of_payment_receipt
DROP CONSTRAINT IF EXISTS proof_of_payment_receipt_status_check;

ALTER TABLE proof_of_payment_receipt
ADD CONSTRAINT proof_of_payment_receipt_status_check
CHECK (status IN ('extracted', 'review_needed', 'synced', 'failed', 'completed'));
