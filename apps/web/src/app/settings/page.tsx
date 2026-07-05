"use client"

import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { updatePassword, updateUserAttributes } from "aws-amplify/auth"
import { toast } from "sonner"
import {
  ArrowRight,
  BellDot,
  CheckCheck,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Download,
  FileCheck2,
  FileClock,
  FileSearch,
  FileWarning,
  History,
  Inbox,
  ListChecks,
  LogOut,
  MailCheck,
  Save,
  RefreshCw,
  RotateCcw,
  Search,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  UploadCloud,
  UserRound,
  X,
} from "lucide-react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { TablePagination } from "@/components/table-pagination"
import { useAuth } from "@/contexts/auth-context"
import { clearDocuFlowSession } from "@/lib/auth"
import {
  formatDate,
  formatMoney,
  roleCapabilities,
  statusMeta,
  type DocumentRecord,
  type DocumentStatus,
} from "@/lib/docuflow-data"
import { useDocuFlowDocuments } from "@/lib/docuflow-store"
import { useDocumentsSync } from "@/hooks/use-documents-sync"
import {
  acknowledgeNotification,
  listActivity,
  listNotifications,
  type ApiActivityItem,
  type ApiNotificationItem,
} from "@/lib/docuflow-api"
import { useLanguage, type AppLanguage, type TranslationKey } from "@/lib/i18n"
import { userProfilePreferencesStorageKey } from "@/lib/user-preferences"

type SettingsTab = "profile" | "notifications" | "activity"
type NotificationKind = "ACTION" | "FAILED" | "COMPLETE" | "PROCESSING"
type NotificationFilter = "ALL" | NotificationKind
type ActivityKind = "UPLOAD" | "PROCESSING" | "REVIEW" | "APPROVAL"
type ActivityFilter = "ALL" | ActivityKind
type ActivityRangeFilter = "ALL" | "TODAY" | "7D" | "30D"
type ActivitySeverity = "info" | "warning" | "error" | "success"
type ActivitySeverityFilter = "ALL" | ActivitySeverity
type ActivityStatusFilter = "ALL" | DocumentStatus
type NotificationSeverity = "critical" | "warning" | "success" | "info"

interface ProfileFormState {
  firstName: string
  lastName: string
  email: string
  company: string
  department: string
  phone: string
  timezone: string
  language: string
  defaultCurrency: string
  compactTables: boolean
  notes: string
}

interface PasswordFormState {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

interface UserNotification {
  id: string
  document: DocumentRecord
  kind: NotificationKind
  title: string
  body: string
  timestamp: string
  unread: boolean
  requiresAction: boolean
  severity: NotificationSeverity
  icon: typeof BellDot
}

interface ActivityEvent {
  id: string
  kind: ActivityKind
  title: string
  detail: string
  timestamp: string
  document: DocumentRecord
  actor: string
  source: string
  severity: ActivitySeverity
  icon: typeof History
}

const validTabs: SettingsTab[] = ["profile", "notifications", "activity"]

const defaultProfileForm: ProfileFormState = {
  firstName: "",
  lastName: "",
  email: "",
  company: "",
  department: "",
  phone: "",
  timezone: "Asia/Bangkok",
  language: "vi",
  defaultCurrency: "VND",
  compactTables: false,
  notes: "",
}

const defaultPasswordForm: PasswordFormState = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
}

const currencyOptions = ["VND", "USD", "EUR", "JPY", "SGD", "THB", "AUD", "GBP"]
const timezoneOptions = ["Asia/Bangkok", "Asia/Ho_Chi_Minh", "Asia/Singapore", "UTC", "America/New_York", "Europe/London"]
const languageOptions = [
  { value: "vi", label: "Tiếng Việt" },
  { value: "en", label: "English" },
]

const activitySeverityMeta: Record<ActivitySeverity, { labelKey: TranslationKey; className: string }> = {
  info: { labelKey: "severity.info", className: "border-cyan-200 bg-cyan-50 text-cyan-800" },
  warning: { labelKey: "severity.warning", className: "border-amber-200 bg-amber-50 text-amber-800" },
  error: { labelKey: "severity.error", className: "border-red-200 bg-red-50 text-red-800" },
  success: { labelKey: "severity.success", className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
}

function getActivityTime(value: string) {
  const time = Date.parse(value)
  return Number.isNaN(time) ? 0 : time
}

function isActivityInRange(timestamp: string, range: ActivityRangeFilter) {
  if (range === "ALL") return true
  const time = getActivityTime(timestamp)
  if (!time) return false

  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)

  if (range === "TODAY") return time >= start.getTime()

  const days = range === "7D" ? 7 : 30
  const floor = new Date(now)
  floor.setDate(now.getDate() - days)
  floor.setHours(0, 0, 0, 0)
  return time >= floor.getTime()
}

