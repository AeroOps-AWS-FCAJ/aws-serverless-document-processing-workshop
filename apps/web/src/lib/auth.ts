const AUTH_STORAGE_KEY = "docuflow.authenticated"

export type DocuFlowRole = "finance" | "admin"

export interface DocuFlowSession {
  authenticated: true
  role: DocuFlowRole
  userId: string
  name: string
  email: string
  accessToken?: string
}

type StoredSession = Omit<Partial<DocuFlowSession>, "role"> & {
  role?: DocuFlowRole | "reviewer"
}

const defaultFinanceSession: DocuFlowSession = {
  authenticated: true,
  role: "finance",
  userId: "user-123",
  name: "Finance User",
  email: "finance@docuflow.ai",
}

export const roleLabels: Record<DocuFlowRole, string> = {
  finance: "Finance",
  admin: "System administrator",
}

export const roleHomePaths: Record<DocuFlowRole, string> = {
  finance: "/dashboard",
  admin: "/operations",
}

export function getDocuFlowSession(): DocuFlowSession | null {
  if (typeof window === "undefined") return null

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY)
  if (!raw) return null

  // Keep older demo sessions usable after introducing role-aware navigation.
  if (raw === "true") return defaultFinanceSession

  try {
    const parsed = JSON.parse(raw) as StoredSession
    // Migrate the retired reviewer demo role into the unified finance workspace.
    if (parsed.authenticated === true && parsed.role === "reviewer") {
      setDocuFlowSession({
        role: "finance",
        userId: "user-123",
        name: "Finance User",
        email: "finance@docuflow.ai",
      })
      return defaultFinanceSession
    }

    if (
      parsed.authenticated === true &&
      parsed.userId &&
      parsed.name &&
      parsed.email &&
      ["finance", "admin"].includes(parsed.role ?? "")
    ) {
      return parsed as DocuFlowSession
    }
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
  }

  return null
}

export function isDocuFlowAuthenticated() {
  return getDocuFlowSession() !== null
}

export function setDocuFlowSession(session: Omit<DocuFlowSession, "authenticated">) {
  window.localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({ ...session, authenticated: true } satisfies DocuFlowSession)
  )
}

export function clearDocuFlowSession() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY)
}
