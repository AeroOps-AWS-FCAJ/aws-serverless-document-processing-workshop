import { LoginForm1 } from "./components/login-form-1"
import { AuthShell } from "@/app/auth/components/auth-shell"
import { useLanguage } from "@/lib/i18n"

export default function Page() {
  const { t } = useLanguage()

  return (
    <AuthShell
      eyebrow={t("auth.signInEyebrow")}
      title={t("auth.signInTitle")}
      description={t("auth.signInDescription")}
    >
      <LoginForm1 />
    </AuthShell>
  )
}
