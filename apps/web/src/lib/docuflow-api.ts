import type {
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

type RawApiDocument = Partial<DocumentResult> & {
  fileName?: unknown
  lineItems?: unknown
}

type ApiListEnvelope = {
  items?: unknown
  nextToken?: unknown
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
    throw new Error(message || `API request failed with status ${response.status}`)
  }

  const json = await response.json()
  
  // Debug: log raw backend response to identify field name mismatches
  console.debug(`[DocuFlow API] ${init?.method ?? "GET"} ${path}`, json)

  if (json && typeof json === 'object' && 'success' in json) {
    if (!json.success) {
      throw new Error(json.error?.errorMessage || "API returned success: false")
    }
    return json.data as T
  }

  return json as T
}

/**
 * Normalize a raw backend document to ensure every field the UI relies on is
 * present with a safe default value. The backend may omit fields, return them
 * as `undefined`, or use slightly different types (e.g. `string` for numeric
 * values). This single function is the only place we need to handle that.
 */
function sanitizeApiDocument(raw: RawApiDocument): DocumentResult {
  return {
    documentId:       raw.documentId ?? "",
    userId:           raw.userId ?? "",
    originalFileName: raw.originalFileName ?? (typeof raw.fileName === "string" ? raw.fileName : "unknown"),
    documentType:     raw.documentType ?? "INVOICE",
    status:           raw.status ?? "UPLOADED",
    vendorName:       raw.vendorName ?? "Unknown",
    invoiceDate:      raw.invoiceDate ?? "",
    currency:         normalizeCurrencyCode(raw.currency),
    totalAmount:      typeof raw.totalAmount === "number" ? raw.totalAmount : Number(raw.totalAmount) || 0,
    taxAmount:        raw.taxAmount == null ? null : (typeof raw.taxAmount === "number" ? raw.taxAmount : Number(raw.taxAmount) || 0),
    confidenceScore:  normalizeConfidenceScore(raw.confidenceScore),
    reviewStatus:     raw.reviewStatus ?? "PENDING",
    reviewReasonCodes: Array.isArray(raw.reviewReasonCodes) ? raw.reviewReasonCodes : [],
    aiProvider:       raw.aiProvider ?? "not-called",
    normalizationMethod: raw.normalizationMethod ?? "TEXTRACT_ONLY",
    rawS3Key:         raw.rawS3Key ?? "",
    processedS3Key:   raw.processedS3Key ?? "",
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
    const raw = await apiRequest<unknown>(`/documents/${encodeURIComponent(documentId)}`)
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
  const extension = request.originalFileName.split(".").pop() || "pdf"
  const rawS3Key = `raw/${userId}/${documentId}/original.${extension}`

  return {
    documentId,
    uploadUrl: "https://s3-presigned-url.example.com/docuflow-demo",
    rawS3Key,
    expiresInSeconds: 300,
  }
}

export async function processDocument(
  documentId: string,
  rawS3Key: string
): Promise<{ success: boolean }> {
  if (apiBaseUrl) {
    return apiRequest<{ success: boolean }>(`/documents/${encodeURIComponent(documentId)}/process`, {
      method: "POST",
      body: JSON.stringify({ rawS3Key }),
    })
  }
  await wait()
  return { success: true }
}

export interface UploadDocumentOptions {
  contentType?: string
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
    request.setRequestHeader("Content-Type", options.contentType ?? file.type)

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

export async function listTestCases() {
  await wait()
  return testCases
}
