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
      <Card>
        {step === "signUp" ? (
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Create DocuFlow account</CardTitle>
              <CardDescription>
                Register a Cognito user for the finance workspace.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  <div className="grid gap-6">
                    <div className="grid gap-4">
                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          control={form.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>First Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Minh" {...field} disabled={isLoading} />
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
                              <FormLabel>Last Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Nguyen" {...field} disabled={isLoading} />
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
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="finance@docuflow.ai"
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
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} disabled={isLoading} />
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
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} disabled={isLoading} />
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
                                className="mt-0.5"
                                disabled={isLoading}
                              />
                            </FormControl>
                            <FormLabel className="text-sm">
                              I agree to the terms of service and privacy policy
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full cursor-pointer" disabled={isLoading}>
                        {isLoading ? <LoadingSpinner /> : "Create account"}
                      </Button>
                    </div>
                    <div className="text-center text-sm">
                      Already have an account?{" "}
                      <Link to="/auth/sign-in" className="underline underline-offset-4">
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
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Confirm your account</CardTitle>
              <CardDescription>
                Enter the verification code sent to {registeredEmail}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleConfirmCode}>
                <div className="grid gap-6">
                  <div className="grid gap-4">
                    <div className="grid gap-3">
                      <Label htmlFor="verificationCode">Verification Code</Label>
                      <Input
                        id="verificationCode"
                        type="text"
                        placeholder="123456"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        disabled={isLoading}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full cursor-pointer" disabled={isLoading}>
                      {isLoading ? <LoadingSpinner /> : "Confirm Account"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full cursor-pointer"
                      onClick={handleResendCode}
                      disabled={isLoading}
                    >
                      Resend Code
                    </Button>
                  </div>
                  <div className="text-center text-sm">
                    Need to change email?{" "}
                    <button
                      type="button"
                      onClick={() => setStep("signUp")}
                      className="underline underline-offset-4 cursor-pointer text-primary hover:text-primary/80 bg-transparent border-0 p-0"
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
      <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
        Finance access is the default. Administrator access is assigned separately.
      </div>
    </div>
  )
}
