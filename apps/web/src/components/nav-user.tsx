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
  History,
  Route,
  ShieldCheck,
  UserRound,
} from "lucide-react"
import { Link, useNavigate } from "react-router-dom"

import { Logo } from "@/components/logo"
import {
  clearDocuFlowSession,
  roleLabels,
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

  const handleLogout = () => {
    clearDocuFlowSession()
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
                  {roleLabels[role]}
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
                    {roleLabels[role]}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link to="/documents">
                  <FileSearch />
                  Documents
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link to="/review">
                  <BellDot />
                  Review queue
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link to="/reports">
                  <BadgeDollarSign />
                  Reports
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link to="/notifications">
                  <BellDot />
                  Notifications
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link to="/activity">
                  <History />
                  My activity
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link to="/profile">
                  <UserRound />
                  Profile
                </Link>
              </DropdownMenuItem>
              {role === "admin" && (
                <>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/operations">
                      <Activity />
                      Operations
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/admin/ingestion">
                      <Route />
                      Ingestion
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/admin/workflow">
                      <GitBranch />
                      Workflow
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/admin/observability">
                      <BarChart3 />
                      Observability
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/admin/governance">
                      <ShieldCheck />
                      Governance
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
              {role === "admin" && (
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link to="/settings/notifications">
                    <BellDot />
                    Alert settings
                  </Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" onClick={handleLogout}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
