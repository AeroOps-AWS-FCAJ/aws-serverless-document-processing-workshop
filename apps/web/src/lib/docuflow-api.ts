import type {
  DeleteDocumentResponse,
  DeleteDocumentsResponse,
  DocumentResult,
  ListDocumentsRequest,
  ListDocumentsResponse,
  ReviewDocumentRequest,
  ReviewDocumentResponse,
  UploadUrlRequest,
  UploadUrlResponse,
} from "@docuflow/shared-types"
import { documents, normalizeCurrencyCode, testCases } from "@/lib/docuflow-data"
import { getCurrentDocuFlowSession } from "@/lib/auth"

export type { ListDocumentsRequest, UploadUrlRequest, UploadUrlResponse }

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "")
const demoLatency = 250

export interface ProcessDocumentResponse {
  documentId: string
  status?: string
  started?: boolean
  message?: string
}

export interface ProcessDocumentMetadata {
  originalFileName?: string
  mimeType?: string
  documentType?: "INVOICE" | "RECEIPT"
  pageCount?: number
}

export interface RetryDocumentResponse {
  documentId: string
  status?: string
  retryStarted?: boolean
  message?: string
  updatedAt?: string
}

export interface ApiNotificationItem {
  id: string
  documentId: string
  document?: Partial<DocumentResult>
  kind: "ACTION" | "FAILED" | "COMPLETE" | "PROCESSING"
  title: string
  body: string
  timestamp: string
  unread: boolean
  requiresAction: boolean
  severity: "critical" | "warning" | "success" | "info"
}

export interface ListNotificationsResponse {
  items: ApiNotificationItem[]
  nextToken: string | null
}

export interface AcknowledgeNotificationResponse {
  notificationId: string
  unread: boolean
  acknowledgedAt?: string
}

export interface ApiActivityItem {
  id: string
  documentId: string
  document?: Partial<DocumentResult>
  kind: "UPLOAD" | "PROCESSING" | "REVIEW" | "APPROVAL"
  title: string
  detail: string
  timestamp: string
  actor: string
  source: string
  severity: "info" | "warning" | "error" | "success"
}

export interface ListActivityResponse {
  items: ApiActivityItem[]
  nextToken: string | null
}

export interface ReportsSummaryResponse {
  totalDocuments?: number
  approvedDocuments?: number
  reviewRequiredDocuments?: number
  failedDocuments?: number
  totalAmountVnd?: number
  approvedAmountVnd?: number
  pendingAmountVnd?: number
  averageConfidence?: number
  amountsByCurrency?: Record<string, number>
  approvedAmountsByCurrency?: Record<string, number>
  pendingAmountsByCurrency?: Record<string, number>
  unconvertedCurrencies?: string[]
  exchangeRateSource?: string
  generatedAt?: string
}

type RawApiDocument = Partial<DocumentResult> & {
  file?: unknown
  fileName?: unknown
  storage?: unknown
  lineItems?: unknown
}

type ApiListEnvelope = {
  items?: unknown
  nextToken?: unknown
}

type ApiCollectionEnvelope = {
  items?: unknown
  nextToken?: unknown
}

class ApiRequestError extends Error {
  status: number
  body: string

