import { ForgotPasswordForm1 } from "./components/forgot-password-form-1"
import { AuthShell } from "@/app/auth/components/auth-shell"

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="Credential recovery"
      title="Reset access."
      description="Use your Cognito email and confirmation code to set a new password."
    >
      <ForgotPasswordForm1 />
    </AuthShell>
  )
}
