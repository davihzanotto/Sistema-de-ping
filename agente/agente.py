"""Agente local — pinga câmeras e reporta eventos para a VPS.

Em desenvolvimento:
    python agente.py

Para gerar o .exe:
    build.bat

Fluxo no cliente:
    1. Cliente abre o ping-agente.exe pela primeira vez.
    2. Wizard pergunta URL do servidor e token do condomínio.
    3. Configuração é salva em %APPDATA%/TRIETEL/ping-agente/config.json.
    4. Agente registra-se no autostart do Windows.
    5. Roda invisível, só com o ícone na bandeja do sistema.
"""
from __future__ import annotations

import logging
import os
import sys
import threading
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional

import requests
from ping3 import ping

import config


# -------------------- Logging --------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(str(config.LOG_PATH), encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger("agente")


# -------------------- Estado --------------------
@dataclass
class EstadoCamera:
    id: int
    nome: str
    ip: str
    falhas_consecutivas: int = 0
    online: Optional[bool] = None  # None = ainda não sabemos


@dataclass
class EstadoAgente:
    cameras: Dict[int, EstadoCamera] = field(default_factory=dict)
    rodando: bool = True


estado = EstadoAgente()


# -------------------- Comunicação com a VPS --------------------
def _headers() -> dict:
    return {
        "X-Condominio-Token": config.get().condominio_token,
        "Content-Type": "application/json",
    }


def _base_url() -> str:
    return config.get().api_base_url.rstrip("/")


def sincronizar_cameras() -> List[EstadoCamera]:
    """Busca a lista atual de câmeras do backend."""
    try:
        r = requests.get(f"{_base_url()}/api/agente/cameras", headers=_headers(), timeout=15)
        r.raise_for_status()
    except Exception as exc:
        log.warning("Falha ao sincronizar câmeras: %s", exc)
        return []

    dados = r.json()
    novas: Dict[int, EstadoCamera] = {}
    for item in dados:
        cid = int(item["id"])
        if cid in estado.cameras:
            anterior = estado.cameras[cid]
            anterior.nome = item["nome"]
            anterior.ip = item["ip"]
            novas[cid] = anterior
        else:
            novas[cid] = EstadoCamera(id=cid, nome=item["nome"], ip=item["ip"])
    estado.cameras = novas
    log.info("Câmeras sincronizadas: %d", len(novas))
    return list(novas.values())


def reportar_evento(camera: EstadoCamera, evento: str) -> bool:
    payload = {"camera_id": camera.id, "evento": evento}
    try:
        r = requests.post(
            f"{_base_url()}/api/agente/evento",
            headers=_headers(),
            json=payload,
            timeout=15,
        )
        r.raise_for_status()
        log.info("Evento reportado — %s: %s (%s)", camera.nome, evento, camera.ip)
        return True
    except Exception as exc:
        log.error("Falha ao reportar evento de %s: %s", camera.nome, exc)
        return False


def heartbeat(api_base_url: Optional[str] = None, token: Optional[str] = None) -> tuple[bool, str]:
    """Confirma que o token é válido. Retorna (ok, mensagem)."""
    base = (api_base_url or config.get().api_base_url).rstrip("/")
    headers = {
        "X-Condominio-Token": token or config.get().condominio_token,
        "Content-Type": "application/json",
    }
    if not base or not headers["X-Condominio-Token"]:
        return False, "URL ou token vazios."
    try:
        r = requests.get(f"{base}/api/agente/ping", headers=headers, timeout=10)
        if r.status_code == 401:
            return False, "Token inválido."
        if r.status_code == 404:
            return False, "URL do servidor inválida (404)."
        r.raise_for_status()
        dados = r.json()
        nome = dados.get("condominio") or "?"
        return True, f"Conectado: {nome}"
    except requests.exceptions.ConnectionError:
        return False, "Não foi possível conectar ao servidor."
    except requests.exceptions.Timeout:
        return False, "Tempo esgotado conectando ao servidor."
    except Exception as exc:
        return False, f"Erro: {exc}"


