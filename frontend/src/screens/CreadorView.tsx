import { useState } from "react"
import { BookMarked, Wand2 } from "lucide-react"
import { TopBar } from "@/components/TopBar"
import { cn } from "@/lib/utils"
import { BrandManualTab } from "@/screens/creador/BrandManualTab"
import { GenerateContentTab } from "@/screens/creador/GenerateContentTab"

type Tab = "manual" | "generar"

const tabs: { id: Tab; label: string; icon: typeof BookMarked }[] = [
  { id: "manual", label: "Manual de Marca", icon: BookMarked },
  { id: "generar", label: "Generar Contenido", icon: Wand2 },
]

export function CreadorView() {
  const [tab, setTab] = useState<Tab>("manual")

  return (
    <div className="min-h-screen">
      <TopBar title="Vista Creador" />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight">Espacio del Creador</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Define el manual de marca y genera contenido consistente con IA.
          </p>
        </div>

        <div className="mb-6 inline-flex rounded-lg border border-border bg-muted p-1">
          {tabs.map((t) => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="size-4" aria-hidden />
                {t.label}
              </button>
            )
          })}
        </div>

        {tab === "manual" ? <BrandManualTab /> : <GenerateContentTab />}
      </main>
    </div>
  )
}
