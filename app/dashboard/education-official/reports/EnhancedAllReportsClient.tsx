"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, Loader2, Search, ArrowUpDown, ArrowUp, ArrowDown, X, FileText, Filter, Eye, RefreshCw } from "lucide-react"
import Link from "next/link"
import { getSubmittedReportsWithSearchAndPagination } from "@/app/actions/education-official-reports"
import { generateReportsPDF } from "@/app/actions/export-reports"
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
  const [regions] = useState<Region[]>(initialRegions)
  const [schoolLevels] = useState<SchoolLevel[]>(initialSchoolLevels)
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
      return <ArrowUpDown className="h-3.5 w-3.5 ml-1" />
    }
    return sortOrder === "asc" ? <ArrowUp className="h-3.5 w-3.5 ml-1" /> : <ArrowDown className="h-3.5 w-3.5 ml-1" />
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

  const handleExportCSV = async () => {
    try {
      setIsExporting(true)

      const currentFilters = {
        searchTerm: searchTerm,
        selectedRegionId: selectedRegionId && selectedRegionId !== "all" ? selectedRegionId : undefined,
        selectedSchoolLevel: selectedSchoolLevel && selectedSchoolLevel !== "all" ? selectedSchoolLevel : undefined,
        selectedMonth: selectedMonth && selectedMonth !== "all" ? selectedMonth : undefined,
        selectedYear: selectedYear && selectedYear !== "all" ? selectedYear : undefined
      }

      const result = await generateReportsPDF(currentFilters)

      if (result.success && result.htmlContent) {
        const printWindow = window.open('', '_blank', 'width=1024,height=768')
        if (printWindow) {
          printWindow.document.write(result.htmlContent)
          printWindow.document.close()

          printWindow.onload = () => {
            setTimeout(() => {
              printWindow.print()
              alert(`Report ready for download! ${result.reportCount || reports.length} reports generated.\n\nIn the print dialog:\n1. Select "Save as PDF" as destination\n2. Choose landscape orientation for better view\n3. Click Save to download`)

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

  const getRegionName = (report: Report) => {
    if (report.region && report.region !== "Unknown Region") {
      return report.region
    }
    const regions = report.sms_schools?.sms_regions as any
    if (Array.isArray(regions)) {
      return regions[0]?.name || "Unknown"
    } else {
      return regions?.name || "Unknown"
    }
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border border-slate-200/80 dark:border-slate-700/50 shadow-sm rounded-xl">
          <CardContent className="p-6">
            <div className="text-center py-8 text-red-600 dark:text-red-400">
              <p>Error loading reports: {error}</p>
              <Button onClick={() => window.location.reload()} className="mt-4" variant="outline">
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
          <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          All Reports
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
          View and manage all submitted reports across the system ({totalCount} reports)
        </p>
      </div>

      {/* Filters Section */}
      <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/50 bg-white dark:bg-[hsl(222,47%,9%)]">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
          {/* Filter Label */}
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 flex-shrink-0">
            <Filter className="h-4 w-4" />
            <span className="font-medium">Filters:</span>
          </div>

          {/* Search Input */}
          <div className="relative sm:w-56">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search by school name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-100 dark:bg-slate-800/80 border-0 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg"
            />
          </div>

          {/* Region Filter */}
          <Select value={selectedRegionId || "all"} onValueChange={(value) => setSelectedRegionId(value === "all" ? "" : value)}>
            <SelectTrigger className="sm:w-40 bg-slate-100 dark:bg-slate-800/80 border-0 text-slate-900 dark:text-slate-100 rounded-lg">
              <SelectValue placeholder="All Regions" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/50 rounded-lg">
              <SelectItem value="all">All Regions</SelectItem>
              {regions.map((region) => (
                <SelectItem key={region.id} value={region.id}>
                  {region.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* School Level Filter */}
          <Select value={selectedSchoolLevel || "all"} onValueChange={(value) => setSelectedSchoolLevel(value === "all" ? "" : value)}>
            <SelectTrigger className="sm:w-36 bg-slate-100 dark:bg-slate-800/80 border-0 text-slate-900 dark:text-slate-100 rounded-lg">
              <SelectValue placeholder="All Levels" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/50 rounded-lg">
              <SelectItem value="all">All Levels</SelectItem>
              {schoolLevels.map((level) => (
                <SelectItem key={level.id} value={level.id}>
                  {level.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Month Filter */}
          <Select value={selectedMonth || "all"} onValueChange={(value) => setSelectedMonth(value === "all" ? "" : value)}>
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
          <Select value={selectedYear || "all"} onValueChange={(value) => setSelectedYear(value === "all" ? "" : value)}>
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

          {/* Export Button */}
          <Button
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-0 rounded-lg"
            size="sm"
            onClick={handleExportCSV}
            disabled={isExporting || reports.length === 0}
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
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 dark:text-blue-400" />
              <p className="mt-2 text-slate-600 dark:text-slate-400">Loading reports...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">No Reports Found</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No reports match your current filter criteria.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 dark:bg-[hsl(222,47%,11%)] border-b border-slate-200/80 dark:border-slate-700/50">
                    <TableHead className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold py-3 px-4">
                      <button
                        onClick={() => handleSort("school_name")}
                        className="flex items-center hover:text-slate-700 dark:hover:text-slate-200"
                      >
                        School
                        {getSortIcon("school_name")}
                      </button>
                    </TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold py-3 px-4">
                      <button
                        onClick={() => handleSort("teacher_name")}
                        className="flex items-center hover:text-slate-700 dark:hover:text-slate-200"
                      >
                        Head Teacher
                        {getSortIcon("teacher_name")}
                      </button>
                    </TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold py-3 px-4">
                      Region
                    </TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold py-3 px-4">
                      <button
                        onClick={() => handleSort("month_year")}
                        className="flex items-center hover:text-slate-700 dark:hover:text-slate-200"
                      >
                        Month & Year
                        {getSortIcon("month_year")}
                      </button>
                    </TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold py-3 px-4">
                      <button
                        onClick={() => handleSort("updated_at")}
                        className="flex items-center hover:text-slate-700 dark:hover:text-slate-200"
                      >
                        Date Submitted
                        {getSortIcon("updated_at")}
                      </button>
                    </TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold py-3 px-4">
                      Status
                    </TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold py-3 px-4">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => {
                    const reportLink = `/dashboard/reports/view/${report.school_id}/${report.month}-${report.year}?back=${encodeURIComponent('/dashboard/education-official/reports')}`

                    return (
                      <TableRow
                        key={report.id}
                        className="border-b border-slate-200/50 dark:border-slate-700/30 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors cursor-pointer"
                        onClick={() => window.location.href = reportLink}
                      >
                        <TableCell className="py-3.5 px-4">
                          <p className="font-semibold text-sm text-slate-900 dark:text-white">
                            {report.school_name || "Unknown School"}
                          </p>
                        </TableCell>
                        <TableCell className="py-3.5 px-4">
                          <p className="text-sm text-slate-600 dark:text-slate-300">
                            {report.head_teacher_name || "Unknown"}
                          </p>
                        </TableCell>
                        <TableCell className="py-3.5 px-4">
                          <span className="text-sm text-slate-600 dark:text-slate-300">
                            {getRegionName(report)}
                          </span>
                        </TableCell>
                        <TableCell className="py-3.5 px-4">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {new Date(report.year, report.month - 1).toLocaleString("default", { month: "long" })} {report.year}
                          </span>
                        </TableCell>
                        <TableCell className="py-3.5 px-4">
                          <span className="text-sm text-slate-600 dark:text-slate-300">
                            {new Date(report.updated_at).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </TableCell>
                        <TableCell className="py-3.5 px-4">
                          <Badge className="text-xs font-medium border-0 whitespace-nowrap rounded-full px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400">
                            {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-8 px-3 text-xs font-medium text-blue-600 dark:text-blue-400 border-slate-200 dark:border-slate-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                          >
                            <Link href={reportLink} className="flex items-center gap-1.5">
                              <Eye className="h-3.5 w-3.5" />
                              View Report
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination Footer */}
          {reports.length > 0 && (
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
