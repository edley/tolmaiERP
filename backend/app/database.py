from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

erp_engine = create_engine(settings.erp_db_url, pool_pre_ping=True)
ErpSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=erp_engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_erp_db():
    db = ErpSessionLocal()
    try:
        yield db
    finally:
        db.close()
