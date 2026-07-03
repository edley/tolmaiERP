ALTER TABLE payment_proofs
ADD COLUMN IF NOT EXISTS processing_method TEXT;

-- values: 'llm_auto', 'llm_review', 'llm_fallback', 'regex', NULL (pending)
