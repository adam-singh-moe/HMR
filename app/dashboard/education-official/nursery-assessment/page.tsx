"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { getAllNurseryAssessments } from "@/app/actions/nursery-assessment"
import { getRegionsForFilter } from "@/app/actions/education-official-reports"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BookOpen, Eye, Calendar, School, User, MapPin, Loader2, RefreshCw, X, Download } from "lucide-react"
import Link from "next/link"
import { AuthWrapper } from "@/components/auth-wrapper"
import { toast } from "@/components/ui/use-toast"

interface Assessment {
  id: string
  created_at: string
  assessment_type: string
  enrollment: number
  status: string
  schools: {
    name: string
    region: string
    region_id?: string
  }
  headteacher: {
    name: string
    email: string
  }
}

interface Region {
  id: string
  name: string
}

// Cache for nursery assessments data
let nurseryAssessmentsCache: {
  assessments: Assessment[]
  lastFetched: number
} | null = null

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes cache

export default function NurseryAssessmentPage() {
  return (
    <AuthWrapper requiredRole="Education Official">
      <NurseryAssessmentContent />
    </AuthWrapper>
  )
}

function NurseryAssessmentContent() {
  const [assessments, setAssessments] = useState<Assessment[]>(nurseryAssessmentsCache?.assessments || [])
  const [filteredAssessments, setFilteredAssessments] = useState<Assessment[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(!nurseryAssessmentsCache)
  const [isLoadingRegions, setIsLoadingRegions] = useState(true)
  const [isExporting, setIsExporting] = useState(false)

  // Filter states
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRegion, setSelectedRegion] = useState("all")
  const [selectedAssessmentType, setSelectedAssessmentType] = useState("all")
  const [selectedYear, setSelectedYear] = useState("all")

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const isMounted = useRef(true)
  const hasInitiallyLoaded = useRef(!!nurseryAssessmentsCache)

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  // Load regions on mount
  useEffect(() => {
    const loadRegions = async () => {
      setIsLoadingRegions(true)
      try {
        const result = await getRegionsForFilter()
        if (!result.error && result.regions) {
          setRegions(result.regions)
        }
      } catch (err) {
        console.error("Error loading regions:", err)
      } finally {
        setIsLoadingRegions(false)
      }
    }
    loadRegions()
  }, [])

  // Fetch assessments on mount
  useEffect(() => {
    if (!hasInitiallyLoaded.current) {
      fetchAssessments()
    } else {
      // Apply initial filters if we have cached data
      applyFilters(assessments)
    }
  }, [])

  // Apply filters whenever filter values change
  useEffect(() => {
    applyFilters(assessments)
    setCurrentPage(1)
  }, [searchQuery, selectedRegion, selectedAssessmentType, selectedYear, assessments])

  const fetchAssessments = async (forceReload = false) => {
    // Check cache first
    if (!forceReload && nurseryAssessmentsCache &&
        Date.now() - nurseryAssessmentsCache.lastFetched < CACHE_DURATION) {
      setAssessments(nurseryAssessmentsCache.assessments)
      applyFilters(nurseryAssessmentsCache.assessments)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { assessments: data, error: err } = await getAllNurseryAssessments()

      if (!isMounted.current) return

      if (err) {
        setError(err)
        setAssessments([])
      } else {
        setAssessments(data)
        applyFilters(data)
        // Update cache
        nurseryAssessmentsCache = {
          assessments: data,
          lastFetched: Date.now()
        }
      }
    } catch (err) {
      if (isMounted.current) {
        setError("Failed to load assessments")
        setAssessments([])
      }
    } finally {
      if (isMounted.current) {
        setLoading(false)
        hasInitiallyLoaded.current = true
      }
    }
  }

  const applyFilters = (data: Assessment[]) => {
    let filtered = [...data]

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(assessment =>
        assessment.schools?.name?.toLowerCase().includes(query) ||
        assessment.schools?.region?.toLowerCase().includes(query) ||
        assessment.headteacher?.name?.toLowerCase().includes(query)
      )
    }

    // Region filter
    if (selectedRegion !== "all") {
      filtered = filtered.filter(assessment =>
        assessment.schools?.region === selectedRegion
      )
    }

    // Assessment type filter
    if (selectedAssessmentType !== "all") {
      filtered = filtered.filter(assessment =>
        formatAssessmentType(assessment.assessment_type) === selectedAssessmentType
      )
    }

    // Year filter
    if (selectedYear !== "all") {
      filtered = filtered.filter(assessment => {
        const year = new Date(assessment.created_at).getFullYear().toString()
        return year === selectedYear
      })
    }

    setFilteredAssessments(filtered)
  }

  // Function to get assessment type color
  const getAssessmentTypeColor = (assessmentType: string) => {
    if (assessmentType?.includes('assessment-1-year-1')) {
      return 'bg-green-100 dark:bg-green-500/20 text-green-800 dark:text-green-400'
    } else if (assessmentType?.includes('assessment-2-year-2')) {
      return 'bg-orange-100 dark:bg-orange-500/20 text-orange-800 dark:text-orange-400'
    } else if (assessmentType?.includes('assessment-3-year-2')) {
      return 'bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-400'
    }
    return 'bg-gray-100 dark:bg-gray-500/20 text-gray-800 dark:text-gray-400'
  }

  // Function to format assessment type display
  const formatAssessmentType = (assessmentType: string) => {
    if (assessmentType?.includes('assessment-1-year-1')) {
      return 'Assessment 1 - Year 1'
    } else if (assessmentType?.includes('assessment-2-year-2')) {
      return 'Assessment 2 - Year 2'
    } else if (assessmentType?.includes('assessment-3-year-2')) {
      return 'Assessment 3 - Year 2'
    }
    return assessmentType || 'N/A'
  }

  // Get unique assessment types for filters
  const assessmentTypes = [...new Set(assessments.map(a => formatAssessmentType(a.assessment_type)).filter(Boolean))]
  const assessmentYears = [...new Set(assessments.map(a => new Date(a.created_at).getFullYear()).filter(Boolean))].sort((a, b) => b - a)

  // Pagination calculations
  const totalPages = Math.ceil(filteredAssessments.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedAssessments = filteredAssessments.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const handlePageSizeChange = (newPageSize: string) => {
    setPageSize(parseInt(newPageSize))
    setCurrentPage(1)
  }

  const clearAllFilters = () => {
    setSearchQuery("")
    setSelectedRegion("all")
    setSelectedAssessmentType("all")
    setSelectedYear("all")
    setCurrentPage(1)
  }

  const refreshData = () => {
    nurseryAssessmentsCache = null
    fetchAssessments(true)
  }

  const handleExportCSV = async () => {
    if (filteredAssessments.length === 0) {
      toast({ title: "No Data", description: "No assessments to export.", variant: "destructive" })
      return
    }

    setIsExporting(true)
    try {
      const headers = ["School Name", "Region", "Head Teacher", "Email", "Assessment Type", "Enrollment", "Date Submitted"]
      const csvContent = [
        headers.join(","),
        ...filteredAssessments.map(assessment => [
          `"${assessment.schools?.name || ''}"`,
          `"${assessment.schools?.region || ''}"`,
          `"${assessment.headteacher?.name || ''}"`,
          `"${assessment.headteacher?.email || ''}"`,
          `"${formatAssessmentType(assessment.assessment_type)}"`,
          assessment.enrollment || 0,
          `"${new Date(assessment.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}"`
        ].join(","))
      ].join("\n")

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `Nursery_Assessments_${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      URL.revokeObjectURL(url)

      toast({ title: "Export Complete", description: "CSV file downloaded successfully." })
    } catch (err) {
      toast({ title: "Export Error", description: "Failed to export CSV.", variant: "destructive" })
    } finally {
      setIsExporting(false)
    }
  }

  const hasActiveFilters = searchQuery ||
    (selectedRegion && selectedRegion !== "all") ||
    (selectedAssessmentType && selectedAssessmentType !== "all") ||
    (selectedYear && selectedYear !== "all")

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border border-slate-200/80 dark:border-slate-700/50 shadow-sm rounded-xl">
          <CardContent className="p-6">
            <div className="text-center py-8 text-red-600 dark:text-red-400">
              <p>Error loading assessments: {error}</p>
              <Button onClick={refreshData} className="mt-4" variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          Nursery Assessments
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Monitor and review nursery assessments from all schools</p>
      </div>

      {/* Filters Section */}
      <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/50 bg-white dark:bg-[hsl(222,47%,9%)]">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
          {/* Search Input */}
          <Input
            type="text"
            placeholder="Search by school name, region, or head teacher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="sm:w-80 bg-slate-100 dark:bg-slate-800/80 border-0 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg"
          />

          {/* Region Filter */}
          <Select value={selectedRegion} onValueChange={setSelectedRegion}>
            <SelectTrigger className="sm:w-40 bg-slate-100 dark:bg-slate-800/80 border-0 text-slate-900 dark:text-slate-100 rounded-lg">
              <SelectValue placeholder="All Regions" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/50 rounded-lg">
              <SelectItem value="all">All Regions</SelectItem>
              {regions.map((region) => (
                <SelectItem key={region.id} value={region.name}>
                  {region.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Assessment Type Filter */}
          <Select value={selectedAssessmentType} onValueChange={setSelectedAssessmentType}>
            <SelectTrigger className="sm:w-48 bg-slate-100 dark:bg-slate-800/80 border-0 text-slate-900 dark:text-slate-100 rounded-lg">
              <SelectValue placeholder="All Assessment Types" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/50 rounded-lg">
              <SelectItem value="all">All Assessment Types</SelectItem>
              {assessmentTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Year Filter */}
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="sm:w-32 bg-slate-100 dark:bg-slate-800/80 border-0 text-slate-900 dark:text-slate-100 rounded-lg">
              <SelectValue placeholder="All Years" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/50 rounded-lg">
              <SelectItem value="all">All Years</SelectItem>
              {assessmentYears.map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={loading}
            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border-slate-200 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            title="Refresh data"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          {/* Export CSV Button */}
          <Button
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-0 rounded-lg"
            size="sm"
            onClick={handleExportCSV}
            disabled={isExporting || filteredAssessments.length === 0}
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Export CSV
              </>
            )}
          </Button>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border-slate-200 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border border-slate-200/80 dark:border-slate-700/50 shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-0">
          {/* Table */}
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 dark:text-blue-400" />
              <p className="mt-2 text-slate-600 dark:text-slate-400">Loading nursery assessments...</p>
            </div>
          ) : filteredAssessments.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">No Nursery Assessments</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {assessments.length === 0
                  ? "No nursery assessments have been submitted yet."
                  : "No assessments match your current filter criteria."
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 dark:bg-[hsl(222,47%,11%)] border-b border-slate-200/80 dark:border-slate-700/50">
                    <TableHead className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold py-3 px-4">School</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold py-3 px-4">Head Teacher</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold py-3 px-4">Region</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold py-3 px-4">Assessment Type</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold py-3 px-4 text-center">Enrollment</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold py-3 px-4">Date Submitted</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold py-3 px-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAssessments.map((assessment) => (
                    <TableRow
                      key={assessment.id}
                      className="border-b border-slate-200/50 dark:border-slate-700/30 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors"
                    >
                      <TableCell className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-500/15">
                            <School className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-slate-900 dark:text-white">
                              {assessment.schools?.name || 'Unknown School'}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Nursery Level</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                          <div>
                            <p className="font-medium text-sm text-slate-900 dark:text-white">
                              {assessment.headteacher?.name || 'Unknown'}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {assessment.headteacher?.email || ''}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                          <span className="text-sm text-slate-600 dark:text-slate-300">
                            {assessment.schools?.region || 'Unknown'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5 px-4">
                        <Badge
                          className={`text-xs font-medium border-0 whitespace-nowrap rounded-full px-2.5 py-0.5 ${getAssessmentTypeColor(assessment.assessment_type)}`}
                        >
                          {formatAssessmentType(assessment.assessment_type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3.5 px-4 text-center">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          {assessment.enrollment}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">students</span>
                      </TableCell>
                      <TableCell className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                          <Calendar className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                          <span className="text-sm">
                            {new Date(assessment.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5 px-4">
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 text-xs font-medium text-blue-600 dark:text-blue-400 border-slate-200 dark:border-slate-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                        >
                          <Link
                            href={`/dashboard/education-official/nursery-assessment/${assessment.id}`}
                            className="flex items-center gap-1.5"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination Footer */}
          {filteredAssessments.length > 0 && (
            <div className="px-4 py-4 border-t border-slate-200/80 dark:border-slate-700/50 bg-slate-50/50 dark:bg-[hsl(222,47%,8%)]">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Results info and page size */}
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Showing {startIndex + 1}-{Math.min(endIndex, filteredAssessments.length)} of {filteredAssessments.length} assessments
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Show:</span>
                    <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                      <SelectTrigger className="w-16 h-8 text-xs bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/50 rounded-lg">
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="h-8 px-3 text-xs border-slate-200/80 dark:border-slate-700/50 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
                    >
                      Previous
                    </Button>

                    <div className="flex items-center gap-1">
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
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                            className={`h-8 w-8 p-0 text-xs ${
                              currentPage === pageNum
                                ? "bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
                                : "border-slate-200/80 dark:border-slate-700/50 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                            }`}
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="h-8 px-3 text-xs border-slate-200/80 dark:border-slate-700/50 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
