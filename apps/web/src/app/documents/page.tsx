"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import {
  AlertTriangle, ArrowRight, BarChart3,
  Download, Eye, FileWarning, Plus, RefreshCw, Search,
  SlidersHorizontal, Trash2, X,
} from "lucide-react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate, formatMoney, statusMeta, type DocumentRecord, type DocumentStatus, type DocumentType } from "@/lib/docuflow-data"
import { useDocuFlowDocuments } from "@/lib/docuflow-store"
import { deleteDocument as deleteDocumentApi, deleteDocuments as deleteDocumentsApi } from "@/lib/docuflow-api"
import { SpotlightCard } from "@/components/spotlight-card"
import { AnimatePresence, motion } from "framer-motion"
import { useAuth } from "@/contexts/auth-context"
import { useDocumentsSync } from "@/hooks/use-documents-sync"
import { toast } from "sonner"
import { TableBulkControls, type BulkTableColumn, type TableColumnVisibility } from "@/components/table-bulk-controls"
import { TablePagination } from "@/components/table-pagination"
import { TableSkeletonRows } from "@/components/table-skeleton-rows"
import { useLanguage, type TranslationKey } from "@/lib/i18n"

type QuickFilter = "ALL" | "ACTION" | "PROCESSING" | "APPROVED" | "FAILED" | "MY_UPLOADS"

const confidenceWarningThreshold = 0.8
const processingStatuses: DocumentStatus[] = ["UPLOADED", "QUEUED", "PROCESSING"]
const actionStatuses: DocumentStatus[] = ["REVIEW_REQUIRED", "FAILED", "CORRECTED"]
const documentTableColumnDefinitions: Array<Omit<BulkTableColumn, "label"> & { labelKey: TranslationKey }> = [
  { key: "document", labelKey: "dashboard.document", locked: true },
  { key: "status", labelKey: "dashboard.status" },
  { key: "confidence", labelKey: "dashboard.confidence" },
  { key: "vendor", labelKey: "documents.vendor" },
  { key: "amount", labelKey: "dashboard.amount" },
  { key: "updated", labelKey: "dashboard.updated" },
  { key: "action", labelKey: "documents.actionColumn", locked: true },
]

const defaultDocumentColumnVisibility = documentTableColumnDefinitions.reduce<TableColumnVisibility>((visibility, column) => {
  visibility[column.key] = true
  return visibility
}, {})

function StatusBadge({ status }: { status: DocumentRecord["status"] }) {
  const { t } = useLanguage()
  const meta = statusMeta[status]
  const Icon = meta.icon
  return (
    <Badge variant="outline" className={meta.tone}>
      {status === "PROCESSING" ? <span className="pulse-indicator mr-1.5 bg-current" /> : <Icon className="size-3" />}
      {t(`status.${status}` as TranslationKey)}
    </Badge>
  )
}

function ConfidenceSignal({ document }: { document: DocumentRecord }) {
  const value = Math.round(document.confidenceScore * 100)
  const low = document.status === "REVIEW_REQUIRED" || document.status === "FAILED"
    || document.reviewReasonCodes.length > 0 || document.confidenceScore < confidenceWarningThreshold
  return (
    <div className="min-w-24">
      <div className={`mb-1 flex items-center justify-between gap-1 text-xs font-semibold ${low ? "text-amber-600 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"}`}>
        <span>{value}%</span>
      </div>
      <Progress value={value} className={`h-1.5 ${low ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500"}`} />
    </div>
  )
}

