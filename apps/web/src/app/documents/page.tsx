"use client"

import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Eye,
  FileWarning,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  type DocumentType,
} from "@/lib/docuflow-data"
import { useDocuFlowDocuments } from "@/lib/docuflow-store"
import { useAuth } from "@/contexts/auth-context"
import { isApiConfigured, listDocuments } from "@/lib/docuflow-api"

type QuickFilter = "ALL" | "ACTION" | "PROCESSING" | "APPROVED" | "FAILED" | "MY_UPLOADS"

const confidenceWarningThreshold = 0.8
const processingStatuses: DocumentStatus[] = ["UPLOADED", "QUEUED", "PROCESSING"]
const actionStatuses: DocumentStatus[] = ["REVIEW_REQUIRED", "FAILED", "CORRECTED"]

function StatusBadge({ status }: { status: DocumentRecord["status"] }) {
  const meta = statusMeta[status]
  const Icon = meta.icon

  return (
    <Badge variant="outline" className={meta.tone}>
      <Icon className="size-3.5" />
      {meta.label}
    </Badge>
  )
}

function ConfidenceSignal({ document }: { document: DocumentRecord }) {
  const value = Math.round(document.confidenceScore * 100)
  const needsReview =
    document.status === "REVIEW_REQUIRED" ||
    document.status === "FAILED" ||
    document.reviewReasons.length > 0 ||
    document.confidenceScore < confidenceWarningThreshold
  const tone = needsReview ? "text-amber-700 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-300"

  return (
    <div className="min-w-28">
      <div className={`mb-1 flex items-center justify-between gap-2 text-xs font-medium ${tone}`}>
        <span>{value}%</span>
        {needsReview && <span>{document.reviewReasons.length || "check"}</span>}
      </div>
      <Progress value={value} className="h-1.5" />
    </div>
  )
}

function escapeCsv(value: string | number | null) {
  const text = String(value ?? "")
  return `"${text.replace(/"/g, '""')}"`
}

