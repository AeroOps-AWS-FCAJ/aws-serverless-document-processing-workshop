"use client"

import { useState } from "react"
import { BellRing, Check, CircleDollarSign, Mail, ShieldAlert, Siren, Workflow } from "lucide-react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type AlertKey = "workflowFailed" | "reviewRequired" | "dlqMessage" | "budgetThreshold"

const alertDefinitions: Array<{
  key: AlertKey
  label: string
  description: string
  signal: string
  icon: typeof Workflow
}> = [
  { key: "workflowFailed", label: "Workflow failure", description: "Step Functions, Textract, AI Proxy, or persistence failure.", signal: "FAILED", icon: Workflow },
  { key: "reviewRequired", label: "Low-confidence result", description: "A finance user must verify one or more extracted fields.", signal: "REVIEW_REQUIRED", icon: ShieldAlert },
  { key: "dlqMessage", label: "DLQ activity", description: "A queued processing job exhausted its retry policy.", signal: "DLQ > 0", icon: Siren },
  { key: "budgetThreshold", label: "Budget threshold", description: "AWS spend reaches a configured workshop guardrail.", signal: "BUDGET", icon: CircleDollarSign },
]

export default function NotificationSettings() {
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
    <BaseLayout
      title="Alert control"
      description="Configure how operational failures, low-confidence results, queue exceptions, and budget events reach the team."
    >
      <div className="grid gap-5 px-4 lg:px-6">
        <section className="grid overflow-hidden border bg-[#10261d] text-white lg:grid-cols-[1fr_auto]">
          <div className="p-5 md:p-6">
            <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.15em] text-[#d8ff72]"><span className="size-1.5 bg-[#d8ff72]" /> Alert path healthy</div>
            <h2 className="mt-3 font-display text-2xl font-semibold tracking-[-0.04em]">CloudWatch → SNS → SES</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/58">The frontend manages demo preferences only. Production delivery is enforced by the approved AWS alerting path.</p>
          </div>
          <div className="grid min-w-56 grid-cols-3 border-t border-white/15 lg:border-l lg:border-t-0">
            {["CloudWatch", "SNS", "SES"].map((step, index) => <div key={step} className="flex flex-col items-center justify-center gap-2 border-r border-white/15 p-4 last:border-r-0"><span className="font-mono text-[9px] text-white/35">0{index + 1}</span><span className="text-xs font-medium">{step}</span></div>)}
          </div>
        </section>

        <div className="grid items-start gap-5 xl:grid-cols-[1.25fr_.75fr]">
          <Card>
            <CardHeader className="border-b bg-muted/25">
              <CardTitle className="flex items-center gap-2"><BellRing className="size-4" /> Event subscriptions</CardTitle>
              <CardDescription>Only signals defined in the admin-approved architecture are exposed.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {alertDefinitions.map((item) => {
                const Icon = item.icon
                return (
                  <Label key={item.key} htmlFor={item.key} className="grid cursor-pointer grid-cols-[auto_1fr_auto] items-start gap-4 border-b p-4 last:border-b-0 hover:bg-muted/30">
                    <div className="mt-0.5 flex size-9 items-center justify-center border bg-background"><Icon className="size-4 text-primary" /></div>
                    <div><div className="text-sm font-semibold">{item.label}</div><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p><Badge variant="outline" className="mt-2">{item.signal}</Badge></div>
                    <Checkbox id={item.key} checked={alerts[item.key]} onCheckedChange={(value) => toggleAlert(item.key, value === true)} aria-label={`Enable ${item.label}`} />
                  </Label>
                )
              })}
            </CardContent>
          </Card>

          <div className="grid gap-5">
            <Card>
              <CardHeader className="border-b bg-muted/25">
                <CardTitle className="flex items-center gap-2"><Mail className="size-4" /> Delivery</CardTitle>
                <CardDescription>SES demo recipient and notification cadence.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5 pt-5">
                <div className="grid gap-2"><Label htmlFor="alert-email">Alert recipient</Label><Input id="alert-email" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setSaved(false) }} /></div>
                <div className="grid gap-2"><Label htmlFor="alert-frequency">Delivery cadence</Label><Select value={frequency} onValueChange={(value) => { setFrequency(value); setSaved(false) }}><SelectTrigger id="alert-frequency" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="instant">Instant</SelectItem><SelectItem value="hourly">Hourly digest</SelectItem><SelectItem value="daily">Daily digest</SelectItem></SelectContent></Select></div>
                <div className="border bg-muted/25 p-3 text-xs leading-5 text-muted-foreground"><span className="font-semibold text-foreground">Security boundary:</span> external AI keys, request payloads, and raw invoice data are never included in notification content.</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Configuration state</CardTitle></CardHeader>
              <CardContent className="grid gap-3">
                <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Active rules</span><span className="font-mono">{Object.values(alerts).filter(Boolean).length} / 4</span></div>
                <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Channel</span><span className="font-mono">SNS + SES</span></div>
                <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Status</span><Badge variant="outline" className="text-emerald-700">Configured</Badge></div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-h-5 text-sm text-emerald-700" role="status">{saved && <span className="flex items-center gap-2"><Check className="size-4" />Preferences saved to this demo workspace.</span>}</div>
          <Button onClick={savePreferences} className="sm:min-w-40">Save preferences</Button>
        </div>
      </div>
    </BaseLayout>
  )
}
