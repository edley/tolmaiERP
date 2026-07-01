from typing import Tuple
from sqlalchemy.orm import Session
from app.models import PaymentProof
from app.config import settings


def sync_to_erp(proof: PaymentProof, erp_db: Session) -> Tuple[bool, str, str]:
    try:
        data = proof.extracted_data
        if not data:
            return False, "", "No extracted data"

        table = settings.erp_receipt_table
        erp_db.execute(
            f"""
            INSERT INTO {table} (amount, currency, payer_name, payer_email, receipt_number, payment_date, source_proof_id)
            VALUES (:amount, :currency, :payer_name, :payer_email, :receipt_number, :payment_date, :proof_id)
            """,
            {
                "amount": data.get("amount"),
                "currency": data.get("currency", "USD"),
                "payer_name": data.get("payer_name"),
                "payer_email": data.get("payer_email"),
                "receipt_number": data.get("receipt_number"),
                "payment_date": data.get("payment_date"),
                "proof_id": str(proof.id),
            },
        )
        erp_db.commit()

        result = erp_db.execute(
            f"SELECT id FROM {table} WHERE source_proof_id = :proof_id ORDER BY created_at DESC LIMIT 1",
            {"proof_id": str(proof.id)},
        ).fetchone()

        receipt_id = str(result[0]) if result else "unknown"
        return True, receipt_id, ""

    except Exception as e:
        erp_db.rollback()
        return False, "", str(e)
