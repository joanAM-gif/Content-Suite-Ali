import { createContext, useContext, useState, type ReactNode } from "react"

export type Role = "creador" | "aprobadorA" | "aprobadorB"

export interface AuthUser {
  email: string
  role: Role
}

const STORAGE_KEY = "content-suite-user"

function readStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AuthUser
    if (parsed && typeof parsed.email === "string" && parsed.role) return parsed
  } catch {
    /* ignore malformed storage */
  }
  return null
}

export interface RoleInfo {
  id: Role
  label: string
  email: string
  description: string
}

export const ROLES: RoleInfo[] = [
  {
    id: "creador",
    label: "Creador",
    email: "creador@demo.com",
    description: "Define el manual de marca y genera contenido asistido por IA.",
  },
  {
    id: "aprobadorA",
    label: "Aprobador A",
    email: "aprobadora@demo.com",
    description: "Revisa y aprueba o rechaza el contenido generado.",
  },
  {
    id: "aprobadorB",
    label: "Aprobador B",
    email: "aprobadorb@demo.com",
    description: "Audita imágenes contra el manual de marca.",
  },
]

interface RoleContextValue {
  user: AuthUser | null
  role: Role | null
  roleInfo: RoleInfo | null
  /** Persists the authenticated user (called after a successful login). */
  setUser: (user: AuthUser) => void
  /** Logs out: clears user state, removes localStorage, returns to login. */
  clearRole: () => void
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined)

export function RoleProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(() => readStoredUser())
  const role = user?.role ?? null

  const value: RoleContextValue = {
    user,
    role,
    roleInfo: role ? ROLES.find((r) => r.id === role) ?? null : null,
    setUser: (u) => {
      setUserState(u)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(u))
      } catch {
        /* ignore storage write failures */
      }
    },
    clearRole: () => {
      setUserState(null)
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {
        /* ignore */
      }
    },
  }

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRole() {
  const ctx = useContext(RoleContext)
  if (!ctx) throw new Error("useRole must be used within a RoleProvider")
  return ctx
}
