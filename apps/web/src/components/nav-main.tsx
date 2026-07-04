"use client"

import { ChevronRight, type LucideIcon } from "lucide-react"
import { Link, useLocation } from "react-router-dom"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

export function NavMain({
  label,
  items,
}: {
  label: string
  items: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    items?: {
      title: string
      url: string
      isActive?: boolean
    }[]
  }[]
}) {
  const location = useLocation()

  const shouldBeOpen = (item: (typeof items)[0]) => {
    if (item.isActive) return true
    return item.items?.some((sub) => location.pathname === sub.url) ?? false
  }

  return (
    <SidebarGroup className="py-1.5">
      {/* Group label */}
      <SidebarGroupLabel className="mb-1 px-2 font-mono text-[8.5px] uppercase tracking-[0.18em] text-sidebar-foreground/35">
        {label}
      </SidebarGroupLabel>

      <SidebarMenu className="gap-0.5">
        {items.map((item) => {
          const isActive = location.pathname === item.url
          return (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={shouldBeOpen(item)}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                {item.items?.length ? (
                  /* ── Has sub-items → collapsible trigger ─────────────── */
                  <>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        tooltip={item.title}
                        className="h-9 cursor-pointer rounded-md px-2.5 text-sidebar-foreground/65 transition-colors duration-150 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                      >
                        {item.icon && (
                          <item.icon className="size-4 shrink-0 opacity-80" />
                        )}
                        <span className="text-[13px] font-medium">{item.title}</span>
                        <ChevronRight className="ml-auto size-3.5 text-sidebar-foreground/30 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub className="ml-4 gap-0.5 border-l border-sidebar-border/50 pl-3">
                        {item.items?.map((sub) => {
                          const subActive = location.pathname === sub.url
                          return (
                            <SidebarMenuSubItem key={sub.title}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={subActive}
                                className={[
                                  "h-8 cursor-pointer rounded-md px-2 text-[12.5px] transition-colors duration-150",
                                  subActive
                                    ? "bg-sidebar-primary/12 font-semibold text-sidebar-primary"
                                    : "text-sidebar-foreground/55 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground",
                                ].join(" ")}
                              >
                                <Link to={sub.url}>
                                  <span>{sub.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          )
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </>
                ) : (
                  /* ── No sub-items → direct link ──────────────────────── */
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={isActive}
                    className={[
                      "relative h-9 cursor-pointer rounded-md px-2.5 text-[13px] font-medium transition-colors duration-150",
                      "before:absolute before:left-0 before:top-1/2 before:h-[60%] before:w-[3px] before:-translate-y-1/2 before:rounded-r-full before:transition-all before:duration-200",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-foreground before:bg-sidebar-primary before:opacity-100"
                        : "text-sidebar-foreground/65 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground before:opacity-0",
                    ].join(" ")}
                  >
                    <Link to={item.url} className="flex items-center gap-2.5">
                      {item.icon && (
                        <item.icon
                          className={[
                            "size-4 shrink-0 transition-colors",
                            isActive
                              ? "text-sidebar-primary"
                              : "text-sidebar-foreground/50",
                          ].join(" ")}
                        />
                      )}
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
