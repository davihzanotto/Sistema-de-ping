"""Endpoints consumidos exclusivamente pelo agente local.

Autenticação: header X-Condominio-Token (token único do condomínio).
"""
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import condominio_por_token
from app.database import get_db
from app.fcm import enviar_push
from app.models import Camera, Condominio, Dispositivo, Historico
from app.schemas import CameraParaAgente, PingEvento

router = APIRouter()


@router.get("/cameras", response_model=List[CameraParaAgente])
def listar_cameras_do_condominio(
    condominio: Condominio = Depends(condominio_por_token),
    db: Session = Depends(get_db),
):
    """Lista de câmeras que o agente deve pingar."""
    return (
        db.query(Camera)
        .filter(Camera.condominio_id == condominio.id)
        .order_by(Camera.id)
        .all()
    )


@router.post("/evento", status_code=201)
def registrar_evento(
    evento: PingEvento,
    condominio: Condominio = Depends(condominio_por_token),
    db: Session = Depends(get_db),
):
    """Agente informa que uma câmera ficou offline ou voltou online."""
    camera = (
        db.query(Camera)
        .filter(
            Camera.id == evento.camera_id,
            Camera.condominio_id == condominio.id,
        )
        .first()
    )
    if not camera:
        raise HTTPException(
            status_code=404,
            detail="Câmera não encontrada neste condomínio",
        )

    # Se o status não mudou, ainda atualiza ultimo_ping mas não registra evento novo
    agora = datetime.utcnow()
    camera.ultimo_ping = agora

    status_anterior = camera.status
    if status_anterior == evento.evento:
        db.commit()
        return {"status": "sem_mudanca", "camera_id": camera.id}

    camera.status = evento.evento
    historico = Historico(camera_id=camera.id, evento=evento.evento, timestamp=agora)
    db.add(historico)
    db.commit()
    db.refresh(camera)

    # Notificar todos os dispositivos cadastrados
    tokens = [d.token_fcm for d in db.query(Dispositivo).all()]
    if tokens:
        if evento.evento == "offline":
            titulo = "⚠️ Câmera offline"
            corpo = f"{camera.nome} - {condominio.nome} - IP {camera.ip} está offline"
        else:
            titulo = "✅ Câmera online"
            corpo = f"{camera.nome} - {condominio.nome} voltou online"
        enviar_push(
            tokens,
            titulo,
            corpo,
            data={
                "camera_id": camera.id,
                "condominio_id": condominio.id,
                "evento": evento.evento,
            },
        )

    return {
        "status": "ok",
        "camera_id": camera.id,
        "evento": evento.evento,
        "status_anterior": status_anterior,
    }


@router.get("/ping")
def heartbeat(condominio: Condominio = Depends(condominio_por_token)):
    """Heartbeat — o agente pode chamar para confirmar que o token é válido."""
    return {"status": "ok", "condominio": condominio.nome, "id": condominio.id}
