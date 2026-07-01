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
  
  if (json && typeof json === 'object' && 'success' in json) {
    if (!json.success) {
      throw new Error(json.error?.errorMessage || "API returned success: false")
    }
    return json.data as T
  }

  return json as T
}

export async function listDocuments(
  request: ListDocumentsRequest = {}
): Promise<ListDocumentsResponse> {
  if (apiBaseUrl) {
    const query = new URLSearchParams()
    if (request.status) query.set("status", request.status)
    if (request.nextToken) query.set("nextToken", request.nextToken)
    const suffix = query.size ? `?${query.toString()}` : ""
    return apiRequest<ListDocumentsResponse>(`/documents${suffix}`)
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
    return apiRequest<DocumentResult>(`/documents/${encodeURIComponent(documentId)}`)
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
      fileName: request.originalFileName,
      contentType: request.mimeType,
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
  const s3RawPath = `s3://docuflow-dev-raw/raw/${userId}/${documentId}/original.${extension}`

  return {
    documentId,
    uploadUrl: "https://s3-presigned-url.example.com/docuflow-demo",
    s3RawPath,
    expiresIn: 300,
  }
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
      { method: "POST", body: JSON.stringify(request) }
    )
  }

  await wait()
  const session = await getCurrentDocuFlowSession()
  if (!session) {
    throw new Error("An authenticated finance or administrator session is required")
  }
  return {
    documentId,
    status: request.action === "APPROVE" ? "APPROVED" : "CORRECTED",
    correctedFields: request.correctedFields ?? null,
    reviewedAt: new Date().toISOString(),
    reviewedBy: session.userId,
  }
}

export async function listTestCases() {
  await wait()
  return testCases
}
