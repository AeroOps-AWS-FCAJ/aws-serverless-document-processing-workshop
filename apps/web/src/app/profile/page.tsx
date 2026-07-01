"use client"

import { Link, useNavigate } from "react-router-dom"
import {
  ArrowRight,
  BadgeCheck,
  BellDot,
  FileSearch,
  LogOut,
  ShieldCheck,
  UploadCloud,
  UserRound,
  Workflow,
} from "lucide-react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { clearDocuFlowSession, roleLabels } from "@/lib/auth"
import { roleCapabilities } from "@/lib/docuflow-data"
import { useDocuFlowDocuments } from "@/lib/docuflow-store"
import { useAuth } from "@/contexts/auth-context"

const workspaceLinks = [
  { label: "Tải tài liệu lên", to: "/upload", icon: UploadCloud },
  { label: "Danh sách tài liệu", to: "/documents", icon: FileSearch },
  { label: "Hàng đợi kiểm duyệt", to: "/review", icon: BellDot },
  { label: "Báo cáo", to: "/reports", icon: BadgeCheck },
  { label: "Thông báo", to: "/notifications", icon: BellDot },
  { label: "Lịch sử hoạt động", to: "/activity", icon: Workflow },
]

export default function ProfilePage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const { documents } = useDocuFlowDocuments()
  const role = session?.role ?? "finance"
  const capability = roleCapabilities.find((item) => item.role === role)
  const visibleDocuments = documents.filter((document) => role === "admin" || document.userId === session?.userId)
  const reviewCount = visibleDocuments.filter((document) =>
    ["REVIEW_REQUIRED", "FAILED", "CORRECTED"].includes(document.status)
  ).length

  const handleLogout = async () => {
    await clearDocuFlowSession()
    navigate("/auth/sign-in", { replace: true })
  }

  return (
    <BaseLayout title="Hồ sơ của tôi">
      {/* ── Hero Banner ─────────────────────────────────────────────────────── */}
      <section className="px-4 lg:px-6">
        <div className="overflow-hidden rounded-2xl border bg-[#10261d] text-white shadow-lg">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-[#d8ff72]/40 bg-[#d8ff72]/15 font-mono text-[10px] uppercase text-[#d8ff72]">
                  Tài khoản
                </Badge>
                <Badge variant="outline" className="border-white/20 bg-white/5 font-mono text-[10px] uppercase text-white/75">
                  {roleLabels[role]}
                </Badge>
              </div>
              <h2 className="mt-2 max-w-3xl font-display text-lg font-semibold leading-snug tracking-tight text-white md:text-xl">
                {session?.name ?? "Người dùng"}
              </h2>
              <p className="mt-1.5 max-w-2xl text-xs leading-6 text-white/62">
                Thông tin tài khoản, vai trò trong hệ thống và quyền truy cập tính năng.
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button asChild className="bg-[#d8ff72] text-[#10261d] hover:bg-[#c7ee5f]">
                  <Link to="/documents">
                    Tài liệu của tôi
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button type="button" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={handleLogout}>
                  <LogOut className="size-4" />
                  Đăng xuất
                </Button>
              </div>
            </div>
            {/* Right: KPI tiles */}
            <div className="grid grid-cols-2 border-t border-white/12 lg:border-l lg:border-t-0">
              {[
                { label: "Vai trò", value: roleLabels[role], icon: UserRound },
                { label: "Tài liệu", value: visibleDocuments.length, icon: FileSearch },
                { label: "Cần xử lý", value: reviewCount, icon: BellDot },
                { label: "Trạng thái", value: "Đang hoạt động", icon: ShieldCheck },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="border-b border-r border-white/12 p-3 last:border-r-0 sm:p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <Icon className="size-3.5 text-[#d8ff72]" />
                    </div>
                    <div className="truncate text-lg font-semibold text-white">{item.value}</div>
                    <div className="mt-0.5 text-xs text-white/50">{item.label}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Profile details ──────────────────────────────────────────────────── */}
      <section className="grid gap-5 px-4 lg:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.2fr)] xl:grid-cols-[minmax(340px,0.75fr)_minmax(0,1.25fr)] lg:px-6">
        {/* Account info */}
        <Card>
          <CardHeader className="border-b bg-muted/25">
            <CardTitle className="flex items-center gap-2">
              <UserRound className="size-5" />
              Thông tin tài khoản
            </CardTitle>
            <CardDescription>Thông tin cơ bản của phiên làm việc hiện tại.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 pt-5">
            {[
              ["Họ và tên", session?.name ?? "Không xác định"],
              ["Email", session?.email ?? "Không xác định"],
              ["Vai trò", roleLabels[role]],
              ["Mã người dùng", session?.userId ?? "Không xác định"],
            ].map(([label, value]) => (
              <div key={label} className="grid gap-1 rounded-xl border p-3">
                <div className="font-mono text-[10px] uppercase text-muted-foreground">{label}</div>
                <div className="break-all text-sm font-medium">{value}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-5">
          {/* Role capabilities */}
          <Card>
            <CardHeader className="border-b bg-muted/25">
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-5" />
                Quyền truy cập
              </CardTitle>
              <CardDescription>{capability?.description}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 pt-5 md:grid-cols-3">
              {[
                { label: "Tải tài liệu", enabled: capability?.canUpload },
                { label: "Kiểm duyệt", enabled: capability?.canReview },
                { label: "Quản trị hệ thống", enabled: capability?.canOperate },
              ].map(({ label, enabled }) => (
                <div key={label} className="rounded-xl border p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="font-medium text-sm">{label}</span>
                    <Badge variant="outline" className={enabled ? "border-emerald-200 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300" : "border-muted-foreground/30 text-muted-foreground"}>
                      {enabled ? "Được phép" : "Hạn chế"}
                    </Badge>
                  </div>
                  <div className="text-xs leading-5 text-muted-foreground">
                    {enabled ? "Tính năng này có thể sử dụng." : "Chỉ dành cho quản trị viên."}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick navigation */}
          <Card>
            <CardHeader className="border-b bg-muted/25">
              <CardTitle className="flex items-center gap-2">
                <Workflow className="size-5" />
                Truy cập nhanh
              </CardTitle>
              <CardDescription>Các tính năng thường dùng trong hệ thống.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 pt-5 sm:grid-cols-2 lg:grid-cols-3">
              {workspaceLinks.map((link) => {
                const Icon = link.icon
                return (
                  <Button key={link.to} asChild variant="outline" className="h-auto justify-between p-4">
                    <Link to={link.to}>
                      <span className="flex items-center gap-2 text-sm">
                        <Icon className="size-4" />
                        {link.label}
                      </span>
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                )
              })}
            </CardContent>
          </Card>
        </div>
      </section>
    </BaseLayout>
  )
}
