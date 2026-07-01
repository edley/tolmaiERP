from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    supabase_url: str
    supabase_service_key: str
    supabase_anon_key: str
    supabase_bucket: str = "payment-proofs"
    database_url: str
    tesseract_path: Optional[str] = "tesseract"
    erp_db_url: str
    erp_receipt_table: str = "receipts"
    whatsapp_type: str = "none"
    redis_url: str = "redis://localhost:6379"
    sentry_dsn: Optional[str] = None
    cors_origins: str = "http://localhost:3000"

    model_config = {"env_file": ".env", "case_sensitive": False}


settings = Settings()
