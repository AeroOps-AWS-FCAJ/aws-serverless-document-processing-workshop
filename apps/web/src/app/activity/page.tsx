"use client"

import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileClock,
  FilePlus2,
  FileWarning,
  Filter,
  History,
  ListChecks,
  Search,
  ShieldCheck,
  UploadCloud,
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
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/auth-context"
import {
  formatDate,
  statusMeta,
  type DocumentRecord,
  type DocumentStatus,
} from "@/lib/docuflow-data"
import { useDocuFlowDocuments } from "@/lib/docuflow-store"

type ActivityKind = "UPLOAD" | "PROCESSING" | "REVIEW" | "APPROVAL"
type ActivityFilter = "ALL" | ActivityKind

interface ActivityEvent {
  id: string
  kind: ActivityKind
  title: string
  detail: string
  timestamp: string
  document: DocumentRecord
  icon: typeof History
}

const filters: Array<{ label: string; value: ActivityFilter }> = [
  { label: "Tất cả", value: "ALL" },
  { label: "Tải lên", value: "UPLOAD" },
  { label: "Đang xử lý", value: "PROCESSING" },
  { label: "Chờ duyệt", value: "REVIEW" },
  { label: "Đã duyệt", value: "APPROVAL" },
]

function buildEvents(document: DocumentRecord): ActivityEvent[] {
  const events: ActivityEvent[] = [
    {
      id: `${document.documentId}-created`,
      kind: "UPLOAD",
      title: "Tài liệu được tải lên",
      detail: `${document.fileName} đã được đưa vào hàng đợi xử lý.`,
      timestamp: document.createdAt,
      document,
      icon: UploadCloud,
    },
  ]

  if (document.status === "UPLOADED" || document.status === "QUEUED" || document.status === "PROCESSING") {
    events.push({
      id: `${document.documentId}-processing`,
      kind: "PROCESSING",
      title: statusMeta[document.status].label,
      detail: document.errorMessage ?? "Tài liệu đang chờ pipeline xử lý tự động.",
      timestamp: document.updatedAt,
      document,
      icon: FileClock,
    })
  }

  if (document.status === "EXTRACTED") {
    events.push({
      id: `${document.documentId}-extracted`,
      kind: "PROCESSING",
      title: "Trích xuất hoàn tất",
      detail: `${document.vendorName} được trích xuất với độ tin cậy ${Math.round(document.confidenceScore * 100)}%.`,
      timestamp: document.updatedAt,
      document,
      icon: CheckCircle2,
    })
  }

  if (document.status === "REVIEW_REQUIRED" || document.status === "FAILED") {
    events.push({
      id: `${document.documentId}-review`,
      kind: "REVIEW",
      title: document.status === "FAILED" ? "Xử lý thất bại" : "Cần kiểm duyệt",
      detail: document.reviewReasons.length ? document.reviewReasons.join("; ") : document.errorMessage ?? "Cần xác minh thủ công.",
      timestamp: document.updatedAt,
      document,
      icon: FileWarning,
    })
  }

  if (document.status === "CORRECTED") {
    events.push({
      id: `${document.documentId}-corrected`,
      kind: "REVIEW",
      title: "Đã chỉnh sửa",
      detail: document.reviewerNote ?? "Các trường không chắc chắn đã được cập nhật.",
      timestamp: document.reviewedAt ?? document.updatedAt,
      document,
      icon: FileCheck2,
    })
  }

  if (document.status === "APPROVED") {
    events.push({
      id: `${document.documentId}-approved`,
      kind: "APPROVAL",
      title: "Tài liệu đã được duyệt",
      detail: document.reviewerNote ?? "Kết quả trích xuất đã được xác nhận.",
      timestamp: document.reviewedAt ?? document.updatedAt,
      document,
      icon: ShieldCheck,
    })
  }

  return events
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

// Kind label map
const kindLabel: Record<ActivityKind, string> = {
  UPLOAD: "Tải lên",
  PROCESSING: "Xử lý",
  REVIEW: "Kiểm duyệt",
  APPROVAL: "Phê duyệt",
}

export default function ActivityPage() {
  const { documents } = useDocuFlowDocuments()
  const { session } = useAuth()
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<ActivityFilter>("ALL")
  
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const visibleDocuments = useMemo(
    () => documents.filter((document) => session?.role === "admin" || document.userId === session?.userId),
    [documents, session?.role, session?.userId]
  )

  const events = useMemo(
    () =>
      visibleDocuments
        .flatMap(buildEvents)
        .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)),
    [visibleDocuments]
  )

  const filteredEvents = events.filter((event) => {
    const text = `${event.title} ${event.detail} ${event.document.fileName} ${event.document.vendorName}`.toLowerCase()
    return (filter === "ALL" || event.kind === filter) && (!query.trim() || text.includes(query.trim().toLowerCase()))
  })

  const totalItems = filteredEvents.length
  const totalPages = Math.ceil(totalItems / pageSize)
  const paginatedEvents = filteredEvents.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const uploadedCount = events.filter((event) => event.kind === "UPLOAD").length
  const reviewCount = events.filter((event) => event.kind === "REVIEW").length
  const approvalCount = events.filter((event) => event.kind === "APPROVAL").length
  const latestEvent = events[0]

  return (
    <BaseLayout title="Lịch sử hoạt động">
      {/* ── Hero Banner ─────────────────────────────────────────────────────── */}
      <section className="px-4 lg:px-6">
        <div className="overflow-hidden rounded-2xl border bg-[#10261d] text-white shadow-lg">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-[#d8ff72]/40 bg-[#d8ff72]/15 font-mono text-[10px] uppercase text-[#d8ff72]">
                  Hoạt động
                </Badge>
                <Badge variant="outline" className="border-white/20 bg-white/5 font-mono text-[10px] uppercase text-white/75">
                  {session?.name ?? "Người dùng"}
                </Badge>
              </div>
              <h2 className="mt-2 max-w-3xl font-display text-lg font-semibold leading-snug tracking-tight text-white md:text-xl">
                Theo dõi toàn bộ quá trình xử lý tài liệu của bạn.
              </h2>
              <p className="mt-1.5 max-w-2xl text-xs leading-6 text-white/62">
                Ghi lại từng bước — từ lúc tải lên, xử lý, chờ duyệt đến khi hoàn tất phê duyệt.
              </p>
            </div>
            {/* Right: KPI tiles */}
            <div className="grid grid-cols-2 border-t border-white/12 lg:border-l lg:border-t-0">
              {[
                { label: "Tổng sự kiện", value: events.length, icon: History },
                { label: "Đã tải lên", value: uploadedCount, icon: FilePlus2 },
                { label: "Chờ duyệt", value: reviewCount, icon: FileWarning },
                { label: "Đã duyệt", value: approvalCount, icon: CheckCircle2 },
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

      {/* ── Filter + Timeline ────────────────────────────────────────────────── */}
      <section className="grid min-w-0 gap-5 px-4 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)] lg:px-6">

        {/* Sidebar — hidden on mobile, shown on lg+ */}
        <div className="hidden lg:grid gap-5 content-start">
          <Card className="h-fit min-w-0">
            <CardHeader className="border-b bg-muted/25">
              <CardTitle className="flex items-center gap-2">
                <Filter className="size-5" />
                Bộ lọc
              </CardTitle>
              <CardDescription>Tìm kiếm và lọc theo loại hoạt động.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 pt-5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(event) => { setQuery(event.target.value); setCurrentPage(1) }} className="pl-9" placeholder="Tìm kiếm tên tài liệu..." />
                {query && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 size-7 -translate-y-1/2"
                    onClick={() => { setQuery(""); setCurrentPage(1) }}
                  >
                    <X className="size-4" />
                    <span className="sr-only">Xóa tìm kiếm</span>
                  </Button>
                )}
              </div>
              <div className="grid gap-2">
                {filters.map((item) => (
                  <Button
                    key={item.value}
                    type="button"
                    variant={filter === item.value ? "default" : "outline"}
                    className="justify-between"
                    onClick={() => { setFilter(item.value); setCurrentPage(1) }}
                  >
                    {item.label}
                    <span className="font-mono text-xs">
                      {item.value === "ALL" ? events.length : events.filter((event) => event.kind === item.value).length}
                    </span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Latest event */}
          <Card>
            <CardHeader className="border-b bg-muted/25">
              <CardTitle className="flex items-center gap-2">
                <Clock3 className="size-5" />
                Hoạt động mới nhất
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              {latestEvent ? (
                <div>
                  <div className="font-medium">{latestEvent.title}</div>
                  <div className="mt-1 text-sm leading-6 text-muted-foreground">{latestEvent.detail}</div>
                  <div className="mt-3 font-mono text-xs text-muted-foreground">{formatDate(latestEvent.timestamp)}</div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Chưa có hoạt động nào.</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Timeline + Mobile Filters */}
        <Card className="min-w-0">
          <CardHeader className="border-b bg-muted/25">
            <div className="flex flex-col gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ListChecks className="size-5" />
                  Dòng thời gian
                </CardTitle>
                <CardDescription>
                  Hiển thị {paginatedEvents.length} / {events.length} sự kiện.
                </CardDescription>
              </div>
              {/* Mobile-only: search + filter chips */}
              <div className="flex flex-col gap-3 lg:hidden">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={query} onChange={(event) => { setQuery(event.target.value); setCurrentPage(1) }} className="pl-9" placeholder="Tìm kiếm..." />
                  {query && (
                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 size-7 -translate-y-1/2" onClick={() => { setQuery(""); setCurrentPage(1) }}>
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {filters.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => { setFilter(item.value); setCurrentPage(1) }}
                      className={[
                        "rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150",
                        filter === item.value
                          ? "border-[#0f2a22] bg-[#0f2a22] text-white shadow-sm"
                          : "bg-background hover:border-foreground/25 hover:bg-muted/40",
                      ].join(" ")}
                    >
                      {item.label}
                      <span className={`ml-1.5 font-mono text-[10px] ${filter === item.value ? "opacity-75" : "opacity-50"}`}>
                        {item.value === "ALL" ? events.length : events.filter((event) => event.kind === item.value).length}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 pt-5">
            {paginatedEvents.length ? (
              paginatedEvents.map((event) => {
                const Icon = event.icon
                return (
                  <div key={event.id} className="grid gap-4 rounded-xl border p-4 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div className="flex gap-4 min-w-0">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-muted/30">
                        <Icon className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-medium">{event.title}</div>
                          <Badge variant="secondary" className="text-xs">{kindLabel[event.kind]}</Badge>
                          <StatusBadge status={event.document.status} />
                        </div>
                        <div className="mt-1 text-sm leading-6 text-muted-foreground">{event.detail}</div>
                        <div className="mt-1.5 truncate text-xs text-muted-foreground">
                          {event.document.fileName} · {formatDate(event.timestamp)}
                        </div>
                      </div>
                    </div>
                    <Button asChild variant="outline" size="sm" className="shrink-0 w-fit">
                      <Link to={`/documents/${event.document.documentId}`}>
                        Xem <ArrowRight className="ml-1 size-3.5" />
                      </Link>
                    </Button>
                  </div>
                )
              })
            ) : (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <History className="mx-auto mb-3 size-8 text-muted-foreground" />
                <div className="font-medium">Không có kết quả phù hợp.</div>
                <div className="mt-1 text-sm text-muted-foreground">Thử xóa bộ lọc hoặc tìm kiếm lại.</div>
              </div>
            )}
            
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span>–<span className="font-medium">{Math.min(currentPage * pageSize, totalItems)}</span> / <span className="font-medium">{totalItems}</span>
                </p>
                <div className="flex gap-2">
                  <Button type="button" onClick={() => setCurrentPage((p: number) => Math.max(1, p - 1))} disabled={currentPage === 1} variant="outline" size="sm">Trước</Button>
                  <Button type="button" onClick={() => setCurrentPage((p: number) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} variant="outline" size="sm">Tiếp</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </BaseLayout>
  )
}
