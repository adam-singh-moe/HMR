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
  ChevronLeft, 
  ChevronRight,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import type { RatingLevel, TAPSRatingGrade } from "../types"

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
  // TAPS fields for secondary schools
  isTAPS?: boolean
  tapsRatingGrade?: TAPSRatingGrade | null
}

interface ReportsListProps {
  reports: AssessmentReport[]
  onViewReport: (reportId: string) => void
  onExportReport?: (reportId: string, format: 'pdf' | 'excel') => void
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
    variant: 'secondary' as const,
    icon: <Clock className="h-3 w-3" />,
  },
  submitted: {
    label: 'Submitted',
    variant: 'default' as const,
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  expired_draft: {
    label: 'Expired',
    variant: 'destructive' as const,
    icon: <XCircle className="h-3 w-3" />,
  },
}

const RATING_BADGE_COLORS: Record<RatingLevel, string> = {
  'outstanding': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'very_good': 'bg-blue-100 text-blue-800 border-blue-200',
  'good': 'bg-amber-100 text-amber-800 border-amber-200',
  'satisfactory': 'bg-orange-100 text-orange-800 border-orange-200',
  'needs_improvement': 'bg-red-100 text-red-800 border-red-200',
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
  'A': 'bg-green-100 text-green-800 border-green-200',
  'B': 'bg-blue-100 text-blue-800 border-blue-200',
  'C': 'bg-amber-100 text-amber-800 border-amber-200',
  'D': 'bg-orange-100 text-orange-800 border-orange-200',
  'E': 'bg-red-100 text-red-800 border-red-200',
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
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Assessment Reports</CardTitle>
            <CardDescription>
              {filteredReports.length} of {reports.length} reports
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by school or region..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="expired_draft">Expired</SelectItem>
            </SelectContent>
          </Select>
          <Select value={ratingFilter} onValueChange={setRatingFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Rating" />
            </SelectTrigger>
            <SelectContent>
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
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {showSchoolColumn && <TableHead>School</TableHead>}
                {showRegionColumn && <TableHead>Region</TableHead>}
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Date</TableHead>
                {showActions && <TableHead className="w-[50px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedReports.length === 0 ? (
                <TableRow>
                  <TableCell 
                    colSpan={showSchoolColumn && showRegionColumn ? 7 : showSchoolColumn || showRegionColumn ? 6 : 5} 
                    className="text-center py-8 text-muted-foreground"
                  >
                    No reports match your filters
                  </TableCell>
                </TableRow>
              ) : (
                paginatedReports.map((report) => (
                  <TableRow 
                    key={report.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onViewReport(report.id)}
                  >
                    {showSchoolColumn && (
                      <TableCell className="font-medium">
                        {report.schoolName}
                        {report.isTAPS && (
                          <Badge variant="outline" className="ml-2 text-xs bg-blue-50 text-blue-700 border-blue-200">
                            TAPS
                          </Badge>
                        )}
                      </TableCell>
                    )}
                    {showRegionColumn && (
                      <TableCell>{report.regionName || '-'}</TableCell>
                    )}
                    <TableCell>
                      <Badge 
                        variant={STATUS_CONFIG[report.status].variant}
                        className="gap-1"
                      >
                        {STATUS_CONFIG[report.status].icon}
                        {STATUS_CONFIG[report.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {report.totalScore !== null ? (
                        <>
                          {report.totalScore}
                          <span className="text-muted-foreground text-xs">
                            /{report.isTAPS ? '419' : '1000'}
                          </span>
                        </>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {/* Show TAPS grade for secondary schools, demo rating for primary */}
                      {report.isTAPS && report.tapsRatingGrade ? (
                        <Badge 
                          variant="outline" 
                          className={TAPS_GRADE_BADGE_COLORS[report.tapsRatingGrade]}
                        >
                          {TAPS_GRADE_DISPLAY_LABELS[report.tapsRatingGrade]}
                        </Badge>
                      ) : report.ratingLevel ? (
                        <Badge 
                          variant="outline" 
                          className={RATING_BADGE_COLORS[report.ratingLevel]}
                        >
                          {RATING_DISPLAY_LABELS[report.ratingLevel]}
                        </Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {report.status === 'submitted' 
                        ? formatDate(report.submittedAt)
                        : formatDate(report.updatedAt)
                      }
                    </TableCell>
                    {showActions && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
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
            <p className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredReports.length)} of {filteredReports.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
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
  if (!rankings || rankings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            No ranking data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">Rank</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Region</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead>Rating</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankings.map((school) => (
                <TableRow 
                  key={school.schoolId}
                  className={onViewSchool ? "cursor-pointer hover:bg-muted/50" : ""}
                  onClick={() => onViewSchool?.(school.schoolId)}
                >
                  <TableCell>
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                      school.rank <= 3 
                        ? 'bg-amber-100 text-amber-800 font-bold' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {school.rank}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{school.schoolName}</TableCell>
                  <TableCell>{school.regionName}</TableCell>
                  <TableCell className="text-right font-mono font-bold">
                    {school.totalScore}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={RATING_BADGE_COLORS[school.ratingLevel]}
                    >
                      {RATING_DISPLAY_LABELS[school.ratingLevel]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
