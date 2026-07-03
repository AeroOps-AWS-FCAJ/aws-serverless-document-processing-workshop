"use client"

import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Download,
  FileBarChart2,
  FileWarning,
  PieChart,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  TrendingUp,
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
import { Checkbox } from "@/components/ui/checkbox"
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
import { TableBulkControls, type BulkTableColumn, type TableColumnVisibility } from "@/components/table-bulk-controls"
import { TablePagination } from "@/components/table-pagination"
import { TableSkeletonRows } from "@/components/table-skeleton-rows"
import { useAuth } from "@/contexts/auth-context"
import {
  convertToDemoVnd,
  demoCurrencyRateDetail,
  formatDate,
  formatMoney,
  statusMeta,
  type DocumentRecord,
  type DocumentStatus,
} from "@/lib/docuflow-data"
import { useDocuFlowDocuments } from "@/lib/docuflow-store"
import { useDocumentsSync } from "@/hooks/use-documents-sync"
import { getReportsSummary, type ReportsSummaryResponse } from "@/lib/docuflow-api"

type DocumentTypeFilter = "ALL" | "INVOICE" | "RECEIPT"
type StatusFilter = "ALL" | DocumentStatus

const defaultColumnVisibility: TableColumnVisibility = {
  document: true,
  vendor: true,
  invoice: true,
  amount: true,
  status: true,
  confidence: true,
  updated: true,
  detail: true,
}

const reportColumns: BulkTableColumn[] = [
  { key: "document", label: "Tài liệu", locked: true },
  { key: "vendor", label: "Nhà cung cấp" },
  { key: "invoice", label: "Số/Ngày hóa đơn" },
  { key: "amount", label: "Số tiền" },
  { key: "status", label: "Trạng thái" },
  { key: "confidence", label: "Độ tin cậy" },
  { key: "updated", label: "Cập nhật" },
  { key: "detail", label: "Chi tiết", locked: true },
]

function toVnd(document: DocumentRecord) {
  return convertToDemoVnd(document.totalAmount, document.currency)
}

function escapeCsv(value: string | number | null | undefined) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`
}

function formatReportDate(value?: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("vi-VN")
}

function getDateSortValue(value?: string | null) {
  const date = new Date(value || "")
  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}

function getSearchText(document: DocumentRecord) {
  return [
    document.documentId,
    document.originalFileName,
    document.vendorName,
    document.invoiceNumber,
    document.invoiceDate,
    document.currency,
    document.status,
    document.documentType,
  ].join(" ").toLowerCase()
}

function exportCsv(documents: DocumentRecord[], suffix = "bao-cao") {
  const header = [
    "documentId",
    "originalFileName",
    "vendor",
    "invoiceNumber",
    "invoiceDate",
    "type",
    "status",
    "reviewStatus",
    "currency",
    "subtotalAmount",
    "taxAmount",
    "discountAmount",
    "shippingAmount",
    "totalAmount",
    "amountVnd",
    "confidence",
    "reviewedAt",
    "reviewedBy",
    "updatedAt",
    "rawS3Key",
    "processedS3Key",
  ]
  const rows = documents.map((document) => [
    document.documentId,
    document.originalFileName,
    document.vendorName,
    document.invoiceNumber ?? "",
    document.invoiceDate,
    document.documentType,
    document.status,
    document.reviewStatus,
    document.currency,
    document.subtotalAmount ?? "",
    document.taxAmount ?? "",
    document.discountAmount ?? "",
    document.shippingAmount ?? "",
    document.totalAmount,
    toVnd(document),
    Math.round(document.confidenceScore * 100),
    document.reviewedAt ?? "",
    document.reviewedBy ?? "",
    document.updatedAt,
    document.rawS3Key,
    document.processedS3Key,
  ])
  const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n")
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }))
  const link = document.createElement("a")
  link.href = url
  link.download = `docuflow-${suffix}-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

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

function FilterLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-xs font-medium text-muted-foreground">{children}</label>
}

