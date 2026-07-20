import { useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react"
import { UploadCloud, X, ImageIcon, ShieldCheck, ShieldAlert, AlertCircle } from "lucide-react"
import { auditImage, type ImageAudit } from "@/lib/api"
import { useToast } from "@/components/Toaster"
import { Button, Card, Field, Input, Spinner } from "@/components/ui"
import { TopBar } from "@/components/TopBar"
import { cn } from "@/lib/utils"

const ACCEPTED = ["image/jpeg", "image/png"]

export function AprobadorBView() {
  const { toast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [producto, setProducto] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ImageAudit | null>(null)

  function acceptFile(f: File | undefined) {
    if (!f) return
    if (!ACCEPTED.includes(f.type)) {
      toast("Formato no válido. Sube una imagen JPG o PNG.", "error")
      return
    }
    setFile(f)
    setResult(null)
    setError(null)
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result as string)
    reader.readAsDataURL(f)
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    acceptFile(e.dataTransfer.files?.[0])
  }

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    acceptFile(e.target.files?.[0])
  }

  function clearImage() {
    setFile(null)
    setPreview(null)
    setResult(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!file) {
      toast("Selecciona una imagen para auditar.", "error")
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await auditImage(producto, file)
      setResult(data)
      toast("Auditoría completada", "success")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error inesperado"
      setError(msg)
      toast(msg, "error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      <TopBar title="Aprobador B · Auditoría de Imagen" />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight">Auditoría de Imagen</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Verifica que una imagen cumpla con el manual de marca.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="h-fit p-6">
            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              <Field label="Producto" htmlFor="ab-producto">
                <Input
                  id="ab-producto"
                  value={producto}
                  onChange={(e) => setProducto(e.target.value)}
                  placeholder="Ej. Zapatillas running EcoStride"
                  required
                />
              </Field>

              <Field label="Imagen">
                {!preview ? (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault()
                      setDragging(true)
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                    onClick={() => inputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        inputRef.current?.click()
                      }
                    }}
                    className={cn(
                      "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      dragging ? "border-primary bg-accent/60" : "border-border hover:border-primary/50 hover:bg-muted/40",
                    )}
                  >
                    <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <UploadCloud className="size-5" aria-hidden />
                    </div>
                    <p className="text-sm font-medium">Arrastra una imagen o haz click</p>
                    <p className="text-xs text-muted-foreground">JPG o PNG</p>
                  </div>
                ) : (
                  <div className="relative overflow-hidden rounded-lg border border-border">
                    <img
                      src={preview || "/placeholder.svg"}
                      alt="Vista previa de la imagen a auditar"
                      className="max-h-72 w-full object-contain bg-muted"
                    />
                    <button
                      type="button"
                      onClick={clearImage}
                      className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-card/90 text-foreground shadow-sm outline-none transition-colors hover:bg-card focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Quitar imagen"
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                  </div>
                )}
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={onInputChange}
                  className="hidden"
                />
                {file && (
                  <p className="truncate text-xs text-muted-foreground">
                    {file.name} · {(file.size / 1024).toFixed(0)} KB
                  </p>
                )}
              </Field>

              <Button type="submit" loading={loading} disabled={!file}>
                {loading ? "Auditando..." : "Auditar imagen"}
              </Button>
            </form>
          </Card>

          <div className="min-w-0">
            {loading && (
              <Card className="flex items-center justify-center p-12">
                <Spinner label="Auditando imagen contra el manual de marca..." />
              </Card>
            )}

            {!loading && error && (
              <Card className="flex items-start gap-3 border-danger/30 p-5">
                <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
                <div>
                  <p className="text-sm font-medium text-foreground">No se pudo auditar la imagen</p>
                  <p className="mt-1 text-sm text-muted-foreground">{error}</p>
                </div>
              </Card>
            )}

            {!loading && !error && !result && (
              <Card className="flex h-full flex-col items-center justify-center gap-2 p-12 text-center">
                <div className="flex size-11 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <ImageIcon className="size-5" aria-hidden />
                </div>
                <p className="text-sm font-medium">Sin resultados</p>
                <p className="max-w-xs text-sm text-muted-foreground">
                  Sube una imagen y ejecuta la auditoría para ver si cumple con el manual de marca.
                </p>
              </Card>
            )}

            {!loading && result && <AuditResult result={result} />}
          </div>
        </div>
      </main>
    </div>
  )
}

function AuditResult({ result }: { result: ImageAudit }) {
  if (result.cumple) {
    return (
      <Card className="border-success/40 bg-success-muted/40 p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-full bg-success text-success-foreground">
            <ShieldCheck className="size-6" aria-hidden />
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">Cumple con el manual de marca</p>
            <p className="text-sm text-muted-foreground">La imagen es consistente con las directrices.</p>
          </div>
        </div>
        {result.razon && (
          <p className="mt-4 text-pretty text-sm leading-relaxed text-foreground">{result.razon}</p>
        )}
      </Card>
    )
  }

  return (
    <Card className="border-danger/40 bg-danger-muted/40 p-6">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-full bg-danger text-danger-foreground">
          <ShieldAlert className="size-6" aria-hidden />
        </div>
        <div>
          <p className="text-base font-semibold text-foreground">No cumple con el manual de marca</p>
          <p className="text-sm text-muted-foreground">Se detectaron inconsistencias.</p>
        </div>
      </div>
      <div className="mt-4 rounded-lg border border-danger/30 bg-card p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-danger">Razón</p>
        <p className="mt-1 text-pretty text-sm leading-relaxed text-foreground">
          {result.razon || "El backend no indicó una razón."}
        </p>
      </div>
    </Card>
  )
}
