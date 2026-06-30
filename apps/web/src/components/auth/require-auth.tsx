"use client"

import { Navigate, useLocation } from "react-router-dom"
import { roleHomePaths, type DocuFlowRole } from "@/lib/auth"
import { useAuth } from "@/contexts/auth-context"

interface RequireAuthProps {
  children: React.ReactNode
}

export function RequireAuth({ children }: RequireAuthProps) {
  const location = useLocation()
  const { session, isLoading } = useAuth()

  if (isLoading) return null // Handled by AuthProvider loading state, or could render specific loader

  if (!session?.authenticated) {
    return <Navigate to="/auth/sign-in" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}

interface RequireRoleProps extends RequireAuthProps {
  allowed: DocuFlowRole[]
}

export function RequireRole({ children, allowed }: RequireRoleProps) {
  const location = useLocation()
  const { session, isLoading } = useAuth()

  if (isLoading) return null

  if (!session?.authenticated) {
    return <Navigate to="/auth/sign-in" replace state={{ from: location.pathname }} />
  }

  if (!allowed.includes(session.role)) {
    return <Navigate to="/errors/forbidden" replace />
  }

  return <>{children}</>
}

export function GuestOnly({ children }: RequireAuthProps) {
  const { session, isLoading } = useAuth()

  if (isLoading) return null

  if (session?.authenticated) {
    return <Navigate to={roleHomePaths[session.role]} replace />
  }

  return <>{children}</>
}

export function RoleHomeRedirect() {
  const { session, isLoading } = useAuth()

  if (isLoading) return null

  if (!session?.authenticated) return <Navigate to="/auth/sign-in" replace />

  return <Navigate to={roleHomePaths[session.role]} replace />
}
