import { SignupForm1 } from "./components/signup-form-1"
import { AuthShell } from "@/app/auth/components/auth-shell"
import { useLanguage } from "@/lib/i18n"

export default function SignUpPage() {
  const { t } = useLanguage()

  return (
    <AuthShell
      eyebrow={t("auth.signUpEyebrow")}
      title={t("auth.signUpTitle")}
      description={t("auth.signUpDescription")}
    >
      <SignupForm1 />
    </AuthShell>
  )
}
