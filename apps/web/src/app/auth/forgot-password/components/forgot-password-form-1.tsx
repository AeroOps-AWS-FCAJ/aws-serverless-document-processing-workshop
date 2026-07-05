"use client"

import { useState } from "react"
import { Link } from "react-router-dom"
import { confirmResetPassword, resetPassword } from "aws-amplify/auth"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { toast } from "sonner"
import { useLanguage } from "@/lib/i18n"

type ResetStep = "request" | "confirm" | "complete"

const authCardClass = "border-[#29483b] bg-[#10261d] text-white shadow-[0_24px_80px_rgba(16,38,29,.34)]"
const authHeaderClass = "border-b border-white/10 bg-[#0d2119] text-left"
const authTitleClass = "text-lg text-white"
const authDescriptionClass = "text-white/65"
const authInputClass = "!border-[#6f8a7b] !bg-[#071710] !text-white placeholder:!text-[#a5b4ab] focus-visible:!border-[#d8ff72] focus-visible:!ring-[#d8ff72]/25"
const authLabelClass = "text-white/85"
const authSecondaryTextClass = "text-white/65"
const authLinkClass = "font-medium text-[#d8ff72] underline underline-offset-4 hover:text-[#f0ffb8]"
const authPrimaryButtonClass = "w-full cursor-pointer !bg-[#d8ff72] font-semibold !text-[#10261d] shadow-[0_10px_28px_rgba(216,255,114,.22)] hover:!bg-[#cfff4f]"
const authOutlineButtonClass = "w-full cursor-pointer border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-[#d8ff72]"

export function ForgotPasswordForm1({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { t } = useLanguage()
  const [step, setStep] = useState<ResetStep>("request")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleRequestCode = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!email.trim()) {
      toast.error(t("auth.emailRequired"))
      return
    }

    setIsLoading(true)
    try {
      await resetPassword({ username: email.trim() })
      setStep("confirm")
      toast.success(t("auth.resetCodeSent"))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("auth.resetCodeFailed"))
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmReset = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!code.trim()) {
      toast.error(t("auth.confirmCodeRequired"))
      return
    }
    if (newPassword.length < 6) {
      toast.error(t("auth.resetPasswordMin"))
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error(t("auth.passwordMismatch"))
      return
    }

    setIsLoading(true)
    try {
      await confirmResetPassword({
        username: email.trim(),
        confirmationCode: code.trim(),
        newPassword,
      })
      setStep("complete")
      toast.success(t("auth.passwordUpdated"))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("auth.resetConfirmFailed"))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className={authCardClass}>
        <CardHeader className={authHeaderClass}>
          <CardTitle className={authTitleClass}>
            {step === "complete" ? t("auth.resetCompleteTitle") : t("auth.resetTitle")}
          </CardTitle>
          <CardDescription className={authDescriptionClass}>
            {step === "request"
              ? t("auth.resetRequestDescription")
              : step === "confirm"
                ? t("auth.resetConfirmDescription", { email })
                : t("auth.resetCompleteDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "request" && (
          <form onSubmit={handleRequestCode}>
            <div className="grid gap-6 mt-4">
              <div className="grid gap-6">
                <div className="grid gap-3">
                  <Label htmlFor="email" className={authLabelClass}>{t("auth.email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="youremail@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className={authInputClass}
                    disabled={isLoading}
                    required
                  />
                </div>
                <Button type="submit" className={authPrimaryButtonClass} disabled={isLoading}>
                  {isLoading ? <LoadingSpinner /> : t("auth.sendCode")}
                </Button>
              </div>
              <div className={`text-center text-sm ${authSecondaryTextClass}`}>
                {t("auth.rememberedPassword")}{" "}
                <Link to="/auth/sign-in" className={authLinkClass}>
                  {t("auth.backToLogin")}
                </Link>
              </div>
            </div>
          </form>
          )}

          {step === "confirm" && (
          <form onSubmit={handleConfirmReset}>
            <div className="grid gap-6 mt-4">
              <div className="grid gap-4">
                <div className="grid gap-3">
                  <Label htmlFor="code" className={authLabelClass}>{t("auth.confirmCode")}</Label>
                  <Input id="code" placeholder="123456" value={code} onChange={(event) => setCode(event.target.value)} className={authInputClass} disabled={isLoading} required />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="newPassword" className={authLabelClass}>{t("auth.newPassword")}</Label>
                  <Input id="newPassword" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className={authInputClass} disabled={isLoading} required />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="confirmPassword" className={authLabelClass}>{t("auth.confirmPassword")}</Label>
                  <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={authInputClass} disabled={isLoading} required />
                </div>
                <Button type="submit" className={authPrimaryButtonClass} disabled={isLoading}>
                  {isLoading ? <LoadingSpinner /> : t("auth.updatePassword")}
                </Button>
                <Button type="button" variant="outline" className={authOutlineButtonClass} onClick={handleRequestCode} disabled={isLoading}>
                  {t("auth.resend")}
                </Button>
              </div>
            </div>
          </form>
          )}

          {step === "complete" && (
            <div className="grid gap-4 mt-4">
              <Button asChild className={authPrimaryButtonClass}>
                <Link to="/auth/sign-in">{t("common.signIn")}</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
