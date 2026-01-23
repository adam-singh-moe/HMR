"use client"

import { ReactNode, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-wrapper"
import { RegionalOfficerSidebar } from "@/components/regional-officer-sidebar"
import { HelpDeskButton } from "@/components/help-desk-button"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface RegionalOfficerLayoutProps {
  children: ReactNode
}

export default function RegionalOfficerLayout({ children }: RegionalOfficerLayoutProps) {
  const { user, isLoading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-[hsl(222,47%,6%)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[hsl(222,47%,6%)]">
      {/* Background - Subtle, non-distracting */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-indigo-50/30 dark:from-blue-950/20 dark:via-transparent dark:to-indigo-950/10" />

        {/* Subtle grid pattern - less prominent */}
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
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
        fixed top-0 bottom-0 left-0 z-50
        w-[300px]
        bg-white/95 dark:bg-[hsl(222,47%,7%)]/95
        backdrop-blur-xl
        border-r border-slate-200/80 dark:border-slate-700/50
        transition-transform duration-300 ease-in-out
        flex flex-col
        shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50
      `}>
        {/* Close button for mobile */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden absolute top-4 right-4 h-8 w-8 p-0 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 z-10"
        >
          <X className="h-4 w-4" />
        </Button>

        <RegionalOfficerSidebar onNavigate={() => setSidebarOpen(false)} />
      </aside>

      {/* Mobile Menu Button - Fixed in top-left */}
      <div className="lg:hidden fixed top-4 left-4 z-40">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSidebarOpen(true)}
          className="h-10 w-10 p-0 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-lg"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Main Content Area */}
      <main className="lg:ml-[300px] min-h-screen relative">
        {children}
      </main>

      {/* Help Desk Button */}
      <HelpDeskButton userRole="Regional Officer" />
    </div>
  )
}
