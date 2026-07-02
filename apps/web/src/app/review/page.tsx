"use client"

import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  ArrowRight, BadgeCheck, Bell, CheckCircle2, Clock3, Download, Eye,
  FileWarning, ListChecks, MailWarning, Search, ShieldAlert, X,
} from "lucide-react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate, formatMoney, statusMeta, type DocumentRecord, type DocumentStatus } from "@/lib/docuflow-data"
import { useDocuFlowDocuments } from "@/lib/docuflow-store"
import { SpotlightCard } from "@/components/spotlight-card"
import { useAuth } from "@/contexts/auth-context"
import { isApiConfigured } from "@/lib/docuflow-api"
import { CONFIDENCE_THRESHOLD } from "@docuflow/shared-config"

type QueueFilter = "ALL" | "REVIEW_REQUIRED" | "FAILED" | "CORRECTED" | "LOW_CONFIDENCE" | "OLDEST"
type Priority = "Cao" | "Trung bình" | "Thấp"

const attentionStatuses: DocumentStatus[] = ["REVIEW_REQUIRED", "FAILED", "CORRECTED"]

function StatusBadge({ status }: { status: DocumentStatus }) {
  const meta = statusMeta[status]; const Icon = meta.icon
  return <Badge variant="outline" className={meta.tone}><Icon className="size-3" />{meta.label}</Badge>
}

function getAgeDays(updatedAt: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86_400_000))
}

function getPriority(d: DocumentRecord): Priority {
  const age = getAgeDays(d.updatedAt)
  if (d.status === "FAILED" || d.confidenceScore < 0.5 || age >= 3) return "Cao"
  if (d.status === "REVIEW_REQUIRED" || (Array.isArray(d.reviewReasons) && d.reviewReasons.length > 1) || age >= 1) return "Trung bình"
  return "Thấp"
}

function priorityClass(p: Priority) {
  if (p === "Cao") return "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300"
  if (p === "Trung bình") return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-300"
  return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-300"
}

function actionLabel(status: DocumentStatus) {
  if (status === "CORRECTED") return "Phê duyệt"
  if (status === "FAILED") return "Kiểm tra"
  return "Duyệt"
}

function attentionReason(d: DocumentRecord) {
  if (d.status === "CORRECTED") return "Các trường đã chỉnh sửa, sẵn sàng để phê duyệt."
  if (Array.isArray(d.reviewReasons) && d.reviewReasons.length) return d.reviewReasons.join("; ")
  return d.errorMessage ?? "Một hoặc nhiều trường bắt buộc không thể xác nhận."
}

function escapeCsv(v: string | number | null) { return `"${String(v ?? "").replace(/"/g, '""')}"` }

