import type {
  DocumentResult,
  ListDocumentsRequest,
  ListDocumentsResponse,
  ReviewDocumentRequest,
  ReviewDocumentResponse,
  UploadUrlRequest,
  UploadUrlResponse,
} from "@docuflow/shared-types"
import { documents, testCases } from "@/lib/docuflow-data"
import { getCurrentDocuFlowSession } from "@/lib/auth"

export type { ListDocumentsRequest, UploadUrlRequest, UploadUrlResponse }

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "")
const demoLatency = 250

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
function sanitizeApiDocument(raw: any): DocumentResult {
  return {
    documentId:       raw.documentId ?? "",
    userId:           raw.userId ?? "",
    originalFileName: raw.originalFileName ?? raw.fileName ?? "unknown",
    documentType:     raw.documentType ?? "INVOICE",
    status:           raw.status ?? "UPLOADED",
    vendorName:       raw.vendorName ?? "Unknown",
    invoiceDate:      raw.invoiceDate ?? "",
    currency:         raw.currency ?? "VND",
    totalAmount:      typeof raw.totalAmount === "number" ? raw.totalAmount : Number(raw.totalAmount) || 0,
    taxAmount:        raw.taxAmount == null ? null : (typeof raw.taxAmount === "number" ? raw.taxAmount : Number(raw.taxAmount) || 0),
    confidenceScore:  typeof raw.confidenceScore === "number" ? raw.confidenceScore : Number(raw.confidenceScore) || 0,
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

const extractValue = (field: any) => field && typeof field === "object" && "value" in field ? field.value : field;

function sanitizeLineItem(raw: any): import("@docuflow/shared-types").LineItem {
  const lineItemId = extractValue(raw?.lineItemId ?? raw?.id);
  const description = extractValue(raw?.description);
  const quantity = extractValue(raw?.quantity);
  const unitPriceAmount = extractValue(raw?.unitPriceAmount ?? raw?.unitPrice);
  const taxAmount = extractValue(raw?.taxAmount);
  const totalAmount = extractValue(raw?.totalAmount ?? raw?.amount);
  const confidenceScore = extractValue(raw?.confidenceScore);

  return {
    lineItemId:      lineItemId != null ? String(lineItemId) : "",
    description:     description != null ? String(description) : "",
    quantity:        Number(quantity) || 0,
    unitPriceAmount: Number(unitPriceAmount) || 0,
    taxAmount:       Number(taxAmount) || 0,
    totalAmount:     Number(totalAmount) || 0,
    confidenceScore: Number(confidenceScore) || 0,
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
    const response = await apiRequest<any>(`/documents${suffix}`)
    
    const rawItems = Array.isArray(response?.items) ? response.items : Array.isArray(response) ? response : []
    return {
      items: rawItems.map(sanitizeApiDocument),
      nextToken: response?.nextToken ?? null,
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
    const raw = await apiRequest<any>(`/documents/${encodeURIComponent(documentId)}`)
    if (!raw) return null
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
