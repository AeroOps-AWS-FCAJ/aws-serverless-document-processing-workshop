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
  { label: "All", value: "ALL" },
  { label: "Unread", value: "UNREAD" },
  { label: "Action needed", value: "ACTION" },
  { label: "Failed", value: "FAILED" },
  { label: "Complete", value: "COMPLETE" },
  { label: "Processing", value: "PROCESSING" },
]

function buildNotification(document: DocumentRecord): UserNotification | null {
  if (document.status === "REVIEW_REQUIRED") {
    return {
      id: `${document.documentId}-review`,
      document,
      kind: "ACTION",
      title: "Review required",
      body: document.reviewReasons.length
        ? document.reviewReasons.join("; ")
        : "One or more extracted fields need verification.",
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
      title: "Processing failed",
      body: document.errorMessage ?? "The workflow failed before producing a trusted result.",
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
      title: "Correction ready for approval",
      body: document.reviewerNote ?? "Corrected fields are available for final approval.",
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
      title: document.status === "APPROVED" ? "Document approved" : "Extraction complete",
      body: `${document.vendorName} is available with ${Math.round(document.confidenceScore * 100)}% confidence.`,
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
      title: "Document is moving through the pipeline",
      body: statusMeta[document.status].label,
      timestamp: document.updatedAt,
      unread: false,
      icon: Clock3,
    }
  }
  return null
}

function kindClass(kind: NotificationKind) {
  if (kind === "FAILED") return "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-500/10 dark:text-red-200"
  if (kind === "ACTION") return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-500/10 dark:text-amber-200"
  if (kind === "COMPLETE") return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200"
  return "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-500/10 dark:text-blue-200"
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

  const unreadCount = notifications.filter((notification) => notification.unread).length
  const failedCount = notifications.filter((notification) => notification.kind === "FAILED").length
  const actionCount = notifications.filter((notification) => notification.kind === "ACTION").length
  const completeCount = notifications.filter((notification) => notification.kind === "COMPLETE").length

  return (
    <BaseLayout
      title="Notifications"
      description="Personal alerts for documents that finished, failed, or need finance review."
    >
      <section className="px-4 lg:px-6">
        <div className="overflow-hidden border bg-[#10261d] text-white">
          <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="p-5 sm:p-7">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-[#d8ff72]/40 bg-[#d8ff72]/15 font-mono text-[10px] uppercase text-[#d8ff72]">
                  Finance inbox
                </Badge>
                <Badge variant="outline" className="border-white/20 bg-white/5 font-mono text-[10px] uppercase text-white/75">
                  SNS/SES story
                </Badge>
              </div>
              <h2 className="mt-5 max-w-3xl font-display text-3xl font-semibold leading-tight text-white md:text-5xl">
                One inbox for low-confidence results, failed workflows, and completed documents.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/62">
                The production system would deliver these via SNS/SES. This workspace keeps the same
                operational signal visible inside the user experience.
              </p>
            </div>
            <div className="grid grid-cols-2 border-t border-white/12 xl:border-l xl:border-t-0">
              {[
                { label: "Unread", value: unreadCount, icon: BellDot },
                { label: "Action needed", value: actionCount, icon: FileWarning },
                { label: "Failed", value: failedCount, icon: AlertTriangle },
                { label: "Complete", value: completeCount, icon: BadgeCheck },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="border-b border-r border-white/12 p-4 last:border-r-0 sm:p-5">
                    <div className="mb-8 flex items-center justify-between gap-3">
                      <Icon className="size-4 text-[#d8ff72]" />
                      <span className="font-mono text-[10px] text-white/35">MSG</span>
                    </div>
                    <div className="text-3xl font-semibold text-white">{item.value}</div>
                    <div className="mt-1 text-xs text-white/50">{item.label}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 px-4 xl:grid-cols-[320px_minmax(0,1fr)] lg:px-6">
        <Card className="h-fit">
          <CardHeader className="border-b bg-muted/25">
            <CardTitle className="flex items-center gap-2">
              <SlidersHorizontal className="size-5" />
              Inbox controls
            </CardTitle>
            <CardDescription>Filter by state or search document context.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 pt-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="pl-9"
                placeholder="Search alerts"
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
                  <span className="sr-only">Clear search</span>
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

        <Card>
          <CardHeader className="border-b bg-muted/25">
            <CardTitle className="flex items-center gap-2">
              <Inbox className="size-5" />
              Alert stream
            </CardTitle>
            <CardDescription>
              {filteredNotifications.length} of {notifications.length} notifications shown.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 pt-5">
            {filteredNotifications.length ? (
              filteredNotifications.map((notification) => {
                const Icon = notification.icon
                return (
                  <div key={notification.id} className="grid gap-4 border p-4 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div className="flex min-w-0 gap-4">
                      <div className="flex size-10 shrink-0 items-center justify-center border bg-muted/30">
                        <Icon className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-medium">{notification.title}</div>
                          {notification.unread && <Badge className="bg-[#d8ff72] text-[#10261d]">Unread</Badge>}
                          <Badge variant="outline" className={kindClass(notification.kind)}>
                            {notification.kind}
                          </Badge>
                        </div>
                        <div className="mt-1 text-sm leading-6 text-muted-foreground">{notification.body}</div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <MailCheck className="size-3.5" />
                          {notification.document.fileName}
                          <span>{formatDate(notification.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/documents/${notification.document.documentId}`}>
                          Open document
                          <ArrowRight className="size-3.5" />
                        </Link>
                      </Button>
                      {notification.kind === "ACTION" && (
                        <Button asChild size="sm">
                          <Link to="/review">
                            Review queue
                            <ArrowRight className="size-3.5" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="border border-dashed p-8 text-center">
                <CheckCircle2 className="mx-auto mb-3 size-8 text-emerald-600" />
                <div className="font-medium">No notifications match this view.</div>
                <div className="mt-1 text-sm text-muted-foreground">Clear filters or check the document ledger.</div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </BaseLayout>
  )
}
