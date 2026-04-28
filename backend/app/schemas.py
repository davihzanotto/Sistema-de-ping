"""Schemas Pydantic — validação de entrada e saída da API."""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# -------------------- Usuários --------------------
class UsuarioCriar(BaseModel):
    nome: str
    email: EmailStr
    senha: str = Field(min_length=6)


class UsuarioResposta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    email: EmailStr
    criado_em: datetime


class Login(BaseModel):
    email: EmailStr
    senha: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# -------------------- Condomínios --------------------
class CondominioCriar(BaseModel):
    nome: str
    endereco: Optional[str] = None


class CondominioAtualizar(BaseModel):
    nome: Optional[str] = None
    endereco: Optional[str] = None


class CondominioResposta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    endereco: Optional[str]
    token_unico: str
    criado_em: datetime


class CondominioStatus(BaseModel):
    """Resposta do dashboard — condomínio + contagem de câmeras por status."""

    id: int
    nome: str
    endereco: Optional[str]
    total_cameras: int
    online: int
    offline: int
    desconhecido: int


# -------------------- Câmeras --------------------
class CameraCriar(BaseModel):
    nome: str
    ip: str
    condominio_id: int


class CameraAtualizar(BaseModel):
    nome: Optional[str] = None
    ip: Optional[str] = None


class CameraResposta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    ip: str
    condominio_id: int
    status: str
    ultimo_ping: Optional[datetime]
    criado_em: datetime


class CameraImportFaixa(BaseModel):
    """Importa câmeras por faixa de IP — ex.: 192.168.0.10 até 192.168.0.30."""

    condominio_id: int
    ip_inicio: str
    ip_fim: str
    prefixo_nome: str = Field(default="Camera", description="Prefixo do nome gerado")


# -------------------- Agente local --------------------
class PingEvento(BaseModel):
    """Payload enviado pelo agente quando detecta mudança de status."""

    camera_id: int
    evento: str = Field(pattern="^(online|offline)$")


class AgenteAuth(BaseModel):
    """Autenticação do agente local via token do condomínio."""

    token: str


class CameraParaAgente(BaseModel):
    """Formato reduzido enviado para o agente pingar."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    ip: str


# -------------------- Histórico --------------------
class HistoricoResposta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    camera_id: int
    evento: str
    timestamp: datetime


class HistoricoCompleto(BaseModel):
    """Histórico com dados enriquecidos da câmera e condomínio."""

    id: int
    camera_id: int
    camera_nome: str
    camera_ip: str
    condominio_id: int
    condominio_nome: str
    evento: str
    timestamp: datetime


# -------------------- Dispositivos (FCM) --------------------
class DispositivoRegistrar(BaseModel):
    token_fcm: str


class DispositivoResposta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    usuario_id: int
    token_fcm: str
    criado_em: datetime


# -------------------- Import CSV/Excel --------------------
class ResultadoImportacao(BaseModel):
    total_importadas: int
    total_ignoradas: int
    cameras: List[CameraResposta]
