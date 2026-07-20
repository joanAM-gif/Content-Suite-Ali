import { useEffect, useState } from "react"
import { ChevronDown, Inbox, AlertCircle, RefreshCw, CheckCircle2, XCircle, History } from "lucide-react"
import { getPendingReviews, reviewItem, getReviewHistory, type PendingItem, type HistoryItem } from "@/lib/api"
import { useToast } from "@/components/Toaster"
import { Badge, Button, Card, Field, Spinner, Textarea } from "@/components/ui"
import { TopBar } from "@/components/TopBar"
import { cn } from "@/lib/utils"

const statusTone = {
  pendiente: "warning",
  aprobado: "success",
  rechazado: "danger",
} as const

export function AprobadorAView() {
  const { toast } = useToast()
  const [tab, setTab] = useState<"pendientes" | "bitacora">("pendientes")
  const [items, setItems] = useState<PendingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await getPendingReviews()
      setItems(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error inesperado"
      setError(msg)
      toast(msg, "error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleResolved(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id))
    if (expanded === id) setExpanded(null)
  }

  return (
    <div className="min-h-screen">
      <TopBar title="Aprobador A · Revisión de Contenido" />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Revisión de Contenido</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Aprueba o rechaza el contenido pendiente de revisión.
            </p>
          </div>
          {tab === "pendientes" && (
            <Button variant="outline" size="sm" onClick={load} loading={loading}>
              <RefreshCw className="size-3.5" aria-hidden />
              Actualizar
            </Button>
          )}
        </div>

        <div className="mb-6 inline-flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
          <button
            onClick={() => setTab("pendientes")}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === "pendientes" ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Inbox className="mr-1.5 inline size-3.5" aria-hidden />
            Pendientes
          </button>
          <button
            onClick={() => setTab("bitacora")}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === "bitacora" ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <History className="mr-1.5 inline size-3.5" aria-hidden />
            Bitácora
          </button>
        </div>

        {tab === "pendientes" && (
          <>
            {loading && (
              <Card className="flex items-center justify-center p-12">
                <Spinner label="Cargando contenido pendiente..." />
              </Card>
            )}

            {!loading && error && (
              <Card className="flex items-start gap-3 border-danger/30 p-5">
                <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
                <div>
                  <p className="text-sm font-medium text-foreground">No se pudo cargar la lista</p>
                  <p className="mt-1 text-sm text-muted-foreground">{error}</p>
                </div>
              </Card>
            )}

            {!loading && !error && items.length === 0 && (
              <Card className="flex flex-col items-center justify-center gap-2 p-12 text-center">
                <div className="flex size-11 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Inbox className="size-5" aria-hidden />
                </div>
                <p className="text-sm font-medium">Todo al día</p>
                <p className="text-sm text-muted-foreground">No hay contenido pendiente de revisión.</p>
              </Card>
            )}

            {!loading && !error && items.length > 0 && (
              <div className="flex flex-col gap-3">
                {items.map((item) => (
                  <ReviewCard
                    key={item.id}
                    item={item}
                    open={expanded === item.id}
                    onToggle={() => setExpanded((e) => (e === item.id ? null : item.id))}
                    onResolved={() => handleResolved(item.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {tab === "bitacora" && <HistoryPanel />}
      </main>
    </div>
  )
}

function HistoryPanel() {
  const { toast } = useToast()
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getReviewHistory()
      .then(setHistory)
      .catch((err) => {
        const msg = err instanceof Error ? err.message : "Error inesperado"
        setError(msg)
        toast(msg, "error")
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <Card className="flex items-center justify-center p-12">
        <Spinner label="Cargando bitácora..." />
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="flex items-start gap-3 border-danger/30 p-5">
        <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
        <div>
          <p className="text-sm font-medium text-foreground">No se pudo cargar la bitácora</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        </div>
      </Card>
    )
  }

  if (history.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center gap-2 p-12 text-center">
        <div className="flex size-11 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <History className="size-5" aria-hidden />
        </div>
        <p className="text-sm font-medium">Sin registros todavía</p>
        <p className="text-sm text-muted-foreground">Aquí aparecerá el historial completo de revisiones.</p>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {history.map((item) => (
        <Card key={item.id} className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{item.producto || "Sin producto"}</span>
              {item.tipoContenido && <Badge tone="accent">{item.tipoContenido}</Badge>}
              <Badge tone={statusTone[item.status as keyof typeof statusTone] ?? "accent"}>
                {item.status || "desconocido"}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">
              {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : "Sin revisar"}
            </span>
          </div>
          <p className="mt-2 line-clamp-2 text-pretty text-sm text-muted-foreground">{item.contenido}</p>
          {item.reviewerNote && (
            <p className="mt-2 rounded-md bg-muted/50 px-3 py-2 text-sm text-foreground">
              <span className="font-medium">Nota: </span>
              {item.reviewerNote}
            </p>
          )}
        </Card>
      ))}
    </div>
  )
}

function ReviewCard({
  item,
  open,
  onToggle,
  onResolved,
}: {
  item: PendingItem
  open: boolean
  onToggle: () => void
  onResolved: () => void
}) {
  const { toast } = useToast()
  const [nota, setNota] = useState("")
  const [pending, setPending] = useState<null | "approved" | "rejected">(null)

  async function resolve(status: "approved" | "rejected") {
    setPending(status)
    try {
      await reviewItem(item.id, status, nota)
      toast(
        status === "approved" ? "Contenido aprobado" : "Contenido rechazado",
        "success",
      )
      onResolved()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error inesperado"
      toast(msg, "error")
      setPending(null)
    }
  }

  const preview = item.contenido.length > 160 ? item.contenido.slice(0, 160) + "…" : item.contenido

  return (
    <Card className="overflow-hidden">
      <button
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-4 p-5 text-left outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">{item.producto || "Sin producto"}</span>
            {item.tipoContenido && <Badge tone="accent">{item.tipoContenido}</Badge>}
          </div>
          {!open && <p className="mt-1.5 text-pretty text-sm text-muted-foreground">{preview}</p>}
        </div>
        <ChevronDown
          className={cn("mt-1 size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open && (
        <div className="border-t border-border p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Contenido completo
          </p>
          <p className="mt-1.5 whitespace-pre-wrap text-pretty text-sm leading-relaxed text-foreground">
            {item.contenido || "Sin contenido."}
          </p>

          <div className="mt-4">
            <Field label="Nota (opcional)" htmlFor={`nota-${item.id}`}>
              <Textarea
                id={`nota-${item.id}`}
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Añade un comentario para el creador..."
                rows={2}
              />
            </Field>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="success"
              onClick={() => resolve("approved")}
              loading={pending === "approved"}
              disabled={pending !== null}
            >
              <CheckCircle2 className="size-4" aria-hidden />
              Aprobar
            </Button>
            <Button
              variant="danger"
              onClick={() => resolve("rejected")}
              loading={pending === "rejected"}
              disabled={pending !== null}
            >
              <XCircle className="size-4" aria-hidden />
              Rechazar
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}