import os
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


def _parse_cors_origins(value: str) -> list[str]:
    origins = [origin.strip() for origin in value.split(",") if origin.strip()]
    return ["*"] if "*" in origins else origins


@lru_cache
def get_settings() -> dict:
    return {
        "ollama_base_url": os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
        "ollama_model": os.getenv("OLLAMA_MODEL", "llama3.2"),
        "cors_origins": _parse_cors_origins(
            os.getenv("CORS_ORIGINS", "http://localhost:5173")
        ),
    }
