"""Endpoints de scan de rede (consumidos pelo app).

Fluxo:
    1. App chama POST /api/scan/condominios/{id}/iniciar
    2. Backend cria Scan(status=pendente) e retorna o id
    3. Agente, em seu loop, chama GET /api/agente/scan-pendente e pega o job
    4. Agente envia progresso/resultados via POST /api/agente/scan-progresso
    5. App fica fazendo polling em GET /api/scan/condominios/{id}/atual
    6. Ao terminar, app envia POST /api/scan/condominios/{id}/cadastrar-selecionadas

Para detecção de rede:
    GET /api/scan/condominios/{id}/rede → retorna ip_agente + faixa sugerida
    (preenchido pelo agente via POST /api/agente/info)
"""
from __future__ import annotations

import ipaddress
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import usuario_atual
from app.database import get_db
from app.models import AgenteInfo, Camera, Condominio, Scan, ScanResultado, Usuario
from app.schemas import (
    CamerasEmMassa,
    CameraResposta,
    RedeInfo,
    ScanIniciar,
    ScanResposta,
    ResultadoImportacao,
)

router = APIRouter()


def _garantir_condominio(db: Session, condominio_id: int) -> Condominio:
    cond = db.query(Condominio).filter(Condominio.id == condominio_id).first()
    if not cond:
        raise HTTPException(status_code=404, detail="Condomínio não encontrado")
    return cond


@router.get("/condominios/{condominio_id}/rede", response_model=RedeInfo)
def rede_sugerida(
    condominio_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(usuario_atual),
):
    """Sugere faixa /24 baseada no último IP reportado pelo agente."""
    _garantir_condominio(db, condominio_id)
    info = (
        db.query(AgenteInfo)
        .filter(AgenteInfo.condominio_id == condominio_id)
        .first()
    )
    if not info or not info.ip_local:
        return RedeInfo()

    try:
        ip = ipaddress.ip_address(info.ip_local)
        if ip.version != 4:
            return RedeInfo(ip_agente=info.ip_local, atualizado_em=info.atualizado_em)
        # Calcula faixa /24: x.y.z.1 até x.y.z.254
        rede = ipaddress.ip_network(f"{info.ip_local}/24", strict=False)
        hosts = list(rede.hosts())
        return RedeInfo(
            ip_agente=info.ip_local,
            faixa_inicio=str(hosts[0]),
            faixa_fim=str(hosts[-1]),
            atualizado_em=info.atualizado_em,
        )
    except ValueError:
        return RedeInfo(ip_agente=info.ip_local, atualizado_em=info.atualizado_em)


@router.post(
    "/condominios/{condominio_id}/iniciar",
    response_model=ScanResposta,
    status_code=201,
)
def iniciar_scan(
    condominio_id: int,
    dados: ScanIniciar,
    db: Session = Depends(get_db),
    _: Usuario = Depends(usuario_atual),
):
    """Cria um job de scan. O agente vai pegar no próximo poll."""
    _garantir_condominio(db, condominio_id)

    try:
        inicio = ipaddress.ip_address(dados.ip_inicio)
        fim = ipaddress.ip_address(dados.ip_fim)
    except ValueError:
        raise HTTPException(status_code=400, detail="IP de início/fim inválido")

    if int(fim) < int(inicio):
        raise HTTPException(status_code=400, detail="ip_fim deve ser >= ip_inicio")

    total_ips = int(fim) - int(inicio) + 1
    if total_ips > 1024:
        raise HTTPException(
            status_code=400,
            detail="Faixa muito grande (máx. 1024 IPs por scan)",
        )

    # Cancela qualquer scan em andamento desse condomínio
    db.query(Scan).filter(
        Scan.condominio_id == condominio_id,
        Scan.status.in_(["pendente", "executando"]),
    ).update({"status": "cancelado", "finalizado_em": datetime.utcnow()})

    scan = Scan(
        condominio_id=condominio_id,
        ip_inicio=str(inicio),
        ip_fim=str(fim),
        status="pendente",
        total_ips=total_ips,
        progresso=0,
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)
    return scan


@router.get(
    "/condominios/{condominio_id}/atual",
    response_model=ScanResposta,
)
def scan_atual(
    condominio_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(usuario_atual),
):
    """Retorna o scan mais recente do condomínio (com resultados)."""
    _garantir_condominio(db, condominio_id)
    scan = (
        db.query(Scan)
        .filter(Scan.condominio_id == condominio_id)
        .order_by(Scan.id.desc())
        .first()
    )
    if not scan:
        raise HTTPException(status_code=404, detail="Nenhum scan encontrado")
    return scan


@router.post(
    "/condominios/{condominio_id}/cancelar",
    response_model=ScanResposta,
)
def cancelar_scan(
    condominio_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(usuario_atual),
):
    """Cancela o scan ativo (se houver)."""
    _garantir_condominio(db, condominio_id)
    scan = (
        db.query(Scan)
        .filter(
            Scan.condominio_id == condominio_id,
            Scan.status.in_(["pendente", "executando"]),
        )
        .order_by(Scan.id.desc())
        .first()
    )
    if not scan:
        raise HTTPException(status_code=404, detail="Nenhum scan ativo")
    scan.status = "cancelado"
    scan.finalizado_em = datetime.utcnow()
    db.commit()
    db.refresh(scan)
    return scan


@router.post(
    "/condominios/{condominio_id}/cadastrar-selecionadas",
    response_model=ResultadoImportacao,
)
def cadastrar_selecionadas(
    condominio_id: int,
    dados: CamerasEmMassa,
    db: Session = Depends(get_db),
    _: Usuario = Depends(usuario_atual),
):
    """Cadastra as câmeras selecionadas pelo usuário após o scan."""
    _garantir_condominio(db, condominio_id)

    existentes = {
        ip
        for (ip,) in db.query(Camera.ip)
        .filter(Camera.condominio_id == condominio_id)
        .all()
    }

    criadas: List[Camera] = []
    ignoradas = 0
    for item in dados.cameras:
        nome = (item.nome or "").strip()
        ip = (item.ip or "").strip()
        if not nome or not ip:
            ignoradas += 1
            continue
        try:
            ipaddress.ip_address(ip)
        except ValueError:
            ignoradas += 1
            continue
        if ip in existentes:
            ignoradas += 1
            continue
        cam = Camera(nome=nome, ip=ip, condominio_id=condominio_id)
        db.add(cam)
        criadas.append(cam)
        existentes.add(ip)

    db.commit()
    for c in criadas:
        db.refresh(c)

    return ResultadoImportacao(
        total_importadas=len(criadas),
        total_ignoradas=ignoradas,
        cameras=[CameraResposta.model_validate(c) for c in criadas],
    )
