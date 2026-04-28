"""Registro e remoção de tokens FCM por usuário."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import usuario_atual
from app.database import get_db
from app.models import Dispositivo, Usuario
from app.schemas import DispositivoRegistrar, DispositivoResposta

router = APIRouter()


@router.post("/", response_model=DispositivoResposta, status_code=201)
def registrar(
    dados: DispositivoRegistrar,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(usuario_atual),
):
    """Registra (ou atualiza) o token FCM do dispositivo do usuário logado."""
    existente = (
        db.query(Dispositivo)
        .filter(Dispositivo.token_fcm == dados.token_fcm)
        .first()
    )
    if existente:
        # Reatribui ao usuário atual se trocou de dono
        existente.usuario_id = usuario.id
        db.commit()
        db.refresh(existente)
        return existente

    dispositivo = Dispositivo(usuario_id=usuario.id, token_fcm=dados.token_fcm)
    db.add(dispositivo)
    db.commit()
    db.refresh(dispositivo)
    return dispositivo


@router.delete("/{token_fcm}", status_code=204)
def remover(
    token_fcm: str,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(usuario_atual),
):
    disp = (
        db.query(Dispositivo)
        .filter(
            Dispositivo.token_fcm == token_fcm,
            Dispositivo.usuario_id == usuario.id,
        )
        .first()
    )
    if not disp:
        raise HTTPException(status_code=404, detail="Dispositivo não encontrado")
    db.delete(disp)
    db.commit()