export default function ReportsPage() {
  const { documents, mergeDocuments } = useDocuFlowDocuments()
  const { session } = useAuth()
  const { apiMode, isSyncing, refreshDocuments, syncError, syncMessage } = useDocumentsSync(mergeDocuments, { loadAllPages: true })

  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL")
  const [vendorFilter, setVendorFilter] = useState("ALL")
  const [currencyFilter, setCurrencyFilter] = useState("ALL")
  const [typeFilter, setTypeFilter] = useState<DocumentTypeFilter>("ALL")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [approvedOnly, setApprovedOnly] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [columnVisibility, setColumnVisibility] = useState<TableColumnVisibility>(defaultColumnVisibility)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [apiSummary, setApiSummary] = useState<ReportsSummaryResponse | null>(null)
  const [isLoadingSummary, setIsLoadingSummary] = useState(false)
  const [summaryWarning, setSummaryWarning] = useState<string | null>(null)

  const visibleDocuments = useMemo(
    () => documents.filter((document) => apiMode || session?.role === "admin" || document.userId === session?.userId),
    [apiMode, documents, session?.role, session?.userId]
  )

  const vendors = useMemo(
    () => Array.from(new Set(visibleDocuments.map((document) => document.vendorName).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [visibleDocuments]
  )

  const currencies = useMemo(
    () => Array.from(new Set(visibleDocuments.map((document) => document.currency).filter(Boolean))).sort(),
    [visibleDocuments]
  )

  const filteredBeforeApproval = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const fromTime = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null
    const toTime = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : null

    return visibleDocuments.filter((document) => {
      const invoiceTime = getDateSortValue(document.invoiceDate)
      const matchesQuery = !normalizedQuery || getSearchText(document).includes(normalizedQuery)
      const matchesStatus = statusFilter === "ALL" || document.status === statusFilter
      const matchesVendor = vendorFilter === "ALL" || document.vendorName === vendorFilter
      const matchesCurrency = currencyFilter === "ALL" || document.currency === currencyFilter
      const matchesType = typeFilter === "ALL" || document.documentType === typeFilter
      const matchesFrom = fromTime == null || (invoiceTime > 0 && invoiceTime >= fromTime)
      const matchesTo = toTime == null || (invoiceTime > 0 && invoiceTime <= toTime)

      return matchesQuery && matchesStatus && matchesVendor && matchesCurrency && matchesType && matchesFrom && matchesTo
    })
  }, [currencyFilter, dateFrom, dateTo, query, statusFilter, typeFilter, vendorFilter, visibleDocuments])

  const filteredDocuments = useMemo(
    () => approvedOnly ? filteredBeforeApproval.filter((document) => document.status === "APPROVED") : filteredBeforeApproval,
    [approvedOnly, filteredBeforeApproval]
  )

  const hasReportFilters = Boolean(
    query.trim() ||
    statusFilter !== "ALL" ||
    vendorFilter !== "ALL" ||
    currencyFilter !== "ALL" ||
    typeFilter !== "ALL" ||
    dateFrom ||
    dateTo ||
    !approvedOnly
  )

  const reportableDocuments = useMemo(
    () => filteredDocuments.filter((document) => document.totalAmount > 0),
    [filteredDocuments]
  )

  const selectedDocuments = useMemo(
    () => filteredDocuments.filter((document) => selectedIds.includes(document.documentId)),
    [filteredDocuments, selectedIds]
  )

  const totalVnd = reportableDocuments.reduce((sum, document) => sum + toVnd(document), 0)
  const approvedVnd = filteredBeforeApproval
    .filter((document) => document.status === "APPROVED" && document.totalAmount > 0)
    .reduce((sum, document) => sum + toVnd(document), 0)
  const pendingVnd = filteredBeforeApproval
    .filter((document) => document.status !== "APPROVED" && document.totalAmount > 0)
    .reduce((sum, document) => sum + toVnd(document), 0)
  const reviewExposure = filteredBeforeApproval.filter((document) =>
    ["REVIEW_REQUIRED", "FAILED", "CORRECTED"].includes(document.status)
  ).length
  const confidenceBase = reportableDocuments.filter((document) => document.confidenceScore > 0)
  const averageConfidence = confidenceBase.length
    ? Math.round((confidenceBase.reduce((sum, document) => sum + document.confidenceScore, 0) / confidenceBase.length) * 100)
    : 0
  const canUseApiSummary = Boolean(apiSummary && !hasReportFilters)
  const summaryTotalVnd = canUseApiSummary && typeof apiSummary?.totalAmountVnd === "number" ? apiSummary.totalAmountVnd : totalVnd
  const summaryApprovedVnd = canUseApiSummary && typeof apiSummary?.approvedAmountVnd === "number" ? apiSummary.approvedAmountVnd : approvedVnd
  const summaryPendingVnd = canUseApiSummary && typeof apiSummary?.pendingAmountVnd === "number" ? apiSummary.pendingAmountVnd : pendingVnd
  const summaryAverageConfidence = canUseApiSummary && typeof apiSummary?.averageConfidence === "number"
    ? Math.round(apiSummary.averageConfidence <= 1 ? apiSummary.averageConfidence * 100 : apiSummary.averageConfidence)
    : averageConfidence

  const vendorRows = useMemo(() => {
    const grouped = new Map<string, { vendor: string; amount: number; documents: number; confidence: number }>()
    reportableDocuments.forEach((document) => {
      const current = grouped.get(document.vendorName) ?? {
        vendor: document.vendorName,
        amount: 0,
        documents: 0,
        confidence: 0,
      }
      current.amount += toVnd(document)
      current.documents += 1
      current.confidence += document.confidenceScore
      grouped.set(document.vendorName, current)
    })
    return [...grouped.values()]
      .map((row) => ({ ...row, confidence: Math.round((row.confidence / row.documents) * 100) }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8)
  }, [reportableDocuments])

  const monthlyRows = useMemo(() => {
    const grouped = new Map<string, { month: string; sortKey: string; amount: number; documents: number }>()
    reportableDocuments.forEach((document) => {
      const date = new Date(document.invoiceDate)
      const isInvalid = Number.isNaN(date.getTime())
      const month = isInvalid
        ? "Không xác định"
        : date.toLocaleDateString("vi-VN", { month: "long", year: "numeric" })
      const sortKey = isInvalid ? "9999-99" : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      const current = grouped.get(month) ?? { month, sortKey, amount: 0, documents: 0 }
      current.amount += toVnd(document)
      current.documents += 1
      grouped.set(month, current)
    })
    return [...grouped.values()].sort((a, b) => a.sortKey.localeCompare(b.sortKey)).slice(-6)
  }, [reportableDocuments])

  const statusRows = (Object.keys(statusMeta) as DocumentStatus[]).map((status) => ({
    status,
    count: filteredBeforeApproval.filter((document) => document.status === status).length,
  }))

  const anomalyDocuments = useMemo(() => {
    return filteredBeforeApproval
      .filter((document) =>
        document.status === "FAILED" ||
        document.status === "REVIEW_REQUIRED" ||
        (document.confidenceScore > 0 && document.confidenceScore < 0.7) ||
        !document.vendorName ||
        !document.invoiceDate ||
        document.totalAmount <= 0
      )
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
      .slice(0, 5)
  }, [filteredBeforeApproval])

  const sortedFilteredDocuments = useMemo(() => {
    return filteredDocuments.slice().sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
  }, [filteredDocuments])

  const totalItems = sortedFilteredDocuments.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const paginatedDocuments = sortedFilteredDocuments.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const selectedIdSet = new Set(selectedIds)
  const allFilteredSelected = filteredDocuments.length > 0 && filteredDocuments.every((document) => selectedIdSet.has(document.documentId))
  const maxVendorAmount = Math.max(...vendorRows.map((row) => row.amount), 1)
  const maxMonthlyAmount = Math.max(...monthlyRows.map((row) => row.amount), 1)
  const visibleColumnCount = reportColumns.filter((column) => columnVisibility[column.key] !== false).length + 1

  useEffect(() => {
    setCurrentPage(1)
  }, [approvedOnly, currencyFilter, dateFrom, dateTo, query, statusFilter, typeFilter, vendorFilter])

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages))
  }, [totalPages])

  useEffect(() => {
    const allowedIds = new Set(filteredDocuments.map((document) => document.documentId))
    setSelectedIds((current) => current.filter((id) => allowedIds.has(id)))
  }, [filteredDocuments])

  useEffect(() => {
    if (syncMessage.startsWith("Đã đồng bộ")) {
      setLastSyncedAt(new Date().toISOString())
    }
  }, [syncMessage])

  useEffect(() => {
    if (!apiMode) {
      setApiSummary(null)
      setSummaryWarning(null)
      return
    }

    let cancelled = false

    async function loadSummary() {
      setIsLoadingSummary(true)
      setSummaryWarning(null)
      try {
        const summary = await getReportsSummary()
        if (!cancelled) setApiSummary(summary)
      } catch {
        if (!cancelled) {
          setApiSummary(null)
          setSummaryWarning("Backend chưa trả được /reports/summary, KPI đang tính từ danh sách tài liệu.")
        }
      } finally {
        if (!cancelled) setIsLoadingSummary(false)
      }
    }

    void loadSummary()

    return () => {
      cancelled = true
    }
  }, [apiMode])

  const isColumnVisible = (key: string) => columnVisibility[key] !== false

  const resetFilters = () => {
    setQuery("")
    setStatusFilter("ALL")
    setVendorFilter("ALL")
    setCurrencyFilter("ALL")
    setTypeFilter("ALL")
    setDateFrom("")
    setDateTo("")
    setApprovedOnly(true)
  }

  const refreshReportData = async () => {
    await refreshDocuments()
    if (!apiMode) return

    setIsLoadingSummary(true)
    setSummaryWarning(null)
    try {
      setApiSummary(await getReportsSummary())
    } catch {
      setApiSummary(null)
      setSummaryWarning("Backend chưa trả được /reports/summary, KPI đang tính từ danh sách tài liệu.")
    } finally {
      setIsLoadingSummary(false)
    }
  }

  const toggleSelected = (documentId: string, checked: boolean) => {
    setSelectedIds((current) => checked ? Array.from(new Set([...current, documentId])) : current.filter((id) => id !== documentId))
  }

  const toggleAllFiltered = (checked: boolean) => {
    const ids = filteredDocuments.map((document) => document.documentId)
    setSelectedIds((current) => checked ? Array.from(new Set([...current, ...ids])) : current.filter((id) => !ids.includes(id)))
  }

  return (
    <BaseLayout title="Báo cáo tài chính">
      <section className="px-4 lg:px-6">
        <div className="overflow-hidden rounded-2xl border bg-[#10261d] text-white shadow-lg">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_420px]">
            <div className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-[#d8ff72]/40 bg-[#d8ff72]/15 font-mono text-[10px] uppercase text-[#d8ff72]">
                  Báo cáo
                </Badge>
                <Badge variant="outline" className="border-white/20 bg-white/5 font-mono text-[10px] uppercase text-white/75">
                  {session?.role === "admin" ? "Toàn hệ thống" : "Không gian của tôi"}
                </Badge>
                <Badge variant="outline" className="border-white/20 bg-white/5 font-mono text-[10px] uppercase text-white/75">
                  {approvedOnly ? "Chỉ đã duyệt" : "Bao gồm chưa duyệt"}
                </Badge>
              </div>
              <h2 className="mt-2 max-w-3xl font-display text-lg font-semibold leading-snug tracking-tight text-white md:text-xl">
                Chi tiêu, nhà cung cấp và rủi ro xử lý tài liệu.
              </h2>
              <p className="mt-1.5 max-w-2xl text-xs leading-6 text-white/62">
                Tổng hợp từ tập tài liệu đang lọc. {demoCurrencyRateDetail()}.
                {syncMessage && <span className="ml-2 text-[#d8ff72]">{syncMessage}</span>}
              </p>
              {(syncError || summaryWarning) && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-300/30 bg-amber-300/10 p-3 text-xs leading-5 text-amber-100">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  {syncError ?? summaryWarning}
                </div>
              )}
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={refreshReportData} disabled={isSyncing || isLoadingSummary}>
                  <RefreshCw className={isSyncing || isLoadingSummary ? "size-4 animate-spin" : "size-4"} />
                  Làm mới
                </Button>
                <Button className="bg-[#d8ff72] text-[#10261d] hover:bg-[#c7ee5f]" onClick={() => exportCsv(selectedDocuments.length ? selectedDocuments : filteredDocuments, selectedDocuments.length ? "da-chon" : "da-loc")}>
                  <Download className="size-4" />
                  {selectedDocuments.length ? `Xuất ${selectedDocuments.length} đã chọn` : "Xuất báo cáo CSV"}
                </Button>
                <Button asChild variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                  <Link to="/documents">
                    Xem danh sách tài liệu
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
              <div className="mt-3 text-[11px] text-white/45">
                {lastSyncedAt ? `Đồng bộ lần cuối ${formatDate(lastSyncedAt)}` : apiMode ? "Chưa đồng bộ phiên này" : "Đang dùng dữ liệu demo cục bộ"}
              </div>
            </div>

            <div className="grid grid-cols-2 border-t border-white/12 lg:border-l lg:border-t-0">
              {[
                { label: canUseApiSummary ? "Tổng API summary" : approvedOnly ? "Đã duyệt trong bộ lọc" : "Tổng trong bộ lọc", value: formatMoney(summaryTotalVnd, "VND"), icon: BadgeDollarSign },
                { label: "Đã duyệt", value: formatMoney(summaryApprovedVnd, "VND"), icon: CheckCircle2 },
                { label: "Chờ xác minh", value: formatMoney(summaryPendingVnd, "VND"), icon: FileWarning },
                { label: "Độ tin cậy TB", value: `${summaryAverageConfidence}%`, icon: TrendingUp },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="border-b border-r border-white/12 p-3 last:border-r-0 sm:p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <Icon className="size-3.5 text-[#d8ff72]" />
                    </div>
                    <div className="text-lg font-semibold text-white">{item.value}</div>
                    <div className="mt-0.5 text-xs text-white/50">{item.label}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 lg:px-6">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="border-b bg-muted/20">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Search className="size-4" />
                  Bộ lọc báo cáo
                </CardTitle>
                <CardDescription>Áp dụng cho KPI, biểu đồ, bảng và file CSV xuất ra.</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="cursor-pointer" onClick={resetFilters}>
                <RotateCcw className="size-3.5" />
                Đặt lại
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 p-4">
            <div className="grid gap-3 lg:grid-cols-[1.3fr_repeat(4,minmax(150px,1fr))]">
              <div className="grid gap-1.5">
                <FilterLabel>Tìm kiếm</FilterLabel>
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên file, vendor, mã hóa đơn..." />
              </div>
              <div className="grid gap-1.5">
                <FilterLabel>Trạng thái</FilterLabel>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tất cả</SelectItem>
                    {(Object.keys(statusMeta) as DocumentStatus[]).map((status) => (
                      <SelectItem key={status} value={status}>{statusMeta[status].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <FilterLabel>Nhà cung cấp</FilterLabel>
                <Select value={vendorFilter} onValueChange={setVendorFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tất cả</SelectItem>
                    {vendors.map((vendor) => <SelectItem key={vendor} value={vendor}>{vendor}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <FilterLabel>Tiền tệ</FilterLabel>
                <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tất cả</SelectItem>
                    {currencies.map((currency) => <SelectItem key={currency} value={currency}>{currency}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <FilterLabel>Loại tài liệu</FilterLabel>
                <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as DocumentTypeFilter)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tất cả</SelectItem>
                    <SelectItem value="INVOICE">Hóa đơn</SelectItem>
                    <SelectItem value="RECEIPT">Biên nhận</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-[repeat(2,minmax(160px,220px))_1fr]">
              <div className="grid gap-1.5">
                <FilterLabel>Từ ngày hóa đơn</FilterLabel>
                <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <FilterLabel>Đến ngày hóa đơn</FilterLabel>
                <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
              </div>
              <label className="flex min-h-10 cursor-pointer items-center gap-2 self-end rounded-xl border bg-muted/15 px-3 text-sm">
                <Checkbox checked={approvedOnly} onCheckedChange={(value) => setApprovedOnly(value === true)} />
                <span className="font-medium">Chỉ tính dữ liệu đã phê duyệt</span>
                <span className="text-xs text-muted-foreground">Khuyến nghị cho báo cáo tài chính</span>
              </label>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 px-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)] xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] lg:px-6">
        <Card>
          <CardHeader className="border-b bg-muted/25">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="size-5" />
              Chi tiêu theo nhà cung cấp
            </CardTitle>
            <CardDescription>Top nhà cung cấp theo giá trị quy đổi VNĐ trong bộ lọc hiện tại.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 pt-5">
            {vendorRows.length ? (
              vendorRows.map((row) => (
                <div key={row.vendor} className="grid gap-2 rounded-xl border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">{row.vendor}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.documents} tài liệu · Độ tin cậy TB {row.confidence}%
                      </div>
                    </div>
                    <div className="font-mono text-sm font-semibold">{formatMoney(row.amount, "VND")}</div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${Math.max(8, (row.amount / maxVendorAmount) * 100)}%` }} />
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                Không có chi tiêu phù hợp bộ lọc hiện tại.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-5">
          <Card>
            <CardHeader className="border-b bg-muted/25">
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="size-5" />
                Chi tiêu theo tháng
              </CardTitle>
              <CardDescription>6 tháng gần nhất trong tập báo cáo.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 pt-5">
              {monthlyRows.length ? (
                monthlyRows.map((row) => (
                  <div key={row.month} className="grid gap-2">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium capitalize">{row.month}</span>
                      <span className="font-mono text-muted-foreground">{formatMoney(row.amount, "VND")}</span>
                    </div>
                    <Progress value={(row.amount / maxMonthlyAmount) * 100} />
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">Không có dữ liệu theo tháng.</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b bg-muted/25">
              <CardTitle className="flex items-center gap-2">
                <PieChart className="size-5" />
                Phân bổ trạng thái
              </CardTitle>
              <CardDescription>Trạng thái trước khi áp dụng chế độ chỉ đã duyệt.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 pt-5">
              {statusRows.filter((row) => row.count > 0).length ? (
                statusRows.filter((row) => row.count > 0).map((row) => (
                  <div key={row.status} className="flex items-center justify-between gap-3 rounded-xl border p-3">
                    <StatusBadge status={row.status} />
                    <span className="font-mono text-sm font-semibold">{row.count}</span>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">Không có tài liệu trong bộ lọc.</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b bg-muted/25">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="size-5" />
                Cần chú ý
              </CardTitle>
              <CardDescription>{reviewExposure} tài liệu đang có rủi ro kiểm duyệt hoặc xử lý.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 pt-5">
              {anomalyDocuments.length ? anomalyDocuments.map((document) => (
                <Link key={document.documentId} to={`/documents/${document.documentId}`} className="flex items-center justify-between gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/30">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{document.originalFileName}</div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">{document.vendorName || "Thiếu nhà cung cấp"} · {formatMoney(document.totalAmount, document.currency)}</div>
                  </div>
                  <StatusBadge status={document.status} />
                </Link>
              )) : (
                <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Không có bất thường trong bộ lọc hiện tại.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="px-4 lg:px-6">
        <Card>
          <CardHeader className="border-b bg-muted/25">
            <CardTitle className="flex items-center gap-2">
              <FileBarChart2 className="size-5" />
              Danh sách tài liệu
            </CardTitle>
            <CardDescription>{filteredDocuments.length} tài liệu phù hợp bộ lọc, {reportableDocuments.length} tài liệu có giá trị báo cáo.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 p-4">
            <TableBulkControls
              selectedCount={selectedDocuments.length}
              totalCount={filteredDocuments.length}
              allSelected={allFilteredSelected}
              columns={reportColumns}
              columnVisibility={columnVisibility}
              onToggleAll={toggleAllFiltered}
              onClearSelection={() => setSelectedIds([])}
              onColumnVisibilityChange={(key, visible) => setColumnVisibility((current) => ({ ...current, [key]: visible }))}
              onResetColumns={() => setColumnVisibility(defaultColumnVisibility)}
            >
              <Button size="sm" className="h-8 cursor-pointer" onClick={() => exportCsv(selectedDocuments, "da-chon")}>
                <Download className="size-3.5" />
                Xuất đã chọn
              </Button>
            </TableBulkControls>
          </CardContent>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="min-w-[960px]">
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead className="w-10" />
                    {isColumnVisible("document") && <TableHead>Tên tài liệu</TableHead>}
                    {isColumnVisible("vendor") && <TableHead>Nhà cung cấp</TableHead>}
                    {isColumnVisible("invoice") && <TableHead>Số/Ngày hóa đơn</TableHead>}
                    {isColumnVisible("amount") && <TableHead>Số tiền</TableHead>}
                    {isColumnVisible("status") && <TableHead>Trạng thái</TableHead>}
                    {isColumnVisible("confidence") && <TableHead>Độ tin cậy</TableHead>}
                    {isColumnVisible("updated") && <TableHead>Cập nhật</TableHead>}
                    {isColumnVisible("detail") && <TableHead className="w-[100px]">Chi tiết</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isSyncing ? (
                    <TableSkeletonRows rows={Math.min(pageSize, 10)} columns={visibleColumnCount} />
                  ) : paginatedDocuments.length ? (
                    paginatedDocuments.map((document) => {
                      const isSelected = selectedIds.includes(document.documentId)
                      return (
                        <TableRow key={document.documentId} className={isSelected ? "bg-primary/5" : undefined}>
                          <TableCell>
                            <Checkbox checked={isSelected} onCheckedChange={(value) => toggleSelected(document.documentId, value === true)} aria-label={`Chọn ${document.originalFileName}`} />
                          </TableCell>
                          {isColumnVisible("document") && (
                            <TableCell className="max-w-[220px]">
                              <div className="truncate font-medium" title={document.originalFileName}>{document.originalFileName}</div>
                              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                                <ReceiptText className="size-3" />
                                {document.documentType === "INVOICE" ? "Hóa đơn" : "Biên nhận"}
                              </div>
                            </TableCell>
                          )}
                          {isColumnVisible("vendor") && <TableCell className="text-sm">{document.vendorName}</TableCell>}
                          {isColumnVisible("invoice") && (
                            <TableCell className="text-sm">
                              <div className="font-mono text-xs">{document.invoiceNumber || "—"}</div>
                              <div className="mt-1 text-xs text-muted-foreground">{formatReportDate(document.invoiceDate)}</div>
                            </TableCell>
                          )}
                          {isColumnVisible("amount") && (
                            <TableCell className="font-mono text-sm">
                              <div>{formatMoney(document.totalAmount, document.currency)}</div>
                              {document.currency !== "VND" && <div className="mt-1 text-xs text-muted-foreground">{formatMoney(toVnd(document), "VND")}</div>}
                            </TableCell>
                          )}
                          {isColumnVisible("status") && <TableCell><StatusBadge status={document.status} /></TableCell>}
                          {isColumnVisible("confidence") && (
                            <TableCell>
                              <span className={`font-mono text-sm font-semibold ${document.confidenceScore > 0 && document.confidenceScore < 0.8 ? "text-amber-600" : document.confidenceScore === 0 ? "text-muted-foreground" : "text-emerald-700 dark:text-emerald-400"}`}>
                                {Math.round(document.confidenceScore * 100)}%
                              </span>
                            </TableCell>
                          )}
                          {isColumnVisible("updated") && <TableCell className="text-xs text-muted-foreground">{formatDate(document.updatedAt)}</TableCell>}
                          {isColumnVisible("detail") && (
                            <TableCell>
                              <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                                <Link to={`/documents/${document.documentId}`}>
                                  Xem <ArrowRight className="ml-1 size-3" />
                                </Link>
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={visibleColumnCount} className="h-32 text-center text-sm text-muted-foreground">
                        Không có tài liệu phù hợp bộ lọc.{" "}
                        <button type="button" className="text-primary underline underline-offset-2" onClick={resetFilters}>Đặt lại bộ lọc</button>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <TablePagination
              page={currentPage}
              pageSize={pageSize}
              totalItems={totalItems}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              onPageSizeChange={(nextPageSize) => {
                setPageSize(nextPageSize)
                setCurrentPage(1)
              }}
              isLoading={isSyncing}
            />
          </CardContent>
        </Card>
      </section>
    </BaseLayout>
  )
}
