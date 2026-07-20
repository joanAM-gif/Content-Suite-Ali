"""Esquemas Pydantic compartidos por los routers."""
from typing import Literal, Optional

from pydantic import BaseModel  # type: ignore[import]


class BrandRequest(BaseModel):
    producto: str
    tono: str
    publico: str


class BrandManual(BaseModel):
    tono: str
    publico: str
    prohibiciones: list[str]
    mensajes_clave: list[str]
    resumen: str


class BrandResponse(BaseModel):
    producto: str
    manual: BrandManual
    chunks_indexados: int


class GenerateRequest(BaseModel):
    producto: str
    content_type: Literal["descripcion", "guion", "prompt_imagen"]
    brief: str
    top_k: int = 5


class ContextChunk(BaseModel):
    chunk_type: str
    content: str
    distance: float


class GenerateResponse(BaseModel):
    id: int
    producto: str
    content_type: str
    content: str
    context_used: list[ContextChunk]
    status: str


class ReviewUpdate(BaseModel):
    status: Literal["aprobado", "rechazado"]
    reviewer_note: Optional[str] = None


class ContentPieceOut(BaseModel):
    id: int
    product: str
    content_type: str
    content: str
    status: str
    reviewer_note: Optional[str] = None


class ImageAuditResponse(BaseModel):
    id: int
    producto: str
    cumple: bool
    razon: str


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    email: str
    role: Literal["creador", "aprobador_a", "aprobador_b"]