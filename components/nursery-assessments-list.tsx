"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { EyeIcon, CalendarIcon, AcademicCapIcon } from "@heroicons/react/24/outline"
import { getSubmittedNurseryAssessments } from "@/app/actions/nursery-assessment"
import { useAuth } from "@/components/auth-wrapper"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Assessment {
  id: string
  created_at: string
  assessment_type: string
  enrollment: number
  status: string
  schools: {
    name: string
    region: string
  }
  users: {
    name: string
    email: string
  }
}

export function NurseryAssessmentsList() {
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [filteredAssessments, setFilteredAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedYear, setSelectedYear] = useState<string>("all")
  const [selectedAssessmentType, setSelectedAssessmentType] = useState<string>("all")
  
  const { user } = useAuth()

  useEffect(() => {
    if (user?.id) {
      fetchAssessments()
    }
  }, [user])

  const fetchAssessments = async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
      const result = await getSubmittedNurseryAssessments(user.id)
      
      if (result.error) {
        setError(result.error)
      } else {
        setAssessments(result.assessments)
        setFilteredAssessments(result.assessments)
      }
    } catch (err) {
      setError('Failed to load assessments')
      console.error('Error fetching assessments:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filter assessments when filter criteria change
  useEffect(() => {
    let filtered = assessments

    if (selectedYear !== "all") {
      filtered = filtered.filter(assessment => {
        const assessmentYear = new Date(assessment.created_at).getFullYear().toString()
        return assessmentYear === selectedYear
      })
    }

    if (selectedAssessmentType !== "all") {
      filtered = filtered.filter(assessment => assessment.assessment_type === selectedAssessmentType)
    }

    setFilteredAssessments(filtered)
  }, [assessments, selectedYear, selectedAssessmentType])

  const handleViewDetails = (assessmentId: string) => {
    // Navigate to detailed view page
    const backUrl = encodeURIComponent('/dashboard/head-teacher?tab=view-assessments&subtab=view-assessments&mainTab=nursery-assessment')
    window.location.href = `/dashboard/nursery-assessment/view/${assessmentId}?back=${backUrl}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assessments...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="p-6 bg-red-50 rounded-full w-fit mx-auto mb-4">
          <AcademicCapIcon className="h-12 w-12 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Assessments</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={fetchAssessments} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  if (assessments.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="p-6 bg-gray-100 rounded-full w-fit mx-auto mb-4">
          <AcademicCapIcon className="h-12 w-12 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Assessments Found</h3>
        <p className="text-gray-600">You haven't submitted any nursery assessments yet.</p>
      </div>
    )
  }

  // Get unique years and assessment types for filter options
  const availableYears = Array.from(new Set(
    assessments.map(assessment => 
      new Date(assessment.created_at).getFullYear().toString()
    )
  )).sort((a, b) => b.localeCompare(a)) // Sort descending (newest first)

  const availableAssessmentTypes = Array.from(new Set(
    assessments.map(assessment => assessment.assessment_type)
  )).sort()

  return (
    <>
      <div className="space-y-6 px-6">
        {/* Filters */}
        <div className="flex justify-end">
          <div className="flex gap-3">
            <div className="w-40">
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Filter by year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-48">
              <Select value={selectedAssessmentType} onValueChange={setSelectedAssessmentType}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {availableAssessmentTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(selectedYear !== "all" || selectedAssessmentType !== "all") && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setSelectedYear("all")
                  setSelectedAssessmentType("all")
                }}
                className="h-9"
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {filteredAssessments.length === 0 ? (
          <div className="text-center py-12">
            <div className="p-6 bg-gray-100 rounded-full w-fit mx-auto mb-4">
              <AcademicCapIcon className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Assessments Found</h3>
            <p className="text-gray-600">No assessments match the selected filters.</p>
            <Button 
              variant="outline" 
              onClick={() => {
                setSelectedYear("all")
                setSelectedAssessmentType("all")
              }}
              className="mt-4"
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAssessments.map((assessment) => (
              <Card key={assessment.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-blue-600">
                        {format(new Date(assessment.created_at), 'MMMM yyyy')}
                      </h3>
                      <Badge 
                        variant="default" 
                        className="bg-green-100 text-green-700 hover:bg-green-100 text-xs px-2 py-1"
                      >
                        Submitted
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-blue-600">
                      <CalendarIcon className="h-4 w-4" />
                      <span>Submitted: {format(new Date(assessment.created_at), 'M/d/yyyy')}</span>
                    </div>
                    
                    <div className="border-t border-gray-200 pt-4">
                      <div className="space-y-1">
                        <div className="text-sm">
                          <span className="font-medium text-blue-600">School:</span> <span className="text-gray-700">{assessment.schools?.name || 'Unknown School'}</span>
                        </div>
                        <div className="text-sm">
                          <span className="font-medium text-blue-600">Created:</span> <span className="text-gray-700">{format(new Date(assessment.created_at), 'M/d/yyyy')}</span>
                        </div>
                        <div className="text-sm">
                          <span className="font-medium text-blue-600">Enrollment:</span> <span className="text-gray-700">{assessment.enrollment} Students</span>
                        </div>
                      </div>
                      <div className="mt-3 p-2 bg-blue-50 rounded-md border-l-4 border-blue-400">
                        <div className="text-sm font-semibold text-blue-800">
                          Type: {assessment.assessment_type}
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(assessment.id)}
                      className="w-full flex items-center justify-center gap-2 text-gray-600 border-gray-300 hover:bg-gray-50"
                    >
                      <EyeIcon className="h-4 w-4" />
                      View Report
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  )
}