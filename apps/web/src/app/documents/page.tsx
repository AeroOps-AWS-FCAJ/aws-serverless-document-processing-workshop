"use client"

import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  AlertTriangle, ArrowRight, BarChart3, ClipboardCheck,
  Download, Eye, FileWarning, Plus, RefreshCw, Search,
  SlidersHorizontal, X,
} from "lucide-react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate, formatMoney, statusMeta, type DocumentRecord, type DocumentStatus, type DocumentType } from "@/lib/docuflow-data"
import { useDocuFlowDocuments } from "@/lib/docuflow-store"
import { SpotlightCard } from "@/components/spotlight-card"
import { AnimatePresence, motion } from "framer-motion"
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
      {status === "PROCESSING" ? <span className="pulse-indicator mr-1.5 bg-current" /> : <Icon className="size-3" />}
      {meta.label}
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

function DocumentDrawer({ document, showTechnical }: { document: DocumentRecord; showTechnical: boolean }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => { await navigator.clipboard.writeText(document.documentId); setCopied(true); window.setTimeout(()=>setCopied(false),1400) }
  return (
    <Drawer direction="right">
      <DrawerTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 cursor-pointer text-muted-foreground hover:text-foreground">
          <Eye className="size-4" /><span className="sr-only">Xem tài liệu</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent className="glass-panel">
        <DrawerHeader>
          <DrawerTitle className="truncate">{document.originalFileName}</DrawerTitle>
          <DrawerDescription className="font-mono text-[10px]">
            {document.documentId} · {document.documentType} · cập nhật {formatDate(document.updatedAt)}
          </DrawerDescription>
        </DrawerHeader>
        <div className="grid gap-3 overflow-y-auto px-4 text-sm">
          <div className="grid gap-3 rounded-xl border bg-muted/20 p-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">Trạng thái</span>
              <StatusBadge status={document.status} />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Độ tin cậy</span>
                <span className="font-semibold">{Math.round(document.confidenceScore * 100)}%</span>
              </div>
              <Progress value={Math.round(document.confidenceScore * 100)} className="h-1.5" />
            </div>
          </div>
          <div className="grid gap-2.5 rounded-xl border p-3 text-sm">
            {[
              ["Nhà cung cấp", document.vendorName],
              ["Ngày hóa đơn", document.invoiceDate],
              ["Tổng tiền", formatMoney(document.totalAmount, document.currency)],
              ["Thuế", document.taxAmount == null ? "Không phát hiện" : formatMoney(document.taxAmount, document.currency)],
            ].map(([label, val]) => (
              <div key={label} className="flex items-start justify-between gap-4">
                <span className="text-muted-foreground shrink-0">{label}</span>
                <span className="text-right font-medium">{val}</span>
              </div>
            ))}
          </div>
          {document.reviewReasonCodes.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-amber-900 dark:border-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
              <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold"><FileWarning className="size-3.5" />Lý do cần duyệt</div>
              <ul className="grid gap-1 text-xs">{document.reviewReasonCodes.map((r)=><li key={r}>· {r}</li>)}</ul>
            </div>
          )}
          {showTechnical && (
            <div className="grid gap-2.5 rounded-xl border p-3 text-xs">
              <div><div className="mb-1 text-muted-foreground">Raw object</div><div className="break-all font-mono text-[10px] bg-muted/40 rounded p-2">{document.rawS3Key}</div></div>
              <div><div className="mb-1 text-muted-foreground">Processed object</div><div className="break-all font-mono text-[10px] bg-muted/40 rounded p-2">{document.processedS3Key}</div></div>
            </div>
          )}
        </div>
        <DrawerFooter>
          {(document.status === "REVIEW_REQUIRED" || document.status === "CORRECTED") && (
            <Button asChild className="cursor-pointer"><Link to={`/documents/${document.documentId}`}>Kiểm duyệt<ArrowRight className="size-4" /></Link></Button>
          )}
          <Button asChild variant={document.status === "REVIEW_REQUIRED" || document.status === "CORRECTED" ? "outline" : "default"} className="cursor-pointer">
            <Link to={`/documents/${document.documentId}`}>Mở chi tiết</Link>
          </Button>
          <Button variant="outline" className="cursor-pointer" onClick={handleCopy}>{copied ? "Đã sao chép" : "Sao chép documentId"}</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
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
  const { documents: allDocuments, mergeDocuments, resetDocuments, updateDocument } = useDocuFlowDocuments()
  const { session } = useAuth()
  const role = session?.role ?? "finance"
  const apiMode = isApiConfigured()
  const documents = role === "finance" ? allDocuments.filter((d) => d.userId === session?.userId) : allDocuments
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | "ALL">("ALL")
  const [typeFilter, setTypeFilter] = useState<DocumentType | "ALL">("ALL")
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("ALL")
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [syncMessage, setSyncMessage] = useState("")
  const [nextToken, setNextToken] = useState<string | null>(null)

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
  const totalPages = Math.ceil(totalItems / pageSize)
  const paginatedDocuments = sortedFilteredDocuments.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const clearFilters = () => { setQuery(""); setStatusFilter("ALL"); setTypeFilter("ALL"); setQuickFilter("ALL"); setCurrentPage(1) }
  const toggleSelected = (id: string, checked: boolean) => setSelectedIds((c) => checked ? Array.from(new Set([...c, id])) : c.filter((x) => x !== id))
  const toggleAllVisible = (checked: boolean) => setSelectedIds((c) => { const ids = filteredDocuments.map((d) => d.documentId); return checked ? Array.from(new Set([...c,...ids])) : c.filter((x) => !ids.includes(x)) })

  const handleMarkForReview = () => {
    selectedDocuments.forEach((d) => {
      if (d.status === "APPROVED") return
      updateDocument(d.documentId, { status: "REVIEW_REQUIRED", reviewReasonCodes: Array.from(new Set([...d.reviewReasonCodes, "Yêu cầu duyệt thủ công từ danh sách tài liệu"])) })
    })
    setSyncMessage(`${selectedDocuments.length} tài liệu đã được đánh dấu cần duyệt.`)
    setSelectedIds([])
  }

  const handleRefresh = async (token?: string) => {
    if (!apiMode) { setSyncMessage("Dữ liệu demo cục bộ đã là phiên bản mới nhất."); return }
    setIsRefreshing(true); setSyncMessage("")
    try {
      const res = await listDocuments(token ? { nextToken: token } : {})
      mergeDocuments(res.items); setNextToken(res.nextToken)
      setSyncMessage(`Đã đồng bộ ${res.items.length} tài liệu.`)
    } catch { setSyncMessage("Không thể làm mới. Vui lòng thử lại.") }
    finally { setIsRefreshing(false) }
  }

  const quickFilters: Array<{key: QuickFilter; label: string; count: number}> = [
    { key:"ALL", label:"Tất cả", count:documents.length },
    { key:"ACTION", label:"Cần hành động", count:metrics.needsReview },
    { key:"PROCESSING", label:"Đang xử lý", count:metrics.processing },
    { key:"FAILED", label:"Thất bại", count:metrics.failed },
    { key:"APPROVED", label:"Đã duyệt", count:metrics.approved },
    { key:"MY_UPLOADS", label:"Của tôi", count:documents.filter((d) => d.userId === session?.userId).length },
  ]

  return (
    <BaseLayout title="Tài liệu" description="Tìm kiếm hóa đơn và biên nhận, mở bản ghi để xem kết quả và trạng thái xử lý.">
      <div className="grid gap-5 px-4 lg:px-6">

        {/* Hero */}
        <section className="overflow-hidden rounded-2xl border bg-[#0f2a22] text-white shadow-md">
          <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-start lg:p-6">
            <div className="flex-1">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge className="border-[#d8ff72]/35 bg-[#d8ff72]/12 font-mono text-[9px] uppercase tracking-[0.18em] text-[#d8ff72]">{apiMode ? "AWS API" : "Demo cục bộ"}</Badge>
                <Badge className="border-white/15 bg-white/8 text-white/80 text-xs">{role === "admin" ? "Quản trị viên" : "Không gian tài chính"}</Badge>
              </div>
              <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">Bảng điều khiển tài liệu</h2>
              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-white/60">Theo dõi từng tệp từ lúc tải lên qua trích xuất, duyệt, phê duyệt và bàn giao bằng chứng.</p>
            </div>
            <div className="flex w-full flex-col justify-between gap-3 rounded-xl border border-white/12 bg-white/8 p-4 lg:w-56">
              <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/45">Sức khỏe pipeline</div>
              <div>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="text-xs text-white/60">Độ tin cậy trung bình</span>
                  <span className="text-xl font-semibold">{metrics.averageConfidence}%</span>
                </div>
                <Progress value={metrics.averageConfidence} className="h-1.5 bg-white/15 [&>div]:bg-[#d8ff72]" />
              </div>
            </div>
          </div>
        </section>

        {/* Metrics */}
        <section className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Tổng tài liệu" value={documents.length} detail={`${filteredDocuments.length} hiển thị sau lọc`} icon={BarChart3} />
          <MetricCard label="Đang xử lý" value={metrics.processing} detail="Đã tải, xếp hàng hoặc Step Functions đang chạy" icon={RefreshCw} />
          <MetricCard label="Cần chú ý" value={metrics.needsReview} detail="Lý do duyệt hoặc độ tin cậy thấp" icon={FileWarning} tone={metrics.needsReview ? "warning" : "default"} />
          <MetricCard label="Thất bại" value={metrics.failed} detail="Trích xuất lỗi hoặc tệp không đọc được" icon={AlertTriangle} tone={metrics.failed ? "danger" : "success"} />
        </section>

        {/* Table card */}
        <Card className="rounded-xl shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="gap-4 border-b bg-muted/20 pb-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle className="text-base">Danh sách tài liệu</CardTitle>
                <CardDescription className="text-xs">
                  Hiển thị {filteredDocuments.length} / {documents.length} tài liệu.
                  {syncMessage && <span className="ml-2 text-primary" role="status">{syncMessage}</span>}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                {role === "admin" && (
                  <Button variant="outline" size="sm" className="cursor-pointer" onClick={resetDocuments}>Đặt lại dữ liệu mẫu</Button>
                )}
                <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => exportDocumentsCsv(filteredDocuments, "filtered")} disabled={!filteredDocuments.length}>
                  <Download className="size-3.5" />Xuất CSV
                </Button>
                <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => handleRefresh()} disabled={isRefreshing}>
                  <RefreshCw className={isRefreshing ? "size-3.5 animate-spin" : "size-3.5"} />Làm mới
                </Button>
                <Button asChild size="sm" className="cursor-pointer">
                  <Link to="/upload"><Plus className="size-3.5" />Tải lên</Link>
                </Button>
              </div>
            </div>

            {/* Quick filters */}
            <div className="flex flex-wrap gap-1.5">
              {quickFilters.map((f) => (
                <button key={f.key} type="button" onClick={() => { setQuickFilter(f.key); setCurrentPage(1) }}
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
                <Input value={query} onChange={(e) => { setQuery(e.target.value); setCurrentPage(1) }} placeholder="Tìm tài liệu, nhà cung cấp, trạng thái..." className="pl-9 h-9 text-sm" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as DocumentStatus | "ALL"); setCurrentPage(1) }}>
                  <SelectTrigger className="h-9 w-[170px] text-sm"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                    {Object.entries(statusMeta).map(([s, m]) => <SelectItem key={s} value={s}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v as DocumentType | "ALL"); setCurrentPage(1) }}>
                  <SelectTrigger className="h-9 w-[140px] text-sm"><SelectValue placeholder="Loại" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tất cả loại</SelectItem>
                    <SelectItem value="INVOICE">Hóa đơn</SelectItem>
                    <SelectItem value="RECEIPT">Biên nhận</SelectItem>
                  </SelectContent>
                </Select>
                {(query || statusFilter !== "ALL" || typeFilter !== "ALL" || quickFilter !== "ALL") && (
                  <Button variant="ghost" size="sm" className="cursor-pointer h-9" onClick={clearFilters}><X className="size-3.5" />Xóa</Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="grid gap-3 p-4">
            {/* Bulk action bar */}
            {selectedDocuments.length > 0 && (
              <div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 font-medium text-primary">
                  <ClipboardCheck className="size-4" />{selectedDocuments.length} đã chọn
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => exportDocumentsCsv(selectedDocuments, "selected")}><Download className="size-3.5" />Xuất đã chọn</Button>
                  <Button variant="outline" size="sm" className="cursor-pointer" onClick={handleMarkForReview}><FileWarning className="size-3.5" />Đánh dấu cần duyệt</Button>
                  <Button variant="ghost" size="sm" className="cursor-pointer" onClick={() => setSelectedIds([])}>Bỏ chọn</Button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto rounded-xl border">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="w-10">
                      <input type="checkbox" aria-label="Chọn tất cả" checked={allVisibleSelected} onChange={(e) => toggleAllVisible(e.target.checked)} className="size-4 rounded border accent-primary" />
                    </TableHead>
                    <TableHead className="min-w-[200px] w-[30%]">Tài liệu</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Độ tin cậy</TableHead>
                    <TableHead>Nhà cung cấp</TableHead>
                    <TableHead className="text-right">Số tiền</TableHead>
                    <TableHead>Cập nhật</TableHead>
                    <TableHead className="w-[110px]">Hành động</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence initial={false}>
                    {paginatedDocuments.map((d) => {
                      const needsReview = d.status === "REVIEW_REQUIRED" || d.status === "FAILED" || d.reviewReasonCodes.length > 0 || d.confidenceScore < confidenceWarningThreshold
                      const isSelected = selectedIds.includes(d.documentId)
                      return (
                        <motion.tr key={d.documentId} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.15 }}
                          className={`border-b transition-colors ${isSelected ? "bg-primary/5 hover:bg-primary/8" : "hover:bg-muted/30"}`}>
                          <TableCell>
                            <input type="checkbox" aria-label={`Chọn ${d.originalFileName}`} checked={isSelected} onChange={(e) => toggleSelected(d.documentId, e.target.checked)} className="size-4 rounded border accent-primary" />
                          </TableCell>
                          <TableCell className="max-w-[250px]">
                            <div className="font-medium text-sm leading-tight truncate" title={d.originalFileName}>{d.originalFileName}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                              <span className="font-mono truncate" title={d.documentId}>{d.documentId.split('-')[1] || d.documentId.slice(0,8)}</span>
                              <Badge variant="secondary" className="h-4 px-1.5 font-mono text-[9px]">{d.documentType === "INVOICE" ? "Hóa đơn" : "Biên nhận"}</Badge>
                            </div>
                          </TableCell>
                          <TableCell><StatusBadge status={d.status} /></TableCell>
                          <TableCell><ConfidenceSignal document={d} /></TableCell>
                          <TableCell>
                            <div className="text-sm">{d.vendorName}</div>
                            {needsReview && (
                              <div className="mt-0.5 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                                <FileWarning className="size-3 shrink-0" />
                                {d.reviewReasonCodes.length ? `${d.reviewReasonCodes.length} lý do` : "Độ tin cậy thấp"}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums text-sm">{formatMoney(d.totalAmount, d.currency)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatDate(d.updatedAt)}</TableCell>
                          <TableCell>
                            {needsReview ? (
                              <Button asChild variant="outline" size="sm" className="cursor-pointer h-7 text-xs border-amber-500/50 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-400">
                                <Link to={`/documents/${d.documentId}`}>Duyệt<ArrowRight className="size-3 ml-1" /></Link>
                              </Button>
                            ) : (
                              <Button asChild variant="outline" size="sm" className="cursor-pointer h-7 text-xs">
                                <Link to={`/documents/${d.documentId}`}>Xem chi tiết<ArrowRight className="size-3 ml-1" /></Link>
                              </Button>
                            )}
                          </TableCell>
                          <TableCell><DocumentDrawer document={d} showTechnical={role === "admin"} /></TableCell>
                        </motion.tr>
                      )
                    })}
                  </AnimatePresence>
                  {!filteredDocuments.length && (
                    <TableRow>
                      <TableCell colSpan={9} className="h-44 text-center">
                        <div className="mx-auto grid max-w-xs place-items-center gap-3 py-6">
                          <div className="rounded-full border bg-muted/30 p-3"><SlidersHorizontal className="size-5 text-muted-foreground" /></div>
                          <div className="font-medium text-sm">{documents.length ? "Không có tài liệu nào khớp." : "Chưa có tài liệu nào."}</div>
                          <p className="text-xs text-muted-foreground">{documents.length ? "Xóa bộ lọc để xem lại." : "Tải hóa đơn hoặc biên nhận lên để bắt đầu."}</p>
                          {documents.length
                            ? <Button variant="outline" size="sm" className="cursor-pointer" onClick={clearFilters}>Xóa bộ lọc</Button>
                            : <Button asChild size="sm" className="cursor-pointer"><Link to="/upload"><Plus className="size-3.5" />Tải lên</Link></Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3 sm:px-6">
                <div className="flex flex-1 justify-between sm:hidden">
                  <Button type="button" onClick={() => setCurrentPage((p: number) => Math.max(1, p - 1))} disabled={currentPage === 1} variant="outline" size="sm">Trước</Button>
                  <Button type="button" onClick={() => setCurrentPage((p: number) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} variant="outline" size="sm">Tiếp</Button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Hiển thị <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> đến <span className="font-medium">{Math.min(currentPage * pageSize, totalItems)}</span> trong <span className="font-medium">{totalItems}</span> kết quả
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" onClick={() => setCurrentPage((p: number) => Math.max(1, p - 1))} disabled={currentPage === 1} variant="outline" size="sm">Trước</Button>
                    <Button type="button" onClick={() => setCurrentPage((p: number) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} variant="outline" size="sm">Tiếp</Button>
                  </div>
                </div>
              </div>
            )}


            {nextToken && (
              <div className="flex justify-center pt-1">
                <Button variant="outline" size="sm" onClick={() => handleRefresh(nextToken)} disabled={isRefreshing}>Tải thêm</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </BaseLayout>
  )
}
