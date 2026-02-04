"use client"

import { usePermissions } from "@/hooks/use-permissions"
import { useAuth } from "@/components/auth-wrapper"
import { Loader2, ShieldX } from "lucide-react"
import { RegionalAIInsightsContent } from "@/app/dashboard/regional-officer/ai-insights/page"

/**
 * Shared AI Insights page that any role can access based on permissions.
 * - ai_insights.View: Full access to all AI insights
 * - ai_insights.view_regional: Access to regional AI insights only
 */
export default function SharedAIInsightsPage() {
  const { hasPermission, isLoading: permissionsLoading } = usePermissions()
  const canViewAll = hasPermission("ai_insights.View")
  const canViewRegional = hasPermission("ai_insights.view_regional")
  const hasAnyAccess = canViewAll || canViewRegional

  // Show loading state while checking permissions
  if (permissionsLoading) {
    return (
      <div className="h-[calc(100vh-120px)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Show access denied if user doesn't have permission
  if (!hasAnyAccess) {
    return (
      <div className="h-[calc(100vh-120px)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <ShieldX className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Access Denied</h2>
          <p className="text-slate-500 dark:text-slate-400">
            You don't have permission to access AI Insights. Please contact your administrator if you believe this is an error.
          </p>
        </div>
      </div>
    )
  }

  // Reuse the existing AI Insights content component
  return <RegionalAIInsightsContent />
}
