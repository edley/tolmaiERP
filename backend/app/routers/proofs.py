from fastapi import APIRouter, Query
from app.supabase_client import supabase

router = APIRouter()


@router.get("/proofs")
def list_proofs(
    tenant_id: str = Query(None),
    status: str = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    query = supabase.table("payment_proofs").select("*", count="exact")
    if tenant_id:
        query = query.eq("tenant_id", tenant_id)
    if status:
        query = query.eq("status", status)
    query = query.order("created_at", desc=True).range((page - 1) * page_size, page * page_size - 1)
    result = query.execute()

    return {
        "total": result.count if hasattr(result, "count") else len(result.data),
        "page": page,
        "page_size": page_size,
        "items": result.data,
    }


@router.get("/proofs/{proof_id}")
def get_proof(proof_id: str):
    result = supabase.table("payment_proofs").select("*").eq("id", proof_id).execute()
    if not result.data:
        return {"error": "not found"}
    return result.data[0]
