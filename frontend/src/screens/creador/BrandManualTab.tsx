import { useState, type FormEvent } from "react"
import { Ban, KeyRound, Database, FileText, AlertCircle } from "lucide-react"
import { createBrand, type BrandManual } from "@/lib/api"
import { useToast } from "@/components/Toaster"
import { Badge, Button, Card, Field, Input, Spinner } from "@/components/ui"

export function BrandManualTab() {
  const { toast } = useToast()
  const [producto, setProducto] = useState("")
  const [tono, setTono] = useState("")
  const [publico, setPublico] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [manual, setManual] = useState<BrandManual | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const result = await createBrand({ producto, tono, publico })
      setManual(result)
      toast("Manual de marca generado e indexado en el RAG", "success")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error inesperado"
      setError(msg)
      toast(msg, "error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
      <Card className="h-fit p-6">
        <h2 className="text-base font-semibold">Definir manual de marca</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          La IA construirá el manual y lo indexará en el RAG.
        </p>
        <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4">
          <Field label="Producto" htmlFor="bm-producto">
            <Input
              id="bm-producto"
              value={producto}
              onChange={(e) => setProducto(e.target.value)}
              placeholder="Ej. Zapatillas running EcoStride"
              required
            />
          </Field>
          <Field label="Tono deseado" htmlFor="bm-tono">
            <Input
              id="bm-tono"
              value={tono}
              onChange={(e) => setTono(e.target.value)}
              placeholder="Ej. Cercano, energético y profesional"
              required
            />
          </Field>
          <Field label="Público objetivo" htmlFor="bm-publico">
            <Input
              id="bm-publico"
              value={publico}
              onChange={(e) => setPublico(e.target.value)}
              placeholder="Ej. Corredores urbanos de 25 a 40 años"
              required
            />
          </Field>
          <Button type="submit" loading={loading} className="mt-1">
            {loading ? "Generando manual..." : "Generar manual"}
          </Button>
        </form>
      </Card>

      <div className="min-w-0">
        {loading && (
          <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
            <Spinner label="Generando manual e indexando contexto de marca..." />
            <p className="max-w-sm text-xs text-muted-foreground">
              Esto puede tardar unos segundos mientras se procesan e indexan los chunks en el RAG.
            </p>
          </Card>
        )}

        {!loading && error && (
          <Card className="flex items-start gap-3 border-danger/30 p-5">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
            <div>
              <p className="text-sm font-medium text-foreground">No se pudo generar el manual</p>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </div>
          </Card>
        )}

        {!loading && !error && !manual && (
          <Card className="flex flex-col items-center justify-center gap-2 p-12 text-center">
            <div className="flex size-11 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <FileText className="size-5" aria-hidden />
            </div>
            <p className="text-sm font-medium">Aún no hay manual</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              Completa el formulario para generar el manual de marca de tu producto.
            </p>
          </Card>
        )}

        {!loading && manual && <ManualResult manual={manual} />}
      </div>
    </div>
  )
}

function ManualResult({ manual }: { manual: BrandManual }) {
  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Manual de marca</h2>
          <p className="mt-1 text-sm text-muted-foreground">Contexto generado por la IA.</p>
        </div>
        <Badge tone="accent">
          <Database className="size-3" aria-hidden />
          {manual.chunksIndexados} chunks indexados en el RAG
        </Badge>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <InfoBlock label="Tono">{manual.tono || "—"}</InfoBlock>
        <InfoBlock label="Público objetivo">{manual.publico || "—"}</InfoBlock>
      </div>

      {manual.resumen && (
        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Resumen</p>
          <p className="mt-1.5 text-pretty text-sm leading-relaxed text-foreground">{manual.resumen}</p>
        </div>
      )}

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <ListBlock
          title="Prohibiciones"
          icon={<Ban className="size-4 text-danger" aria-hidden />}
          items={manual.prohibiciones}
          empty="Sin prohibiciones definidas"
          tone="danger"
        />
        <ListBlock
          title="Mensajes clave"
          icon={<KeyRound className="size-4 text-success" aria-hidden />}
          items={manual.mensajesClave}
          empty="Sin mensajes clave definidos"
          tone="success"
        />
      </div>
    </Card>
  )
}

function InfoBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-muted/50 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm text-foreground">{children}</p>
    </div>
  )
}

function ListBlock({
  title,
  icon,
  items,
  empty,
  tone,
}: {
  title: string
  icon: React.ReactNode
  items: string[]
  empty: string
  tone: "danger" | "success"
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5">
        {icon}
        <p className="text-sm font-medium">{title}</p>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-foreground">
              <span
                className={
                  tone === "danger"
                    ? "mt-1.5 size-1.5 shrink-0 rounded-full bg-danger"
                    : "mt-1.5 size-1.5 shrink-0 rounded-full bg-success"
                }
                aria-hidden
              />
              <span className="text-pretty">{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
