"""Endpoints consumidos exclusivamente pelo agente local.

Autenticação: header X-Condominio-Token (token único do condomínio).
"""
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import condominio_por_token
from app.database import get_db
from app.fcm import enviar_push
from app.models import (
    AgenteInfo,
    Camera,
    Condominio,
    Dispositivo,
    Historico,
    Scan,
    ScanResultado,
)
from app.schemas import (
    AgenteInfoEnvio,
    CameraParaAgente,
    PingEvento,
    ScanPendente,
    ScanProgressoEnvio,
)

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


@router.post("/info")
def atualizar_info(
    dados: AgenteInfoEnvio,
    condominio: Condominio = Depends(condominio_por_token),
    db: Session = Depends(get_db),
):
    """Agente envia metadados (IP local etc.). Chamado periodicamente."""
    info = (
        db.query(AgenteInfo)
        .filter(AgenteInfo.condominio_id == condominio.id)
        .first()
    )
    if not info:
        info = AgenteInfo(condominio_id=condominio.id)
        db.add(info)
    if dados.ip_local is not None:
        info.ip_local = dados.ip_local
    if dados.versao_agente is not None:
        info.versao_agente = dados.versao_agente
    info.atualizado_em = datetime.utcnow()
    db.commit()
    return {"status": "ok"}


# -------------------- Scan de rede --------------------
@router.get("/scan-pendente", response_model=Optional[ScanPendente])
def scan_pendente(
    condominio: Condominio = Depends(condominio_por_token),
    db: Session = Depends(get_db),
):
    """Retorna o scan pendente para esse condomínio, se houver.

    O agente chama isso periodicamente. Quando recebe um scan, marca como
    'executando' e começa a processar.
    """
    scan = (
        db.query(Scan)
        .filter(
            Scan.condominio_id == condominio.id,
            Scan.status == "pendente",
        )
        .order_by(Scan.id.asc())
        .first()
    )
    if not scan:
        return None
    # Marca como executando para evitar duplicação em caso de re-poll
    scan.status = "executando"
    scan.iniciado_em = datetime.utcnow()
    db.commit()
    db.refresh(scan)
    return ScanPendente(
        id=scan.id,
        ip_inicio=scan.ip_inicio,
        ip_fim=scan.ip_fim,
    )


@router.post("/scan-progresso")
def scan_progresso(
    dados: ScanProgressoEnvio,
    condominio: Condominio = Depends(condominio_por_token),
    db: Session = Depends(get_db),
):
    """Agente reporta progresso e/ou lote de resultados."""
    scan = (
        db.query(Scan)
        .filter(
            Scan.id == dados.scan_id,
            Scan.condominio_id == condominio.id,
        )
        .first()
    )
    if not scan:
        raise HTTPException(status_code=404, detail="Scan não encontrado")

    if scan.status == "cancelado":
        # Sinaliza ao agente que pode parar
        return {"status": "cancelado"}

    # Atualiza progresso
    if dados.total_ips is not None and dados.total_ips > 0:
        scan.total_ips = dados.total_ips
    scan.progresso = max(scan.progresso, dados.progresso)

    # Persiste resultados novos
    for r in dados.resultados:
        item = ScanResultado(
            scan_id=scan.id,
            ip=r.ip,
            online=r.online,
            porta_554=r.porta_554,
            porta_80=r.porta_80,
            porta_8080=r.porta_8080,
            confianca=r.confianca,
            frame_base64=r.frame_base64,
        )
        db.add(item)

    if dados.finalizado:
        scan.status = "erro" if dados.mensagem_erro else "concluido"
        scan.mensagem_erro = dados.mensagem_erro
        scan.finalizado_em = datetime.utcnow()

    db.commit()
    return {"status": scan.status}
