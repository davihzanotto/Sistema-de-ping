"""Scanner de rede — descoberta de câmeras IP por faixa.

Para cada IP da faixa:
    1. Pinga
    2. Se respondeu, testa portas 554 (RTSP), 80 e 8080
    3. Se 554 aberta, marca como 'camera' e tenta capturar 1 frame via RTSP
    4. Se só 80/8080 aberta, marca como 'provavel'
    5. Caso contrário 'outro'

Tudo paralelizado com ThreadPoolExecutor.
"""
from __future__ import annotations

import base64
import ipaddress
import logging
import socket
import subprocess
import sys
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from typing import Callable, Iterable, List, Optional

log = logging.getLogger("agente.scanner")


# -------------------- Detecção de IP local --------------------
def detectar_ip_local() -> Optional[str]:
    """Descobre o IPv4 da interface ativa abrindo um socket UDP "fake".

    Não envia pacote real — só força o SO a escolher a interface de saída.
    """
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.settimeout(0.5)
            # Endereço público qualquer; não conecta de verdade pra UDP
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            return ip if ip and ip != "0.0.0.0" else None
    except Exception as exc:
        log.debug("Falha em detectar IP local: %s", exc)
        return None


# -------------------- Resultado --------------------
@dataclass
class ResultadoIP:
    ip: str
    online: bool = False
    porta_554: bool = False
    porta_80: bool = False
    porta_8080: bool = False
    confianca: str = "outro"  # camera | provavel | outro
    frame_base64: Optional[str] = None

    def como_dict(self) -> dict:
        return {
            "ip": self.ip,
            "online": self.online,
            "porta_554": self.porta_554,
            "porta_80": self.porta_80,
            "porta_8080": self.porta_8080,
            "confianca": self.confianca,
            "frame_base64": self.frame_base64,
        }


# -------------------- Ping --------------------
def _ping_rapido(ip: str, timeout_s: float = 1.5) -> bool:
    timeout_ms = int(timeout_s * 1000)
    if sys.platform.startswith("win"):
        cmd = ["ping", "-n", "1", "-w", str(timeout_ms), ip]
    else:
        cmd = ["ping", "-c", "1", "-W", str(int(max(1, timeout_s))), ip]
    try:
        # CREATE_NO_WINDOW evita piscar console no Windows quando rodando .exe
        creationflags = 0
        if sys.platform.startswith("win"):
            creationflags = 0x08000000  # CREATE_NO_WINDOW
        r = subprocess.run(
            cmd,
            capture_output=True,
            timeout=timeout_s + 1.5,
            creationflags=creationflags,
        )
        return r.returncode == 0
    except Exception:
        return False


# -------------------- Porta TCP --------------------
def _porta_aberta(ip: str, porta: int, timeout_s: float = 0.8) -> bool:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(timeout_s)
            return s.connect_ex((ip, porta)) == 0
    except Exception:
        return False


# -------------------- Frame RTSP --------------------
# URLs comuns de fabricantes — tentamos do mais comum pro mais raro
_URLS_RTSP = (
    "rtsp://{ip}:554/",
    "rtsp://{ip}:554/cam/realmonitor?channel=1&subtype=0",  # Dahua/Intelbras
    "rtsp://{ip}:554/Streaming/Channels/101",                # Hikvision
    "rtsp://{ip}:554/h264Preview_01_main",                   # Reolink
    "rtsp://{ip}:554/onvif1",                                # ONVIF
    "rtsp://{ip}:554/live",
)