function escapeCsv(value: string | number | null) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`
}

function exportDocumentsCsv(items: DocumentRecord[], scope: string) {
  const header = ["documentId","originalFileName","type","status","vendor","invoiceDate","currency","totalAmount","taxAmount","confidence","reviewReasonCodes","updatedAt"]
  const rows = items.map((d) => [d.documentId,d.originalFileName,d.documentType,d.status,d.vendorName,d.invoiceDate,d.currency,d.totalAmount,d.taxAmount,Math.round(d.confidenceScore*100),d.reviewReasonCodes.join("; "),d.updatedAt])
  const csv = [header,...rows].map((r)=>r.map(escapeCsv).join(",")).join("\n")
  const url = URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}))
  const a = document.createElement("a"); a.href=url; a.download=`docuflow-${scope}-${new Date().toISOString().slice(0,10)}.csv`; a.click()
  URL.revokeObjectURL(url)
}

function DocumentPreviewModal({ document, showTechnical }: { document: DocumentRecord; showTechnical: boolean }) {
  const { t } = useLanguage()
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => { await navigator.clipboard.writeText(document.documentId); setCopied(true); window.setTimeout(()=>setCopied(false),1400) }
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 cursor-pointer text-muted-foreground hover:text-foreground">
          <Eye className="size-4" /><span className="sr-only">{t("documents.preview")}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="border-b bg-muted/20 px-5 py-4 pr-12">
          <DialogTitle className="truncate text-base">{document.originalFileName}</DialogTitle>
          <DialogDescription className="font-mono text-[10px]">
            {document.documentId} · {document.documentType} · {t("documents.updatedAt", { date: formatDate(document.updatedAt) })}
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[calc(88vh-132px)] gap-4 overflow-y-auto p-5 lg:grid-cols-[1fr_1.05fr]">
          <div className="grid content-start gap-3">
            <div className="grid gap-3 rounded-xl border bg-muted/20 p-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">{t("dashboard.status")}</span>
                <StatusBadge status={document.status} />
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{t("dashboard.confidence")}</span>
                  <span className="font-semibold">{Math.round(document.confidenceScore * 100)}%</span>
                </div>
                <Progress value={Math.round(document.confidenceScore * 100)} className="h-1.5" />
              </div>
            </div>
            <div className="grid gap-2.5 rounded-xl border p-3 text-sm">
              {[
                [t("documents.invoiceNumber"), document.invoiceNumber || t("common.notDetected")],
                [t("documents.vendor"), document.vendorName],
                [t("documents.invoiceDate"), document.invoiceDate || t("common.notDetected")],
                [t("documents.dueDate"), document.dueDate || t("common.notDetected")],
                [t("documents.currency"), document.currency],
              ].map(([label, val]) => (
                <div key={label} className="flex items-start justify-between gap-4">
                  <span className="text-muted-foreground shrink-0">{label}</span>
                  <span className="text-right font-medium">{val}</span>
                </div>
              ))}
            </div>
            <div className="grid gap-2.5 rounded-xl border p-3 text-sm">
              {[
                [t("documents.subtotal"), document.subtotalAmount == null ? t("common.notDetected") : formatMoney(document.subtotalAmount, document.currency)],
                [t("documents.discount"), document.discountAmount == null ? t("common.notDetected") : formatMoney(document.discountAmount, document.currency)],
                [t("documents.shipping"), document.shippingAmount == null ? t("common.notDetected") : formatMoney(document.shippingAmount, document.currency)],
                [t("documents.tax"), document.taxAmount == null ? t("common.notDetected") : formatMoney(document.taxAmount, document.currency)],
                [t("documents.total"), formatMoney(document.totalAmount, document.currency)],
              ].map(([label, val]) => (
                <div key={label} className="flex items-start justify-between gap-4">
                  <span className="text-muted-foreground shrink-0">{label}</span>
                  <span className="text-right font-medium">{val}</span>
                </div>
              ))}
            </div>
            {document.reviewReasonCodes.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-amber-900 dark:border-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold"><FileWarning className="size-3.5" />{t("documents.reviewReasons")}</div>
                <ul className="grid gap-1 text-xs">{document.reviewReasonCodes.map((r)=><li key={r}>· {r}</li>)}</ul>
              </div>
            )}
          </div>

          <div className="grid content-start gap-3">
            <div className="overflow-hidden rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>{t("documents.descriptionColumn")}</TableHead>
                    <TableHead className="text-right">{t("documents.quantity")}</TableHead>
                    <TableHead className="text-right">{t("documents.unitPrice")}</TableHead>
                    <TableHead className="text-right">{t("documents.lineTotal")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {document.lineItems.length ? document.lineItems.map((item, index) => (
                    <TableRow key={`${item.lineItemId || item.description}-${index}`}>
                      <TableCell className="max-w-[240px]">
                        <div className="line-clamp-2 font-medium text-sm">{item.description || t("documents.noDescription")}</div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(item.unitPriceAmount, document.currency)}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{formatMoney(item.totalAmount, document.currency)}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-sm text-muted-foreground">
                        {t("documents.noLineItems")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {showTechnical && (
              <div className="grid gap-2.5 rounded-xl border p-3 text-xs">
                <div><div className="mb-1 text-muted-foreground">{t("documents.rawObject")}</div><div className="break-all font-mono text-[10px] bg-muted/40 rounded p-2">{document.rawS3Key}</div></div>
                <div><div className="mb-1 text-muted-foreground">{t("documents.processedObject")}</div><div className="break-all font-mono text-[10px] bg-muted/40 rounded p-2">{document.processedS3Key}</div></div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t bg-muted/10 px-5 py-4">
          {(document.status === "REVIEW_REQUIRED" || document.status === "CORRECTED") && (
            <Button asChild className="cursor-pointer"><Link to={`/documents/${document.documentId}`}>{t("documents.review")}<ArrowRight className="size-4" /></Link></Button>
          )}
          <Button asChild variant={document.status === "REVIEW_REQUIRED" || document.status === "CORRECTED" ? "outline" : "default"} className="cursor-pointer">
            <Link to={`/documents/${document.documentId}`}>{t("documents.openDetail")}</Link>
          </Button>
          <Button variant="outline" className="cursor-pointer" onClick={handleCopy}>{copied ? t("documents.copied") : t("documents.copyId")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
            {t("common.cancel")}
          </Button>
          <Button type="button" variant="destructive" className="cursor-pointer" onClick={handleConfirm} disabled={isDeleting}>
            {isDeleting ? <RefreshCw className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function MetricCard({ label, value, detail, icon: Icon, tone = "default" }: {
  label: string; value: string | number; detail: string; icon: typeof BarChart3; tone?: "default"|"warning"|"danger"|"success"
}) {
  const cls = { default:"border-border bg-card", warning:"border-amber-200 bg-amber-50/80 text-amber-900 dark:border-amber-900 dark:bg-amber-500/10 dark:text-amber-100", danger:"border-red-200 bg-red-50/80 text-red-900 dark:border-red-900 dark:bg-red-500/10 dark:text-red-100", success:"border-emerald-200 bg-emerald-50/80 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-100" }[tone]
  return (
    <SpotlightCard className={`rounded-xl border p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${cls}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.16em] opacity-60">{label}</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
        </div>
        <div className="rounded-lg border bg-background/80 p-2 shadow-sm"><Icon className="size-4" /></div>
      </div>
      <div className="mt-3 text-xs opacity-65 leading-4">{detail}</div>
    </SpotlightCard>
  )
}

