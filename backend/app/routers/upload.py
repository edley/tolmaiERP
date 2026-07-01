import uuid
import os
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import PaymentProof
from app.supabase_client import supabase
from app.config import settings

router = APIRouter()

ALLOWED_MIMES = {"application/pdf"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


@router.post("/upload")
async def upload_proof(
    file: UploadFile = File(...),
    tenant_id: str = "default",
    db: Session = Depends(get_db),
):
    if file.content_type and file.content_type not in ALLOWED_MIMES:
        raise HTTPException(status_code=400, detail="Only PDF files allowed")
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    file_ext = os.path.splitext(file.filename or "proof.pdf")[1] or ".pdf"
    storage_path = f"{tenant_id}/{uuid.uuid4()}{file_ext}"

    supabase.storage.from_(settings.supabase_bucket).upload(
        path=storage_path,
        file=content,
        file_options={"content-type": "application/pdf"},
    )

    proof = PaymentProof(
        tenant_id=uuid.UUID(tenant_id) if tenant_id != "default" else uuid.uuid4(),
        file_path=storage_path,
        file_name=file.filename or "proof.pdf",
        file_size=len(content),
        mime_type=file.content_type,
        source="web_upload",
        status="pending",
    )
    db.add(proof)
    db.commit()
    db.refresh(proof)

    return {"id": str(proof.id), "file_name": proof.file_name, "status": proof.status}
