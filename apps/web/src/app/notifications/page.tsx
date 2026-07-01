"use client"

import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BellDot,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileWarning,
  Inbox,
  MailCheck,
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
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/auth-context"
import {
  formatDate,
  statusMeta,
  type DocumentRecord,
} from "@/lib/docuflow-data"
import { useDocuFlowDocuments } from "@/lib/docuflow-store"

type NotificationKind = "ACTION" | "FAILED" | "COMPLETE" | "PROCESSING"
type NotificationFilter = "ALL" | NotificationKind | "UNREAD"

interface UserNotification {
  id: string
  document: DocumentRecord
  kind: NotificationKind
  title: string
  body: string
  timestamp: string
  unread: boolean
  icon: typeof BellDot
}

const filters: Array<{ label: string; value: NotificationFilter }> = [
  { label: "Tất cả", value: "ALL" },
  { label: "Chưa đọc", value: "UNREAD" },
  { label: "Cần xử lý", value: "ACTION" },
  { label: "Thất bại", value: "FAILED" },
  { label: "Hoàn thành", value: "COMPLETE" },
  { label: "Đang xử lý", value: "PROCESSING" },
]

function buildNotification(document: DocumentRecord): UserNotification | null {
  if (document.status === "REVIEW_REQUIRED") {
    return {
      id: `${document.documentId}-review`,
      document,
      kind: "ACTION",
      title: "Yêu cầu kiểm duyệt",
      body: document.reviewReasons.length
        ? document.reviewReasons.join("; ")
        : "Một số trường trích xuất cần được xác minh.",
      timestamp: document.updatedAt,
      unread: true,
      icon: FileWarning,
    }
  }
  if (document.status === "FAILED") {
    return {
      id: `${document.documentId}-failed`,
      document,
      kind: "FAILED",
      title: "Xử lý thất bại",
      body: document.errorMessage ?? "Quy trình xử lý gặp lỗi trước khi cho ra kết quả.",
      timestamp: document.updatedAt,
      unread: true,
      icon: ShieldAlert,
    }
  }
  if (document.status === "CORRECTED") {
    return {
      id: `${document.documentId}-corrected`,
      document,
      kind: "ACTION",
      title: "Bản sửa đã sẵn sàng",
      body: document.reviewerNote ?? "Các trường được sửa đã sẵn sàng để duyệt lần cuối.",
      timestamp: document.updatedAt,
      unread: true,
      icon: FileCheck2,
    }
  }
  if (document.status === "APPROVED" || document.status === "EXTRACTED") {
    return {
      id: `${document.documentId}-complete`,
      document,
      kind: "COMPLETE",
      title: document.status === "APPROVED" ? "Tài liệu đã duyệt" : "Trích xuất hoàn thành",
      body: `${document.vendorName} đã hoàn tất với độ tin cậy ${Math.round(document.confidenceScore * 100)}%.`,
      timestamp: document.updatedAt,
      unread: false,
      icon: CheckCircle2,
    }
  }
  if (document.status === "UPLOADED" || document.status === "QUEUED" || document.status === "PROCESSING") {
    return {
      id: `${document.documentId}-processing`,
      document,
      kind: "PROCESSING",
      title: "Đang được xử lý",
      body: statusMeta[document.status].label,
      timestamp: document.updatedAt,
      unread: false,
      icon: Clock3,
    }
  }
  return null
}


