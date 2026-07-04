"use client"

import {
  Activity,
  BadgeDollarSign,
  BarChart3,
  EllipsisVertical,
  GitBranch,
  LogOut,
  BellDot,
  FileSearch,
  Route,
  ShieldCheck,
  UserRound,
} from "lucide-react"
import { Link, useNavigate } from "react-router-dom"

import { Logo } from "@/components/logo"
import {
  clearDocuFlowSession,
  type DocuFlowRole,
} from "@/lib/auth"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { LanguageToggle } from "@/components/language-toggle"
import { useLanguage } from "@/lib/i18n"

export function NavUser({
  user,
  role,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
  role: DocuFlowRole
}) {
  const { isMobile } = useSidebar()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const roleLabel = role === "admin" ? t("role.admin") : t("role.finance")

  const handleLogout = async () => {
    await clearDocuFlowSession()
    navigate("/auth/sign-in", { replace: true })
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg">
                < Logo size={28} />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {roleLabel}
                </span>
              </div>
              <EllipsisVertical className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <div className="h-8 w-8 rounded-lg">
                  < Logo size={28} />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="text-muted-foreground truncate text-xs">
                    {user.email}
                  </span>
                  <span className="text-muted-foreground truncate text-xs">
                    {roleLabel}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {role === "finance" && (
                <>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/documents">
                      <FileSearch />
                      {t("nav.documents")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/review">
                      <BellDot />
                      {t("nav.review")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/reports">
                      <BadgeDollarSign />
                      {t("nav.reports")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/settings">
                      <UserRound />
                      {t("nav.settings")}
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
              {role === "admin" && (
                <>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/operations">
                      <Activity />
                      {t("nav.operations")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/admin/ingestion">
                      <Route />
                      {t("nav.ingestion")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/admin/workflow">
                      <GitBranch />
                      {t("nav.workflow")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/admin/observability">
                      <BarChart3 />
                      {t("nav.observability")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/admin/governance">
                      <ShieldCheck />
                      {t("nav.governance")}
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
              {role === "admin" && (
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link to="/settings/notifications">
                    <BellDot />
                    {t("nav.notifications")}
                  </Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5">
              <LanguageToggle className="w-full justify-center" />
            </div>
            <DropdownMenuSeparator />
            {role === "admin" && (
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link to="/settings">
                  <UserRound />
                  {t("nav.settings")}
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="cursor-pointer" onClick={handleLogout}>
              <LogOut />
              {t("common.signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
