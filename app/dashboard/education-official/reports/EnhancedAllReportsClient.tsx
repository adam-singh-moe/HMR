"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, Loader2, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, X, FileText, Filter } from "lucide-react"
import Link from "next/link"
import { getSubmittedReportsWithSearchAndPagination, getSchoolsForSearch, getRegionsForFilter, getSchoolLevelsForFilter } from "@/app/actions/education-official-reports"
import { generateReportsPDF } from "@/app/actions/export-reports"
import { ClickableReportRow } from "@/components/clickable-report-row"
import { useDebounceValue } from "@/hooks/use-debounced-search"

interface Report {
  id: any
  school_id: any
  month: any
  year: any
  status: any
  updated_at: any
  created_at: any
  headteacher_id: any
  school_name?: string
  region?: string
  head_teacher_name?: string
  sms_schools?: { 
    id: any
    name: any
    region_id: any
    sms_regions?: {
      id: any
      name: any
    } | {
      id: any
      name: any
    }[]
  } | null
  hmr_users?: {
    id: any
    name: any
    email: any
  } | null
}

interface School {
  id: string
  name: string
  region_id?: string
  region_name?: string
  sms_regions?: {
    id: string
    name: string
  } | {
    id: string
    name: string
  }[]
}

interface Region {
  id: string
  name: string
}

interface SchoolLevel {
  id: string
  name: string
}

interface EnhancedAllReportsClientProps {
  initialReports: Report[]
  initialTotalCount: number
  initialTotalPages: number
  initialSchools: School[]
  initialRegions: Region[]
  initialSchoolLevels: SchoolLevel[]
}

