import { FileText, Download, TrendingUp, Calendar } from "lucide-react"
import { AdminReportsClient } from "./components/AdminReportsClient"
import { ExportAllButton } from "./components/ExportAllButton"
import { getSubmittedReportsWithSearchAndPagination, getReportCounts, getRegionsForFilter } from "@/app/actions/education-official-reports"

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function AdminReportsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams
  // Extract search parameters
  const search = typeof resolvedSearchParams.search === 'string' ? resolvedSearchParams.search : ''
  const region = typeof resolvedSearchParams.region === 'string' ? resolvedSearchParams.region : ''
  const status = typeof resolvedSearchParams.status === 'string' ? resolvedSearchParams.status : ''
  const page = typeof resolvedSearchParams.page === 'string' ? parseInt(resolvedSearchParams.page) : 1

  // Get regions for the filter
  const { regions } = await getRegionsForFilter()

  // Get initial reports data with search parameters
  const { reports: initialReports, totalCount, totalPages, error } = await getSubmittedReportsWithSearchAndPagination({
    page: page,
    pageSize: 25,
    searchTerm: search,
    selectedRegionId: region === 'all' ? '' : region,
    selectedStatus: status === 'all' ? '' : status,
    selectedSchoolLevel: "",
    sortBy: "updated_at",
    sortOrder: "desc"
  })

  // Get report statistics
  const { totalReports: allTimeTotal, currentMonthReports } = await getReportCounts()

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-blue-500" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reports</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">View and manage all school reports</p>
          </div>
        </div>
        <div className="rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200/80 dark:border-red-500/20 px-4 py-3 text-red-700 dark:text-red-400">
          Error loading reports: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <FileText className="h-8 w-8 text-blue-500" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reports</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">View and manage all school reports across regions</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Reports */}
        <div className="relative overflow-hidden rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200/80 dark:border-blue-500/20 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Reports</p>
              <p className="text-3xl font-bold text-blue-700 dark:text-blue-300 mt-1">{allTimeTotal || 0}</p>
              <p className="text-xs text-blue-500/80 dark:text-blue-400/70 mt-2">All time submissions</p>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-500/20">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-blue-200/30 dark:bg-blue-500/10 rounded-full blur-2xl" />
        </div>

        {/* This Month */}
        <div className="relative overflow-hidden rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/20 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">This Month</p>
              <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">{currentMonthReports || 0}</p>
              <p className="text-xs text-emerald-500/80 dark:text-emerald-400/70 mt-2">Reports submitted</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-500/20">
              <Calendar className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-emerald-200/30 dark:bg-emerald-500/10 rounded-full blur-2xl" />
        </div>

        {/* Recent Reports */}
        <div className="relative overflow-hidden rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200/80 dark:border-purple-500/20 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Recent Reports</p>
              <p className="text-3xl font-bold text-purple-700 dark:text-purple-300 mt-1">{totalCount || 0}</p>
              <p className="text-xs text-purple-500/80 dark:text-purple-400/70 mt-2">Available to view</p>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-500/20">
              <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-purple-200/30 dark:bg-purple-500/10 rounded-full blur-2xl" />
        </div>

        {/* Actions */}
        <div className="relative overflow-hidden rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/20 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Actions</p>
              <div className="mt-3">
                <ExportAllButton />
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-500/20">
              <Download className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-amber-200/30 dark:bg-amber-500/10 rounded-full blur-2xl" />
        </div>
      </div>

      {/* Reports Table */}
      <AdminReportsClient
        reports={initialReports || []}
        totalPages={totalPages || 0}
        currentPage={page}
        regions={regions || []}
      />
    </div>
  )
}
