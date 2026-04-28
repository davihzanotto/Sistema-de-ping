"""Integração com Firebase Cloud Messaging."""
import logging
import os
from typing import List, Optional

import firebase_admin
from firebase_admin import credentials, messaging

from app.config import settings

logger = logging.getLogger(__name__)

_firebase_app: Optional[firebase_admin.App] = None


def _inicializar_firebase() -> Optional[firebase_admin.App]:
    """Inicializa a SDK do Firebase se as credenciais existirem."""
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app

    caminho = settings.firebase_credentials_path
    if not caminho or not os.path.isfile(caminho):
        logger.warning(
            "Credenciais Firebase não encontradas em %s — push desabilitado", caminho
        )
        return None

    try:
        cred = credentials.Certificate(caminho)
        _firebase_app = firebase_admin.initialize_app(cred)
        logger.info("Firebase inicializado com sucesso")
    except Exception as exc:  # pragma: no cover
        logger.error("Falha ao inicializar Firebase: %s", exc)
        _firebase_app = None
    return _firebase_app


def enviar_push(tokens: List[str], titulo: str, corpo: str, data: Optional[dict] = None) -> int:
    """Envia notificação push para uma lista de tokens FCM.

    Retorna o número de envios bem-sucedidos (0 em erro ou sem Firebase).
    """
    if not tokens:
        return 0

    app = _inicializar_firebase()
    if app is None:
        return 0

    mensagem = messaging.MulticastMessage(
        tokens=tokens,
        notification=messaging.Notification(title=titulo, body=corpo),
        data={k: str(v) for k, v in (data or {}).items()},
        android=messaging.AndroidConfig(priority="high"),
        apns=messaging.APNSConfig(
            payload=messaging.APNSPayload(
                aps=messaging.Aps(sound="default"),
            ),
        ),
    )
    try:
        resposta = messaging.send_each_for_multicast(mensagem)
        return resposta.success_count
    except Exception as exc:  # pragma: no cover
        logger.error("Falha ao enviar push FCM: %s", exc)
        return 0
