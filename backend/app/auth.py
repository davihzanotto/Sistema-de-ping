"""Autenticação — hashing de senha e geração/validação de JWT."""
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import Condominio, Usuario

# Contexto de hashing usando bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Esquema OAuth2 para pegar o token do header Authorization
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def hash_senha(senha: str) -> str:
    """Gera hash bcrypt de uma senha em texto puro."""
    return pwd_context.hash(senha)


def verificar_senha(senha: str, senha_hash: str) -> bool:
    """Confere se a senha bate com o hash armazenado."""
    return pwd_context.verify(senha, senha_hash)


def criar_token(sub: str, extras: Optional[dict] = None) -> str:
    """Gera um JWT com expiração configurável."""
    expira = datetime.utcnow() + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": sub, "exp": expira}
    if extras:
        payload.update(extras)
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def usuario_atual(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Usuario:
    """Dependência que resolve o usuário a partir do JWT."""
    credencial_invalida = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credencial_invalida
    try:
        payload = jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )
        email: Optional[str] = payload.get("sub")
        if not email:
            raise credencial_invalida
    except JWTError:
        raise credencial_invalida

    usuario = db.query(Usuario).filter(Usuario.email == email).first()
    if not usuario:
        raise credencial_invalida
    return usuario


def condominio_por_token(
    x_condominio_token: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
) -> Condominio:
    """Autentica o agente local via header X-Condominio-Token."""
    if not x_condominio_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Header X-Condominio-Token ausente",
        )
    condominio = (
        db.query(Condominio)
        .filter(Condominio.token_unico == x_condominio_token)
        .first()
    )
    if not condominio:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de condomínio inválido",
        )
    return condominio
