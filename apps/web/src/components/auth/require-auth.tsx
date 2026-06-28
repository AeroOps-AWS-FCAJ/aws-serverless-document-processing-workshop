"use client"

import { Navigate, useLocation } from "react-router-dom"
import {
  getDocuFlowSession,
  isDocuFlowAuthenticated,
  roleHomePaths,
  type DocuFlowRole,
} from "@/lib/auth"

interface RequireAuthProps {
  children: React.ReactNode
}

export function RequireAuth({ children }: RequireAuthProps) {
  const location = useLocation()

  if (!isDocuFlowAuthenticated()) {
    return <Navigate to="/auth/sign-in" replace state={{ from: location.pathname }} />
  }

  return children
}

interface RequireRoleProps extends RequireAuthProps {
  allowed: DocuFlowRole[]
}

export function RequireRole({ children, allowed }: RequireRoleProps) {
  const location = useLocation()
  const session = getDocuFlowSession()

  if (!session) {
    return <Navigate to="/auth/sign-in" replace state={{ from: location.pathname }} />
  }

  if (!allowed.includes(session.role)) {
    return <Navigate to="/errors/forbidden" replace />
  }

  return children
}

export function GuestOnly({ children }: RequireAuthProps) {
  const session = getDocuFlowSession()

  if (session && isDocuFlowAuthenticated()) {
    return <Navigate to={roleHomePaths[session.role]} replace />
  }

  return children
}

export function RoleHomeRedirect() {
  const session = getDocuFlowSession()

  if (!session) return <Navigate to="/auth/sign-in" replace />

  return <Navigate to={roleHomePaths[session.role]} replace />
}
