"use client"

import { ReactNode, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-wrapper"
import { useTheme } from "next-themes"
import { HeadTeacherSidebar } from "@/components/head-teacher-sidebar"
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  Baby,
  Sparkles,
  MapPin,
  Activity,
  ChevronRight,
  Menu,
  X,
  Settings,
  Sun,
  Moon,
  Bell,
  Lightbulb
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface SettingsLayoutProps {
  children: ReactNode
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Determine user role
  const isRegionalOfficer = user?.role === "Regional Officer"
  const isHeadTeacher = user?.role === "Head Teacher"

  // Navigation items for Regional Officer sidebar
  const navigationItems = [
    { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard, description: 'Key metrics & analytics', path: '/dashboard/regional-officer?tab=overview' },
    { id: 'reports', label: 'Submitted Reports', icon: FileText, description: 'School report submissions', path: '/dashboard/regional-officer?tab=reports' },
    { id: 'pe-reports', label: 'Regional PE Reports', icon: ClipboardList, description: 'Physical education reports', path: '/dashboard/regional-officer?tab=pe-reports' },
    { id: 'nursery-assessment', label: 'Nursery Assessment', icon: Baby, description: 'Early childhood evaluations', path: '/dashboard/regional-officer?tab=nursery-assessment' },
    { id: 'ai-insights', label: 'AI Insights', icon: Sparkles, description: 'AI-powered analytics', path: '/dashboard/regional-officer?tab=ai-insights' },
  ]

  // For Head Teachers, show sidebar with icons
  if (isHeadTeacher) {
    return (
      <div className="min-h-screen flex">
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
          <div className="p-4 lg:p-6 max-w-6xl mx-auto">
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

  if (!isRegionalOfficer) {
    // For other roles, just render children without sidebar
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[hsl(222,47%,6%)]">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Fixed Sidebar Navigation */}
      <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed top-14 sm:top-16 md:top-[72px] bottom-0 left-0 z-40 w-[260px] bg-white/95 dark:bg-[hsl(222,47%,7%)]/95 backdrop-blur-xl border-r border-slate-200/80 dark:border-slate-700/50 transition-transform duration-300 ease-in-out flex flex-col shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50`}>
        {/* Sidebar Header */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-blue-600/10 to-indigo-600/10 dark:from-blue-500/10 dark:to-indigo-500/10 border border-blue-200/50 dark:border-blue-500/20">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-600/20">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Regional Officer</p>
              <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{user?.region_name || 'Region'}</p>
            </div>
          </div>
        </div>

        {/* Close button for mobile */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden absolute top-4 right-4 h-8 w-8 p-0 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => {
                  router.push(item.path)
                  setSidebarOpen(false)
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-600 dark:text-slate-300"
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center transition-all bg-slate-100 dark:bg-slate-800 group-hover:bg-slate-200 dark:group-hover:bg-slate-700">
                  <Icon className="w-[18px] h-[18px] text-slate-500 dark:text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-[13px] font-semibold truncate text-slate-700 dark:text-slate-200">{item.label}</p>
                  <p className="text-[11px] truncate text-slate-500 dark:text-slate-500">{item.description}</p>
                </div>
              </button>
            )
          })}

          {/* Settings - Active */}
          <button
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-100 dark:bg-blue-900/50">
              <Settings className="w-[18px] h-[18px] text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-[13px] font-semibold truncate">Account Settings</p>
              <p className="text-[11px] truncate text-blue-500 dark:text-blue-500">Manage your profile</p>
            </div>
          </button>
        </nav>

        {/* School Readiness Card */}
        <div className="p-3 border-t border-slate-200/80 dark:border-slate-700/50">
          <div
            onClick={() => router.push('/dashboard/regional-officer/school-readiness')}
            className="p-4 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 dark:from-blue-600 dark:to-indigo-600 text-white cursor-pointer hover:shadow-lg hover:shadow-blue-600/25 transition-all duration-300 hover:scale-[1.02]"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                <span className="text-sm font-semibold">School Readiness</span>
              </div>
              <ChevronRight className="w-4 h-4 opacity-70" />
            </div>
            <p className="text-2xl font-bold">--</p>
            <p className="text-xs text-white/70 mt-1">Click to view details</p>
          </div>
        </div>
      </aside>

      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-[72px] left-4 z-30">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSidebarOpen(true)}
          className="h-9 w-9 p-0 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-md"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      {/* Main Content Area */}
      <main className="lg:ml-[260px] min-h-screen pt-0">
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
