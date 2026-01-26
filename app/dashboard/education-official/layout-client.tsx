"use client"

import { ReactNode, useState } from "react"
import { useTheme } from "next-themes"
import { EducationOfficialSidebar } from "@/components/education-official-sidebar"
import { NotificationBell } from "@/components/notification-bell"
import { FeatureRequestButton } from "@/components/feature-request-button"
import { Menu, Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EducationOfficialLayoutClientProps {
  children: ReactNode
}

export function EducationOfficialLayoutClient({ children }: EducationOfficialLayoutClientProps) {
  const { theme, setTheme } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(false)

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

        {/* Floating bubbles */}
        <div className="absolute top-[10%] right-[20%] w-5 h-5 rounded-full bg-emerald-400/50 dark:bg-emerald-400/35 animate-float-slow" style={{ animationDelay: '0s' }} />
        <div className="absolute top-[25%] right-[10%] w-3 h-3 rounded-full bg-blue-400/55 dark:bg-blue-400/40 animate-float-slow" style={{ animationDelay: '0.5s' }} />
        <div className="absolute bottom-[20%] left-[35%] w-4 h-4 rounded-full bg-purple-400/50 dark:bg-purple-400/35 animate-float-slow" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-[30%] right-[30%] w-3 h-3 rounded-full bg-emerald-300/55 dark:bg-emerald-300/40 animate-float-slow" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-[45%] right-[40%] w-4 h-4 rounded-full bg-indigo-400/50 dark:bg-indigo-400/35 animate-float-slow" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[65%] right-[15%] w-3 h-3 rounded-full bg-blue-300/55 dark:bg-blue-300/40 animate-float-slow" style={{ animationDelay: '2.5s' }} />
        <div className="absolute top-[15%] left-[40%] w-3 h-3 rounded-full bg-purple-300/55 dark:bg-purple-300/40 animate-float-slow" style={{ animationDelay: '3s' }} />
        <div className="absolute bottom-[40%] left-[45%] w-4 h-4 rounded-full bg-emerald-400/45 dark:bg-emerald-400/30 animate-float-slow" style={{ animationDelay: '3.5s' }} />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed top-0 bottom-0 left-0 z-40 w-[280px] bg-white/95 dark:bg-[hsl(222,47%,7%)]/95 backdrop-blur-xl border-r border-slate-200/80 dark:border-slate-700/50 transition-transform duration-300 ease-in-out flex flex-col shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50`}>
        <EducationOfficialSidebar onNavigate={() => setSidebarOpen(false)} />
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
      <main className="lg:ml-[280px] min-h-screen relative">
        {/* Page Content with Action Icons */}
        <div className="p-4 lg:p-6 max-w-7xl mx-auto">
          {/* Action Icons - Top right of content area */}
          <div className="flex justify-end mb-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="h-9 w-9 p-0 rounded-full bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4 text-amber-500" />
                ) : (
                  <Moon className="h-4 w-4 text-slate-600" />
                )}
              </Button>
              <NotificationBell />
              <FeatureRequestButton />
            </div>
          </div>

          {/* Main Content */}
          {children}
        </div>
      </main>
    </div>
  )
}
