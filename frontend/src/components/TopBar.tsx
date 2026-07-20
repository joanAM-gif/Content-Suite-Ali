import { RefreshCw } from "lucide-react"
import { useRole } from "@/context/RoleContext"
import { Badge, Button } from "@/components/ui"

const roleTone = {
  creador: "accent",
  aprobadorA: "success",
  aprobadorB: "warning",
} as const

export function TopBar({ title }: { title: string }) {
  const { roleInfo, clearRole } = useRole()

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
          <Button variant="outline" size="sm" onClick={clearRole}>
            <RefreshCw className="size-3.5" aria-hidden />
            Cambiar de rol
          </Button>
        </div>
      </div>
    </header>
  )
}
