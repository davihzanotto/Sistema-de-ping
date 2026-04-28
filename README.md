# Sistema de Ping — Monitoramento de Câmeras IP

Monitora câmeras IP em múltiplos condomínios com alerta em tempo real no celular.

## Arquitetura

```
[Agente local (.exe)]  ───ping───►  [Câmeras IP na LAN]
        │
        │  POST /api/agente/evento
        ▼
[Backend FastAPI + Postgres (VPS)]
        │
        │  FCM (Firebase)
        ▼
[App React Native]  (notificação push + dashboard)
```

## Estrutura do projeto

```
.
├── backend/          # API FastAPI + Postgres
├── agente/           # Agente Python → .exe (PyInstaller)
├── app/              # App React Native (Expo)
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 1. Backend

### Rodar em desenvolvimento (Docker)

```bash
cp .env.example .env
cp agente/.env.example agente/.env
docker compose up --build
```

API disponível em `http://localhost:8000` · docs em `http://localhost:8000/docs`.

Primeiro uso:
1. Acesse `/docs` e faça `POST /api/auth/registrar` para criar o primeiro usuário.
2. `POST /api/auth/login` para pegar o JWT.
3. Use o botão **Authorize** do Swagger ou o header `Authorization: Bearer <token>`.
4. `POST /api/condominios/` — copie o `token_unico` retornado.

### Variáveis de ambiente (`.env`)

| Variável | Descrição |
|---|---|
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Credenciais do banco |
| `JWT_SECRET` | Segredo usado para assinar tokens JWT |
| `FIREBASE_CREDENTIALS_PATH` | Caminho do `firebase-credentials.json` dentro do container |
| `CORS_ORIGINS` | Lista separada por vírgula de origens permitidas (ou `*`) |

---

## 2. Firebase (FCM)

1. Crie um projeto em <https://console.firebase.google.com>.
2. **Project settings → Service accounts → Generate new private key**.
3. Salve o JSON como `firebase-credentials.json` na raiz do repositório (ele é montado no container via `docker-compose.yml`).
4. Para o app Android: gere o `google-services.json` em **Project settings → Your apps → Android** e coloque em `app/google-services.json`.
5. Para iOS, gere o `GoogleService-Info.plist` e adicione como recurso do bundle.

---

## 3. Agente Local

### Rodar em dev

```bash
cd agente
pip install -r requirements.txt
cp .env.example .env    # preencha API_BASE_URL e CONDOMINIO_TOKEN
python agente.py
```

### Gerar `.exe` com PyInstaller

```bash
cd agente
build.bat                  # Windows
```

Saída: `agente/dist/ping-agente.exe`.

### Instalar no PC do condomínio

1. Copie `ping-agente.exe` e um arquivo `.env` ao lado do executável (ou configure as variáveis de ambiente no Windows).
2. Para rodar no boot: `Win+R → shell:startup` e crie um atalho para o `.exe` ali dentro.
3. O ícone aparece na bandeja do sistema com status e opção de sair.

### Como o agente se comporta

- Autentica via header `X-Condominio-Token` no primeiro boot.
- Baixa a lista de câmeras do endpoint `/api/agente/cameras`.
- Pinga cada IP a cada `INTERVALO_PING` segundos (default 120s).
- Se uma câmera não responder `LIMITE_FALHAS` vezes seguidas (default 3) → `POST /api/agente/evento` com `offline`.
- Quando voltar a responder → `POST /api/agente/evento` com `online`.
- Ressincroniza a lista a cada `INTERVALO_SYNC` segundos (default 600s).

---

## 4. App Mobile

### Rodar em dev

```bash
cd app
npm install
npx expo start
```

Escaneie o QR code com o Expo Go (Android/iOS) ou aperte `a` para Android.

### Configurar URL da API

Edite `app.json` e adicione sob `expo`:

```json
"extra": {
  "apiBaseUrl": "https://sua-vps.exemplo.com"
}
```

### Build

```bash
npx eas build --platform android
npx eas build --platform ios
```

### Porte para React Web

A camada `src/services/api.ts` e `src/hooks/useAuth.tsx` é pura — as telas estão isoladas em `src/screens/`. Para uma versão web, basta trocar `react-native` por `react-dom` nos componentes visuais, mantendo a lógica de serviços.

---

## 5. Deploy na VPS (Hostinger)

Passo a passo para uma VPS Ubuntu recém-criada:

```bash
# 1. Acesse a VPS
ssh root@seu-ip

# 2. Instale Docker
curl -fsSL https://get.docker.com | sh
apt install -y docker-compose-plugin

# 3. Clone o projeto
git clone https://github.com/sua-org/sistema-de-ping.git
cd sistema-de-ping

# 4. Configure variáveis
cp .env.example .env
nano .env    # ajuste JWT_SECRET e senhas
# copie seu firebase-credentials.json para a raiz

# 5. Suba tudo
docker compose up -d --build

# 6. Verifique
curl http://localhost:8000/healthz
```

Coloque um Nginx ou Caddy na frente para HTTPS (Let's Encrypt):

```nginx
server {
  server_name api.seudominio.com;
  location / {
    proxy_pass http://127.0.0.1:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

---

## 6. Rotas principais da API

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `POST` | `/api/auth/registrar` | — | Cria usuário |
| `POST` | `/api/auth/login` | — | JWT |
| `GET`  | `/api/condominios/` | JWT | Lista |
| `POST` | `/api/condominios/` | JWT | Cria (gera token do agente) |
| `GET`  | `/api/condominios/status` | JWT | Dashboard com contagem por status |
| `POST` | `/api/cameras/` | JWT | Cadastro manual |
| `POST` | `/api/cameras/importar-faixa` | JWT | Importa faixa de IP |
| `POST` | `/api/cameras/importar-planilha?condominio_id=` | JWT | Upload CSV/XLSX |
| `GET`  | `/api/agente/cameras` | Token condomínio | Agente baixa lista |
| `POST` | `/api/agente/evento` | Token condomínio | Agente reporta queda/retorno |
| `GET`  | `/api/historico/` | JWT | Histórico filtrado |
| `POST` | `/api/dispositivos/` | JWT | Registra token FCM |

## 7. Padrões e segurança

- Senhas com `bcrypt` via `passlib`.
- JWT com expiração configurável (`JWT_EXPIRE_MINUTES`).
- Agente autenticado por token único por condomínio (`X-Condominio-Token`).
- Comentários em PT-BR no código.
- CORS configurável via `CORS_ORIGINS`.
- Não commitar `firebase-credentials.json` nem `.env` (já estão no `.gitignore`).
