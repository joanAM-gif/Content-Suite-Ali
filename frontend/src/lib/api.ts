import type { Role } from "@/context/RoleContext"

export const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "")

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

/**
 * Extracts the most useful error message from a failed HTTP response.
 * Prefers the FastAPI-style `detail` field when present.
 */
async function parseError(res: Response): Promise<never> {
  let message = `Error ${res.status}`
  try {
    const data = await res.json()
    if (typeof data?.detail === "string") {
      message = data.detail
    } else if (Array.isArray(data?.detail) && data.detail.length) {
      // FastAPI validation errors arrive as an array of objects
      message = data.detail.map((d: any) => d?.msg ?? JSON.stringify(d)).join(", ")
    } else if (typeof data?.message === "string") {
      message = data.message
    } else if (typeof data === "string") {
      message = data
    }
  } catch {
    try {
      const text = await res.text()
      if (text) message = text
    } catch {
      /* ignore */
    }
  }
  throw new ApiError(message, res.status)
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, init)
  } catch {
    throw new ApiError(
      `No se pudo conectar con el backend en ${API_URL}. Verifica que el servidor esté activo.`,
      0,
    )
  }
  if (!res.ok) return parseError(res)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface BrandManual {
  tono: string
  publico: string
  prohibiciones: string[]
  mensajesClave: string[]
  resumen: string
  chunksIndexados: number
}

export interface BrandChunk {
  tipo: string
  contenido: string
  distancia: number | null
}

export interface GeneratedContent {
  contenido: string
  contexto: BrandChunk[]
}

export type ContentType = "descripcion" | "guion" | "prompt_imagen"

export interface PendingItem {
  id: string
  producto: string
  tipoContenido: string
  contenido: string
}

export interface ImageAudit {
  cumple: boolean
  razon: string
}

/* ------------------------------------------------------------------ */
/* Normalizers (tolerant to backend field-name variations)            */
/* ------------------------------------------------------------------ */

const asString = (v: unknown, fallback = ""): string =>
  v == null ? fallback : typeof v === "string" ? v : String(v)

const asStringArray = (v: unknown): string[] => {
  if (Array.isArray(v)) return v.map((x) => asString(x)).filter(Boolean)
  if (typeof v === "string" && v.trim()) return [v]
  return []
}

const pick = (obj: any, keys: string[]): unknown => {
  for (const k of keys) {
    if (obj != null && obj[k] != null) return obj[k]
  }
  return undefined
}

function normalizeBrand(raw: any): BrandManual {
  return {
    tono: asString(pick(raw, ["tono", "tone"])),
    publico: asString(pick(raw, ["publico", "publico_objetivo", "publicoObjetivo", "audience", "target"])),
    prohibiciones: asStringArray(pick(raw, ["prohibiciones", "prohibitions", "restricciones"])),
    mensajesClave: asStringArray(pick(raw, ["mensajes_clave", "mensajesClave", "key_messages", "mensajes"])),
    resumen: asString(pick(raw, ["resumen", "summary", "descripcion"])),
    chunksIndexados: Number(pick(raw, ["chunks_indexados", "chunksIndexados", "chunks", "num_chunks", "indexed_chunks"]) ?? 0),
  }
}

function normalizeChunk(raw: any): BrandChunk {
  const distancia = pick(raw, ["distancia", "distance", "score", "similitud"])
  return {
    tipo: asString(pick(raw, ["tipo", "type", "categoria"]), "chunk"),
    contenido: asString(pick(raw, ["contenido", "content", "texto", "text"])),
    distancia: distancia == null ? null : Number(distancia),
  }
}

function normalizeGenerated(raw: any): GeneratedContent {
  const contexto = pick(raw, ["contexto", "contexto_marca", "contextoMarca", "context", "chunks", "brand_context"])
  return {
    contenido: asString(pick(raw, ["contenido", "content", "resultado", "output", "text"])),
    contexto: Array.isArray(contexto) ? contexto.map(normalizeChunk) : [],
  }
}

function normalizePending(raw: any): PendingItem {
  return {
    id: asString(pick(raw, ["id", "_id", "uuid"])),
    producto: asString(pick(raw, ["producto", "product"])),
    tipoContenido: asString(pick(raw, ["tipo_contenido", "tipoContenido", "content_type", "tipo", "type"])),
    contenido: asString(pick(raw, ["contenido", "content", "texto", "text"])),
  }
}

function normalizeAudit(raw: any): ImageAudit {
  return {
    cumple: Boolean(pick(raw, ["cumple", "compliant", "aprobado", "ok", "pass"])),
    razon: asString(pick(raw, ["razon", "reason", "motivo", "explicacion", "detalle"])),
  }
}

/* ------------------------------------------------------------------ */
/* Endpoints                                                           */
/* ------------------------------------------------------------------ */

export interface AuthUser {
  email: string
  role: Role
}

/**
 * Maps the backend role identifiers to the app's internal Role union.
 * Accepts a few common variations to stay tolerant to the MVP backend.
 */
