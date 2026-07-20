import { useEffect, useState } from "react"
import { RefreshCw, BarChart3, X } from "lucide-react"
import { useRole } from "@/context/RoleContext"
import { Badge, Button, Card } from "@/components/ui"
import { getMetrics, ApiError, type Metrics } from "@/lib/api"

const roleTone = {
  creador: "accent",
  aprobadorA: "success",
  aprobadorB: "warning",
} as const

function MetricsModal({ onClose }: { onClose: () => void }) {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMetrics()
      .then(setMetrics)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar las métricas."))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <Card className="w-full max-w-lg">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-base font-semibold">Métricas</h2>
          <button onClick={onClose} aria-label="Cerrar" className="text-muted-foreground hover:text-foreground">
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <div className="p-4">
          {loading && <p className="text-sm text-muted-foreground">Cargando…</p>}
          {error && <p className="text-sm text-danger">{error}</p>}
          {metrics && (
            <div className="grid grid-cols-2 gap-4">
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
      </Card>
    </div>
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

      {showMetrics && <MetricsModal onClose={() => setShowMetrics(false)} />}
    </header>
  )
}