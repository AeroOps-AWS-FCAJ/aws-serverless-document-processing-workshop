"use client"

import { useState } from "react"
import { BellRing, Check, CircleDollarSign, Mail, ShieldAlert, Siren, Workflow } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLanguage, type TranslationKey } from "@/lib/i18n"

type AlertKey = "workflowFailed" | "reviewRequired" | "dlqMessage" | "budgetThreshold"

const alertDefinitions: Array<{
  key: AlertKey
  labelKey: TranslationKey
  descriptionKey: TranslationKey
  signal: string
  icon: typeof Workflow
}> = [
  { key: "workflowFailed", labelKey: "alertSettings.workflowFailure", descriptionKey: "alertSettings.workflowFailureBody", signal: "FAILED", icon: Workflow },
  { key: "reviewRequired", labelKey: "alertSettings.lowConfidence", descriptionKey: "alertSettings.lowConfidenceBody", signal: "REVIEW_REQUIRED", icon: ShieldAlert },
  { key: "dlqMessage", labelKey: "alertSettings.dlqActivity", descriptionKey: "alertSettings.dlqActivityBody", signal: "DLQ > 0", icon: Siren },
  { key: "budgetThreshold", labelKey: "alertSettings.budgetThreshold", descriptionKey: "alertSettings.budgetThresholdBody", signal: "BUDGET", icon: CircleDollarSign },
]

export default function NotificationSettings() {
  const { t } = useLanguage()
  const [alerts, setAlerts] = useState<Record<AlertKey, boolean>>({
    workflowFailed: true,
    reviewRequired: true,
    dlqMessage: true,
    budgetThreshold: true,
  })
  const [frequency, setFrequency] = useState("instant")
  const [email, setEmail] = useState("docuflow-alerts@example.com")
  const [saved, setSaved] = useState(false)

  const toggleAlert = (key: AlertKey, checked: boolean) => {
    setAlerts((current) => ({ ...current, [key]: checked }))
    setSaved(false)
  }

  const savePreferences = () => {
    window.localStorage.setItem("docuflow.alert-preferences", JSON.stringify({ alerts, frequency, email }))
    setSaved(true)
  }

  return (
    <>
      <div className="grid gap-5 px-4 lg:px-6">
        <section className="relative overflow-hidden rounded-2xl border bg-[#10261d] text-white shadow-lg grid lg:grid-cols-[1fr_auto]">
          {/* Decorative circles to match Dashboard hero */}
          <div className="pointer-events-none absolute -right-16 -top-24 size-80 rounded-full border border-white/[0.06]" />
          <div className="pointer-events-none absolute -right-4 -top-12 size-52 rounded-full border border-[#d8ff72]/20" />

          <div className="relative p-5 md:p-6 z-10">
            <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.15em] text-[#d8ff72]">
              <span className="size-1.5 bg-[#d8ff72] rounded-full animate-pulse" /> {t("alertSettings.pathHealthy")}
            </div>
            <h2 className="mt-3 font-display text-2xl font-semibold tracking-[-0.04em]">CloudWatch → SNS → SES</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/58">{t("alertSettings.heroBody")}</p>
          </div>
          <div className="relative grid min-w-56 grid-cols-3 border-t border-white/15 lg:border-l lg:border-t-0 z-10">
            {["CloudWatch", "SNS", "SES"].map((step, index) => <div key={step} className="flex flex-col items-center justify-center gap-2 border-r border-white/15 p-4 last:border-r-0"><span className="font-mono text-[9px] text-white/35">0{index + 1}</span><span className="text-xs font-medium">{step}</span></div>)}
          </div>
        </section>

        <div className="grid items-start gap-5 xl:grid-cols-[1.25fr_.75fr]">
          <Card>
            <CardHeader className="border-b bg-muted/25">
              <CardTitle className="flex items-center gap-2"><BellRing className="size-4" /> {t("alertSettings.subscriptions")}</CardTitle>
              <CardDescription>{t("alertSettings.subscriptionsBody")}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {alertDefinitions.map((item) => {
                const Icon = item.icon
                const label = t(item.labelKey)
                return (
                  <Label key={item.key} htmlFor={item.key} className="grid cursor-pointer grid-cols-[auto_1fr_auto] items-start gap-4 border-b p-4 last:border-b-0 hover:bg-muted/30">
                    <div className="mt-0.5 flex size-9 items-center justify-center border bg-background"><Icon className="size-4 text-primary" /></div>
                    <div><div className="text-sm font-semibold">{label}</div><p className="mt-1 text-xs leading-5 text-muted-foreground">{t(item.descriptionKey)}</p><Badge variant="outline" className="mt-2">{item.signal}</Badge></div>
                    <Checkbox id={item.key} checked={alerts[item.key]} onCheckedChange={(value) => toggleAlert(item.key, value === true)} aria-label={t("alertSettings.enable", { label })} />
                  </Label>
                )
              })}
            </CardContent>
          </Card>

          <div className="grid gap-5">
            <Card>
              <CardHeader className="border-b bg-muted/25">
                <CardTitle className="flex items-center gap-2"><Mail className="size-4" /> {t("alertSettings.delivery")}</CardTitle>
                <CardDescription>{t("alertSettings.deliveryBody")}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5 pt-5">
                <div className="grid gap-2"><Label htmlFor="alert-email">{t("alertSettings.recipient")}</Label><Input id="alert-email" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setSaved(false) }} /></div>
                <div className="grid gap-2"><Label htmlFor="alert-frequency">{t("alertSettings.cadence")}</Label><Select value={frequency} onValueChange={(value) => { setFrequency(value); setSaved(false) }}><SelectTrigger id="alert-frequency" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="instant">{t("alertSettings.instant")}</SelectItem><SelectItem value="hourly">{t("alertSettings.hourly")}</SelectItem><SelectItem value="daily">{t("alertSettings.daily")}</SelectItem></SelectContent></Select></div>
                <div className="border bg-muted/25 p-3 text-xs leading-5 text-muted-foreground"><span className="font-semibold text-foreground">{t("alertSettings.securityBoundary")}</span> {t("alertSettings.securityBoundaryBody")}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>{t("alertSettings.configuration")}</CardTitle></CardHeader>
              <CardContent className="grid gap-3">
                <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">{t("alertSettings.activeRules")}</span><span className="font-mono">{Object.values(alerts).filter(Boolean).length} / 4</span></div>
                <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">{t("alertSettings.channel")}</span><span className="font-mono">SNS + SES</span></div>
                <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">{t("alertSettings.status")}</span><Badge variant="outline" className="text-emerald-700">{t("alertSettings.configured")}</Badge></div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-h-5 text-sm text-emerald-700" role="status">{saved && <span className="flex items-center gap-2"><Check className="size-4" />{t("alertSettings.saved")}</span>}</div>
          <Button onClick={savePreferences} className="sm:min-w-40">{t("alertSettings.save")}</Button>
        </div>
      </div>
    </>
  )
}
