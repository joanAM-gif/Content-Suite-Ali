/**
 * Cliente tipado del backend de Content Suite.
 *
 * Pega este archivo dentro del proyecto que genere v0.dev o Bolt.new
 * (normalmente en `lib/api.ts` o `src/lib/api.ts`) y usa estas funciones
 * en vez de que el componente generado invente su propio `fetch`. Los
 * tipos aqui reflejan exactamente los esquemas Pydantic del backend
 * (`backend/app/schemas.py`), asi que si compila contra estos tipos,
 * la integracion con la API real esta garantizada.
 */

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      /* la respuesta no era JSON, se usa statusText */
    }
    throw new ApiError(res.status, detail);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------
// Modulo I: Brand DNA Architect
// ---------------------------------------------------------------------

export interface BrandRequest {
  producto: string;
  tono: string;
  publico: string;
}

export interface BrandManual {
  tono: string;
  publico: string;
  prohibiciones: string[];
  mensajes_clave: string[];
  resumen: string;
}

export interface BrandResponse {
  producto: string;
  manual: BrandManual;
  chunks_indexados: number;
}

export async function createBrandManual(payload: BrandRequest): Promise<BrandResponse> {
  const res = await fetch(`${API_URL}/brand`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse<BrandResponse>(res);
}

// ---------------------------------------------------------------------
// Modulo II: Creative Engine
// ---------------------------------------------------------------------

export type ContentType = "descripcion" | "guion" | "prompt_imagen";

export interface GenerateRequest {
  producto: string;
  content_type: ContentType;
  brief: string;
  top_k?: number;
}

export interface ContextChunk {
  chunk_type: string;
  content: string;
  distance: number;
}

export interface GenerateResponse {
  id: number;
  producto: string;
  content_type: string;
  content: string;
  context_used: ContextChunk[];
  status: string;
}

export async function generateContent(payload: GenerateRequest): Promise<GenerateResponse> {
  const res = await fetch(`${API_URL}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ top_k: 5, ...payload }),
  });
  return handleResponse<GenerateResponse>(res);
}

// ---------------------------------------------------------------------
// Modulo III: Governance & Multimodal Audit
// ---------------------------------------------------------------------

export interface ContentPiece {
  id: number;
  product: string;
  content_type: string;
  content: string;
  status: string;
  reviewer_note?: string | null;
}

export async function listPendingReviews(): Promise<ContentPiece[]> {
  const res = await fetch(`${API_URL}/review/pending`);
  return handleResponse<ContentPiece[]>(res);
}

export interface ReviewUpdate {
  status: "aprobado" | "rechazado";
  reviewer_note?: string;
}

export async function reviewContentPiece(id: number, payload: ReviewUpdate): Promise<ContentPiece> {
  const res = await fetch(`${API_URL}/review/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse<ContentPiece>(res);
}

export interface ImageAuditResponse {
  id: number;
  producto: string;
  cumple: boolean;
  razon: string;
}

export async function auditImage(producto: string, image: File): Promise<ImageAuditResponse> {
  const formData = new FormData();
  formData.append("producto", producto);
  formData.append("image", image);

  const res = await fetch(`${API_URL}/audit-image`, {
    method: "POST",
    body: formData,
  });
  return handleResponse<ImageAuditResponse>(res);
}

// ---------------------------------------------------------------------
// Infra
// ---------------------------------------------------------------------

export async function checkHealth(): Promise<{ status: string }> {
  const res = await fetch(`${API_URL}/health`);
  return handleResponse<{ status: string }>(res);
}

// ---------------------------------------------------------------------
// Usuarios de demo (auth client-side, sin backend real todavia)
// ---------------------------------------------------------------------

export type Role = "creador" | "aprobador_a" | "aprobador_b";

export const DEMO_USERS: { email: string; role: Role; label: string }[] = [
  { email: "creador@demo.com", role: "creador", label: "Creador" },
  { email: "aprobadora@demo.com", role: "aprobador_a", label: "Aprobador A" },
  { email: "aprobadorb@demo.com", role: "aprobador_b", label: "Aprobador B" },
];
