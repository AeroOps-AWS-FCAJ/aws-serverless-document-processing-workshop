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

const authCardClass = "border-[#d4d7cd] bg-[#fffef9] text-[#11251d] shadow-[0_18px_60px_rgba(17,37,29,.08)]"
const authInputClass = "!border-[#40584b] !bg-[#eef2e9] !text-[#11251d] placeholder:!text-[#6b756f] focus-visible:!border-[#153f30] focus-visible:!ring-[#153f30]/25"
const authLabelClass = "text-[#405047]"
const authPrimaryButtonClass = "w-full cursor-pointer !bg-[#d8ff72] !text-[#10261d] hover:!bg-[#cfff4f]"
const authOutlineButtonClass = "w-full cursor-pointer border-[#40584b]/35 bg-transparent text-[#153f30] hover:bg-[#eef2e9] hover:text-[#10261d]"

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
        toast.success(t("auth.codeSent"))
      } else {
        toast.success(t("auth.registrationSuccess"))
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
        toast.success(t("auth.confirmed"))
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
      toast.success(t("auth.codeResent"))
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
            <CardHeader className="border-b border-[#e2e3db] text-left">
              <CardTitle className="text-lg text-[#11251d]">{t("auth.accountSetup")}</CardTitle>
              <CardDescription className="text-[#647069]">
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
                                className="mt-0.5 border-[#40584b] data-[state=checked]:border-[#d8ff72] data-[state=checked]:bg-[#d8ff72] data-[state=checked]:text-[#10261d]"
                                disabled={isLoading}
                              />
                            </FormControl>
                            <FormLabel className="text-sm leading-5 text-[#647069]">
                              {t("auth.terms")}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className={authPrimaryButtonClass} disabled={isLoading}>
                        {isLoading ? <LoadingSpinner /> : t("auth.createAccount")}
                      </Button>
                    </div>
                    <div className="text-center text-sm text-[#647069]">
                      {t("auth.hasAccount")}{" "}
                      <Link to="/auth/sign-in" className="font-medium text-[#153f30] underline underline-offset-4">
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
            <CardHeader className="border-b border-[#e2e3db] text-left">
              <CardTitle className="text-lg text-[#11251d]">{t("auth.confirmAccount")}</CardTitle>
              <CardDescription className="text-[#647069]">
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
                  <div className="text-center text-sm text-[#647069]">
                    {t("auth.changeEmail")}{" "}
                    <button
                      type="button"
                      onClick={() => setStep("signUp")}
                      className="cursor-pointer border-0 bg-transparent p-0 font-medium text-[#153f30] underline underline-offset-4 hover:text-[#10261d]"
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
      <div className="text-center text-xs text-[#647069] text-balance *:[a]:underline *:[a]:underline-offset-4 *:[a]:hover:text-[#153f30]">
        {t("auth.financeDefault")}
      </div>
    </div>
  )
}
