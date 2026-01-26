"use client"

import { ReactNode, useState } from "react"
import { useAuth } from "@/components/auth-wrapper"
import { useTheme } from "next-themes"
import { HeadTeacherSidebar } from "@/components/head-teacher-sidebar"
import { EducationOfficialSidebar } from "@/components/education-official-sidebar"
import { RegionalOfficerSidebar } from "@/components/regional-officer-sidebar"
import { Menu, X, Sun, Moon, Bell, Lightbulb } from "lucide-react"
import { Button } from "@/components/ui/button"

interface NurseryAssessmentViewLayoutProps {
  children: ReactNode
}

export default function NurseryAssessmentViewLayout({ children }: NurseryAssessmentViewLayoutProps) {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Determine user role
  const isRegionalOfficer = user?.role === "Regional Officer"
  const isHeadTeacher = user?.role === "Head Teacher"
  const isEducationOfficial = user?.role === "Education Official"

  // For Head Teachers, show sidebar with icons
  if (isHeadTeacher) {
    return (
      <div className="min-h-screen flex bg-slate-50 dark:bg-[hsl(222,47%,6%)]">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Head Teacher Sidebar */}
        <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed top-0 bottom-0 left-0 z-40 w-[280px] bg-white/95 dark:bg-[hsl(222,47%,7%)]/95 backdrop-blur-xl border-r border-slate-200/80 dark:border-slate-700/50 transition-transform duration-300 ease-in-out flex flex-col shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50`}>
          <HeadTeacherSidebar onNavigate={() => setSidebarOpen(false)} />
        </aside>

        {/* Main Content Area */}
        <main className="lg:ml-[280px] flex-1 min-h-screen">
          {/* Mobile Menu Button - Fixed position */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden fixed top-4 left-4 z-30 h-9 w-9 p-0 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-md"
          >
            <Menu className="h-4 w-4" />
          </Button>

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
                >
                  {theme === 'dark' ? (
                    <Sun className="h-4 w-4 text-amber-500" />
                  ) : (
                    <Moon className="h-4 w-4 text-slate-600" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 p-0 rounded-full bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <Bell className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 p-0 rounded-full bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <Lightbulb className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                </Button>
              </div>
            </div>

            {/* Main Content */}
            {children}
          </div>
        </main>
      </div>
    )
  }

  // For Education Officials, show sidebar with icons
  if (isEducationOfficial) {
    return (
      <div className="min-h-screen flex bg-slate-50 dark:bg-[hsl(222,47%,6%)]">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Education Official Sidebar */}
        <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed top-0 bottom-0 left-0 z-40 w-[280px] bg-white/95 dark:bg-[hsl(222,47%,7%)]/95 backdrop-blur-xl border-r border-slate-200/80 dark:border-slate-700/50 transition-transform duration-300 ease-in-out flex flex-col shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50`}>
          <EducationOfficialSidebar onNavigate={() => setSidebarOpen(false)} />
        </aside>

        {/* Main Content Area */}
        <main className="lg:ml-[280px] flex-1 min-h-screen">
          {/* Mobile Menu Button - Fixed position */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden fixed top-4 left-4 z-30 h-9 w-9 p-0 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-md"
          >
            <Menu className="h-4 w-4" />
          </Button>

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
                >
                  {theme === 'dark' ? (
                    <Sun className="h-4 w-4 text-amber-500" />
                  ) : (
                    <Moon className="h-4 w-4 text-slate-600" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 p-0 rounded-full bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <Bell className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 p-0 rounded-full bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <Lightbulb className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                </Button>
              </div>
            </div>

            {/* Main Content */}
            {children}
          </div>
        </main>
      </div>
    )
  }

  // For Regional Officers, show sidebar with icons
  if (isRegionalOfficer) {
    return (
      <div className="min-h-screen flex bg-slate-50 dark:bg-[hsl(222,47%,6%)]">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Regional Officer Sidebar */}
        <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed top-0 bottom-0 left-0 z-40 w-[300px] bg-white/95 dark:bg-[hsl(222,47%,7%)]/95 backdrop-blur-xl border-r border-slate-200/80 dark:border-slate-700/50 transition-transform duration-300 ease-in-out flex flex-col shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50`}>
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

        {/* Main Content Area */}
        <main className="lg:ml-[300px] flex-1 min-h-screen">
          {/* Mobile Menu Button - Fixed position */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden fixed top-4 left-4 z-30 h-9 w-9 p-0 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-md"
          >
            <Menu className="h-4 w-4" />
          </Button>

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
                >
                  {theme === 'dark' ? (
                    <Sun className="h-4 w-4 text-amber-500" />
                  ) : (
                    <Moon className="h-4 w-4 text-slate-600" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 p-0 rounded-full bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <Bell className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 p-0 rounded-full bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <Lightbulb className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                </Button>
              </div>
            </div>

            {/* Main Content */}
            {children}
          </div>
        </main>
      </div>
    )
  }

  // For other users (Admin, etc), just render children without sidebar
  return <>{children}</>
}
