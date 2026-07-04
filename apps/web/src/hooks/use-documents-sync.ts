import { useCallback, useEffect, useState } from "react"
import { useLanguage } from "@/lib/i18n"
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
  const { t } = useLanguage()
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState("")
  const [syncError, setSyncError] = useState<string | null>(null)
  const [nextToken, setNextToken] = useState<string | null>(null)

  const refreshDocuments = useCallback(
    async (token?: string) => {
      if (!apiMode) {
        setSyncMessage(t("sync.demoUpToDate"))
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
        setSyncMessage(t("sync.success", { total }))
        return { count: total, nextToken: lastNextToken }
      } catch (error) {
        const message = error instanceof Error ? error.message : t("sync.failed")
        setSyncError(message)
        setSyncMessage(t("sync.refreshFailed"))
        return { count: 0, nextToken: null }
      } finally {
        setIsSyncing(false)
      }
    },
    [apiMode, loadAllPages, mergeDocuments, t]
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
