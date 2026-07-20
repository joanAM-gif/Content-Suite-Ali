import { Sparkles, PenLine, CheckCircle2, ImageIcon, ArrowRight } from "lucide-react"
import { ROLES, useRole, type Role } from "@/context/RoleContext"
import { Card } from "@/components/ui"

const roleIcon: Record<Role, typeof PenLine> = {
  creador: PenLine,
  aprobadorA: CheckCircle2,
  aprobadorB: ImageIcon,
}

export function RoleSelect() {
  const { setRole } = useRole()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="mb-10 flex flex-col items-center text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Sparkles className="size-6" aria-hidden />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          Content Suite
        </h1>
        <p className="mt-2 max-w-md text-pretty text-sm text-muted-foreground">
          Herramienta interna de marketing con IA para lanzar productos manteniendo la
          consistencia de tu marca. Elige un rol para comenzar.
        </p>
      </div>

      <div className="grid w-full max-w-4xl gap-4 sm:grid-cols-3">
        {ROLES.map((r) => {
          const Icon = roleIcon[r.id]
          return (
            <Card key={r.id} className="group overflow-hidden transition-colors hover:border-primary/50">
              <button
                onClick={() => setRole(r.id)}
                className="flex h-full w-full flex-col items-start gap-4 p-6 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex size-11 items-center justify-center rounded-lg bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="size-5" aria-hidden />
                </div>
                <div className="flex-1">
                  <h2 className="text-base font-semibold">{r.label}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>
                </div>
                <div className="flex w-full items-center justify-between border-t border-border pt-3">
                  <span className="font-mono text-xs text-muted-foreground">{r.email}</span>
                  <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden />
                </div>
              </button>
            </Card>
          )
        })}
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        Acceso de demostración · sin autenticación real
      </p>
    </div>
  )
}
