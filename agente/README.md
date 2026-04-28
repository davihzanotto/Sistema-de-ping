# Agente Local — TRIETEL

Pinga as câmeras IP da rede interna e reporta eventos para o servidor central. Empacotado como um único `.exe` que o cliente apenas abre — sem terminal, sem editar arquivos.

## Como o cliente instala

1. Receba o arquivo `ping-agente.exe`.
2. Dê duplo-clique. Na primeira execução abre uma janela pedindo:
   - **URL do servidor** (ex.: `https://meuservidor.com`)
   - **Token do condomínio** (gerado no app ao cadastrar o condomínio)
3. Clique em **Conectar e iniciar**. O agente testa a conexão, salva a configuração em `%APPDATA%\TRIETEL\ping-agente\config.json` e se registra no autostart do Windows.
4. Pronto — o agente roda invisível, só com o **ícone na bandeja do sistema**.

A partir daí o agente:
- Inicia automaticamente toda vez que o Windows liga.
- Pode ser controlado pelo ícone da bandeja: **Status**, **Forçar sync**, **Sair**.
- Grava o log em `%APPDATA%\TRIETEL\ping-agente\agente.log`.

## Gerar o `.exe` (Windows)

Na pasta `agente/`:

```
build.bat
```

O script:
- Limpa builds anteriores (`dist/`, `build/`, `*.spec`).
- Instala as dependências do `requirements.txt`.
- Roda o PyInstaller em modo `--onefile --noconsole` com os hidden imports necessários (Tkinter para o wizard, PIL/pystray para o tray).
- Deixa o resultado final em `dist/ping-agente.exe`.

Distribua **apenas esse arquivo único**.

## Rodar em desenvolvimento

```
pip install -r requirements.txt
python agente.py
```

Em dev, se existir um `.env` ao lado de `agente.py`, ele é usado como fonte inicial dos valores no wizard. Em produção (.exe), o `.env` é ignorado e a config vem só do `config.json`.

## Onde a configuração mora

| Arquivo | Local |
|---|---|
| Config persistida | `%APPDATA%\TRIETEL\ping-agente\config.json` |
| Log | `%APPDATA%\TRIETEL\ping-agente\agente.log` |
| Autostart | `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` → `TrietelPingAgente` |

Para reconfigurar do zero: feche o agente pelo tray, apague o `config.json` e abra o `.exe` novamente — o wizard reaparece.

## Campos da configuração

| Campo | Descrição | Default |
|---|---|---|
| `api_base_url` | URL do servidor (com `http://` ou `https://`) | *(obrigatório)* |
| `condominio_token` | Token único gerado ao cadastrar o condomínio | *(obrigatório)* |
| `intervalo_ping` | Segundos entre rodadas de ping | `120` |
| `intervalo_sync` | Segundos entre sincronizações da lista de câmeras | `600` |
| `limite_falhas` | Falhas consecutivas até marcar offline | `3` |
| `timeout_ping` | Timeout de cada ping (s) | `2.0` |

Os intervalos avançados ficam no JSON — o wizard só pede URL e token, que é o que o cliente precisa configurar.
