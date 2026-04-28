"""CRUD de câmeras + importação por faixa de IP e CSV/Excel."""
import io
import ipaddress
from typing import List

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.auth import usuario_atual
from app.database import get_db
from app.models import Camera, Condominio, Usuario
from app.schemas import (
    CameraAtualizar,
    CameraCriar,
    CameraImportFaixa,
    CameraResposta,
    ResultadoImportacao,
)

router = APIRouter()


def _garantir_condominio(db: Session, condominio_id: int) -> Condominio:
    cond = db.query(Condominio).filter(Condominio.id == condominio_id).first()
    if not cond:
        raise HTTPException(status_code=404, detail="Condomínio não encontrado")
    return cond


@router.post("/", response_model=CameraResposta, status_code=201)
def criar(
    dados: CameraCriar,
    db: Session = Depends(get_db),
    _: Usuario = Depends(usuario_atual),
):
    _garantir_condominio(db, dados.condominio_id)
    camera = Camera(nome=dados.nome, ip=dados.ip, condominio_id=dados.condominio_id)
    db.add(camera)
    db.commit()
    db.refresh(camera)
    return camera


@router.get("/", response_model=List[CameraResposta])
def listar(
    condominio_id: int | None = None,
    db: Session = Depends(get_db),
    _: Usuario = Depends(usuario_atual),
):
    q = db.query(Camera)
    if condominio_id is not None:
        q = q.filter(Camera.condominio_id == condominio_id)
    return q.order_by(Camera.nome).all()


@router.get("/{camera_id}", response_model=CameraResposta)
def obter(
    camera_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(usuario_atual),
):
    cam = db.query(Camera).filter(Camera.id == camera_id).first()
    if not cam:
        raise HTTPException(status_code=404, detail="Câmera não encontrada")
    return cam


@router.put("/{camera_id}", response_model=CameraResposta)
def atualizar(
    camera_id: int,
    dados: CameraAtualizar,
    db: Session = Depends(get_db),
    _: Usuario = Depends(usuario_atual),
):
    cam = db.query(Camera).filter(Camera.id == camera_id).first()
    if not cam:
        raise HTTPException(status_code=404, detail="Câmera não encontrada")

    if dados.nome is not None:
        cam.nome = dados.nome
    if dados.ip is not None:
        cam.ip = dados.ip
    db.commit()
    db.refresh(cam)
    return cam


@router.delete("/{camera_id}", status_code=204)
def remover(
    camera_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(usuario_atual),
):
    cam = db.query(Camera).filter(Camera.id == camera_id).first()
    if not cam:
        raise HTTPException(status_code=404, detail="Câmera não encontrada")
    db.delete(cam)
    db.commit()


@router.post("/importar-faixa", response_model=ResultadoImportacao)
def importar_faixa(
    dados: CameraImportFaixa,
    db: Session = Depends(get_db),
    _: Usuario = Depends(usuario_atual),
):
    """Cria uma câmera para cada IP entre ip_inicio e ip_fim (inclusive)."""
    _garantir_condominio(db, dados.condominio_id)
    try:
        inicio = ipaddress.ip_address(dados.ip_inicio)
        fim = ipaddress.ip_address(dados.ip_fim)
    except ValueError:
        raise HTTPException(status_code=400, detail="IP de início/fim inválido")

    if int(fim) < int(inicio):
        raise HTTPException(status_code=400, detail="ip_fim deve ser >= ip_inicio")

    # IPs já existentes no condomínio (não duplicar)
    existentes = {
        ip for (ip,) in db.query(Camera.ip)
        .filter(Camera.condominio_id == dados.condominio_id)
        .all()
    }

    criadas: List[Camera] = []
    ignoradas = 0
    contador = 1
    atual = int(inicio)
    while atual <= int(fim):
        ip_str = str(ipaddress.ip_address(atual))
        if ip_str in existentes:
            ignoradas += 1
        else:
            cam = Camera(
                nome=f"{dados.prefixo_nome} {contador:03d}",
                ip=ip_str,
                condominio_id=dados.condominio_id,
            )
            db.add(cam)
            criadas.append(cam)
            contador += 1
        atual += 1

    db.commit()
    for c in criadas:
        db.refresh(c)

    return ResultadoImportacao(
        total_importadas=len(criadas),
        total_ignoradas=ignoradas,
        cameras=[CameraResposta.model_validate(c) for c in criadas],
    )


@router.post("/importar-planilha", response_model=ResultadoImportacao)
async def importar_planilha(
    condominio_id: int,
    arquivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: Usuario = Depends(usuario_atual),
):
    """Importa CSV/XLSX com colunas 'nome' e 'ip' (case-insensitive)."""
    _garantir_condominio(db, condominio_id)

    conteudo = await arquivo.read()
    nome_arq = (arquivo.filename or "").lower()
    try:
        if nome_arq.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(conteudo))
        elif nome_arq.endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(conteudo))
        else:
            raise HTTPException(
                status_code=400,
                detail="Formato não suportado. Use CSV, XLSX ou XLS.",
            )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Erro ao ler planilha: {exc}")

    # Normaliza nomes de coluna
    df.columns = [str(c).strip().lower() for c in df.columns]
    if "nome" not in df.columns or "ip" not in df.columns:
        raise HTTPException(
            status_code=400,
            detail="Planilha precisa conter as colunas 'nome' e 'ip'",
        )

    existentes = {
        ip for (ip,) in db.query(Camera.ip)
        .filter(Camera.condominio_id == condominio_id)
        .all()
    }

    criadas: List[Camera] = []
    ignoradas = 0
    for _, linha in df.iterrows():
        nome = str(linha["nome"]).strip()
        ip = str(linha["ip"]).strip()
        if not nome or not ip or ip.lower() == "nan":
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
