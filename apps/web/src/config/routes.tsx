import { lazy } from 'react'
import {
  GuestOnly,
  RequireAuth,
  RequireRole,
  RoleHomeRedirect,
} from '@/components/auth/require-auth'

const Dashboard = lazy(() => import('@/app/dashboard/page'))
const Upload = lazy(() => import('@/app/upload/page'))
const Documents = lazy(() => import('@/app/documents/page'))
const DocumentDetail = lazy(() => import('@/app/documents/[documentId]/page'))
const Review = lazy(() => import('@/app/review/page'))
const Operations = lazy(() => import('@/app/operations/page'))
const Evidence = lazy(() => import('@/app/evidence/page'))

const SignIn = lazy(() => import('@/app/auth/sign-in/page'))
const SignUp = lazy(() => import('@/app/auth/sign-up/page'))
const ForgotPassword = lazy(() => import('@/app/auth/forgot-password/page'))

const Unauthorized = lazy(() => import('@/app/errors/unauthorized/page'))
const Forbidden = lazy(() => import('@/app/errors/forbidden/page'))
const NotFound = lazy(() => import('@/app/errors/not-found/page'))
const InternalServerError = lazy(() => import('@/app/errors/internal-server-error/page'))
const UnderMaintenance = lazy(() => import('@/app/errors/under-maintenance/page'))

const NotificationSettings = lazy(() => import('@/app/settings/notifications/page'))

export interface RouteConfig {
  path: string
  element: React.ReactNode
  children?: RouteConfig[]
}

export const routes: RouteConfig[] = [
  {
    path: "/",
    element: <RoleHomeRedirect />
  },
  {
    path: "/dashboard",
    element: <RequireAuth><Dashboard /></RequireAuth>
  },
  {
    path: "/upload",
    element: <RequireAuth><Upload /></RequireAuth>
  },
  {
    path: "/documents",
    element: <RequireAuth><Documents /></RequireAuth>
  },
  {
    path: "/documents/:documentId",
    element: <RequireAuth><DocumentDetail /></RequireAuth>
  },
  {
    path: "/review",
    element: <RequireRole allowed={["finance", "admin"]}><Review /></RequireRole>
  },
  {
    path: "/operations",
    element: <RequireRole allowed={["admin"]}><Operations /></RequireRole>
  },
  {
    path: "/evidence",
    element: <RequireRole allowed={["admin"]}><Evidence /></RequireRole>
  },
  {
    path: "/auth/sign-in",
    element: <GuestOnly><SignIn /></GuestOnly>
  },
  {
    path: "/auth/sign-up",
    element: <GuestOnly><SignUp /></GuestOnly>
  },
  {
    path: "/auth/forgot-password",
    element: <GuestOnly><ForgotPassword /></GuestOnly>
  },
  {
    path: "/errors/unauthorized",
    element: <Unauthorized />
  },
  {
    path: "/errors/forbidden",
    element: <Forbidden />
  },
  {
    path: "/errors/not-found",
    element: <NotFound />
  },
  {
    path: "/errors/internal-server-error",
    element: <InternalServerError />
  },
  {
    path: "/errors/under-maintenance",
    element: <UnderMaintenance />
  },
  {
    path: "/settings/notifications",
    element: <RequireRole allowed={["admin"]}><NotificationSettings /></RequireRole>
  },
  {
    path: "*",
    element: <NotFound />
  }
]
