"use client"

import { useRouter } from "next/navigation"
import { User, ChevronRight, MapPin, GraduationCap } from "lucide-react"
import { useAuth } from "@/components/auth-wrapper"
import { ROLE_CONFIGS, BADGE_COLOR_CLASSES } from "./sidebar-config"
import { cn } from "@/lib/utils"

interface UserProfileCardProps {
  onNavigate?: () => void
  schoolInfo?: { id: string; name: string; level: string } | null
}

export function UserProfileCard({ onNavigate, schoolInfo }: UserProfileCardProps) {
  const router = useRouter()
  const { user } = useAuth()

  const roleConfig = ROLE_CONFIGS[user?.role || ""] || ROLE_CONFIGS["Head Teacher"]
  const badgeColorClass = BADGE_COLOR_CLASSES[roleConfig.color]

  const handleClick = () => {
    router.push("/dashboard/settings")
    onNavigate?.()
  }

  // Helper to capitalize name
  const capitalizeName = (name: string) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ")
  }

  return (
    <div className="px-3 py-2 2xl:px-4 2xl:py-3 flex-shrink-0">
      <button
        onClick={handleClick}
        className="w-full p-2.5 2xl:p-3 rounded-xl 2xl:rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800/80 dark:to-slate-800/40 border border-blue-100 dark:border-slate-700/50 hover:shadow-md 2xl:hover:shadow-lg transition-all duration-200 cursor-pointer"
      >
        <div className="flex items-center gap-2.5 2xl:gap-3">
          {/* Avatar */}
          <div
            className={cn(
              "w-9 h-9 2xl:w-11 2xl:h-11 rounded-full flex items-center justify-center shadow-md 2xl:shadow-lg shadow-blue-500/20 2xl:shadow-blue-500/25 flex-shrink-0 bg-gradient-to-br",
              roleConfig.avatarGradient
            )}
          >
            <User className="w-4 h-4 2xl:w-5 2xl:h-5 text-white" />
          </div>

          <div className="flex-1 min-w-0 text-left">
            {/* User Name */}
            <h3 className="text-[11px] 2xl:text-sm font-bold text-slate-800 dark:text-white leading-tight break-words">
              {user?.name ? capitalizeName(user.name) : "Loading..."}
            </h3>

            {/* Role Badge */}
            <div className="inline-flex items-center gap-1 2xl:gap-1.5 mt-0.5">
              <div className={cn("w-1.5 h-1.5 2xl:w-2 2xl:h-2 rounded-full animate-pulse", badgeColorClass)} />
              <span className="text-[8px] 2xl:text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase">
                {roleConfig.badge}
              </span>
            </div>

            {/* Region Name (for Regional Officer) */}
            {roleConfig.showRegion && user?.region_name && (
              <div className="flex items-center gap-1 2xl:gap-1.5 mt-0.5 text-[8px] 2xl:text-[10px] text-slate-500 dark:text-slate-400">
                <MapPin className="w-2.5 h-2.5 2xl:w-3 2xl:h-3 flex-shrink-0" />
                <span className="truncate">{user.region_name}</span>
              </div>
            )}

            {/* School Name (for Head Teacher) */}
            {roleConfig.showSchool && schoolInfo?.name && (
              <div className="flex items-start gap-1 2xl:gap-1.5 mt-0.5 text-[8px] 2xl:text-[11px] text-slate-500 dark:text-slate-400">
                <GraduationCap className="w-2.5 h-2.5 2xl:w-3.5 2xl:h-3.5 flex-shrink-0 mt-0.5" />
                <span className="leading-tight break-words">{schoolInfo.name}</span>
              </div>
            )}
          </div>

          <ChevronRight className="w-3.5 h-3.5 2xl:w-4 2xl:h-4 text-slate-400 flex-shrink-0" />
        </div>
      </button>
    </div>
  )
}
