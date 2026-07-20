import { RoleProvider, useRole } from "@/context/RoleContext"
import { ToastProvider } from "@/components/Toaster"
import { LoginScreen } from "@/screens/LoginScreen"
import { CreadorView } from "@/screens/CreadorView"
import { AprobadorAView } from "@/screens/AprobadorAView"
import { AprobadorBView } from "@/screens/AprobadorBView"

function Router() {
  const { user, role } = useRole()

  if (!user) return <LoginScreen />

  switch (role) {
    case "creador":
      return <CreadorView />
    case "aprobadorA":
      return <AprobadorAView />
    case "aprobadorB":
      return <AprobadorBView />
    default:
      return <LoginScreen />
  }
}

export default function App() {
  return (
    <RoleProvider>
      <ToastProvider>
        <Router />
      </ToastProvider>
    </RoleProvider>
  )
}
