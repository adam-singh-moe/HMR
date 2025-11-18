import { getAllNurseryAssessments } from "@/app/actions/nursery-assessment"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BookOpen, Eye, Calendar, School, User, MapPin, Filter } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"

export default async function NurseryAssessmentPage() {
  const { assessments, error } = await getAllNurseryAssessments()

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
              />
              <Select>
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
              <Select>
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
              <Select>
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
            <Button className="flex items-center gap-2 flex-shrink-0">
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Assessments List */}
      {assessments.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Nursery Assessments</h3>
              <p className="text-gray-600">No nursery assessments have been submitted yet.</p>
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
                  {assessments.map((assessment) => (
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
    </div>
  )
}
