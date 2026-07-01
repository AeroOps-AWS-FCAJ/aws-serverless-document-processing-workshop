"use client"

import * as React from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { CommandSearch, SearchTrigger } from "@/components/command-search"
import { ModeToggle } from "@/components/mode-toggle"
import { useAuth } from "@/contexts/auth-context"

export function SiteHeader() {
  const [searchOpen, setSearchOpen] = React.useState(false)
  const { session } = useAuth()
  const role = session?.role ?? "finance"
  const shortcuts =
    role === "admin"
      ? [
          { label: "Operations", url: "/operations" },
          { label: "Evidence", url: "/evidence" },
        ]
      : [
          { label: "Upload", url: "/upload" },
          { label: "Review queue", url: "/review" },
        ]

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setSearchOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  return (
    <>
      <header className="sticky top-0 z-30 flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-background/60 backdrop-blur-2xl transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height) shadow-sm dark:bg-black/40">
        <div className="flex w-full items-center px-4 py-3 lg:px-6 relative">
          <div className="flex items-center gap-1 lg:gap-2">
            <SidebarTrigger className="-ml-1 hover-lift" />
            <Separator
              orientation="vertical"
              className="mx-2 data-[orientation=vertical]:h-4"
            />
          </div>
          
          <div className="flex-1 flex justify-center px-2">
            <div className="w-full max-w-[150px] sm:max-w-xs lg:max-w-sm transition-all duration-300">
              <SearchTrigger onClick={() => setSearchOpen(true)} />
            </div>
          </div>
          
          <div className="ml-auto flex items-center gap-2">
            {shortcuts.map((shortcut) => (
              <Button key={shortcut.url} variant="ghost" asChild size="sm" className="hidden sm:flex transition-colors hover:bg-muted/80">
                <Link to={shortcut.url} className="dark:text-foreground">{shortcut.label}</Link>
              </Button>
            ))}
            <div className="hover-lift">
              <ModeToggle />
            </div>
          </div>
        </div>
      </header>
      <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  )
}
