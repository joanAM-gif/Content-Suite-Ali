import { createContext, useCallback, useContext, useState, type ReactNode } from "react"
import { CheckCircle2, X, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

type ToastKind = "success" | "error"

interface Toast {
  id: number
  kind: ToastKind
  message: string
}

interface ToastContextValue {
  toast: (message: string, kind?: ToastKind) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

let counter = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const toast = useCallback(
    (message: string, kind: ToastKind = "success") => {
      const id = ++counter
      setToasts((t) => [...t, { id, kind, message }])
      window.setTimeout(() => remove(id), 5000)
    },
    [remove],
  )

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-lg border bg-card p-3 shadow-lg shadow-black/5 animate-in",
              t.kind === "success" ? "border-success/30" : "border-danger/30",
            )}
          >
            {t.kind === "success" ? (
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
            ) : (
              <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
            )}
            <p className="flex-1 text-sm text-foreground">{t.message}</p>
            <button
              onClick={() => remove(t.id)}
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Cerrar notificación"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within a ToastProvider")
  return ctx
}
