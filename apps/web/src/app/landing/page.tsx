"use client"

import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  Database,
  FileCheck2,
  FileText,
  LayoutDashboard,
  LockKeyhole,
  PlayCircle,
  ReceiptText,
  ScanText,
  ShieldCheck,
  UploadCloud,
  UserRound,
  Workflow,
  Zap,
} from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import { useAuth } from "@/contexts/auth-context"
import { roleHomePaths, roleLabels } from "@/lib/auth"

const workflowSteps = [
  { label: "Tải lên", detail: "Cognito + presigned S3", icon: UploadCloud },
  { label: "Trích xuất", detail: "Textract AnalyzeExpense", icon: ScanText },
  { label: "Chuẩn hóa", detail: "AI normalization", icon: Workflow },
  { label: "Kiểm duyệt", detail: "Finance approval queue", icon: FileCheck2 },
  { label: "Lưu vết", detail: "DynamoDB + S3 evidence", icon: Database },
]

const capabilities = [
  {
    title: "Không thất lạc tài liệu sau upload",
    body: "Tạo metadata ngay từ bước cấp upload URL, theo dõi trạng thái UPLOADED, QUEUED, PROCESSING, REVIEW_REQUIRED và APPROVED.",
    icon: ReceiptText,
  },
  {
    title: "Kiểm duyệt đúng nơi cần người quyết định",
    body: "Các dòng có độ tin cậy thấp, tổng tiền bất thường hoặc lỗi trích xuất được đưa vào hàng đợi kiểm duyệt thay vì chặn toàn bộ pipeline.",
    icon: BadgeCheck,
  },
  {
    title: "Dữ liệu sẵn sàng cho báo cáo tài chính",
    body: "Invoice, receipt, line items, currency, tax và confidence được chuẩn hóa theo data contract để dashboard và reports dùng chung một nguồn dữ liệu.",
    icon: BarChart3,
  },
]

const proofPoints = [
  ["S3 Raw", "Tài liệu gốc được lưu riêng và truy xuất bằng URL tạm thời."],
  ["Step Functions", "Workflow bất đồng bộ, retry rõ ràng theo từng bước."],
  ["DynamoDB", "Truy vấn theo user, status và documentId cho UI người dùng."],
  ["Cognito", "Luồng đăng nhập thật, tách quyền Finance và Admin."],
]