  constructor(status: number, message: string, body: string) {
    super(message)
    this.name = "ApiRequestError"
    this.status = status
    this.body = body
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function wait(ms = demoLatency) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

export function isApiConfigured() {
  return Boolean(apiBaseUrl)
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  if (!apiBaseUrl) throw new Error("VITE_API_BASE_URL is not configured")

  const session = await getCurrentDocuFlowSession()
  const token = session?.idToken || session?.accessToken
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const message = await response.text()
    throw new ApiRequestError(
      response.status,
      message || `API request failed with status ${response.status}`,
      message
    )
  }

  const text = await response.text()
  const json = text ? JSON.parse(text) : null
  
  if (json && typeof json === 'object' && 'success' in json) {
    if (!json.success) {
      throw new Error(json.error?.errorMessage || "API returned success: false")
    }
    return json.data as T
  }

  return json as T
}

function isNotFoundError(error: unknown) {
  if (error instanceof ApiRequestError && error.status === 404) return true

  const message = error instanceof Error ? error.message : String(error)
  if (!message) return false

  try {
    const parsed = JSON.parse(message)
    return parsed?.error?.errorCode === "NOT_FOUND"
  } catch {
    return message.includes('"errorCode":"NOT_FOUND"') || message.includes("Document not found")
  }
}

/**
 * Normalize a raw backend document to ensure every field the UI relies on is
 * present with a safe default value. The backend may omit fields, return them
 * as `undefined`, or use slightly different types (e.g. `string` for numeric
 * values). This single function is the only place we need to handle that.
 */
function sanitizeApiDocument(raw: RawApiDocument): DocumentResult {
  const file = isRecord(raw.file) ? raw.file : {}
  const storage = isRecord(raw.storage) ? raw.storage : {}
  const rawS3Key = pickString(raw.rawS3Key, storage.rawS3Key)

  return {
    documentId:       raw.documentId ?? "",
    userId:           raw.userId ?? "",
    originalFileName: pickDisplayFileName({
      documentId: raw.documentId,
      explicitFileName: pickString(raw.originalFileName, raw.fileName, file.originalFileName, file.fileName),
      rawS3Key,
    }),
    documentType:     raw.documentType ?? "INVOICE",
    status:           raw.status ?? "UPLOADED",
    invoiceNumber:    typeof raw.invoiceNumber === "string" ? raw.invoiceNumber : "",
    vendorName:       raw.vendorName ?? "Unknown",
    invoiceDate:      raw.invoiceDate ?? "",
    dueDate:          typeof raw.dueDate === "string" ? raw.dueDate : "",
    currency:         normalizeCurrencyCode(raw.currency),
    subtotalAmount:   raw.subtotalAmount == null ? undefined : toNumber(raw.subtotalAmount),
    discountAmount:   raw.discountAmount == null ? undefined : toNumber(raw.discountAmount),
    shippingAmount:   raw.shippingAmount == null ? undefined : toNumber(raw.shippingAmount),
    totalAmount:      typeof raw.totalAmount === "number" ? raw.totalAmount : Number(raw.totalAmount) || 0,
    taxAmount:        raw.taxAmount == null ? null : (typeof raw.taxAmount === "number" ? raw.taxAmount : Number(raw.taxAmount) || 0),
    confidenceScore:  normalizeConfidenceScore(raw.confidenceScore),
    reviewStatus:     raw.reviewStatus ?? "PENDING",
    reviewReasonCodes: Array.isArray(raw.reviewReasonCodes) ? raw.reviewReasonCodes : [],
    aiProvider:       raw.aiProvider ?? "not-called",
    normalizationMethod: raw.normalizationMethod ?? "TEXTRACT_ONLY",
    rawS3Key,
    processedS3Key:   pickString(raw.processedS3Key, storage.processedS3Key),
    sourceUrl:        typeof raw.sourceUrl === "string" ? raw.sourceUrl : null,
    createdAt:        raw.createdAt ?? new Date().toISOString(),
    updatedAt:        raw.updatedAt ?? new Date().toISOString(),
    reviewedAt:       raw.reviewedAt ?? null,
    reviewedBy:       raw.reviewedBy ?? null,
    reviewerNote:     raw.reviewerNote ?? null,
    lineItems:        Array.isArray(raw.lineItems) ? raw.lineItems.map(sanitizeLineItem) : [],
    errorMessage:     raw.errorMessage ?? null,
  }
}

const extractValue = (field: unknown) => isRecord(field) && "value" in field ? field.value : field;

function toNumber(value: unknown, fallback = 0) {
  if (value == null || value === "") return fallback
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeConfidenceScore(value: unknown) {
  const score = toNumber(value)
  if (score <= 0) return 0
  if (score <= 1) return score
  return Math.min(score / 100, 1)
}

function pickString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return ""
}

function pickDisplayFileName({
  documentId,
  explicitFileName,
  rawS3Key,
}: {
  documentId?: string
  explicitFileName: string
  rawS3Key: string
}) {
  if (explicitFileName && !isGenericRawObjectName(explicitFileName)) {
    return explicitFileName
  }

  const rawFileName = rawS3Key ? decodeS3KeySegment(rawS3Key.split("/").pop() ?? "") : ""
  if (rawFileName && !isGenericRawObjectName(rawFileName)) {
    return rawFileName
  }

  if (explicitFileName) {
    return documentId ? `${documentId}${getFileExtension(explicitFileName)}` : explicitFileName
  }

  return documentId ? `${documentId}.pdf` : "unknown"
}

function decodeS3KeySegment(value: string) {
  try {
    return decodeURIComponent(value.replace(/\+/g, "%20"))
  } catch {
    return value
  }
}

function getFileExtension(fileName: string) {
  const match = fileName.match(/(\.[A-Za-z0-9]+)$/)
  return match ? match[1].toLowerCase() : ""
}

function isGenericRawObjectName(fileName: string) {
  return /^original\.[A-Za-z0-9]+$/i.test(fileName.trim())
}

function sanitizeLineItem(raw: unknown): import("@docuflow/shared-types").LineItem {
  const item = isRecord(raw) ? raw : {}
  const lineItemId = extractValue(item.lineItemId ?? item.id);
  const description = extractValue(item.description ?? item.itemDescription ?? item.name ?? item.productName);
  const quantity = extractValue(item.quantity);
  const unitPriceAmount = extractValue(item.unitPriceAmount ?? item.unitPrice ?? item.price);
  const taxAmount = extractValue(item.taxAmount);
  const totalAmount = extractValue(item.totalAmount ?? item.amount ?? item.price);
  const confidenceScore = extractValue(item.confidenceScore);
  const normalizedTotalAmount = toNumber(totalAmount)
  const normalizedQuantity = toNumber(quantity, normalizedTotalAmount > 0 ? 1 : 0)

  return {
    lineItemId:      lineItemId != null ? String(lineItemId) : "",
    description:     description != null ? String(description) : "",
    quantity:        normalizedQuantity,
    unitPriceAmount: toNumber(unitPriceAmount, normalizedTotalAmount),
    taxAmount:       toNumber(taxAmount),
    totalAmount:     normalizedTotalAmount,
    confidenceScore: normalizeConfidenceScore(confidenceScore),
  }
}

export async function listDocuments(
  request: ListDocumentsRequest = {}
): Promise<ListDocumentsResponse> {
  if (apiBaseUrl) {
    const query = new URLSearchParams()
    if (request.status) query.set("status", request.status)
    if (request.nextToken) query.set("nextToken", request.nextToken)
    const suffix = query.size ? `?${query.toString()}` : ""
    const response = await apiRequest<unknown>(`/documents${suffix}`)
    const envelope: ApiListEnvelope = isRecord(response) ? response : {}
    
    const rawItems = Array.isArray(envelope.items) ? envelope.items : Array.isArray(response) ? response : []
    return {
      items: rawItems.map((item) => sanitizeApiDocument(isRecord(item) ? item : {})),
      nextToken: typeof envelope.nextToken === "string" ? envelope.nextToken : null,
    }
  }

  await wait()
  const session = await getCurrentDocuFlowSession()
  const visible = documents.filter((document) => {
    const allowedByOwner = session?.role !== "finance" || document.userId === session.userId
    const allowedByStatus = !request.status || document.status === request.status
    return allowedByOwner && allowedByStatus
  })

  return { items: visible, nextToken: null }
}

export async function getDocument(documentId: string): Promise<DocumentResult | null> {
  if (apiBaseUrl) {
    let raw: unknown
    try {
      raw = await apiRequest<unknown>(`/documents/${encodeURIComponent(documentId)}`)
    } catch (error) {
      if (isNotFoundError(error)) return null
      throw error
    }
    if (!isRecord(raw)) return null
    return sanitizeApiDocument(raw)
  }

  await wait()
  const session = await getCurrentDocuFlowSession()
  const document = documents.find((item) => item.documentId === documentId) ?? null
  if (session?.role === "finance" && document?.userId !== session.userId) return null
  return document
}

export async function requestUploadUrl(
  request: UploadUrlRequest
): Promise<UploadUrlResponse> {
  if (apiBaseUrl) {
    const payload = {
      originalFileName: request.originalFileName,
      mimeType: request.mimeType,
      fileSizeBytes: request.fileSizeBytes,
      pageCount: request.pageCount,
      ...(request.documentType ? { documentType: request.documentType } : {}),
    }
    return apiRequest<UploadUrlResponse>("/documents/upload-url", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  }

  await wait()
  const documentId = `doc-${Math.floor(100 + Math.random() * 900)}`
  const session = await getCurrentDocuFlowSession()
  const userId = session?.userId ?? "user-123"
  const rawS3Key = `raw/${userId}/${documentId}/${request.originalFileName}`

  return {
    documentId,
    uploadUrl: "https://s3-presigned-url.example.com/docuflow-demo",
    rawS3Key,
    expiresInSeconds: 300,
    uploadHeaders: { "Content-Type": request.mimeType },
  }
}

export async function processDocument(
  documentId: string,
  rawS3Key: string,
  metadata: ProcessDocumentMetadata = {}
): Promise<ProcessDocumentResponse> {
  if (apiBaseUrl) {
    const response = await apiRequest<ProcessDocumentResponse | null>(`/documents/${encodeURIComponent(documentId)}/process`, {
      method: "POST",
      body: JSON.stringify({ rawS3Key, ...metadata }),
    })
    return response ?? { documentId, started: true }
  }
  await wait()
  return { documentId, started: true }
}

export async function retryDocument(documentId: string): Promise<RetryDocumentResponse> {
  if (apiBaseUrl) {
    const response = await apiRequest<RetryDocumentResponse | null>(
      `/documents/${encodeURIComponent(documentId)}/retry`,
      { method: "POST" }
    )
    return response ?? {
      documentId,
      retryStarted: true,
      updatedAt: new Date().toISOString(),
    }
  }

  await wait()
  return {
    documentId,
    retryStarted: true,
    updatedAt: new Date().toISOString(),
  }
}

export interface UploadDocumentOptions {
  contentType?: string
  headers?: Record<string, string>
  onProgress?: (progress: number) => void
  signal?: AbortSignal
}

export async function uploadDocumentFile(
  uploadUrl: string,
  file: File,
  options: UploadDocumentOptions = {}
) {
  if (!apiBaseUrl) {
    for (const progress of [12, 32, 58, 81, 100]) {
      if (options.signal?.aborted) {
        throw new DOMException("Upload canceled", "AbortError")
      }
      await wait(90)
      options.onProgress?.(progress)
    }
    return
  }

  await new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open("PUT", uploadUrl)
    const headers = normalizeUploadHeaders(
      options.headers,
      options.contentType ?? file.type
    )
    for (const [name, value] of Object.entries(headers)) {
      request.setRequestHeader(name, value)
    }

    request.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable) return
      options.onProgress?.(Math.round((event.loaded / event.total) * 100))
    })
    request.addEventListener("load", () => {
      if (request.status >= 200 && request.status < 300) {
        options.onProgress?.(100)
        resolve()
        return
      }
      reject(new Error(`S3 upload failed with status ${request.status}`))
    })
    request.addEventListener("error", () => reject(new Error("Network error while uploading to S3")))
    request.addEventListener("abort", () => reject(new DOMException("Upload canceled", "AbortError")))

    if (options.signal) {
      if (options.signal.aborted) {
        request.abort()
        return
      }
      options.signal.addEventListener("abort", () => request.abort(), { once: true })
    }

    request.send(file)
  })
}