function exportDocumentsCsv(items: DocumentRecord[], scope: string) {
  const header = [
    "documentId",
    "fileName",
    "type",
    "status",
    "vendor",
    "invoiceDate",
    "currency",
    "totalAmount",
    "taxAmount",
    "confidence",
    "reviewReasons",
    "updatedAt",
  ]
  const rows = items.map((document) => [
    document.documentId,
    document.fileName,
    document.documentType,
    document.status,
    document.vendorName,
    document.invoiceDate,
    document.currency,
    document.totalAmount,
    document.taxAmount,
    Math.round(document.confidenceScore * 100),
    document.reviewReasons.join("; "),
    document.updatedAt,
  ])
  const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n")
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `docuflow-${scope}-${new Date().toISOString().slice(0, 10)}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}

function DocumentDrawer({
  document,
  showTechnical,
}: {
  document: DocumentRecord
  showTechnical: boolean
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(document.documentId)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  return (
    <Drawer direction="right">
      <DrawerTrigger asChild>
        <Button variant="ghost" size="icon" className="cursor-pointer">
          <Eye className="size-4" />
          <span className="sr-only">View document</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{document.fileName}</DrawerTitle>
          <DrawerDescription>
            {document.documentId} · {document.documentType} · updated {formatDate(document.updatedAt)}
          </DrawerDescription>
        </DrawerHeader>
        <div className="grid gap-4 overflow-y-auto px-4 text-sm">
          <div className="grid gap-3 rounded-xl border bg-muted/20 p-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <StatusBadge status={document.status} />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-muted-foreground">Confidence</span>
                <span className="font-medium">{Math.round(document.confidenceScore * 100)}%</span>
              </div>
              <Progress value={Math.round(document.confidenceScore * 100)} className="h-2" />
            </div>
          </div>
          <div className="grid gap-3 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Vendor</span>
              <span className="text-right font-medium">{document.vendorName}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Invoice date</span>
              <span className="font-medium">{document.invoiceDate}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Total amount</span>
              <span className="font-medium">
                {formatMoney(document.totalAmount, document.currency)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Tax amount</span>
              <span className="font-medium">
                {document.taxAmount === null
                  ? "Not detected"
                  : formatMoney(document.taxAmount, document.currency)}
              </span>
            </div>
          </div>
          {document.reviewReasons.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-amber-900 dark:border-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
              <div className="flex items-center gap-2 font-medium">
                <FileWarning className="size-4" />
                Review reasons
              </div>
              <ul className="mt-2 grid gap-1">
                {document.reviewReasons.map((reason) => (
                  <li key={reason}>- {reason}</li>
                ))}
              </ul>
            </div>
          )}
          {showTechnical && (
            <div className="grid gap-3 rounded-lg border p-3">
              <div>
                <div className="text-muted-foreground">Raw object</div>
                <div className="mt-1 break-all font-mono text-xs">
                  {document.s3RawPath}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Processed object</div>
                <div className="mt-1 break-all font-mono text-xs">
                  {document.s3ProcessedPath}
                </div>
              </div>
            </div>
          )}
          {document.errorMessage && (
            <div className="rounded-lg border border-amber-200 p-3 text-amber-700 dark:border-amber-900 dark:text-amber-300">
              {document.errorMessage}
            </div>
          )}
        </div>
        <DrawerFooter>
          {(document.status === "REVIEW_REQUIRED" || document.status === "CORRECTED") && (
            <Button asChild className="cursor-pointer">
              <Link to={`/documents/${document.documentId}`}>
                Review document
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          )}
          <Button asChild variant={document.status === "REVIEW_REQUIRED" || document.status === "CORRECTED" ? "outline" : "default"} className="cursor-pointer">
            <Link to={`/documents/${document.documentId}`}>Open detail</Link>
          </Button>
          <Button variant="outline" className="cursor-pointer" onClick={handleCopy}>
            {copied ? "Copied" : "Copy documentId"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
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
  icon: typeof BarChart3
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

export default function DocumentsPage() {
  const {
    documents: allDocuments,
    mergeDocuments,
    resetDocuments,
    updateDocument,
  } = useDocuFlowDocuments()
  const { session } = useAuth()
  const role = session?.role ?? "finance"
  const apiMode = isApiConfigured()
  const documents =
    role === "finance"
      ? allDocuments.filter((document) => document.userId === session?.userId)
      : allDocuments
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | "ALL">("ALL")
  const [typeFilter, setTypeFilter] = useState<DocumentType | "ALL">("ALL")
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("ALL")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [syncMessage, setSyncMessage] = useState("")
  const [nextToken, setNextToken] = useState<string | null>(null)

  const metrics = useMemo(() => {
    const processing = documents.filter((document) => processingStatuses.includes(document.status)).length
    const needsReview = documents.filter((document) => document.status === "REVIEW_REQUIRED" || document.reviewReasons.length > 0).length
    const failed = documents.filter((document) => document.status === "FAILED").length
    const approved = documents.filter((document) => document.status === "APPROVED").length
    const averageConfidence = documents.length
      ? Math.round((documents.reduce((sum, document) => sum + document.confidenceScore, 0) / documents.length) * 100)
      : 0

    return { processing, needsReview, failed, approved, averageConfidence }
  }, [documents])

  const filteredDocuments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return documents.filter((document) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          document.documentId,
          document.fileName,
          document.vendorName,
          document.status,
          document.documentType,
          document.reviewReasons.join(" "),
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery)
      const matchesStatus = statusFilter === "ALL" || document.status === statusFilter
      const matchesType = typeFilter === "ALL" || document.documentType === typeFilter
      const matchesQuick =
        quickFilter === "ALL" ||
        (quickFilter === "ACTION" && (actionStatuses.includes(document.status) || document.reviewReasons.length > 0)) ||
        (quickFilter === "PROCESSING" && processingStatuses.includes(document.status)) ||
        (quickFilter === "APPROVED" && document.status === "APPROVED") ||
        (quickFilter === "FAILED" && document.status === "FAILED") ||
        (quickFilter === "MY_UPLOADS" && document.userId === session?.userId)

      return matchesQuery && matchesStatus && matchesType && matchesQuick
    })
  }, [documents, query, quickFilter, session?.userId, statusFilter, typeFilter])

  const selectedDocuments = useMemo(
    () => filteredDocuments.filter((document) => selectedIds.includes(document.documentId)),
    [filteredDocuments, selectedIds]
  )
  const allVisibleSelected =
    filteredDocuments.length > 0 &&
    filteredDocuments.every((document) => selectedIds.includes(document.documentId))

  const clearFilters = () => {
    setQuery("")
    setStatusFilter("ALL")
    setTypeFilter("ALL")
    setQuickFilter("ALL")
  }

  const toggleSelected = (documentId: string, checked: boolean) => {
    setSelectedIds((current) =>
      checked
        ? Array.from(new Set([...current, documentId]))
        : current.filter((id) => id !== documentId)
    )
  }

  const toggleAllVisible = (checked: boolean) => {
    setSelectedIds((current) => {
      const visibleIds = filteredDocuments.map((document) => document.documentId)
      if (checked) return Array.from(new Set([...current, ...visibleIds]))
      return current.filter((id) => !visibleIds.includes(id))
    })
  }

  const handleMarkForReview = () => {
    selectedDocuments.forEach((document) => {
      if (document.status === "APPROVED") return
      updateDocument(document.documentId, {
        status: "REVIEW_REQUIRED",
        reviewReasons: Array.from(new Set([...document.reviewReasons, "Manual review requested from document inventory"])),
      })
    })
    setSyncMessage(`${selectedDocuments.length} selected document${selectedDocuments.length === 1 ? "" : "s"} marked for review.`)
    setSelectedIds([])
  }

  const handleRefresh = async (token?: string) => {
    if (!apiMode) {
      setSyncMessage("Local demo data is already current.")
      return
    }

    setIsRefreshing(true)
    setSyncMessage("")
    try {
      const response = await listDocuments(token ? { nextToken: token } : {})
      mergeDocuments(response.items)
      setNextToken(response.nextToken)
      setSyncMessage(`${response.items.length} document${response.items.length === 1 ? "" : "s"} synchronized.`)
    } catch {
      setSyncMessage("Documents could not be refreshed. Try again.")
    } finally {
      setIsRefreshing(false)
    }
  }

  const quickFilters: Array<{ key: QuickFilter; label: string; count: number }> = [
    { key: "ALL", label: "All", count: documents.length },
    { key: "ACTION", label: "Needs action", count: metrics.needsReview },
    { key: "PROCESSING", label: "Processing", count: metrics.processing },
    { key: "FAILED", label: "Failed", count: metrics.failed },
    { key: "APPROVED", label: "Approved", count: metrics.approved },
    { key: "MY_UPLOADS", label: "My uploads", count: documents.filter((document) => document.userId === session?.userId).length },
  ]

  return (
    <BaseLayout
      title="Documents"
      description="Search uploaded invoices and receipts, then open a record to view its result and status."
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
                  {role === "admin" ? "Admin inventory" : "Finance workspace"}
                </Badge>
              </div>
              <h2 className="max-w-3xl text-2xl font-semibold tracking-tight sm:text-3xl">
                Document operations console
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
                Track every file from raw upload through extraction, review, approval, and evidence handoff.
              </p>
            </div>
            <div className="grid min-w-64 gap-2 rounded-xl border border-white/15 bg-white/10 p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/55">Pipeline health</div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-white/70">Average confidence</span>
                <span className="text-2xl font-semibold">{metrics.averageConfidence}%</span>
              </div>
              <Progress value={metrics.averageConfidence} className="h-2 bg-white/15" />
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total documents" value={documents.length} detail={`${filteredDocuments.length} visible after filters`} icon={BarChart3} />
          <MetricCard label="Processing" value={metrics.processing} detail="Uploaded, queued, or Step Functions active" icon={RefreshCw} />
          <MetricCard label="Needs attention" value={metrics.needsReview} detail="Review reasons or low-confidence records" icon={FileWarning} tone={metrics.needsReview ? "warning" : "default"} />
          <MetricCard label="Failures" value={metrics.failed} detail="Failed extraction or unreadable source" icon={AlertTriangle} tone={metrics.failed ? "danger" : "success"} />
        </section>

        <Card>
          <CardHeader className="gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>Document inventory</CardTitle>
                <CardDescription>
                  {filteredDocuments.length} of {documents.length} documents shown.
                  {syncMessage && <span className="ml-2" role="status">{syncMessage}</span>}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                {role === "admin" && (
                  <Button variant="outline" className="cursor-pointer" onClick={resetDocuments}>
                    Reset sample data
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => exportDocumentsCsv(filteredDocuments, "filtered")}
                  disabled={!filteredDocuments.length}
                >
                  <Download className="size-4" />
                  Export CSV
                </Button>
                <Button
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => handleRefresh()}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={isRefreshing ? "size-4 animate-spin" : "size-4"} />
                  Refresh
                </Button>
                <Button asChild className="cursor-pointer">
                  <Link to="/upload">
                    <Plus className="size-4" />
                    Upload
                  </Link>
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {quickFilters.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setQuickFilter(filter.key)}
                  className={[
                    "rounded-full border px-3 py-1.5 text-sm transition-colors",
                    quickFilter === filter.key
                      ? "border-[#0f2a22] bg-[#0f2a22] text-white"
                      : "bg-background hover:border-foreground/30",
                  ].join(" ")}
                >
                  {filter.label}
                  <span className="ml-2 font-mono text-xs opacity-65">{filter.count}</span>
                </button>
              ))}
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_auto] lg:items-center">
              <div className="relative max-w-xl">
                <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search document, vendor, status, or review reason..."
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as DocumentStatus | "ALL")}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All statuses</SelectItem>
                    {Object.entries(statusMeta).map(([status, meta]) => (
                      <SelectItem key={status} value={status}>
                        {meta.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as DocumentType | "ALL")}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All types</SelectItem>
                    <SelectItem value="INVOICE">Invoice</SelectItem>
                    <SelectItem value="RECEIPT">Receipt</SelectItem>
                  </SelectContent>
                </Select>
                {(query || statusFilter !== "ALL" || typeFilter !== "ALL" || quickFilter !== "ALL") && (
                  <Button variant="ghost" className="cursor-pointer" onClick={clearFilters}>
                    <X className="size-4" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            {selectedDocuments.length > 0 && (
              <div className="flex flex-col gap-3 rounded-xl border bg-muted/25 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 font-medium">
                  <ClipboardCheck className="size-4" />
                  {selectedDocuments.length} selected
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => exportDocumentsCsv(selectedDocuments, "selected")}>
                    <Download className="size-4" />
                    Export selected
                  </Button>
                  <Button variant="outline" size="sm" className="cursor-pointer" onClick={handleMarkForReview}>
                    <FileWarning className="size-4" />
                    Mark for review
                  </Button>
                  <Button variant="ghost" size="sm" className="cursor-pointer" onClick={() => setSelectedIds([])}>
                    Clear selection
                  </Button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto rounded-xl border">
              <Table className="min-w-[1080px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        aria-label="Select all visible documents"
                        checked={allVisibleSelected}
                        onChange={(event) => toggleAllVisible(event.target.checked)}
                        className="size-4 rounded border"
                      />
                    </TableHead>
                    <TableHead>Document</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Signal</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((document) => {
                    const needsReview =
                      document.status === "REVIEW_REQUIRED" ||
                      document.status === "FAILED" ||
                      document.reviewReasons.length > 0 ||
                      document.confidenceScore < confidenceWarningThreshold
                    return (
                      <TableRow key={document.documentId} className={selectedIds.includes(document.documentId) ? "bg-muted/35" : undefined}>
                        <TableCell>
                          <input
                            type="checkbox"
                            aria-label={`Select ${document.fileName}`}
                            checked={selectedIds.includes(document.documentId)}
                            onChange={(event) => toggleSelected(document.documentId, event.target.checked)}
                            className="size-4 rounded border"
                          />
                        </TableCell>
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
                          <ConfidenceSignal document={document} />
                        </TableCell>
                        <TableCell>
                          <div>{document.vendorName}</div>
                          {needsReview && (
                            <div className="mt-1 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300">
                              <FileWarning className="size-3" />
                              {document.reviewReasons.length ? `${document.reviewReasons.length} reason${document.reviewReasons.length === 1 ? "" : "s"}` : "Low confidence"}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatMoney(document.totalAmount, document.currency)}
                        </TableCell>
                        <TableCell>{formatDate(document.updatedAt)}</TableCell>
                        <TableCell>
                          {document.status === "APPROVED" ? (
                            <Badge variant="outline" className="border-emerald-200 text-emerald-700">
                              <ShieldCheck className="size-3.5" />
                              Approved
                            </Badge>
                          ) : needsReview ? (
                            <Button asChild variant="outline" size="sm" className="cursor-pointer">
                              <Link to={`/documents/${document.documentId}`}>
                                Review
                                <ArrowRight className="size-3.5" />
                              </Link>
                            </Button>
                          ) : (
                            <Badge variant="outline">
                              <CheckCircle2 className="size-3.5" />
                              On track
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end">
                            <DocumentDrawer document={document} showTechnical={role === "admin"} />
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {!filteredDocuments.length && (
                    <TableRow>
                      <TableCell colSpan={9} className="h-40 text-center">
                        <div className="mx-auto grid max-w-md place-items-center gap-3 py-8">
                          <div className="rounded-full border bg-muted/30 p-3">
                            <SlidersHorizontal className="size-5 text-muted-foreground" />
                          </div>
                          <div className="font-medium">
                            {documents.length ? "No documents match the current filters." : "No documents uploaded yet."}
                          </div>
                          <div className="text-muted-foreground text-sm">
                            {documents.length
                              ? "Clear filters or broaden the search to see the inventory again."
                              : "Upload an invoice or receipt to start the processing pipeline."}
                          </div>
                          {documents.length ? (
                            <Button variant="outline" className="cursor-pointer" onClick={clearFilters}>
                              Clear filters
                            </Button>
                          ) : (
                            <Button asChild className="cursor-pointer">
                              <Link to="/upload">
                                <Plus className="size-4" />
                                Upload document
                              </Link>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {isRefreshing && (
              <div className="flex items-center gap-2 rounded-lg border bg-muted/25 p-3 text-sm text-muted-foreground">
                <RefreshCw className="size-4 animate-spin" />
                Synchronizing document metadata from the API...
              </div>
            )}
            {nextToken && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  onClick={() => handleRefresh(nextToken)}
                  disabled={isRefreshing}
                >
                  Load more
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </BaseLayout>
  )
}
