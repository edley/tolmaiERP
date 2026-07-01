import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db, get_erp_db
from app.models import PaymentProof, ProcessingLog
from app.services.erp_sync import sync_to_erp

router = APIRouter()


@router.post("/proofs/{proof_id}/sync")
def sync_proof_to_erp(proof_id: str, db: Session = Depends(get_db), erp_db: Session = Depends(get_erp_db)):
    proof = db.query(PaymentProof).filter(PaymentProof.id == uuid.UUID(proof_id)).first()
    if not proof:
        raise HTTPException(status_code=404, detail="Proof not found")
    if not proof.extracted_data:
        raise HTTPException(status_code=400, detail="No extracted data to sync")

    success, receipt_id, error = sync_to_erp(proof, erp_db)
    if success:
        proof.erp_status = "synced"
        proof.erp_receipt_id = receipt_id
        log = ProcessingLog(proof_id=proof.id, stage="erp_sync", status="success", message=f"Synced as {receipt_id}")
    else:
        proof.erp_status = "failed"
        proof.error_message = error
        log = ProcessingLog(proof_id=proof.id, stage="erp_sync", status="failure", message=error)

    db.add(log)
    db.commit()
    return {"id": str(proof.id), "erp_status": proof.erp_status, "erp_receipt_id": proof.erp_receipt_id}