export default function EnhancedAllReportsClient({
  initialReports,
  initialTotalCount,
  initialTotalPages,
  initialSchools,
  initialRegions,
  initialSchoolLevels
}: EnhancedAllReportsClientProps) {
  const [reports, setReports] = useState<Report[]>(initialReports)
  const [schools, setSchools] = useState<School[]>(initialSchools)
  const [regions, setRegions] = useState<Region[]>(initialRegions)
  const [schoolLevels, setSchoolLevels] = useState<SchoolLevel[]>(initialSchoolLevels)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRegionId, setSelectedRegionId] = useState("")
  const [selectedSchoolLevel, setSelectedSchoolLevel] = useState("")
  const [selectedMonth, setSelectedMonth] = useState("")
  const [selectedYear, setSelectedYear] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [totalCount, setTotalCount] = useState(initialTotalCount)
  const [totalPages, setTotalPages] = useState(initialTotalPages)
  const [sortBy, setSortBy] = useState("updated_at")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [isLoading, setIsLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Debounce search term
  const debouncedSearchTerm = useDebounceValue(searchTerm, 500)

  // Fetch reports when filters change
  useEffect(() => {
    async function fetchReports() {
      setIsLoading(true)
      try {
        const result = await getSubmittedReportsWithSearchAndPagination({
          searchTerm: debouncedSearchTerm,
          selectedSchoolId: "",
          selectedRegionId,
          selectedSchoolLevel,
          selectedMonth,
          selectedYear,
          page: currentPage,
          pageSize,
          sortBy,
          sortOrder
        })

        if (result.error) {
          setError(result.error)
        } else {
          setReports((result.reports || []) as Report[])
          setTotalCount(result.totalCount || 0)
          setTotalPages(result.totalPages || 0)
          setError(null)
        }
      } catch (err) {
        setError('Failed to load reports')
      } finally {
        setIsLoading(false)
      }
    }

    fetchReports()
  }, [debouncedSearchTerm, selectedRegionId, selectedSchoolLevel, selectedMonth, selectedYear, currentPage, pageSize, sortBy, sortOrder])

  // Reset to first page when search or filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1)
    }
  }, [debouncedSearchTerm, selectedRegionId, selectedSchoolLevel, selectedMonth, selectedYear])

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(column)
      setSortOrder("asc")
    }
  }

  const getSortIcon = (column: string) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="h-4 w-4" />
    }
    return sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
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

  const handleExportPDF = async () => {
    try {
      setIsExporting(true)
      
      // Pass current filters to the export function
      const currentFilters = {
        searchTerm: searchTerm,
        selectedRegionId: selectedRegionId && selectedRegionId !== "all" ? selectedRegionId : undefined,
        selectedSchoolLevel: selectedSchoolLevel && selectedSchoolLevel !== "all" ? selectedSchoolLevel : undefined,
        selectedMonth: selectedMonth && selectedMonth !== "all" ? selectedMonth : undefined,
        selectedYear: selectedYear && selectedYear !== "all" ? selectedYear : undefined
      }
      
      const result = await generateReportsPDF(currentFilters)
      
      if (result.success && result.htmlContent) {
        // Create a new window with the HTML content optimized for PDF
        const printWindow = window.open('', '_blank', 'width=1024,height=768')
        if (printWindow) {
          printWindow.document.write(result.htmlContent)
          printWindow.document.close()
          
          // Wait for content to load then trigger print with PDF settings
          printWindow.onload = () => {
            setTimeout(() => {
              // This will open the browser's print dialog with PDF as default destination
              printWindow.print()
              
              // Show instructions to user
              alert(`Report ready for download! ${result.reportCount || reports.length} reports generated.\n\nIn the print dialog:\n1. Select "Save as PDF" as destination\n2. Choose landscape orientation for better view\n3. Click Save to download`)
              
              // Close the window after a delay to allow printing
              setTimeout(() => {
                printWindow.close()
              }, 1000)
            }, 1000)
          }
        }
      } else {
        alert(`Export failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export reports. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const clearAllFilters = () => {
    setSearchTerm("")
    setSelectedRegionId("")
    setSelectedSchoolLevel("")
    setSelectedMonth("")
    setSelectedYear("")
  }

  const hasActiveFilters = searchTerm || (selectedRegionId && selectedRegionId !== "all") || (selectedSchoolLevel && selectedSchoolLevel !== "all") || (selectedMonth && selectedMonth !== "all") || (selectedYear && selectedYear !== "all")

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>All Reports</CardTitle>
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-blue-600 flex items-center gap-2">
            <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
            All Reports
          </h1>
          <p className="text-gray-600 text-sm sm:text-base mt-1">
            View and manage all submitted reports across the system ({totalCount} reports)
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 flex-shrink-0">
              <Filter className="h-4 w-4" />
              <span className="font-medium">Filters:</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <div className="relative sm:max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search by school name"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedRegionId || undefined} onValueChange={(value) => setSelectedRegionId(value || "")}>
                <SelectTrigger className="sm:w-48">
                  <SelectValue placeholder="All Regions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  {regions.map((region) => (
                    <SelectItem key={region.id} value={region.id}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedSchoolLevel || undefined} onValueChange={(value) => setSelectedSchoolLevel(value || "")}>
                <SelectTrigger className="sm:w-48">
                  <SelectValue placeholder="All Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  {schoolLevels.map((level) => (
                    <SelectItem key={level.id} value={level.id}>
                      {level.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedMonth || undefined} onValueChange={(value) => setSelectedMonth(value || "")}>
                <SelectTrigger className="sm:w-48">
                  <SelectValue placeholder="All Months" />
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
              <Select value={selectedYear || undefined} onValueChange={(value) => setSelectedYear(value || "")}>
                <SelectTrigger className="sm:w-40">
                  <SelectValue placeholder="All Years" />
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
            <Button 
              onClick={handleExportPDF}
              disabled={isExporting || reports.length === 0}
              className="flex items-center gap-2 flex-shrink-0"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </>
              )}
            </Button>
          </div>
          
          {/* Clear Filters */}
          {hasActiveFilters && (
            <div className="flex justify-end mt-4">
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
        </CardContent>
      </Card>

      <Card className="gradient-card border-0 shadow-lg">
        <CardContent className="p-0">
          {/* Table */}
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              <p className="mt-2 text-gray-600">Loading reports...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No reports found matching your search criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("school_name")}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        School
                        {getSortIcon("school_name")}
                      </Button>
                    </TableHead>
                    <TableHead className="hidden sm:table-cell">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("teacher_name")}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        Head Teacher
                        {getSortIcon("teacher_name")}
                      </Button>
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">Region</TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("month_year")}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        Month & Year
                        {getSortIcon("month_year")}
                      </Button>
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("updated_at")}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        Date Submitted
                        {getSortIcon("updated_at")}
                      </Button>
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">Status</TableHead>
                    <TableHead className="text-right w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => {
                    const reportLink = `/dashboard/reports/view/${report.school_id}/${report.month}-${report.year}?back=${encodeURIComponent('/dashboard/education-official/reports')}`
                    
                    return (
                      <ClickableReportRow key={report.id} report={report}>
                        <TableCell className="font-medium">
                          <div>
                            <div className="text-sm">{report.school_name || "Unknown School"}</div>
                            <div className="text-xs text-muted-foreground sm:hidden">
                              {report.head_teacher_name || "Head Teacher"}
                            </div>
                            <div className="text-xs text-muted-foreground lg:hidden">
                              {(() => {
                                // Try the flattened region field first
                                if (report.region && report.region !== "Unknown Region") {
                                  return report.region
                                }
                                
                                // Fall back to nested structure
                                const regions = report.sms_schools?.sms_regions as any
                                if (Array.isArray(regions)) {
                                  return regions[0]?.name || "Unknown Region"
                                } else {
                                  return regions?.name || "Unknown Region"
                                }
                              })()}
                            </div>
                            <div className="text-xs text-muted-foreground md:hidden">
                              Submitted: {new Date(report.updated_at).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </div>
                            <div className="lg:hidden mt-1">
                              <Badge variant="default" className="text-xs">
                                {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm">{report.head_teacher_name || "Head Teacher"}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">
                          {(() => {
                            // Try the flattened region field first
                            if (report.region && report.region !== "Unknown Region") {
                              return report.region
                            }
                            
                            // Fall back to nested structure
                            const regions = report.sms_schools?.sms_regions as any
                            if (Array.isArray(regions)) {
                              return regions[0]?.name || "Unknown Region"
                            } else {
                              return regions?.name || "Unknown Region"
                            }
                          })()}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">
                            {new Date(report.year, report.month - 1).toLocaleString("default", { month: "long" })} {report.year}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {new Date(report.updated_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Badge variant="default" className="text-xs">
                            {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="outline" size="sm" className="border-primary-200 text-primary-700 hover:bg-primary-50 bg-transparent">
                            <Link href={reportLink}>
                              <span className="hidden sm:inline">View Report</span>
                              <span className="sm:hidden">View</span>
                            </Link>
                          </Button>
                        </TableCell>
                      </ClickableReportRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination and Page Size Controls */}
          <div className="mt-6 px-4 sm:px-6 pb-4 sm:pb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Page Size Control */}
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

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
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
                        className="w-10"
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
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Page Info */}
            <div className="text-sm text-muted-foreground">
              {totalPages > 1 ? `Page ${currentPage} of ${totalPages}` : `${totalCount} results`}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
