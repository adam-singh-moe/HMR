import { getRegions } from "@/app/actions/admin"
import { MapPin, Hash } from "lucide-react"
import { checkPermission } from "@/lib/permissions"
import { redirect } from "next/navigation"

export default async function RegionsPage() {
  // Check view permission (using actual permission key from database)
  const canView = await checkPermission("regions.view")

  if (!canView) {
    redirect("/dashboard/admin")
  }

  const { regions, error } = await getRegions(1, 100) // Get all regions without pagination

  if (error) {
    return (
      <div className="space-y-4 lg:space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl lg:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <MapPin className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              Regions
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              View all regions in the system
            </p>
          </div>
        </div>
        <div className="text-center py-8 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
          Error loading regions: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <MapPin className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            Regions
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            View all regions in the system
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <span className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            {regions.length} total regions
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden bg-white dark:bg-slate-900/50 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Header */}
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/80 dark:to-slate-800/40 border-b border-slate-200 dark:border-slate-700/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" />
                    Name
                  </div>
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider hidden sm:table-cell">
                  <div className="flex items-center gap-2">
                    <Hash className="h-3.5 w-3.5" />
                    Code
                  </div>
                </th>
              </tr>
            </thead>
            {/* Body */}
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {regions.length === 0 ? (
                <tr>
                  <td colSpan={2} className="text-center py-12 text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <MapPin className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                      <span>No regions found</span>
                    </div>
                  </td>
                </tr>
              ) : (
                regions.map((region, index) => (
                  <tr
                    key={region.id}
                    className={`
                      transition-colors duration-150
                      ${index % 2 === 0 ? 'bg-white dark:bg-transparent' : 'bg-slate-50/50 dark:bg-slate-800/20'}
                      hover:bg-blue-50/50 dark:hover:bg-blue-900/10
                    `}
                  >
                    {/* Name */}
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-slate-800 dark:text-white">{region.name}</div>
                        {/* Mobile: show code */}
                        <div className="sm:hidden text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Code: {region.code || "N/A"}
                        </div>
                      </div>
                    </td>
                    {/* Code */}
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {region.code || "-"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