export default function DocumentsPage() {
  const { t } = useLanguage()
  const { documents: allDocuments, mergeDocuments, removeDocument, removeDocuments, resetDocuments, updateDocument } = useDocuFlowDocuments()
  const { session } = useAuth()
  const role = session?.role ?? "finance"
  const { apiMode, isSyncing, nextToken, refreshDocuments, syncError, syncMessage } = useDocumentsSync(mergeDocuments, { loadAllPages: true })
  const documents = role === "finance" ? allDocuments.filter((d) => d.userId === session?.userId) : allDocuments
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | "ALL">("ALL")
  const [typeFilter, setTypeFilter] = useState<DocumentType | "ALL">("ALL")
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("ALL")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [isPageLoading, setIsPageLoading] = useState(false)
  const pageLoadingTimer = useRef<number | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  const [columnVisibility, setColumnVisibility] = useState<TableColumnVisibility>(defaultDocumentColumnVisibility)
  const documentTableColumns = useMemo<BulkTableColumn[]>(
    () => documentTableColumnDefinitions.map(({ labelKey, ...column }) => ({ ...column, label: t(labelKey) })),
    [t]
  )

  useEffect(() => {
    return () => {
      if (pageLoadingTimer.current) window.clearTimeout(pageLoadingTimer.current)
    }
  }, [])

  const metrics = useMemo(() => {
    const processing = documents.filter((d) => processingStatuses.includes(d.status)).length
    const needsReview = documents.filter((d) => d.status === "REVIEW_REQUIRED" || d.reviewReasonCodes.length > 0).length
    const failed = documents.filter((d) => d.status === "FAILED").length
    const approved = documents.filter((d) => d.status === "APPROVED").length
    const averageConfidence = documents.length
      ? Math.round((documents.reduce((s, d) => s + d.confidenceScore, 0) / documents.length) * 100) : 0
    return { processing, needsReview, failed, approved, averageConfidence }
  }, [documents])

  const filteredDocuments = useMemo(() => {
    const q = query.trim().toLowerCase()
    return documents.filter((d) => {
      const matchQ = !q || [d.documentId,d.originalFileName,d.vendorName,d.status,d.documentType,d.reviewReasonCodes.join(" ")].join(" ").toLowerCase().includes(q)
      const matchS = statusFilter === "ALL" || d.status === statusFilter
      const matchT = typeFilter === "ALL" || d.documentType === typeFilter
      const matchQ2 = quickFilter === "ALL"
        || (quickFilter === "ACTION" && (actionStatuses.includes(d.status) || d.reviewReasonCodes.length > 0))
        || (quickFilter === "PROCESSING" && processingStatuses.includes(d.status))
        || (quickFilter === "APPROVED" && d.status === "APPROVED")
        || (quickFilter === "FAILED" && d.status === "FAILED")
        || (quickFilter === "MY_UPLOADS" && d.userId === session?.userId)
      return matchQ && matchS && matchT && matchQ2
    })
  }, [documents, query, quickFilter, session?.userId, statusFilter, typeFilter])

  const selectedDocuments = useMemo(() => filteredDocuments.filter((d) => selectedIds.includes(d.documentId)), [filteredDocuments, selectedIds])
  const allVisibleSelected = filteredDocuments.length > 0 && filteredDocuments.every((d) => selectedIds.includes(d.documentId))

  const sortedFilteredDocuments = useMemo(() => {
    return filteredDocuments.slice().sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
  }, [filteredDocuments])

  const totalItems = sortedFilteredDocuments.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const paginatedDocuments = sortedFilteredDocuments.slice((currentPage - 1) * pageSize, currentPage * pageSize)

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

  const clearFilters = () => { setQuery(""); setStatusFilter("ALL"); setTypeFilter("ALL"); setQuickFilter("ALL"); resetPage() }
  const toggleSelected = (id: string, checked: boolean) => setSelectedIds((c) => checked ? Array.from(new Set([...c, id])) : c.filter((x) => x !== id))
  const toggleAllVisible = (checked: boolean) => setSelectedIds((c) => { const ids = filteredDocuments.map((d) => d.documentId); return checked ? Array.from(new Set([...c,...ids])) : c.filter((x) => !ids.includes(x)) })
  const setColumnVisible = (key: string, visible: boolean) => {
    const column = documentTableColumns.find((item) => item.key === key)
    if (column?.locked) return
    setColumnVisibility((current) => ({ ...current, [key]: visible }))
  }
  const resetColumns = () => setColumnVisibility(defaultDocumentColumnVisibility)
  const isColumnVisible = (key: string) => columnVisibility[key] !== false
  const visibleColumnCount = 2 + documentTableColumns.filter((column) => isColumnVisible(column.key)).length

  const handleMarkForReview = () => {
    if (apiMode) {
      toast.info(t("documents.bulkReviewInfo"))
      return
    }
    selectedDocuments.forEach((d) => {
      if (d.status === "APPROVED") return
      updateDocument(d.documentId, { status: "REVIEW_REQUIRED", reviewReasonCodes: Array.from(new Set([...d.reviewReasonCodes, t("documents.manualReviewReason")])) })
    })
    toast.success(t("documents.bulkReviewSuccess", { count: selectedDocuments.length }))
    setSelectedIds([])
  }

  const handleDeleteDocument = async (document: DocumentRecord) => {
    setIsDeleting(true)
    try {
      await deleteDocumentApi(document.documentId)
      removeDocument(document.documentId)
      setSelectedIds((current) => current.filter((id) => id !== document.documentId))
      toast.success(t("documents.deletedOne", { name: document.originalFileName }))
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("documents.deleteOneFailed"))
      return false
    } finally {
      setIsDeleting(false)
    }
  }

  const handleBulkDeleteDocuments = async () => {
    if (!selectedDocuments.length) return false

    const ids = selectedDocuments.map((document) => document.documentId)
    setIsDeleting(true)
    try {
      await deleteDocumentsApi(ids)
      removeDocuments(ids)
      setSelectedIds([])
      toast.success(t("documents.deletedMany", { count: ids.length }))
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("documents.deleteManyFailed"))
      return false
    } finally {
      setIsDeleting(false)
    }
  }

  const quickFilters: Array<{key: QuickFilter; label: string; count: number}> = [
    { key:"ALL", label:t("documents.all"), count:documents.length },
    { key:"ACTION", label:t("documents.action"), count:metrics.needsReview },
    { key:"PROCESSING", label:t("common.processing"), count:metrics.processing },
    { key:"FAILED", label:t("documents.failed"), count:metrics.failed },
    { key:"APPROVED", label:t("header.approved"), count:metrics.approved },
    { key:"MY_UPLOADS", label:t("documents.myUploads"), count:documents.filter((d) => d.userId === session?.userId).length },
  ]

  return (
    <BaseLayout title={t("documents.title")} description={t("documents.description")}>
      <div className="grid gap-5 px-4 lg:px-6">

        {/* Hero */}
        <section className="overflow-hidden rounded-2xl border bg-[#0f2a22] text-white shadow-md">
          <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-start lg:p-6">
            <div className="flex-1">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge className="border-[#d8ff72]/35 bg-[#d8ff72]/12 font-mono text-[9px] uppercase tracking-[0.18em] text-[#d8ff72]">{apiMode ? t("documents.awsApi") : t("documents.localDemo")}</Badge>
                <Badge className="border-white/15 bg-white/8 text-white/80 text-xs">{role === "admin" ? t("documents.admin") : t("documents.financeSpace")}</Badge>
              </div>
              <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">{t("documents.consoleTitle")}</h2>
              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-white/60">{t("documents.consoleBody")}</p>
            </div>
            <div className="flex w-full flex-col justify-between gap-3 rounded-xl border border-white/12 bg-white/8 p-4 lg:w-56">
              <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/45">{t("documents.pipelineHealth")}</div>
              <div>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="text-xs text-white/60">{t("dashboard.avgConfidence")}</span>
                  <span className="text-xl font-semibold">{metrics.averageConfidence}%</span>
                </div>
                <Progress value={metrics.averageConfidence} className="h-1.5 bg-white/15 [&>div]:bg-[#d8ff72]" />
              </div>
            </div>
          </div>
        </section>

        {/* Metrics */}
        <section className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <MetricCard label={t("dashboard.totalDocuments")} value={documents.length} detail={t("documents.visibleAfterFilter", { count: filteredDocuments.length })} icon={BarChart3} />
          <MetricCard label={t("common.processing")} value={metrics.processing} detail={t("documents.processingDetail")} icon={RefreshCw} />
          <MetricCard label={t("documents.needsAttention")} value={metrics.needsReview} detail={t("documents.needsAttentionDetail")} icon={FileWarning} tone={metrics.needsReview ? "warning" : "default"} />
          <MetricCard label={t("documents.failed")} value={metrics.failed} detail={t("documents.failedDetail")} icon={AlertTriangle} tone={metrics.failed ? "danger" : "success"} />
        </section>

        {/* Table card */}
        <Card className="rounded-xl shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="gap-4 border-b bg-muted/20 pb-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle className="text-base">{t("documents.listTitle")}</CardTitle>
                <CardDescription className="text-xs">
                  {t("documents.showing", { filtered: filteredDocuments.length, total: documents.length })}
                  {syncMessage && <span className="ml-2 text-primary" role="status">{syncMessage}</span>}
                  {syncError && <span className="ml-2 text-destructive" role="alert">{syncError}</span>}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                {role === "admin" && (
                  <Button variant="outline" size="sm" className="cursor-pointer" onClick={resetDocuments}>{t("documents.resetDemo")}</Button>
                )}
                <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => exportDocumentsCsv(filteredDocuments, "filtered")} disabled={!filteredDocuments.length}>
                  <Download className="size-3.5" />{t("common.exportCsv")}
                </Button>
                <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => refreshDocuments()} disabled={isSyncing}>
                  <RefreshCw className={isSyncing ? "size-3.5 animate-spin" : "size-3.5"} />{t("common.refresh")}
                </Button>
                <Button asChild size="sm" className="cursor-pointer">
                  <Link to="/upload"><Plus className="size-3.5" />{t("common.upload")}</Link>
                </Button>
              </div>
            </div>

            {/* Quick filters */}
            <div className="flex flex-wrap gap-1.5">
              {quickFilters.map((f) => (
                <button key={f.key} type="button" onClick={() => { setQuickFilter(f.key); resetPage() }}
                  className={["rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150",
                    f.key === quickFilter ? "border-[#0f2a22] bg-[#0f2a22] text-white shadow-sm" : "bg-background hover:border-foreground/25 hover:bg-muted/40"].join(" ")}>
                  {f.label}
                  <span className={`ml-1.5 font-mono text-[10px] ${f.key === quickFilter ? "opacity-75" : "opacity-50"}`}>{f.count}</span>
                </button>
              ))}
            </div>

            {/* Search & filters */}
            <div className="grid gap-3 lg:grid-cols-[minmax(200px,1fr)_auto] lg:items-center">
              <div className="relative max-w-lg">
                <Search className="text-muted-foreground absolute left-3 top-1/2 size-3.5 -translate-y-1/2" />
                <Input value={query} onChange={(e) => { setQuery(e.target.value); resetPage() }} placeholder={t("documents.searchPlaceholder")} className="pl-9 h-9 text-sm" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as DocumentStatus | "ALL"); resetPage() }}>
                  <SelectTrigger className="h-9 w-[170px] text-sm"><SelectValue placeholder={t("documents.statusPlaceholder")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{t("documents.allStatuses")}</SelectItem>
                    {(Object.keys(statusMeta) as DocumentStatus[]).map((status) => <SelectItem key={status} value={status}>{t(`status.${status}` as TranslationKey)}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v as DocumentType | "ALL"); resetPage() }}>
                  <SelectTrigger className="h-9 w-[140px] text-sm"><SelectValue placeholder={t("documents.typePlaceholder")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{t("documents.allTypes")}</SelectItem>
                    <SelectItem value="INVOICE">{t("upload.invoice")}</SelectItem>
                    <SelectItem value="RECEIPT">{t("upload.receipt")}</SelectItem>
                    <SelectItem value="UNKNOWN">{t("detail.unknown")}</SelectItem>
                  </SelectContent>
                </Select>
                {(query || statusFilter !== "ALL" || typeFilter !== "ALL" || quickFilter !== "ALL") && (
                  <Button variant="ghost" size="sm" className="cursor-pointer h-9" onClick={clearFilters}><X className="size-3.5" />{t("documents.clear")}</Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="grid gap-3 p-4">
            <TableBulkControls
              selectedCount={selectedDocuments.length}
              totalCount={filteredDocuments.length}
              allSelected={allVisibleSelected}
              columns={documentTableColumns}
              columnVisibility={columnVisibility}
              onToggleAll={toggleAllVisible}
              onClearSelection={() => setSelectedIds([])}
              onColumnVisibilityChange={setColumnVisible}
              onResetColumns={resetColumns}
            >
              <Button variant="outline" size="sm" className="h-8 cursor-pointer" onClick={() => exportDocumentsCsv(selectedDocuments, "selected")}>
                <Download className="size-3.5" />{t("documents.exportSelected")}
              </Button>
              <Button variant="outline" size="sm" className="h-8 cursor-pointer" onClick={handleMarkForReview}>
                <FileWarning className="size-3.5" />{t("documents.markReview")}
              </Button>
              <ConfirmDeleteDialog
                title={t("documents.deleteSelectedTitle", { count: selectedDocuments.length })}
                description={apiMode
                  ? t("documents.deleteSelectedAws")
                  : t("documents.deleteSelectedDemo")}
                confirmLabel={t("documents.deleteSelected")}
                isDeleting={isDeleting}
                onConfirm={handleBulkDeleteDocuments}
                trigger={
                  <Button variant="destructive" size="sm" className="h-8 cursor-pointer" disabled={isDeleting}>
                    <Trash2 className="size-3.5" />{t("documents.deleteSelected")}
                  </Button>
                }
              />
            </TableBulkControls>

            <div className="overflow-x-auto rounded-xl border">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="w-10">
                      <input type="checkbox" aria-label={t("documents.selectAll")} checked={allVisibleSelected} onChange={(e) => toggleAllVisible(e.target.checked)} className="size-4 rounded border accent-primary" />
                    </TableHead>
                    <TableHead className="min-w-[200px] w-[30%]">{t("dashboard.document")}</TableHead>
                    {isColumnVisible("status") && <TableHead>{t("dashboard.status")}</TableHead>}
                    {isColumnVisible("confidence") && <TableHead>{t("dashboard.confidence")}</TableHead>}
                    {isColumnVisible("vendor") && <TableHead>{t("documents.vendor")}</TableHead>}
                    {isColumnVisible("amount") && <TableHead className="text-right">{t("dashboard.amount")}</TableHead>}
                    {isColumnVisible("updated") && <TableHead>{t("dashboard.updated")}</TableHead>}
                    <TableHead className="w-[110px]">{t("documents.actionColumn")}</TableHead>
                    <TableHead className="w-[84px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isPageLoading ? (
                    <TableSkeletonRows rows={Math.min(pageSize, 10)} columns={visibleColumnCount} />
                  ) : (
                    <>
                      <AnimatePresence initial={false}>
                        {paginatedDocuments.map((d) => {
                          const needsReview = d.status === "REVIEW_REQUIRED" || d.status === "FAILED" || d.reviewReasonCodes.length > 0 || d.confidenceScore < confidenceWarningThreshold
                          const isSelected = selectedIds.includes(d.documentId)
                          return (
                            <motion.tr key={d.documentId} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.15 }}
                              className={`border-b transition-colors ${isSelected ? "bg-primary/5 hover:bg-primary/8" : "hover:bg-muted/30"}`}>
                              <TableCell>
                                <input type="checkbox" aria-label={t("documents.selectNamed", { name: d.originalFileName })} checked={isSelected} onChange={(e) => toggleSelected(d.documentId, e.target.checked)} className="size-4 rounded border accent-primary" />
                              </TableCell>
                              <TableCell className="max-w-[250px]">
                                <div className="font-medium text-sm leading-tight truncate" title={d.originalFileName}>{d.originalFileName}</div>
                                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                  <span className="font-mono truncate" title={d.documentId}>{d.documentId.split('-')[1] || d.documentId.slice(0,8)}</span>
                                  <Badge variant="secondary" className="h-4 px-1.5 font-mono text-[9px]">
                                    {d.documentType === "INVOICE" ? t("upload.invoice") : d.documentType === "RECEIPT" ? t("upload.receipt") : t("detail.unknown")}
                                  </Badge>
                                </div>
                              </TableCell>
                              {isColumnVisible("status") && <TableCell><StatusBadge status={d.status} /></TableCell>}
                              {isColumnVisible("confidence") && <TableCell><ConfidenceSignal document={d} /></TableCell>}
                              {isColumnVisible("vendor") && (
                                <TableCell>
                                  <div className="text-sm">{d.vendorName}</div>
                                  {needsReview && (
                                    <div className="mt-0.5 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                                      <FileWarning className="size-3 shrink-0" />
                                      {d.reviewReasonCodes.length ? t("dashboard.reasonCount", { count: d.reviewReasonCodes.length }) : t("documents.lowConfidence")}
                                    </div>
                                  )}
                                </TableCell>
                              )}
                              {isColumnVisible("amount") && <TableCell className="text-right font-semibold tabular-nums text-sm">{formatMoney(d.totalAmount, d.currency)}</TableCell>}
                              {isColumnVisible("updated") && <TableCell className="text-xs text-muted-foreground">{formatDate(d.updatedAt)}</TableCell>}
                              <TableCell>
                                {needsReview ? (
                                  <Button asChild variant="outline" size="sm" className="cursor-pointer h-7 text-xs border-amber-500/50 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-400">
                                    <Link to={`/documents/${d.documentId}`}>{t("documents.review")}<ArrowRight className="size-3 ml-1" /></Link>
                                  </Button>
                                ) : (
                                  <Button asChild variant="outline" size="sm" className="cursor-pointer h-7 text-xs">
                                    <Link to={`/documents/${d.documentId}`}>{t("documents.viewDetail")}<ArrowRight className="size-3 ml-1" /></Link>
                                  </Button>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-end gap-1">
                                  <DocumentPreviewModal document={d} showTechnical={role === "admin"} />
                                  <ConfirmDeleteDialog
                                    title={t("documents.deleteTitle")}
                                    description={t("documents.deleteDescription", { name: d.originalFileName })}
                                    confirmLabel={t("upload.delete")}
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
                                        <span className="sr-only">{t("documents.deleteTitle")}</span>
                                      </Button>
                                    }
                                  />
                                </div>
                              </TableCell>
                            </motion.tr>
                          )
                        })}
                      </AnimatePresence>
                      {!filteredDocuments.length && (
                        <TableRow>
                          <TableCell colSpan={visibleColumnCount} className="h-44 text-center">
                            <div className="mx-auto grid max-w-xs place-items-center gap-3 py-6">
                              <div className="rounded-full border bg-muted/30 p-3"><SlidersHorizontal className="size-5 text-muted-foreground" /></div>
                              <div className="font-medium text-sm">{documents.length ? t("documents.noMatch") : t("documents.noDocuments")}</div>
                              <p className="text-xs text-muted-foreground">{documents.length ? t("documents.clearFiltersHint") : t("documents.uploadHint")}</p>
                              {documents.length
                                ? <Button variant="outline" size="sm" className="cursor-pointer" onClick={clearFilters}>{t("documents.clearFilters")}</Button>
                                : <Button asChild size="sm" className="cursor-pointer"><Link to="/upload"><Plus className="size-3.5" />{t("common.upload")}</Link></Button>}
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


            {nextToken && (
              <div className="flex justify-center pt-1">
                <Button variant="outline" size="sm" onClick={() => refreshDocuments(nextToken)} disabled={isSyncing}>{t("documents.loadMore")}</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </BaseLayout>
  )
}
