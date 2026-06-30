"use client"

import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileWarning,
  ListChecks,
  MailWarning,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  X,
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
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  formatDate,
  formatMoney,
  statusMeta,
  type DocumentRecord,
  type DocumentStatus,
} from "@/lib/docuflow-data"
import { useDocuFlowDocuments } from "@/lib/docuflow-store"
import { useAuth } from "@/contexts/auth-context"
import { isApiConfigured } from "@/lib/docuflow-api"
import { CONFIDENCE_THRESHOLD } from "@docuflow/shared-config"

type QueueFilter = "ALL" | "REVIEW_REQUIRED" | "FAILED" | "CORRECTED" | "LOW_CONFIDENCE" | "OLDEST"
type Priority = "High" | "Medium" | "Low"

const attentionStatuses: DocumentStatus[] = ["REVIEW_REQUIRED", "FAILED", "CORRECTED"]

function StatusBadge({ status }: { status: DocumentStatus }) {
  const meta = statusMeta[status]
  const Icon = meta.icon

  return (
    <Badge variant="outline" className={meta.tone}>
      <Icon className="size-3.5" />
      {meta.label}
    </Badge>
  )
}

function getAgeDays(updatedAt: string) {
  const diffMs = Date.now() - new Date(updatedAt).getTime()
  return Math.max(0, Math.floor(diffMs / 86_400_000))
}

function getPriority(document: DocumentRecord): Priority {
  const ageDays = getAgeDays(document.updatedAt)
  if (document.status === "FAILED" || document.confidenceScore < 0.5 || ageDays >= 3) return "High"
  if (document.status === "REVIEW_REQUIRED" || document.reviewReasons.length > 1 || ageDays >= 1) return "Medium"
  return "Low"
}

function priorityClass(priority: Priority) {
  if (priority === "High") return "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-500/10 dark:text-red-200"
  if (priority === "Medium") return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-500/10 dark:text-amber-200"
  return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200"
}

function actionLabel(status: DocumentStatus) {
  if (status === "CORRECTED") return "Approve"
  if (status === "FAILED") return "Inspect"
  return "Review"
}

function attentionReason(document: DocumentRecord) {
  if (document.status === "CORRECTED") return "Corrected fields are ready for approval."
  if (document.reviewReasons.length) return document.reviewReasons.join("; ")
  return document.errorMessage ?? "One or more required fields could not be confirmed."
}

function escapeCsv(value: string | number | null) {
  const text = String(value ?? "")
  return `"${text.replace(/"/g, '""')}"`
}

