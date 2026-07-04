import type { ReactNode } from "react"
import { Check, Cloud, FileCheck2, ScanText } from "lucide-react"
import { LanguageToggle } from "@/components/language-toggle"
import { Logo } from "@/components/logo"
import { useLanguage } from "@/lib/i18n"

interface AuthShellProps {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
}

export function AuthShell({ eyebrow, title, description, children }: AuthShellProps) {
  const { t } = useLanguage()
  const stages = [
    { label: t("auth.stageIntake"), detail: "Cognito + presigned S3 upload", icon: Cloud },
    { label: t("auth.stageExtract"), detail: "Textract AnalyzeExpense", icon: ScanText },
    { label: t("auth.stageResult"), detail: "AI normalization + human review", icon: FileCheck2 },
  ]

  return (
    <main className="grid min-h-svh bg-[#f3f1e9] text-[#11251d] lg:grid-cols-[1.08fr_0.92fr]">
      <section className="paper-noise relative hidden min-h-svh overflow-hidden bg-[#10261d] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="absolute -left-32 top-1/3 size-[520px] rounded-full border border-white/10" />
        <div className="absolute -left-12 top-[42%] size-80 rounded-full border border-[#d8ff72]/25" />
        <a href="/" className="relative flex w-fit items-center gap-3">
          <div className="flex size-10 items-center justify-center bg-[#d8ff72] text-[#10261d]">
            <Logo size={27} />
          </div>
          <div>
            <div className="font-display text-lg font-semibold tracking-[-0.035em]">DocuFlow AI</div>
            <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/45">{t("brand.tagline")}</div>
          </div>
        </a>

        <div className="relative max-w-2xl py-16">
          <div className="mb-6 inline-flex items-center gap-2 border border-white/15 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#d8ff72]">
            <span className="size-1.5 bg-[#d8ff72]" />
            {t("auth.architecture")}
          </div>
          <h1 className="font-display text-5xl font-semibold leading-[1.02] tracking-[-0.065em] xl:text-7xl">
            {t("auth.heroTitle")}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-white/60">
            {t("auth.heroDescription")}
          </p>
        </div>

        <div className="relative grid grid-cols-3 border-y border-white/15">
          {stages.map((stage, index) => {
            const Icon = stage.icon
            return (
              <div key={stage.label} className="border-r border-white/15 p-4 last:border-r-0 xl:p-5">
                <div className="mb-6 flex items-center justify-between">
                  <Icon className="size-4 text-[#d8ff72]" />
                  <span className="font-mono text-[9px] text-white/30">0{index + 1}</span>
                </div>
                <div className="text-sm font-medium">{stage.label}</div>
                <div className="mt-1 text-xs leading-5 text-white/45">{stage.detail}</div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="relative flex min-h-svh items-center justify-center p-5 sm:p-10">
        <div className="absolute inset-x-0 top-0 flex items-center justify-between border-b border-black/10 px-5 py-4 lg:hidden">
          <a href="/" className="flex items-center gap-2 font-display font-semibold">
            <div className="flex size-8 items-center justify-center bg-[#153f30] text-white">
              <Logo size={21} />
            </div>
            DocuFlow AI
          </a>
          <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-[#647069]">
            <Check className="size-3" />
            {t("auth.secureAccess")}
          </span>
        </div>
        <div className="absolute right-5 top-20 lg:right-8 lg:top-8">
          <LanguageToggle />
        </div>
        <div className="w-full max-w-md pt-16 lg:pt-0">
          <div className="mb-8">
            <div className="font-mono text-[10px] uppercase tracking-[0.17em] text-[#647069]">{eyebrow}</div>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-[-0.055em] text-[#11251d]">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-[#647069]">{description}</p>
          </div>
          {children}
        </div>
      </section>
    </main>
  )
}
