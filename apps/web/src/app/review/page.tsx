"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import {
  ArrowRight, BadgeCheck, Bell, CheckCircle2, Clock3, Download, Eye,
  FileWarning, ListChecks, MailWarning, Search, ShieldAlert, Trash2, X,
} from "lucide-react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate, formatMoney, statusMeta, type DocumentRecord, type DocumentStatus } from "@/lib/docuflow-data"
import { useDocuFlowDocuments } from "@/lib/docuflow-store"
import { deleteDocument as deleteDocumentApi, deleteDocuments as deleteDocumentsApi } from "@/lib/docuflow-api"
import { SpotlightCard } from "@/components/spotlight-card"
import { useAuth } from "@/contexts/auth-context"
import { useDocumentsSync } from "@/hooks/use-documents-sync"
import { CONFIDENCE_THRESHOLD } from "@docuflow/shared-config"
import { TableBulkControls, type BulkTableColumn, type TableColumnVisibility } from "@/components/table-bulk-controls"
import { TablePagination } from "@/components/table-pagination"
import { TableSkeletonRows } from "@/components/table-skeleton-rows"
import { toast } from "sonner"
import { useLanguage, type TranslationKey } from "@/lib/i18n"

type QueueFilter = "ALL" | "REVIEW_REQUIRED" | "FAILED" | "CORRECTED" | "LOW_CONFIDENCE" | "OLDEST"
type Priority = "HIGH" | "MEDIUM" | "LOW"

const attentionStatuses: DocumentStatus[] = ["REVIEW_REQUIRED", "FAILED", "CORRECTED"]
const reviewTableColumnDefinitions: Array<Omit<BulkTableColumn, "label"> & { labelKey: TranslationKey }> = [
  { key: "document", labelKey: "dashboard.document", locked: true },
  { key: "status", labelKey: "dashboard.status" },
  { key: "priority", labelKey: "review.priority" },
  { key: "confidence", labelKey: "dashboard.confidence" },
  { key: "reason", labelKey: "review.reason" },
  { key: "age", labelKey: "review.date" },
  { key: "action", labelKey: "documents.actionColumn", locked: true },
]

const defaultReviewColumnVisibility = reviewTableColumnDefinitions.reduce<TableColumnVisibility>((visibility, column) => {
  visibility[column.key] = true
  return visibility
}, {})

function StatusBadge({ status }: { status: DocumentStatus }) {
  const { t } = useLanguage()
  const meta = statusMeta[status]; const Icon = meta.icon
  return <Badge variant="outline" className={meta.tone}><Icon className="size-3" />{t(`status.${status}` as TranslationKey)}</Badge>
}

function getAgeDays(updatedAt: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86_400_000))
}

function getPriority(d: DocumentRecord): Priority {
  const age = getAgeDays(d.updatedAt)
  if (d.status === "FAILED" || d.confidenceScore < 0.5 || age >= 3) return "HIGH"
  if (d.status === "REVIEW_REQUIRED" || (Array.isArray(d.reviewReasonCodes) && d.reviewReasonCodes.length > 1) || age >= 1) return "MEDIUM"
  return "LOW"
}

function priorityClass(p: Priority) {
  if (p === "HIGH") return "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300"
  if (p === "MEDIUM") return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-300"
  return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-300"
}

function displayPriority(t: (key: TranslationKey, values?: Record<string, string | number>) => string, p: Priority) {
  if (p === "HIGH") return t("review.priorityHigh")
  if (p === "MEDIUM") return t("review.priorityMedium")
  return t("review.priorityLow")
}

function actionLabel(status: DocumentStatus, t: (key: TranslationKey, values?: Record<string, string | number>) => string) {
  if (status === "CORRECTED") return t("review.actionApprove")
  if (status === "FAILED") return t("review.actionInspect")
  return t("review.actionReview")
}

function attentionReason(d: DocumentRecord, t?: (key: TranslationKey, values?: Record<string, string | number>) => string) {
  if (d.status === "CORRECTED") return t ? t("review.reasonCorrected") : "Fields corrected, ready for approval."
  if (Array.isArray(d.reviewReasonCodes) && d.reviewReasonCodes.length) return d.reviewReasonCodes.join("; ")
  return d.errorMessage ?? (t ? t("review.reasonFallback") : "One or more required fields could not be confirmed.")
}

