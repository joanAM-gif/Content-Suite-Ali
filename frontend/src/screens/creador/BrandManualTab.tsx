import { useEffect, useRef, useState, type FormEvent } from "react"
import { Ban, KeyRound, Database, FileText, AlertCircle, Search } from "lucide-react"
import { createBrand, getBrandManual, searchBrandProducts, type BrandManual } from "@/lib/api"
import { useToast } from "@/components/Toaster"
import { Badge, Button, Card, Field, Input, Spinner } from "@/components/ui"

export function BrandManualTab() {
  const { toast } = useToast()
  const [producto, setProducto] = useState("")
  const [tono, setTono] = useState("")
  const [publico, setPublico] = useState("")
  const [buscarProducto, setBuscarProducto] = useState("")
  const [loading, setLoading] = useState(false)
  const [buscando, setBuscando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [manual, setManual] = useState<BrandManual | null>(null)

  // Extra: autocomplete del buscador — sugiere productos ya indexados que
  // coincidan parcialmente con lo escrito, en vez de exigir el nombre
  // exacto (ver GET /brand/search en el backend).
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestLoading, setSuggestLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchBoxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = buscarProducto.trim()
    if (q.length < 2) {
      setSuggestions([])
      return
    }
    setSuggestLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchBrandProducts(q)
        setSuggestions(results)
        setShowSuggestions(true)
      } catch {
        setSuggestions([])
      } finally {
        setSuggestLoading(false)
      }
    }, 250)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [buscarProducto])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

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

 async function buscarManual(nombreProducto: string) {
    if (!nombreProducto.trim()) return
    setShowSuggestions(false)
    setBuscando(true)
    setError(null)
    try {
      const result = await getBrandManual(nombreProducto.trim())
      setManual(result)
      toast("Manual de marca encontrado", "success")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error inesperado"
      setError(msg)
      toast(msg, "error")
    } finally {
      setBuscando(false)
    }
  }

  async function onBuscar(e: FormEvent) {
    e.preventDefault()
    await buscarManual(buscarProducto)
  }

  function onSelectSuggestion(nombre: string) {
    setBuscarProducto(nombre)
    buscarManual(nombre)
  }

  const loadingAny = loading || buscando

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
      <div className="flex flex-col gap-6">
        <Card className="p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Search className="size-4 text-muted-foreground" aria-hidden />
            Consultar manual existente
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Busca el manual ya generado e indexado para un producto.
          </p>
          <form onSubmit={onBuscar} className="mt-4 flex gap-2">
            <div ref={searchBoxRef} className="relative flex-1">
              <Input
                value={buscarProducto}
                onChange={(e) => setBuscarProducto(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="Ej. Barra de cereal NutriMax"
                aria-label="Producto a consultar"
                autoComplete="off"
              />
              {showSuggestions && (suggestions.length > 0 || suggestLoading) && (
                <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
                  {suggestLoading && suggestions.length === 0 && (
                    <p className="px-3 py-2 text-xs text-muted-foreground">Buscando…</p>
                  )}
                  {suggestions.map((nombre) => (
                    <button
                      key={nombre}
                      type="button"
                      onClick={() => onSelectSuggestion(nombre)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      <Search className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="truncate">{nombre}</span>
                    </button>
                  ))}
                  {!suggestLoading && suggestions.length === 0 && (
                    <p className="px-3 py-2 text-xs text-muted-foreground">
                      Sin coincidencias entre los manuales ya indexados.
                    </p>
                  )}
                </div>
              )}
            </div>
            <Button type="submit" variant="outline" loading={buscando} disabled={loadingAny && !buscando}>
              Buscar
            </Button>
          </form>
        </Card>

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
            <Button type="submit" loading={loading} className="mt-1" disabled={loadingAny && !loading}>
              {loading ? "Generando manual..." : "Generar manual"}
            </Button>
          </form>
        </Card>
      </div>

      <div className="min-w-0">
        {loadingAny && (
          <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
            <Spinner
              label={
                buscando
                  ? "Buscando manual indexado..."
                  : "Generando manual e indexando contexto de marca..."
              }
            />
            {loading && (
              <p className="max-w-sm text-xs text-muted-foreground">
                Esto puede tardar unos segundos mientras se procesan e indexan los chunks en el RAG.
              </p>
            )}
          </Card>
        )}

        {!loadingAny && error && (
          <Card className="flex items-start gap-3 border-danger/30 p-5">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
            <div>
              <p className="text-sm font-medium text-foreground">No se pudo completar la operación</p>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </div>
          </Card>
        )}

        {!loadingAny && !error && !manual && (
          <Card className="flex flex-col items-center justify-center gap-2 p-12 text-center">
            <div className="flex size-11 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <FileText className="size-5" aria-hidden />
            </div>
            <p className="text-sm font-medium">Aún no hay manual</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              Genera uno nuevo o busca uno existente por nombre de producto.
            </p>
          </Card>
        )}

        {!loadingAny && manual && <ManualResult manual={manual} />}
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