import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { RefreshCw, BarChart3, X, Download, FileSpreadsheet, Image as ImageIcon } from "lucide-react"
import { useRole } from "@/context/RoleContext"
import { Badge, Button } from "@/components/ui"
import { getMetrics, downloadMetricsExcel, ApiError, type Metrics } from "@/lib/api"
import { cn } from "@/lib/utils"

const roleTone = {
  creador: "accent",
  aprobadorA: "success",
  aprobadorB: "warning",
} as const

/**
 * Ventana de métricas completas (extra sobre lo pedido en el reto).
 * Antes era un drawer lateral angosto con solo 2 tarjetas resumen; ahora
 * es una ventana modal centrada, más grande, pensada para mostrar toda la
 * información de un vistazo y ofrecer la exportación a Excel con el
 * detalle completo (ver GET /metrics/export en el backend).
 */
function MetricsModal({ onClose }: { onClose: () => void }) {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [visible, setVisible] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10)
    getMetrics()
      .then(setMetrics)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar las métricas."))
      .finally(() => setLoading(false))

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => {
      clearTimeout(t)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 200)
  }

  async function handleExport() {
    setExporting(true)
    setExportError(null)
    try {
      await downloadMetricsExcel()
    } catch (err) {
      setExportError(
        err instanceof ApiError ? err.message : "No se pudo generar el archivo. Intenta de nuevo.",
      )
    } finally {
      setExporting(false)
    }
  }

  const totalPiezas = metrics ? metrics.pendiente + metrics.aprobado + metrics.rechazado : 0
  const pct = (n: number) => (totalPiezas > 0 ? Math.round((n / totalPiezas) * 100) : 0)

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className={cn(
          "absolute inset-0 bg-black/50 transition-opacity duration-200",
          visible ? "opacity-100" : "opacity-0",
        )}
        onClick={handleClose}
      />
      <div
        className={cn(
          "relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-card shadow-2xl transition-all duration-200 ease-out",
          visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
        )}
      >
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h2 className="text-base font-semibold">Métricas completas</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Contenido generado y auditorías de imagen en toda la plataforma.
            </p>
          </div>
          <button onClick={handleClose} aria-label="Cerrar" className="text-muted-foreground hover:text-foreground">
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading && <p className="text-sm text-muted-foreground">Cargando métricas…</p>}
          {error && <p className="text-sm text-danger">{error}</p>}

          {metrics && (
            <div className="flex flex-col gap-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-border p-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <FileSpreadsheet className="size-3.5" aria-hidden />
                    Contenido generado
                  </div>
                  <p className="mt-1 text-3xl font-semibold">{metrics.totalGenerado}</p>
                  <div className="mt-3 flex flex-col gap-2">
                    <MetricBar label="Pendiente" value={metrics.pendiente} pct={pct(metrics.pendiente)} tone="warning" />
                    <MetricBar label="Aprobado" value={metrics.aprobado} pct={pct(metrics.aprobado)} tone="success" />
                    <MetricBar label="Rechazado" value={metrics.rechazado} pct={pct(metrics.rechazado)} tone="danger" />
                  </div>
                </div>

                <div className="rounded-lg border border-border p-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <ImageIcon className="size-3.5" aria-hidden />
                    Auditorías de imagen
                  </div>
                  <p className="mt-1 text-3xl font-semibold">{metrics.totalAuditorias}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge tone="success">Cumple: {metrics.auditoriasCumple}</Badge>
                    <Badge tone="danger">No cumple: {metrics.auditoriasNoCumple}</Badge>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-dashed border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Exportar reporte completo</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Descarga un Excel con este resumen, el detalle de cada pieza de contenido y el detalle de
                      cada auditoría de imagen.
                    </p>
                  </div>
                  <Button size="sm" onClick={handleExport} loading={exporting}>
                    <Download className="size-3.5" aria-hidden />
                    Exportar a Excel
                  </Button>
                </div>
                {exportError && <p className="mt-2 text-xs text-danger">{exportError}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

function MetricBar({
  label,
  value,
  pct,
  tone,
}: {
  label: string
  value: number
  pct: number
  tone: "warning" | "success" | "danger"
}) {
  const barColor = tone === "warning" ? "bg-warning" : tone === "success" ? "bg-success" : "bg-danger"
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {value} · {pct}%
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", barColor)} style={{ width: `${pct}%` }} />
      </div>
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