function escapeCsv(v: string | number | null) { return `"${String(v ?? "").replace(/"/g, '""')}"` }

function exportReviewCsv(items: DocumentRecord[]) {
  const header = ["documentId","originalFileName","status","priority","vendor","confidence","ageDays","reason","updatedAt"]
  const rows = items.map((d) => [d.documentId,d.originalFileName,d.status,getPriority(d),d.vendorName,Math.round(d.confidenceScore*100),getAgeDays(d.updatedAt),attentionReason(d),d.updatedAt])
  const csv = [header,...rows].map((r)=>r.map(escapeCsv).join(",")).join("\n")
  const url = URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}))
  const a = document.createElement("a"); a.href=url; a.download=`docuflow-review-queue-${new Date().toISOString().slice(0,10)}.csv`; a.click()
  URL.revokeObjectURL(url)
}

function MetricCard({ label, value, detail, icon: Icon, tone="default" }: {
  label:string; value:string|number; detail:string; icon:typeof Bell; tone?:"default"|"warning"|"danger"|"success"
}) {
  const cls={default:"border-border bg-card",warning:"border-amber-200 bg-amber-50/80 text-amber-900 dark:border-amber-900 dark:bg-amber-500/10 dark:text-amber-100",danger:"border-red-200 bg-red-50/80 text-red-900 dark:border-red-900 dark:bg-red-500/10 dark:text-red-100",success:"border-emerald-200 bg-emerald-50/80 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-100"}[tone]
  return (
    <SpotlightCard className={`rounded-xl border p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${cls}`}>
      <div className="flex items-start justify-between gap-3">
        <div><div className="font-mono text-[9px] uppercase tracking-[0.16em] opacity-60">{label}</div><div className="mt-2 text-2xl font-semibold">{value}</div></div>
        <div className="rounded-lg border bg-background/80 p-2"><Icon className="size-4" /></div>
      </div>
      <div className="mt-3 text-xs opacity-65 leading-4">{detail}</div>
    </SpotlightCard>
  )
}

