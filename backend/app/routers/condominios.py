"""CRUD de condomínios + dashboard por condomínio."""
import secrets
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.auth import usuario_atual
from app.database import get_db
from app.models import Camera, Condominio, Usuario
from app.schemas import (
    CondominioAtualizar,
    CondominioCriar,
    CondominioResposta,
    CondominioStatus,
)

router = APIRouter()


def _novo_token() -> str:
    """Gera token único aleatório de 48 chars."""
    return secrets.token_urlsafe(32)


@router.post("/", response_model=CondominioResposta, status_code=201)
def criar(
    dados: CondominioCriar,
    db: Session = Depends(get_db),
    _: Usuario = Depends(usuario_atual),
):
    """Cadastra condomínio. O token é gerado aqui e usado pelo agente."""
    condominio = Condominio(
        nome=dados.nome,
        endereco=dados.endereco,
        token_unico=_novo_token(),
    )
    db.add(condominio)
    db.commit()
    db.refresh(condominio)
    return condominio


@router.get("/", response_model=List[CondominioResposta])
def listar(
    db: Session = Depends(get_db),
    _: Usuario = Depends(usuario_atual),
):
    return db.query(Condominio).order_by(Condominio.nome).all()


@router.get("/status", response_model=List[CondominioStatus])
def dashboard(
    db: Session = Depends(get_db),
    _: Usuario = Depends(usuario_atual),
):
    """Dashboard — retorna todos os condomínios com contagem por status."""
    rows = (
        db.query(
            Condominio.id,
            Condominio.nome,
            Condominio.endereco,
            func.count(Camera.id).label("total"),
            func.sum(case((Camera.status == "online", 1), else_=0)).label("online"),
            func.sum(case((Camera.status == "offline", 1), else_=0)).label("offline"),
            func.sum(
                case((Camera.status == "desconhecido", 1), else_=0)
            ).label("desconhecido"),
        )
        .outerjoin(Camera, Camera.condominio_id == Condominio.id)
        .group_by(Condominio.id)
        .order_by(Condominio.nome)
        .all()
    )
    return [
        CondominioStatus(
            id=r.id,
            nome=r.nome,
            endereco=r.endereco,
            total_cameras=int(r.total or 0),
            online=int(r.online or 0),
            offline=int(r.offline or 0),
            desconhecido=int(r.desconhecido or 0),
        )
        for r in rows
    ]


@router.get("/{condominio_id}", response_model=CondominioResposta)
def obter(
    condominio_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(usuario_atual),
):
    cond = db.query(Condominio).filter(Condominio.id == condominio_id).first()
    if not cond:
        raise HTTPException(status_code=404, detail="Condomínio não encontrado")
    return cond


@router.put("/{condominio_id}", response_model=CondominioResposta)
def atualizar(
    condominio_id: int,
    dados: CondominioAtualizar,
    db: Session = Depends(get_db),
    _: Usuario = Depends(usuario_atual),
):
    cond = db.query(Condominio).filter(Condominio.id == condominio_id).first()
    if not cond:
        raise HTTPException(status_code=404, detail="Condomínio não encontrado")

    if dados.nome is not None:
        cond.nome = dados.nome
    if dados.endereco is not None:
        cond.endereco = dados.endereco
    db.commit()
    db.refresh(cond)
    return cond


@router.post("/{condominio_id}/rotacionar-token", response_model=CondominioResposta)
def rotacionar_token(
    condominio_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(usuario_atual),
):
    """Gera novo token. Útil se o atual vazou."""
    cond = db.query(Condominio).filter(Condominio.id == condominio_id).first()
    if not cond:
        raise HTTPException(status_code=404, detail="Condomínio não encontrado")
    cond.token_unico = _novo_token()
    db.commit()
    db.refresh(cond)
    return cond


@router.delete("/{condominio_id}", status_code=204)
def remover(
    condominio_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(usuario_atual),
):
    cond = db.query(Condominio).filter(Condominio.id == condominio_id).first()
    if not cond:
        raise HTTPException(status_code=404, detail="Condomínio não encontrado")
    db.delete(cond)
    db.commit()
