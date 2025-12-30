"use client"

import { useState, useEffect } from "react"
import { getAllNurseryAssessments } from "@/app/actions/nursery-assessment"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BookOpen, Eye, Calendar, School, User, MapPin, Filter, Loader2 } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"

export default function NurseryAssessmentPage() {
  const [assessments, setAssessments] = useState<any[]>([])
  const [filteredAssessments, setFilteredAssessments] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRegion, setSelectedRegion] = useState("all")
  const [selectedAssessmentType, setSelectedAssessmentType] = useState("all")
  const [selectedYear, setSelectedYear] = useState("all")
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Fetch assessments on mount
  useEffect(() => {
    async function fetchAssessments() {
      setLoading(true)
      const { assessments: data, error: err } = await getAllNurseryAssessments()
      if (err) {
        setError(err)
      } else {
        setAssessments(data)
        setFilteredAssessments(data)
      }
      setLoading(false)
    }
    fetchAssessments()
  }, [])

  // Apply filters automatically whenever filter values change
  useEffect(() => {
    let filtered = [...assessments]

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
    setCurrentPage(1) // Reset to first page when filters change
  }, [searchQuery, selectedRegion, selectedAssessmentType, selectedYear, assessments])

  // Function to get assessment type color
  const getAssessmentTypeColor = (assessmentType: string) => {
    if (assessmentType?.includes('assessment-1-year-1')) {
      return 'bg-green-100 text-green-800 border-green-200'
    } else if (assessmentType?.includes('assessment-2-year-2')) {
      return 'bg-orange-100 text-orange-800 border-orange-200'
    } else if (assessmentType?.includes('assessment-3-year-2')) {
      return 'bg-purple-100 text-purple-800 border-purple-200'
    }
    return 'bg-gray-100 text-gray-800 border-gray-200'
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

  // Get unique regions and assessment types for filters
  const regions = [...new Set(assessments.map(a => a.schools?.region).filter(Boolean))]
  const assessmentTypes = [...new Set(assessments.map(a => formatAssessmentType(a.assessment_type)).filter(Boolean))]

  // Pagination calculations
  const totalPages = Math.ceil(filteredAssessments.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedAssessments = filteredAssessments.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading assessments...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <BookOpen className="h-5 w-5" />
            Error Loading Nursery Assessments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-blue-600 flex items-center gap-2">
            <BookOpen className="h-5 w-5 sm:h-6 sm:w-6" />
            Nursery Assessments
          </h1>
          <p className="text-gray-600 text-sm sm:text-base mt-1">
            Monitor and review nursery assessments from all schools
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
              <Input
                placeholder="Search by school name, region, or head teacher..."
                className="sm:max-w-md"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                <SelectTrigger className="sm:w-48">
                  <SelectValue placeholder="All Regions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  {regions.map(region => (
                    <SelectItem key={region} value={region || ''}>{region}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedAssessmentType} onValueChange={setSelectedAssessmentType}>
                <SelectTrigger className="sm:w-56">
                  <SelectValue placeholder="All Assessment Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assessment Types</SelectItem>
                  {assessmentTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="sm:w-40">
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assessments List */}
      {filteredAssessments.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {assessments.length === 0 ? 'No Nursery Assessments' : 'No Results Found'}
              </h3>
              <p className="text-gray-600">
                {assessments.length === 0 
                  ? 'No nursery assessments have been submitted yet.'
                  : 'No assessments match your filter criteria. Try adjusting your filters.'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="min-w-[200px] font-semibold">School</TableHead>
                    <TableHead className="min-w-[150px] font-semibold">Head Teacher</TableHead>
                    <TableHead className="min-w-[120px] font-semibold">Region</TableHead>
                    <TableHead className="min-w-[180px] font-semibold">Assessment Type</TableHead>
                    <TableHead className="min-w-[100px] font-semibold">Enrollment</TableHead>
                    <TableHead className="min-w-[140px] font-semibold">Date Submitted</TableHead>
                    <TableHead className="min-w-[100px] font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAssessments.map((assessment) => (
                    <TableRow key={assessment.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <School className="h-4 w-4 text-blue-500" />
                          <div>
                            <p className="font-medium text-gray-900">
                              {assessment.schools?.name || 'Unknown School'}
                            </p>
                            <p className="text-sm text-gray-500">Nursery Level</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900">
                              {assessment.headteacher?.name || 'Unknown'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {assessment.headteacher?.email || ''}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          <span className="text-sm">
                            {assessment.schools?.region || 'Unknown'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`text-xs font-medium border ${getAssessmentTypeColor(assessment.assessment_type)}`}
                        >
                          {formatAssessmentType(assessment.assessment_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">
                          {assessment.enrollment} students
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          <span className="text-sm">
                            {format(new Date(assessment.created_at), 'MMM dd, yyyy')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 text-xs font-medium text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          <Link 
                            href={`/dashboard/nursery-assessment/view/${assessment.id}?back=${encodeURIComponent('/dashboard/education-official/nursery-assessment')}`}
                            className="flex items-center gap-1.5"
                          >
                            <Eye className="h-3 w-3" />
                            View
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {filteredAssessments.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredAssessments.length)} of {filteredAssessments.length} assessments
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => {
                    // Show first page, last page, current page, and pages around current
                    return (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    )
                  })
                  .map((page, index, array) => (
                    <div key={page} className="inline-flex items-center">
                      {index > 0 && array[index - 1] !== page - 1 && (
                        <span className="px-2 text-gray-400">...</span>
                      )}
                      <Button
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        className="min-w-[2.5rem]"
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </Button>
                    </div>
                  ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
