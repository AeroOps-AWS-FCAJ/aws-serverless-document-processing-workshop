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
  { label: "All activity", value: "ALL" },
  { label: "Uploads", value: "UPLOAD" },
  { label: "Processing", value: "PROCESSING" },
  { label: "Review", value: "REVIEW" },
  { label: "Approvals", value: "APPROVAL" },
]

function buildEvents(document: DocumentRecord): ActivityEvent[] {
  const events: ActivityEvent[] = [
    {
      id: `${document.documentId}-created`,
      kind: "UPLOAD",
      title: "Document uploaded",
      detail: `${document.fileName} entered the raw document workflow.`,
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
      detail: document.errorMessage ?? "The document is waiting for the async pipeline.",
      timestamp: document.updatedAt,
      document,
      icon: FileClock,
    })
  }

  if (document.status === "EXTRACTED") {
    events.push({
      id: `${document.documentId}-extracted`,
      kind: "PROCESSING",
      title: "Extraction completed",
      detail: `${document.vendorName} extracted with ${Math.round(document.confidenceScore * 100)}% confidence.`,
      timestamp: document.updatedAt,
      document,
      icon: CheckCircle2,
    })
  }

  if (document.status === "REVIEW_REQUIRED" || document.status === "FAILED") {
    events.push({
      id: `${document.documentId}-review`,
      kind: "REVIEW",
      title: document.status === "FAILED" ? "Workflow failed" : "Review requested",
      detail: document.reviewReasons.length ? document.reviewReasons.join("; ") : document.errorMessage ?? "Needs finance verification.",
      timestamp: document.updatedAt,
      document,
      icon: FileWarning,
    })
  }

  if (document.status === "CORRECTED") {
    events.push({
      id: `${document.documentId}-corrected`,
      kind: "REVIEW",
      title: "Fields corrected",
      detail: document.reviewerNote ?? "Finance updated uncertain fields.",
      timestamp: document.reviewedAt ?? document.updatedAt,
      document,
      icon: FileCheck2,
    })
  }

  if (document.status === "APPROVED") {
    events.push({
      id: `${document.documentId}-approved`,
      kind: "APPROVAL",
      title: "Document approved",
      detail: document.reviewerNote ?? "Final result was approved.",
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

export default function ActivityPage() {
  const { documents } = useDocuFlowDocuments()
  const { session } = useAuth()
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<ActivityFilter>("ALL")

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

  const uploadedCount = events.filter((event) => event.kind === "UPLOAD").length
  const reviewCount = events.filter((event) => event.kind === "REVIEW").length
  const approvalCount = events.filter((event) => event.kind === "APPROVAL").length
  const latestEvent = events[0]

  return (
    <BaseLayout
      title="My activity"
      description="Personal processing history for uploads, review work, and approvals."
    >
      <section className="px-4 lg:px-6">
        <div className="overflow-hidden border bg-[#10261d] text-white">
          <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="p-5 sm:p-7">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-[#d8ff72]/40 bg-[#d8ff72]/15 font-mono text-[10px] uppercase text-[#d8ff72]">
                  User audit trail
                </Badge>
                <Badge variant="outline" className="border-white/20 bg-white/5 font-mono text-[10px] uppercase text-white/75">
                  {session?.name ?? "Demo user"}
                </Badge>
              </div>
              <h2 className="mt-5 max-w-3xl font-display text-3xl font-semibold leading-tight text-white md:text-5xl">
                A clear history of every document touchpoint in your workspace.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/62">
                Track what you uploaded, what moved through processing, what needed review,
                and which documents reached approval.
              </p>
            </div>
            <div className="grid grid-cols-2 border-t border-white/12 xl:border-l xl:border-t-0">
              {[
                { label: "Events", value: events.length, icon: History },
                { label: "Uploads", value: uploadedCount, icon: FilePlus2 },
                { label: "Reviews", value: reviewCount, icon: FileWarning },
                { label: "Approvals", value: approvalCount, icon: CheckCircle2 },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="border-b border-r border-white/12 p-4 last:border-r-0 sm:p-5">
                    <div className="mb-8 flex items-center justify-between gap-3">
                      <Icon className="size-4 text-[#d8ff72]" />
                      <span className="font-mono text-[10px] text-white/35">ACT</span>
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
        <div className="grid gap-5">
          <Card>
            <CardHeader className="border-b bg-muted/25">
              <CardTitle className="flex items-center gap-2">
                <Filter className="size-5" />
                Activity filters
              </CardTitle>
              <CardDescription>Find document events quickly.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 pt-5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9" placeholder="Search activity" />
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
                      {item.value === "ALL" ? events.length : events.filter((event) => event.kind === item.value).length}
                    </span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b bg-muted/25">
              <CardTitle className="flex items-center gap-2">
                <Clock3 className="size-5" />
                Latest event
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
                <div className="text-sm text-muted-foreground">No activity yet.</div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="border-b bg-muted/25">
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="size-5" />
              Timeline
            </CardTitle>
            <CardDescription>
              {filteredEvents.length} of {events.length} events shown.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 pt-5">
            {filteredEvents.length ? (
              filteredEvents.map((event) => {
                const Icon = event.icon
                return (
                  <div key={event.id} className="grid gap-4 border p-4 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div className="flex gap-4">
                      <div className="flex size-10 shrink-0 items-center justify-center border bg-muted/30">
                        <Icon className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-medium">{event.title}</div>
                          <Badge variant="secondary">{event.kind}</Badge>
                          <StatusBadge status={event.document.status} />
                        </div>
                        <div className="mt-1 text-sm leading-6 text-muted-foreground">{event.detail}</div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          {event.document.fileName} - {formatDate(event.timestamp)}
                        </div>
                      </div>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/documents/${event.document.documentId}`}>
                        Open
                        <ArrowRight className="size-3.5" />
                      </Link>
                    </Button>
                  </div>
                )
              })
            ) : (
              <div className="border border-dashed p-8 text-center">
                <History className="mx-auto mb-3 size-8 text-muted-foreground" />
                <div className="font-medium">No activity matches this filter.</div>
                <div className="mt-1 text-sm text-muted-foreground">Clear search or choose another event type.</div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </BaseLayout>
  )
}
