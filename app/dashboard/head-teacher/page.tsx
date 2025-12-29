"use client"

import { useEffect, useState } from "react"
import { MonthlyReportForm } from "@/components/monthly-report-form"
import { PreviousReportForm } from "@/components/previous-report-form"
import { NurseryAssessmentForm } from "@/components/nursery-assessment-form"
import { NurseryAssessmentsList } from "@/components/nursery-assessments-list"
import { SchoolReadinessStatus } from "@/components/school-readiness-status"
import { HeadTeacherAssessmentCard } from "@/components/school-assessment-entry-card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CalendarIcon, UsersIcon, GraduationCapIcon, FileTextIcon, TrendingUpIcon, Loader2, Eye, RefreshCw, BookOpenIcon, PlusCircleIcon, ClockIcon, EyeIcon, BarChart3Icon } from "lucide-react"
import { getHmrReports } from "@/app/actions/hmr-reports"
import { getSubmittedNurseryAssessments } from "@/app/actions/nursery-assessment"
import { getUser, getUserSchoolInfo } from "@/app/actions/auth"
import { getHeadTeacherDashboardTrends } from "@/app/actions/head-teacher-trends"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { AuthWrapper, useAuth } from "@/components/auth-wrapper"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

type HmrReport = {
  id: string
  school_id: string
  headteacher_id: string
  month: number
  year: number
  status: string
  created_at: string
  updated_at: string
  sms_schools?: { id: string; name: string }
}

type SchoolInfo = {
  id: string
  name: string
  level: string
}

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

export default function HeadTeacherDashboard() {
  return (
    <AuthWrapper requiredRole="Head Teacher">
      <HeadTeacherDashboardContent />
    </AuthWrapper>
  )
}

function HeadTeacherDashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  
  // Get tab from URL params, with fallback based on main tab
  const currentMainTab = searchParams.get('mainTab') || 'dashboard'
  const getDefaultTab = () => {
    if (currentMainTab === 'nursery-assessment') {
      return 'submit-assessment'
    } else if (currentMainTab === 'monthly-reports') {
      return 'current-report'
    }
    return 'current-report'
  }
  const currentTab = searchParams.get('tab') || getDefaultTab()
  
  // State for reports and loading
  const [reports, setReports] = useState<HmrReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null)
  const [isNurserySchool, setIsNurserySchool] = useState(false)
  
  // State for nursery assessments
  const [nurseryAssessments, setNurseryAssessments] = useState<any[]>([])
  const [nurseryAssessmentsLoading, setNurseryAssessmentsLoading] = useState(false)
  const [nurseryAssessmentsError, setNurseryAssessmentsError] = useState<string | null>(null)
  
  // State for dashboard trends
  const [trendsData, setTrendsData] = useState<any>({
    enrollmentTrends: [],
    attendanceTrends: [],
    punctualityTrends: [],
    expenditureTrends: []
  })
  const [trendsLoading, setTrendsLoading] = useState(false)
  
  // Function to update URL parameters and handle tab changes
  const updateURL = (newTab: string, mainTab?: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', newTab)
    if (mainTab) {
      params.set('mainTab', mainTab)
    }
    router.replace(`/dashboard/head-teacher?${params.toString()}`)
    
    // Auto-refresh reports when switching to view previous reports tab
    if (newTab === 'view-reports') {
      fetchReports()
    }
  }

  // Function to update main tab
  const updateMainTab = (newMainTab: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('mainTab', newMainTab)
    // Reset to default sub-tab when switching main tabs
    if (newMainTab === 'monthly-reports') {
      params.set('tab', 'current-report')
    } else if (newMainTab === 'nursery-assessment') {
      params.set('tab', 'submit-assessment')
    }
    router.replace(`/dashboard/head-teacher?${params.toString()}`)
  }

  // Function to fetch school information
  const fetchSchoolInfo = async () => {
    try {
      //console.log('Fetching school info...')
      const result = await getUserSchoolInfo()
     // console.log('School info result:', result)
      
      if (result.error) {
        console.error('Error fetching school info:', result.error)
        return
      }

      if (result.school) {
       // console.log('School data:', result.school)
       // console.log('School level:', result.school.level)
        setSchoolInfo(result.school)
        const isNursery = result.school.level?.toLowerCase() === 'nursery' || result.school.has_nursery_class === true
       // console.log('Is nursery school?', isNursery)
        setIsNurserySchool(isNursery)
      }
    } catch (err) {
      console.error('Error in fetchSchoolInfo:', err)
    }
  }
  
  // Function to fetch reports
  const fetchReports = async () => {
    try {
      setLoading(true)

      const result = await getHmrReports()

      if (result.error) {
        console.error("Error from getHmrReports:", result.error)
        setError(result.error)
      } else {

        // Filter only submitted reports
        const submittedReports = result.reports.filter((report) => report.status === "submitted")

        setReports(submittedReports)
      }
    } catch (err) {
      console.error("Error in fetchReports:", err)
      setError("Failed to load reports")
    } finally {
      setLoading(false)
    }
  }
  
  // Function to fetch nursery assessments
  const fetchNurseryAssessments = async () => {
    if (!user?.id) return
    
    try {
      setNurseryAssessmentsLoading(true)
      setNurseryAssessmentsError(null)

      const result = await getSubmittedNurseryAssessments(user.id)

      if (result.error) {
        console.error("Error from getSubmittedNurseryAssessments:", result.error)
        setNurseryAssessmentsError(result.error)
      } else {
        setNurseryAssessments(result.assessments)
      }
    } catch (err) {
      console.error("Error in fetchNurseryAssessments:", err)
      setNurseryAssessmentsError("Failed to load nursery assessments")
    } finally {
      setNurseryAssessmentsLoading(false)
    }
  }
  
  // Function to handle report viewing
  const handleViewReport = (report: HmrReport) => {
    const monthParam = `${report.month}-${report.year}`
    const backUrl = encodeURIComponent(`/dashboard/head-teacher?tab=current-report`)
    const navigationUrl = `/dashboard/reports/view/${report.school_id}/${monthParam}?back=${backUrl}`
    router.push(navigationUrl)
  }

  // Function to handle successful report submission
  const handleReportSuccess = () => {
    router.refresh() // Refresh the page to update the status
    updateURL('view-reports') // Switch to view previous reports tab to show the submitted report
  }

  // Function to handle successful nursery assessment submission
  const handleNurseryAssessmentSuccess = () => {
    router.refresh() // Refresh the page to update the status
    updateURL('view-assessments') // Switch to view previous assessments tab to show the submitted assessment
  }

  // Function to fetch trends data
  const fetchTrendsData = async () => {
    setTrendsLoading(true)
    try {
      const result = await getHeadTeacherDashboardTrends()
      if (result.error) {
        console.error('Error fetching trends:', result.error)
      } else {
        setTrendsData(result)
      }
    } catch (error) {
      console.error('Error fetching trends data:', error)
    } finally {
      setTrendsLoading(false)
    }
  }

  useEffect(() => {
    fetchSchoolInfo()
    fetchReports()
    fetchTrendsData()
    if (user?.id) {
      fetchNurseryAssessments()
    }
  }, [user?.id])

  const formatReportMonth = (month: number, year: number) => {
    return `${monthNames[month - 1]} ${year}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  // Calculate compliance percentage based on current year reports
  const calculateCompliancePercentage = () => {
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth() + 1
    
    // Get all submitted reports for current year
    const currentYearReports = reports.filter(report => report.year === currentYear)
    
    // Expected reports (from January to previous month)
    const expectedReports = Math.max(currentMonth - 1, 0) // Don't count current month
    const actualReports = currentYearReports.length
    
    if (expectedReports === 0) return 100 // No reports expected yet
    return Math.min(Math.round((actualReports / expectedReports) * 100), 100)
  }

  // Calculate nursery assessment completion percentage
  const calculateNurseryAssessmentPercentage = () => {
    if (!isNurserySchool) return 0
    
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    
    // Count assessments for current year
    const currentYearAssessments = nurseryAssessments.filter(assessment => {
      const assessmentDate = new Date(assessment.created_at)
      return assessmentDate.getFullYear() === currentYear
    })
    
    // Typically expect 3 assessments per year (Assessment 1, 2, and 3)
    const expectedAssessments = 3
    const actualAssessments = currentYearAssessments.length
    
    return Math.min(Math.round((actualAssessments / expectedAssessments) * 100), 100)
  }

  // Calculate missed/overdue reports - match logic from getMissingMonthsForSchool
  const calculateOverdueReports = () => {
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear() // 2025
    const currentMonth = currentDate.getMonth() + 1 // November = 11
    
    // Get all submitted reports for current year
    const currentYearReports = reports.filter(report => report.year === currentYear)
    
    // Create set of submitted month-year combinations
    const submittedMonthYears = new Set(
      currentYearReports.map(report => `${report.month}-${report.year}`)
    )
    
    // Count missing months from January to previous month (not including current month)
    let missingCount = 0
    const endMonth = currentMonth - 1 // Only check up to the previous month (October)
    
    for (let month = 1; month <= endMonth; month++) {
      const monthYearKey = `${month}-${currentYear}`
      if (!submittedMonthYears.has(monthYearKey)) {
        missingCount++
      }
    }
    
    // console.log('Debug Overdue Calculation (Fixed):', {
    //   currentDate: currentDate.toISOString(),
    //   currentYear,
    //   currentMonth,
    //   endMonth,
    //   submittedReports: currentYearReports.map(r => ({ month: r.month, year: r.year })),
    //   submittedMonthYears: Array.from(submittedMonthYears),
    //   missingCount,
    //   checkingMonths: Array.from({length: endMonth}, (_, i) => i + 1)
    // })
    
    return missingCount
  }

  // Calculate report statistics for current academic year
  const getReportStatistics = () => {
    const overdueCount = calculateOverdueReports()
    const submittedCount = reports.length
    // For now, we'll keep draft as 0 since we're only fetching submitted reports
    // In a real implementation, you'd fetch draft reports separately
    const draftCount = 0
    const totalExpected = overdueCount + submittedCount + draftCount
    
    return {
      submitted: submittedCount,
      draft: draftCount,
      overdue: overdueCount,
      submittedPercentage: totalExpected > 0 ? Math.round((submittedCount / totalExpected) * 100) : 100,
      draftPercentage: totalExpected > 0 ? Math.round((draftCount / totalExpected) * 100) : 0,
      overduePercentage: totalExpected > 0 ? Math.round((overdueCount / totalExpected) * 100) : 0
    }
  }

  // Generate monthly submission data for charts
  const generateMonthlySubmissionData = () => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    
    // Get last 6 months of data
    const chartData = []
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(currentYear, currentDate.getMonth() - i, 1)
      const targetMonth = targetDate.getMonth() + 1
      const targetYear = targetDate.getFullYear()
      
      const monthlyReports = reports.filter(report => 
        report.month === targetMonth && report.year === targetYear
      ).length
      
      const monthlyAssessments = isNurserySchool ? nurseryAssessments.filter(assessment => {
        const assessmentDate = new Date(assessment.created_at)
        return assessmentDate.getMonth() + 1 === targetMonth && assessmentDate.getFullYear() === targetYear
      }).length : 0
      
      chartData.push({
        month: monthNames[targetDate.getMonth()],
        monthlyReports,
        nurseryAssessments: monthlyAssessments
      })
    }
    
    return chartData
  }

  // Render function for view reports content
  const renderViewReportsContent = () => (
    <div className="grid gap-4 px-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <h2 className="text-lg sm:text-xl md:text-2xl font-semibold tracking-tight text-primary-700">
          View Previous Reports
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchReports()}
            disabled={loading}
            className="text-xs sm:text-sm"
          >
            {loading ? (
              <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
            )}
            Refresh
          </Button>
          <Badge variant="secondary" className="bg-primary-100 text-primary-700 text-xs sm:text-sm">
            {reports.length} Reports
          </Badge>
        </div>
      </div>

      {loading ? (
        <Card className="gradient-card border-0 shadow-md">
          <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12 p-4 sm:p-6">
            <Loader2 className="h-8 w-8 sm:h-12 sm:w-12 text-primary-300 mb-3 sm:mb-4 animate-spin" />
            <h3 className="text-base sm:text-lg font-semibold mb-2 text-primary-700">Loading Reports</h3>
            <p className="text-muted-foreground text-center text-sm sm:text-base">
              Please wait while we fetch your reports...
            </p>
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="gradient-card border-0 shadow-md">
          <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12 p-4 sm:p-6">
            <FileTextIcon className="h-8 w-8 sm:h-12 sm:w-12 text-red-300 mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-semibold mb-2 text-red-700">Error Loading Reports</h3>
            <p className="text-muted-foreground text-center text-sm sm:text-base">{error}</p>
          </CardContent>
        </Card>
      ) : reports.length === 0 ? (
        <Card className="gradient-card border-0 shadow-md">
          <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12 p-4 sm:p-6">
            <CalendarIcon className="h-8 w-8 sm:h-12 sm:w-12 text-primary-300 mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-semibold mb-2 text-primary-700">No Reports Yet</h3>
            <p className="text-muted-foreground text-center text-sm sm:text-base">
              You haven't submitted any monthly reports yet. Use the "Submit report for current period" tab to create your first report.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {reports.map((report) => (
            <Card
              key={report.id}
              className="gradient-card border-0 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer"
              onClick={() => handleViewReport(report)}
            >
              <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-4">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base sm:text-lg text-primary-700 leading-tight">
                    {formatReportMonth(report.month, report.year)}
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className="text-green-600 border-green-600 bg-green-50 text-xs flex-shrink-0"
                  >
                    Submitted
                  </Badge>
                </div>
                <CardDescription className="flex items-center gap-1 text-xs sm:text-sm">
                  <CalendarIcon className="h-3 w-3 sm:h-4 sm:w-4 text-primary-500 flex-shrink-0" />
                  <span className="truncate">Submitted: {formatDate(report.updated_at)}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 p-3 sm:p-4 pt-0">
                <div className="pt-2 border-t border-primary-100">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    <strong className="text-primary-700">School:</strong>{" "}
                    <span className="break-words">{report.sms_schools?.name || "Unknown School"}</span>
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-3">
                    <strong className="text-primary-700">Created:</strong> {formatDate(report.created_at)}
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleViewReport(report)
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )

  // Main component return
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Navigation Tabs - Centered above header */}
      {isNurserySchool && (
        <div className="flex justify-center">
          <div className="flex gap-2 p-1 bg-white rounded-lg shadow-sm border w-fit">
            <button
              onClick={() => updateMainTab('dashboard')}
              className={`
                px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2
                ${currentMainTab === 'dashboard' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v4H8V5z" />
              </svg>
              Dashboard
            </button>
            
            <button
              onClick={() => updateMainTab('monthly-reports')}
              className={`
                px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2
                ${currentMainTab === 'monthly-reports' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
            >
              <FileTextIcon className="h-4 w-4" />
              Monthly Report
            </button>
            
            <button
              onClick={() => updateMainTab('nursery-assessment')}
              className={`
                px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2
                ${currentMainTab === 'nursery-assessment' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
            >
              <BookOpenIcon className="h-4 w-4" />
              Nursery Assessment
            </button>
          </div>
        </div>
      )}

      {/* Conditional Tab Structure */}
      {isNurserySchool ? (
        /* Nursery School: Content based on selected tab */
        <div className="space-y-6">

          {/* Dashboard Tab Content */}
          {currentMainTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Welcome Header */}
              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                      Welcome back, <span className="text-blue-600">Head Teacher</span>
                    </h1>
                    <p className="text-gray-600 mt-1">
                      Here's an overview of your school reports and submission status.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <SchoolReadinessStatus className="justify-start sm:justify-end" />
                  </div>
                </div>
              </div>

              {/* School Assessment Entry Card - Top Priority */}
              <HeadTeacherAssessmentCard schoolId={schoolInfo?.id || ''} />

              {/* Stats Overview Cards */}
              <div className={`grid gap-6 ${
                isNurserySchool 
                  ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' 
                  : 'grid-cols-1 md:grid-cols-3'
              }`}>
                {/* Overall Compliance */}
                <Card className="bg-white border border-gray-200 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-sm text-gray-600">Overall Compliance</span>
                        </div>
                        <p className="text-sm text-gray-500 mb-3">Academic year compliance rate</p>
                        <p className="text-3xl font-bold text-gray-900">
                          {calculateCompliancePercentage()}%
                        </p>
                      </div>
                      <div className="p-3 bg-green-100 rounded-lg">
                        <TrendingUpIcon className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Monthly Reports */}
                <Card className="bg-white border border-gray-200 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span className="text-sm text-gray-600">Monthly Reports</span>
                        </div>
                        <p className="text-sm text-gray-500 mb-3">Reports submitted this year</p>
                        <p className="text-3xl font-bold text-gray-900">{reports.length}</p>
                      </div>
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <FileTextIcon className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Assessment Status - Only show for nursery schools */}
                {isNurserySchool && (
                  <Card className="bg-white border border-gray-200 shadow-sm">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                            <span className="text-sm text-gray-600">Assessment Status</span>
                          </div>
                          <p className="text-sm text-gray-500 mb-3">Nursery assessments completed</p>
                          <p className="text-3xl font-bold text-gray-900">{calculateNurseryAssessmentPercentage()}%</p>
                        </div>
                        <div className="p-3 bg-orange-100 rounded-lg">
                          <BookOpenIcon className="h-6 w-6 text-orange-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recent Activity */}
                <Card className="bg-white border border-gray-200 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                          <span className="text-sm text-gray-600">Recent Activity</span>
                        </div>
                        <p className="text-sm text-gray-500 mb-3">Reports in last 3 months</p>
                        <p className="text-3xl font-bold text-gray-900">
                          {
                            reports.filter((r) => {
                              const reportDate = new Date(r.updated_at)
                              const threeMonthsAgo = new Date()
                              threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
                              return reportDate >= threeMonthsAgo
                            }).length
                          }
                        </p>
                      </div>
                      <div className="p-3 bg-purple-100 rounded-lg">
                        <UsersIcon className="h-6 w-6 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Section - Monthly Trends */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Enrollment Trends */}
                <Card className="bg-white border border-gray-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-gray-900">Monthly Enrollment Trends</CardTitle>
                    <p className="text-sm text-gray-500">Student enrollment for each month of {new Date().getFullYear()}</p>
                  </CardHeader>
                  <CardContent>
                    {trendsLoading ? (
                      <div className="h-64 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                      </div>
                    ) : (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={trendsData.enrollmentTrends}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis 
                              dataKey="month" 
                              stroke="#666"
                              fontSize={12}
                            />
                            <YAxis 
                              stroke="#666"
                              fontSize={12}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px'
                              }}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="enrollment" 
                              stroke="#3b82f6" 
                              strokeWidth={3}
                              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                              name="Students Enrolled"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Monthly Attendance Trends */}
                <Card className="bg-white border border-gray-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-gray-900">Attendance Trends</CardTitle>
                    <p className="text-sm text-gray-500">Student and teacher attendance rates for {new Date().getFullYear()}</p>
                  </CardHeader>
                  <CardContent>
                    {trendsLoading ? (
                      <div className="h-64 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                      </div>
                    ) : (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={trendsData.attendanceTrends}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis 
                              dataKey="month" 
                              stroke="#666"
                              fontSize={12}
                            />
                            <YAxis 
                              stroke="#666"
                              fontSize={12}
                              domain={[0, 100]}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px'
                              }}
                              formatter={(value, name) => [`${value}%`, name]}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="studentAttendance" 
                              stroke="#10b981" 
                              strokeWidth={2}
                              dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                              name="Student Attendance"
                            />
                            <Line 
                              type="monotone" 
                              dataKey="teacherAttendance" 
                              stroke="#f59e0b" 
                              strokeWidth={2}
                              dot={{ fill: '#f59e0b', strokeWidth: 2, r: 3 }}
                              name="Teacher Attendance"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Monthly Punctuality Trends */}
                <Card className="bg-white border border-gray-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-gray-900">Punctuality Trends</CardTitle>
                    <p className="text-sm text-gray-500">Student and teacher punctuality rates for {new Date().getFullYear()}</p>
                  </CardHeader>
                  <CardContent>
                    {trendsLoading ? (
                      <div className="h-64 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                      </div>
                    ) : (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={trendsData.punctualityTrends}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis 
                              dataKey="month" 
                              stroke="#666"
                              fontSize={12}
                            />
                            <YAxis 
                              stroke="#666"
                              fontSize={12}
                              domain={[0, 100]}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px'
                              }}
                              formatter={(value, name) => [`${value}%`, name]}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="studentPunctuality" 
                              stroke="#8b5cf6" 
                              strokeWidth={2}
                              dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 3 }}
                              name="Student Punctuality"
                            />
                            <Line 
                              type="monotone" 
                              dataKey="teacherPunctuality" 
                              stroke="#ef4444" 
                              strokeWidth={2}
                              dot={{ fill: '#ef4444', strokeWidth: 2, r: 3 }}
                              name="Teacher Punctuality"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Monthly Expenditure Trends */}
                <Card className="bg-white border border-gray-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-gray-900">Monthly Expenditure Trends</CardTitle>
                    <p className="text-sm text-gray-500">School expenditure for each month of {new Date().getFullYear()}</p>
                  </CardHeader>
                  <CardContent>
                    {trendsLoading ? (
                      <div className="h-64 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                      </div>
                    ) : (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={trendsData.expenditureTrends}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis 
                              dataKey="month" 
                              stroke="#666"
                              fontSize={12}
                            />
                            <YAxis 
                              stroke="#666"
                              fontSize={12}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px'
                              }}
                              formatter={(value) => [`$${value?.toLocaleString()}`, 'Total Expenditure']}
                            />
                            <Bar 
                              dataKey="expenditure" 
                              fill="#dc2626" 
                              radius={[4, 4, 0, 0]}
                              name="Total Expenditure"
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions Grid */}
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <TrendingUpIcon className="h-5 w-5 text-blue-600" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`grid gap-4 ${
                    isNurserySchool 
                      ? 'grid-cols-1 sm:grid-cols-3' 
                      : 'grid-cols-1 sm:grid-cols-2'
                  }`}>
                    <button 
                      onClick={() => {updateMainTab('monthly-reports'); updateURL('current-report')}}
                      className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 text-left"
                    >
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <FileTextIcon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">Start Monthly Report</h3>
                        <p className="text-sm text-gray-600">Submit your current period report</p>
                      </div>
                    </button>
                    
                    {isNurserySchool && (
                      <button 
                        onClick={() => updateMainTab('nursery-assessment')}
                        className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-all duration-200 text-left"
                      >
                        <div className="p-2 bg-green-100 rounded-lg">
                          <BookOpenIcon className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">Submit Assessment</h3>
                          <p className="text-sm text-gray-600">Complete nursery assessments</p>
                        </div>
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Monthly Reports Tab Content */}
          {currentMainTab === 'monthly-reports' && (
            <div className="space-y-6">
              {/* Simple Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Monthly School Reports</h1>
                  <p className="text-gray-600 mt-1">Submit and manage monthly school reports and submissions</p>
                </div>
              </div>

              {/* Sub-navigation */}
              <div className="flex gap-2 p-1 bg-gray-100 rounded-lg w-fit">
                <button
                  onClick={() => updateURL('current-report')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    currentTab === 'current-report'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  Current Report
                </button>
                <button
                  onClick={() => updateURL('previous-report')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    currentTab === 'previous-report'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  Previous Report
                </button>
                <button
                  onClick={() => updateURL('view-reports')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    currentTab === 'view-reports'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  View Reports
                </button>
              </div>

              {/* Content Area - Clean and Simple */}
              <div className="bg-white">
                {currentTab === 'current-report' && (
                  <div>
                    <MonthlyReportForm onSuccess={handleReportSuccess} />
                  </div>
                )}
                {currentTab === 'previous-report' && (
                  <div>
                    <PreviousReportForm onSuccess={handleReportSuccess} />
                  </div>
                )}
                {currentTab === 'view-reports' && (
                  <div>
                    {/* Blue Header Band */}
                    <div className="bg-blue-600 text-white p-6 rounded-lg mb-6">
                      <div className="flex items-center gap-3">
                        <FileTextIcon className="h-6 w-6" />
                        <div>
                          <h2 className="text-xl font-semibold mb-1">View Submitted Reports</h2>
                          <p className="text-blue-100">Browse and review your previously submitted monthly reports.</p>
                        </div>
                      </div>
                    </div>
                    {renderViewReportsContent()}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Nursery Assessment Tab Content */}
          {currentMainTab === 'nursery-assessment' && (
            <div className="space-y-6">
              {/* Simple Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Nursery Assessment Reports</h1>
                  <p className="text-gray-600 mt-1">Specialized assessment and development tracking for nursery students</p>
                </div>
              </div>

              {/* Sub-navigation */}
              <div className="flex gap-2 p-1 bg-gray-100 rounded-lg w-fit">
                <button
                  onClick={() => updateURL('submit-assessment')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    currentTab === 'submit-assessment'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  Submit Assessment
                </button>
                <button
                  onClick={() => updateURL('view-assessments')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    currentTab === 'view-assessments'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  View Previous Assessments
                </button>
              </div>

              {/* Content Area - Clean and Simple */}
              <div className="bg-white">
                {currentTab === 'submit-assessment' && (
                  <div>
                    <NurseryAssessmentForm onSuccess={handleNurseryAssessmentSuccess} />
                  </div>
                )}
                {currentTab === 'view-assessments' && (
                  <div>
                    {/* Blue Header Band */}
                    <div className="bg-blue-600 text-white p-6 rounded-lg mb-6">
                      <div className="flex items-center gap-3">
                        <EyeIcon className="h-6 w-6" />
                        <div>
                          <h2 className="text-xl font-semibold mb-1">View Previous Assessments</h2>
                          <p className="text-blue-100">Browse and review previously submitted nursery assessments and student progress reports.</p>
                        </div>
                      </div>
                    </div>
                    
                    <NurseryAssessmentsList />
                  </div>
                )}
                {currentTab !== 'submit-assessment' && currentTab !== 'view-assessments' && (
                  <div>
                    <div className="mb-6">
                      <h2 className="text-lg font-semibold text-gray-900 mb-2">Nursery Assessment Management</h2>
                      <p className="text-gray-600 text-sm">Choose an option from the navigation above to get started.</p>
                    </div>
                    <div className="text-center py-16">
                      <div className="p-6 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full w-fit mx-auto mb-6">
                        <BookOpenIcon className="h-16 w-16 text-amber-600" />
                      </div>
                      <h3 className="text-2xl font-semibold mb-3 text-gray-800">Select an Option Above</h3>
                      <p className="text-gray-600 max-w-md mx-auto leading-relaxed">
                        Choose either "Submit Assessment" or "View Previous Assessments" to get started with nursery assessment management.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Non-Nursery Schools: Clean two-tab structure */
        <div className="space-y-4 sm:space-y-6">
          {/* Top Navigation Tabs - Centered above header */}
          <div className="flex justify-center">
            <div className="flex gap-2 p-1 bg-white rounded-lg shadow-sm border w-fit">
              <button
                onClick={() => updateMainTab('dashboard')}
                className={`
                  px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2
                  ${currentMainTab === 'dashboard' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }
                `}
              >
                <BarChart3Icon className="h-4 w-4" />
                Dashboard
              </button>
              
              <button
                onClick={() => updateMainTab('monthly-reports')}
                className={`
                  px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2
                  ${currentMainTab === 'monthly-reports' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }
                `}
              >
                <FileTextIcon className="h-4 w-4" />
                Monthly Report
              </button>
            </div>
          </div>

          {/* Dashboard Tab Content */}
          {currentMainTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Welcome Header */}
              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                      Welcome back, <span className="text-blue-600">Head Teacher</span>
                    </h1>
                    <p className="text-gray-600 mt-1">
                      Here's an overview of your school reports and submission status.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">School</p>
                      <p className="font-medium text-gray-900">{schoolInfo?.name || 'Loading...'}</p>
                    </div>
                  </div>
                </div>
                
                {/* Quick Actions */}
                <div className="mt-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <button 
                      onClick={() => {updateMainTab('monthly-reports'); updateURL('current-report')}}
                      className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 text-left"
                    >
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <FileTextIcon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">Start Monthly Report</h3>
                        <p className="text-sm text-gray-600">Submit your current period report</p>
                      </div>
                    </button>
                    
                    <button 
                      onClick={() => {updateMainTab('monthly-reports'); updateURL('view-reports')}}
                      className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-all duration-200 text-left"
                    >
                      <div className="p-2 bg-green-100 rounded-lg">
                        <EyeIcon className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">View Reports</h3>
                        <p className="text-sm text-gray-600">Browse previous submissions</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* School Assessment Entry Card */}
                <div className="mt-6">
                  <HeadTeacherAssessmentCard schoolId={schoolInfo?.id || ''} />
                </div>
              </div>

              {/* Analytics Dashboard */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Monthly Reports */}
                <Card className="bg-white border border-gray-200 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span className="text-sm text-gray-600">Monthly Reports</span>
                        </div>
                        <p className="text-sm text-gray-500 mb-3">Reports submitted this year</p>
                        <p className="text-3xl font-bold text-gray-900">{reports.length}</p>
                      </div>
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <FileTextIcon className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Submission Rate */}
                <Card className="bg-white border border-gray-200 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-sm text-gray-600">Submission Rate</span>
                        </div>
                        <p className="text-sm text-gray-500 mb-3">Academic year compliance rate</p>
                        <p className="text-3xl font-bold text-gray-900">{calculateCompliancePercentage()}%</p>
                      </div>
                      <div className="p-3 bg-green-100 rounded-lg">
                        <TrendingUpIcon className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card className="bg-white border border-gray-200 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                          <span className="text-sm text-gray-600">Recent Activity</span>
                        </div>
                        <p className="text-sm text-gray-500 mb-3">Reports in last 3 months</p>
                        <p className="text-3xl font-bold text-gray-900">
                          {
                            reports.filter((r) => {
                              const reportDate = new Date(r.updated_at)
                              const threeMonthsAgo = new Date()
                              threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
                              return reportDate >= threeMonthsAgo
                            }).length
                          }
                        </p>
                      </div>
                      <div className="p-3 bg-purple-100 rounded-lg">
                        <CalendarIcon className="h-6 w-6 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Report Status Distribution */}
                <Card className="bg-white border border-gray-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-gray-900">Report Status Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {(() => {
                        const stats = getReportStatistics()
                        return (
                          <>
                            {/* Submitted Reports */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                <span className="text-sm text-gray-600">Submitted: {stats.submitted}</span>
                              </div>
                              <span className="text-sm font-medium text-gray-900">
                                {stats.submittedPercentage}%
                              </span>
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${stats.submittedPercentage}%` }}
                              ></div>
                            </div>

                            {/* Draft Reports */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                                <span className="text-sm text-gray-600">Draft: {stats.draft}</span>
                              </div>
                              <span className="text-sm font-medium text-gray-900">{stats.draftPercentage}%</span>
                            </div>

                            {/* Overdue Reports */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                <span className="text-sm text-gray-600">Overdue: {stats.overdue}</span>
                              </div>
                              <span className="text-sm font-medium text-gray-900">{stats.overduePercentage}%</span>
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Reports */}
                <Card className="bg-white border border-gray-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-gray-900">Recent Reports</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {reports.slice(0, 3).map((report) => (
                        <div key={report.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-sm text-gray-900">
                              {formatReportMonth(report.month, report.year)}
                            </p>
                            <p className="text-xs text-gray-500">
                              Submitted: {formatDate(report.updated_at)}
                            </p>
                          </div>
                          <Badge className="bg-green-100 text-green-700 text-xs">
                            Submitted
                          </Badge>
                        </div>
                      ))}
                      {reports.length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-4">No reports submitted yet</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Monthly Reports Tab Content */}
          {currentMainTab === 'monthly-reports' && (
            <div className="space-y-6">
              {/* Simple Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Monthly School Reports</h1>
                  <p className="text-gray-600 mt-1">Submit and manage monthly school reports and submissions</p>
                </div>
              </div>

              {/* Sub-navigation */}
              <div className="flex gap-2 p-1 bg-gray-100 rounded-lg w-fit">
                <button
                  onClick={() => updateURL('current-report')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    currentTab === 'current-report'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  Current Report
                </button>
                <button
                  onClick={() => updateURL('previous-report')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    currentTab === 'previous-report'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  Previous Report
                </button>
                <button
                  onClick={() => updateURL('view-reports')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    currentTab === 'view-reports'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  View Reports
                </button>
              </div>

              {/* Content Area - Clean and Simple */}
              <div className="bg-white">
                {currentTab === 'current-report' && (
                  <div>
                    {/* Blue Header Band */}
                    <div className="bg-blue-600 text-white p-6 rounded-lg mb-6">
                      <div className="flex items-center gap-3">
                        <FileTextIcon className="h-6 w-6" />
                        <div>
                          <h2 className="text-xl font-semibold mb-1">Submit Current Period Report</h2>
                          <p className="text-blue-100">Complete and submit your monthly report for the current reporting period.</p>
                        </div>
                      </div>
                    </div>
                    <MonthlyReportForm onSuccess={handleReportSuccess} />
                  </div>
                )}
                {currentTab === 'previous-report' && (
                  <div>
                    <div className="mb-6">
                      <h2 className="text-lg font-semibold text-gray-900 mb-2">Submit Previous Report</h2>
                      <p className="text-gray-600 text-sm">Submit any missed reports from previous reporting periods.</p>
                    </div>
                    <PreviousReportForm onSuccess={handleReportSuccess} />
                  </div>
                )}
                {currentTab === 'view-reports' && (
                  <div>
                    {/* Blue Header Band */}
                    <div className="bg-blue-600 text-white p-6 rounded-lg mb-6">
                      <div className="flex items-center gap-3">
                        <FileTextIcon className="h-6 w-6" />
                        <div>
                          <h2 className="text-xl font-semibold mb-1">View Submitted Reports</h2>
                          <p className="text-blue-100">Browse and review your previously submitted monthly reports.</p>
                        </div>
                      </div>
                    </div>
                    {renderViewReportsContent()}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
