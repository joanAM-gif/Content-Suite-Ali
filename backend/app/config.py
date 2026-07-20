"""
Configuracion centralizada del backend.

Todas las credenciales viven en variables de entorno (.env en local,
"Environment Variables" en Render al desplegar). Nunca se hardcodean
API keys en el codigo: eso es lo primero que se revisa en una entrevista
tecnica sobre buenas practicas.
"""
import importlib
import importlib.util
import os

load_dotenv = None
if importlib.util.find_spec("dotenv") is not None:
    load_dotenv = importlib.import_module("dotenv").load_dotenv
    load_dotenv()


class Settings:
    # Supabase Postgres (incluye pgvector)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    print("DATABASE_URL", DATABASE_URL)
    # Groq Cloud - generacion de texto (Modulos I y II)
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

    # Google AI Studio - embeddings (Modulos I/II) y vision (Modulo III)
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
    EMBEDDING_MODEL: str = "models/gemini-embedding-001"
    EMBEDDING_DIM: int = 768
    VISION_MODEL: str = "gemini-3.5-flash"

    # Langfuse - observabilidad (Modulo IV)
    LANGFUSE_PUBLIC_KEY: str = os.getenv("LANGFUSE_PUBLIC_KEY", "")
    LANGFUSE_SECRET_KEY: str = os.getenv("LANGFUSE_SECRET_KEY", "")
    LANGFUSE_HOST: str = os.getenv("LANGFUSE_HOST", "https://cloud.langfuse.com")


settings = Settings()
