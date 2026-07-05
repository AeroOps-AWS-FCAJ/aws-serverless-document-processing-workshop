"use client"

import { useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Link, useNavigate } from "react-router-dom"
import { z } from "zod"
import { cn } from "@/lib/utils"
import { signUp, confirmSignUp, resendSignUpCode } from "aws-amplify/auth"
import { toast } from "sonner"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Checkbox } from "@/components/ui/checkbox"
import { useLanguage } from "@/lib/i18n"

type SignupFormValues = {
  firstName: string
  lastName: string
  email: string
  password: string
  confirmPassword: string
  terms: boolean
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

export function SignupForm1({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [step, setStep] = useState<"signUp" | "confirmSignUp">("signUp")
  const [isLoading, setIsLoading] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState("")
  const [verificationCode, setVerificationCode] = useState("")

  const signupFormSchema = useMemo(
    () =>
      z
        .object({
          firstName: z.string().min(1, t("auth.firstNameRequired")),
          lastName: z.string().min(1, t("auth.lastNameRequired")),
          email: z.string().email(t("auth.invalidEmail")),
          password: z.string().min(6, t("auth.passwordMin")),
          confirmPassword: z.string().min(6, t("auth.confirmPasswordRequired")),
          terms: z.boolean().refine((val) => val === true, t("auth.termsRequired")),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: t("auth.passwordMismatch"),
          path: ["confirmPassword"],
        }),
    [t]
  )

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      terms: false,
    },
  })

  async function onSubmit(data: SignupFormValues) {
    setIsLoading(true)
    try {
      const { nextStep } = await signUp({
        username: data.email,
        password: data.password,
        options: {
          userAttributes: {
            email: data.email,
            given_name: data.firstName,
            family_name: data.lastName,
          },
        },
      })

      setRegisteredEmail(data.email)

      if (nextStep.signUpStep === "CONFIRM_SIGN_UP") {
        setStep("confirmSignUp")
        toast.success(t("auth.codeSent"), {
          id: "auth-code-sent",
          description: data.email,
          duration: 6500,
        })
      } else {
        toast.success(t("auth.registrationSuccess"), {
          id: "auth-registration-success",
          description: t("auth.registrationSuccessDescription"),
          duration: 6500,
        })
        navigate("/auth/sign-in")
      }
    } catch (error: unknown) {
      console.error("Signup error:", error)
      if (error instanceof Error) {
        toast.error(error.message || t("auth.signUpFailed"))
      } else {
        toast.error(t("auth.signUpFailed"))
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function handleConfirmCode(e: React.FormEvent) {
    e.preventDefault()
    if (!verificationCode) {
      toast.error(t("auth.enterCode"))
      return
    }
    setIsLoading(true)
    try {
      const { isSignUpComplete } = await confirmSignUp({
        username: registeredEmail,
        confirmationCode: verificationCode,
      })

      if (isSignUpComplete) {
        toast.success(t("auth.confirmed"), {
          id: "auth-confirmed",
          description: t("auth.confirmedDescription"),
          duration: 6500,
        })
        navigate("/auth/sign-in")
      } else {
        toast.error(t("auth.confirmIncomplete"))
      }
    } catch (error: unknown) {
      console.error("Confirmation error:", error)
      if (error instanceof Error) {
        toast.error(error.message || t("auth.invalidCode"))
      } else {
        toast.error(t("auth.invalidCode"))
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function handleResendCode() {
    if (!registeredEmail) {
      toast.error(t("auth.noRegisteredEmail"))
      return
    }
    setIsLoading(true)
    try {
      await resendSignUpCode({ username: registeredEmail })
      toast.success(t("auth.codeResent"), {
        id: "auth-code-resent",
        description: registeredEmail,
        duration: 6500,
      })
    } catch (error: unknown) {
      console.error("Resend error:", error)
      if (error instanceof Error) {
        toast.error(error.message || t("auth.resendFailed"))
      } else {
        toast.error(t("auth.resendFailed"))
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className={authCardClass}>
        {step === "signUp" ? (
          <>
            <CardHeader className={authHeaderClass}>
              <CardTitle className={authTitleClass}>{t("auth.accountSetup")}</CardTitle>
              <CardDescription className={authDescriptionClass}>
                {t("auth.accountSetupDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  <div className="grid gap-6 mt-4">
                    <div className="grid gap-4">
                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          control={form.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={authLabelClass}>{t("auth.firstName")}</FormLabel>
                              <FormControl>
                                <Input placeholder="Minh" className={authInputClass} {...field} disabled={isLoading} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={authLabelClass}>{t("auth.lastName")}</FormLabel>
                              <FormControl>
                                <Input placeholder="Nguyen" className={authInputClass} {...field} disabled={isLoading} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
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
                                disabled={isLoading}
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
                            <FormLabel className={authLabelClass}>{t("auth.password")}</FormLabel>
                            <FormControl>
                              <Input type="password" className={authInputClass} {...field} disabled={isLoading} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={authLabelClass}>{t("auth.confirmPassword")}</FormLabel>
                            <FormControl>
                              <Input type="password" className={authInputClass} {...field} disabled={isLoading} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="terms"
                        render={({ field }) => (
                          <FormItem className="flex items-start space-x-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className="mt-0.5 border-white/40 data-[state=checked]:border-[#d8ff72] data-[state=checked]:bg-[#d8ff72] data-[state=checked]:text-[#10261d]"
                                disabled={isLoading}
                              />
                            </FormControl>
                            <FormLabel className={`text-sm leading-5 ${authSecondaryTextClass}`}>
                              {t("auth.terms")}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className={authPrimaryButtonClass} disabled={isLoading}>
                        {isLoading ? <LoadingSpinner /> : t("auth.createAccount")}
                      </Button>
                    </div>
                    <div className={`text-center text-sm ${authSecondaryTextClass}`}>
                      {t("auth.hasAccount")}{" "}
                      <Link to="/auth/sign-in" className={authLinkClass}>
                        {t("common.signIn")}
                      </Link>
                    </div>
                  </div>
                </form>
              </Form>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader className={authHeaderClass}>
              <CardTitle className={authTitleClass}>{t("auth.confirmAccount")}</CardTitle>
              <CardDescription className={authDescriptionClass}>
                {t("auth.confirmAccountDescription", { email: registeredEmail })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleConfirmCode}>
                <div className="grid gap-6 mt-4">
                  <div className="grid gap-4">
                    <div className="grid gap-3">
                      <Label htmlFor="verificationCode" className={authLabelClass}>{t("auth.verificationCode")}</Label>
                      <Input
                        id="verificationCode"
                        type="text"
                        placeholder="123456"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        className={authInputClass}
                        disabled={isLoading}
                        required
                      />
                    </div>
                    <Button type="submit" className={authPrimaryButtonClass} disabled={isLoading}>
                      {isLoading ? <LoadingSpinner /> : t("auth.confirm")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className={authOutlineButtonClass}
                      onClick={handleResendCode}
                      disabled={isLoading}
                    >
                      {t("auth.resend")}
                    </Button>
                  </div>
                  <div className={`text-center text-sm ${authSecondaryTextClass}`}>
                    {t("auth.changeEmail")}{" "}
                    <button
                      type="button"
                      onClick={() => setStep("signUp")}
                      className="cursor-pointer border-0 bg-transparent p-0 font-medium text-[#d8ff72] underline underline-offset-4 hover:text-[#f0ffb8]"
                    >
                      {t("auth.backToSignUp")}
                    </button>
                  </div>
                </div>
              </form>
            </CardContent>
          </>
        )}
      </Card>
      <div className="text-center text-xs text-[#4d5d55] text-balance *:[a]:underline *:[a]:underline-offset-4 *:[a]:hover:text-[#153f30]">
        {t("auth.financeDefault")}
      </div>
    </div>
  )
}
