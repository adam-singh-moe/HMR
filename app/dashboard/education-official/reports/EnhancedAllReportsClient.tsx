"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, Loader2, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, X } from "lucide-react"
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
  const [fromDate, setFromDate] = useState("")
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
          fromDate,
          toDate: "",
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
  }, [debouncedSearchTerm, selectedRegionId, selectedSchoolLevel, fromDate, currentPage, pageSize, sortBy, sortOrder])

  // Reset to first page when search or filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1)
    }
  }, [debouncedSearchTerm, selectedRegionId, selectedSchoolLevel, fromDate])

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
        fromDate: fromDate || undefined
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
    setFromDate("")
  }

  const hasActiveFilters = searchTerm || (selectedRegionId && selectedRegionId !== "all") || (selectedSchoolLevel && selectedSchoolLevel !== "all") || fromDate

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
    <div className="space-y-4 lg:space-y-6">
      <Card className="gradient-card border-0 shadow-lg">
        <CardHeader className="pb-3 sm:pb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg sm:text-xl text-primary-700">All Reports</CardTitle>
              <p className="text-sm text-muted-foreground">
                View and manage all submitted reports across the system ({totalCount} reports)
              </p>
            </div>
            <Button 
              variant="outline" 
              className="bg-primary-50 border-primary-200 text-primary-700 hover:bg-primary-100 w-full sm:w-auto" 
              size="sm"
              onClick={handleExportPDF}
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
            {/* First Row - Search */}
            <div className="grid grid-cols-1 gap-4">
              {/* Search Input */}
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search by school name"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Second Row - Additional Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Region Filter */}
              <div>
                <Select value={selectedRegionId || undefined} onValueChange={(value) => setSelectedRegionId(value || "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by region..." />
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
              </div>

              {/* School Level Filter */}
              <div>
                <Select value={selectedSchoolLevel || undefined} onValueChange={(value) => setSelectedSchoolLevel(value || "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by school level..." />
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
              </div>

              {/* From Date Filter */}
              <div>
                <Input
                  type="date"
                  placeholder="From date..."
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
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
                    const reportLink = `/dashboard/reports/view/${report.sms_schools?.id || report.school_id}/${report.month}-${report.year}?back=${encodeURIComponent('/dashboard/education-official/reports')}`
                    
                    return (
                      <ClickableReportRow key={report.id} report={report}>
                        <TableCell className="font-medium">
                          <div>
                            <div className="text-sm">{report.sms_schools?.name || "Unknown School"}</div>
                            <div className="text-xs text-muted-foreground sm:hidden">
                              {report.hmr_users?.name || "Head Teacher"}
                            </div>
                            <div className="text-xs text-muted-foreground lg:hidden">
                              {(() => {
                                const regions = report.sms_schools?.sms_regions as any
                                // Handle both single object and array cases
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
                        <TableCell className="hidden sm:table-cell text-sm">{report.hmr_users?.name || "Head Teacher"}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">
                          {(() => {
                            const regions = report.sms_schools?.sms_regions as any
                            // Handle both single object and array cases
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

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
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
