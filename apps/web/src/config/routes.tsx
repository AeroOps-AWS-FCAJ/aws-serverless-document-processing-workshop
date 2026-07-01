import { lazy } from 'react'
import {
  GuestOnly,
  RequireRole,
  RoleHomeRedirect,
} from '@/components/auth/require-auth'
import { AdminLayout } from '@/components/layouts/admin-layout'

// ── Finance pages ─────────────────────────────────────────────────────────────
const Dashboard = lazy(() => import('@/app/dashboard/page'))
const Upload = lazy(() => import('@/app/upload/page'))
const Documents = lazy(() => import('@/app/documents/page'))
const DocumentDetail = lazy(() => import('@/app/documents/[documentId]/page'))
const Review = lazy(() => import('@/app/review/page'))
const Reports = lazy(() => import('@/app/reports/page'))
const Notifications = lazy(() => import('@/app/notifications/page'))
const Activity = lazy(() => import('@/app/activity/page'))
const Profile = lazy(() => import('@/app/profile/page'))

// ── Admin pages ───────────────────────────────────────────────────────────────
const Operations = lazy(() => import('@/app/operations/page'))
const Evidence = lazy(() => import('@/app/evidence/page'))
const AdminIngestion = lazy(() => import('@/app/admin/ingestion/page'))
const AdminWorkflow = lazy(() => import('@/app/admin/workflow/page'))
const AdminObservability = lazy(() => import('@/app/admin/observability/page'))
const AdminGovernance = lazy(() => import('@/app/admin/governance/page'))
const NotificationSettings = lazy(() => import('@/app/settings/notifications/page'))

// ── Auth pages ────────────────────────────────────────────────────────────────
const SignIn = lazy(() => import('@/app/auth/sign-in/page'))
const SignUp = lazy(() => import('@/app/auth/sign-up/page'))
const ForgotPassword = lazy(() => import('@/app/auth/forgot-password/page'))

// ── Error pages ───────────────────────────────────────────────────────────────
const Unauthorized = lazy(() => import('@/app/errors/unauthorized/page'))
const Forbidden = lazy(() => import('@/app/errors/forbidden/page'))
const NotFound = lazy(() => import('@/app/errors/not-found/page'))
const InternalServerError = lazy(() => import('@/app/errors/internal-server-error/page'))
const UnderMaintenance = lazy(() => import('@/app/errors/under-maintenance/page'))

export interface RouteConfig {
  path: string
  element: React.ReactNode
  children?: RouteConfig[]
}

/**
 * Helper: wrap a page in AdminLayout + RequireRole(admin)
 */
function adminRoute(path: string, Page: React.ComponentType): RouteConfig {
  return {
    path,
    element: (
      <RequireRole allowed={["admin"]}>
        <AdminLayout>
          <Page />
        </AdminLayout>
      </RequireRole>
    ),
  }
}

export const routes: RouteConfig[] = [
  // ── Root redirect ──────────────────────────────────────────────────────────
  {
    path: "/",
    element: <RoleHomeRedirect />,
  },

  // ── Finance workspace routes (BaseLayout) ──────────────────────────────────
  {
    path: "/dashboard",
    element: <RequireRole allowed={["finance"]}><Dashboard /></RequireRole>,
  },
  {
    path: "/upload",
    element: <RequireRole allowed={["finance"]}><Upload /></RequireRole>,
  },
  {
    path: "/documents",
    element: <RequireRole allowed={["finance"]}><Documents /></RequireRole>,
  },
  {
    path: "/documents/:documentId",
    element: <RequireRole allowed={["finance"]}><DocumentDetail /></RequireRole>,
  },
  {
    path: "/review",
    element: <RequireRole allowed={["finance", "admin"]}><Review /></RequireRole>,
  },
  {
    path: "/reports",
    element: <RequireRole allowed={["finance"]}><Reports /></RequireRole>,
  },
  {
    path: "/notifications",
    element: <RequireRole allowed={["finance"]}><Notifications /></RequireRole>,
  },
  {
    path: "/activity",
    element: <RequireRole allowed={["finance"]}><Activity /></RequireRole>,
  },
  {
    path: "/profile",
    element: <RequireRole allowed={["finance", "admin"]}><Profile /></RequireRole>,
  },

  // ── Admin Console routes (AdminLayout — completely separate shell) ──────────
  adminRoute("/operations", Operations as React.ComponentType),
  adminRoute("/admin/ingestion", AdminIngestion as React.ComponentType),
  adminRoute("/admin/workflow", AdminWorkflow as React.ComponentType),
  adminRoute("/admin/observability", AdminObservability as React.ComponentType),
  adminRoute("/admin/governance", AdminGovernance as React.ComponentType),
  adminRoute("/evidence", Evidence as React.ComponentType),
  adminRoute("/settings/notifications", NotificationSettings as React.ComponentType),

  // ── Auth routes (Guest only) ───────────────────────────────────────────────
  {
    path: "/auth/sign-in",
    element: <GuestOnly><SignIn /></GuestOnly>,
  },
  {
    path: "/auth/sign-up",
    element: <GuestOnly><SignUp /></GuestOnly>,
  },
  {
    path: "/auth/forgot-password",
    element: <GuestOnly><ForgotPassword /></GuestOnly>,
  },

  // ── Error pages ────────────────────────────────────────────────────────────
  { path: "/errors/unauthorized", element: <Unauthorized /> },
  { path: "/errors/forbidden", element: <Forbidden /> },
  { path: "/errors/not-found", element: <NotFound /> },
  { path: "/errors/internal-server-error", element: <InternalServerError /> },
  { path: "/errors/under-maintenance", element: <UnderMaintenance /> },

  // ── Catch all ─────────────────────────────────────────────────────────────
  {
    path: "*",
    element: <NotFound />,
  },
]
