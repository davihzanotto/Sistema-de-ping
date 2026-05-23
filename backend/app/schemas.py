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


# -------------------- Scan de rede --------------------
class ScanIniciar(BaseModel):
    ip_inicio: str
    ip_fim: str


class ScanResultadoResposta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ip: str
    online: bool
    porta_554: bool
    porta_80: bool
    porta_8080: bool
    confianca: str  # camera | provavel | outro
    frame_base64: Optional[str] = None


class ScanResposta(BaseModel):
    """Status do scan + resultados parciais (consumido pelo app)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    condominio_id: int
    ip_inicio: str
    ip_fim: str
    status: str  # pendente | executando | concluido | erro | cancelado
    total_ips: int
    progresso: int
    mensagem_erro: Optional[str] = None
    criado_em: datetime
    iniciado_em: Optional[datetime] = None
    finalizado_em: Optional[datetime] = None
    resultados: List[ScanResultadoResposta] = []


class ScanPendente(BaseModel):
    """Scan que o agente deve executar."""

    id: int
    ip_inicio: str
    ip_fim: str


class ScanResultadoEnvio(BaseModel):
    """Um resultado individual reportado pelo agente."""

    ip: str
    online: bool = False
    porta_554: bool = False
    porta_80: bool = False
    porta_8080: bool = False
    confianca: str = Field(
        default="outro",
        pattern="^(camera|provavel|outro)$",
    )
    frame_base64: Optional[str] = None


class ScanProgressoEnvio(BaseModel):
    """Lote de progresso/resultados enviado pelo agente periodicamente."""

    scan_id: int
    progresso: int
    total_ips: Optional[int] = None
    resultados: List[ScanResultadoEnvio] = []
    finalizado: bool = False
    mensagem_erro: Optional[str] = None


class AgenteInfoEnvio(BaseModel):
    """Heartbeat com metadados do agente (IP local etc.)."""

    ip_local: Optional[str] = None
    versao_agente: Optional[str] = None


class RedeInfo(BaseModel):
    """Sugestão de faixa para o scan, baseada no IP do agente."""

    ip_agente: Optional[str] = None
    faixa_inicio: Optional[str] = None
    faixa_fim: Optional[str] = None
    atualizado_em: Optional[datetime] = None


# -------------------- Cadastro em massa de câmeras --------------------
class CameraEmMassaItem(BaseModel):
    nome: str
    ip: str


class CamerasEmMassa(BaseModel):
    cameras: List[CameraEmMassaItem]
