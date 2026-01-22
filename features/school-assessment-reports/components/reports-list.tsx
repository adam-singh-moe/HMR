"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Search, 
  MoreHorizontal, 
  Eye, 
  Download, 
  Trash2,
  ChevronLeft, 
  ChevronRight,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUpDown,
  Trophy,
} from "lucide-react"
import { 
  RatingLevel, 
  TAPSRatingGrade,
  RATING_THRESHOLDS,
} from "../types"
import { getRatingGrade, assignTAPSRatingGrade } from "../actions/scoring"
import { UnifiedRatingBadge } from "./unified-rating-badge"

// ============================================================================
// TYPES
// ============================================================================

interface AssessmentReport {
  id: string
  schoolId: string
  schoolName: string
  regionName?: string
  status: 'draft' | 'submitted' | 'expired_draft'
  totalScore: number | null
  ratingLevel: RatingLevel | null
  submittedAt: string | null
  createdAt: string
  updatedAt: string
  academicYear?: string
  termName?: string
  // TAPS fields for secondary schools
  isTAPS?: boolean
  tapsRatingGrade?: TAPSRatingGrade | null
}

interface ReportsListProps {
  reports: AssessmentReport[]
  onViewReport: (reportId: string) => void
  onExportReport?: (reportId: string, format: 'pdf' | 'excel') => void
  onDeleteReport?: (reportId: string, report?: AssessmentReport) => void
  showSchoolColumn?: boolean
  showRegionColumn?: boolean
  showActions?: boolean
  emptyMessage?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STATUS_CONFIG = {
  draft: {
    label: 'Draft',
    className: 'bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-500/30',
    icon: <Clock className="h-3 w-3" />,
  },
  submitted: {
    label: 'Submitted',
    className: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30',
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  expired_draft: {
    label: 'Expired',
    className: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30',
    icon: <XCircle className="h-3 w-3" />,
  },
}

const RATING_BADGE_COLORS: Record<RatingLevel, string> = {
  'outstanding': 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30',
  'very_good': 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30',
  'good': 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30',
  'satisfactory': 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/30',
  'needs_improvement': 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30',
}

// Display labels for ratings
const RATING_DISPLAY_LABELS: Record<RatingLevel, string> = {
  'outstanding': 'Outstanding',
  'very_good': 'Very Good',
  'good': 'Good',
  'satisfactory': 'Satisfactory',
  'needs_improvement': 'Needs Improvement',
}

// TAPS Grade badge colors for secondary schools
const TAPS_GRADE_BADGE_COLORS: Record<TAPSRatingGrade, string> = {
  'A': 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30',
  'B': 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30',
  'C': 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30',
  'D': 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/30',
  'E': 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30',
}

// TAPS Grade display labels
const TAPS_GRADE_DISPLAY_LABELS: Record<TAPSRatingGrade, string> = {
  'A': 'Grade A - Outstanding',
  'B': 'Grade B - High Achieving',
  'C': 'Grade C - Standard',
  'D': 'Grade D - Struggling',
  'E': 'Grade E - Critical',
}

// ============================================================================
// HELPERS
// ============================================================================

function formatDate(dateString: string | null): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ReportsList({
  reports,
  onViewReport,
  onExportReport,
  onDeleteReport,
  showSchoolColumn = true,
  showRegionColumn = false,
  showActions = true,
  emptyMessage = "No assessment reports found.",
}: ReportsListProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [ratingFilter, setRatingFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, ratingFilter])

  // Filter reports
  const filteredReports = reports.filter(report => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch = 
        report.schoolName.toLowerCase().includes(searchLower) ||
        (report.regionName && report.regionName.toLowerCase().includes(searchLower))
      if (!matchesSearch) return false
    }

    // Status filter
    if (statusFilter !== "all" && report.status !== statusFilter) {
      return false
    }

    // Rating filter
    if (ratingFilter !== "all" && report.ratingLevel !== ratingFilter) {
      return false
    }

    return true
  })

  // Pagination
  const totalPages = Math.ceil(filteredReports.length / pageSize)
  const paginatedReports = filteredReports.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  if (reports.length === 0) {
    return (
      <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border-slate-200/80 dark:border-slate-700/50">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-slate-400 dark:text-slate-500 mb-4" />
          <p className="text-slate-500 dark:text-slate-400">{emptyMessage}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border-slate-200/80 dark:border-slate-700/50">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-slate-900 dark:text-white">Assessment Reports</CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">
              {filteredReports.length} of {reports.length} reports
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <Input
              placeholder="Search by school or region..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-white dark:bg-[hsl(222,47%,11%)] border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[150px] bg-white dark:bg-[hsl(222,47%,11%)] border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-[hsl(222,47%,11%)] border-slate-200 dark:border-slate-700">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="expired_draft">Expired</SelectItem>
            </SelectContent>
          </Select>
          <Select value={ratingFilter} onValueChange={setRatingFilter}>
            <SelectTrigger className="w-full sm:w-[180px] bg-white dark:bg-[hsl(222,47%,11%)] border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
              <SelectValue placeholder="Rating" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-[hsl(222,47%,11%)] border-slate-200 dark:border-slate-700">
              <SelectItem value="all">All Ratings</SelectItem>
              <SelectItem value="Outstanding">Outstanding</SelectItem>
              <SelectItem value="Very Good">Very Good</SelectItem>
              <SelectItem value="Good">Good</SelectItem>
              <SelectItem value="Satisfactory">Satisfactory</SelectItem>
              <SelectItem value="Needs Improvement">Needs Improvement</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-[hsl(222,47%,8%)] border-b border-slate-200/80 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-[hsl(222,47%,8%)]">
                {showSchoolColumn && <TableHead className="text-slate-600 dark:text-slate-400 font-semibold">School</TableHead>}
                {showRegionColumn && <TableHead className="text-slate-600 dark:text-slate-400 font-semibold">Region</TableHead>}
                <TableHead className="text-slate-600 dark:text-slate-400 font-semibold">Status</TableHead>
                <TableHead className="text-slate-600 dark:text-slate-400 font-semibold">Term</TableHead>
                <TableHead className="text-right text-slate-600 dark:text-slate-400 font-semibold">Score</TableHead>
                <TableHead className="text-slate-600 dark:text-slate-400 font-semibold">Rating</TableHead>
                <TableHead className="text-slate-600 dark:text-slate-400 font-semibold">Date</TableHead>
                {showActions && <TableHead className="w-[50px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedReports.length === 0 ? (
                <TableRow className="hover:bg-transparent dark:hover:bg-transparent">
                  <TableCell
                    colSpan={showSchoolColumn && showRegionColumn ? 7 : showSchoolColumn || showRegionColumn ? 6 : 5}
                    className="text-center py-8 text-slate-500 dark:text-slate-400"
                  >
                    No reports match your filters
                  </TableCell>
                </TableRow>
              ) : (
                paginatedReports.map((report) => (
                  <TableRow
                    key={report.id}
                    className="cursor-pointer border-b border-slate-200/50 dark:border-slate-700/30 hover:bg-blue-50/50 dark:hover:bg-blue-500/5 transition-colors"
                    onClick={() => onViewReport(report.id)}
                  >
                    {showSchoolColumn && (
                      <TableCell className="font-medium text-slate-900 dark:text-white">
                        {report.schoolName}
                        {report.isTAPS && (
                          <Badge variant="outline" className="ml-2 text-xs bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30">
                            TAPS
                          </Badge>
                        )}
                      </TableCell>
                    )}
                    {showRegionColumn && (
                      <TableCell className="text-slate-600 dark:text-slate-400">{report.regionName || '-'}</TableCell>
                    )}
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`gap-1 border ${STATUS_CONFIG[report.status].className}`}
                      >
                        {STATUS_CONFIG[report.status].icon}
                        {STATUS_CONFIG[report.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-xs text-slate-900 dark:text-white">{report.termName || '-'}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">{report.academicYear || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-slate-900 dark:text-white">
                      {report.totalScore !== null ? (
                        <>
                          {report.totalScore}
                          <span className="text-slate-400 dark:text-slate-500 text-xs">
                            /{report.isTAPS ? '429' : '1000'}
                          </span>
                        </>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <UnifiedRatingBadge
                        ratingLevel={report.ratingLevel}
                        tapsRatingGrade={report.tapsRatingGrade}
                        totalScore={report.totalScore}
                        isTAPS={report.isTAPS}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-blue-600 dark:text-blue-400">
                      {report.status === 'submitted'
                        ? formatDate(report.submittedAt)
                        : formatDate(report.updatedAt)
                      }
                    </TableCell>
                    {showActions && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[hsl(222,47%,13%)]">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-white dark:bg-[hsl(222,47%,11%)] border-slate-200 dark:border-slate-700">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation()
                              onViewReport(report.id)
                            }}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {report.status === 'submitted' && onExportReport && (
                              <>
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation()
                                  onExportReport(report.id, 'pdf')
                                }}>
                                  <Download className="h-4 w-4 mr-2" />
                                  Export PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation()
                                  onExportReport(report.id, 'excel')
                                }}>
                                  <Download className="h-4 w-4 mr-2" />
                                  Export Excel
                                </DropdownMenuItem>
                              </>
                            )}
                            {onDeleteReport && (
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onDeleteReport(report.id, report)
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Report
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredReports.length)} of {filteredReports.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="bg-white dark:bg-[hsl(222,47%,11%)] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[hsl(222,47%,13%)]"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="bg-white dark:bg-[hsl(222,47%,11%)] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[hsl(222,47%,13%)]"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// SCHOOL RANKINGS TABLE
// ============================================================================

interface SchoolRanking {
  rank: number
  schoolId: string
  schoolName: string
  regionName: string
  totalScore: number
  ratingLevel: RatingLevel
  isTAPS?: boolean
  tapsRatingGrade?: TAPSRatingGrade | null
}

interface SchoolRankingsTableProps {
  rankings: SchoolRanking[]
  title?: string
  description?: string
  onViewSchool?: (schoolId: string) => void
}

export function SchoolRankingsTable({
  rankings,
  title = "School Rankings",
  description,
  onViewSchool,
}: SchoolRankingsTableProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [ratingFilter, setRatingFilter] = useState<"all" | RatingLevel>("all")
  const [sortBy, setSortBy] = useState<"rank" | "school" | "score" | "rating">("rank")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [pageSize, setPageSize] = useState<number>(10)
  const [currentPage, setCurrentPage] = useState<number>(1)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, ratingFilter, sortBy, sortDirection, pageSize])

  if (!rankings || rankings.length === 0) {
    return (
      <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border-slate-200/80 dark:border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-slate-900 dark:text-white">{title}</CardTitle>
          {description && <CardDescription className="text-slate-500 dark:text-slate-400">{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-slate-500 dark:text-slate-400">
            No ranking data available
          </div>
        </CardContent>
      </Card>
    )
  }

  const filtered = rankings.filter((r) => {
    const matchesSearch = !searchQuery
      ? true
      : r.schoolName.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesRating = ratingFilter === "all" ? true : r.ratingLevel === ratingFilter
    return matchesSearch && matchesRating
  })

  const sorted = [...filtered].sort((a, b) => {
    const dir = sortDirection === "asc" ? 1 : -1

    if (sortBy === "rank") {
      return (a.rank - b.rank) * dir
    }
    if (sortBy === "school") {
      return a.schoolName.localeCompare(b.schoolName) * dir
    }
    if (sortBy === "score") {
      return ((a.totalScore ?? 0) - (b.totalScore ?? 0)) * dir
    }
    // rating
    return RATING_DISPLAY_LABELS[a.ratingLevel].localeCompare(RATING_DISPLAY_LABELS[b.ratingLevel]) * dir
  })

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * pageSize
  const paginated = sorted.slice(startIndex, startIndex + pageSize)

  return (
    <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border-slate-200/80 dark:border-slate-700/50">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <Trophy className="h-5 w-5 text-amber-500" />
              {title}
            </CardTitle>
            {description && <CardDescription className="text-slate-500 dark:text-slate-400">{description}</CardDescription>}
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            <div className="relative w-full sm:w-[260px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search schools…"
                className="pl-8 bg-white dark:bg-[hsl(222,47%,11%)] border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>

            <div className="flex flex-wrap gap-2 sm:justify-end">
              <Select value={ratingFilter} onValueChange={(v) => setRatingFilter(v as any)}>
                <SelectTrigger className="w-[180px] bg-white dark:bg-[hsl(222,47%,11%)] border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                  <SelectValue placeholder="Filter by rating" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[hsl(222,47%,11%)] border-slate-200 dark:border-slate-700">
                  <SelectItem value="all">All ratings</SelectItem>
                  <SelectItem value="outstanding">Outstanding</SelectItem>
                  <SelectItem value="very_good">Very Good</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="satisfactory">Satisfactory</SelectItem>
                  <SelectItem value="needs_improvement">Needs Improvement</SelectItem>
                </SelectContent>
              </Select>

              <Select value={`${sortBy}:${sortDirection}`} onValueChange={(v) => {
                const [nextBy, nextDir] = v.split(":") as any
                setSortBy(nextBy)
                setSortDirection(nextDir)
              }}>
                <SelectTrigger className="w-[190px] bg-white dark:bg-[hsl(222,47%,11%)] border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                  <ArrowUpDown className="h-4 w-4 mr-2 text-slate-400 dark:text-slate-500" />
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[hsl(222,47%,11%)] border-slate-200 dark:border-slate-700">
                  <SelectItem value="rank:asc">Rank (best first)</SelectItem>
                  <SelectItem value="rank:desc">Rank (worst first)</SelectItem>
                  <SelectItem value="score:desc">Score (high to low)</SelectItem>
                  <SelectItem value="score:asc">Score (low to high)</SelectItem>
                  <SelectItem value="school:asc">School (A to Z)</SelectItem>
                  <SelectItem value="school:desc">School (Z to A)</SelectItem>
                  <SelectItem value="rating:asc">Rating (A to Z)</SelectItem>
                  <SelectItem value="rating:desc">Rating (Z to A)</SelectItem>
                </SelectContent>
              </Select>

              <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                <SelectTrigger className="w-[120px] bg-white dark:bg-[hsl(222,47%,11%)] border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                  <SelectValue placeholder="Rows" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[hsl(222,47%,11%)] border-slate-200 dark:border-slate-700">
                  <SelectItem value="10">10 / page</SelectItem>
                  <SelectItem value="20">20 / page</SelectItem>
                  <SelectItem value="50">50 / page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-slate-500 dark:text-slate-400">
            No schools match your filters
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-[hsl(222,47%,8%)] border-b border-slate-200/80 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-[hsl(222,47%,8%)]">
                    <TableHead className="w-[60px] text-slate-600 dark:text-slate-400 font-semibold">Rank</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-400 font-semibold">School</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-400 font-semibold">Region</TableHead>
                    <TableHead className="text-right text-slate-600 dark:text-slate-400 font-semibold">Score</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-400 font-semibold">Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((school, index) => {
                    const displayRank = startIndex + index + 1
                    return (
                      <TableRow
                        key={school.schoolId}
                        className={`border-b border-slate-200/50 dark:border-slate-700/30 ${onViewSchool ? "cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-500/5" : "hover:bg-transparent dark:hover:bg-transparent"} transition-colors`}
                        onClick={() => onViewSchool?.(school.schoolId)}
                      >
                        <TableCell>
                          <div
                            className={`flex items-center justify-center w-8 h-8 rounded-full ${
                              displayRank <= 3
                                ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400 font-bold'
                                : 'bg-slate-100 dark:bg-[hsl(222,47%,11%)] text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {displayRank}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-slate-900 dark:text-white">{school.schoolName}</TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-400">{school.regionName}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-slate-900 dark:text-white">
                          {school.totalScore}
                        </TableCell>
                        <TableCell>
                          <UnifiedRatingBadge
                            ratingLevel={school.ratingLevel}
                            tapsRatingGrade={school.tapsRatingGrade}
                            totalScore={school.totalScore}
                            isTAPS={school.isTAPS}
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Showing {startIndex + 1} to {Math.min(startIndex + pageSize, sorted.length)} of {sorted.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="bg-white dark:bg-[hsl(222,47%,11%)] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[hsl(222,47%,13%)]"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Page {safePage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    className="bg-white dark:bg-[hsl(222,47%,11%)] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[hsl(222,47%,13%)]"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
