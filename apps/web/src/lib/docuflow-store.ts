import { useCallback, useEffect, useState } from "react"
import {
  documents as seedDocuments,
  type DocumentRecord,
  type DocumentStatus,
} from "@/lib/docuflow-data"
import type { UploadUrlRequest, UploadUrlResponse } from "@/lib/docuflow-api"


import { isApiConfigured } from "@/lib/docuflow-api"

const STORAGE_KEY = "docuflow.documents"
const DOCUMENTS_UPDATED_EVENT = "docuflow-documents-updated"

const seedIds = new Set(["doc-001", "doc-002", "doc-003", "doc-004", "doc-005", "doc-006", "doc-007"])

function cloneSeedDocuments() {
  if (isApiConfigured()) {
    return []
  }
  return seedDocuments.map((document) => ({ ...document }))
}

function sanitizeDocument(doc: any): DocumentRecord {
  return {
    ...doc,
    reviewReasonCodes: Array.isArray(doc.reviewReasonCodes) ? doc.reviewReasonCodes : [],
    lineItems: Array.isArray(doc.lineItems) ? doc.lineItems : [],
  }
}

export function readDocuFlowDocuments(): DocumentRecord[] {
  const isApi = isApiConfigured()
  if (typeof window === "undefined") return isApi ? [] : cloneSeedDocuments()

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return isApi ? [] : cloneSeedDocuments()

  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      const sanitized = parsed.map(sanitizeDocument)
      if (isApi) {
        return sanitized.filter((doc) => !seedIds.has(doc.documentId))
      }
      return sanitized
    }
  } catch {
    window.localStorage.removeItem(STORAGE_KEY)
  }

  return isApi ? [] : cloneSeedDocuments()
}

function writeDocuFlowDocuments(nextDocuments: DocumentRecord[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextDocuments))
  window.dispatchEvent(new Event(DOCUMENTS_UPDATED_EVENT))
}

export function useDocuFlowDocuments() {
  const [items, setItems] = useState<DocumentRecord[]>(() => readDocuFlowDocuments())

  useEffect(() => {
    const refresh = () => setItems(readDocuFlowDocuments())

    window.addEventListener(DOCUMENTS_UPDATED_EVENT, refresh)
    window.addEventListener("storage", refresh)

    return () => {
      window.removeEventListener(DOCUMENTS_UPDATED_EVENT, refresh)
      window.removeEventListener("storage", refresh)
    }
  }, [])

  const replaceDocuments = useCallback((updater: (current: DocumentRecord[]) => DocumentRecord[]) => {
    const nextDocuments = updater(readDocuFlowDocuments())
    writeDocuFlowDocuments(nextDocuments)
    setItems(nextDocuments)
    return nextDocuments
  }, [])

  const updateDocument = useCallback(
    (documentId: string, patch: Partial<DocumentRecord>) => {
      let updated: DocumentRecord | null = null
      replaceDocuments((current) =>
        current.map((document) => {
          if (document.documentId !== documentId) return document

          updated = {
            ...document,
            ...patch,
            updatedAt: patch.updatedAt ?? new Date().toISOString(),
          }
          return updated
        })
      )
      return updated
    },
    [replaceDocuments]
  )

  const upsertDocument = useCallback(
    (nextDocument: DocumentRecord) => {
      replaceDocuments((current) => {
        const exists = current.some((document) => document.documentId === nextDocument.documentId)
        if (exists) {
          return current.map((document) =>
            document.documentId === nextDocument.documentId ? nextDocument : document
          )
        }
        return [nextDocument, ...current]
      })
    },
    [replaceDocuments]
  )

  const mergeDocuments = useCallback(
    (incoming: DocumentRecord[]) => {
      replaceDocuments((current) => {
        const incomingById = new Map(incoming.map((document) => [document.documentId, document]))
        const retained = current.filter((document) => !incomingById.has(document.documentId))
        return [...incoming, ...retained]
      })
    },
    [replaceDocuments]
  )

  const resetDocuments = useCallback(() => {
    const nextDocuments = cloneSeedDocuments()
    writeDocuFlowDocuments(nextDocuments)
    setItems(nextDocuments)
  }, [])

  return {
    documents: items,
    mergeDocuments,
    resetDocuments,
    updateDocument,
    upsertDocument,
  }
}

export function createQueuedDocument(
  request: UploadUrlRequest,
  response: UploadUrlResponse,
  userId: string = "user-123"
): DocumentRecord {
  const now = new Date().toISOString()
  const extension = request.originalFileName.split(".").pop()?.toLowerCase()
  const documentType = request.originalFileName.toLowerCase().includes("receipt") ? "RECEIPT" : "INVOICE"

  return {
    documentId: response.documentId,
    originalFileName: request.originalFileName,
    documentType,
    status: "UPLOADED",
    reviewStatus: "PENDING",
    vendorName: "Pending extraction",
    invoiceDate: now.slice(0, 10),
    currency: "VND",
    totalAmount: 0,
    taxAmount: null,
    confidenceScore: 0,
    aiProvider: "not-called",
    normalizationMethod: "TEXTRACT_ONLY",
    createdAt: now,
    updatedAt: now,
    userId,
    rawS3Key: response.rawS3Key,
    processedS3Key: `processed/${userId}/${response.documentId}/result.json`,
    reviewReasonCodes: ["vendorName pending", "totalAmount pending", "taxAmount pending"],
    lineItems: [],
    errorMessage:
      extension === "pdf"
        ? "Uploaded successfully and waiting for background processing."
        : "Uploaded image is waiting for field extraction.",
    reviewedAt: null,
    reviewedBy: null,
    reviewerNote: null,
  }
}

export function nextUploadStatus(status: DocumentStatus): DocumentStatus {
  if (status === "UPLOADED") return "QUEUED"
  if (status === "QUEUED") return "PROCESSING"
  return status
}
