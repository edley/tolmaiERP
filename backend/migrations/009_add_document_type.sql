ALTER TABLE payment_proofs
  ADD COLUMN IF NOT EXISTS document_type TEXT NOT NULL DEFAULT 'unclassified';

ALTER TABLE payment_proofs
  ADD COLUMN IF NOT EXISTS document_type_confidence DOUBLE PRECISION;
