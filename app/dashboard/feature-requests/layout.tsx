"use client"

import { ReactNode, useState, useRef, useEffect } from "react"
import { useAuth } from "@/components/auth-wrapper"
import { useTheme } from "next-themes"
import { DynamicSidebar, DynamicSidebarRef } from "@/components/dynamic-sidebar"
import { HelpDeskButton } from "@/components/help-desk-button"
import { NotificationBell } from "@/components/notification-bell"
import { FeatureRequestButton } from "@/components/feature-request-button"
import { Menu, Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FeatureRequestsLayoutProps {
  children: ReactNode
}

export default function FeatureRequestsLayout({ children }: FeatureRequestsLayoutProps) {
  const sidebarRef = useRef<DynamicSidebarRef>(null)
  const { user, isLoading } = useAuth()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleMobileMenuToggle = () => {
    sidebarRef.current?.toggleMobileMenu()
  }

  // Check if user has a sidebar layout
  const isRegionalOfficer = user?.role === "Regional Officer"
  const isHeadTeacher = user?.role === "Head Teacher"
  const hasSidebarLayout = isRegionalOfficer || isHeadTeacher

  // Show loading state for users with sidebar
  if (isLoading && hasSidebarLayout) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-[hsl(222,47%,6%)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  // For users without sidebar layout, just render children
  if (!hasSidebarLayout) {
    return <>{children}</>
  }

  // Layout with sidebar for Regional Officers and Head Teachers
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[hsl(222,47%,6%)]">
      {/* Background - Subtle, non-distracting */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-indigo-50/30 dark:from-blue-950/20 dark:via-transparent dark:to-indigo-950/10" />
        <div
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.015]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(99, 102, 241, 0.4) 1px, transparent 1px),
              linear-gradient(90deg, rgba(99, 102, 241, 0.4) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px'
          }}
        />

        {/* Floating bubbles */}
        <div className="absolute top-[10%] right-[20%] w-5 h-5 rounded-full bg-cyan-400/50 dark:bg-cyan-400/35 animate-float-slow" style={{ animationDelay: '0s' }} />
        <div className="absolute top-[25%] right-[10%] w-3 h-3 rounded-full bg-blue-400/55 dark:bg-blue-400/40 animate-float-slow" style={{ animationDelay: '0.5s' }} />
        <div className="absolute bottom-[20%] left-[35%] w-4 h-4 rounded-full bg-purple-400/50 dark:bg-purple-400/35 animate-float-slow" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-[30%] right-[30%] w-3 h-3 rounded-full bg-cyan-300/55 dark:bg-cyan-300/40 animate-float-slow" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-[45%] right-[40%] w-4 h-4 rounded-full bg-indigo-400/50 dark:bg-indigo-400/35 animate-float-slow" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[65%] right-[15%] w-3 h-3 rounded-full bg-blue-300/55 dark:bg-blue-300/40 animate-float-slow" style={{ animationDelay: '2.5s' }} />
        <div className="absolute top-[15%] left-[40%] w-3 h-3 rounded-full bg-purple-300/55 dark:bg-purple-300/40 animate-float-slow" style={{ animationDelay: '3s' }} />
        <div className="absolute bottom-[40%] left-[45%] w-4 h-4 rounded-full bg-cyan-400/45 dark:bg-cyan-400/30 animate-float-slow" style={{ animationDelay: '3.5s' }} />
      </div>

      {/* Sidebar */}
      <aside className="fixed top-0 bottom-0 left-0 z-40">
        <DynamicSidebar ref={sidebarRef} />
      </aside>

      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={handleMobileMenuToggle}
          className="h-10 w-10 p-0 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-lg"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Main Content Area */}
      <main className="lg:ml-[240px] 2xl:ml-[280px] min-h-screen relative">
        <div className="p-4 lg:p-6 max-w-7xl mx-auto">
          {/* Action Icons - Top right */}
          <div className="flex justify-end mb-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="h-9 w-9 p-0 rounded-full bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                title={mounted ? (theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode') : 'Toggle theme'}
              >
                {mounted ? (
                  theme === 'dark' ? (
                    <Sun className="h-4 w-4 text-amber-500" />
                  ) : (
                    <Moon className="h-4 w-4 text-slate-600" />
                  )
                ) : (
                  <div className="h-4 w-4" />
                )}
              </Button>
              <NotificationBell />
              <FeatureRequestButton />
            </div>
          </div>

          {/* Page Content */}
          {children}
        </div>
      </main>

      {/* Help Desk Button */}
      <HelpDeskButton userRole={isRegionalOfficer ? "Regional Officer" : "Head Teacher"} />
    </div>
  )
}
