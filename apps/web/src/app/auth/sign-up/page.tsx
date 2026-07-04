import { SignupForm1 } from "./components/signup-form-1"
import { AuthShell } from "@/app/auth/components/auth-shell"

export default function SignUpPage() {
  return (
    <AuthShell
      eyebrow="Workspace onboarding"
      title="Create access."
      description="Create a finance workspace account, then confirm the Cognito code sent to your email."
    >
      <SignupForm1 />
    </AuthShell>
  )
}