export default function LandingPage() {
  const { session } = useAuth()
  const isAuthenticated = Boolean(session?.authenticated)
  const homePath = session ? roleHomePaths[session.role] : "/dashboard"
  const displayName = session?.firstName || session?.name || session?.email || "User"

  return (
    <div className="min-h-screen bg-[#f4f1e8] text-[#10261d]">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[#10261d]/10 bg-[#f4f1e8]/90 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8" aria-label="Landing navigation">
          <Link to="/" className="flex items-center gap-3">
            <span className="grid size-10 place-items-center bg-[#d8ff72] text-[#10261d]">
              <Logo size={24} />
            </span>
            <span>
              <span className="block text-sm font-bold leading-none">DocuFlow AI</span>
              <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.18em] text-[#10261d]/50">Financial document operations</span>
            </span>
          </Link>

          <div className="hidden items-center gap-7 text-sm font-medium text-[#10261d]/65 md:flex">
            <a href="#workflow" className="transition hover:text-[#10261d]">Workflow</a>
            <a href="#controls" className="transition hover:text-[#10261d]">Kiểm soát</a>
            <a href="#security" className="transition hover:text-[#10261d]">Bảo mật</a>
          </div>

          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" className="hidden max-w-[180px] text-[#10261d] hover:bg-[#10261d]/5 sm:inline-flex">
                <Link to="/settings?tab=profile">
                  <UserRound className="size-4" />
                  <span className="truncate">{displayName}</span>
                  {session && (
                    <span className="hidden font-mono text-[10px] uppercase tracking-[0.12em] text-[#10261d]/45 lg:inline">
                      {roleLabels[session.role]}
                    </span>
                  )}
                </Link>
              </Button>
              <Button asChild className="bg-[#10261d] text-white hover:bg-[#1b3a2d]">
                <Link to={homePath}>
                  <LayoutDashboard className="size-4" />
                  Dashboard
                </Link>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" className="hidden text-[#10261d] hover:bg-[#10261d]/5 sm:inline-flex">
                <Link to="/auth/sign-in">Đăng nhập</Link>
              </Button>
              <Button asChild className="bg-[#10261d] text-white hover:bg-[#1b3a2d]">
                <Link to="/auth/sign-up">
                  Bắt đầu
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          )}
        </nav>
      </header>

      <main>
        <section className="relative min-h-[760px] overflow-hidden bg-[#0b1f17] px-4 pt-28 text-white sm:px-6 lg:px-8">
          <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(216,255,114,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(216,255,114,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />
          <div className="absolute inset-x-0 top-16 h-px bg-[#d8ff72]/30" />
          <div className="absolute bottom-0 left-0 right-0 h-52 bg-gradient-to-t from-[#0b1f17] to-transparent" />

          <div className="pointer-events-none absolute inset-y-24 right-0 hidden w-[58%] max-w-4xl lg:block">
            <div className="absolute right-8 top-0 w-[520px] border border-[#d8ff72]/20 bg-[#f7f4ea] p-5 text-[#10261d] shadow-2xl shadow-black/30">
              <div className="mb-5 flex items-center justify-between border-b border-[#10261d]/10 pb-4">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#10261d]/45">Tài liệu nguồn</div>
                  <div className="mt-1 text-lg font-bold">invoice-home.png</div>
                </div>
                <span className="rounded-full bg-[#d8ff72] px-3 py-1 font-mono text-[10px] font-bold uppercase">Đã tải lên</span>
              </div>
              <div className="grid gap-3">
                {["Vendor: SlicedInvoices", "Total due: $93.50", "Tax: $8.50", "Confidence: 91%"].map((item) => (
                  <div key={item} className="flex items-center justify-between border border-[#10261d]/10 bg-white px-3 py-2 text-sm">
                    <span>{item}</span>
                    <CheckCircle2 className="size-4 text-emerald-700" />
                  </div>
                ))}
              </div>
              <div className="mt-5 grid grid-cols-[1fr_auto_auto] gap-2 border-t border-[#10261d]/10 pt-4 font-mono text-[10px] uppercase tracking-[0.1em] text-[#10261d]/50">
                <span>Mô tả</span>
                <span>SL</span>
                <span>Thành tiền</span>
              </div>
              <div className="mt-2 grid grid-cols-[1fr_auto_auto] gap-2 bg-[#10261d] px-3 py-3 text-sm text-white">
                <span className="truncate">Web Design This is a sample description...</span>
                <span>1</span>
                <span>$85.00</span>
              </div>
            </div>

            <div className="absolute right-0 top-72 w-[460px] border border-white/10 bg-[#10261d]/95 p-5 shadow-2xl shadow-black/40">
              <div className="mb-4 flex items-center justify-between">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">Pipeline live</div>
                <span className="rounded-full border border-[#d8ff72]/30 bg-[#d8ff72]/10 px-3 py-1 font-mono text-[10px] text-[#d8ff72]">5 bước</span>
              </div>
              <div className="space-y-3">
                {workflowSteps.map((step, index) => {
                  const Icon = step.icon
                  return (
                    <div key={step.label} className="grid grid-cols-[24px_28px_1fr] items-center gap-3 border-t border-white/10 pt-3 first:border-t-0 first:pt-0">
                      <span className="font-mono text-[10px] text-white/25">0{index + 1}</span>
                      <Icon className="size-4 text-[#d8ff72]" />
                      <div>
                        <div className="text-sm font-semibold">{step.label}</div>
                        <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-white/35">{step.detail}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="relative mx-auto grid max-w-7xl gap-12 pb-24 lg:grid-cols-[0.92fr_1.08fr]">
            <div className="flex min-h-[590px] flex-col justify-center">
              <div className="mb-6 inline-flex w-fit items-center gap-2 border border-[#d8ff72]/30 bg-[#d8ff72]/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#d8ff72]">
                <Zap className="size-3" />
                AWS serverless document processing
              </div>
              <h1 className="max-w-4xl text-5xl font-black leading-[0.92] tracking-[-0.07em] sm:text-7xl lg:text-8xl">
                Biến hóa đơn thành dữ liệu đáng tin cậy.
              </h1>
              <p className="mt-7 max-w-2xl text-base leading-8 text-white/68 sm:text-lg">
                DocuFlow AI xử lý invoice và receipt bằng upload bảo mật, Textract, AI normalization và hàng đợi kiểm duyệt để Finance không phải dò từng dòng thủ công.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="bg-[#d8ff72] text-[#10261d] hover:bg-[#e8ff9e]">
                  <Link to="/auth/sign-up">
                    Tạo workspace
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white">
                  <Link to="/auth/sign-in">
                    <PlayCircle className="size-4" />
                    Vào hệ thống
                  </Link>
                </Button>
              </div>
              <div className="mt-10 grid max-w-2xl grid-cols-3 border-y border-white/10 py-5">
                {[
                  ["5 bước", "pipeline chuẩn"],
                  ["70%", "ngưỡng duyệt"],
                  ["Audit", "theo từng tài liệu"],
                ].map(([value, label]) => (
                  <div key={value} className="border-l border-white/10 px-4 first:border-l-0 first:pl-0">
                    <div className="text-2xl font-bold tracking-[-0.05em] text-white">{value}</div>
                    <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="workflow" className="border-b border-[#10261d]/10 bg-[#f4f1e8] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr]">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#10261d]/45">Operational workflow</div>
                <h2 className="mt-4 text-4xl font-black tracking-[-0.06em] sm:text-5xl">Một luồng xử lý, nhiều điểm kiểm soát.</h2>
              </div>
              <div className="grid gap-3 md:grid-cols-5">
                {workflowSteps.map((step, index) => {
                  const Icon = step.icon
                  return (
                    <article key={step.label} className="border border-[#10261d]/12 bg-white p-4">
                      <div className="mb-8 flex items-center justify-between">
                        <span className="font-mono text-[10px] text-[#10261d]/35">0{index + 1}</span>
                        <Icon className="size-5 text-[#10261d]" />
                      </div>
                      <h3 className="font-bold">{step.label}</h3>
                      <p className="mt-2 text-sm leading-6 text-[#10261d]/58">{step.detail}</p>
                    </article>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        <section id="controls" className="bg-white px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 max-w-3xl">
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#10261d]/45">Finance controls</div>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.06em] sm:text-5xl">Tập trung vào phần còn rủi ro.</h2>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {capabilities.map((item) => {
                const Icon = item.icon
                return (
                  <article key={item.title} className="min-h-[260px] border border-[#10261d]/12 bg-[#f4f1e8] p-6">
                    <Icon className="size-7 text-[#10261d]" />
                    <h3 className="mt-10 text-xl font-black tracking-[-0.04em]">{item.title}</h3>
                    <p className="mt-4 text-sm leading-7 text-[#10261d]/62">{item.body}</p>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <section id="security" className="bg-[#10261d] px-4 py-20 text-white sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#d8ff72]/70">Serverless architecture</div>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.06em] sm:text-5xl">Đủ rõ để vận hành, đủ chặt để kiểm toán.</h2>
              <p className="mt-6 max-w-xl text-sm leading-7 text-white/62">
                Kiến trúc tách raw bucket, processed bucket, DynamoDB metadata và Step Functions history. Người dùng chỉ thấy dữ liệu thuộc quyền của họ qua Cognito.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-2 border border-white/15 px-3 py-2 text-sm text-white/70"><ShieldCheck className="size-4 text-[#d8ff72]" /> Cognito access</span>
                <span className="inline-flex items-center gap-2 border border-white/15 px-3 py-2 text-sm text-white/70"><LockKeyhole className="size-4 text-[#d8ff72]" /> Presigned upload</span>
                <span className="inline-flex items-center gap-2 border border-white/15 px-3 py-2 text-sm text-white/70"><FileText className="size-4 text-[#d8ff72]" /> Evidence trail</span>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {proofPoints.map(([title, body]) => (
                <article key={title} className="border border-white/10 bg-white/[0.04] p-5">
                  <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#d8ff72]">{title}</h3>
                  <p className="mt-4 text-sm leading-7 text-white/58">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#d8ff72] px-4 py-16 text-[#10261d] sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 lg:flex-row lg:items-center">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#10261d]/55">Ready for finance operations</div>
              <h2 className="mt-3 max-w-3xl text-4xl font-black tracking-[-0.06em] sm:text-5xl">Bắt đầu xử lý tài liệu thật, bằng API thật.</h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-[#10261d] text-white hover:bg-[#1b3a2d]">
                <Link to="/auth/sign-up">Đăng ký</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-[#10261d]/30 bg-transparent hover:bg-[#10261d]/5">
                <Link to="/auth/sign-in">Đăng nhập</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#10261d]/10 bg-[#f4f1e8] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-[#10261d]/55 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Logo size={18} />
            <span className="font-semibold text-[#10261d]">DocuFlow AI</span>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link to="/dashboard" className="hover:text-[#10261d]">Dashboard</Link>
            <Link to="/documents" className="hover:text-[#10261d]">Tài liệu</Link>
            <Link to="/review" className="hover:text-[#10261d]">Kiểm duyệt</Link>
            <Link to="/reports" className="hover:text-[#10261d]">Báo cáo</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
