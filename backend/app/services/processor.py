import uuid
from sqlalchemy.orm import Session
from app.database import SessionLocal, get_erp_db
from app.models import PaymentProof, ProofStatus, ProcessingLog
from app.supabase_client import supabase
from app.services.ocr import get_pdf_text
from app.services.extractor import extract_payment_data
from app.services.erp_sync import sync_to_erp
from app.config import settings


def process_pending_proofs():
    db: Session = SessionLocal()
    try:
        proofs = db.query(PaymentProof).filter(PaymentProof.status == ProofStatus.pending).all()
        for proof in proofs:
            try:
                proof.status = ProofStatus.processing
                db.commit()

                pdf_bytes = supabase.storage.from_(settings.supabase_bucket).download(proof.file_path)
                _log(db, proof.id, "download", "success", "PDF downloaded from storage")

                text = get_pdf_text(pdf_bytes)
                _log(db, proof.id, "ocr", "success", f"Extracted {len(text)} chars")

                data = extract_payment_data(text)
                proof.extracted_data = data
                _log(db, proof.id, "extract", "success", f"Extracted amount={data.get('amount')}")

                erp_db = get_erp_db().__next__()
                try:
                    success, receipt_id, error = sync_to_erp(proof, erp_db)
                    if success:
                        proof.erp_status = "synced"
                        proof.erp_receipt_id = receipt_id
                        _log(db, proof.id, "erp_sync", "success", f"Synced as {receipt_id}")
                    else:
                        proof.erp_status = "failed"
                        proof.error_message = error
                        _log(db, proof.id, "erp_sync", "failure", error)
                finally:
                    erp_db.close()

                proof.status = ProofStatus.completed

            except Exception as e:
                proof.status = ProofStatus.failed
                proof.error_message = str(e)
                _log(db, proof.id, "pipeline", "failure", str(e))

            db.commit()

    finally:
        db.close()


def _log(db: Session, proof_id: uuid.UUID, stage: str, status: str, message: str):
    log = ProcessingLog(proof_id=proof_id, stage=stage, status=status, message=message)
    db.add(log)
    db.commit()
