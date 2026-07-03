import { useCallback, useEffect, useState } from "react"
import { isApiConfigured, listDocuments } from "@/lib/docuflow-api"
import type { DocumentRecord } from "@/lib/docuflow-data"

interface UseDocumentsSyncOptions {
  auto?: boolean
  loadAllPages?: boolean
}

type MergeDocuments = (incoming: DocumentRecord[]) => void

export function useDocumentsSync(
  mergeDocuments: MergeDocuments,
  options: UseDocumentsSyncOptions = {}
) {
  const { auto = true, loadAllPages = false } = options
  const apiMode = isApiConfigured()
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState("")
  const [syncError, setSyncError] = useState<string | null>(null)
  const [nextToken, setNextToken] = useState<string | null>(null)

  const refreshDocuments = useCallback(
    async (token?: string) => {
      if (!apiMode) {
        setSyncMessage("Dữ liệu demo cục bộ đã là phiên bản mới nhất.")
        setSyncError(null)
        setNextToken(null)
        return { count: 0, nextToken: null }
      }

      setIsSyncing(true)
      setSyncError(null)
      setSyncMessage("")

      try {
        let cursor = token
        let total = 0
        let lastNextToken: string | null = null

        do {
          const response = await listDocuments(cursor ? { nextToken: cursor } : {})
          mergeDocuments(response.items)
          total += response.items.length
          lastNextToken = response.nextToken
          cursor = loadAllPages ? response.nextToken ?? undefined : undefined
        } while (loadAllPages && cursor)

        setNextToken(lastNextToken)
        setSyncMessage(`Đã đồng bộ ${total} tài liệu từ API.`)
        return { count: total, nextToken: lastNextToken }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Không thể đồng bộ tài liệu."
        setSyncError(message)
        setSyncMessage("Không thể làm mới. Vui lòng thử lại.")
        return { count: 0, nextToken: null }
      } finally {
        setIsSyncing(false)
      }
    },
    [apiMode, loadAllPages, mergeDocuments]
  )

  useEffect(() => {
    if (!auto || !apiMode) return
    void refreshDocuments()
  }, [apiMode, auto, refreshDocuments])

  return {
    apiMode,
    isSyncing,
    nextToken,
    refreshDocuments,
    syncError,
    syncMessage,
  }
}
