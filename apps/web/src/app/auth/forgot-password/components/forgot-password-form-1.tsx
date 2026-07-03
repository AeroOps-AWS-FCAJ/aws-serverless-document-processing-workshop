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

type ResetStep = "request" | "confirm" | "complete"

const authCardClass = "border-[#d4d7cd] bg-[#fffef9] text-[#11251d] shadow-[0_18px_60px_rgba(17,37,29,.08)]"
const authInputClass = "!border-[#40584b] !bg-[#eef2e9] !text-[#11251d] placeholder:!text-[#6b756f] focus-visible:!border-[#153f30] focus-visible:!ring-[#153f30]/25"
const authLabelClass = "text-[#405047]"
const authPrimaryButtonClass = "w-full cursor-pointer !bg-[#d8ff72] !text-[#10261d] hover:!bg-[#cfff4f]"
const authOutlineButtonClass = "w-full cursor-pointer border-[#40584b]/35 bg-transparent text-[#153f30] hover:bg-[#eef2e9] hover:text-[#10261d]"

export function ForgotPasswordForm1({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [step, setStep] = useState<ResetStep>("request")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleRequestCode = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!email.trim()) {
      toast.error("Vui lòng nhập email Cognito.")
      return
    }

    setIsLoading(true)
    try {
      await resetPassword({ username: email.trim() })
      setStep("confirm")
      toast.success("Mã xác nhận đã được gửi tới email của bạn.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể gửi mã đặt lại mật khẩu.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmReset = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!code.trim()) {
      toast.error("Vui lòng nhập mã xác nhận.")
      return
    }
    if (newPassword.length < 6) {
      toast.error("Mật khẩu mới cần tối thiểu 6 ký tự.")
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp.")
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
      toast.success("Mật khẩu đã được cập nhật.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xác nhận mật khẩu mới.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className={authCardClass}>
        <CardHeader className="border-b border-[#e2e3db] text-left">
          <CardTitle className="text-lg text-[#11251d]">
            {step === "complete" ? "Mật khẩu đã được cập nhật" : "Đặt lại mật khẩu"}
          </CardTitle>
          <CardDescription className="text-[#647069]">
            {step === "request"
              ? "Nhập email Cognito để nhận mã xác nhận."
              : step === "confirm"
                ? `Nhập mã xác nhận đã gửi tới ${email}.`
                : "Bạn có thể đăng nhập bằng mật khẩu mới."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "request" && (
          <form onSubmit={handleRequestCode}>
            <div className="grid gap-6 mt-4">
              <div className="grid gap-6">
                <div className="grid gap-3">
                  <Label htmlFor="email" className={authLabelClass}>Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="finance@docuflow.ai"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className={authInputClass}
                    disabled={isLoading}
                    required
                  />
                </div>
                <Button type="submit" className={authPrimaryButtonClass} disabled={isLoading}>
                  {isLoading ? <LoadingSpinner /> : "Gửi mã xác nhận"}
                </Button>
              </div>
              <div className="text-center text-sm text-[#647069]">
                Đã nhớ mật khẩu?{" "}
                <Link to="/auth/sign-in" className="font-medium text-[#153f30] underline underline-offset-4">
                  Quay lại đăng nhập
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
                  <Label htmlFor="code" className={authLabelClass}>Mã xác nhận</Label>
                  <Input id="code" placeholder="123456" value={code} onChange={(event) => setCode(event.target.value)} className={authInputClass} disabled={isLoading} required />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="newPassword" className={authLabelClass}>Mật khẩu mới</Label>
                  <Input id="newPassword" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className={authInputClass} disabled={isLoading} required />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="confirmPassword" className={authLabelClass}>Xác nhận mật khẩu</Label>
                  <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={authInputClass} disabled={isLoading} required />
                </div>
                <Button type="submit" className={authPrimaryButtonClass} disabled={isLoading}>
                  {isLoading ? <LoadingSpinner /> : "Cập nhật mật khẩu"}
                </Button>
                <Button type="button" variant="outline" className={authOutlineButtonClass} onClick={handleRequestCode} disabled={isLoading}>
                  Gửi lại mã
                </Button>
              </div>
            </div>
          </form>
          )}

          {step === "complete" && (
            <div className="grid gap-4 mt-4">
              <Button asChild className={authPrimaryButtonClass}>
                <Link to="/auth/sign-in">Đăng nhập</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
