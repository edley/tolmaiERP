import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import PaymentProof

router = APIRouter()


@router.get("/proofs")
def list_proofs(
    tenant_id: str = Query("default"),
    status: str = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(PaymentProof).filter(
        PaymentProof.tenant_id == uuid.UUID(tenant_id) if tenant_id != "default" else True
    )
    if status:
        query = query.filter(PaymentProof.status == status)
    total = query.count()
    items = query.order_by(PaymentProof.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [
            {
                "id": str(p.id),
                "file_name": p.file_name,
                "file_size": p.file_size,
                "source": p.source,
                "status": p.status,
                "erp_status": p.erp_status,
                "extracted_data": p.extracted_data,
                "error_message": p.error_message,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
            for p in items
        ],
    }


@router.get("/proofs/{proof_id}")
def get_proof(proof_id: str, db: Session = Depends(get_db)):
    proof = db.query(PaymentProof).filter(PaymentProof.id == uuid.UUID(proof_id)).first()
    if not proof:
        return {"error": "not found"}, 404
    return {
        "id": str(proof.id),
        "file_name": proof.file_name,
        "file_size": proof.file_size,
        "file_path": proof.file_path,
        "source": proof.source,
        "status": proof.status,
        "erp_status": proof.erp_status,
        "extracted_data": proof.extracted_data,
        "erp_receipt_id": proof.erp_receipt_id,
        "error_message": proof.error_message,
        "created_at": proof.created_at.isoformat() if proof.created_at else None,
        "updated_at": proof.updated_at.isoformat() if proof.updated_at else None,
    }
