"use client"

import { Lightbulb, Plus } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { getPendingFeatureRequestsCount } from "@/app/actions/feature-requests"
import { usePermissions } from "@/hooks/use-permissions"

export function FeatureRequestButton() {
  const [count, setCount] = useState(0)
  const { hasPermission, isLoading } = usePermissions()

  // Check if user has permission to view feature requests
  const canView = hasPermission("feature_request.view")

  useEffect(() => {
    // Only fetch count if user has permission to view
    if (!canView) return

    const fetchCount = async () => {
      const { count } = await getPendingFeatureRequestsCount()
      setCount(count)
    }

    fetchCount()

    // Refresh count every 30 seconds
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [canView])

  // Don't render if loading or user doesn't have permission
  if (isLoading || !canView) {
    return null
  }

  return (
    <Link
      href="/dashboard/feature-requests"
      className="relative p-2 rounded-full bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 transition-all duration-300 border border-slate-200 dark:border-slate-600/50 shadow-sm dark:shadow-slate-900/20 flex items-center justify-center"
      title="Feature Requests"
    >
      <div className="relative">
        <Lightbulb className="h-4 w-4 text-orange-500 dark:text-orange-400" />
        <Plus className="absolute -top-1 -right-1 h-3 w-3 text-orange-500 dark:text-orange-400 bg-white dark:bg-slate-800 rounded-full" />
        {count > 0 && (
          <span className="absolute -top-2 -right-2 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full border-2 border-white dark:border-slate-800">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </div>
    </Link>
  )
}
