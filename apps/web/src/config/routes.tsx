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
const Reports = lazy(() => import('@/app/reports/page'))
const Notifications = lazy(() => import('@/app/notifications/page'))
const Activity = lazy(() => import('@/app/activity/page'))
const Profile = lazy(() => import('@/app/profile/page'))
const Operations = lazy(() => import('@/app/operations/page'))
const Evidence = lazy(() => import('@/app/evidence/page'))
const AdminIngestion = lazy(() => import('@/app/admin/ingestion/page'))
const AdminWorkflow = lazy(() => import('@/app/admin/workflow/page'))
const AdminObservability = lazy(() => import('@/app/admin/observability/page'))
const AdminGovernance = lazy(() => import('@/app/admin/governance/page'))

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
    path: "/reports",
    element: <RequireAuth><Reports /></RequireAuth>
  },
  {
    path: "/notifications",
    element: <RequireAuth><Notifications /></RequireAuth>
  },
  {
    path: "/activity",
    element: <RequireAuth><Activity /></RequireAuth>
  },
  {
    path: "/profile",
    element: <RequireAuth><Profile /></RequireAuth>
  },
  {
    path: "/operations",
    element: <RequireRole allowed={["admin"]}><Operations /></RequireRole>
  },
  {
    path: "/admin/ingestion",
    element: <RequireRole allowed={["admin"]}><AdminIngestion /></RequireRole>
  },
  {
    path: "/admin/workflow",
    element: <RequireRole allowed={["admin"]}><AdminWorkflow /></RequireRole>
  },
  {
    path: "/admin/observability",
    element: <RequireRole allowed={["admin"]}><AdminObservability /></RequireRole>
  },
  {
    path: "/admin/governance",
    element: <RequireRole allowed={["admin"]}><AdminGovernance /></RequireRole>
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
