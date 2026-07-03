from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    supabase_url: str
    supabase_service_key: str
    supabase_anon_key: str
    supabase_bucket: str = "payment-proofs"
    database_url: str
    openai_api_key: Optional[str] = None
    llm_provider: str = "openai"
    llm_model: str = "gpt-4o-mini"
    nvidia_api_key: Optional[str] = None
    nvidia_base_url: str = "https://integrate.api.nvidia.com/v1"
    nvidia_model: str = "meta/llama-3.3-70b-instruct"
    llm_confidence_threshold_auto: float = 0.85
    llm_confidence_threshold_review: float = 0.5
    erp_db_url: str
    erp_receipt_table: str = "receipts"
    whatsapp_enabled: bool = False
    whatsapp_phone_number_id: str = ""
    whatsapp_access_token: str = ""
    whatsapp_webhook_verify_token: str = ""
    whatsapp_api_version: str = "v22.0"
    redis_url: str = "redis://localhost:6379"
    sentry_dsn: Optional[str] = None
    cors_origins: str = "http://localhost:3000"

    model_config = {"env_file": ".env", "case_sensitive": False}


settings = Settings()