def _capturar_frame_rtsp(ip: str, timeout_s: float = 3.0) -> Optional[str]:
    """Tenta capturar 1 frame de uma câmera. Retorna JPEG em base64 ou None.

    Cada tentativa abre uma VideoCapture e lê 1 frame. Limita o tempo total
    pra não travar o scan inteiro.
    """
    try:
        import cv2  # type: ignore
    except Exception as exc:
        log.debug("OpenCV não disponível, pulando frame de %s: %s", ip, exc)
        return None

    inicio = threading.Event()  # usado só como handle simples
    del inicio
    import time

    deadline = time.monotonic() + timeout_s
    for url in _URLS_RTSP:
        if time.monotonic() >= deadline:
            return None
        cap = None
        try:
            cap = cv2.VideoCapture(url.format(ip=ip), cv2.CAP_FFMPEG)
            # Timeouts FFMPEG (microssegundos) — algumas builds ignoram
            try:
                cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 1500)
                cap.set(cv2.CAP_PROP_READ_TIMEOUT_MSEC, 1500)
            except Exception:
                pass
            if not cap.isOpened():
                continue
            ok, frame = cap.read()
            if not ok or frame is None:
                continue
            # Reduz pra preview leve (320x180) e codifica JPEG
            altura, largura = frame.shape[:2]
            if largura > 320:
                escala = 320.0 / largura
                frame = cv2.resize(
                    frame,
                    (320, int(altura * escala)),
                    interpolation=cv2.INTER_AREA,
                )
            ok, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
            if not ok:
                continue
            return base64.b64encode(buf.tobytes()).decode("ascii")
        except Exception as exc:
            log.debug("Falha capturando frame de %s (%s): %s", ip, url, exc)
        finally:
            try:
                if cap is not None:
                    cap.release()
            except Exception:
                pass
    return None


# -------------------- Análise por IP --------------------
def _analisar_ip(ip: str, capturar_frame: bool = True) -> ResultadoIP:
    r = ResultadoIP(ip=ip)
    if not _ping_rapido(ip):
        return r
    r.online = True

    r.porta_554 = _porta_aberta(ip, 554)
    r.porta_80 = _porta_aberta(ip, 80)
    r.porta_8080 = _porta_aberta(ip, 8080)

    if r.porta_554:
        r.confianca = "camera"
        if capturar_frame:
            r.frame_base64 = _capturar_frame_rtsp(ip)
    elif r.porta_80 or r.porta_8080:
        r.confianca = "provavel"
    else:
        r.confianca = "outro"
    return r


# -------------------- Loop principal --------------------
@dataclass
class ProgressoScan:
    feitos: int = 0
    total: int = 0
    novos: List[ResultadoIP] = field(default_factory=list)
    cancelado: bool = False


def _expandir_faixa(ip_inicio: str, ip_fim: str) -> List[str]:
    inicio = int(ipaddress.ip_address(ip_inicio))
    fim = int(ipaddress.ip_address(ip_fim))
    if fim < inicio:
        inicio, fim = fim, inicio
    return [str(ipaddress.ip_address(i)) for i in range(inicio, fim + 1)]


def escanear(
    ip_inicio: str,
    ip_fim: str,
    on_progresso: Callable[[ProgressoScan], bool],
    max_workers: int = 32,
    capturar_frames: bool = True,
) -> ProgressoScan:
    """Escaneia a faixa em paralelo, chamando `on_progresso` periodicamente.

    `on_progresso(prog)` deve retornar True para continuar, False para cancelar.
    O lote `prog.novos` é zerado depois de cada chamada.
    """
    ips = _expandir_faixa(ip_inicio, ip_fim)
    progresso = ProgressoScan(total=len(ips))
    log.info("Iniciando scan de %d IP(s) (%s → %s)", len(ips), ip_inicio, ip_fim)

    cancelar = False
    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        futuros = {
            pool.submit(_analisar_ip, ip, capturar_frames): ip for ip in ips
        }
        ultimo_flush = 0
        for fut in as_completed(futuros):
            try:
                r = fut.result()
            except Exception as exc:
                ip = futuros[fut]
                log.warning("Erro analisando %s: %s", ip, exc)
                r = ResultadoIP(ip=ip)
            progresso.feitos += 1
            progresso.novos.append(r)

            # Reporta a cada ~5 IPs ou a cada lote final
            if progresso.feitos - ultimo_flush >= 5 or progresso.feitos == progresso.total:
                continuar = on_progresso(progresso)
                progresso.novos = []
                ultimo_flush = progresso.feitos
                if not continuar:
                    cancelar = True
                    progresso.cancelado = True
                    break

        if cancelar:
            for fut in futuros:
                fut.cancel()

    log.info(
        "Scan finalizado — %d/%d IP(s) processados%s",
        progresso.feitos,
        progresso.total,
        " (cancelado)" if cancelar else "",
    )
    return progresso
