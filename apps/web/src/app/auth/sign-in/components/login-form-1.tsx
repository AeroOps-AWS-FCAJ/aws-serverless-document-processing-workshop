"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useLocation, useNavigate } from "react-router-dom"
import { z } from "zod"
import { cn } from "@/lib/utils"
import {
  roleHomePaths,
  setDocuFlowSession,
  type DocuFlowRole,
} from "@/lib/auth"
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

const loginFormSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

type LoginFormValues = z.infer<typeof loginFormSchema>

const demoAccounts: Record<DocuFlowRole, { userId: string; name: string; email: string }> = {
  finance: { userId: "user-123", name: "Finance User", email: "finance@docuflow.ai" },
  admin: { userId: "admin-1", name: "System Administrator", email: "admin@docuflow.ai" },
}

function inferRole(email: string): DocuFlowRole {
  if (email.toLowerCase().startsWith("admin")) return "admin"
  return "finance"
}

export function LoginForm1({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from || "/dashboard"
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "finance@docuflow.ai",
      password: "password",
    },
  })

  function startSession(role: DocuFlowRole, email: string, name: string, userId: string, requestedPath?: string) {
    setDocuFlowSession({ role, email, name, userId })
    navigate(requestedPath || roleHomePaths[role], { replace: true })
  }

  function completeSignIn(values: LoginFormValues) {
    const role = inferRole(values.email)
    const account = demoAccounts[role]
    startSession(role, values.email, account.name, account.userId, from)
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border-[#d4d7cd] bg-[#fffef9] text-[#11251d] shadow-[0_18px_60px_rgba(17,37,29,.08)]">
        <CardHeader className="border-b border-[#e2e3db] text-left">
          <CardTitle className="text-lg text-[#11251d]">Account details</CardTitle>
          <CardDescription className="text-[#647069]">
            Demo access mirrors Cognito role-based workspaces.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(completeSignIn)}>
              <div className="grid gap-6">
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
                  <Button type="submit" className="w-full cursor-pointer !bg-[#d8ff72] !text-[#10261d] hover:!bg-[#cfff4f]">
                    Sign in
                  </Button>

                </div>
                <div className="grid gap-3 border-t border-[#e2e3db] pt-5">
                  <div>
                    <div className="text-sm font-medium text-[#11251d]">Demo workspaces</div>
                    <div className="text-xs text-[#647069]">
                      Finance handles document processing; Admin handles system operations.
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(demoAccounts) as DocuFlowRole[]).map((role) => (
                      <Button
                        key={role}
                        variant="outline"
                        className="h-auto cursor-pointer flex-col gap-1 !border-[#40584b] !bg-[#e7ece4] py-3 capitalize !text-[#11251d] hover:!bg-[#dce7d8]"
                        type="button"
                        onClick={() => startSession(role, demoAccounts[role].email, demoAccounts[role].name, demoAccounts[role].userId)}
                      >
                        {role}
                      </Button>
                    ))}
                  </div>
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
      <div className="text-center font-mono text-[9px] uppercase tracking-[0.1em] text-[#647069]">
        Production access will come from Amazon Cognito groups and API authorization claims.
      </div>
    </div>
  )
}
