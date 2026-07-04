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
import { LanguageToggle } from "@/components/language-toggle"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import { useAuth } from "@/contexts/auth-context"
import { roleHomePaths } from "@/lib/auth"
import { useLanguage } from "@/lib/i18n"

export default function LandingPage() {
  const { session } = useAuth()
  const { t } = useLanguage()
  const isAuthenticated = Boolean(session?.authenticated)
  const homePath = session ? roleHomePaths[session.role] : "/dashboard"
  const displayName = session?.firstName || session?.name || session?.email || "User"
  const roleLabel = session ? (session.role === "admin" ? t("role.admin") : t("role.finance")) : ""
  const workflowSteps = [
    { label: t("workflow.upload"), detail: t("workflow.uploadDetail"), icon: UploadCloud },
    { label: t("workflow.extract"), detail: t("workflow.extractDetail"), icon: ScanText },
    { label: t("workflow.normalize"), detail: t("workflow.normalizeDetail"), icon: Workflow },
    { label: t("workflow.review"), detail: t("workflow.reviewDetail"), icon: FileCheck2 },
    { label: t("workflow.store"), detail: t("workflow.storeDetail"), icon: Database },
  ]
  const capabilities = [
    { title: t("landing.capabilityIntakeTitle"), body: t("landing.capabilityIntakeBody"), icon: ReceiptText },
    { title: t("landing.capabilityReviewTitle"), body: t("landing.capabilityReviewBody"), icon: BadgeCheck },
    { title: t("landing.capabilityDataTitle"), body: t("landing.capabilityDataBody"), icon: BarChart3 },
  ]
  const proofPoints = [
    ["S3 Raw", t("landing.proofRaw")],
    ["Step Functions", t("landing.proofWorkflow")],
    ["DynamoDB", t("landing.proofDynamo")],
    ["Cognito", t("landing.proofCognito")],
  ] as const

  return (
    <div className="min-h-screen bg-[#f4f1e8] text-[#10261d]">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[#10261d]/10 bg-[#f4f1e8]/90 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8" aria-label={t("landing.navigation")}>
          <Link to="/" className="flex items-center gap-3">
            <span className="grid size-10 place-items-center bg-[#d8ff72] text-[#10261d]">
              <Logo size={24} />
            </span>
            <span>
              <span className="block text-sm font-bold leading-none">DocuFlow AI</span>
              <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.18em] text-[#10261d]/50">{t("brand.tagline")}</span>
            </span>
          </Link>

          <div className="hidden items-center gap-7 text-sm font-medium text-[#10261d]/65 md:flex">
            <a href="#workflow" className="transition hover:text-[#10261d]">{t("landing.nav.workflow")}</a>
            <a href="#controls" className="transition hover:text-[#10261d]">{t("landing.nav.controls")}</a>
            <a href="#security" className="transition hover:text-[#10261d]">{t("landing.nav.security")}</a>
          </div>

          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <LanguageToggle compact className="sm:hidden" />
              <LanguageToggle className="hidden sm:inline-flex" />
              <Button asChild variant="ghost" className="hidden max-w-[180px] text-[#10261d] hover:bg-[#10261d]/5 sm:inline-flex">
                <Link to="/settings?tab=profile">
                  <UserRound className="size-4" />
                  <span className="truncate">{displayName}</span>
                  {session && (
                    <span className="hidden font-mono text-[10px] uppercase tracking-[0.12em] text-[#10261d]/45 lg:inline">
                      {roleLabel}
                    </span>
                  )}
                </Link>
              </Button>
              <Button asChild className="bg-[#10261d] text-white hover:bg-[#1b3a2d]">
                <Link to={homePath}>
                  <LayoutDashboard className="size-4" />
                  {t("common.dashboard")}
                </Link>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <LanguageToggle compact className="sm:hidden" />
              <LanguageToggle className="hidden sm:inline-flex" />
              <Button asChild variant="ghost" className="hidden text-[#10261d] hover:bg-[#10261d]/5 sm:inline-flex">
                <Link to="/auth/sign-in">{t("common.signIn")}</Link>
              </Button>
              <Button asChild className="bg-[#10261d] text-white hover:bg-[#1b3a2d]">
                <Link to="/auth/sign-up">
                  {t("common.start")}
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
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#10261d]/45">{t("landing.sourceDoc")}</div>
                  <div className="mt-1 text-lg font-bold">invoice-home.png</div>
                </div>
                <span className="rounded-full bg-[#d8ff72] px-3 py-1 font-mono text-[10px] font-bold uppercase">{t("landing.uploaded")}</span>
              </div>
              <div className="grid gap-3">
                {[t("landing.previewVendor"), t("landing.previewTotal"), t("landing.previewTax"), t("landing.previewConfidence")].map((item) => (
                  <div key={item} className="flex items-center justify-between border border-[#10261d]/10 bg-white px-3 py-2 text-sm">
                    <span>{item}</span>
                    <CheckCircle2 className="size-4 text-emerald-700" />
                  </div>
                ))}
              </div>
              <div className="mt-5 grid grid-cols-[1fr_auto_auto] gap-2 border-t border-[#10261d]/10 pt-4 font-mono text-[10px] uppercase tracking-[0.1em] text-[#10261d]/50">
                <span>{t("landing.previewDescription")}</span>
                <span>{t("landing.previewQuantity")}</span>
                <span>{t("landing.previewAmount")}</span>
              </div>
              <div className="mt-2 grid grid-cols-[1fr_auto_auto] gap-2 bg-[#10261d] px-3 py-3 text-sm text-white">
                <span className="truncate">{t("landing.previewItem")}</span>
                <span>1</span>
                <span>$85.00</span>
              </div>
            </div>

            <div className="absolute right-0 top-72 w-[460px] border border-white/10 bg-[#10261d]/95 p-5 shadow-2xl shadow-black/40">
              <div className="mb-4 flex items-center justify-between">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">{t("landing.pipelineLive")}</div>
                <span className="rounded-full border border-[#d8ff72]/30 bg-[#d8ff72]/10 px-3 py-1 font-mono text-[10px] text-[#d8ff72]">{t("landing.steps")}</span>
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
                {t("landing.badge")}
              </div>
              <h1 className="max-w-4xl text-5xl font-black leading-[0.92] tracking-[-0.07em] sm:text-7xl lg:text-8xl">
                {t("landing.heroTitle")}
              </h1>
              <p className="mt-7 max-w-2xl text-base leading-8 text-white/68 sm:text-lg">
                {t("landing.heroDescription")}
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="bg-[#d8ff72] text-[#10261d] hover:bg-[#e8ff9e]">
                  <Link to="/auth/sign-up">
                    {t("landing.createWorkspace")}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white">
                  <Link to="/auth/sign-in">
                    <PlayCircle className="size-4" />
                    {t("landing.enterSystem")}
                  </Link>
                </Button>
              </div>
              <div className="mt-10 grid max-w-2xl grid-cols-3 border-y border-white/10 py-5">
                {[
                  [t("landing.steps"), t("landing.metricPipeline")],
                  ["70%", t("landing.metricThreshold")],
                  ["Audit", t("landing.metricAudit")],
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
                <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#10261d]/45">{t("landing.workflowEyebrow")}</div>
                <h2 className="mt-4 text-4xl font-black tracking-[-0.06em] sm:text-5xl">{t("landing.workflowTitle")}</h2>
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
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#10261d]/45">{t("landing.controlsEyebrow")}</div>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.06em] sm:text-5xl">{t("landing.controlsTitle")}</h2>
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
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#d8ff72]/70">{t("landing.securityEyebrow")}</div>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.06em] sm:text-5xl">{t("landing.securityTitle")}</h2>
              <p className="mt-6 max-w-xl text-sm leading-7 text-white/62">
                {t("landing.securityBody")}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-2 border border-white/15 px-3 py-2 text-sm text-white/70"><ShieldCheck className="size-4 text-[#d8ff72]" /> {t("landing.cognitoAccess")}</span>
                <span className="inline-flex items-center gap-2 border border-white/15 px-3 py-2 text-sm text-white/70"><LockKeyhole className="size-4 text-[#d8ff72]" /> {t("landing.presignedUpload")}</span>
                <span className="inline-flex items-center gap-2 border border-white/15 px-3 py-2 text-sm text-white/70"><FileText className="size-4 text-[#d8ff72]" /> {t("landing.evidenceTrail")}</span>
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
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#10261d]/55">{t("landing.ctaEyebrow")}</div>
              <h2 className="mt-3 max-w-3xl text-4xl font-black tracking-[-0.06em] sm:text-5xl">{t("landing.ctaTitle")}</h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-[#10261d] text-white hover:bg-[#1b3a2d]">
                <Link to="/auth/sign-up">{t("common.signUp")}</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-[#10261d]/30 bg-transparent hover:bg-[#10261d]/5">
                <Link to="/auth/sign-in">{t("common.signIn")}</Link>
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
            <Link to="/dashboard" className="hover:text-[#10261d]">{t("common.dashboard")}</Link>
            <Link to="/documents" className="hover:text-[#10261d]">{t("common.documents")}</Link>
            <Link to="/review" className="hover:text-[#10261d]">{t("common.review")}</Link>
            <Link to="/reports" className="hover:text-[#10261d]">{t("common.reports")}</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
