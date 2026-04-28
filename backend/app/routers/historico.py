"""Histórico de eventos — listagem com filtros."""
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth import usuario_atual
from app.database import get_db
from app.models import Camera, Condominio, Historico, Usuario
from app.schemas import HistoricoCompleto

router = APIRouter()


@router.get("/", response_model=List[HistoricoCompleto])
def listar(
    condominio_id: Optional[int] = None,
    camera_id: Optional[int] = None,
    data_inicio: Optional[datetime] = None,
    data_fim: Optional[datetime] = None,
    limite: int = Query(default=200, le=1000),
    db: Session = Depends(get_db),
    _: Usuario = Depends(usuario_atual),
):
    """Lista eventos enriquecidos com nome da câmera e condomínio."""
    q = (
        db.query(
            Historico.id,
            Historico.camera_id,
            Camera.nome.label("camera_nome"),
            Camera.ip.label("camera_ip"),
            Condominio.id.label("condominio_id"),
            Condominio.nome.label("condominio_nome"),
            Historico.evento,
            Historico.timestamp,
        )
        .join(Camera, Camera.id == Historico.camera_id)
        .join(Condominio, Condominio.id == Camera.condominio_id)
    )

    if condominio_id is not None:
        q = q.filter(Condominio.id == condominio_id)
    if camera_id is not None:
        q = q.filter(Historico.camera_id == camera_id)
    if data_inicio is not None:
        q = q.filter(Historico.timestamp >= data_inicio)
    if data_fim is not None:
        q = q.filter(Historico.timestamp <= data_fim)

    q = q.order_by(Historico.timestamp.desc()).limit(limite)

    return [
        HistoricoCompleto(
            id=r.id,
            camera_id=r.camera_id,
            camera_nome=r.camera_nome,
            camera_ip=r.camera_ip,
            condominio_id=r.condominio_id,
            condominio_nome=r.condominio_nome,
            evento=r.evento,
            timestamp=r.timestamp,
        )
        for r in q.all()
    ]
