from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL


class Settings(BaseSettings):
    secure_cookies: bool = False
    app_name: str = "Anti-Spiral API"
    app_version: str = "0.1.0"
    database_user: str
    database_password: str
    database_host: str = "localhost"
    database_port: int = 5432
    database_name: str
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[1] / ".env",
        env_ignore_empty=True,
        extra="ignore",
    )

    @property
    def database_url(self) -> str:
        return URL.create(
            "postgresql+psycopg",
            username=self.database_user,
            password=self.database_password,
            host=self.database_host,
            port=self.database_port,
            database=self.database_name,
        ).render_as_string(hide_password=False)


settings = Settings()
