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
    toast.success(t("auth.signedIn"));
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
      if (error instanceof Error) {
        toast.error(error.message || t("auth.signInFailed"));
      } else {
        toast.error(t("auth.signInFailed"));
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function completeChallenge(event: React.FormEvent) {
    event.preventDefault()
    if (!challenge || challenge.kind === "UNSUPPORTED") return
    if (!challengeResponse.trim()) {
      toast.error(challenge.kind === "NEW_PASSWORD" ? t("auth.newPasswordRequired") : t("auth.confirmCodeRequired"))
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
      toast.error(error instanceof Error ? error.message : t("auth.challengeFailed"))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border-[#d4d7cd] bg-[#fffef9] text-[#11251d] shadow-[0_18px_60px_rgba(17,37,29,.08)]">
        <CardHeader className="border-b border-[#e2e3db] text-left">
          <CardTitle className="text-lg text-[#11251d]">{t("auth.accountDetails")}</CardTitle>
          <CardDescription className="text-[#647069]">
            {t("auth.accountDetailsDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {challenge && challenge.kind !== "UNSUPPORTED" ? (
            <form onSubmit={completeChallenge}>
              <div className="grid gap-5 mt-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-[#405047]" htmlFor="challengeResponse">
                    {challenge.kind === "NEW_PASSWORD" ? t("auth.newPassword") : t("auth.confirmCode")}
                  </label>
                  <Input
                    id="challengeResponse"
                    type={challenge.kind === "NEW_PASSWORD" ? "password" : "text"}
                    value={challengeResponse}
                    onChange={(event) => setChallengeResponse(event.target.value)}
                    className="!border-[#40584b] !bg-[#eef2e9] !text-[#11251d] placeholder:!text-[#6b756f] focus-visible:!border-[#153f30] focus-visible:!ring-[#153f30]/25"
                    disabled={isLoading}
                    autoFocus
                  />
                  <p className="text-xs text-[#647069]">{challenge.step}</p>
                </div>
                <Button disabled={isLoading} type="submit" className="w-full cursor-pointer !bg-[#d8ff72] !text-[#10261d] hover:!bg-[#cfff4f]">
                  {isLoading ? <LoadingSpinner /> : t("auth.continue")}
                </Button>
                <Button type="button" variant="outline" className="w-full cursor-pointer" onClick={() => setChallenge(null)} disabled={isLoading}>
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
                        <FormLabel className="text-[#405047]">{t("auth.email")}</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="youremail@example.com"
                            className="!border-[#40584b] !bg-[#eef2e9] !text-[#11251d] placeholder:!text-[#6b756f] focus-visible:!border-[#153f30] focus-visible:!ring-[#153f30]/25"
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
                          <FormLabel className="text-[#405047]">{t("auth.password")}</FormLabel>
                          <a
                            href="/auth/forgot-password"
                            className="ml-auto text-sm text-[#647069] underline-offset-4 hover:text-[#153f30] hover:underline"
                          >
                            {t("auth.forgotPassword")}
                          </a>
                        </div>
                        <FormControl>
                          <Input
                            type="password"
                            className="!border-[#40584b] !bg-[#eef2e9] !text-[#11251d] placeholder:!text-[#6b756f] focus-visible:!border-[#153f30] focus-visible:!ring-[#153f30]/25"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button disabled={isLoading} type="submit" className="w-full cursor-pointer !bg-[#d8ff72] !text-[#10261d] hover:!bg-[#cfff4f]">
                    {isLoading ? <LoadingSpinner /> : t("common.signIn")}
                  </Button>
                </div>
                
                <div className="text-center text-sm text-[#647069]">
                  {t("auth.noAccount")}{" "}
                  <a href="/auth/sign-up" className="font-medium text-[#153f30] underline underline-offset-4">
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
