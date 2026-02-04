import { getFeatureRequests } from "@/app/actions/feature-requests"
import { FeatureRequestsAdminView } from "@/components/feature-requests/admin-view"
import { Lightbulb } from "lucide-react"
import { checkPermission } from "@/lib/permissions"
import { redirect } from "next/navigation"

export default async function AdminFeatureRequestsPage() {
  // Check permissions for admin feature request management
  const [canView, canUpdateStatus, canDelete] = await Promise.all([
    checkPermission("feature_request.view"),
    checkPermission("feature_request.status_update"),
    checkPermission("feature_request.delete"),
  ])

  // If user can't view feature requests, redirect to dashboard
  if (!canView) {
    redirect("/dashboard/admin")
  }

  const { requests, error } = await getFeatureRequests()

  // Pass permissions to client component
  const permissions = {
    canUpdateStatus,
    canDelete,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Lightbulb className="h-8 w-8 text-blue-500" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Feature Requests</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Review and manage feature requests from Regional Officers and Education Officials
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200/80 dark:border-red-500/20 px-4 py-3 text-red-700 dark:text-red-400">
          {error}
        </div>
      ) : (
        <FeatureRequestsAdminView initialRequests={requests} permissions={permissions} />
      )}
    </div>
  )
}
