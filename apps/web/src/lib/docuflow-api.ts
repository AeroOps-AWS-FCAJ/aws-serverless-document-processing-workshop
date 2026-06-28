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
import { getDocuFlowSession } from "@/lib/auth"

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

  const token = getDocuFlowSession()?.accessToken
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

  return response.json() as Promise<T>
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
  const session = getDocuFlowSession()
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
  const session = getDocuFlowSession()
  const document = documents.find((item) => item.documentId === documentId) ?? null
  if (session?.role === "finance" && document?.userId !== session.userId) return null
  return document
}

export async function requestUploadUrl(
  request: UploadUrlRequest
): Promise<UploadUrlResponse> {
  if (apiBaseUrl) {
    return apiRequest<UploadUrlResponse>("/documents/upload-url", {
      method: "POST",
      body: JSON.stringify(request),
    })
  }

  await wait()
  const documentId = `doc-${Math.floor(100 + Math.random() * 900)}`
  const userId = getDocuFlowSession()?.userId ?? "user-123"
  const extension = request.fileName.split(".").pop() || "pdf"
  const s3RawPath = `s3://docuflow-dev-raw/raw/${userId}/${documentId}/original.${extension}`

  return {
    documentId,
    uploadUrl: "https://s3-presigned-url.example.com/docuflow-demo",
    s3RawPath,
    expiresIn: 300,
  }
}

export async function uploadDocumentFile(uploadUrl: string, file: File) {
  if (!apiBaseUrl) {
    await wait(350)
    return
  }

  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  })

  if (!response.ok) throw new Error("S3 upload failed")
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
  const session = getDocuFlowSession()
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
