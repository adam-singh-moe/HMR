import { getFeatureRequests } from "@/app/actions/feature-requests"
import { getUser } from "@/app/actions/auth"
import { FeatureRequestsList } from "@/components/feature-requests/requests-list"
import { CreateFeatureRequestButton } from "@/components/feature-requests/create-request-button"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Lightbulb } from "lucide-react"
import { checkPermission } from "@/lib/permissions"

// Helper function to get the correct dashboard URL based on user role
function getDashboardUrl(role: string): string {
  if (role === "Head Teacher") {
    return "/dashboard/head-teacher"
  } else if (role === "Regional Officer") {
    return "/dashboard/regional-officer"
  } else if (role === "Education Official") {
    return "/dashboard/education-official"
  } else if (role === "Admin") {
    return "/dashboard/admin"
  }
  return "/dashboard"
}

export default async function FeatureRequestsPage() {
  const user = await getUser()

  if (!user) {
    redirect("/auth/signin")
  }

  // Check feature request permissions
  const [canView, canCreate, canUpvote, canComment, canViewComments] = await Promise.all([
    checkPermission("feature_request.view"),
    checkPermission("feature_request.create"),
    checkPermission("feature_request.upvote"),
    checkPermission("feature_request.create_comments"),
    checkPermission("feature_request.view_comments"),
  ])

  // If user can't view feature requests, redirect to dashboard
  if (!canView) {
    const dashboardUrl = getDashboardUrl(user.role)
    redirect(dashboardUrl)
  }

  const { requests, error } = await getFeatureRequests()

  const dashboardUrl = getDashboardUrl(user.role)
  const isRegionalOfficer = user.role === "Regional Officer"

  // Pass permissions to client component
  const permissions = {
    canCreate,
    canUpvote,
    canComment,
    canViewComments,
  }

  return (
    <div className={`${isRegionalOfficer ? 'p-4 lg:p-6 mx-auto max-w-6xl' : 'container mx-auto py-8 px-4 max-w-7xl'}`}>
      <div className="mb-8">
        {/* Only show back button for non-Regional Officers (they have sidebar) */}
        {!isRegionalOfficer && (
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="mb-4 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Link href={dashboardUrl} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Lightbulb className="h-8 w-8 text-blue-500" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white">Feature Requests</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                {canCreate
                  ? "Submit and vote on feature requests"
                  : "View and upvote feature requests"
                }
              </p>
            </div>
          </div>
          {canCreate && <CreateFeatureRequestButton />}
        </div>
      </div>

      {error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl">
          {error}
        </div>
      ) : (
        <FeatureRequestsList
          initialRequests={requests}
          userRole={user.role}
          userId={user.id}
          permissions={permissions}
        />
      )}
    </div>
  )
}