export default function NotificationsPage() {
  const { documents } = useDocuFlowDocuments()
  const { session } = useAuth()
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<NotificationFilter>("ALL")

  const visibleDocuments = useMemo(
    () => documents.filter((document) => session?.role === "admin" || document.userId === session?.userId),
    [documents, session?.role, session?.userId]
  )

  const notifications = useMemo(
    () =>
      visibleDocuments
        .map(buildNotification)
        .filter((item): item is UserNotification => Boolean(item))
        .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)),
    [visibleDocuments]
  )

  const filteredNotifications = notifications.filter((notification) => {
    const text = `${notification.title} ${notification.body} ${notification.document.fileName} ${notification.document.vendorName}`.toLowerCase()
    const matchesQuery = !query.trim() || text.includes(query.trim().toLowerCase())
    const matchesFilter =
      filter === "ALL" ||
      (filter === "UNREAD" && notification.unread) ||
      notification.kind === filter
    return matchesQuery && matchesFilter
  })

  // Chỉ lấy 5 thông báo gần đây nhất sau khi đã lọc và sắp xếp
  const displayedNotifications = filteredNotifications.slice(0, 5)

  const unreadCount = notifications.filter((notification) => notification.unread).length
  const failedCount = notifications.filter((notification) => notification.kind === "FAILED").length
  const actionCount = notifications.filter((notification) => notification.kind === "ACTION").length
  const completeCount = notifications.filter((notification) => notification.kind === "COMPLETE").length

  return (
    <BaseLayout
      title="Thông báo"
      description="Các cảnh báo cá nhân về tài liệu cần chú ý, đã xử lý xong hoặc bị lỗi."
    >
      <section className="px-4 lg:px-6">
        <div className="overflow-hidden border bg-[#10261d] text-white rounded-2xl shadow-lg">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-[#d8ff72]/40 bg-[#d8ff72]/15 font-mono text-[10px] uppercase text-[#d8ff72]">
                  Thông báo
                </Badge>
                <Badge variant="outline" className="border-white/20 bg-white/5 font-mono text-[10px] uppercase text-white/75">
                  {session?.name ?? "Người dùng"}
                </Badge>
              </div>
              <h2 className="mt-2 max-w-3xl font-display text-lg font-semibold leading-snug tracking-tight text-white md:text-xl">
                Kiểm soát những tài liệu cần chú ý, bị lỗi và đã hoàn thành.
              </h2>
              <p className="mt-1.5 max-w-2xl text-xs leading-6 text-white/62">
                Nơi tổng hợp các thông báo cập nhật về trạng thái xử lý tài liệu của bạn trong hệ thống.
              </p>
            </div>
            <div className="grid grid-cols-2 border-t border-white/12 lg:border-l lg:border-t-0">
              {[
                { label: "Chưa đọc", value: unreadCount, icon: BellDot },
                { label: "Cần xử lý", value: actionCount, icon: FileWarning },
                { label: "Thất bại", value: failedCount, icon: AlertTriangle },
                { label: "Hoàn thành", value: completeCount, icon: BadgeCheck },
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


      <section className="grid gap-5 px-4 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)] lg:px-6">

        {/* Filter sidebar — hidden on mobile */}
        <Card className="hidden lg:block h-fit">
          <CardHeader className="border-b bg-muted/25">
            <CardTitle className="flex items-center gap-2">
              <SlidersHorizontal className="size-5" />
              Bộ lọc thông báo
            </CardTitle>
            <CardDescription>Lọc trạng thái và tìm kiếm nội dung.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 pt-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="pl-9"
                placeholder="Tìm kiếm thông báo..."
              />
              {query && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 size-7 -translate-y-1/2"
                  onClick={() => setQuery("")}
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
                  onClick={() => setFilter(item.value)}
                >
                  {item.label}
                  <span className="font-mono text-xs">
                    {item.value === "ALL"
                      ? notifications.length
                      : item.value === "UNREAD"
                        ? unreadCount
                        : notifications.filter((notification) => notification.kind === item.value).length}
                  </span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="border-b bg-muted/25">
            <div className="flex flex-col gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Inbox className="size-5" />
                  Danh sách thông báo
                </CardTitle>
                <CardDescription>
                  Đang hiển thị {displayedNotifications.length} thông báo gần nhất trên tổng số {filteredNotifications.length} thông báo.
                </CardDescription>
              </div>
              {/* Mobile-only: search + filter chips */}
              <div className="flex flex-col gap-3 lg:hidden">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9" placeholder="Tìm kiếm thông báo..." />
                  {query && (
                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 size-7 -translate-y-1/2" onClick={() => setQuery("")}>
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {filters.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setFilter(item.value)}
                      className={[
                        "rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150",
                        filter === item.value
                          ? "border-[#0f2a22] bg-[#0f2a22] text-white shadow-sm"
                          : "bg-background hover:border-foreground/25 hover:bg-muted/40",
                      ].join(" ")}
                    >
                      {item.label}
                      <span className={`ml-1.5 font-mono text-[10px] ${filter === item.value ? "opacity-75" : "opacity-50"}`}>
                        {item.value === "ALL"
                          ? notifications.length
                          : item.value === "UNREAD"
                            ? unreadCount
                            : notifications.filter((n) => n.kind === item.value).length}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 pt-5">
            {displayedNotifications.length ? (
              displayedNotifications.map((notification) => {
                const Icon = notification.icon
                return (
                  <div key={notification.id} className="grid gap-4 rounded-xl border p-4 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div className="flex min-w-0 gap-4">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-muted/30">
                        <Icon className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-medium">{notification.title}</div>
                          {notification.unread && <Badge className="bg-[#d8ff72] text-[#10261d]">Chưa đọc</Badge>}
                        </div>
                        <div className="mt-1 text-sm leading-6 text-muted-foreground">{notification.body}</div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <MailCheck className="size-3.5" />
                          <span className="truncate max-w-[200px]">{notification.document.fileName}</span>
                          <span>{formatDate(notification.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-row flex-wrap gap-2 lg:flex-col">
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/documents/${notification.document.documentId}`}>
                          Mở tài liệu
                          <ArrowRight className="size-3.5 ml-1" />
                        </Link>
                      </Button>
                      {notification.kind === "ACTION" && (
                        <Button asChild size="sm">
                          <Link to="/review">
                            Kiểm duyệt
                            <ArrowRight className="size-3.5 ml-1" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <CheckCircle2 className="mx-auto mb-3 size-8 text-emerald-600" />
                <div className="font-medium">Không có thông báo nào phù hợp.</div>
                <div className="mt-1 text-sm text-muted-foreground">Hãy xóa bộ lọc hoặc kiểm tra lại tài liệu.</div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </BaseLayout>
  )
}
