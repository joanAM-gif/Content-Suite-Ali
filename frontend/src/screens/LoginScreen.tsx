import { useState, type FormEvent } from "react"
import { LogIn, AlertCircle } from "lucide-react"
import { useRole } from "@/context/RoleContext"
import { login, ApiError } from "@/lib/api"
import { Button, Card, Field, Input } from "@/components/ui"

const DEMO_CREDENTIALS = [
  "creador@demo.com / demo1234",
  "aprobadora@demo.com / demo1234",
  "aprobadorb@demo.com / demo1234",
]

export function LoginScreen() {
  const { setUser } = useRole()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const user = await login(email.trim(), password)
      setUser(user)
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Ocurrió un error inesperado al iniciar sesión."
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 flex flex-col items-center text-center">
        <img src="/logo.png" alt="Content Suite" className="mb-4 size-24 rounded-xl object-contain" />
        <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          Content Suite
        </h1>
        <p className="mt-2 max-w-sm text-pretty text-sm text-muted-foreground">
          Inicia sesión para acceder a tu espacio de trabajo.
        </p>
      </div>

      <Card className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          <Field label="Email" htmlFor="login-email">
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="tucorreo@demo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </Field>

          <Field label="Contraseña" htmlFor="login-password">
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </Field>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md bg-danger-muted px-3 py-2 text-sm text-danger"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" loading={loading} className="mt-1 w-full">
            <LogIn className="size-4" aria-hidden />
            Ingresar
          </Button>
        </form>
      </Card>

      <div className="mt-6 flex flex-col items-center gap-1 text-center">
        <p className="text-xs font-medium text-muted-foreground">Credenciales de demostración</p>
        {DEMO_CREDENTIALS.map((c) => (
          <p key={c} className="font-mono text-xs text-muted-foreground/80">
            {c}
          </p>
        ))}
      </div>
    </div>
  )
}
