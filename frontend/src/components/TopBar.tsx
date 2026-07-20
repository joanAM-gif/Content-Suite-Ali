import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { RefreshCw, BarChart3, X } from "lucide-react"
import { useRole } from "@/context/RoleContext"
import { Badge, Button } from "@/components/ui"
import { getMetrics, ApiError, type Metrics } from "@/lib/api"
import { cn } from "@/lib/utils"

const roleTone = {
  creador: "accent",
  aprobadorA: "success",
  aprobadorB: "warning",
} as const

function MetricsDrawer({ onClose }: { onClose: () => void }) {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10)
    getMetrics()
      .then(setMetrics)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar las métricas."))
      .finally(() => setLoading(false))
    return () => clearTimeout(t)
  }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 200)
  }

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        className={cn(
          "absolute inset-0 bg-black/40 transition-opacity duration-200",
          visible ? "opacity-100" : "opacity-0",
        )}
        onClick={handleClose}
      />
      <div
        className={cn(
          "absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-card shadow-xl transition-transform duration-200 ease-out",
          visible ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-base font-semibold">Métricas</h2>
          <button onClick={handleClose} aria-label="Cerrar" className="text-muted-foreground hover:text-foreground">
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading && <p className="text-sm text-muted-foreground">Cargando…</p>}
          {error && <p className="text-sm text-danger">{error}</p>}
          {metrics && (
            <div className="flex flex-col gap-4">
              <div className="rounded-lg border border-border p-4">
                <p className="text-xs font-medium text-muted-foreground">Contenido generado</p>
                <p className="mt-1 text-2xl font-semibold">{metrics.totalGenerado}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone="warning">Pendiente: {metrics.pendiente}</Badge>
                  <Badge tone="success">Aprobado: {metrics.aprobado}</Badge>
                  <Badge tone="danger">Rechazado: {metrics.rechazado}</Badge>
                </div>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-xs font-medium text-muted-foreground">Auditorías de imagen</p>
                <p className="mt-1 text-2xl font-semibold">{metrics.totalAuditorias}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone="success">Cumple: {metrics.auditoriasCumple}</Badge>
                  <Badge tone="danger">No cumple: {metrics.auditoriasNoCumple}</Badge>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

export function TopBar({ title }: { title: string }) {
  const { roleInfo, clearRole } = useRole()
  const [showMetrics, setShowMetrics] = useState(false)

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Content Suite" className="size-8 rounded-md object-contain" />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold">Content Suite</span>
            <span className="hidden text-xs text-muted-foreground sm:block">{title}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {roleInfo && (
            <div className="hidden items-center gap-2 sm:flex">
              <Badge tone={roleTone[roleInfo.id]}>{roleInfo.label}</Badge>
              <span className="text-xs text-muted-foreground">{roleInfo.email}</span>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowMetrics(true)}>
            <BarChart3 className="size-3.5" aria-hidden />
            Métricas
          </Button>
          <Button variant="outline" size="sm" onClick={clearRole}>
            <RefreshCw className="size-3.5" aria-hidden />
            Cambiar de rol
          </Button>
        </div>
      </div>

      {showMetrics && <MetricsDrawer onClose={() => setShowMetrics(false)} />}
    </header>
  )
}