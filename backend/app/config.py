"""Configuração da aplicação via variáveis de ambiente."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Banco de dados
    database_url: str = "postgresql+psycopg2://ping:ping@db:5432/ping"

    # JWT
    jwt_secret: str = "troque-este-segredo"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24

    # Firebase — use FIREBASE_CREDENTIALS_JSON (conteúdo do JSON) no Railway
    # ou FIREBASE_CREDENTIALS_PATH (caminho do arquivo) em ambiente com volume
    firebase_credentials_path: str = "/app/firebase-credentials.json"
    firebase_credentials_json: str = ""  # conteúdo JSON como string (Railway)

    # CORS
    cors_origins: str = "*"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)


settings = Settings()