function ReviewPreviewDrawer({ document: d }: { document: DocumentRecord }) {
  const { t } = useLanguage()
  const priority = getPriority(d); const confidence = Math.round(d.confidenceScore * 100)
  const priorityLabel = displayPriority(t, priority)
  return (
    <Drawer direction="right">
      <DrawerTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 cursor-pointer text-muted-foreground hover:text-foreground">
          <Eye className="size-4" /><span className="sr-only">{t("review.preview")}</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="truncate">{d.originalFileName}</DrawerTitle>
          <DrawerDescription className="font-mono text-[10px]">
            {d.documentId} · {d.documentType} · {t("review.waitingDays", { days: getAgeDays(d.updatedAt) })}
          </DrawerDescription>
        </DrawerHeader>
        <div className="grid gap-3 overflow-y-auto px-4 text-sm">
          <div className="grid gap-3 rounded-xl border bg-muted/20 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <StatusBadge status={d.status} />
              <Badge variant="outline" className={priorityClass(priority)}>{t("review.priorityPrefix", { priority: priorityLabel })}</Badge>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{t("dashboard.confidence")}</span><span className="font-semibold">{confidence}%</span>
              </div>
              <Progress value={confidence} className={`h-1.5 ${confidence < 80 ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500"}`} />
            </div>
          </div>
          <div className="grid gap-2.5 rounded-xl border p-3">
            {[[t("review.vendor"),d.vendorName],[t("review.date"),d.invoiceDate],[t("dashboard.amount"),formatMoney(d.totalAmount,d.currency)],[t("review.tax"),d.taxAmount==null?t("common.notDetected"):formatMoney(d.taxAmount,d.currency)]].map(([l,v])=>(
              <div key={l} className="flex items-start justify-between gap-4 text-xs">
                <span className="text-muted-foreground shrink-0">{l}</span><span className="text-right font-medium">{v}</span>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-amber-900 dark:border-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
            <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold"><FileWarning className="size-3.5" />{t("review.exceptionReason")}</div>
            <div className="text-xs leading-5">{attentionReason(d, t)}</div>
          </div>
        </div>
        <DrawerFooter>
          <Button asChild className="cursor-pointer"><Link to={`/documents/${d.documentId}`}>{t("review.openReviewSpace")}<ArrowRight className="size-4" /></Link></Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

function ConfirmDeleteDialog({
  trigger,
  title,
  description,
  confirmLabel,
  isDeleting,
  onConfirm,
}: {
  trigger: ReactNode
  title: string
  description: string
  confirmLabel: string
  isDeleting: boolean
  onConfirm: () => Promise<boolean>
}) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)

  const handleConfirm = async () => {
    const confirmed = await onConfirm()
    if (confirmed) setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!isDeleting) setOpen(nextOpen) }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" className="cursor-pointer" onClick={() => setOpen(false)} disabled={isDeleting}>
            {t("review.cancel")}
          </Button>
          <Button type="button" variant="destructive" className="cursor-pointer" onClick={handleConfirm} disabled={isDeleting}>
            {isDeleting ? <Clock3 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function ReviewPage() {
  const { documents: allDocuments, mergeDocuments, removeDocument, removeDocuments } = useDocuFlowDocuments()
  const { session } = useAuth()
  const { t } = useLanguage()
  const role = session?.role ?? "finance"
  const { apiMode, isSyncing, refreshDocuments, syncMessage } = useDocumentsSync(mergeDocuments)
  const documents = role === "finance" ? allDocuments.filter((d) => d.userId === session?.userId) : allDocuments
  const [query, setQuery] = useState("")
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("ALL")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [isPageLoading, setIsPageLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const pageLoadingTimer = useRef<number | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [columnVisibility, setColumnVisibility] = useState<TableColumnVisibility>(defaultReviewColumnVisibility)
  const reviewTableColumns = useMemo<BulkTableColumn[]>(
    () => reviewTableColumnDefinitions.map(({ labelKey, ...column }) => ({ ...column, label: t(labelKey) })),
    [t],
  )

  useEffect(() => {
    return () => {
      if (pageLoadingTimer.current) window.clearTimeout(pageLoadingTimer.current)
    }
  }, [])

  const alertItems = useMemo(() =>
    documents.filter((d) => attentionStatuses.includes(d.status))
      .sort((a, b) => {
        const po: Record<Priority, number> = { "HIGH": 0, "MEDIUM": 1, "LOW": 2 }
        const pd = po[getPriority(a)] - po[getPriority(b)]
        return pd !== 0 ? pd : new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
      }), [documents])

  const metrics = useMemo(() => ({
    reviewRequired: alertItems.filter((d) => d.status === "REVIEW_REQUIRED").length,
    failed: alertItems.filter((d) => d.status === "FAILED").length,
    corrected: alertItems.filter((d) => d.status === "CORRECTED").length,
    highPriority: alertItems.filter((d) => getPriority(d) === "HIGH").length,
    oldestAge: alertItems.length ? Math.max(...alertItems.map((d) => getAgeDays(d.updatedAt))) : 0,
  }), [alertItems])

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase()
    return alertItems.filter((d) => {
      const mq = !q || [d.documentId,d.originalFileName,d.vendorName,d.status,d.documentType,Array.isArray(d.reviewReasonCodes) ? d.reviewReasonCodes.join(" ") : "",d.errorMessage].join(" ").toLowerCase().includes(q)
      const mf = queueFilter==="ALL" || d.status===queueFilter
        || (queueFilter==="LOW_CONFIDENCE" && d.confidenceScore < CONFIDENCE_THRESHOLD)
        || (queueFilter==="OLDEST" && getAgeDays(d.updatedAt) >= 1)
      return mq && mf
    })
  }, [alertItems, query, queueFilter])

  const selectedItems = useMemo(() => filteredItems.filter((d) => selectedIds.includes(d.documentId)), [filteredItems, selectedIds])
  const allVisibleSelected = filteredItems.length > 0 && filteredItems.every((d) => selectedIds.includes(d.documentId))
  const totalItems = filteredItems.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const paginatedItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const showPageSkeleton = () => {
    if (pageLoadingTimer.current) window.clearTimeout(pageLoadingTimer.current)
    setIsPageLoading(true)
    pageLoadingTimer.current = window.setTimeout(() => setIsPageLoading(false), 220)
  }

  const handlePageChange = (page: number) => {
    const nextPage = Math.min(Math.max(page, 1), totalPages)
    if (nextPage === currentPage) return
    setCurrentPage(nextPage)
    showPageSkeleton()
  }

  const handlePageSizeChange = (nextPageSize: number) => {
    if (nextPageSize === pageSize) return
    setPageSize(nextPageSize)
    setCurrentPage(1)
    showPageSkeleton()
  }

  const resetPage = () => {
    setCurrentPage(1)
    setIsPageLoading(false)
  }

  const toggleSelected = (id: string, checked: boolean) => setSelectedIds((current) => checked ? Array.from(new Set([...current, id])) : current.filter((item) => item !== id))
  const toggleAllVisible = (checked: boolean) => {
    setSelectedIds((current) => {
      const ids = filteredItems.map((d) => d.documentId)
      return checked ? Array.from(new Set([...current, ...ids])) : current.filter((id) => !ids.includes(id))
    })
  }
  const setColumnVisible = (key: string, visible: boolean) => {
    const column = reviewTableColumns.find((item) => item.key === key)
    if (column?.locked) return
    setColumnVisibility((current) => ({ ...current, [key]: visible }))
  }
  const resetColumns = () => setColumnVisibility(defaultReviewColumnVisibility)
  const isColumnVisible = (key: string) => columnVisibility[key] !== false
  const visibleColumnCount = 2 + reviewTableColumns.filter((column) => isColumnVisible(column.key)).length

  const handleDeleteDocument = async (document: DocumentRecord) => {
    setIsDeleting(true)
    try {
      await deleteDocumentApi(document.documentId)
      removeDocument(document.documentId)
      setSelectedIds((current) => current.filter((id) => id !== document.documentId))
      toast.success(t("review.deletedOne", { name: document.originalFileName }))
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("review.deleteOneFailed"))
      return false
    } finally {
      setIsDeleting(false)
    }
  }

  const handleBulkDeleteDocuments = async () => {
    if (!selectedItems.length) return false

    const ids = selectedItems.map((document) => document.documentId)
    setIsDeleting(true)
    try {
      await deleteDocumentsApi(ids)
      removeDocuments(ids)
      setSelectedIds([])
      toast.success(t("review.deletedMany", { count: ids.length }))
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("review.deleteManyFailed"))
      return false
    } finally {
      setIsDeleting(false)
    }
  }

  const handleExportReview = (items: DocumentRecord[]) => {
    exportReviewCsv(items)
    toast.success(t("toast.exportedCsv"))
  }

  const handleRefreshReview = async () => {
    const toastId = toast.loading(t("toast.refreshStarted"))
    const result = await refreshDocuments()
    toast.success(result.count > 0 ? t("sync.success", { total: result.count }) : t("toast.refreshComplete"), {
      id: toastId,
    })
  }

  const quickFilters: Array<{key: QueueFilter; label: string; count: number}> = [
    { key:"ALL", label:t("review.all"), count:alertItems.length },
    { key:"REVIEW_REQUIRED", label:t("review.needsReview"), count:metrics.reviewRequired },
    { key:"FAILED", label:t("documents.failed"), count:metrics.failed },
    { key:"CORRECTED", label:t("review.correctedWaiting"), count:metrics.corrected },
    { key:"LOW_CONFIDENCE", label:t("review.lowConfidence"), count:alertItems.filter((d)=>d.confidenceScore<CONFIDENCE_THRESHOLD).length },
    { key:"OLDEST", label:t("review.olderThanDay"), count:alertItems.filter((d)=>getAgeDays(d.updatedAt)>=1).length },
  ]

  return (
    <BaseLayout title={t("review.title")}
      description={role === "admin" ? t("review.adminDescription") : t("review.description")}>
      <div className="grid min-w-0 gap-5 px-4 lg:px-6">

        {/* Hero */}
        <section className="overflow-hidden rounded-2xl border bg-[#0f2a22] text-white shadow-md">
          <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-start lg:p-6">
            <div className="flex-1">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge className="border-[#d8ff72]/35 bg-[#d8ff72]/12 font-mono text-[9px] uppercase tracking-[0.18em] text-[#d8ff72]">{apiMode ? t("documents.awsApi") : t("documents.localDemo")}</Badge>
                <Badge className="border-white/15 bg-white/8 text-white/80 text-xs">{role === "admin" ? t("review.exceptionMonitor") : t("review.financeReviewSpace")}</Badge>
              </div>
              <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">{t("review.heroTitle")}</h2>
              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-white/60">{t("review.heroBody")}</p>
            </div>
            <div className="flex w-full flex-col justify-between gap-3 rounded-xl border border-white/12 bg-white/8 p-4 lg:w-52">
              <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/45">{t("review.oldestUnresolved")}</div>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-semibold">{metrics.oldestAge}</span>
                <span className="pb-1 text-sm text-white/60">{t("review.days")}</span>
              </div>
              <div className="text-[10px] text-white/40">{t("review.prioritySort")}</div>
            </div>
          </div>
        </section>

        {/* Metrics */}
        <section className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <MetricCard label={t("review.waiting")} value={alertItems.length} detail={t("review.waitingDetail")} icon={Bell} tone={alertItems.length ? "warning" : "success"} />
          <MetricCard label={t("review.highPriority")} value={metrics.highPriority} detail={t("review.highPriorityDetail")} icon={ShieldAlert} tone={metrics.highPriority ? "danger" : "default"} />
          <MetricCard label={t("review.needsEditing")} value={metrics.reviewRequired} detail={t("review.needsEditingDetail")} icon={FileWarning} />
          <MetricCard label={t("review.waitingApproval")} value={metrics.corrected} detail={t("review.waitingApprovalDetail")} icon={BadgeCheck} />
        </section>

        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Main table */}
          <Card className="min-w-0 rounded-xl shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className="gap-4 border-b bg-muted/20 pb-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base"><Bell className="size-4" />{t("review.attentionQueue")}</CardTitle>
                  <CardDescription className="text-xs">
                    {t("review.showing", { filtered: filteredItems.length, total: alertItems.length })}
                    {syncMessage && <span className="ml-2 text-primary">{syncMessage}</span>}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => void handleRefreshReview()} disabled={isSyncing}>
                    <Clock3 className={isSyncing ? "size-3.5 animate-spin" : "size-3.5"} />{t("common.refresh")}
                  </Button>
                  <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => handleExportReview(filteredItems)} disabled={!filteredItems.length}>
                    <Download className="size-3.5" />{t("review.exportExceptions")}
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {quickFilters.map((f) => (
                  <button key={f.key} type="button" onClick={() => { setQueueFilter(f.key); resetPage() }}
                    className={["rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150",
                      f.key === queueFilter ? "border-[#0f2a22] bg-[#0f2a22] text-white shadow-sm" : "bg-background hover:border-foreground/25 hover:bg-muted/40"].join(" ")}>
                    {f.label}<span className={`ml-1.5 font-mono text-[9px] ${f.key === queueFilter ? "opacity-70" : "opacity-45"}`}>{f.count}</span>
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                <div className="relative max-w-lg flex-1">
                  <Search className="text-muted-foreground absolute left-3 top-1/2 size-3.5 -translate-y-1/2" />
                  <Input value={query} onChange={(e) => { setQuery(e.target.value); resetPage() }} placeholder={t("review.searchPlaceholder")} className="pl-9 h-9 text-sm" />
                </div>
                {(query || queueFilter !== "ALL") && (
                  <Button variant="ghost" size="sm" className="cursor-pointer h-9" onClick={() => { setQuery(""); setQueueFilter("ALL"); resetPage() }}>
                    <X className="size-3.5" />{t("review.clear")}
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-4">
              <TableBulkControls
                selectedCount={selectedItems.length}
                totalCount={filteredItems.length}
                allSelected={allVisibleSelected}
                columns={reviewTableColumns}
                columnVisibility={columnVisibility}
                onToggleAll={toggleAllVisible}
                onClearSelection={() => setSelectedIds([])}
                onColumnVisibilityChange={setColumnVisible}
                onResetColumns={resetColumns}
                className="mb-3"
              >
                <Button variant="outline" size="sm" className="h-8 cursor-pointer" onClick={() => handleExportReview(selectedItems)}>
                  <Download className="size-3.5" />{t("review.exportSelected")}
                </Button>
                <ConfirmDeleteDialog
                  title={t("review.deleteSelectedTitle", { count: selectedItems.length })}
                  description={apiMode
                    ? t("review.deleteSelectedAws")
                    : t("review.deleteSelectedDemo")}
                  confirmLabel={t("review.deleteSelected")}
                  isDeleting={isDeleting}
                  onConfirm={handleBulkDeleteDocuments}
                  trigger={
                    <Button variant="destructive" size="sm" className="h-8 cursor-pointer" disabled={isDeleting}>
                      <Trash2 className="size-3.5" />{t("review.deleteSelected")}
                    </Button>
                  }
                />
              </TableBulkControls>

              <div className="overflow-x-auto rounded-xl border">
                <Table className="min-w-[900px]">
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="w-[84px]" />
                      <TableHead>{t("dashboard.document")}</TableHead>
                      {isColumnVisible("status") && <TableHead>{t("dashboard.status")}</TableHead>}
                      {isColumnVisible("priority") && <TableHead>{t("review.priority")}</TableHead>}
                      {isColumnVisible("confidence") && <TableHead>{t("dashboard.confidence")}</TableHead>}
                      {isColumnVisible("reason") && <TableHead>{t("review.reason")}</TableHead>}
                      {isColumnVisible("age") && <TableHead>{t("review.date")}</TableHead>}
                      <TableHead className="w-24" />
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isPageLoading ? (
                      <TableSkeletonRows rows={Math.min(pageSize, 10)} columns={visibleColumnCount} />
                    ) : (
                      <>
                        {paginatedItems.map((d) => {
                          const priority = getPriority(d); const confidence = Math.round(d.confidenceScore * 100)
                          return (
                            <TableRow key={d.documentId} className={selectedIds.includes(d.documentId) ? "bg-primary/5 hover:bg-primary/8" : "hover:bg-muted/25"}>
                              <TableCell>
                                <Checkbox
                                  aria-label={t("review.selectDocument", { name: d.originalFileName })}
                                  checked={selectedIds.includes(d.documentId)}
                                  onCheckedChange={(value) => toggleSelected(d.documentId, value === true)}
                                />
                              </TableCell>
                              <TableCell>
                                <div className="font-medium text-sm leading-tight">{d.originalFileName}</div>
                                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                  <span className="font-mono">{d.documentId}</span>
                                  <Badge variant="secondary" className="h-4 px-1.5 font-mono text-[9px]">{d.documentType === "INVOICE" ? t("review.docTypeInvoiceShort") : d.documentType === "RECEIPT" ? t("review.docTypeReceiptShort") : "?"}</Badge>
                                </div>
                              </TableCell>
                              {isColumnVisible("status") && <TableCell><StatusBadge status={d.status} /></TableCell>}
                              {isColumnVisible("priority") && <TableCell><Badge variant="outline" className={priorityClass(priority)}>{displayPriority(t, priority)}</Badge></TableCell>}
                              {isColumnVisible("confidence") && (
                                <TableCell>
                                  <div className="min-w-20">
                                    <div className={`mb-1 text-xs font-semibold ${confidence < 80 ? "text-amber-600 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"}`}>{confidence}%</div>
                                    <Progress value={confidence} className={`h-1.5 ${confidence < 80 ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500"}`} />
                                  </div>
                                </TableCell>
                              )}
                              {isColumnVisible("reason") && <TableCell className="max-w-[240px]"><div className="line-clamp-2 text-xs leading-5 text-muted-foreground">{attentionReason(d, t)}</div></TableCell>}
                              {isColumnVisible("age") && (
                                <TableCell>
                                  <div className="flex items-center gap-1 text-xs"><Clock3 className="size-3 text-muted-foreground" />{getAgeDays(d.updatedAt)}{t("review.days").slice(0, 1)}</div>
                                  <div className="text-muted-foreground text-xs">{formatDate(d.updatedAt)}</div>
                                </TableCell>
                              )}
                              <TableCell>
                                <Button asChild variant="outline" size="sm" className="cursor-pointer h-7 text-xs">
                                  <Link to={`/documents/${d.documentId}`}>{actionLabel(d.status, t)}<ArrowRight className="size-3" /></Link>
                                </Button>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-end gap-1">
                                  <ReviewPreviewDrawer document={d} />
                                  <ConfirmDeleteDialog
                                    title={t("review.deleteTitle")}
                                    description={t("review.deleteFromQueueDescription", { name: d.originalFileName })}
                                    confirmLabel={t("review.delete")}
                                    isDeleting={isDeleting}
                                    onConfirm={() => handleDeleteDocument(d)}
                                    trigger={
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8 cursor-pointer text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                        disabled={isDeleting}
                                      >
                                        <Trash2 className="size-4" />
                                        <span className="sr-only">{t("review.deleteDocument")}</span>
                                      </Button>
                                    }
                                  />
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                        {!filteredItems.length && (
                          <TableRow>
                            <TableCell colSpan={visibleColumnCount} className="h-44 text-center">
                              <div className="mx-auto grid max-w-xs place-items-center gap-3 py-6">
                                <div className="rounded-full border bg-muted/30 p-3">
                                  {alertItems.length ? <Search className="size-5 text-muted-foreground" /> : <CheckCircle2 className="size-5 text-emerald-600" />}
                                </div>
                                <div className="font-medium text-sm">{alertItems.length ? t("review.noMatch") : t("review.empty")}</div>
                                <p className="text-xs text-muted-foreground">{alertItems.length ? t("review.clearHint") : t("review.emptyHint")}</p>
                                {alertItems.length
                                  ? <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => { setQuery(""); setQueueFilter("ALL"); resetPage() }}>{t("documents.clearFilters")}</Button>
                                  : <Button asChild variant="outline" size="sm" className="cursor-pointer"><Link to="/documents">{t("review.backToList")}</Link></Button>}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    )}
                  </TableBody>
                </Table>
              </div>
              {totalItems > 0 && (
                <TablePagination
                  page={currentPage}
                  pageSize={pageSize}
                  totalItems={totalItems}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                  isLoading={isPageLoading}
                />
              )}
            </CardContent>
          </Card>

          {/* Sidebar cards */}
          <div className="grid gap-4 content-start">
            <Card className="rounded-xl shadow-sm transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base"><MailWarning className="size-4" />{t("review.alertChain")}</CardTitle>
                <CardDescription className="text-xs">{t("review.alertChainBody")}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2.5">
                <div className="flex items-center justify-between rounded-xl border bg-muted/20 p-3 text-sm">
                  <span>{t("review.confidenceThreshold")}</span>
                  <Badge variant="outline" className="font-mono">{Math.round(CONFIDENCE_THRESHOLD * 100)}%</Badge>
                </div>
                <div className="flex items-center justify-between rounded-xl border bg-muted/20 p-3 text-sm">
                  <span>{t("review.workflowFailedAlert")}</span>
                  <Badge variant="outline" className="font-mono">{metrics.failed}</Badge>
                </div>
                <div className="rounded-xl border bg-muted/20 p-3 text-xs leading-5 text-muted-foreground">
                  {t("review.alertChainNote")}
                </div>
                {role === "admin" && (
                  <Button asChild variant="outline" size="sm" className="cursor-pointer">
                    <Link to="/settings/notifications">{t("review.notificationSettings")}<ArrowRight className="size-4" /></Link>
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-xl shadow-sm transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base"><ListChecks className="size-4" />{t("review.checklist")}</CardTitle>
                <CardDescription className="text-xs">{t("review.checklistBody")}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2.5">
                {[
                  t("review.checkVendor"),
                  t("review.checkDateCurrency"),
                  t("review.checkAmounts"),
                  t("review.checkNotes"),
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 text-sm">
                    <div className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/20">
                      <BadgeCheck className="size-3 text-emerald-600" />
                    </div>
                    {item}
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