function normalizeUploadHeaders(headers: Record<string, string> = {}, fallbackContentType: string) {
  const normalized: Record<string, string> = {}
  let hasContentType = false

  for (const [name, value] of Object.entries(headers)) {
    if (!value) continue
    if (name.toLowerCase() === "content-type") hasContentType = true
    normalized[name] = value
  }

  if (!hasContentType && fallbackContentType) {
    normalized["Content-Type"] = fallbackContentType
  }

  return normalized
}

export async function reviewDocument(
  documentId: string,
  request: ReviewDocumentRequest
): Promise<ReviewDocumentResponse> {
  if (apiBaseUrl) {
    return apiRequest<ReviewDocumentResponse>(
      `/documents/${encodeURIComponent(documentId)}/review`,
      { method: "PATCH", body: JSON.stringify(request) }
    )
  }

  await wait()
  const session = await getCurrentDocuFlowSession()
  if (!session) {
    throw new Error("An authenticated finance or administrator session is required")
  }
  return {
    documentId,
    status: request.reviewStatus === "APPROVED" ? "APPROVED" : "CORRECTED",
    reviewStatus: request.reviewStatus === "APPROVED" ? "APPROVED" : "CORRECTED",
    updatedAt: new Date().toISOString(),
  }
}

export async function deleteDocument(documentId: string): Promise<DeleteDocumentResponse> {
  if (apiBaseUrl) {
    const response = await apiRequest<DeleteDocumentResponse | null>(
      `/documents/${encodeURIComponent(documentId)}`,
      { method: "DELETE" }
    )
    return response ?? {
      documentId,
      deleted: true,
      deletedAt: new Date().toISOString(),
    }
  }

  await wait()
  return {
    documentId,
    deleted: true,
    deletedAt: new Date().toISOString(),
  }
}

