import { getFeatureRequests } from "@/app/actions/feature-requests"
import { getUser } from "@/app/actions/auth"
import { FeatureRequestsList } from "@/components/feature-requests/requests-list"
import { CreateFeatureRequestButton } from "@/components/feature-requests/create-request-button"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

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

  const { requests, error } = await getFeatureRequests()

  const canCreate = user.role === "Regional Officer" || user.role === "Education Official"
  const dashboardUrl = getDashboardUrl(user.role)

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
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
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Feature Requests</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              {canCreate 
                ? "Submit and vote on feature requests for the application"
                : "View and upvote feature requests from the community"
              }
            </p>
          </div>
          {canCreate && <CreateFeatureRequestButton />}
        </div>
      </div>

      {error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      ) : (
        <FeatureRequestsList initialRequests={requests} userRole={user.role} userId={user.id} />
      )}
    </div>
  )
}
