"use client"

import { usePermissions } from "@/hooks/use-permissions"
import { AdminSubmitReportClient } from "@/app/dashboard/admin/submit-report/components/AdminSubmitReportClient"
import { AlertCircle, Loader2 } from "lucide-react"

export default function SubmitReportPage() {
  const { hasPermission, isLoading } = usePermissions()

  // Check if user has permission to create reports for any school
  const canCreateAllReports = hasPermission("monthly_report.create_all")

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 dark:text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin mb-3 text-blue-500" />
        <p>Loading...</p>
      </div>
    )
  }

  if (!canCreateAllReports) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 max-w-md text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">
            Access Denied
          </h2>
          <p className="text-sm text-red-600 dark:text-red-300">
            You do not have permission to submit reports for other schools.
            This feature requires the &quot;Create All Reports&quot; permission.
          </p>
        </div>
      </div>
    )
  }

  return <AdminSubmitReportClient />
}
