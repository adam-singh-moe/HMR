'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  ArrowLeft, 
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
  Calendar
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center p-8 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-700">
          <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-blue-600 dark:text-blue-400" />
          <p className="text-slate-600 dark:text-slate-400 font-medium">Loading school readiness data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700">
          <CardContent className="pt-8 pb-6 text-center">
            <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-full w-fit mx-auto mb-4">
              <XCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Error Loading Data</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">{error}</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={loadSchoolReadinessData} variant="outline" className="dark:border-slate-600 dark:hover:bg-slate-700">
                Try Again
              </Button>
              <Button onClick={() => router.back()} className="bg-blue-600 hover:bg-blue-700">
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const readyPercentage = data?.summary?.ready_percentage || 0

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={() => router.back()}
            variant="ghost"
            size="sm"
            className="mb-4 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/25">
                <School className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">School Readiness</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-0.5">{user?.region_name} • {data?.summary?.total_schools || 0} schools</p>
              </div>
            </div>
            
            {/* Overall Readiness Indicator */}
            <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="relative">
                <svg className="w-14 h-14 transform -rotate-90">
                  <circle
                    cx="28"
                    cy="28"
                    r="24"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    className="text-slate-200 dark:text-slate-700"
                  />
                  <circle
                    cx="28"
                    cy="28"
                    r="24"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={`${readyPercentage * 1.51} 151`}
                    className="text-emerald-500"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-900 dark:text-white">
                  {Math.round(readyPercentage)}%
                </span>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Overall</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Readiness</p>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-xl">
                  <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Total Schools</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{data?.summary?.total_schools || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl">
                  <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Ready</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{data?.summary?.ready || 0}</p>
                    <span className="text-sm text-slate-400">({Math.round(data?.summary?.ready_percentage || 0)}%)</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/40 rounded-xl">
                  <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Not Ready</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{data?.summary?.not_ready || 0}</p>
                    <span className="text-sm text-slate-400">({Math.round(data?.summary?.not_ready_percentage || 0)}%)</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-100 dark:bg-amber-900/40 rounded-xl">
                  <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Pending</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{data?.summary?.no_status || 0}</p>
                    <span className="text-sm text-slate-400">({Math.round(data?.summary?.no_status_percentage || 0)}%)</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Bar */}
        <Card className="mb-6 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Readiness Distribution</span>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> Ready</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500"></span> Not Ready</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600"></span> Pending</span>
              </div>
            </div>
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
              <div 
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${data?.summary?.ready_percentage || 0}%` }}
              />
              <div 
                className="h-full bg-red-500 transition-all duration-500"
                style={{ width: `${data?.summary?.not_ready_percentage || 0}%` }}
              />
              <div 
                className="h-full bg-slate-300 dark:bg-slate-600 transition-all duration-500"
                style={{ width: `${data?.summary?.no_status_percentage || 0}%` }}
              />
            </div>
          </CardContent>
        </Card>
        {/* Schools List */}
        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-xl rounded-2xl">
          <CardHeader className="border-b border-slate-200 dark:border-slate-700 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-slate-900 dark:text-white">Schools Directory</CardTitle>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    placeholder="Search schools..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full sm:w-64 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-40 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="ready">Ready</SelectItem>
                    <SelectItem value="not_ready">Not Ready</SelectItem>
                    <SelectItem value="no_status">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            {filteredSchools.length > 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredSchools.length)} of {filteredSchools.length} schools
              </p>
            )}
            
            {filteredSchools.length === 0 ? (
              <div className="text-center py-16">
                <div className="p-4 bg-slate-100 dark:bg-slate-700/50 rounded-full w-fit mx-auto mb-4">
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
                    className="rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-200 bg-white dark:bg-slate-800/50 overflow-hidden"
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 dark:text-white truncate">{school.name}</h3>
                          {school.readiness_updated_at && (
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Updated {new Date(school.readiness_updated_at).toLocaleDateString()}
                            </p>
                          )}
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
                          className="w-full mt-3 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                        >
                          <Eye className="h-4 w-4 mr-2" />
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
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    variant="outline"
                    size="sm"
                    className="dark:border-slate-600 dark:hover:bg-slate-700"
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
                              ? "bg-blue-600 text-white hover:bg-blue-700" 
                              : "dark:border-slate-600 dark:hover:bg-slate-700"
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
                    className="dark:border-slate-600 dark:hover:bg-slate-700"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
