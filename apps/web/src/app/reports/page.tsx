"use client"

import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
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
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAuth } from "@/contexts/auth-context"
import {
  formatDate,
  formatMoney,
  statusMeta,
  type DocumentRecord,
  type DocumentStatus,
} from "@/lib/docuflow-data"
import { useDocuFlowDocuments } from "@/lib/docuflow-store"

function toVnd(document: DocumentRecord) {
  return document.currency === "USD" ? document.totalAmount * 25_000 : document.totalAmount
}

function escapeCsv(value: string | number | null) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`
}

function exportCsv(documents: DocumentRecord[]) {
  const header = ["documentId", "fileName", "vendor", "type", "status", "currency", "amount", "amountVnd", "confidence", "updatedAt"]
  const rows = documents.map((document) => [
    document.documentId,
    document.fileName,
    document.vendorName,
    document.documentType,
    document.status,
    document.currency,
    document.totalAmount,
    toVnd(document),
    Math.round(document.confidenceScore * 100),
    document.updatedAt,
  ])
  const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n")
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
  const link = document.createElement("a")
  link.href = url
  link.download = "docuflow-bao-cao.csv"
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

export default function ReportsPage() {
  const { documents } = useDocuFlowDocuments()
  const { session } = useAuth()
  
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const visibleDocuments = useMemo(
    () => documents.filter((document) => session?.role === "admin" || document.userId === session?.userId),
    [documents, session?.role, session?.userId]
  )

  const reportableDocuments = useMemo(
    () => visibleDocuments.filter((document) => document.totalAmount > 0),
    [visibleDocuments]
  )

  const totalVnd = reportableDocuments.reduce((sum, document) => sum + toVnd(document), 0)
  const approvedVnd = reportableDocuments
    .filter((document) => document.status === "APPROVED")
    .reduce((sum, document) => sum + toVnd(document), 0)
  const reviewExposure = visibleDocuments.filter((document) =>
    ["REVIEW_REQUIRED", "FAILED", "CORRECTED"].includes(document.status)
  ).length
  const averageConfidence = visibleDocuments.length
    ? Math.round((visibleDocuments.reduce((sum, document) => sum + document.confidenceScore, 0) / visibleDocuments.length) * 100)
    : 0

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
  }, [reportableDocuments])

  const monthlyRows = useMemo(() => {
    const grouped = new Map<string, { month: string; amount: number; documents: number }>()
    reportableDocuments.forEach((document) => {
      const date = new Date(document.invoiceDate)
      const month = Number.isNaN(date.getTime())
        ? "Không xác định"
        : date.toLocaleDateString("vi-VN", { month: "long", year: "numeric" })
      const current = grouped.get(month) ?? { month, amount: 0, documents: 0 }
      current.amount += toVnd(document)
      current.documents += 1
      grouped.set(month, current)
    })
    return [...grouped.values()].sort((a, b) => a.month.localeCompare(b.month))
  }, [reportableDocuments])

  const maxVendorAmount = Math.max(...vendorRows.map((row) => row.amount), 1)
  const maxMonthlyAmount = Math.max(...monthlyRows.map((row) => row.amount), 1)

  const statusRows = (Object.keys(statusMeta) as DocumentStatus[]).map((status) => ({
    status,
    count: visibleDocuments.filter((document) => document.status === status).length,
  }))

  const sortedVisibleDocuments = useMemo(() => {
    return visibleDocuments.slice().sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
  }, [visibleDocuments])

  const totalItems = sortedVisibleDocuments.length
  const totalPages = Math.ceil(totalItems / pageSize)
  const paginatedDocuments = sortedVisibleDocuments.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <BaseLayout title="Báo cáo tài chính">
      {/* ── Hero Banner ─────────────────────────────────────────────────────── */}
      <section className="px-4 lg:px-6">
        <div className="overflow-hidden rounded-2xl border bg-[#10261d] text-white shadow-lg">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]">
            {/* Left: title + actions */}
            <div className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-[#d8ff72]/40 bg-[#d8ff72]/15 font-mono text-[10px] uppercase text-[#d8ff72]">
                  Báo cáo
                </Badge>
                <Badge variant="outline" className="border-white/20 bg-white/5 font-mono text-[10px] uppercase text-white/75">
                  {session?.role === "admin" ? "Toàn hệ thống" : "Không gian của tôi"}
                </Badge>
              </div>
              <h2 className="mt-2 max-w-3xl font-display text-lg font-semibold leading-snug tracking-tight text-white md:text-xl">
                Chi tiêu, nhà cung cấp và tình trạng xử lý tài liệu.
              </h2>
              <p className="mt-1.5 max-w-2xl text-xs leading-6 text-white/62">
                Tổng hợp số liệu từ hóa đơn và biên nhận đã xử lý: chi tiêu theo nhà cung cấp,
                theo tháng và trạng thái từng tài liệu.
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button className="bg-[#d8ff72] text-[#10261d] hover:bg-[#c7ee5f]" onClick={() => exportCsv(visibleDocuments)}>
                  <Download className="size-4" />
                  Xuất báo cáo CSV
                </Button>
                <Button asChild variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                  <Link to="/documents">
                    Xem danh sách tài liệu
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </div>
            {/* Right: KPI tiles */}
            <div className="grid grid-cols-2 border-t border-white/12 lg:border-l lg:border-t-0">
              {[
                { label: "Tổng giá trị", value: formatMoney(totalVnd, "VND"), icon: BadgeDollarSign },
                { label: "Đã duyệt", value: formatMoney(approvedVnd, "VND"), icon: CheckCircle2 },
                { label: "Cần xử lý", value: reviewExposure, icon: FileWarning },
                { label: "Độ tin cậy TB", value: `${averageConfidence}%`, icon: TrendingUp },
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

      {/* ── Charts section ──────────────────────────────────────────────────── */}
      <section className="grid gap-5 px-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)] xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] lg:px-6">
        {/* Vendor spend */}
        <Card>
          <CardHeader className="border-b bg-muted/25">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="size-5" />
              Chi tiêu theo nhà cung cấp
            </CardTitle>
            <CardDescription>Giá trị quy đổi VNĐ, sắp xếp theo tổng chi tiêu.</CardDescription>
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
                Chưa có dữ liệu chi tiêu. Hãy tải tài liệu lên và chờ xử lý hoàn tất.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-5">
          {/* Monthly totals */}
          <Card>
            <CardHeader className="border-b bg-muted/25">
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="size-5" />
                Chi tiêu theo tháng
              </CardTitle>
              <CardDescription>Tổng giá trị hóa đơn / biên nhận theo tháng.</CardDescription>
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
                <div className="text-sm text-muted-foreground">Chưa có dữ liệu theo tháng.</div>
              )}
            </CardContent>
          </Card>

          {/* Status mix */}
          <Card>
            <CardHeader className="border-b bg-muted/25">
              <CardTitle className="flex items-center gap-2">
                <PieChart className="size-5" />
                Phân bổ trạng thái
              </CardTitle>
              <CardDescription>Tài liệu theo từng giai đoạn xử lý.</CardDescription>
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
                <div className="text-sm text-muted-foreground">Chưa có tài liệu nào.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── Document table ──────────────────────────────────────────────────── */}
      <section className="px-4 lg:px-6">
        <Card>
          <CardHeader className="border-b bg-muted/25">
            <CardTitle className="flex items-center gap-2">
              <FileBarChart2 className="size-5" />
              Danh sách tài liệu
            </CardTitle>
            <CardDescription>Tất cả tài liệu kèm trạng thái và độ tin cậy trích xuất.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="min-w-[800px]">
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead>Tên tài liệu</TableHead>
                    <TableHead>Nhà cung cấp</TableHead>
                    <TableHead>Số tiền</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Độ tin cậy</TableHead>
                    <TableHead>Cập nhật</TableHead>
                    <TableHead className="w-[100px]">Chi tiết</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedDocuments.length ? (
                    paginatedDocuments
                      .map((document) => (
                        <TableRow key={document.documentId}>
                          <TableCell className="max-w-[200px]">
                            <div className="truncate font-medium" title={document.fileName}>{document.fileName}</div>
                            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                              <ReceiptText className="size-3" />
                              {document.documentType === "INVOICE" ? "Hóa đơn" : "Biên nhận"}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{document.vendorName}</TableCell>
                          <TableCell className="font-mono text-sm">{formatMoney(document.totalAmount, document.currency)}</TableCell>
                          <TableCell><StatusBadge status={document.status} /></TableCell>
                          <TableCell>
                            <span className={`font-mono text-sm font-semibold ${document.confidenceScore > 0 && document.confidenceScore < 0.8 ? "text-amber-600" : "text-emerald-700 dark:text-emerald-400"}`}>
                              {Math.round(document.confidenceScore * 100)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatDate(document.updatedAt)}</TableCell>
                          <TableCell>
                            <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                              <Link to={`/documents/${document.documentId}`}>
                                Xem <ArrowRight className="ml-1 size-3" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-sm text-muted-foreground">
                        Chưa có tài liệu nào.{" "}
                        <Link to="/upload" className="text-primary underline underline-offset-2">Tải lên ngay</Link>
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
          </CardContent>
        </Card>
      </section>
    </BaseLayout>
  )
}
