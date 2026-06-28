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
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Sign in to DocuFlow AI</CardTitle>
          <CardDescription>
            Sign in to your document or administration workspace.
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
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="finance@docuflow.ai"
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
                          <FormLabel>Password</FormLabel>
                          <a
                            href="/auth/forgot-password"
                            className="ml-auto text-sm underline-offset-4 hover:underline"
                          >
                            Forgot your password?
                          </a>
                        </div>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full cursor-pointer">
                    Sign in
                  </Button>

                </div>
                <div className="grid gap-3 border-t pt-5">
                  <div>
                    <div className="text-sm font-medium">Demo workspaces</div>
                    <div className="text-muted-foreground text-xs">
                      Finance handles document processing; Admin handles system operations.
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(demoAccounts) as DocuFlowRole[]).map((role) => (
                      <Button
                        key={role}
                        variant="outline"
                        className="h-auto cursor-pointer flex-col gap-1 py-3 capitalize"
                        type="button"
                        onClick={() => startSession(role, demoAccounts[role].email, demoAccounts[role].name, demoAccounts[role].userId)}
                      >
                        {role}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="text-center text-sm">
                  Don&apos;t have an account?{" "}
                  <a href="/auth/sign-up" className="underline underline-offset-4">
                    Sign up
                  </a>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
        Production access will come from Amazon Cognito groups and API authorization claims.
      </div>
    </div>
  )
}