function getActivityDayLabel(timestamp: string, t: (key: TranslationKey, params?: Record<string, string | number>) => string) {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return t("time.unknown")

  const today = new Date()
  const startToday = new Date(today)
  startToday.setHours(0, 0, 0, 0)

  const startYesterday = new Date(startToday)
  startYesterday.setDate(startToday.getDate() - 1)

  if (date.getTime() >= startToday.getTime()) return t("time.today")
  if (date.getTime() >= startYesterday.getTime()) return t("time.yesterday")
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function groupActivityEvents(events: ActivityEvent[], t: (key: TranslationKey, params?: Record<string, string | number>) => string) {
  const grouped = new Map<string, ActivityEvent[]>()
  events.forEach((event) => {
    const label = getActivityDayLabel(event.timestamp, t)
    grouped.set(label, [...(grouped.get(label) ?? []), event])
  })
  return [...grouped.entries()].map(([label, items]) => ({ label, items }))
}

function escapeCsv(value: string | number | null | undefined) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`
}

function exportActivityCsv(events: ActivityEvent[]) {
  const header = [
    "timestamp",
    "kind",
    "severity",
    "title",
    "actor",
    "source",
    "documentId",
    "fileName",
    "status",
    "vendor",
    "currency",
    "totalAmount",
    "confidence",
    "detail",
  ]
  const rows = events.map((event) => [
    event.timestamp,
    event.kind,
    event.severity,
    event.title,
    event.actor,
    event.source,
    event.document.documentId,
    event.document.originalFileName,
    event.document.status,
    event.document.vendorName,
    event.document.currency,
    event.document.totalAmount,
    Math.round(event.document.confidenceScore * 100),
    event.detail,
  ])
  const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n")
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }))
  const link = document.createElement("a")
  link.href = url
  link.download = `docuflow-activity-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

function buildNotification(document: DocumentRecord, t: (key: TranslationKey, params?: Record<string, string | number>) => string): UserNotification | null {
  if (document.status === "REVIEW_REQUIRED") {
    return {
      id: `${document.documentId}-review`,
      document,
      kind: "ACTION",
      title: t("notification.reviewRequired"),
      body: document.reviewReasonCodes.length ? document.reviewReasonCodes.join("; ") : t("notification.reviewRequiredBody"),
      timestamp: document.updatedAt,
      unread: true,
      requiresAction: true,
      severity: "warning",
      icon: FileWarning,
    }
  }

  if (document.status === "FAILED") {
    return {
      id: `${document.documentId}-failed`,
      document,
      kind: "FAILED",
      title: t("notification.processingFailed"),
      body: document.errorMessage ?? t("notification.processingFailedBodyFallback"),
      timestamp: document.updatedAt,
      unread: true,
      requiresAction: true,
      severity: "critical",
      icon: ShieldAlert,
    }
  }

  if (document.status === "CORRECTED") {
    return {
      id: `${document.documentId}-corrected`,
      document,
      kind: "ACTION",
      title: t("notification.correctionReady"),
      body: document.reviewerNote ?? t("notification.correctionReadyBodyFallback"),
      timestamp: document.updatedAt,
      unread: true,
      requiresAction: true,
      severity: "warning",
      icon: FileCheck2,
    }
  }

  if (document.status === "APPROVED" || document.status === "EXTRACTED") {
    return {
      id: `${document.documentId}-complete`,
      document,
      kind: "COMPLETE",
      title: document.status === "APPROVED" ? t("notification.documentApproved") : t("notification.extractionComplete"),
      body: t("notification.extractionCompleteBody", { vendor: document.vendorName || "", confidence: Math.round(document.confidenceScore * 100) }),
      timestamp: document.updatedAt,
      unread: false,
      requiresAction: false,
      severity: "success",
      icon: CheckCircle2,
    }
  }

  if (document.status === "UPLOADED" || document.status === "QUEUED" || document.status === "PROCESSING") {
    return {
      id: `${document.documentId}-processing`,
      document,
      kind: "PROCESSING",
      title: t("notification.beingProcessed"),
      body: t(`status.${document.status}` as TranslationKey),
      timestamp: document.updatedAt,
      unread: false,
      requiresAction: false,
      severity: "info",
      icon: Clock3,
    }
  }

  return null
}

function buildEvents(document: DocumentRecord, t: (key: TranslationKey, params?: Record<string, string | number>) => string): ActivityEvent[] {
  const events: ActivityEvent[] = [
    {
      id: `${document.documentId}-created`,
      kind: "UPLOAD",
      title: t("activity.eventUploaded"),
      detail: t("activity.eventUploadedBody", { name: document.originalFileName }),
      timestamp: document.createdAt,
      document,
      actor: document.userId || t("profile.fallbackUser"),
      source: "Frontend upload",
      severity: "info",
      icon: UploadCloud,
    },
  ]

  if (document.status === "UPLOADED" || document.status === "QUEUED" || document.status === "PROCESSING") {
    events.push({
      id: `${document.documentId}-processing`,
      kind: "PROCESSING",
      title: t(`status.${document.status}` as TranslationKey),
      detail: document.errorMessage ?? t("activity.eventProcessingBody"),
      timestamp: document.updatedAt,
      document,
      actor: "AWS workflow",
      source: t(`status.${document.status}` as TranslationKey),
      severity: "info",
      icon: FileClock,
    })
  }

  if (document.status === "EXTRACTED") {
    events.push({
      id: `${document.documentId}-extracted`,
      kind: "PROCESSING",
      title: t("activity.eventExtracted"),
      detail: t("activity.eventExtractedBody", { vendor: document.vendorName, confidence: Math.round(document.confidenceScore * 100) }),
      timestamp: document.updatedAt,
      document,
      actor: "Textract + AI normalize",
      source: document.normalizationMethod || "Extraction pipeline",
      severity: "success",
      icon: CheckCircle2,
    })
  }

  if (document.status === "REVIEW_REQUIRED" || document.status === "FAILED") {
    events.push({
      id: `${document.documentId}-review`,
      kind: "REVIEW",
      title: document.status === "FAILED" ? t("activity.eventFailed") : t("activity.eventReview"),
      detail: document.reviewReasonCodes.length ? document.reviewReasonCodes.join("; ") : document.errorMessage ?? t("activity.eventManualReview"),
      timestamp: document.updatedAt,
      document,
      actor: document.status === "FAILED" ? "AWS workflow" : "Review rules",
      source: document.status === "FAILED" ? "Processing error" : "Confidence scoring",
      severity: document.status === "FAILED" ? "error" : "warning",
      icon: FileWarning,
    })
  }

  if (document.status === "CORRECTED") {
    events.push({
      id: `${document.documentId}-corrected`,
      kind: "REVIEW",
      title: t("activity.eventCorrected"),
      detail: document.reviewerNote ?? t("activity.eventCorrectedBody"),
      timestamp: document.reviewedAt ?? document.updatedAt,
      document,
      actor: document.reviewedBy || "Reviewer",
      source: "Manual correction",
      severity: "warning",
      icon: FileCheck2,
    })
  }

  if (document.status === "APPROVED") {
    events.push({
      id: `${document.documentId}-approved`,
      kind: "APPROVAL",
      title: t("activity.eventApproved"),
      detail: document.reviewerNote ?? t("activity.eventApprovedBody"),
      timestamp: document.reviewedAt ?? document.updatedAt,
      document,
      actor: document.reviewedBy || "Reviewer",
      source: "Human approval",
      severity: "success",
      icon: ShieldCheck,
    })
  }

  return events
}

function StatusBadge({ status }: { status: DocumentStatus }) {
  const { t } = useLanguage()
  const meta = statusMeta[status]
  const Icon = meta.icon
  return (
    <Badge variant="outline" className={meta.tone}>
      <Icon className="size-3.5" />
      {t(`status.${status}` as TranslationKey)}
    </Badge>
  )
}

function SettingSearch({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  const { t } = useLanguage()

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input value={value} onChange={(event) => onChange(event.target.value)} className="pl-9" placeholder={placeholder} />
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 size-7 -translate-y-1/2"
          onClick={() => onChange("")}
        >
          <X className="size-4" />
          <span className="sr-only">{t("activity.clearSearch")}</span>
        </Button>
      )}
    </div>
  )
}

function notificationReadStorageKey(userId?: string) {
  return `docuflow:notification-acknowledged:${userId || "anonymous"}`
}

function getInitials(name?: string, email?: string) {
  const source = name?.trim() || email?.split("@")[0] || "DF"
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return source.slice(0, 2).toUpperCase()
}

function readStoredProfile(userId?: string): Partial<ProfileFormState> {
  if (typeof window === "undefined") return {}
  try {
    return JSON.parse(window.localStorage.getItem(userProfilePreferencesStorageKey(userId)) || "{}") as Partial<ProfileFormState>
  } catch {
    return {}
  }
}

function writeStoredProfile(userId: string | undefined, values: ProfileFormState) {
  if (typeof window === "undefined") return
  const { company, department, phone, timezone, language, defaultCurrency, compactTables, notes } = values
  window.localStorage.setItem(
    userProfilePreferencesStorageKey(userId),
    JSON.stringify({ company, department, phone, timezone, language, defaultCurrency, compactTables, notes })
  )
}

function readAcknowledgedNotificationIds(userId?: string) {
  if (typeof window === "undefined") return []
  try {
    const value = JSON.parse(window.localStorage.getItem(notificationReadStorageKey(userId)) || "[]")
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
  } catch {
    return []
  }
}