function exportReviewCsv(items: DocumentRecord[]) {
  const header = ["documentId","fileName","status","priority","vendor","confidence","ageDays","reason","updatedAt"]
  const rows = items.map((d) => [d.documentId,d.fileName,d.status,getPriority(d),d.vendorName,Math.round(d.confidenceScore*100),getAgeDays(d.updatedAt),attentionReason(d),d.updatedAt])
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
  const priority = getPriority(d); const confidence = Math.round(d.confidenceScore * 100)
  return (
    <Drawer direction="right">
      <DrawerTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 cursor-pointer text-muted-foreground hover:text-foreground">
          <Eye className="size-4" /><span className="sr-only">Xem trước</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="truncate">{d.fileName}</DrawerTitle>
          <DrawerDescription className="font-mono text-[10px]">{d.documentId} · {d.documentType} · chờ {getAgeDays(d.updatedAt)} ngày</DrawerDescription>
        </DrawerHeader>
        <div className="grid gap-3 overflow-y-auto px-4 text-sm">
          <div className="grid gap-3 rounded-xl border bg-muted/20 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <StatusBadge status={d.status} />
              <Badge variant="outline" className={priorityClass(priority)}>Ưu tiên: {priority}</Badge>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Độ tin cậy</span><span className="font-semibold">{confidence}%</span>
              </div>
              <Progress value={confidence} className={`h-1.5 ${confidence < 80 ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500"}`} />
            </div>
          </div>
          <div className="grid gap-2.5 rounded-xl border p-3">
            {[["Nhà cung cấp",d.vendorName],["Ngày",d.invoiceDate],["Tổng tiền",formatMoney(d.totalAmount,d.currency)],["Thuế",d.taxAmount===null?"Không phát hiện":formatMoney(d.taxAmount,d.currency)]].map(([l,v])=>(
              <div key={l} className="flex items-start justify-between gap-4 text-xs">
                <span className="text-muted-foreground shrink-0">{l}</span><span className="text-right font-medium">{v}</span>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-amber-900 dark:border-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
            <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold"><FileWarning className="size-3.5" />Lý do ngoại lệ</div>
            <div className="text-xs leading-5">{attentionReason(d)}</div>
          </div>
        </div>
        <DrawerFooter>
          <Button asChild className="cursor-pointer"><Link to={`/documents/${d.documentId}`}>Mở không gian duyệt<ArrowRight className="size-4" /></Link></Button>
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
  const documents = role === "finance" ? allDocuments.filter((d) => d.userId === session?.userId) : allDocuments
  const [query, setQuery] = useState("")
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("ALL")

  const alertItems = useMemo(() =>
    documents.filter((d) => attentionStatuses.includes(d.status))
      .sort((a, b) => {
        const po: Record<Priority, number> = { "Cao": 0, "Trung bình": 1, "Thấp": 2 }
        const pd = po[getPriority(a)] - po[getPriority(b)]
        return pd !== 0 ? pd : new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
      }), [documents])

  const metrics = useMemo(() => ({
    reviewRequired: alertItems.filter((d) => d.status === "REVIEW_REQUIRED").length,
    failed: alertItems.filter((d) => d.status === "FAILED").length,
    corrected: alertItems.filter((d) => d.status === "CORRECTED").length,
    highPriority: alertItems.filter((d) => getPriority(d) === "Cao").length,
    oldestAge: alertItems.length ? Math.max(...alertItems.map((d) => getAgeDays(d.updatedAt))) : 0,
  }), [alertItems])

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase()
    return alertItems.filter((d) => {
      const mq = !q || [d.documentId,d.fileName,d.vendorName,d.status,d.documentType,Array.isArray(d.reviewReasons) ? d.reviewReasons.join(" ") : "",d.errorMessage].join(" ").toLowerCase().includes(q)
      const mf = queueFilter==="ALL" || d.status===queueFilter
        || (queueFilter==="LOW_CONFIDENCE" && d.confidenceScore < CONFIDENCE_THRESHOLD)
        || (queueFilter==="OLDEST" && getAgeDays(d.updatedAt) >= 1)
      return mq && mf
    })
  }, [alertItems, query, queueFilter])

  const quickFilters: Array<{key: QueueFilter; label: string; count: number}> = [
    { key:"ALL", label:"Tất cả", count:alertItems.length },
    { key:"REVIEW_REQUIRED", label:"Cần duyệt", count:metrics.reviewRequired },
    { key:"FAILED", label:"Thất bại", count:metrics.failed },
    { key:"CORRECTED", label:"Chờ phê duyệt", count:metrics.corrected },
    { key:"LOW_CONFIDENCE", label:"Độ tin cậy thấp", count:alertItems.filter((d)=>d.confidenceScore<CONFIDENCE_THRESHOLD).length },
    { key:"OLDEST", label:"Hơn 1 ngày", count:alertItems.filter((d)=>getAgeDays(d.updatedAt)>=1).length },
  ]

  return (
    <BaseLayout title="Hàng đợi kiểm duyệt"
      description={role === "admin" ? "Theo dõi tài liệu chưa giải quyết trên toàn hệ thống." : "Xác minh trường chưa chắc chắn, giải quyết tệp thất bại và phê duyệt kết quả đã chỉnh sửa."}>
      <div className="grid min-w-0 gap-5 px-4 lg:px-6">

        {/* Hero */}
        <section className="overflow-hidden rounded-2xl border bg-[#0f2a22] text-white shadow-md">
          <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-start lg:p-6">
            <div className="flex-1">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge className="border-[#d8ff72]/35 bg-[#d8ff72]/12 font-mono text-[9px] uppercase tracking-[0.18em] text-[#d8ff72]">{apiMode ? "AWS API" : "Demo cục bộ"}</Badge>
                <Badge className="border-white/15 bg-white/8 text-white/80 text-xs">{role === "admin" ? "Giám sát ngoại lệ" : "Không gian kiểm duyệt tài chính"}</Badge>
              </div>
              <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">Hàng đợi ngoại lệ và kiểm soát phê duyệt</h2>
              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-white/60">Ưu tiên tài liệu độ tin cậy thấp, thất bại và đã chỉnh sửa trước khi trở thành bản ghi tài chính đáng tin cậy.</p>
            </div>
            <div className="flex w-full flex-col justify-between gap-3 rounded-xl border border-white/12 bg-white/8 p-4 lg:w-52">
              <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/45">Chưa giải quyết lâu nhất</div>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-semibold">{metrics.oldestAge}</span>
                <span className="pb-1 text-sm text-white/60">ngày</span>
              </div>
              <div className="text-[10px] text-white/40">Sắp xếp theo ưu tiên, sau đó theo cũ nhất.</div>
            </div>
          </div>
        </section>

        {/* Metrics */}
        <section className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Chờ duyệt" value={alertItems.length} detail="Tất cả bản ghi ngoại lệ chưa giải quyết" icon={Bell} tone={alertItems.length ? "warning" : "success"} />
          <MetricCard label="Ưu tiên cao" value={metrics.highPriority} detail="Thất bại, độ tin cậy rất thấp hoặc đã cũ" icon={ShieldAlert} tone={metrics.highPriority ? "danger" : "default"} />
          <MetricCard label="Cần chỉnh sửa" value={metrics.reviewRequired} detail="Trường cần xác minh thủ công" icon={FileWarning} />
          <MetricCard label="Chờ phê duyệt" value={metrics.corrected} detail="Đã lưu chỉnh sửa, sẵn sàng phê duyệt" icon={BadgeCheck} />
        </section>

        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Main table */}
          <Card className="min-w-0 rounded-xl shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className="gap-4 border-b bg-muted/20 pb-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base"><Bell className="size-4" />Hàng đợi chú ý</CardTitle>
                  <CardDescription className="text-xs">Hiển thị {filteredItems.length} / {alertItems.length} bản ghi ngoại lệ.</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => exportReviewCsv(filteredItems)} disabled={!filteredItems.length}>
                  <Download className="size-3.5" />Xuất ngoại lệ
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {quickFilters.map((f) => (
                  <button key={f.key} type="button" onClick={() => setQueueFilter(f.key)}
                    className={["rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150",
                      f.key === queueFilter ? "border-[#0f2a22] bg-[#0f2a22] text-white shadow-sm" : "bg-background hover:border-foreground/25 hover:bg-muted/40"].join(" ")}>
                    {f.label}<span className={`ml-1.5 font-mono text-[9px] ${f.key === queueFilter ? "opacity-70" : "opacity-45"}`}>{f.count}</span>
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                <div className="relative max-w-lg flex-1">
                  <Search className="text-muted-foreground absolute left-3 top-1/2 size-3.5 -translate-y-1/2" />
                  <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm tệp, nhà cung cấp, lý do, trạng thái..." className="pl-9 h-9 text-sm" />
                </div>
                {(query || queueFilter !== "ALL") && (
                  <Button variant="ghost" size="sm" className="cursor-pointer h-9" onClick={() => { setQuery(""); setQueueFilter("ALL") }}>
                    <X className="size-3.5" />Xóa
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-4">
              <div className="overflow-x-auto rounded-xl border">
                <Table className="min-w-[900px]">
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead>Tài liệu</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Ưu tiên</TableHead>
                      <TableHead>Độ tin cậy</TableHead>
                      <TableHead>Lý do</TableHead>
                      <TableHead>Tuổi</TableHead>
                      <TableHead className="w-24" />
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((d) => {
                      const priority = getPriority(d); const confidence = Math.round(d.confidenceScore * 100)
                      return (
                        <TableRow key={d.documentId} className="hover:bg-muted/25">
                          <TableCell>
                            <div className="font-medium text-sm leading-tight">{d.fileName}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                              <span className="font-mono">{d.documentId}</span>
                              <Badge variant="secondary" className="h-4 px-1.5 font-mono text-[9px]">{d.documentType === "INVOICE" ? "HĐ" : "BN"}</Badge>
                            </div>
                          </TableCell>
                          <TableCell><StatusBadge status={d.status} /></TableCell>
                          <TableCell><Badge variant="outline" className={priorityClass(priority)}>{priority}</Badge></TableCell>
                          <TableCell>
                            <div className="min-w-20">
                              <div className={`mb-1 text-xs font-semibold ${confidence < 80 ? "text-amber-600 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"}`}>{confidence}%</div>
                              <Progress value={confidence} className={`h-1.5 ${confidence < 80 ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500"}`} />
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[240px]"><div className="line-clamp-2 text-xs leading-5 text-muted-foreground">{attentionReason(d)}</div></TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-xs"><Clock3 className="size-3 text-muted-foreground" />{getAgeDays(d.updatedAt)}n</div>
                            <div className="text-muted-foreground text-xs">{formatDate(d.updatedAt)}</div>
                          </TableCell>
                          <TableCell>
                            <Button asChild variant="outline" size="sm" className="cursor-pointer h-7 text-xs">
                              <Link to={`/documents/${d.documentId}`}>{actionLabel(d.status)}<ArrowRight className="size-3" /></Link>
                            </Button>
                          </TableCell>
                          <TableCell><ReviewPreviewDrawer document={d} /></TableCell>
                        </TableRow>
                      )
                    })}
                    {!filteredItems.length && (
                      <TableRow>
                        <TableCell colSpan={8} className="h-44 text-center">
                          <div className="mx-auto grid max-w-xs place-items-center gap-3 py-6">
                            <div className="rounded-full border bg-muted/30 p-3">
                              {alertItems.length ? <Search className="size-5 text-muted-foreground" /> : <CheckCircle2 className="size-5 text-emerald-600" />}
                            </div>
                            <div className="font-medium text-sm">{alertItems.length ? "Không có mục nào khớp." : "Hàng đợi trống."}</div>
                            <p className="text-xs text-muted-foreground">{alertItems.length ? "Xóa bộ lọc để thấy tất cả ngoại lệ." : "Tất cả ngoại lệ đã được giải quyết."}</p>
                            {alertItems.length
                              ? <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => { setQuery(""); setQueueFilter("ALL") }}>Xóa bộ lọc</Button>
                              : <Button asChild variant="outline" size="sm" className="cursor-pointer"><Link to="/documents">Về danh sách</Link></Button>}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Sidebar cards */}
          <div className="grid gap-4 content-start">
            <Card className="rounded-xl shadow-sm transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base"><MailWarning className="size-4" />Chuỗi cảnh báo</CardTitle>
                <CardDescription className="text-xs">Hàng đợi được nạp bởi điểm tin cậy và tín hiệu workflow thất bại.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2.5">
                <div className="flex items-center justify-between rounded-xl border bg-muted/20 p-3 text-sm">
                  <span>Ngưỡng tin cậy</span>
                  <Badge variant="outline" className="font-mono">{Math.round(CONFIDENCE_THRESHOLD * 100)}%</Badge>
                </div>
                <div className="flex items-center justify-between rounded-xl border bg-muted/20 p-3 text-sm">
                  <span>Cảnh báo workflow thất bại</span>
                  <Badge variant="outline" className="font-mono">{metrics.failed}</Badge>
                </div>
                <div className="rounded-xl border bg-muted/20 p-3 text-xs leading-5 text-muted-foreground">
                  Cảnh báo SNS/SES sẽ xuất hiện dưới dạng bản ghi REVIEW_REQUIRED hoặc FAILED, sau đó tài chính giải quyết vấn đề trường nguồn.
                </div>
                {role === "admin" && (
                  <Button asChild variant="outline" size="sm" className="cursor-pointer">
                    <Link to="/settings/notifications">Cài đặt cảnh báo<ArrowRight className="size-4" /></Link>
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-xl shadow-sm transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base"><ListChecks className="size-4" />Danh sách kiểm tra duyệt</CardTitle>
                <CardDescription className="text-xs">Xác nhận các trường nghiệp vụ trước khi phê duyệt.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2.5">
                {[
                  "Nhà cung cấp khớp với tài liệu nguồn",
                  "Ngày hóa đơn và tiền tệ chính xác",
                  "Tổng tiền và thuế đã đối chiếu",
                  "Ghi chú duyệt giải thích bất kỳ chỉnh sửa nào",
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
