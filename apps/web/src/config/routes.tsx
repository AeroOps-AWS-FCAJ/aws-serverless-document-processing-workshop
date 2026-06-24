import { lazy } from 'react'
import { Navigate } from 'react-router-dom'

const Dashboard = lazy(() => import('@/app/dashboard/page'))
const Upload = lazy(() => import('@/app/upload/page'))
const Documents = lazy(() => import('@/app/documents/page'))
const DocumentDetail = lazy(() => import('@/app/documents/[documentId]/page'))
const Review = lazy(() => import('@/app/review/page'))
const Operations = lazy(() => import('@/app/operations/page'))

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
    element: <Navigate to="dashboard" replace />
  },
  {
    path: "/dashboard",
    element: <Dashboard />
  },
  {
    path: "/upload",
    element: <Upload />
  },
  {
    path: "/documents",
    element: <Documents />
  },
  {
    path: "/documents/:documentId",
    element: <DocumentDetail />
  },
  {
    path: "/review",
    element: <Review />
  },
  {
    path: "/operations",
    element: <Operations />
  },
  {
    path: "/auth/sign-in",
    element: <SignIn />
  },
  {
    path: "/auth/sign-up",
    element: <SignUp />
  },
  {
    path: "/auth/forgot-password",
    element: <ForgotPassword />
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
    element: <NotificationSettings />
  },
  {
    path: "*",
    element: <NotFound />
  }
]