# -------------------- Lógica de ping --------------------
def pingar(ip: str) -> bool:
    try:
        resultado = ping(ip, timeout=config.get().timeout_ping, unit="s")
        return bool(resultado) and resultado is not False
    except Exception as exc:
        log.debug("Erro no ping %s: %s", ip, exc)
        return False


def processar_camera(camera: EstadoCamera) -> None:
    respondeu = pingar(camera.ip)
    if respondeu:
        camera.falhas_consecutivas = 0
        if camera.online is not True:
            sucesso = reportar_evento(camera, "online")
            if sucesso:
                camera.online = True
            elif camera.online is None:
                camera.online = True
    else:
        camera.falhas_consecutivas += 1
        if (
            camera.falhas_consecutivas >= config.get().limite_falhas
            and camera.online is not False
        ):
            sucesso = reportar_evento(camera, "offline")
            if sucesso:
                camera.online = False


# -------------------- Loops --------------------
def loop_ping() -> None:
    cfg = config.get()
    log.info(
        "Loop de ping iniciado — intervalo %ss, limite de falhas %s",
        cfg.intervalo_ping,
        cfg.limite_falhas,
    )
    while estado.rodando:
        for cam in list(estado.cameras.values()):
            if not estado.rodando:
                break
            processar_camera(cam)
        for _ in range(config.get().intervalo_ping):
            if not estado.rodando:
                return
            time.sleep(1)


def loop_sync() -> None:
    while estado.rodando:
        sincronizar_cameras()
        for _ in range(config.get().intervalo_sync):
            if not estado.rodando:
                return
            time.sleep(1)


# -------------------- Autostart no Windows --------------------
AUTOSTART_KEY = r"Software\Microsoft\Windows\CurrentVersion\Run"
AUTOSTART_NAME = "TrietelPingAgente"


def _executavel_atual() -> str:
    """Caminho do .exe quando empacotado, ou do interpretador + script em dev."""
    if getattr(sys, "frozen", False):
        return f'"{sys.executable}"'
    return f'"{sys.executable}" "{os.path.abspath(sys.argv[0])}"'


def registrar_autostart(ativar: bool = True) -> None:
    """Adiciona/remove o agente do autostart do usuário no registro."""
    if not sys.platform.startswith("win"):
        return
    try:
        import winreg  # type: ignore
    except ImportError:
        return
    try:
        with winreg.OpenKey(
            winreg.HKEY_CURRENT_USER, AUTOSTART_KEY, 0, winreg.KEY_SET_VALUE
        ) as key:
            if ativar:
                winreg.SetValueEx(key, AUTOSTART_NAME, 0, winreg.REG_SZ, _executavel_atual())
                log.info("Autostart registrado.")
            else:
                try:
                    winreg.DeleteValue(key, AUTOSTART_NAME)
                    log.info("Autostart removido.")
                except FileNotFoundError:
                    pass
    except Exception as exc:
        log.warning("Falha ao mexer no autostart: %s", exc)