export async function deleteDocuments(documentIds: string[]): Promise<DeleteDocumentsResponse> {
  const uniqueDocumentIds = Array.from(new Set(documentIds)).filter(Boolean)

  if (!uniqueDocumentIds.length) {
    return {
      documentIds: [],
      deletedCount: 0,
      deletedAt: new Date().toISOString(),
    }
  }

  if (apiBaseUrl) {
    const response = await apiRequest<DeleteDocumentsResponse | null>(
      "/documents",
      {
        method: "DELETE",
        body: JSON.stringify({ documentIds: uniqueDocumentIds }),
      }
    )
    return response ?? {
      documentIds: uniqueDocumentIds,
      deletedCount: uniqueDocumentIds.length,
      deletedAt: new Date().toISOString(),
    }
  }

  await wait()
  return {
    documentIds: uniqueDocumentIds,
    deletedCount: uniqueDocumentIds.length,
    deletedAt: new Date().toISOString(),
  }
}

function sanitizeNotification(raw: unknown): ApiNotificationItem | null {
  if (!isRecord(raw)) return null
  const document = isRecord(raw.document) ? sanitizeApiDocument(raw.document) : undefined
  const documentId = String(raw.documentId ?? document?.documentId ?? "")
  if (!documentId) return null

  return {
    id: String(raw.id ?? raw.notificationId ?? `${documentId}-${raw.kind ?? "notification"}`),
    documentId,
    document,
    kind: normalizeNotificationKind(raw.kind, raw.severity),
    title: String(raw.title ?? "Thông báo tài liệu"),
    body: String(raw.body ?? raw.message ?? ""),
    timestamp: String(raw.timestamp ?? raw.createdAt ?? raw.updatedAt ?? new Date().toISOString()),
    unread: Boolean(raw.unread ?? raw.isUnread ?? false),
    requiresAction: Boolean(raw.requiresAction ?? raw.needsAction ?? false),
    severity: normalizeNotificationSeverity(raw.severity),
  }
}

