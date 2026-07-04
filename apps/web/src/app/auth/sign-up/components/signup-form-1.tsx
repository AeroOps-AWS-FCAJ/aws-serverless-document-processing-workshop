"use client"

import { useState } from "react"
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

const signupFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
  terms: z.boolean().refine(val => val === true, "You must agree to the terms"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type SignupFormValues = z.infer<typeof signupFormSchema>

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
  const [step, setStep] = useState<"signUp" | "confirmSignUp">("signUp")
  const [isLoading, setIsLoading] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState("")
  const [verificationCode, setVerificationCode] = useState("")

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
        toast.success("A verification code has been sent to your email.")
      } else {
        toast.success("Registration successful! Please sign in.")
        navigate("/auth/sign-in")
      }
    } catch (error: unknown) {
      console.error("Signup error:", error)
      if (error instanceof Error) {
        toast.error(error.message || "Failed to sign up. Please try again.")
      } else {
        toast.error("Failed to sign up. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function handleConfirmCode(e: React.FormEvent) {
    e.preventDefault()
    if (!verificationCode) {
      toast.error("Please enter the verification code.")
      return
    }
    setIsLoading(true)
    try {
      const { isSignUpComplete } = await confirmSignUp({
        username: registeredEmail,
        confirmationCode: verificationCode,
      })

      if (isSignUpComplete) {
        toast.success("Account confirmed successfully! Please sign in.")
        navigate("/auth/sign-in")
      } else {
        toast.error("Verification incomplete. Please check again.")
      }
    } catch (error: unknown) {
      console.error("Confirmation error:", error)
      if (error instanceof Error) {
        toast.error(error.message || "Invalid verification code.")
      } else {
        toast.error("Invalid verification code.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function handleResendCode() {
    if (!registeredEmail) {
      toast.error("No registered email found.")
      return
    }
    setIsLoading(true)
    try {
      await resendSignUpCode({ username: registeredEmail })
      toast.success("Verification code resent.")
    } catch (error: unknown) {
      console.error("Resend error:", error)
      if (error instanceof Error) {
        toast.error(error.message || "Failed to resend code.")
      } else {
        toast.error("Failed to resend code.")
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
              <CardTitle className="text-lg text-[#11251d]">Account setup</CardTitle>
              <CardDescription className="text-[#647069]">
                Register a Cognito user for the finance workspace.
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
                              <FormLabel className={authLabelClass}>First Name</FormLabel>
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
                              <FormLabel className={authLabelClass}>Last Name</FormLabel>
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
                            <FormLabel className={authLabelClass}>Email</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="finance@docuflow.ai"
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
                            <FormLabel className={authLabelClass}>Password</FormLabel>
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
                            <FormLabel className={authLabelClass}>Confirm Password</FormLabel>
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
                              I agree to the terms of service and privacy policy
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className={authPrimaryButtonClass} disabled={isLoading}>
                        {isLoading ? <LoadingSpinner /> : "Create account"}
                      </Button>
                    </div>
                    <div className="text-center text-sm text-[#647069]">
                      Already have an account?{" "}
                      <Link to="/auth/sign-in" className="font-medium text-[#153f30] underline underline-offset-4">
                        Sign in
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
              <CardTitle className="text-lg text-[#11251d]">Confirm account</CardTitle>
              <CardDescription className="text-[#647069]">
                Enter the verification code sent to {registeredEmail}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleConfirmCode}>
                <div className="grid gap-6 mt-4">
                  <div className="grid gap-4">
                    <div className="grid gap-3">
                      <Label htmlFor="verificationCode" className={authLabelClass}>Verification Code</Label>
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
                      {isLoading ? <LoadingSpinner /> : "Confirm Account"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className={authOutlineButtonClass}
                      onClick={handleResendCode}
                      disabled={isLoading}
                    >
                      Resend Code
                    </Button>
                  </div>
                  <div className="text-center text-sm text-[#647069]">
                    Need to change email?{" "}
                    <button
                      type="button"
                      onClick={() => setStep("signUp")}
                      className="cursor-pointer border-0 bg-transparent p-0 font-medium text-[#153f30] underline underline-offset-4 hover:text-[#10261d]"
                    >
                      Back to sign up
                    </button>
                  </div>
                </div>
              </form>
            </CardContent>
          </>
        )}
      </Card>
      <div className="text-center text-xs text-[#647069] text-balance *:[a]:underline *:[a]:underline-offset-4 *:[a]:hover:text-[#153f30]">
        Finance access is the default. Administrator access is assigned separately.
      </div>
    </div>
  )
}
