"use client"

import { useState, useEffect, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { useAuth } from "@/components/auth-wrapper"
import { useTheme } from "next-themes"
import { signOut } from "@/app/actions/auth"
import { getSchoolReadinessPercentage } from "@/app/actions/regional-officer-school-readiness"
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
  LogOut,
  Loader2,
  User,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface RegionalOfficerSidebarProps {
  onNavigate?: () => void
}

export function RegionalOfficerSidebar({ onNavigate }: RegionalOfficerSidebarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { theme } = useTheme()
  const [isPending, startTransition] = useTransition()
  const [schoolReadiness, setSchoolReadiness] = useState<number | null>(null)
  const [isLoadingReadiness, setIsLoadingReadiness] = useState(true)

  // Get current tab from URL
  const currentTab = searchParams.get('tab') || 'overview'

  // Navigation items for sidebar
  const navigationItems = [
    { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard, description: 'Key metrics & analytics', path: '/dashboard/regional-officer?tab=overview' },
    { id: 'reports', label: 'Submitted Reports', icon: FileText, description: 'School report submissions', path: '/dashboard/regional-officer?tab=reports' },
    { id: 'pe-reports', label: 'Regional PE Reports', icon: ClipboardList, description: 'Physical education reports', path: '/dashboard/regional-officer?tab=pe-reports' },
    { id: 'nursery-assessment', label: 'Nursery Assessment', icon: Baby, description: 'Early childhood evaluations', path: '/dashboard/regional-officer?tab=nursery-assessment' },
    { id: 'ai-insights', label: 'AI Insights', icon: Sparkles, description: 'AI-powered analytics', path: '/dashboard/regional-officer?tab=ai-insights' },
  ]

  // Fetch school readiness percentage
  useEffect(() => {
    async function fetchReadiness() {
      if (!user?.region_name) {
        setIsLoadingReadiness(false)
        return
      }
      try {
        const result = await getSchoolReadinessPercentage(user.region_name)
        if (result && result.success && typeof result.ready_percentage === 'number') {
          setSchoolReadiness(result.ready_percentage)
        } else {
          setSchoolReadiness(null)
        }
      } catch (error) {
        console.error('Error fetching school readiness:', error)
        setSchoolReadiness(null)
      } finally {
        setIsLoadingReadiness(false)
      }
    }
    fetchReadiness()
  }, [user?.region_name])

  const handleSignOut = () => {
    startTransition(async () => {
      await signOut()
    })
  }

  const handleNavigation = (path: string) => {
    router.push(path)
    onNavigate?.()
  }

  // Helper to capitalize name
  const capitalizeName = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  return (
    <div className="flex flex-col h-full">
      {/* App Logo and Name Header */}
      <div className="px-4 py-5 border-b border-slate-200/80 dark:border-slate-700/50">
        <Link href="/dashboard/regional-officer" className="flex items-center gap-3">
          <div className="relative h-12 w-12 flex-shrink-0">
            <div className="w-full h-full rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 p-[2px] shadow-lg shadow-blue-500/25">
              <div className="w-full h-full rounded-[10px] bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                <Image
                  src="/images/moe-logo.png"
                  alt="Ministry of Education Guyana"
                  fill
                  className="object-contain p-1.5"
                />
              </div>
            </div>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-lg font-bold text-slate-800 dark:text-white tracking-tight leading-tight">
              Headteacher
            </span>
            <span className="text-lg font-bold text-slate-800 dark:text-white tracking-tight leading-tight">
              Reporting Portal
            </span>
            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-0.5">
              Ministry of Education
            </span>
          </div>
        </Link>
      </div>

      {/* User Profile Card */}
      <div className="px-4 py-4">
        <button
          onClick={() => handleNavigation('/dashboard/settings')}
          className="w-full p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800/80 dark:to-slate-800/40 border border-blue-100 dark:border-slate-700/50 hover:shadow-lg hover:shadow-blue-500/10 dark:hover:shadow-blue-500/5 transition-all duration-300 hover:scale-[1.02] cursor-pointer group"
        >
          <div className="flex flex-col items-center text-center">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-3 shadow-lg shadow-blue-500/25">
              <User className="w-8 h-8 text-white" />
            </div>

            {/* User Name */}
            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1.5">
              {user?.name ? capitalizeName(user.name) : 'Loading...'}
            </h3>

            {/* Role Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-500/30 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                Regional Officer
              </span>
            </div>

            {/* Region Name */}
            {user?.region_name && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500 dark:text-slate-400">
                <MapPin className="w-3.5 h-3.5" />
                <span>{user.region_name}</span>
              </div>
            )}

            {/* Edit Profile Indicator */}
            <div className="flex items-center gap-1 mt-3 text-xs text-blue-600 dark:text-blue-400">
              <span className="font-medium">Edit User Profile</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {navigationItems.map((item) => {
          const Icon = item.icon
          const isActive = currentTab === item.id

          return (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-600 dark:text-slate-300'
              }`}
            >
              {/* Active indicator bar */}
              {isActive && (
                <div className="absolute left-0 w-1 h-10 bg-blue-600 rounded-r-full" />
              )}

              <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                isActive
                  ? 'bg-white/20'
                  : 'bg-slate-100 dark:bg-slate-800 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
              }`}>
                <Icon className={`w-[18px] h-[18px] ${
                  isActive
                    ? 'text-white'
                    : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                }`} />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className={`text-[13px] font-semibold truncate ${
                  isActive ? 'text-white' : 'text-slate-700 dark:text-slate-200'
                }`}>{item.label}</p>
                <p className={`text-[11px] truncate ${
                  isActive ? 'text-white/70' : 'text-slate-500 dark:text-slate-500'
                }`}>{item.description}</p>
              </div>
              {isActive && <ChevronRight className="w-4 h-4 text-white/70" />}
            </button>
          )
        })}
      </nav>

      {/* Sign Out Button */}
      <div className="px-3 py-2 border-t border-slate-200/80 dark:border-slate-700/50">
        <button
          onClick={handleSignOut}
          disabled={isPending}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 group"
        >
          <div className="w-9 h-9 rounded-lg flex items-center justify-center transition-all bg-red-50 dark:bg-red-900/30 group-hover:bg-red-100 dark:group-hover:bg-red-900/50">
            {isPending ? (
              <Loader2 className="w-[18px] h-[18px] animate-spin text-red-500" />
            ) : (
              <LogOut className="w-[18px] h-[18px] text-red-500" />
            )}
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-[13px] font-semibold truncate text-red-600 dark:text-red-400">
              {isPending ? 'Signing out...' : 'Sign Out'}
            </p>
            <p className="text-[11px] truncate text-red-500/70 dark:text-red-500/70">
              End your session
            </p>
          </div>
        </button>
      </div>

      {/* School Readiness Card */}
      <div className="p-3 border-t border-slate-200/80 dark:border-slate-700/50">
        <Link href="/dashboard/regional-officer/school-readiness">
          <div className={`p-4 rounded-xl text-white shadow-lg cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-[1.02] ${
            schoolReadiness === null || isLoadingReadiness
              ? 'bg-gradient-to-br from-slate-500 to-slate-600 shadow-slate-500/25 hover:shadow-slate-500/30'
              : schoolReadiness >= 70
                ? 'bg-gradient-to-br from-emerald-500 to-green-600 shadow-emerald-500/25 hover:shadow-emerald-500/30'
                : schoolReadiness >= 40
                  ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/25 hover:shadow-amber-500/30'
                  : 'bg-gradient-to-br from-red-500 to-rose-600 shadow-red-500/25 hover:shadow-red-500/30'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                <span className="text-sm font-semibold">School Readiness</span>
              </div>
              <ChevronRight className="w-4 h-4 opacity-70" />
            </div>
            {isLoadingReadiness ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Loading...</span>
              </div>
            ) : (
              <>
                <p className="text-2xl font-bold">
                  {schoolReadiness !== null ? `${schoolReadiness}%` : 'N/A'}
                </p>
                <p className="text-xs text-white/70 mt-1">Click to view details</p>
              </>
            )}
          </div>
        </Link>
      </div>
    </div>
  )
}

export function RegionalOfficerSidebarMobileToggle({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="h-10 w-10 p-0 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-md lg:hidden"
    >
      <Menu className="h-5 w-5" />
    </Button>
  )
}
