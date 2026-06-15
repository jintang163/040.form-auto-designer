from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    grpc_port: int = 50051
    http_host: str = "0.0.0.0"
    http_port: int = 8000

    model_dir: str = "./models"
    temp_dir: str = "./temp"
    upload_dir: str = "./uploads"

    redis_url: Optional[str] = "redis://localhost:6379/0"
    redis_enabled: bool = False

    ocr_lang: str = "ch"
    ocr_use_angle_cls: bool = True
    ocr_use_gpu: bool = False
    table_char_dict_path: Optional[str] = None
    table_model_dir: Optional[str] = None

    max_upload_size: int = 50 * 1024 * 1024

    log_level: str = "INFO"

    class Config:
        env_file = ".env"
        env_prefix = "APP_"


settings = Settings()
