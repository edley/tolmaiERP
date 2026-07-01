from fastapi import APIRouter, HTTPException, Query
from app.supabase_client import supabase

router = APIRouter()


@router.get("/receipts")
def list_receipts(
    status: str = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    query = supabase.table("proof_of_payment_receipt").select("*", count="exact")
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


@router.get("/receipts/{receipt_id}")
def get_receipt(receipt_id: str):
    result = supabase.table("proof_of_payment_receipt").select("*").eq("id", receipt_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Receipt not found")
    return result.data[0]
