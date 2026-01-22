'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Search,
  School,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Building2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Calendar,
  Activity,
  TrendingUp
} from "lucide-react"
import { useAuth } from "@/components/auth-wrapper"
import { getRegionalSchoolReadinessData } from "@/app/actions/regional-officer-school-readiness"
import { SchoolReadinessDialog, getReadinessStatusBadge } from "@/components/school-readiness-dialog"

interface SchoolReadinessData {
  schools: Array<{
    id: string
    name: string
    readiness_status: string | null
    readiness_reason: string | null
    readiness_checklist_items: any | null
    readiness_updated_at: string | null
    latest_report_date: string | null | undefined
  }>
  summary: {
    total_schools: number
    ready: number
    not_ready: number
    no_status: number
    ready_percentage: number
    not_ready_percentage: number
    no_status_percentage: number
  }
}

export default function SchoolReadinessPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [data, setData] = useState<SchoolReadinessData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(12)
  const [selectedSchool, setSelectedSchool] = useState<SchoolReadinessData['schools'][0] | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    loadSchoolReadinessData()
  }, [user])

  const loadSchoolReadinessData = async () => {
    if (!user?.region_name) return

    setLoading(true)
    setError(null)

    try {
      const result = await getRegionalSchoolReadinessData(user.region_name)

      if (result.success && result.data) {
        setData(result.data as any)
      } else {
        setError(result.error || "Failed to load school readiness data")
      }
    } catch (err) {
      console.error('Error loading school readiness data:', err)
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const filteredSchools = data?.schools.filter(school => {
    const matchesSearch = school.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" ||
      (statusFilter === "ready" && school.readiness_status === "ready") ||
      (statusFilter === "not_ready" && school.readiness_status === "not_ready") ||
      (statusFilter === "no_status" && !school.readiness_status)

    return matchesSearch && matchesStatus
  }) || []

  const totalPages = Math.ceil(filteredSchools.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedSchools = filteredSchools.slice(startIndex, endIndex)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
        <span className="ml-2 text-blue-600 dark:text-blue-400 text-sm">Loading school readiness data...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-[hsl(222,47%,9%)] rounded-2xl border border-slate-200/80 dark:border-slate-700/50 p-8 text-center shadow-lg">
          <div className="p-4 bg-red-100 dark:bg-red-500/10 rounded-full w-fit mx-auto mb-4">
            <XCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Error Loading Data</h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={loadSchoolReadinessData} variant="outline" className="dark:border-slate-700 dark:hover:bg-slate-800">
              Try Again
            </Button>
            <Button onClick={() => router.back()} className="bg-blue-600 hover:bg-blue-700">
              Go Back
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const readyPercentage = data?.summary?.ready_percentage || 0

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              School Readiness
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{user?.region_name} • {data?.summary?.total_schools || 0} schools</p>
          </div>

          {/* Overall Readiness Indicator - Matching Stats Style */}
          <div className="px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/20">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12">
                <svg className="w-12 h-12 transform -rotate-90">
                  <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="none" className="text-emerald-200 dark:text-emerald-900/50" />
                  <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" strokeDasharray={`${readyPercentage * 1.257} 125.7`} className="text-emerald-500 dark:text-emerald-400" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  {Math.round(readyPercentage)}%
                </span>
              </div>
              <div>
                <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 font-medium">Overall</p>
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Readiness</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row - Aligned right */}
        <div className="flex gap-2.5 flex-wrap justify-end">
          {/* Total Schools */}
          <div className="px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200/80 dark:border-blue-500/20">
            <div className="flex items-center gap-2.5">
              <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-xl font-bold text-blue-700 dark:text-blue-400">{data?.summary?.total_schools || 0}</p>
                <p className="text-[11px] text-blue-600/70 dark:text-blue-400/70 font-medium">Total Schools</p>
              </div>
            </div>
          </div>

          {/* Ready */}
          <div className="px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/20">
            <div className="flex items-center gap-2.5">
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{data?.summary?.ready || 0}</p>
                <p className="text-[11px] text-emerald-600/70 dark:text-emerald-400/70 font-medium">Ready ({Math.round(data?.summary?.ready_percentage || 0)}%)</p>
              </div>
            </div>
          </div>

          {/* Not Ready */}
          <div className="px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200/80 dark:border-red-500/20">
            <div className="flex items-center gap-2.5">
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <div>
                <p className="text-xl font-bold text-red-700 dark:text-red-400">{data?.summary?.not_ready || 0}</p>
                <p className="text-[11px] text-red-600/70 dark:text-red-400/70 font-medium">Not Ready ({Math.round(data?.summary?.not_ready_percentage || 0)}%)</p>
              </div>
            </div>
          </div>

          {/* Pending */}
          <div className="px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/20">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="text-xl font-bold text-amber-700 dark:text-amber-400">{data?.summary?.no_status || 0}</p>
                <p className="text-[11px] text-amber-600/70 dark:text-amber-400/70 font-medium">Pending ({Math.round(data?.summary?.no_status_percentage || 0)}%)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Readiness Distribution - Matching Stats Style */}
        <div className="px-4 py-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200/80 dark:border-indigo-500/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Readiness Distribution</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-indigo-600/70 dark:text-indigo-400/70">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Ready
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                Not Ready
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500"></span>
                Pending
              </span>
            </div>
          </div>
          <div className="h-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-emerald-500 transition-all duration-700 ease-out"
              style={{ width: `${data?.summary?.ready_percentage || 0}%` }}
            />
            <div
              className="h-full bg-red-500 transition-all duration-700 ease-out"
              style={{ width: `${data?.summary?.not_ready_percentage || 0}%` }}
            />
            <div
              className="h-full bg-slate-400 dark:bg-slate-500 transition-all duration-700 ease-out"
              style={{ width: `${data?.summary?.no_status_percentage || 0}%` }}
            />
          </div>
        </div>

        {/* Schools Directory */}
        <div className="bg-white dark:bg-[hsl(222,47%,9%)] rounded-xl border border-slate-200/80 dark:border-slate-700/50 overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-200/80 dark:border-slate-700/50 bg-slate-50 dark:bg-[hsl(222,47%,8%)]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-500/15 rounded-lg">
                  <School className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="font-semibold text-slate-900 dark:text-white">Schools Directory</h2>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    placeholder="Search schools..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full sm:w-64 h-10 rounded-lg bg-white dark:bg-[hsl(222,47%,11%)] border-slate-200 dark:border-slate-700"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-36 h-10 rounded-lg bg-white dark:bg-[hsl(222,47%,11%)] border-slate-200 dark:border-slate-700">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-[hsl(222,47%,11%)] dark:border-slate-700">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="ready">Ready</SelectItem>
                    <SelectItem value="not_ready">Not Ready</SelectItem>
                    <SelectItem value="no_status">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-5">
            {filteredSchools.length > 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredSchools.length)} of {filteredSchools.length} schools
              </p>
            )}

            {filteredSchools.length === 0 ? (
              <div className="text-center py-16">
                <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full w-fit mx-auto mb-4">
                  <School className="h-10 w-10 text-slate-400 dark:text-slate-500" />
                </div>
                <p className="text-slate-600 dark:text-slate-400 font-medium">{!data ? "Loading school readiness data..." : "No schools found"}</p>
                <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">Try adjusting your search or filter</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {paginatedSchools.map((school) => (
                  <div
                    key={school.id}
                    className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                      school.readiness_status === 'ready'
                        ? 'border-emerald-200/50 dark:border-emerald-500/20 hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/5'
                        : school.readiness_status === 'not_ready'
                        ? 'border-red-200/50 dark:border-red-500/20 hover:border-red-300 dark:hover:border-red-500/40 hover:shadow-lg hover:shadow-red-500/5'
                        : 'border-slate-200 dark:border-slate-700/50 hover:border-amber-300 dark:hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/5'
                    } bg-white dark:bg-[hsl(222,47%,11%)]`}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={`p-1.5 rounded-lg flex-shrink-0 ${
                            school.readiness_status === 'ready'
                              ? 'bg-emerald-100 dark:bg-emerald-500/15'
                              : school.readiness_status === 'not_ready'
                              ? 'bg-red-100 dark:bg-red-500/15'
                              : 'bg-amber-100 dark:bg-amber-500/15'
                          }`}>
                            <School className={`h-4 w-4 ${
                              school.readiness_status === 'ready'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : school.readiness_status === 'not_ready'
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-amber-600 dark:text-amber-400'
                            }`} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-slate-900 dark:text-white truncate text-sm">{school.name}</h3>
                            {school.readiness_updated_at && (
                              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Updated {new Date(school.readiness_updated_at).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          {getReadinessStatusBadge(school.readiness_status)}
                        </div>
                      </div>

                      {school.readiness_status && (
                        <Button
                          onClick={() => {
                            setSelectedSchool(school)
                            setDialogOpen(true)
                          }}
                          variant="outline"
                          size="sm"
                          className={`w-full mt-3 text-xs font-medium ${
                            school.readiness_status === 'ready'
                              ? 'text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                              : school.readiness_status === 'not_ready'
                              ? 'text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30 hover:bg-red-50 dark:hover:bg-red-500/10'
                              : 'text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30 hover:bg-blue-50 dark:hover:bg-blue-500/10'
                          }`}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1.5" />
                          View Checklist
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Readiness Checklist Dialog */}
            <SchoolReadinessDialog
              school={selectedSchool}
              open={dialogOpen}
              onOpenChange={setDialogOpen}
            />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200 dark:border-slate-700/50">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    variant="outline"
                    size="sm"
                    className="dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>

                  <div className="hidden sm:flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }

                      return (
                        <Button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          className={`w-9 h-9 p-0 ${
                            currentPage === pageNum
                              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 border-0"
                              : "dark:border-slate-700 dark:hover:bg-slate-800"
                          }`}
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                  </div>

                  <Button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    variant="outline"
                    size="sm"
                    className="dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