const ROLE_MAP: Record<string, Role> = {
  creador: "creador",
  aprobador_a: "aprobadorA",
  aprobadora: "aprobadorA",
  aprobador_b: "aprobadorB",
  aprobadorb: "aprobadorB",
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const raw = await request<any>("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  const rawRole = asString(pick(raw, ["role", "rol"])).toLowerCase()
  const role = ROLE_MAP[rawRole]
  if (!role) {
    throw new ApiError(`El servidor devolvió un rol desconocido: "${rawRole || "vacío"}".`, 200)
  }
  return { email: asString(pick(raw, ["email", "correo"]), email), role }
}

export async function createBrand(input: {
  producto: string
  tono: string
  publico: string
}): Promise<BrandManual> {
  const raw = await request<any>("/brand", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      producto: input.producto,
      tono: input.tono,
      publico: input.publico,
      publico_objetivo: input.publico,
    }),
  })
  return normalizeBrand(raw)
}

export async function generateContent(input: {
  producto: string
  tipo: ContentType
  brief: string
}): Promise<GeneratedContent> {
  const raw = await request<any>("/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      producto: input.producto,
      content_type: input.tipo,
      brief: input.brief,
    }),
  })
  return normalizeGenerated(raw)
}

export async function getPendingReviews(): Promise<PendingItem[]> {
  const raw = await request<any>("/review/pending")
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : []
  return list.map(normalizePending)
}

export async function reviewItem(
  id: string,
  status: "approved" | "rejected",
  nota: string,
): Promise<void> {
  const statusMap = { approved: "aprobado", rejected: "rechazado" } as const
  await request<void>(`/review/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: statusMap[status], reviewer_note: nota }),
  })
}

export async function auditImage(producto: string, image: File): Promise<ImageAudit> {
  const form = new FormData()
  form.append("producto", producto)
  form.append("image", image)
  const raw = await request<any>("/audit-image", {
    method: "POST",
    body: form,
  })
  return normalizeAudit(raw)
}

export interface HistoryItem {
  id: string
  producto: string
  tipoContenido: string
  contenido: string
  status: string
  reviewerNote: string | null
  updatedAt: string | null
}

function normalizeHistoryItem(raw: any): HistoryItem {
  return {
    id: asString(pick(raw, ["id", "_id", "uuid"])),
    producto: asString(pick(raw, ["producto", "product"])),
    tipoContenido: asString(pick(raw, ["tipo_contenido", "tipoContenido", "content_type", "tipo", "type"])),
    contenido: asString(pick(raw, ["contenido", "content", "texto", "text"])),
    status: asString(pick(raw, ["status", "estado"])),
    reviewerNote:
      pick(raw, ["reviewer_note", "reviewerNote"]) != null
        ? asString(pick(raw, ["reviewer_note", "reviewerNote"]))
        : null,
    updatedAt:
      pick(raw, ["updated_at", "updatedAt"]) != null ? asString(pick(raw, ["updated_at", "updatedAt"])) : null,
  }
}

export async function getReviewHistory(): Promise<HistoryItem[]> {
  const raw = await request<any>("/review/history")
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : []
  return list.map(normalizeHistoryItem)
}

export interface Metrics {
  totalGenerado: number
  pendiente: number
  aprobado: number
  rechazado: number
  totalAuditorias: number
  auditoriasCumple: number
  auditoriasNoCumple: number
}

export async function getMetrics(): Promise<Metrics> {
  const raw = await request<any>("/metrics")
  return {
    totalGenerado: Number(pick(raw, ["total_generado"]) ?? 0),
    pendiente: Number(pick(raw, ["pendiente"]) ?? 0),
    aprobado: Number(pick(raw, ["aprobado"]) ?? 0),
    rechazado: Number(pick(raw, ["rechazado"]) ?? 0),
    totalAuditorias: Number(pick(raw, ["total_auditorias"]) ?? 0),
    auditoriasCumple: Number(pick(raw, ["auditorias_cumple"]) ?? 0),
    auditoriasNoCumple: Number(pick(raw, ["auditorias_no_cumple"]) ?? 0),
  }
}

export async function getBrandManual(producto: string): Promise<BrandManual> {
  const raw = await request<any>(`/brand/${encodeURIComponent(producto)}`)
  return normalizeBrand(raw?.manual ?? raw)
}

export async function searchBrandProducts(q: string): Promise<string[]> {
  const query = q.trim()
  if (query.length < 2) return []
  const raw = await request<any>(`/brand/search?q=${encodeURIComponent(query)}`)
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : []
  return list.map((x: unknown) => asString(x)).filter(Boolean)
}

export async function downloadMetricsExcel(): Promise<void> {
  let res: Response
  try {
    res = await fetch(`${API_URL}/metrics/export`)
  } catch {
    throw new ApiError(
      `No se pudo conectar con el backend en ${API_URL}. Verifica que el servidor esté activo.`,
      0,
    )
  }
  if (!res.ok) {
    throw new ApiError(`No se pudo generar el archivo de métricas (error ${res.status}).`, res.status)
  }

  const blob = await res.blob()
  const url = window.URL.createObjectURL(blob)

  const disposition = res.headers.get("Content-Disposition") || ""
  const match = disposition.match(/filename="?([^"]+)"?/)
  const filename = match ? match[1] : "content-suite-metricas.xlsx"

  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}