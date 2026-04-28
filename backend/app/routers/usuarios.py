"""Endpoints de autenticação — cadastro e login de usuários."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import criar_token, hash_senha, usuario_atual, verificar_senha
from app.database import get_db
from app.models import Usuario
from app.schemas import Login, Token, UsuarioCriar, UsuarioResposta

router = APIRouter()


@router.post("/registrar", response_model=UsuarioResposta, status_code=201)
def registrar(dados: UsuarioCriar, db: Session = Depends(get_db)):
    """Cria um novo usuário com senha hasheada."""
    existente = db.query(Usuario).filter(Usuario.email == dados.email).first()
    if existente:
        raise HTTPException(status_code=400, detail="E-mail já cadastrado")

    usuario = Usuario(
        nome=dados.nome,
        email=dados.email,
        senha_hash=hash_senha(dados.senha),
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario


@router.post("/login", response_model=Token)
def login(dados: Login, db: Session = Depends(get_db)):
    """Autentica e devolve JWT."""
    usuario = db.query(Usuario).filter(Usuario.email == dados.email).first()
    if not usuario or not verificar_senha(dados.senha, usuario.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha inválidos",
        )
    token = criar_token(sub=usuario.email, extras={"uid": usuario.id})
    return Token(access_token=token)


@router.get("/me", response_model=UsuarioResposta)
def me(usuario: Usuario = Depends(usuario_atual)):
    """Retorna dados do usuário autenticado."""
    return usuario
