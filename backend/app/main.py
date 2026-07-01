from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import upload, proofs, erp

app = FastAPI(title="WhatsApp Payment Processor", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api", tags=["upload"])
app.include_router(proofs.router, prefix="/api", tags=["proofs"])
app.include_router(erp.router, prefix="/api", tags=["erp"])


@app.get("/health")
def health():
    return {"status": "ok"}
