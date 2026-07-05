"use client"

import { useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { z } from "zod"
import { cn } from "@/lib/utils"
import { confirmSignIn, signIn } from "aws-amplify/auth"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { toast } from "sonner"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useAuth } from "@/contexts/auth-context"
import { roleHomePaths } from "@/lib/auth"
import { useLanguage } from "@/lib/i18n"

type LoginFormValues = {
  email: string
  password: string
}
type ChallengeKind = "NEW_PASSWORD" | "MFA_CODE" | "UNSUPPORTED"

function resolveChallengeKind(step?: string): ChallengeKind {
  if (!step) return "UNSUPPORTED"
  if (step.includes("NEW_PASSWORD")) return "NEW_PASSWORD"
  if (step.includes("SMS") || step.includes("TOTP") || step.includes("EMAIL")) return "MFA_CODE"
  return "UNSUPPORTED"
}

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

export function LoginForm1({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const navigate = useNavigate()
  const { refreshSession } = useAuth()
  const { t } = useLanguage()
  const [isLoading, setIsLoading] = useState(false)
  const [challenge, setChallenge] = useState<{ kind: ChallengeKind; step: string } | null>(null)
  const [challengeResponse, setChallengeResponse] = useState("")

  const loginFormSchema = useMemo(
    () =>
      z.object({
        email: z.string().email(t("auth.invalidEmail")),
        password: z.string().min(6, t("auth.passwordMin")),
      }),
    [t]
  )

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  async function finishSignedIn() {
    toast.success(t("auth.signedIn"), {
      id: "auth-sign-in-success",
      description: t("auth.signedInRedirect"),
      duration: 6000,
    });
    await refreshSession();
    const { getCurrentDocuFlowSession } = await import("@/lib/auth");
    const session = await getCurrentDocuFlowSession();
    const rolePath = session ? roleHomePaths[session.role] : "/dashboard";
    navigate(rolePath, { replace: true });
  }

  function handleNextStep(step: string) {
    const kind = resolveChallengeKind(step)
    setChallenge({ kind, step })
    setChallengeResponse("")
    if (kind === "UNSUPPORTED") {
      toast.error(t("auth.unsupportedStep", { step }))
      return
    }
    toast.info(kind === "NEW_PASSWORD" ? t("auth.newPasswordPrompt") : t("auth.confirmCodePrompt"))
  }

  function getSignInErrorMessage(error: unknown) {
    const name = error instanceof Error ? error.name : ""
    const message = error instanceof Error ? error.message.toLowerCase() : ""

    if (
      name === "NotAuthorizedException" ||
      name === "UserNotFoundException" ||
      message.includes("incorrect username") ||
      message.includes("incorrect password") ||
      message.includes("user does not exist") ||
      message.includes("not authorized")
    ) {
      return t("auth.signInInvalidCredentials")
    }

    if (name === "UserNotConfirmedException" || message.includes("not confirmed")) {
      return t("auth.signInUserNotConfirmed")
    }

    if (name === "PasswordResetRequiredException" || message.includes("password reset")) {
      return t("auth.signInPasswordResetRequired")
    }

    if (
      name === "TooManyRequestsException" ||
      name === "LimitExceededException" ||
      message.includes("attempt") ||
      message.includes("rate")
    ) {
      return t("auth.signInRateLimited")
    }

    if (message.includes("network") || message.includes("fetch")) {
      return t("auth.signInNetworkError")
    }

    return error instanceof Error ? error.message || t("auth.signInFailed") : t("auth.signInFailed")
  }

  async function completeSignIn(values: LoginFormValues) {
    setIsLoading(true)
    try {
      const { isSignedIn, nextStep } = await signIn({
        username: values.email,
        password: values.password,
      });

      if (isSignedIn) {
        await finishSignedIn()
      } else {
        handleNextStep(nextStep.signInStep)
      }
    } catch (error: unknown) {
      console.error("Error signing in", error);
      const message = getSignInErrorMessage(error)
      toast.error(message, {
        id: "auth-sign-in-error",
        description: t("auth.signInErrorHint"),
        duration: 7000,
      })
    } finally {
      setIsLoading(false);
    }
  }

  async function completeChallenge(event: React.FormEvent) {
    event.preventDefault()
    if (!challenge || challenge.kind === "UNSUPPORTED") return
    if (!challengeResponse.trim()) {
      const message = challenge.kind === "NEW_PASSWORD" ? t("auth.newPasswordRequired") : t("auth.confirmCodeRequired")
      toast.error(message)
      return
    }

    setIsLoading(true)
    try {
      const { isSignedIn, nextStep } = await confirmSignIn({
        challengeResponse: challengeResponse.trim(),
      })

      if (isSignedIn) {
        setChallenge(null)
        await finishSignedIn()
      } else {
        handleNextStep(nextStep.signInStep)
      }
    } catch (error: unknown) {
      console.error("Error completing sign-in challenge", error);
      const message = error instanceof Error ? error.message : t("auth.challengeFailed")
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className={authCardClass}>
        <CardHeader className={authHeaderClass}>
          <CardTitle className={authTitleClass}>{t("auth.accountDetails")}</CardTitle>
          <CardDescription className={authDescriptionClass}>
            {t("auth.accountDetailsDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {challenge && challenge.kind !== "UNSUPPORTED" ? (
            <form onSubmit={completeChallenge}>
              <div className="grid gap-5 mt-4">
                <div className="grid gap-2">
                  <label className={`text-sm font-medium ${authLabelClass}`} htmlFor="challengeResponse">
                    {challenge.kind === "NEW_PASSWORD" ? t("auth.newPassword") : t("auth.confirmCode")}
                  </label>
                  <Input
                    id="challengeResponse"
                    type={challenge.kind === "NEW_PASSWORD" ? "password" : "text"}
                    value={challengeResponse}
                    onChange={(event) => setChallengeResponse(event.target.value)}
                    className={authInputClass}
                    disabled={isLoading}
                    autoFocus
                  />
                  <p className={`text-xs ${authSecondaryTextClass}`}>{challenge.step}</p>
                </div>
                <Button disabled={isLoading} type="submit" className={authPrimaryButtonClass}>
                  {isLoading ? <LoadingSpinner /> : t("auth.continue")}
                </Button>
                <Button type="button" variant="outline" className={authOutlineButtonClass} onClick={() => setChallenge(null)} disabled={isLoading}>
                  {t("auth.backToLogin")}
                </Button>
              </div>
            </form>
          ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(completeSignIn)}>
              <div className="grid gap-6 mt-4">
                <div className="grid gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={authLabelClass}>{t("auth.email")}</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="youremail@example.com"
                            className={authInputClass}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center">
                          <FormLabel className={authLabelClass}>{t("auth.password")}</FormLabel>
                          <a
                            href="/auth/forgot-password"
                            className="ml-auto text-sm text-white/65 underline-offset-4 hover:text-[#d8ff72] hover:underline"
                          >
                            {t("auth.forgotPassword")}
                          </a>
                        </div>
                        <FormControl>
                          <Input
                            type="password"
                            className={authInputClass}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button disabled={isLoading} type="submit" className={authPrimaryButtonClass}>
                    {isLoading ? <LoadingSpinner /> : t("common.signIn")}
                  </Button>
                </div>
                
                <div className={`text-center text-sm ${authSecondaryTextClass}`}>
                  {t("auth.noAccount")}{" "}
                  <a href="/auth/sign-up" className={authLinkClass}>
                    {t("common.signUp")}
                  </a>
                </div>
              </div>
            </form>
          </Form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
