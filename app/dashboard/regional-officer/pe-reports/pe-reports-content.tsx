"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2, Download, X, RefreshCw, ChevronRight } from "lucide-react"
import { useAuth } from "@/components/auth-wrapper"
import { useDebounceValue } from "@/hooks/use-debounced-search"
import { getRegionalPhysicalEducationReports } from "@/app/actions/education-official-reports"
import { PEReportDialog } from "@/components/pe-report-dialog"

interface Report {
  id: any
  school_id: any
  month: any
  year: any
  status: any
  created_at: any
  updated_at: any
  school_name?: string
  region_name?: string
  period?: string
  total_students?: number
  activities?: string
  challenges?: string
}

interface Region {
  id: string
  name: string
}

// Cache for PE reports data - persists across component remounts
let peReportsCache: {
  reports: Report[]
  totalCount: number
  totalPages: number
  lastFetched: number
  searchTerm: string
  month: string
  year: string
  page: number
  pageSize: number
} | null = null

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes cache

// Track if we've done initial load (persists across remounts)
let hasInitiallyLoaded = false

export function RegionalPEReportsContent() {
  const { user } = useAuth()
  const [reports, setReports] = useState<Report[]>(peReportsCache?.reports || [])
  const [regions, setRegions] = useState<Region[]>([])
  const [searchTerm, setSearchTerm] = useState(peReportsCache?.searchTerm || "")
  const [selectedRegionId, setSelectedRegionId] = useState("")
  const [selectedMonth, setSelectedMonth] = useState(peReportsCache?.month || "")
  const [selectedYear, setSelectedYear] = useState(peReportsCache?.year || "")
  const [currentPage, setCurrentPage] = useState(peReportsCache?.page || 1)
  const [pageSize, setPageSize] = useState(peReportsCache?.pageSize || 10)
  const [totalCount, setTotalCount] = useState(peReportsCache?.totalCount || 0)
  const [totalPages, setTotalPages] = useState(peReportsCache?.totalPages || 0)
  const [isLoading, setIsLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const isMounted = useRef(true)
  const isFirstRender = useRef(true)

  // Debounce search term
  const debouncedSearchTerm = useDebounceValue(searchTerm, 500)

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  // Check if cache is valid for current filters
  const isCacheValid = useCallback(() => {
    if (!peReportsCache) return false
    const now = Date.now()
    const isExpired = now - peReportsCache.lastFetched > CACHE_DURATION
    const filtersMatch = 
      peReportsCache.searchTerm === debouncedSearchTerm &&
      peReportsCache.month === selectedMonth &&
      peReportsCache.year === selectedYear &&
      peReportsCache.page === currentPage &&
      peReportsCache.pageSize === pageSize
    return !isExpired && filtersMatch
  }, [debouncedSearchTerm, selectedMonth, selectedYear, currentPage, pageSize])

  // Initial load - only fetch if no valid cache exists
  useEffect(() => {
    // If we have valid cache data, skip fetching
    if (peReportsCache && isCacheValid()) {
      hasInitiallyLoaded = true
      return
    }
    
    // If no cache, fetch data
    if (!hasInitiallyLoaded) {
      hasInitiallyLoaded = true
      fetchReports()
    }
  }, [])

  // Fetch reports when filters change (skip first render if cache is valid)
  useEffect(() => {
    // Skip the very first render
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    
    // If cache is still valid for these filters, don't refetch
    if (isCacheValid()) {
      return
    }
    
    fetchReports()
  }, [debouncedSearchTerm, selectedRegionId, selectedMonth, selectedYear, currentPage, pageSize])

  // Reset to first page when search or filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1)
    }
  }, [debouncedSearchTerm, selectedRegionId, selectedMonth, selectedYear])

  const fetchReports = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Use the education official reports action but filter by regional officer's region
      const result = await getRegionalPhysicalEducationReports({
        searchTerm: debouncedSearchTerm,
        selectedRegionId: selectedRegionId || "",
        selectedMonth,
        selectedYear,
        page: currentPage,
        pageSize
      })

      // Only update state if component is still mounted
      if (!isMounted.current) return

      if (result.error) {
        console.error("PE Reports error:", result.error)
        setError(result.error)
        setReports([])
        setTotalCount(0)
        setTotalPages(0)
      } else {
        const newReports = (result.reports as any[]) || []
        const newTotalCount = result.totalCount || 0
        const newTotalPages = result.totalPages || 0
        
        setReports(newReports)
        setTotalCount(newTotalCount)
        setTotalPages(newTotalPages)
        
        // Update cache
        peReportsCache = {
          reports: newReports,
          totalCount: newTotalCount,
          totalPages: newTotalPages,
          lastFetched: Date.now(),
          searchTerm: debouncedSearchTerm,
          month: selectedMonth,
          year: selectedYear,
          page: currentPage,
          pageSize: pageSize
        }
      }
    } catch (err) {
      if (!isMounted.current) return
      console.error("Error fetching PE reports:", err)
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(`Failed to load PE reports: ${errorMessage}`)
      setReports([])
    } finally {
      if (isMounted.current) {
        setIsLoading(false)
      }
    }
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
    }
  }

  const handlePageSizeChange = (newPageSize: string) => {
    setPageSize(parseInt(newPageSize))
    setCurrentPage(1)
  }

  const clearAllFilters = () => {
    setSearchTerm("")
    setSelectedRegionId("")
    setSelectedMonth("")
    setSelectedYear("")
    setCurrentPage(1)
    // Clear cache when filters are cleared
    peReportsCache = null
    hasInitiallyLoaded = false
  }

  const refreshData = () => {
    // Clear cache and refetch
    peReportsCache = null
    hasInitiallyLoaded = false
    fetchReports()
  }

  const hasActiveFilters = searchTerm || 
    (selectedMonth && selectedMonth !== "all") || 
    (selectedYear && selectedYear !== "all")

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border border-slate-200/80 dark:border-slate-700/50 shadow-sm rounded-xl">
          <CardHeader>
            <CardTitle className="text-slate-900 dark:text-white">Regional PE Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-red-600 dark:text-red-400">
              <p>Error loading reports: {error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Filters Section */}
      <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/50 bg-white dark:bg-[hsl(222,47%,9%)]">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
          {/* Search Input */}
          <Input
            type="text"
            placeholder="Search schools..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="sm:w-48 bg-slate-100 dark:bg-slate-800/80 border-0 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg"
          />

          {/* Month Filter */}
          <Select value={selectedMonth || undefined} onValueChange={(value) => setSelectedMonth(value || "")}>
            <SelectTrigger className="sm:w-36 bg-slate-100 dark:bg-slate-800/80 border-0 text-slate-900 dark:text-slate-100 rounded-lg">
              <SelectValue placeholder="All Months" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/50 rounded-lg">
              <SelectItem value="all">All Months</SelectItem>
              <SelectItem value="1">January</SelectItem>
              <SelectItem value="2">February</SelectItem>
              <SelectItem value="3">March</SelectItem>
              <SelectItem value="4">April</SelectItem>
              <SelectItem value="5">May</SelectItem>
              <SelectItem value="6">June</SelectItem>
              <SelectItem value="7">July</SelectItem>
              <SelectItem value="8">August</SelectItem>
              <SelectItem value="9">September</SelectItem>
              <SelectItem value="10">October</SelectItem>
              <SelectItem value="11">November</SelectItem>
              <SelectItem value="12">December</SelectItem>
            </SelectContent>
          </Select>

          {/* Year Filter */}
          <Select value={selectedYear || undefined} onValueChange={(value) => setSelectedYear(value || "")}>
            <SelectTrigger className="sm:w-32 bg-slate-100 dark:bg-slate-800/80 border-0 text-slate-900 dark:text-slate-100 rounded-lg">
              <SelectValue placeholder="All Years" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/50 rounded-lg">
              <SelectItem value="all">All Years</SelectItem>
              {Array.from({ length: 10 }, (_, i) => {
                const year = new Date().getFullYear() - i
                return (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>

          {/* Region Info (Read-only for regional officers) */}
          <Input
            value={user?.region_name || 'Your Region'}
            disabled
            className="sm:w-32 bg-slate-100 dark:bg-slate-800/50 border-0 text-slate-500 dark:text-slate-400 rounded-lg"
          />

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={isLoading}
            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border-slate-200 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            title="Refresh data"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>

          {/* Export CSV Button */}
          <Button
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-0 rounded-lg"
            size="sm"
            disabled={isExporting || reports.length === 0}
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
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
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 dark:text-blue-400" />
              <p className="mt-2 text-slate-600 dark:text-slate-400">Loading PE reports...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500 dark:text-slate-400">No PE reports found for your region.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 dark:bg-[hsl(222,47%,11%)] border-b border-slate-200/80 dark:border-slate-700/50">
                    <TableHead className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold py-3 px-4">School Name</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold py-3 px-4">Period</TableHead>
                    <TableHead className="hidden lg:table-cell text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold text-center w-24 py-3 px-4">Students</TableHead>
                    <TableHead className="hidden md:table-cell text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold py-3 px-4">Activities</TableHead>
                    <TableHead className="hidden md:table-cell text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold py-3 px-4">Challenges</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold py-3 px-4 w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => {
                    return (
                      <TableRow
                        key={report.id}
                        onClick={() => {
                          setSelectedReport(report)
                          setDialogOpen(true)
                        }}
                        className="cursor-pointer border-b border-slate-200/50 dark:border-slate-700/30 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors group"
                      >
                        <TableCell className="font-medium py-3.5 px-4">
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{report.school_name || "Unknown School"}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 lg:hidden">
                            {report.total_students || 0} students
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5 px-4">
                          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                            {report.period || `${new Date(report.year, report.month - 1).toLocaleString("default", { month: "long" })} ${report.year}`}
                          </span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-center py-3.5 px-4">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{report.total_students || 0}</span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm py-3.5 px-4 max-w-[280px]">
                          <p className="text-slate-600 dark:text-slate-400 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {report.activities || <span className="italic text-slate-400 dark:text-slate-500">None listed</span>}
                          </p>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm py-3.5 px-4 max-w-[280px]">
                          <p className="text-slate-600 dark:text-slate-400 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {report.challenges || <span className="italic text-slate-400 dark:text-slate-500">None listed</span>}
                          </p>
                        </TableCell>
                        <TableCell className="py-3.5 px-4">
                          <ChevronRight className="h-4 w-4 text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination Footer */}
          <div className="px-4 py-4 border-t border-slate-200/80 dark:border-slate-700/50 bg-slate-50/50 dark:bg-[hsl(222,47%,8%)]">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Results info and page size */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalCount)} of {totalCount} reports
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
        </CardContent>
      </Card>

      {/* PE Report Detail Dialog */}
      <PEReportDialog 
        report={selectedReport} 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
      />
    </div>
  )
}
