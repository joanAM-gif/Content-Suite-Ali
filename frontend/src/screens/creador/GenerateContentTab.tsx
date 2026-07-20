import { useState, type FormEvent } from "react"
import { ChevronDown, Layers, AlertCircle, Wand2, Copy, Check } from "lucide-react"
import { generateContent, type ContentType, type GeneratedContent } from "@/lib/api"
import { useToast } from "@/components/Toaster"
import { Badge, Button, Card, Field, Input, Select, Spinner, Textarea } from "@/components/ui"
import { cn } from "@/lib/utils"

const contentTypes: { value: ContentType; label: string }[] = [
  { value: "descripcion", label: "Descripción" },
  { value: "guion", label: "Guion" },
  { value: "prompt_imagen", label: "Prompt de imagen" },
]

export function GenerateContentTab() {
  const { toast } = useToast()
  const [producto, setProducto] = useState("")
  const [tipo, setTipo] = useState<ContentType>("descripcion")
  const [brief, setBrief] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GeneratedContent | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const data = await generateContent({ producto, tipo, brief })
      setResult(data)
      toast("Contenido generado correctamente", "success")
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
        <h2 className="text-base font-semibold">Generar contenido</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          La IA usará el contexto de marca indexado en el RAG.
        </p>
        <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4">
          <Field label="Producto" htmlFor="gc-producto">
            <Input
              id="gc-producto"
              value={producto}
              onChange={(e) => setProducto(e.target.value)}
              placeholder="Ej. Zapatillas running EcoStride"
              required
            />
          </Field>
          <Field label="Tipo de contenido" htmlFor="gc-tipo">
            <Select id="gc-tipo" value={tipo} onChange={(e) => setTipo(e.target.value as ContentType)}>
              {contentTypes.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Brief" htmlFor="gc-brief">
            <Textarea
              id="gc-brief"
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="Describe qué quieres comunicar, el canal, la longitud aproximada..."
              rows={5}
              required
            />
          </Field>
          <Button type="submit" loading={loading} className="mt-1">
            {loading ? "Generando..." : "Generar"}
          </Button>
        </form>
      </Card>

      <div className="min-w-0">
        {loading && (
          <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
            <Spinner label="Generando contenido con contexto de marca..." />
          </Card>
        )}

        {!loading && error && (
          <Card className="flex items-start gap-3 border-danger/30 p-5">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
            <div>
              <p className="text-sm font-medium text-foreground">No se pudo generar el contenido</p>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </div>
          </Card>
        )}

        {!loading && !error && !result && (
          <Card className="flex flex-col items-center justify-center gap-2 p-12 text-center">
            <div className="flex size-11 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Wand2 className="size-5" aria-hidden />
            </div>
            <p className="text-sm font-medium">Sin contenido todavía</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              Completa el brief y genera contenido alineado con tu marca.
            </p>
          </Card>
        )}

        {!loading && result && <GeneratedResult result={result} />}
      </div>
    </div>
  )
}

function GeneratedResult({ result }: { result: GeneratedContent }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(result.contenido)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border p-5">
        <h2 className="text-base font-semibold">Contenido generado</h2>
        <Button variant="outline" size="sm" onClick={copy}>
          {copied ? <Check className="size-3.5 text-success" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
          {copied ? "Copiado" : "Copiar"}
        </Button>
      </div>

      <div className="p-5">
        <p className="whitespace-pre-wrap text-pretty text-sm leading-relaxed text-foreground">
          {result.contenido || "El backend no devolvió contenido."}
        </p>
      </div>

      <div className="border-t border-border">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between px-5 py-3 text-left outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          aria-expanded={open}
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <Layers className="size-4 text-muted-foreground" aria-hidden />
            Contexto de marca usado
            <Badge tone="neutral">{result.contexto.length}</Badge>
          </span>
          <ChevronDown
            className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")}
            aria-hidden
          />
        </button>

        {open && (
          <div className="flex flex-col gap-3 px-5 pb-5">
            {result.contexto.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No se recuperaron chunks de contexto para esta generación.
              </p>
            ) : (
              result.contexto.map((chunk, i) => (
                <div key={i} className="rounded-lg border border-border bg-muted/40 p-3">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <Badge tone="accent">{chunk.tipo}</Badge>
                    {chunk.distancia != null && (
                      <span className="font-mono text-xs text-muted-foreground">
                        distancia: {chunk.distancia.toFixed(4)}
                      </span>
                    )}
                  </div>
                  <p className="text-pretty text-sm leading-relaxed text-foreground">{chunk.contenido}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
