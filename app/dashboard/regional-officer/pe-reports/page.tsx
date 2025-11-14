"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search, Download, X } from "lucide-react"
import { AuthWrapper, useAuth } from "@/components/auth-wrapper"
import { ClickableReportRow } from "@/components/clickable-report-row"
import { useDebounceValue } from "@/hooks/use-debounced-search"

// Regional PE Reports action - we'll need to create this
import { getRegionalPhysicalEducationReports } from "@/app/actions/education-official-reports"

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

export default function RegionalPEReportsPage() {
  return (
    <AuthWrapper requiredRole="Regional Officer">
      <RegionalPEReportsContent />
    </AuthWrapper>
  )
}

// Export the content component for use in tabs
export { RegionalPEReportsContent }

function RegionalPEReportsContent() {
  const { user } = useAuth()
  const [reports, setReports] = useState<Report[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRegionId, setSelectedRegionId] = useState("")
  const [selectedMonth, setSelectedMonth] = useState("")
  const [selectedYear, setSelectedYear] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Debounce search term
  const debouncedSearchTerm = useDebounceValue(searchTerm, 500)

  // Load initial data
  useEffect(() => {
    loadInitialData()
  }, [])

  // Fetch reports when filters change
  useEffect(() => {
    fetchReports()
  }, [debouncedSearchTerm, selectedRegionId, selectedMonth, selectedYear, currentPage, pageSize])

  // Reset to first page when search or filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1)
    }
  }, [debouncedSearchTerm, selectedRegionId, selectedMonth, selectedYear])

  const loadInitialData = async () => {
    try {
      console.log("Loading initial data for regional PE reports...")
      console.log("User:", user)
      // For regional officer, they can only see their region's data
      // We don't need to load all regions since they're automatically filtered
    } catch (error) {
      console.error("Error loading initial data:", error)
    }
  }

  const fetchReports = async () => {
    setIsLoading(true)
    setError(null)

    try {
      console.log("Fetching PE reports with params:", {
        searchTerm: debouncedSearchTerm,
        selectedRegionId,
        selectedMonth,
        selectedYear,
        currentPage,
        pageSize,
        userRegion: user?.region_name
      })

      // Use the education official reports action but filter by regional officer's region
      const result = await getRegionalPhysicalEducationReports({
        searchTerm: debouncedSearchTerm,
        selectedRegionId: selectedRegionId || "",
        selectedMonth,
        selectedYear,
        page: currentPage,
        pageSize
      })

      console.log("PE Reports result:", result)

      if (result.error) {
        console.error("PE Reports error:", result.error)
        setError(result.error)
        setReports([])
        setTotalCount(0)
        setTotalPages(0)
      } else {
        console.log("PE Reports success:", {
          reportsCount: result.reports?.length || 0,
          totalCount: result.totalCount,
          totalPages: result.totalPages
        })
        setReports(result.reports || [])
        setTotalCount(result.totalCount || 0)
        setTotalPages(result.totalPages || 0)
      }
    } catch (err) {
      console.error("Error fetching PE reports:", err)
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(`Failed to load PE reports: ${errorMessage}`)
      setReports([])
    } finally {
      setIsLoading(false)
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
  }

  const hasActiveFilters = searchTerm || 
    (selectedMonth && selectedMonth !== "all") || 
    (selectedYear && selectedYear !== "all")

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Regional PE Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-red-600">
              <p>Error loading reports: {error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <Card className="gradient-card border-0 shadow-lg">
        <CardHeader className="pb-3 sm:pb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg sm:text-xl text-primary-700">
                Regional PE Reports
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Physical Education reports for {user?.region_name || 'your region'} ({totalCount} reports)
              </p>
            </div>
            <Button 
              variant="outline" 
              className="bg-primary-50 border-primary-200 text-primary-700 hover:bg-primary-100 w-full sm:w-auto" 
              size="sm"
              disabled={isExporting || reports.length === 0}
            >
              {isExporting ? (
                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
              ) : (
                <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              )}
              <span className="hidden sm:inline">
                {isExporting ? 'Generating...' : 'Export CSV'}
              </span>
              <span className="sm:hidden">
                {isExporting ? 'Generating...' : 'Export'}
              </span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {/* Search and Filter Controls */}
          <div className="mb-6 space-y-4">
            {/* All filters in one row */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-3">
              {/* Search Input - Takes more space */}
              <div className="relative lg:col-span-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search by school name"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Month Filter */}
              <div className="lg:col-span-2">
                <Select value={selectedMonth || undefined} onValueChange={(value) => setSelectedMonth(value || "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Month..." />
                  </SelectTrigger>
                  <SelectContent>
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
              </div>

              {/* Year Filter */}
              <div className="lg:col-span-2">
                <Select value={selectedYear || undefined} onValueChange={(value) => setSelectedYear(value || "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Year..." />
                  </SelectTrigger>
                  <SelectContent>
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
              </div>

              {/* Region Info (Read-only for regional officers) */}
              <div className="lg:col-span-2">
                <Input
                  value={user?.region_name || 'Your Region'}
                  disabled
                  className="bg-gray-50 text-gray-600"
                />
              </div>
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear All Filters
                </Button>
              </div>
            )}

            {/* Page Size Selection */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Show:</span>
                <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">per page</span>
              </div>

              {/* Results count */}
              <div className="text-sm text-muted-foreground">
                Showing {Math.min((currentPage - 1) * pageSize + 1, totalCount)} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} results
              </div>
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              <p className="mt-2 text-gray-600">Loading PE reports...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No PE reports found for your region.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>School Name</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="hidden lg:table-cell">Enrollment</TableHead>
                    <TableHead className="hidden md:table-cell w-1/3">Activities</TableHead>
                    <TableHead className="hidden md:table-cell w-1/3">Challenges</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => {
                    return (
                      <ClickableReportRow key={report.id} report={report}>
                        <TableCell className="font-medium">
                          <div>
                            <div className="text-sm font-semibold">{report.school_name || "Unknown School"}</div>
                            <div className="text-xs text-muted-foreground lg:hidden">
                              Enrollment: {report.total_students || 0}
                            </div>
                            <div className="text-xs text-muted-foreground md:hidden mt-1">
                              <div className="mb-1">
                                <span className="font-medium">Activities:</span> {report.activities ? 
                                  (report.activities.length > 50 ? 
                                    report.activities.substring(0, 50) + '...' : 
                                    report.activities
                                  ) : 'None'
                                }
                              </div>
                              <div>
                                <span className="font-medium">Challenges:</span> {report.challenges ? 
                                  (report.challenges.length > 50 ? 
                                    report.challenges.substring(0, 50) + '...' : 
                                    report.challenges
                                  ) : 'None'
                                }
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium text-primary-700">
                            {report.period || `${new Date(report.year, report.month - 1).toLocaleString("default", { month: "long" })} ${report.year}`}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">
                          <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                            {report.total_students || 0} students
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm align-top">
                          <div className="max-w-sm whitespace-normal break-words min-h-[80px] p-2 bg-gray-50 rounded-md">
                            {report.activities ? 
                              report.activities : 
                              <span className="text-muted-foreground italic">No activities listed</span>
                            }
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm align-top">
                          <div className="max-w-sm whitespace-normal break-words min-h-[80px] p-2 bg-gray-50 rounded-md">
                            {report.challenges ? 
                              report.challenges : 
                              <span className="text-muted-foreground italic">No challenges listed</span>
                            }
                          </div>
                        </TableCell>
                      </ClickableReportRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="border-primary-200 text-primary-700 hover:bg-primary-50"
                >
                  Previous
                </Button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
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
                        className={`w-10 ${
                          currentPage === pageNum 
                            ? "bg-primary-600 text-white hover:bg-primary-700" 
                            : "border-primary-200 text-primary-700 hover:bg-primary-50"
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
                  className="border-primary-200 text-primary-700 hover:bg-primary-50"
                >
                  Next
                </Button>
              </div>

              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}