function normalizeNotificationKind(value: unknown, severity?: unknown): ApiNotificationItem["kind"] {
  const kind = String(value || "").toUpperCase()
  const severityValue = String(severity || "").toLowerCase()
  if (kind === "FAILED" || (kind === "SYSTEM" && severityValue === "error")) return "FAILED"
  if (kind === "COMPLETE" || kind === "COMPLETED") return "COMPLETE"
  if (kind === "PROCESSING") return "PROCESSING"
  return "ACTION"
}

function normalizeNotificationSeverity(value: unknown): ApiNotificationItem["severity"] {
  const severity = String(value || "").toLowerCase()
  if (severity === "critical" || severity === "error") return "critical"
  if (severity === "success") return "success"
  if (severity === "info") return "info"
  return "warning"
}

function sanitizeActivity(raw: unknown): ApiActivityItem | null {
  if (!isRecord(raw)) return null
  const document = isRecord(raw.document) ? sanitizeApiDocument(raw.document) : undefined
  const documentId = String(raw.documentId ?? document?.documentId ?? "")
  if (!documentId) return null

  return {
    id: String(raw.id ?? raw.activityId ?? `${documentId}-${raw.kind ?? "activity"}-${raw.timestamp ?? ""}`),
    documentId,
    document,
    kind: normalizeActivityKind(raw.kind),
    title: String(raw.title ?? "Hoạt động tài liệu"),
    detail: String(raw.detail ?? raw.message ?? ""),
    timestamp: String(raw.timestamp ?? raw.createdAt ?? raw.updatedAt ?? new Date().toISOString()),
    actor: String(raw.actor ?? raw.userId ?? "Backend"),
    source: String(raw.source ?? raw.stage ?? "DocuFlow API"),
    severity: normalizeActivitySeverity(raw.severity),
  }
}