function exportReviewCsv(items: DocumentRecord[]) {
  const header = [
    "documentId",
    "fileName",
    "status",
    "priority",
    "vendor",
    "confidence",
    "ageDays",
    "reason",
    "updatedAt",
  ]
  const rows = items.map((document) => [
    document.documentId,
    document.fileName,
    document.status,
    getPriority(document),
    document.vendorName,
    Math.round(document.confidenceScore * 100),
    getAgeDays(document.updatedAt),
    attentionReason(document),
    document.updatedAt,
  ])
  const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n")
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `docuflow-review-queue-${new Date().toISOString().slice(0, 10)}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "default",
}: {
  label: string
  value: string | number
  detail: string
  icon: typeof Bell
  tone?: "default" | "warning" | "danger" | "success"
}) {
  const toneClass = {
    default: "border-border bg-background",
    warning: "border-amber-200 bg-amber-50/70 text-amber-950 dark:border-amber-900 dark:bg-amber-500/10 dark:text-amber-100",
    danger: "border-red-200 bg-red-50/70 text-red-950 dark:border-red-900 dark:bg-red-500/10 dark:text-red-100",
    success: "border-emerald-200 bg-emerald-50/70 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-100",
  }[tone]

  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] opacity-65">{label}</div>
          <div className="mt-2 text-2xl font-semibold">{value}</div>
        </div>
        <div className="rounded-lg border bg-background/70 p-2">
          <Icon className="size-4" />
        </div>
      </div>
      <div className="mt-3 text-xs opacity-70">{detail}</div>
    </div>
  )
}

function ReviewPreviewDrawer({ document }: { document: DocumentRecord }) {
  const priority = getPriority(document)
  const confidence = Math.round(document.confidenceScore * 100)

  return (
    <Drawer direction="right">
      <DrawerTrigger asChild>
        <Button variant="ghost" size="icon" className="cursor-pointer">
          <Eye className="size-4" />
          <span className="sr-only">Preview review item</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{document.fileName}</DrawerTitle>
          <DrawerDescription>
            {document.documentId} · {document.documentType} · {getAgeDays(document.updatedAt)} day(s) waiting
          </DrawerDescription>
        </DrawerHeader>
        <div className="grid gap-4 overflow-y-auto px-4 text-sm">
          <div className="grid gap-3 rounded-xl border bg-muted/20 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <StatusBadge status={document.status} />
              <Badge variant="outline" className={priorityClass(priority)}>{priority} priority</Badge>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-muted-foreground">Confidence</span>
                <span className="font-medium">{confidence}%</span>
              </div>
              <Progress value={confidence} className="h-2" />
            </div>
          </div>

          <div className="grid gap-3 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Vendor</span>
              <span className="text-right font-medium">{document.vendorName}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Date</span>
              <span className="font-medium">{document.invoiceDate}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Total</span>
              <span className="font-medium">{formatMoney(document.totalAmount, document.currency)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Tax</span>
              <span className="font-medium">
                {document.taxAmount === null ? "Not detected" : formatMoney(document.taxAmount, document.currency)}
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-amber-900 dark:border-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
            <div className="mb-2 flex items-center gap-2 font-medium">
              <FileWarning className="size-4" />
              Exception reason
            </div>
            <div className="leading-6">{attentionReason(document)}</div>
          </div>
        </div>
        <DrawerFooter>
          <Button asChild className="cursor-pointer">
            <Link to={`/documents/${document.documentId}`}>
              Open review workspace
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

export default function ReviewPage() {
  const { documents: allDocuments } = useDocuFlowDocuments()
  const { session } = useAuth()
  const role = session?.role ?? "finance"
  const apiMode = isApiConfigured()
  const documents =
    role === "finance"
      ? allDocuments.filter((document) => document.userId === session?.userId)
      : allDocuments
  const [query, setQuery] = useState("")
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("ALL")
  const alertItems = useMemo(
    () =>
      documents
        .filter((document) => attentionStatuses.includes(document.status))
        .sort((a, b) => {
          const priorityOrder: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 }
          const priorityDiff = priorityOrder[getPriority(a)] - priorityOrder[getPriority(b)]
          if (priorityDiff !== 0) return priorityDiff
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
        }),
    [documents]
  )

  const metrics = useMemo(() => {
    const reviewRequired = alertItems.filter((document) => document.status === "REVIEW_REQUIRED").length
    const failed = alertItems.filter((document) => document.status === "FAILED").length
    const corrected = alertItems.filter((document) => document.status === "CORRECTED").length
    const highPriority = alertItems.filter((document) => getPriority(document) === "High").length
    const oldestAge = alertItems.length
      ? Math.max(...alertItems.map((document) => getAgeDays(document.updatedAt)))
      : 0
    return { reviewRequired, failed, corrected, highPriority, oldestAge }
  }, [alertItems])

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return alertItems.filter((document) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          document.documentId,
          document.fileName,
          document.vendorName,
          document.status,
          document.documentType,
          document.reviewReasons.join(" "),
          document.errorMessage,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery)
      const matchesFilter =
        queueFilter === "ALL" ||
        document.status === queueFilter ||
        (queueFilter === "LOW_CONFIDENCE" && document.confidenceScore < CONFIDENCE_THRESHOLD) ||
        (queueFilter === "OLDEST" && getAgeDays(document.updatedAt) >= 1)
      return matchesQuery && matchesFilter
    })
  }, [alertItems, query, queueFilter])

  const clearFilters = () => {
    setQuery("")
    setQueueFilter("ALL")
  }

  const quickFilters: Array<{ key: QueueFilter; label: string; count: number }> = [
    { key: "ALL", label: "All", count: alertItems.length },
    { key: "REVIEW_REQUIRED", label: "Review required", count: metrics.reviewRequired },
    { key: "FAILED", label: "Failed", count: metrics.failed },
    { key: "CORRECTED", label: "Waiting approval", count: metrics.corrected },
    { key: "LOW_CONFIDENCE", label: "Low confidence", count: alertItems.filter((document) => document.confidenceScore < CONFIDENCE_THRESHOLD).length },
    { key: "OLDEST", label: "Older than 1d", count: alertItems.filter((document) => getAgeDays(document.updatedAt) >= 1).length },
  ]

  return (
    <BaseLayout
      title="Review queue"
      description={role === "admin"
        ? "Monitor unresolved documents across the system."
        : "Verify uncertain fields, resolve failed files, and approve your corrected results."}
    >
      <div className="grid gap-6 px-4 lg:px-6">
        <section className="overflow-hidden rounded-2xl border bg-[#0f2a22] text-white">
          <div className="grid gap-5 p-5 lg:grid-cols-[1fr_auto] lg:p-6">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge className="border-[#d8ff72]/40 bg-[#d8ff72]/15 font-mono text-[10px] uppercase tracking-[0.16em] text-[#d8ff72]">
                  {apiMode ? "AWS API mode" : "Local demo data"}
                </Badge>
                <Badge className="border-white/20 bg-white/10 text-white">
                  {role === "admin" ? "Admin exception monitor" : "Finance review workspace"}
                </Badge>
              </div>
              <h2 className="max-w-3xl text-2xl font-semibold tracking-tight sm:text-3xl">
                Exception queue and approval control
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
                Prioritize low-confidence, failed, and corrected documents before they become trusted finance records.
              </p>
            </div>
            <div className="grid min-w-64 gap-2 rounded-xl border border-white/15 bg-white/10 p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/55">Oldest unresolved</div>
              <div className="flex items-end justify-between gap-3">
                <span className="text-4xl font-semibold">{metrics.oldestAge}</span>
                <span className="pb-1 text-sm text-white/70">day(s)</span>
              </div>
              <div className="text-xs text-white/55">Sorted by priority, then by oldest update.</div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Pending review" value={alertItems.length} detail="All unresolved exception records" icon={Bell} tone={alertItems.length ? "warning" : "success"} />
          <MetricCard label="High priority" value={metrics.highPriority} detail="Failed, very low confidence, or stale" icon={ShieldAlert} tone={metrics.highPriority ? "danger" : "default"} />
          <MetricCard label="Needs correction" value={metrics.reviewRequired} detail="Fields require human verification" icon={FileWarning} />
          <MetricCard label="Waiting approval" value={metrics.corrected} detail="Corrections saved and ready to approve" icon={BadgeCheck} />
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Card>
            <CardHeader className="gap-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="size-5" />
                    Attention queue
                  </CardTitle>
                  <CardDescription>
                    {filteredItems.length} of {alertItems.length} exception records shown.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => exportReviewCsv(filteredItems)}
                  disabled={!filteredItems.length}
                >
                  <Download className="size-4" />
                  Export exceptions
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {quickFilters.map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setQueueFilter(filter.key)}
                    className={[
                      "rounded-full border px-3 py-1.5 text-sm transition-colors",
                      queueFilter === filter.key
                        ? "border-[#0f2a22] bg-[#0f2a22] text-white"
                        : "bg-background hover:border-foreground/30",
                    ].join(" ")}
                  >
                    {filter.label}
                    <span className="ml-2 font-mono text-xs opacity-65">{filter.count}</span>
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                <div className="relative max-w-xl flex-1">
                  <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search file, vendor, reason, or status..."
                    className="pl-9"
                  />
                </div>
                {(query || queueFilter !== "ALL") && (
                  <Button variant="ghost" className="cursor-pointer" onClick={clearFilters}>
                    <X className="size-4" />
                    Clear
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-xl border">
                <Table className="min-w-[980px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Age</TableHead>
                      <TableHead className="w-28" />
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((document) => {
                      const priority = getPriority(document)
                      const confidence = Math.round(document.confidenceScore * 100)

                      return (
                        <TableRow key={document.documentId}>
                          <TableCell>
                            <div className="font-medium">{document.fileName}</div>
                            <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
                              <span>{document.documentId}</span>
                              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{document.documentType}</Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={document.status} />
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={priorityClass(priority)}>{priority}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="min-w-28">
                              <div className="mb-1 text-xs font-medium">{confidence}%</div>
                              <Progress value={confidence} className="h-1.5" />
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[300px]">
                            <div className="line-clamp-2 text-sm leading-5">{attentionReason(document)}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Clock3 className="size-3.5 text-muted-foreground" />
                              {getAgeDays(document.updatedAt)}d
                            </div>
                            <div className="text-muted-foreground text-xs">{formatDate(document.updatedAt)}</div>
                          </TableCell>
                          <TableCell>
                            <Button asChild variant="outline" size="sm" className="cursor-pointer">
                              <Link to={`/documents/${document.documentId}`}>
                                {actionLabel(document.status)}
                                <ArrowRight className="size-3.5" />
                              </Link>
                            </Button>
                          </TableCell>
                          <TableCell>
                            <ReviewPreviewDrawer document={document} />
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {!filteredItems.length && (
                      <TableRow>
                        <TableCell colSpan={8} className="h-40 text-center">
                          <div className="mx-auto grid max-w-md place-items-center gap-3 py-8">
                            <div className="rounded-full border bg-muted/30 p-3">
                              {alertItems.length ? (
                                <SlidersHorizontal className="size-5 text-muted-foreground" />
                              ) : (
                                <CheckCircle2 className="size-5 text-emerald-600" />
                              )}
                            </div>
                            <div className="font-medium">
                              {alertItems.length ? "No review items match the current filters." : "Review queue clear."}
                            </div>
                            <div className="text-muted-foreground text-sm">
                              {alertItems.length
                                ? "Clear filters or search for another vendor, reason, or status."
                                : "All unresolved document exceptions are resolved for the current workspace."}
                            </div>
                            {alertItems.length ? (
                              <Button variant="outline" className="cursor-pointer" onClick={clearFilters}>
                                Clear filters
                              </Button>
                            ) : (
                              <Button asChild variant="outline" className="cursor-pointer">
                                <Link to="/documents">Back to documents</Link>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MailWarning className="size-5" />
                  Alert pipeline
                </CardTitle>
                <CardDescription>
                  Review queue is fed by confidence scoring and failed workflow signals.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span>Confidence threshold</span>
                  <Badge variant="outline">{Math.round(CONFIDENCE_THRESHOLD * 100)}%</Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span>Failed workflow alerts</span>
                  <Badge variant="outline">{metrics.failed}</Badge>
                </div>
                <div className="rounded-lg border bg-muted/25 p-3 leading-6">
                  SNS/SES alerts should land here as `REVIEW_REQUIRED` or `FAILED` records, then Finance resolves the source field issue in the document workspace.
                </div>
                {role === "admin" && (
                  <Button asChild variant="outline" className="cursor-pointer">
                    <Link to="/settings/notifications">
                      Open alert settings
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ListChecks className="size-5" />
                  Review checklist
                </CardTitle>
                <CardDescription>
                  Confirm the business fields before approval.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                {[
                  "Vendor matches the source document",
                  "Invoice date and currency are correct",
                  "Total and tax amounts reconcile",
                  "Review note explains any correction",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <BadgeCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                    <span>{item}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </BaseLayout>
  )
}
