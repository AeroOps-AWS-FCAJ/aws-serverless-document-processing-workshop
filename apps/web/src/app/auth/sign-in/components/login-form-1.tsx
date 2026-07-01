"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { z } from "zod"
import { cn } from "@/lib/utils"
import { signIn } from "aws-amplify/auth"
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

const loginFormSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

type LoginFormValues = z.infer<typeof loginFormSchema>

export function LoginForm1({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const navigate = useNavigate()
  const { refreshSession } = useAuth()
  const [isLoading, setIsLoading] = useState(false)


  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  async function completeSignIn(values: LoginFormValues) {
    setIsLoading(true)
    try {
      const { isSignedIn, nextStep } = await signIn({
        username: values.email,
        password: values.password,
      });

      if (isSignedIn) {
        toast.success("Signed in successfully!");
        // Refresh session to get role info, then redirect to role-specific home
        await refreshSession();
        // After refresh, AuthContext has the updated session.
        // We use getCurrentDocuFlowSession directly to read role for redirect.
        const { getCurrentDocuFlowSession } = await import("@/lib/auth");
        const session = await getCurrentDocuFlowSession();
        const rolePath = session ? roleHomePaths[session.role] : "/dashboard";
        // Always redirect to the role's home page to ensure proper layout initialization.
        navigate(rolePath, { replace: true });
      } else {
        // Handle next steps like NEW_PASSWORD_REQUIRED, CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED
        console.log("Next step required:", nextStep);
        toast.error(`Please complete the next step: ${nextStep.signInStep}`);
      }
    } catch (error: unknown) {
      console.error("Error signing in", error);
      if (error instanceof Error) {
        toast.error(error.message || "Failed to sign in. Please check your credentials.");
      } else {
        toast.error("Failed to sign in. Please check your credentials.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border-[#d4d7cd] bg-[#fffef9] text-[#11251d] shadow-[0_18px_60px_rgba(17,37,29,.08)]">
        <CardHeader className="border-b border-[#e2e3db] text-left">
          <CardTitle className="text-lg text-[#11251d]">Account details</CardTitle>
          <CardDescription className="text-[#647069]">
            Sign in with your Amazon Cognito credentials.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(completeSignIn)}>
              <div className="grid gap-6 mt-4">
                <div className="grid gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#405047]">Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="finance@docuflow.ai"
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
                          <FormLabel className="text-[#405047]">Password</FormLabel>
                          <a
                            href="/auth/forgot-password"
                            className="ml-auto text-sm text-[#647069] underline-offset-4 hover:text-[#153f30] hover:underline"
                          >
                            Forgot your password?
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
                    {isLoading ? <LoadingSpinner /> : "Sign in"}
                  </Button>
                </div>
                
                <div className="text-center text-sm text-[#647069]">
                  Don&apos;t have an account?{" "}
                  <a href="/auth/sign-up" className="font-medium text-[#153f30] underline underline-offset-4">
                    Sign up
                  </a>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
