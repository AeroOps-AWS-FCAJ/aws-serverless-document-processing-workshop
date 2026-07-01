"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { useSidebarConfig } from "@/hooks/use-sidebar-config"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

interface BaseLayoutProps {
  children: React.ReactNode
  title?: string
  description?: string
}

export function BaseLayout({ children, title }: BaseLayoutProps) {
  const { config } = useSidebarConfig()

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "16rem",
          "--sidebar-width-icon": "3rem", 
          "--header-height": "calc(var(--spacing) * 14)",
        } as React.CSSProperties
      }
      className={config.collapsible === "none" ? "sidebar-none-mode" : ""}
    >
      {config.side === "left" ? (
        <>
          <AppSidebar 
            variant={config.variant} 
            collapsible={config.collapsible} 
            side={config.side} 
          />
          <SidebarInset className="min-w-0 bg-background/88">
            <SiteHeader />
            <div className="paper-noise flex flex-1 flex-col overflow-hidden">
              <div className="@container/main flex flex-1 flex-col gap-2 min-w-0">
                <main className="reveal-in mx-auto flex w-full max-w-[1500px] min-w-0 flex-col gap-5 py-5 md:gap-7 md:py-7">
                  {title && (
                    <div className="px-4 lg:px-6">
                      <div className="flex max-w-3xl flex-col gap-1.5 border-l-[3px] border-primary pl-4">
                        <h1 className="font-display text-2xl font-semibold leading-tight tracking-[-0.04em] md:text-3xl">{title}</h1>
                      </div>
                    </div>
                  )}
                  {children}
                </main>
              </div>
            </div>
            <SiteFooter />
          </SidebarInset>
        </>
      ) : (
        <>
          <SidebarInset className="min-w-0 bg-background/88">
            <SiteHeader />
            <div className="paper-noise flex flex-1 flex-col overflow-hidden">
              <div className="@container/main flex flex-1 flex-col gap-2 min-w-0">
                <main className="reveal-in mx-auto flex w-full max-w-[1500px] min-w-0 flex-col gap-5 py-5 md:gap-7 md:py-7">
                  {title && (
                    <div className="px-4 lg:px-6">
                      <div className="flex max-w-3xl flex-col gap-1.5 border-l-[3px] border-primary pl-4">
                        <h1 className="font-display text-2xl font-semibold leading-tight tracking-[-0.04em] md:text-3xl">{title}</h1>
                      </div>
                    </div>
                  )}
                  {children}
                </main>
              </div>
            </div>
            <SiteFooter />
          </SidebarInset>
          <AppSidebar 
            variant={config.variant} 
            collapsible={config.collapsible} 
            side={config.side} 
          />
        </>
      )}
    </SidebarProvider>
  )
}