function normalizeActivityKind(value: unknown): ApiActivityItem["kind"] {
  const kind = String(value || "").toUpperCase()
  if (["PROCESSING", "EXTRACTED", "FAILED"].includes(kind)) return "PROCESSING"
  if (kind === "REVIEW" || kind === "REVIEW_REQUIRED") return "REVIEW"
  if (["APPROVAL", "APPROVED", "CORRECTED"].includes(kind)) return "APPROVAL"
  return "UPLOAD"
}

function normalizeActivitySeverity(value: unknown): ApiActivityItem["severity"] {
  const severity = String(value || "").toLowerCase()
  if (severity === "warning") return "warning"
  if (severity === "error") return "error"
  if (severity === "success") return "success"
  return "info"
}

export async function listNotifications(nextToken?: string, limit = 100): Promise<ListNotificationsResponse> {
  if (apiBaseUrl) {
    const query = new URLSearchParams()
    if (nextToken) query.set("nextToken", nextToken)
    query.set("limit", String(limit))
    const suffix = query.size ? `?${query.toString()}` : ""
    const response = await apiRequest<unknown>(`/notifications${suffix}`)
    const envelope: ApiCollectionEnvelope = isRecord(response) ? response : {}
    const rawItems = Array.isArray(envelope.items) ? envelope.items : Array.isArray(response) ? response : []

    return {
      items: rawItems.map(sanitizeNotification).filter((item): item is ApiNotificationItem => Boolean(item)),
      nextToken: typeof envelope.nextToken === "string" ? envelope.nextToken : null,
    }
  }

  await wait()
  return { items: [], nextToken: null }
}

export async function acknowledgeNotification(notificationId: string): Promise<AcknowledgeNotificationResponse> {
  if (apiBaseUrl) {
    const response = await apiRequest<AcknowledgeNotificationResponse | null>(
      `/notifications/${encodeURIComponent(notificationId)}`,
      {
        method: "PATCH",
        body: JSON.stringify({ unread: false, status: "READ" }),
      }
    )
    return response ?? {
      notificationId,
      unread: false,
      acknowledgedAt: new Date().toISOString(),
    }
  }

  await wait()
  return {
    notificationId,
    unread: false,
    acknowledgedAt: new Date().toISOString(),
  }
}

export async function listActivity(nextToken?: string, limit = 100): Promise<ListActivityResponse> {
  if (apiBaseUrl) {
    const query = new URLSearchParams()
    if (nextToken) query.set("nextToken", nextToken)
    query.set("limit", String(limit))
    const suffix = query.size ? `?${query.toString()}` : ""
    const response = await apiRequest<unknown>(`/activity${suffix}`)
    const envelope: ApiCollectionEnvelope = isRecord(response) ? response : {}
    const rawItems = Array.isArray(envelope.items) ? envelope.items : Array.isArray(response) ? response : []

    return {
      items: rawItems.map(sanitizeActivity).filter((item): item is ApiActivityItem => Boolean(item)),
      nextToken: typeof envelope.nextToken === "string" ? envelope.nextToken : null,
    }
  }

  await wait()
  return { items: [], nextToken: null }
}

export async function getReportsSummary(): Promise<ReportsSummaryResponse | null> {
  if (apiBaseUrl) {
    return apiRequest<ReportsSummaryResponse | null>("/reports/summary")
  }

  await wait()
  return null
}

export async function listTestCases() {
  await wait()
  return testCases
}
