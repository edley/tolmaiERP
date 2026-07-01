import uuid
import os
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.supabase_client import supabase
from app.config import settings
from datetime import datetime

router = APIRouter()

ALLOWED_MIMES = {"application/pdf"}
MAX_FILE_SIZE = 10 * 1024 * 1024


@router.post("/upload")
async def upload_proof(
    file: UploadFile = File(...),
    tenant_id: str = "default",
):
    if file.content_type and file.content_type not in ALLOWED_MIMES:
        raise HTTPException(status_code=400, detail="Only PDF files allowed")
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    proof_id = str(uuid.uuid4())
    tid = tenant_id if tenant_id != "default" else str(uuid.uuid4())
    file_ext = os.path.splitext(file.filename or "proof.pdf")[1] or ".pdf"
    storage_path = f"{tid}/{proof_id}{file_ext}"

    supabase.storage.from_(settings.supabase_bucket).upload(
        path=storage_path,
        file=content,
        file_options={"content-type": "application/pdf"},
    )

    supabase.table("payment_proofs").insert({
        "id": proof_id,
        "tenant_id": tid,
        "file_path": storage_path,
        "file_name": file.filename or "proof.pdf",
        "file_size": len(content),
        "mime_type": "application/pdf",
        "source": "web_upload",
        "status": "pending",
        "created_at": datetime.utcnow().isoformat(),
    }).execute()

    return {
        "id": proof_id,
        "file_name": file.filename or "proof.pdf",
        "status": "pending",
    }
