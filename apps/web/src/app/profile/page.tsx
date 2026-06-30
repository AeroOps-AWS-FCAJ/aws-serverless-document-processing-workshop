"use client"

import { Link, useNavigate } from "react-router-dom"
import {
  ArrowRight,
  BadgeCheck,
  BellDot,
  CheckCircle2,
  FileSearch,
  KeyRound,
  LockKeyhole,
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
import {
  clearDocuFlowSession,
  getDocuFlowSession,
  roleLabels,
} from "@/lib/auth"
import { roleCapabilities } from "@/lib/docuflow-data"
import { useDocuFlowDocuments } from "@/lib/docuflow-store"

const workspaceLinks = [
  { label: "Upload", to: "/upload", icon: UploadCloud },
  { label: "Documents", to: "/documents", icon: FileSearch },
  { label: "Review queue", to: "/review", icon: BellDot },
  { label: "Reports", to: "/reports", icon: BadgeCheck },
  { label: "Notifications", to: "/notifications", icon: BellDot },
  { label: "Activity", to: "/activity", icon: Workflow },
]

const securityClaims = [
  "Role-based workspace access is enforced by protected routes.",
  "Raw invoice and receipt files stay in private S3 storage.",
  "External AI API keys never enter the browser session.",
  "Review actions record reviewer identity and timestamps.",
]

export default function ProfilePage() {
  const navigate = useNavigate()
  const session = getDocuFlowSession()
  const { documents } = useDocuFlowDocuments()
  const role = session?.role ?? "finance"
  const capability = roleCapabilities.find((item) => item.role === role)
  const visibleDocuments = documents.filter((document) => role === "admin" || document.userId === session?.userId)
  const reviewCount = visibleDocuments.filter((document) =>
    ["REVIEW_REQUIRED", "FAILED", "CORRECTED"].includes(document.status)
  ).length

  const handleLogout = () => {
    clearDocuFlowSession()
    navigate("/auth/sign-in", { replace: true })
  }

  return (
    <BaseLayout
      title="Profile"
      description="Workspace identity, role permissions, and demo Cognito claims."
    >
      <section className="px-4 lg:px-6">
        <div className="overflow-hidden border bg-[#10261d] text-white">
          <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="p-5 sm:p-7">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-[#d8ff72]/40 bg-[#d8ff72]/15 font-mono text-[10px] uppercase text-[#d8ff72]">
                  Workspace identity
                </Badge>
                <Badge variant="outline" className="border-white/20 bg-white/5 font-mono text-[10px] uppercase text-white/75">
                  Cognito demo claims
                </Badge>
              </div>
              <h2 className="mt-5 max-w-3xl font-display text-3xl font-semibold leading-tight text-white md:text-5xl">
                {session?.name ?? "Signed-in user"}
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/62">
                This profile mirrors the Cognito identity story for the demo: role, workspace scope,
                user-owned documents, review access, and security boundaries.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button asChild className="bg-[#d8ff72] text-[#10261d] hover:bg-[#c7ee5f]">
                  <Link to="/documents">
                    Open my documents
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button type="button" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={handleLogout}>
                  <LogOut className="size-4" />
                  Log out
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 border-t border-white/12 xl:border-l xl:border-t-0">
              {[
                { label: "Role", value: roleLabels[role], icon: UserRound },
                { label: "Documents", value: visibleDocuments.length, icon: FileSearch },
                { label: "Needs review", value: reviewCount, icon: BellDot },
                { label: "Session", value: "Active", icon: CheckCircle2 },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="border-b border-r border-white/12 p-4 last:border-r-0 sm:p-5">
                    <div className="mb-8 flex items-center justify-between gap-3">
                      <Icon className="size-4 text-[#d8ff72]" />
                      <span className="font-mono text-[10px] text-white/35">ID</span>
                    </div>
                    <div className="text-xl font-semibold text-white sm:text-2xl">{item.value}</div>
                    <div className="mt-1 text-xs text-white/50">{item.label}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 px-4 xl:grid-cols-[minmax(360px,0.8fr)_minmax(0,1.2fr)] lg:px-6">
        <div className="grid gap-5">
          <Card>
            <CardHeader className="border-b bg-muted/25">
              <CardTitle className="flex items-center gap-2">
                <UserRound className="size-5" />
                Account details
              </CardTitle>
              <CardDescription>Local demo session that stands in for Cognito claims.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 pt-5">
              {[
                ["Name", session?.name ?? "Unknown"],
                ["Email", session?.email ?? "Unknown"],
                ["User ID", session?.userId ?? "Unknown"],
                ["Role", roleLabels[role]],
              ].map(([label, value]) => (
                <div key={label} className="grid gap-1 border p-3">
                  <div className="font-mono text-[10px] uppercase text-muted-foreground">{label}</div>
                  <div className="break-all text-sm font-medium">{value}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b bg-muted/25">
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="size-5" />
                Demo token claims
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 pt-5">
              {[
                ["cognito:groups", role],
                ["scope", role === "admin" ? "documents:* operations:*" : "documents:own review:own"],
                ["aud", "docuflow-ai-web"],
                ["iss", "local-demo-cognito"],
              ].map(([claim, value]) => (
                <div key={claim} className="grid gap-1 border bg-muted/20 p-3">
                  <div className="font-mono text-[10px] text-muted-foreground">{claim}</div>
                  <div className="font-mono text-xs">{value}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-5">
          <Card>
            <CardHeader className="border-b bg-muted/25">
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-5" />
                Role capabilities
              </CardTitle>
              <CardDescription>{capability?.description}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 pt-5 md:grid-cols-3">
              {[
                ["Upload", capability?.canUpload],
                ["Review", capability?.canReview],
                ["Operate", capability?.canOperate],
              ].map(([label, enabled]) => (
                <div key={label as string} className="border p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <span className="font-medium">{label as string}</span>
                    <Badge variant="outline" className={enabled ? "border-emerald-200 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300" : "border-muted-foreground/30 text-muted-foreground"}>
                      {enabled ? "Allowed" : "Restricted"}
                    </Badge>
                  </div>
                  <div className="text-sm leading-6 text-muted-foreground">
                    {enabled ? "Available in this workspace." : "Reserved for admin operations."}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b bg-muted/25">
              <CardTitle className="flex items-center gap-2">
                <Workflow className="size-5" />
                Workspace shortcuts
              </CardTitle>
              <CardDescription>Common user workflows from this account.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 pt-5 sm:grid-cols-2 xl:grid-cols-3">
              {workspaceLinks.map((link) => {
                const Icon = link.icon
                return (
                  <Button key={link.to} asChild variant="outline" className="h-auto justify-between p-4">
                    <Link to={link.to}>
                      <span className="flex items-center gap-2">
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

          <Card>
            <CardHeader className="border-b bg-muted/25">
              <CardTitle className="flex items-center gap-2">
                <LockKeyhole className="size-5" />
                Security boundary
              </CardTitle>
              <CardDescription>What this user session should demonstrate.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 pt-5 md:grid-cols-2">
              {securityClaims.map((claim) => (
                <div key={claim} className="flex items-start gap-3 border p-3">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  <span className="text-sm leading-6">{claim}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </BaseLayout>
  )
}
