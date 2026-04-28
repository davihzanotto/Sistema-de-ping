"""Ponto de entrada FastAPI."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app.routers import (
    agente,
    cameras,
    condominios,
    dispositivos,
    historico,
    usuarios,
)

# Cria tabelas no startup (em produção prefira Alembic — aqui é simples)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Sistema de Ping — API",
    description="Monitoramento de câmeras IP em condomínios",
    version="1.0.0",
)

# CORS — permite que o app mobile/web consumam a API
origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rotas
app.include_router(usuarios.router, prefix="/api/auth", tags=["Auth"])
app.include_router(condominios.router, prefix="/api/condominios", tags=["Condomínios"])
app.include_router(cameras.router, prefix="/api/cameras", tags=["Câmeras"])
app.include_router(agente.router, prefix="/api/agente", tags=["Agente Local"])
app.include_router(historico.router, prefix="/api/historico", tags=["Histórico"])
app.include_router(dispositivos.router, prefix="/api/dispositivos", tags=["Dispositivos"])


@app.get("/", tags=["Health"])
def raiz():
    return {"status": "ok", "servico": "sistema-de-ping"}


@app.get("/healthz", tags=["Health"])
def healthz():
    return {"status": "ok"}
