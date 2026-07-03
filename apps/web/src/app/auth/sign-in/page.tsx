import { LoginForm1 } from "./components/login-form-1"
import { AuthShell } from "@/app/auth/components/auth-shell"

export default function Page() {
  return (
    <AuthShell
      eyebrow="Workspace authentication"
      title="Welcome back."
      description="Sign in to continue processing or monitoring finance documents."
    >
      <LoginForm1 />
    </AuthShell>
  )
}
