"""Integração com Firebase Cloud Messaging."""
import json
import logging
import os
from typing import List, Optional

import firebase_admin
from firebase_admin import credentials, messaging

from app.config import settings

logger = logging.getLogger(__name__)

_firebase_app: Optional[firebase_admin.App] = None


def _inicializar_firebase() -> Optional[firebase_admin.App]:
    """Inicializa a SDK do Firebase se as credenciais existirem.

    Suporta duas formas:
    1. FIREBASE_CREDENTIALS_JSON — conteúdo do JSON como string (Railway/env var)
    2. FIREBASE_CREDENTIALS_PATH — caminho do arquivo (Docker com volume)
    """
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app

    cred = None

    # Prioridade 1: conteúdo JSON direto na variável de ambiente (Railway)
    if settings.firebase_credentials_json:
        try:
            dados = json.loads(settings.firebase_credentials_json)
            cred = credentials.Certificate(dados)
            logger.info("Firebase inicializado via FIREBASE_CREDENTIALS_JSON")
        except Exception as exc:
            logger.error("Falha ao parsear FIREBASE_CREDENTIALS_JSON: %s", exc)
            return None

    # Prioridade 2: arquivo no disco (Docker com volume montado)
    elif os.path.isfile(settings.firebase_credentials_path):
        try:
            cred = credentials.Certificate(settings.firebase_credentials_path)
            logger.info("Firebase inicializado via arquivo %s", settings.firebase_credentials_path)
        except Exception as exc:
            logger.error("Falha ao ler credenciais Firebase: %s", exc)
            return None

    else:
        logger.warning(
            "Credenciais Firebase não encontradas — push desabilitado. "
            "Configure FIREBASE_CREDENTIALS_JSON ou FIREBASE_CREDENTIALS_PATH."
        )
        return None

    try:
        _firebase_app = firebase_admin.initialize_app(cred)
    except Exception as exc:
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
