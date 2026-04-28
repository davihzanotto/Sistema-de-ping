"""Configuração do agente — persistida em %APPDATA%\\TRIETEL\\ping-agente\\config.json.

Em dev (executando `python agente.py` no repositório), também lê de `.env`
ao lado do script para conveniência. Em produção (.exe instalado no cliente),
toda a configuração vive no JSON, gravado pelo wizard de primeira execução.
"""
from __future__ import annotations

import json
import os
import sys
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Optional


APP_NAME = "ping-agente"
VENDOR = "TRIETEL"


def _appdata_dir() -> Path:
    """Pasta persistente do agente. %APPDATA% no Windows, ~/.config no resto."""
    if sys.platform.startswith("win"):
        base = os.environ.get("APPDATA") or str(Path.home() / "AppData" / "Roaming")
    else:
        base = os.environ.get("XDG_CONFIG_HOME") or str(Path.home() / ".config")
    p = Path(base) / VENDOR / APP_NAME
    p.mkdir(parents=True, exist_ok=True)
    return p


CONFIG_PATH: Path = _appdata_dir() / "config.json"
LOG_PATH: Path = _appdata_dir() / "agente.log"


@dataclass
class Config:
    api_base_url: str = ""
    condominio_token: str = ""
    intervalo_ping: int = 120
    intervalo_sync: int = 600
    limite_falhas: int = 3
    timeout_ping: float = 2.0

    def valido(self) -> bool:
        return bool(self.api_base_url.strip()) and bool(self.condominio_token.strip())


def _carregar_dotenv_dev() -> dict:
    """Em dev, lê o .env ao lado do agente.py para preencher defaults."""
    if getattr(sys, "frozen", False):
        return {}  # rodando como .exe — nunca mexe em .env
    try:
        from dotenv import load_dotenv  # type: ignore

        load_dotenv(Path(__file__).with_name(".env"))
    except Exception:
        pass
    return {
        "api_base_url": os.getenv("API_BASE_URL", ""),
        "condominio_token": os.getenv("CONDOMINIO_TOKEN", ""),
        "intervalo_ping": int(os.getenv("INTERVALO_PING", "120") or "120"),
        "intervalo_sync": int(os.getenv("INTERVALO_SYNC", "600") or "600"),
        "limite_falhas": int(os.getenv("LIMITE_FALHAS", "3") or "3"),
        "timeout_ping": float(os.getenv("TIMEOUT_PING", "2.0") or "2.0"),
    }


def carregar() -> Config:
    """Lê config.json. Se não existir, cai no .env (dev) ou retorna vazio."""
    if CONFIG_PATH.exists():
        try:
            with CONFIG_PATH.open("r", encoding="utf-8") as f:
                dados = json.load(f)
            return Config(
                api_base_url=str(dados.get("api_base_url", "")).strip(),
                condominio_token=str(dados.get("condominio_token", "")).strip(),
                intervalo_ping=int(dados.get("intervalo_ping", 120)),
                intervalo_sync=int(dados.get("intervalo_sync", 600)),
                limite_falhas=int(dados.get("limite_falhas", 3)),
                timeout_ping=float(dados.get("timeout_ping", 2.0)),
            )
        except Exception:
            pass

    # fallback dev
    dev = _carregar_dotenv_dev()
    return Config(
        api_base_url=dev.get("api_base_url", ""),
        condominio_token=dev.get("condominio_token", ""),
        intervalo_ping=dev.get("intervalo_ping", 120),
        intervalo_sync=dev.get("intervalo_sync", 600),
        limite_falhas=dev.get("limite_falhas", 3),
        timeout_ping=dev.get("timeout_ping", 2.0),
    )


def salvar(cfg: Config) -> None:
    """Persiste config no JSON do APPDATA."""
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with CONFIG_PATH.open("w", encoding="utf-8") as f:
        json.dump(asdict(cfg), f, indent=2, ensure_ascii=False)


# Instância global usada pelo agente.py — recarregável.
_cfg: Optional[Config] = None


def get() -> Config:
    global _cfg
    if _cfg is None:
        _cfg = carregar()
    return _cfg


def set_(cfg: Config) -> None:
    global _cfg
    _cfg = cfg
