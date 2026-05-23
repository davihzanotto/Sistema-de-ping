"""Modelos ORM (SQLAlchemy) do sistema."""
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.database import Base


class Usuario(Base):
    """Usuário que acessa o app / backoffice."""

    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(120), nullable=False)
    email = Column(String(160), unique=True, index=True, nullable=False)
    senha_hash = Column(String(255), nullable=False)
    criado_em = Column(DateTime, default=datetime.utcnow, nullable=False)

    dispositivos = relationship(
        "Dispositivo", back_populates="usuario", cascade="all, delete-orphan"
    )


class Condominio(Base):
    """Condomínio monitorado — cada agente local pertence a um."""

    __tablename__ = "condominios"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(160), nullable=False)
    endereco = Column(String(255), nullable=True)
    # Token único usado pelo agente local para se autenticar
    token_unico = Column(String(80), unique=True, index=True, nullable=False)
    criado_em = Column(DateTime, default=datetime.utcnow, nullable=False)

    cameras = relationship(
        "Camera", back_populates="condominio", cascade="all, delete-orphan"
    )


class Camera(Base):
    """Câmera IP de um condomínio."""

    __tablename__ = "cameras"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(160), nullable=False)
    ip = Column(String(45), nullable=False)  # suporta IPv6
    condominio_id = Column(
        Integer, ForeignKey("condominios.id", ondelete="CASCADE"), nullable=False
    )
    # online | offline | desconhecido
    status = Column(String(20), default="desconhecido", nullable=False)
    ultimo_ping = Column(DateTime, nullable=True)
    criado_em = Column(DateTime, default=datetime.utcnow, nullable=False)

    condominio = relationship("Condominio", back_populates="cameras")
    eventos = relationship(
        "Historico", back_populates="camera", cascade="all, delete-orphan"
    )


class Historico(Base):
    """Histórico de eventos (online/offline) de cada câmera."""

    __tablename__ = "historico"

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(
        Integer, ForeignKey("cameras.id", ondelete="CASCADE"), nullable=False
    )
    # offline | online
    evento = Column(String(20), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    camera = relationship("Camera", back_populates="eventos")


class Dispositivo(Base):
    """Dispositivo móvel registrado para receber push via FCM."""

    __tablename__ = "dispositivos"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(
        Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False
    )
    token_fcm = Column(String(255), unique=True, nullable=False)
    criado_em = Column(DateTime, default=datetime.utcnow, nullable=False)

    usuario = relationship("Usuario", back_populates="dispositivos")


class AgenteInfo(Base):
    """Metadados que o agente envia periodicamente (IP local etc.).

    Tabela separada da Condominio para evitar migração de schema.
    """

    __tablename__ = "agente_info"

    condominio_id = Column(
        Integer,
        ForeignKey("condominios.id", ondelete="CASCADE"),
        primary_key=True,
    )
    ip_local = Column(String(45), nullable=True)
    versao_agente = Column(String(20), nullable=True)
    atualizado_em = Column(DateTime, default=datetime.utcnow, nullable=False)


class Scan(Base):
    """Tarefa de scan de rede solicitada pelo app, executada pelo agente."""

    __tablename__ = "scans"

    id = Column(Integer, primary_key=True, index=True)
    condominio_id = Column(
        Integer,
        ForeignKey("condominios.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    ip_inicio = Column(String(45), nullable=False)
    ip_fim = Column(String(45), nullable=False)
    # pendente | executando | concluido | erro | cancelado
    status = Column(String(20), default="pendente", nullable=False, index=True)
    total_ips = Column(Integer, default=0, nullable=False)
    progresso = Column(Integer, default=0, nullable=False)
    mensagem_erro = Column(Text, nullable=True)
    criado_em = Column(DateTime, default=datetime.utcnow, nullable=False)
    iniciado_em = Column(DateTime, nullable=True)
    finalizado_em = Column(DateTime, nullable=True)

    resultados = relationship(
        "ScanResultado", back_populates="scan", cascade="all, delete-orphan"
    )


class ScanResultado(Base):
    """Resultado de um IP individual durante o scan."""

    __tablename__ = "scan_resultados"

    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(
        Integer, ForeignKey("scans.id", ondelete="CASCADE"), nullable=False, index=True
    )
    ip = Column(String(45), nullable=False)
    online = Column(Boolean, default=False, nullable=False)
    porta_554 = Column(Boolean, default=False, nullable=False)
    porta_80 = Column(Boolean, default=False, nullable=False)
    porta_8080 = Column(Boolean, default=False, nullable=False)
    # camera | provavel | outro
    confianca = Column(String(20), default="outro", nullable=False)
    frame_base64 = Column(Text, nullable=True)
    criado_em = Column(DateTime, default=datetime.utcnow, nullable=False)

    scan = relationship("Scan", back_populates="resultados")
