"""Modelos ORM (SQLAlchemy) do sistema."""
from datetime import datetime

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
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
