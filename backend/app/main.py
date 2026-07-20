from fastapi import FastAPI  # type: ignore[reportMissingImports]
from fastapi.middleware.cors import CORSMiddleware  # type: ignore[reportMissingImports]
from langfuse import get_client  # type: ignore[reportMissingImports]

from app.routers import auth, brand, generate, governance

app = FastAPI(
    title="Content Suite API",
    description="Backend del Reto Tecnico Content Suite (Alicorp) - Modulos I, II, III y IV implementados.",
    version="0.4.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(brand.router)
app.include_router(generate.router)
app.include_router(governance.router)


@app.get("/health", tags=["Infra"])
def health() -> dict:
    return {"status": "ok"}


@app.on_event("shutdown")
def flush_langfuse() -> None:
    """Asegura que las trazas pendientes se envien a Langfuse antes de apagar."""
    get_client().flush()
