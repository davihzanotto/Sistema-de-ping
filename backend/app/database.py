"""Conexão com banco de dados (SQLAlchemy)."""
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import settings

# Engine do SQLAlchemy — aponta para Postgres em produção
engine = create_engine(settings.database_url, pool_pre_ping=True)

# Sessão usada pelos endpoints
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base declarativa dos modelos ORM
Base = declarative_base()


def get_db():
    """Dependência do FastAPI — fornece uma sessão por request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
