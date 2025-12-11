import { getFeatureRequests } from "@/app/actions/feature-requests"
import { FeatureRequestsAdminView } from "@/components/feature-requests/admin-view"

export default async function AdminFeatureRequestsPage() {
  const { requests, error } = await getFeatureRequests()

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Feature Requests</h1>
        <p className="text-gray-600 mt-2">
          Review and manage feature requests from Regional Officers and Education Officials
        </p>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      ) : (
        <FeatureRequestsAdminView initialRequests={requests} />
      )}
    </div>
  )
}