function writeAcknowledgedNotificationIds(userId: string | undefined, ids: string[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(notificationReadStorageKey(userId), JSON.stringify(ids))
}

function notificationSeverityClass(severity: NotificationSeverity) {
  switch (severity) {
    case "critical":
      return "border-l-red-500 bg-red-50/45 dark:bg-red-950/10"
    case "warning":
      return "border-l-amber-500 bg-amber-50/45 dark:bg-amber-950/10"
    case "success":
      return "border-l-emerald-500"
    case "info":
      return "border-l-cyan-500"
  }
}

function isDocumentStatus(value: unknown): value is DocumentStatus {
  return typeof value === "string" && value in statusMeta
}

function documentFromApiItem(
  item: ApiNotificationItem | ApiActivityItem,
  fallbackDocuments: DocumentRecord[]
): DocumentRecord {
  const existing = fallbackDocuments.find((document) => document.documentId === item.documentId)
  if (existing) return existing

  const raw = item.document ?? {}
  const now = new Date().toISOString()

  return {
    documentId: item.documentId,
    userId: raw.userId ?? "",
    originalFileName: raw.originalFileName ?? `document-${item.documentId}`,
    documentType: raw.documentType ?? "UNKNOWN",
    status: isDocumentStatus(raw.status) ? raw.status : "REVIEW_REQUIRED",
    invoiceNumber: raw.invoiceNumber ?? "",
    vendorName: raw.vendorName ?? "Unknown",
    invoiceDate: raw.invoiceDate ?? "",
    dueDate: raw.dueDate ?? "",
    currency: raw.currency ?? "XXX",
    subtotalAmount: raw.subtotalAmount,
    discountAmount: raw.discountAmount,
    shippingAmount: raw.shippingAmount,
    totalAmount: raw.totalAmount ?? 0,
    taxAmount: raw.taxAmount ?? null,
    confidenceScore: raw.confidenceScore ?? 0,
    reviewStatus: raw.reviewStatus ?? "PENDING",
    reviewReasonCodes: raw.reviewReasonCodes ?? [],
    aiProvider: raw.aiProvider ?? "not-called",
    normalizationMethod: raw.normalizationMethod ?? "TEXTRACT_ONLY",
    rawS3Key: raw.rawS3Key ?? "",
    processedS3Key: raw.processedS3Key ?? "",
    sourceUrl: raw.sourceUrl ?? null,
    createdAt: raw.createdAt ?? item.timestamp ?? now,
    updatedAt: raw.updatedAt ?? item.timestamp ?? now,
    reviewedAt: raw.reviewedAt ?? null,
    reviewedBy: raw.reviewedBy ?? null,
    reviewerNote: raw.reviewerNote ?? null,
    lineItems: raw.lineItems ?? [],
    errorMessage: raw.errorMessage ?? null,
  }
}

function iconForNotification(item: ApiNotificationItem) {
  if (item.kind === "FAILED" || item.severity === "critical") return ShieldAlert
  if (item.kind === "COMPLETE") return CheckCircle2
  if (item.kind === "PROCESSING") return Clock3
  if (item.document?.status === "CORRECTED") return FileCheck2
  return FileWarning
}

function notificationFromApiItem(
  item: ApiNotificationItem,
  fallbackDocuments: DocumentRecord[],
  acknowledgedIds: Set<string>
): UserNotification {
  const document = documentFromApiItem(item, fallbackDocuments)
  const unread = item.requiresAction && item.unread && !acknowledgedIds.has(item.id)

  return {
    id: item.id,
    document,
    kind: item.kind,
    title: item.title,
    body: item.body,
    timestamp: item.timestamp,
    unread,
    requiresAction: item.requiresAction,
    severity: item.severity,
    icon: iconForNotification(item),
  }
}

function iconForActivity(item: ApiActivityItem) {
  if (item.kind === "APPROVAL") return ShieldCheck
  if (item.kind === "REVIEW") return item.severity === "error" ? FileWarning : FileCheck2
  if (item.kind === "PROCESSING") return item.severity === "success" ? CheckCircle2 : FileClock
  return UploadCloud
}

function activityFromApiItem(item: ApiActivityItem, fallbackDocuments: DocumentRecord[]): ActivityEvent {
  return {
    id: item.id,
    kind: item.kind,
    title: item.title,
    detail: item.detail,
    timestamp: item.timestamp,
    document: documentFromApiItem(item, fallbackDocuments),
    actor: item.actor,
    source: item.source,
    severity: item.severity,
    icon: iconForActivity(item),
  }
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { session, refreshSession } = useAuth()
  const { language, setLanguage, t } = useLanguage()
  const localizedNotificationFilters: Array<{ label: string; value: NotificationFilter }> = [
    { label: t("notifications.all"), value: "ALL" },
    { label: t("notifications.actionRequired"), value: "ACTION" },
    { label: t("notifications.failed"), value: "FAILED" },
    { label: t("notifications.complete"), value: "COMPLETE" },
    { label: t("notifications.processing"), value: "PROCESSING" },
  ]
  const localizedActivityFilters: Array<{ label: string; value: ActivityFilter }> = [
    { label: t("activity.all"), value: "ALL" },
    { label: t("activity.upload"), value: "UPLOAD" },
    { label: t("activity.processing"), value: "PROCESSING" },
    { label: t("activity.review"), value: "REVIEW" },
    { label: t("activity.approval"), value: "APPROVAL" },
  ]
  const localizedRangeOptions: Array<{ label: string; value: ActivityRangeFilter }> = [
    { label: t("settings.allTime"), value: "ALL" },
    { label: t("settings.today"), value: "TODAY" },
    { label: t("settings.days7"), value: "7D" },
    { label: t("settings.days30"), value: "30D" },
  ]
  const localizedSeverityOptions: Array<{ label: string; value: ActivitySeverityFilter }> = [
    { label: t("settings.allSeverities"), value: "ALL" },
    { label: t("settings.info"), value: "info" },
    { label: t("settings.warning"), value: "warning" },
    { label: t("settings.error"), value: "error" },
    { label: t("settings.success"), value: "success" },
  ]
  const activityKindLabel = (kind: ActivityKind) => localizedActivityFilters.find((item) => item.value === kind)?.label ?? kind
  const activitySeverityLabel = (severity: ActivitySeverity) => localizedSeverityOptions.find((item) => item.value === severity)?.label ?? severity
  const { documents, mergeDocuments } = useDocuFlowDocuments()
  const { apiMode, isSyncing, refreshDocuments, syncError, syncMessage } = useDocumentsSync(mergeDocuments, { loadAllPages: true })
  const [profileForm, setProfileForm] = useState<ProfileFormState>(defaultProfileForm)
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>(defaultPasswordForm)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [acknowledgedNotificationIds, setAcknowledgedNotificationIds] = useState<string[]>([])
  const [apiNotifications, setApiNotifications] = useState<ApiNotificationItem[] | null>(null)
  const [apiActivityEvents, setApiActivityEvents] = useState<ApiActivityItem[] | null>(null)
  const [isLoadingSettingsApi, setIsLoadingSettingsApi] = useState(false)
  const [settingsApiWarning, setSettingsApiWarning] = useState<string | null>(null)
  const [notificationQuery, setNotificationQuery] = useState("")
  const [notificationFilter, setNotificationFilter] = useState<NotificationFilter>("ALL")
  const [activityQuery, setActivityQuery] = useState("")
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("ALL")
  const [activityRangeFilter, setActivityRangeFilter] = useState<ActivityRangeFilter>("ALL")
  const [activitySeverityFilter, setActivitySeverityFilter] = useState<ActivitySeverityFilter>("ALL")
  const [activityStatusFilter, setActivityStatusFilter] = useState<ActivityStatusFilter>("ALL")
  const [activityPage, setActivityPage] = useState(1)
  const activityPageSize = 10

  const requestedTab = searchParams.get("tab") as SettingsTab | null
  const activeTab: SettingsTab = requestedTab && validTabs.includes(requestedTab) ? requestedTab : "profile"
  const role = session?.role ?? "finance"
  const capability = roleCapabilities.find((item) => item.role === role)

  const visibleDocuments = useMemo(
    () => documents.filter((document) => apiMode || role === "admin" || document.userId === session?.userId),
    [apiMode, documents, role, session?.userId]
  )

  const acknowledgedNotificationSet = useMemo(
    () => new Set(acknowledgedNotificationIds),
    [acknowledgedNotificationIds]
  )

  const derivedNotifications = useMemo(
    () =>
      visibleDocuments
        .map((doc) => buildNotification(doc, t))
        .filter((item): item is UserNotification => Boolean(item))
        .map((notification) => ({
          ...notification,
          unread: notification.requiresAction && !acknowledgedNotificationSet.has(notification.id),
        }))
        .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)),
    [acknowledgedNotificationSet, t, visibleDocuments]
  )

  const notifications = useMemo(
    () =>
      apiNotifications
        ? apiNotifications
            .map((notification) => notificationFromApiItem(notification, visibleDocuments, acknowledgedNotificationSet))
            .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
        : derivedNotifications,
    [acknowledgedNotificationSet, apiNotifications, derivedNotifications, visibleDocuments]
  )

  const derivedEvents = useMemo(
    () => visibleDocuments.flatMap((document) => buildEvents(document, t)).sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)),
    [t, visibleDocuments]
  )

  const events = useMemo(
    () =>
      apiActivityEvents
        ? apiActivityEvents
            .map((event) => activityFromApiItem(event, visibleDocuments))
            .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
        : derivedEvents,
    [apiActivityEvents, derivedEvents, visibleDocuments]
  )

  const filteredNotifications = notifications.filter((notification) => {
    const text = `${notification.title} ${notification.body} ${notification.document.originalFileName} ${notification.document.vendorName}`.toLowerCase()
    const matchesQuery = !notificationQuery.trim() || text.includes(notificationQuery.trim().toLowerCase())
    const matchesFilter =
      notificationFilter === "ALL" ||
      (notificationFilter === "ACTION" && notification.requiresAction) ||
      (notificationFilter !== "ACTION" && notification.kind === notificationFilter)
    return matchesQuery && matchesFilter
  })

  const filteredEvents = events.filter((event) => {
    const text = `${event.title} ${event.detail} ${event.actor} ${event.source} ${event.document.originalFileName} ${event.document.vendorName} ${event.document.documentId}`.toLowerCase()
    const matchesQuery = !activityQuery.trim() || text.includes(activityQuery.trim().toLowerCase())
    const matchesKind = activityFilter === "ALL" || event.kind === activityFilter
    const matchesRange = isActivityInRange(event.timestamp, activityRangeFilter)
    const matchesSeverity = activitySeverityFilter === "ALL" || event.severity === activitySeverityFilter
    const matchesStatus = activityStatusFilter === "ALL" || event.document.status === activityStatusFilter
    return matchesKind && matchesRange && matchesSeverity && matchesStatus && matchesQuery
  })

  const activityTotalPages = Math.max(1, Math.ceil(filteredEvents.length / activityPageSize))
  const paginatedEvents = filteredEvents.slice((activityPage - 1) * activityPageSize, activityPage * activityPageSize)
  const groupedPaginatedEvents = groupActivityEvents(paginatedEvents, t)
  const uploadEventCount = events.filter((event) => event.kind === "UPLOAD").length
  const reviewEventCount = events.filter((event) => event.kind === "REVIEW").length
  const errorEventCount = events.filter((event) => event.severity === "error").length
  const actionNotificationCount = notifications.filter((notification) => notification.requiresAction).length
  const openActionCount = notifications.filter((notification) => notification.unread).length
  const failedNotificationCount = notifications.filter((notification) => notification.kind === "FAILED").length
  const completeNotificationCount = notifications.filter((notification) => notification.kind === "COMPLETE").length
  const processingNotificationCount = notifications.filter((notification) => notification.kind === "PROCESSING").length
  const approvalCount = events.filter((event) => event.kind === "APPROVAL").length
  const latestEvent = events[0]

  const setActiveTab = (tab: SettingsTab) => {
    setSearchParams({ tab })
  }

  const handleLogout = async () => {
    toast.info(t("toast.signedOut"))
    await clearDocuFlowSession()
    navigate("/auth/sign-in", { replace: true })
  }

  const handleSettingsRefresh = async () => {
    const toastId = toast.loading(t("toast.refreshStarted"))
    const result = await refreshDocuments()
    toast.success(result.count > 0 ? t("sync.success", { total: result.count }) : t("toast.refreshComplete"), {
      id: toastId,
    })
  }

  useEffect(() => {
    if (!session) return
    const stored = readStoredProfile(session.userId)
    setAcknowledgedNotificationIds(readAcknowledgedNotificationIds(session.userId))
    setProfileForm({
      ...defaultProfileForm,
      ...stored,
      language,
      firstName: session.firstName || stored.firstName || session.name.split(" ")[0] || "",
      lastName: session.lastName || stored.lastName || session.name.split(" ").slice(1).join(" ") || "",
      email: session.email || stored.email || "",
    })
  }, [language, session])

  useEffect(() => {
    if (!apiMode) {
      setApiNotifications(null)
      setApiActivityEvents(null)
      setSettingsApiWarning(null)
      return
    }

    let cancelled = false

    async function loadSettingsApiData() {
      setIsLoadingSettingsApi(true)
      setSettingsApiWarning(null)

      async function loadAllNotificationPages() {
        const items: ApiNotificationItem[] = []
        const seenTokens = new Set<string>()
        let nextToken: string | undefined

        do {
          const page = await listNotifications(nextToken)
          items.push(...page.items)
          if (!page.nextToken || seenTokens.has(page.nextToken)) break
          seenTokens.add(page.nextToken)
          nextToken = page.nextToken
        } while (seenTokens.size < 20)

        return items
      }

      async function loadAllActivityPages() {
        const items: ApiActivityItem[] = []
        const seenTokens = new Set<string>()
        let nextToken: string | undefined

        do {
          const page = await listActivity(nextToken)
          items.push(...page.items)
          if (!page.nextToken || seenTokens.has(page.nextToken)) break
          seenTokens.add(page.nextToken)
          nextToken = page.nextToken
        } while (seenTokens.size < 20)

        return items
      }

      const [notificationResult, activityResult] = await Promise.allSettled([
        loadAllNotificationPages(),
        loadAllActivityPages(),
      ])

      if (cancelled) return

      if (notificationResult.status === "fulfilled") {
        setApiNotifications(notificationResult.value)
      } else {
        setApiNotifications(null)
        setSettingsApiWarning(t("settings.backendNotificationsWarning"))
      }

      if (activityResult.status === "fulfilled") {
        setApiActivityEvents(activityResult.value)
      } else {
        setApiActivityEvents(null)
        setSettingsApiWarning((current) =>
          current
            ? t("settings.backendActivityWarningCombined", { current }) : t("settings.backendActivityWarning")
        )
      }

      setIsLoadingSettingsApi(false)
    }

    void loadSettingsApiData()

    return () => {
      cancelled = true
    }
  }, [apiMode, t])

  const setAcknowledgedNotifications = (ids: string[]) => {
    const uniqueIds = Array.from(new Set(ids))
    setAcknowledgedNotificationIds(uniqueIds)
    writeAcknowledgedNotificationIds(session?.userId, uniqueIds)
  }

  const handleAcknowledgeNotification = async (notificationId: string) => {
    if (apiNotifications) {
      try {
        await acknowledgeNotification(notificationId)
        setApiNotifications((current) =>
          current?.map((notification) =>
            notification.id === notificationId ? { ...notification, unread: false } : notification
          ) ?? null
        )
      } catch {
        toast.warning(t("settings.backendNoticeLocal"))
      }
    }

    setAcknowledgedNotifications([...acknowledgedNotificationIds, notificationId])
    toast.success(t("settings.notificationSeen"))
  }

  const handleAcknowledgeAllActionNotifications = async () => {
    const actionIds = notifications.filter((notification) => notification.requiresAction).map((notification) => notification.id)
    if (apiNotifications) {
      const results = await Promise.allSettled(actionIds.map((id) => acknowledgeNotification(id)))
      if (results.some((result) => result.status === "rejected")) {
        toast.warning(t("settings.backendNoticesLocal"))
      }
      setApiNotifications((current) =>
        current?.map((notification) =>
          actionIds.includes(notification.id) ? { ...notification, unread: false } : notification
        ) ?? null
      )
    }
    setAcknowledgedNotifications([...acknowledgedNotificationIds, ...actionIds])
    toast.success(t("settings.notificationsSeen"))
  }

  const handleResetNotificationAcknowledgements = () => {
    setAcknowledgedNotifications(acknowledgedNotificationIds.filter((id) => !notifications.some((notification) => notification.id === id)))
    toast.success(t("settings.notificationsReset"))
  }

  const resetActivityFilters = () => {
    setActivityQuery("")
    setActivityFilter("ALL")
    setActivityRangeFilter("ALL")
    setActivitySeverityFilter("ALL")
    setActivityStatusFilter("ALL")
    setActivityPage(1)
    toast.success(t("toast.filtersReset"))
  }

  const handleExportActivityCsv = () => {
    exportActivityCsv(filteredEvents)
    toast.success(t("toast.exportedCsv"))
  }

  const updateProfileField = <K extends keyof ProfileFormState>(field: K, value: ProfileFormState[K]) => {
    setProfileForm((current) => ({ ...current, [field]: value }))
  }

  const updatePasswordField = <K extends keyof PasswordFormState>(field: K, value: PasswordFormState[K]) => {
    setPasswordForm((current) => ({ ...current, [field]: value }))
  }

  const handleSaveProfile = async () => {
    const firstName = profileForm.firstName.trim()
    const lastName = profileForm.lastName.trim()
    const email = profileForm.email.trim()
    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim()

    if (!firstName || !lastName) {
      toast.error(t("settings.profileNameRequired"))
      return
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error(t("settings.invalidEmail"))
      return
    }

    setIsSavingProfile(true)
    try {
      const userAttributes: Record<string, string> = {
        given_name: firstName,
        family_name: lastName,
        name: fullName,
      }

      if (email !== session?.email) {
        userAttributes.email = email
      }

      await updateUserAttributes({ userAttributes })
      writeStoredProfile(session?.userId, { ...profileForm, firstName, lastName, email })
      await refreshSession()
      toast.success(email !== session?.email ? t("settings.profileSavedVerify") : t("settings.profileSaved"))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("settings.profileSaveFailed"))
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      toast.error(t("settings.passwordRequired"))
      return
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error(t("settings.passwordTooShort"))
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error(t("settings.passwordMismatch"))
      return
    }

    setIsChangingPassword(true)
    try {
      await updatePassword({
        oldPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      })
      setPasswordForm(defaultPasswordForm)
      toast.success(t("settings.passwordSaved"))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("settings.passwordSaveFailed"))
    } finally {
      setIsChangingPassword(false)
    }
  }

  return (
    <BaseLayout title={t("settings.title")} description={t("settings.description")}>
      <section className="px-4 lg:px-6">
        <div className="overflow-hidden rounded-2xl border bg-[#10261d] text-white shadow-lg">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_420px]">
            <div className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-[#d8ff72]/40 bg-[#d8ff72]/15 font-mono text-[10px] uppercase text-[#d8ff72]">
                  {t("settings.title")}
                </Badge>
                <Badge variant="outline" className="border-white/20 bg-white/5 font-mono text-[10px] uppercase text-white/75">
                  {t(`role.${role}` as TranslationKey)}
                </Badge>
              </div>
              <h2 className="mt-2 max-w-3xl font-display text-lg font-semibold leading-snug tracking-tight text-white md:text-xl">
                {session?.name ?? t("profile.fallbackUser")}
              </h2>
              <p className="mt-1.5 max-w-2xl text-xs leading-6 text-white/62">
                {t("settings.description")}
                {syncMessage && <span className="ml-2 text-[#d8ff72]">{syncMessage}</span>}
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={() => void handleSettingsRefresh()} disabled={isSyncing}>
                  <RefreshCw className={isSyncing ? "size-4 animate-spin" : "size-4"} />
                  {t("common.refresh")}
                </Button>
                <Button type="button" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={handleLogout}>
                  <LogOut className="size-4" />
                  {t("common.signOut")}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 border-t border-white/12 lg:border-l lg:border-t-0">
              {[
                { label: t("profile.documents"), value: visibleDocuments.length, icon: FileSearch },
                { label: t("profile.needsAction"), value: openActionCount, icon: BellDot },
                { label: t("settings.notifications"), value: notifications.length, icon: MailCheck },
                { label: t("activity.approved"), value: approvalCount, icon: ShieldCheck },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="border-b border-r border-white/12 p-3 last:border-r-0 sm:p-4">
                    <Icon className="mb-2 size-3.5 text-[#d8ff72]" />
                    <div className="truncate text-lg font-semibold text-white">{item.value}</div>
                    <div className="mt-0.5 text-xs text-white/50">{item.label}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 lg:px-6">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SettingsTab)} className="gap-5">
          <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-xl border bg-background p-1">
            <TabsTrigger value="profile" className="min-h-10 px-4">
              <UserRound className="size-4" />
              {t("settings.profile")}
            </TabsTrigger>
            <TabsTrigger value="notifications" className="min-h-10 px-4">
              <BellDot className="size-4" />
              {t("settings.notifications")}
              {openActionCount > 0 && <span className="ml-1 rounded-full bg-[#d8ff72] px-1.5 py-0.5 text-[10px] text-[#10261d]">{openActionCount}</span>}
            </TabsTrigger>
            <TabsTrigger value="activity" className="min-h-10 px-4">
              <History className="size-4" />
              {t("settings.activity")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-5">
            <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
              <div className="grid content-start gap-5">
                <Card className="overflow-hidden">
                  <CardHeader className="border-b bg-muted/25">
                    <CardTitle className="flex items-center gap-2">
                      <UserRound className="size-5" />
                      {t("settings.identity")}
                    </CardTitle>
                    <CardDescription>{t("settings.identityBody")}</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-5 pt-5">
                    <div className="flex items-center gap-4">
                      <Avatar className="size-16 rounded-2xl border bg-[#10261d] text-white">
                        <AvatarFallback className="rounded-2xl bg-[#10261d] font-display text-lg text-[#d8ff72]">
                          {getInitials(session?.name, session?.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="truncate text-base font-semibold">{session?.name ?? t("profile.fallbackUser")}</div>
                        <div className="truncate text-sm text-muted-foreground">{session?.email ?? t("settings.noEmail")}</div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Badge variant="outline">{t(`role.${role}` as TranslationKey)}</Badge>
                          <Badge variant="outline" className={session?.emailVerified ? "border-emerald-200 text-emerald-700" : "border-amber-200 text-amber-700"}>
                            {session?.emailVerified ? t("settings.emailVerified") : t("settings.emailUnverified")}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3">
                      {[
                        ["Cognito sub", session?.userId ?? t("profile.unknown")],
                        [t("settings.cognitoGroup"), session?.groups?.length ? session.groups.join(", ") : t("settings.defaultFinance")],
                        [t("settings.appRole"), t(`role.${role}` as TranslationKey)],
                      ].map(([label, value]) => (
                        <div key={label} className="grid gap-1 rounded-xl border p-3">
                          <div className="font-mono text-[10px] uppercase text-muted-foreground">{label}</div>
                          <div className="break-all text-sm font-medium">{value}</div>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-xl border bg-muted/20 p-3 text-xs leading-5 text-muted-foreground">
                      {t("settings.cognitoKeyHint")}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="border-b bg-muted/25">
                    <CardTitle className="flex items-center gap-2">
                      <ShieldCheck className="size-5" />
                      {t("settings.access")}
                    </CardTitle>
                    <CardDescription>{t(role === "admin" ? "settings.adminAccessBody" : "settings.financeAccessBody")}</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 pt-5">
                    {[
                      { label: t("profile.uploadAccess"), enabled: capability?.canUpload },
                      { label: t("profile.reviewAccess"), enabled: capability?.canReview },
                      { label: t("profile.adminAccess"), enabled: capability?.canOperate },
                    ].map(({ label, enabled }) => (
                      <div key={label} className="flex items-center justify-between gap-3 rounded-xl border p-3">
                        <span className="text-sm font-medium">{label}</span>
                        <Badge variant="outline" className={enabled ? "border-emerald-200 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300" : "border-muted-foreground/30 text-muted-foreground"}>
                          {enabled ? t("profile.allowed") : t("profile.restricted")}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-5">
                <Card>
                  <CardHeader className="border-b bg-muted/25">
                    <CardTitle className="flex items-center gap-2">
                      <UserRound className="size-5" />
                      {t("settings.personalProfile")}
                    </CardTitle>
                    <CardDescription>{t("settings.personalProfileBody")}</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-5 pt-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="grid gap-2">
                        <Label htmlFor="firstName">{t("auth.firstName")}</Label>
                        <Input id="firstName" value={profileForm.firstName} onChange={(event) => updateProfileField("firstName", event.target.value)} placeholder="Minh" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="lastName">{t("auth.lastName")}</Label>
                        <Input id="lastName" value={profileForm.lastName} onChange={(event) => updateProfileField("lastName", event.target.value)} placeholder="Nguyen" />
                      </div>
                      <div className="grid gap-2 md:col-span-2">
                        <Label htmlFor="email">{t("auth.email")} Cognito</Label>
                        <Input id="email" type="email" value={profileForm.email} onChange={(event) => updateProfileField("email", event.target.value)} placeholder="youremail@example.com" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="company">{t("settings.company")}</Label>
                        <Input id="company" value={profileForm.company} onChange={(event) => updateProfileField("company", event.target.value)} placeholder="DocuFlow AI" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="department">{t("settings.department")}</Label>
                        <Input id="department" value={profileForm.department} onChange={(event) => updateProfileField("department", event.target.value)} placeholder="Finance operations" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="phone">{t("settings.phone")}</Label>
                        <Input id="phone" value={profileForm.phone} onChange={(event) => updateProfileField("phone", event.target.value)} placeholder="+84..." />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="defaultCurrency">{t("settings.defaultCurrency")}</Label>
                        <Select value={profileForm.defaultCurrency} onValueChange={(value) => updateProfileField("defaultCurrency", value)}>
                          <SelectTrigger id="defaultCurrency" className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {currencyOptions.map((currency) => (
                              <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Separator />

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="grid gap-2">
                        <Label htmlFor="timezone">{t("settings.timezone")}</Label>
                        <Select value={profileForm.timezone} onValueChange={(value) => updateProfileField("timezone", value)}>
                          <SelectTrigger id="timezone" className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {timezoneOptions.map((timezone) => (
                              <SelectItem key={timezone} value={timezone}>{timezone}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="language">{t("settings.language")}</Label>
                        <Select
                          value={profileForm.language}
                          onValueChange={(value) => {
                            updateProfileField("language", value)
                            setLanguage(value as AppLanguage)
                          }}
                        >
                          <SelectTrigger id="language" className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {languageOptions.map((language) => (
                              <SelectItem key={language.value} value={language.value}>{language.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
                      <div>
                        <div className="text-sm font-medium">{t("settings.compactTables")}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{t("settings.languageHint")}</div>
                      </div>
                      <Switch checked={profileForm.compactTables} onCheckedChange={(value) => updateProfileField("compactTables", value)} />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="notes">{t("settings.internalNotes")}</Label>
                      <Textarea id="notes" value={profileForm.notes} onChange={(event) => updateProfileField("notes", event.target.value)} placeholder={t("settings.notesPlaceholder")} />
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <Button type="button" variant="outline" onClick={() => session && setProfileForm({ ...defaultProfileForm, ...readStoredProfile(session.userId), firstName: session.firstName || "", lastName: session.lastName || "", email: session.email })}>
                        {t("settings.undo")}
                      </Button>
                      <Button type="button" onClick={handleSaveProfile} disabled={isSavingProfile}>
                        <Save className="size-4" />
                        {isSavingProfile ? t("settings.saving") : t("settings.saveProfile")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <Card>
                    <CardHeader className="border-b bg-muted/25">
                      <CardTitle className="flex items-center gap-2">
                        <ShieldCheck className="size-5" />
                        {t("settings.accountSecurity")}
                      </CardTitle>
                      <CardDescription>{t("settings.accountSecurityBody")}</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 pt-5">
                      <div className="grid gap-2">
                        <Label htmlFor="currentPassword">{t("settings.currentPassword")}</Label>
                        <Input id="currentPassword" type="password" value={passwordForm.currentPassword} onChange={(event) => updatePasswordField("currentPassword", event.target.value)} />
                      </div>
                      <div className="grid gap-2 md:grid-cols-2">
                        <div className="grid gap-2">
                          <Label htmlFor="newPassword">{t("settings.newPassword")}</Label>
                          <Input id="newPassword" type="password" value={passwordForm.newPassword} onChange={(event) => updatePasswordField("newPassword", event.target.value)} />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="confirmPassword">{t("settings.confirmPassword")}</Label>
                          <Input id="confirmPassword" type="password" value={passwordForm.confirmPassword} onChange={(event) => updatePasswordField("confirmPassword", event.target.value)} />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button type="button" variant="outline" onClick={handleChangePassword} disabled={isChangingPassword}>
                          {isChangingPassword ? t("settings.saving") : t("settings.changePassword")}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-[#d8ff72]/40 bg-[#f7fee7] dark:bg-[#10261d]">
                    <CardHeader className="border-b border-[#d8ff72]/30">
                      <CardTitle className="flex items-center gap-2">
                        <CircleDollarSign className="size-5" />
                        {t("settings.defaultWorkspace")}
                      </CardTitle>
                      <CardDescription>{t("settings.defaultWorkspaceBody")}</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3 pt-5 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">{t("documents.currency")}</span>
                        <span className="font-mono font-semibold">{profileForm.defaultCurrency}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">{t("settings.timezone")}</span>
                        <span className="font-mono text-xs font-semibold">{profileForm.timezone}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">{t("settings.language")}</span>
                        <span className="font-semibold">{languageOptions.find((item) => item.value === profileForm.language)?.label}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
            <div className="grid content-start gap-5">
              <Card className="h-fit">
                <CardHeader className="border-b bg-muted/25">
                  <CardTitle className="flex items-center gap-2">
                    <Settings2 className="size-5" />
                    {t("settings.notificationFilters")}
                  </CardTitle>
                  <CardDescription>
                    {t("settings.notificationFilterSummary", { count: filteredNotifications.length, source: apiNotifications ? t("settings.apiSource") : t("settings.documentSource") })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 pt-5">
                  <SettingSearch value={notificationQuery} onChange={setNotificationQuery} placeholder={t("notifications.searchPlaceholder")} />
                  <div className="grid gap-2">
                    {localizedNotificationFilters.map((item) => {
                      const count =
                        item.value === "ALL"
                          ? notifications.length
                          : item.value === "ACTION"
                            ? actionNotificationCount
                            : item.value === "FAILED"
                              ? failedNotificationCount
                              : item.value === "COMPLETE"
                                ? completeNotificationCount
                                : processingNotificationCount

                      return (
                        <Button
                          key={item.value}
                          type="button"
                          variant={notificationFilter === item.value ? "default" : "outline"}
                          className="justify-between"
                          onClick={() => setNotificationFilter(item.value)}
                        >
                          {item.label}
                          <span className="font-mono text-xs">{count}</span>
                        </Button>
                      )
                    })}
                  </div>
                  <Separator />
                  <div className="grid gap-2">
                    <Button type="button" size="sm" onClick={handleAcknowledgeAllActionNotifications} disabled={openActionCount === 0}>
                      <CheckCheck className="size-4" />
                      {t("settings.markViewed")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleResetNotificationAcknowledgements}
                      disabled={!notifications.some((notification) => acknowledgedNotificationSet.has(notification.id))}
                    >
                      {t("settings.restoreStatus")}
                    </Button>
                  </div>
                </CardContent>
              </Card>

            </div>

            <Card className="min-w-0">
              <CardHeader className="border-b bg-muted/25">
                <CardTitle className="flex items-center gap-2">
                  <Inbox className="size-5" />
                  {t("settings.notificationCenter")}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 pt-5">
                {(syncError || settingsApiWarning) && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    {syncError ? t("settings.syncDataError", { error: syncError }) : settingsApiWarning}
                  </div>
                )}
                {isSyncing || isLoadingSettingsApi ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="grid gap-3 rounded-xl border p-4">
                      <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                      <div className="h-3 w-full animate-pulse rounded bg-muted" />
                      <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                    </div>
                  ))
                ) : filteredNotifications.length ? (
                  filteredNotifications.map((notification) => {
                    const Icon = notification.icon
                    const acknowledged = notification.requiresAction && !notification.unread
                    return (
                      <div
                        key={notification.id}
                        className={[
                          "grid gap-4 rounded-xl border border-l-4 p-4 transition-colors lg:grid-cols-[1fr_auto] lg:items-center",
                          notificationSeverityClass(notification.severity),
                          acknowledged ? "opacity-70" : "",
                        ].join(" ")}
                      >
                        <div className="flex min-w-0 gap-4">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-background/70">
                            <Icon className="size-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="font-medium">{notification.title}</div>
                              {notification.unread && <Badge className="bg-[#d8ff72] text-[#10261d]">{t("notifications.actionRequired")}</Badge>}
                              {acknowledged && <Badge variant="outline">{t("notifications.markRead")}</Badge>}
                              <StatusBadge status={notification.document.status} />
                            </div>
                            <div className="mt-1 text-sm leading-6 text-muted-foreground">{notification.body}</div>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <MailCheck className="size-3.5" />
                              <span className="max-w-[260px] truncate">{notification.document.originalFileName}</span>
                              <span>{notification.document.vendorName || t("settings.missingVendor")}</span>
                              <span>{formatMoney(notification.document.totalAmount, notification.document.currency)}</span>
                              <span>{Math.round(notification.document.confidenceScore * 100)}%</span>
                              <span>{formatDate(notification.timestamp)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-row flex-wrap gap-2 lg:flex-col">
                          {notification.requiresAction && notification.unread && (
                            <Button type="button" variant="outline" size="sm" onClick={() => handleAcknowledgeNotification(notification.id)}>
                              <CheckCheck className="size-3.5" />
                              {t("notifications.markRead")}
                            </Button>
                          )}
                          <Button asChild variant="outline" size="sm">
                            <Link to={`/documents/${notification.document.documentId}`}>
                              {t("notifications.openDocument")}
                              <ArrowRight className="ml-1 size-3.5" />
                            </Link>
                          </Button>
                          {notification.requiresAction && (
                            <Button asChild size="sm">
                              <Link to="/review">
                                {t("notifications.review")}
                                <ArrowRight className="ml-1 size-3.5" />
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
                    <div className="font-medium">{t("notifications.noMatch")}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{t("notifications.noMatchHint")}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="grid min-w-0 gap-5 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">
            <div className="grid content-start gap-5">
              <Card className="h-fit min-w-0">
                <CardHeader className="border-b bg-muted/25">
                  <CardTitle className="flex items-center gap-2">
                    <Settings2 className="size-5" />
                    {t("activity.filters")}
                  </CardTitle>
                  <CardDescription>{t("activity.filtersBody")}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 pt-5">
                  <SettingSearch
                    value={activityQuery}
                    onChange={(value) => {
                      setActivityQuery(value)
                      setActivityPage(1)
                    }}
                    placeholder={t("activity.searchNamePlaceholder")}
                  />
                  <div className="grid gap-2">
                    {localizedActivityFilters.map((item) => (
                      <Button
                        key={item.value}
                        type="button"
                        variant={activityFilter === item.value ? "default" : "outline"}
                        className="justify-between"
                        onClick={() => {
                          setActivityFilter(item.value)
                          setActivityPage(1)
                        }}
                      >
                        {item.label}
                        <span className="font-mono text-xs">
                          {item.value === "ALL" ? events.length : events.filter((event) => event.kind === item.value).length}
                        </span>
                      </Button>
                    ))}
                  </div>
                  <div className="grid gap-3">
                    <div className="grid gap-1.5">
                      <Label>{t("settings.activityRange")}</Label>
                      <Select value={activityRangeFilter} onValueChange={(value) => { setActivityRangeFilter(value as ActivityRangeFilter); setActivityPage(1) }}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {localizedRangeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1.5">
                      <Label>{t("settings.activitySeverity")}</Label>
                      <Select value={activitySeverityFilter} onValueChange={(value) => { setActivitySeverityFilter(value as ActivitySeverityFilter); setActivityPage(1) }}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {localizedSeverityOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1.5">
                      <Label>{t("settings.documentStatus")}</Label>
                      <Select value={activityStatusFilter} onValueChange={(value) => { setActivityStatusFilter(value as ActivityStatusFilter); setActivityPage(1) }}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">{t("settings.allStatuses")}</SelectItem>
                          {(Object.keys(statusMeta) as DocumentStatus[]).map((status) => (
                            <SelectItem key={status} value={status}>{t(`status.${status}` as TranslationKey)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={resetActivityFilters}>
                      <RotateCcw className="size-3.5" />{t("settings.reset")}</Button>
                    <Button type="button" size="sm" onClick={handleExportActivityCsv} disabled={!filteredEvents.length}>
                      <Download className="size-3.5" />
                      CSV
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="border-b bg-muted/25">
                  <CardTitle className="flex items-center gap-2">
                    <ListChecks className="size-5" />{t("settings.auditSummary")}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 pt-5">
                  {[
                    [t("settings.totalEvents"), events.length],
                    [t("settings.upload"), uploadEventCount],
                    [t("settings.needsReviewOrError"), reviewEventCount],
                    [t("settings.errorEvent"), errorEventCount],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-3 rounded-xl border p-3 text-sm">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-mono font-semibold">{value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="border-b bg-muted/25">
                  <CardTitle className="flex items-center gap-2">
                    <Clock3 className="size-5" />
                    {t("activity.latest")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-5">
                  {latestEvent ? (
                    <div>
                      <div className="font-medium">{latestEvent.title}</div>
                      <div className="mt-1 text-sm leading-6 text-muted-foreground">{latestEvent.detail}</div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Badge variant="outline">{latestEvent.actor}</Badge>
                        <Badge variant="outline" className={activitySeverityMeta[latestEvent.severity].className}>{activitySeverityLabel(latestEvent.severity)}</Badge>
                      </div>
                      <div className="mt-3 font-mono text-xs text-muted-foreground">{formatDate(latestEvent.timestamp)}</div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">{t("activity.noActivity")}</div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="min-w-0">
              <CardHeader className="border-b bg-muted/25">
                <CardTitle className="flex items-center gap-2">
                  <ListChecks className="size-5" />
                  {t("activity.timeline")}
                </CardTitle>
                <CardDescription>{t("settings.timelineSummary", { count: filteredEvents.length })}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 pt-5">
                {(syncError || settingsApiWarning) && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    {syncError ? t("settings.syncActivityError", { error: syncError }) : settingsApiWarning}
                  </div>
                )}
                {isSyncing || isLoadingSettingsApi ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="grid gap-3 rounded-xl border p-4">
                      <div className="h-4 w-44 animate-pulse rounded bg-muted" />
                      <div className="h-3 w-full animate-pulse rounded bg-muted" />
                      <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                    </div>
                  ))
                ) : groupedPaginatedEvents.length ? (
                  groupedPaginatedEvents.map((group) => (
                    <div key={group.label} className="grid gap-3">
                      <div className="sticky top-[calc(var(--header-height)+0.5rem)] z-10 w-fit rounded-full border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground shadow-sm">
                        {group.label}
                      </div>
                      <div className="relative grid gap-3 border-l pl-5">
                        {group.items.map((event) => {
                          const Icon = event.icon
                          return (
                            <div key={event.id} className="relative grid gap-4 rounded-xl border p-4 transition-colors hover:bg-muted/20 lg:grid-cols-[1fr_auto] lg:items-center">
                              <div className="absolute -left-[29px] top-5 flex size-4 items-center justify-center rounded-full border bg-background">
                                <span className="size-2 rounded-full bg-[#10261d]" />
                              </div>
                              <div className="flex min-w-0 gap-4">
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-muted/30">
                                  <Icon className="size-5" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <div className="font-medium">{event.title}</div>
                                    <Badge variant="secondary" className="text-xs">{activityKindLabel(event.kind)}</Badge>
                                    <Badge variant="outline" className={activitySeverityMeta[event.severity].className}>{activitySeverityLabel(event.severity)}</Badge>
                                    <StatusBadge status={event.document.status} />
                                  </div>
                                  <div className="mt-1 text-sm leading-6 text-muted-foreground">{event.detail}</div>
                                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    <span className="max-w-[220px] truncate">{event.document.originalFileName}</span>
                                    <span>{event.document.vendorName || t("settings.missingVendor")}</span>
                                    <span>{formatMoney(event.document.totalAmount, event.document.currency)}</span>
                                    <span>{Math.round(event.document.confidenceScore * 100)}%</span>
                                  </div>
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    <Badge variant="outline">{t("settings.actor")}: {event.actor}</Badge>
                                    <Badge variant="outline">{t("settings.source")}: {event.source}</Badge>
                                    <Badge variant="outline" className="font-mono">{formatDate(event.timestamp)}</Badge>
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2 lg:flex-col">
                                <Button asChild variant="outline" size="sm" className="w-fit shrink-0">
                                  <Link to={`/documents/${event.document.documentId}`}>
                                    {t("activity.view")} <ArrowRight className="ml-1 size-3.5" />
                                  </Link>
                                </Button>
                                {event.kind === "REVIEW" && (
                                  <Button asChild size="sm" className="w-fit shrink-0">
                                    <Link to="/review">
                                      {t("activity.review")} <ArrowRight className="ml-1 size-3.5" />
                                    </Link>
                                  </Button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed p-8 text-center">
                    <History className="mx-auto mb-3 size-8 text-muted-foreground" />
                    <div className="font-medium">{t("activity.noMatch")}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{t("activity.noMatchHint")}</div>
                  </div>
                )}

                <TablePagination
                  page={activityPage}
                  pageSize={activityPageSize}
                  totalItems={filteredEvents.length}
                  totalPages={activityTotalPages}
                  onPageChange={setActivityPage}
                  isLoading={isSyncing || isLoadingSettingsApi}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>
    </BaseLayout>
  )
}