# -------------------- Wizard de configuração --------------------
def abrir_wizard(cfg_inicial: Optional[config.Config] = None) -> Optional[config.Config]:
    """Abre janela Tk pedindo URL e token. Retorna o Config salvo, ou None se cancelado."""
    import tkinter as tk
    from tkinter import ttk, messagebox

    cfg = cfg_inicial or config.get()
    resultado: dict = {"cfg": None}

    janela = tk.Tk()
    janela.title("TRIETEL — Configuração do agente")
    janela.geometry("440x320")
    janela.resizable(False, False)
    janela.configure(bg="#0A0A0A")

    try:
        # tema escuro com ttk
        s = ttk.Style(janela)
        s.theme_use("clam")
        s.configure(".", background="#0A0A0A", foreground="#FAFAFA")
        s.configure("TLabel", background="#0A0A0A", foreground="#FAFAFA")
        s.configure("Sub.TLabel", background="#0A0A0A", foreground="#A1A1A1")
        s.configure("Title.TLabel", background="#0A0A0A", foreground="#FAFAFA",
                    font=("Segoe UI", 16, "bold"))
        s.configure("Brand.TLabel", background="#0A0A0A", foreground="#6B6B6B",
                    font=("Segoe UI", 9))
        s.configure(
            "TEntry",
            fieldbackground="#111111",
            foreground="#FAFAFA",
            bordercolor="#1E1E1E",
            lightcolor="#1E1E1E",
            darkcolor="#1E1E1E",
            insertcolor="#FAFAFA",
        )
        s.configure(
            "Primary.TButton",
            background="#FAFAFA",
            foreground="#0A0A0A",
            borderwidth=0,
            focusthickness=0,
            padding=(16, 8),
            font=("Segoe UI", 10, "bold"),
        )
        s.map("Primary.TButton", background=[("active", "#E5E5E5")])
        s.configure(
            "Ghost.TButton",
            background="#0A0A0A",
            foreground="#A1A1A1",
            borderwidth=0,
            padding=(16, 8),
            font=("Segoe UI", 10),
        )
    except Exception:
        pass

    container = ttk.Frame(janela, padding=(28, 24, 28, 20))
    container.pack(fill="both", expand=True)

    ttk.Label(container, text="TRIETEL", style="Brand.TLabel").pack(anchor="w")
    ttk.Label(container, text="Configurar agente", style="Title.TLabel").pack(
        anchor="w", pady=(2, 4)
    )
    ttk.Label(
        container,
        text="Informe os dados de conexão para começar a monitorar as câmeras.",
        style="Sub.TLabel",
        wraplength=380,
    ).pack(anchor="w", pady=(0, 18))

    # URL
    ttk.Label(container, text="URL do servidor", style="Sub.TLabel").pack(anchor="w")
    var_url = tk.StringVar(value=cfg.api_base_url or "")
    entry_url = ttk.Entry(container, textvariable=var_url, width=48)
    entry_url.pack(fill="x", pady=(4, 12))

    # Token
    ttk.Label(container, text="Token do condomínio", style="Sub.TLabel").pack(anchor="w")
    var_token = tk.StringVar(value=cfg.condominio_token or "")
    entry_token = ttk.Entry(container, textvariable=var_token, width=48)
    entry_token.pack(fill="x", pady=(4, 6))

    status = ttk.Label(container, text="", style="Sub.TLabel")
    status.pack(anchor="w", pady=(6, 12))

    def set_status(texto: str, cor: str = "#A1A1A1") -> None:
        status.configure(text=texto, foreground=cor)
        janela.update_idletasks()

    def acao_salvar() -> None:
        url = var_url.get().strip()
        token = var_token.get().strip()
        if not url:
            set_status("Informe a URL do servidor.", "#EF4444")
            return
        if not token:
            set_status("Informe o token.", "#EF4444")
            return
        if not (url.startswith("http://") or url.startswith("https://")):
            url = "http://" + url
            var_url.set(url)

        set_status("Testando conexão...", "#A1A1A1")
        ok, msg = heartbeat(api_base_url=url, token=token)
        if not ok:
            set_status(msg, "#EF4444")
            return

        novo = config.Config(
            api_base_url=url,
            condominio_token=token,
            intervalo_ping=cfg.intervalo_ping,
            intervalo_sync=cfg.intervalo_sync,
            limite_falhas=cfg.limite_falhas,
            timeout_ping=cfg.timeout_ping,
        )
        try:
            config.salvar(novo)
            config.set_(novo)
        except Exception as exc:
            messagebox.showerror("Erro ao salvar", str(exc))
            return

        registrar_autostart(True)
        set_status(msg + " — salvo!", "#22C55E")
        resultado["cfg"] = novo
        janela.after(700, janela.destroy)

    botoes = ttk.Frame(container)
    botoes.pack(fill="x", pady=(4, 0))
    ttk.Button(botoes, text="Cancelar", style="Ghost.TButton",
               command=janela.destroy).pack(side="right", padx=(8, 0))
    ttk.Button(botoes, text="Conectar e iniciar", style="Primary.TButton",
               command=acao_salvar).pack(side="right")

    # Atalhos: Enter envia, Esc fecha
    janela.bind("<Return>", lambda e: acao_salvar())
    janela.bind("<Escape>", lambda e: janela.destroy())

    if not var_url.get():
        entry_url.focus_set()
    else:
        entry_token.focus_set()

    janela.mainloop()
    return resultado["cfg"]


