"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { EyeIcon, PrinterIcon, CalendarIcon, BuildingOfficeIcon, AcademicCapIcon } from "@heroicons/react/24/outline"
import { getSubmittedNurseryAssessments, getNurseryAssessmentDetails } from "@/app/actions/nursery-assessment"
import { useAuth } from "@/components/auth-wrapper"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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

interface AssessmentResponse {
  id: string
  answer: string
  questions: {
    section: string
    question_text: string
    question_type: string
  }
  options: {
    option_text: string
    section: string
  }
}

interface DetailedAssessment {
  id: string
  created_at: string
  assessment_type: string
  enrollment: number
  status: string
  schools: {
    name: string
    region: string
    level: string
  }
  hmr_users: {
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
  const [viewingAssessment, setViewingAssessment] = useState<string | null>(null)
  const [assessmentDetails, setAssessmentDetails] = useState<{
    assessment: DetailedAssessment | null
    responses: AssessmentResponse[]
  }>({
    assessment: null,
    responses: []
  })
  const [detailsLoading, setDetailsLoading] = useState(false)
  
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

  const handleViewDetails = async (assessmentId: string) => {
    try {
      setDetailsLoading(true)
      setViewingAssessment(assessmentId)
      
      const result = await getNurseryAssessmentDetails(assessmentId)
      
      if (result.error) {
        setError(result.error)
      } else {
        setAssessmentDetails({
          assessment: result.assessment,
          responses: result.responses
        })
      }
    } catch (err) {
      setError('Failed to load assessment details')
      console.error('Error fetching assessment details:', err)
    } finally {
      setDetailsLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const closeDetails = () => {
    setViewingAssessment(null)
    setAssessmentDetails({
      assessment: null,
      responses: []
    })
  }

  // Group responses by section for better display
  const groupedResponses = assessmentDetails.responses.reduce((acc, response) => {
    const section = response.questions?.section || 'Unknown'
    if (!acc[section]) {
      acc[section] = []
    }
    acc[section].push(response)
    return acc
  }, {} as Record<string, AssessmentResponse[]>)

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

      {/* Assessment Details Dialog */}
      <Dialog open={!!viewingAssessment} onOpenChange={closeDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto print:max-w-full print:max-h-full print:overflow-visible">
          <DialogHeader className="print:hidden">
            <div className="flex items-center justify-between">
              <DialogTitle>Assessment Details</DialogTitle>
              <Button
                onClick={handlePrint}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <PrinterIcon className="h-4 w-4" />
                Print
              </Button>
            </div>
          </DialogHeader>

          {detailsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading details...</p>
              </div>
            </div>
          ) : assessmentDetails.assessment ? (
            <div className="space-y-6 print:space-y-4">
              {/* Header Section for Print */}
              <div className="print:block hidden text-center border-b pb-4">
                <h1 className="text-2xl font-bold">Nursery Assessment Report</h1>
                <p className="text-gray-600">Ministry of Education</p>
              </div>

              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">School Name:</span>
                    <p>{assessmentDetails.assessment.schools?.name}</p>
                  </div>
                  <div>
                    <span className="font-medium">Region:</span>
                    <p>{assessmentDetails.assessment.schools?.region}</p>
                  </div>
                  <div>
                    <span className="font-medium">School Level:</span>
                    <p>{assessmentDetails.assessment.schools?.level}</p>
                  </div>
                  <div>
                    <span className="font-medium">Assessment Date:</span>
                    <p>{format(new Date(assessmentDetails.assessment.created_at), 'PPP')}</p>
                  </div>
                  <div>
                    <span className="font-medium">Assessment Type:</span>
                    <p>{assessmentDetails.assessment.assessment_type}</p>
                  </div>
                  <div>
                    <span className="font-medium">Total Enrollment:</span>
                    <p>{assessmentDetails.assessment.enrollment} students</p>
                  </div>
                  <div>
                    <span className="font-medium">Head Teacher:</span>
                    <p>{assessmentDetails.assessment.hmr_users?.name || assessmentDetails.assessment.hmr_users?.email}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Assessment Responses by Section */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Assessment Results</h3>
                
                {Object.entries(groupedResponses).map(([section, responses]) => (
                  <div key={section} className="space-y-3">
                    <h4 className="font-medium text-base bg-gray-50 p-2 rounded">
                      Section: {section}
                    </h4>
                    <div className="space-y-2 ml-4">
                      {responses.map((response) => (
                        <div key={response.id} className="text-sm">
                          <div className="flex justify-between items-start">
                            <span className="text-gray-600 flex-1">
                              {response.options?.option_text}:
                            </span>
                            <span className="font-medium ml-2">
                              {response.answer} students
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Print Footer */}
              <div className="print:block hidden border-t pt-4 text-center text-sm text-gray-500">
                <p>Generated on {format(new Date(), 'PPP')} | Ministry of Education - Nursery Assessment Report</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">Failed to load assessment details.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}