import { ForgotPasswordForm1 } from "./components/forgot-password-form-1"
import { AuthShell } from "@/app/auth/components/auth-shell"
import { useLanguage } from "@/lib/i18n"

export default function ForgotPasswordPage() {
  const { t } = useLanguage()

  return (
    <AuthShell
      eyebrow={t("auth.resetEyebrow")}
      title={t("auth.resetAccessTitle")}
      description={t("auth.resetAccessDescription")}
    >
      <ForgotPasswordForm1 />
    </AuthShell>
  )
}