# -------------------- System tray --------------------
def _aguardar_sem_tray() -> None:
    try:
        while estado.rodando:
            time.sleep(1)
    except KeyboardInterrupt:
        pass


def iniciar_tray() -> None:
    """Ícone na bandeja do sistema. Bloqueia até o usuário escolher 'Sair'."""
    try:
        from PIL import Image, ImageDraw
        import pystray
    except Exception as exc:
        log.warning("pystray não disponível (%s) — rodando sem tray", exc)
        _aguardar_sem_tray()
        return

    img = Image.new("RGB", (64, 64), "white")
    draw = ImageDraw.Draw(img)
    draw.ellipse((8, 8, 56, 56), fill=(30, 180, 60))

    def status_texto(_item) -> str:
        total = len(estado.cameras)
        online = sum(1 for c in estado.cameras.values() if c.online)
        offline = sum(1 for c in estado.cameras.values() if c.online is False)
        return f"Status: {online}/{total} online · {offline} offline"

    def forcar_sync(_icon, _item) -> None:
        threading.Thread(target=sincronizar_cameras, daemon=True).start()

    def quando_sair(icon, _item) -> None:
        log.info("Saindo pelo tray...")
        estado.rodando = False
        try:
            icon.visible = False
        except Exception:
            pass
        try:
            icon.stop()
        except Exception as exc:
            log.debug("Erro ao parar tray: %s", exc)

    menu = pystray.Menu(
        pystray.MenuItem(status_texto, None, enabled=False),
        pystray.MenuItem("Forçar sync", forcar_sync),
        pystray.MenuItem("Sair", quando_sair),
    )
    icon = pystray.Icon("ping-agente", img, "TRIETEL — Agente de Ping", menu)
    try:
        icon.run()
    except Exception as exc:
        log.error("Erro no loop do tray (%s) — caindo em modo headless", exc)
        _aguardar_sem_tray()


# -------------------- Main --------------------
def main() -> None:
    cfg = config.get()

    # Primeira execução (ou config inválida) → wizard
    if not cfg.valido():
        log.info("Configuração ausente — abrindo wizard.")
        novo = abrir_wizard(cfg)
        if novo is None:
            log.info("Wizard cancelado pelo usuário. Encerrando.")
            return
        cfg = novo
    else:
        # Já configurado: garante que o autostart está registrado.
        registrar_autostart(True)

    ok, msg = heartbeat()
    if not ok:
        log.error("Falha no heartbeat: %s", msg)
        # Reabre o wizard para o usuário corrigir.
        novo = abrir_wizard(cfg)
        if novo is None:
            return
        cfg = novo
        ok, msg = heartbeat()
        if not ok:
            log.error("Heartbeat ainda falhou: %s. Encerrando.", msg)
            return

    log.info(msg)

    sincronizar_cameras()

    t1 = threading.Thread(target=loop_ping, daemon=True)
    t2 = threading.Thread(target=loop_sync, daemon=True)
    t1.start()
    t2.start()

    try:
        iniciar_tray()
    except KeyboardInterrupt:
        pass
    finally:
        estado.rodando = False
        t1.join(timeout=5)
        t2.join(timeout=5)
        log.info("Agente encerrado")


if __name__ == "__main__":
    main()
