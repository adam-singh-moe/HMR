"use client"

import { useEffect, useState } from "react"
import { MonthlyReportForm } from "@/components/monthly-report-form"
import { PreviousReportForm } from "@/components/previous-report-form"
import { SchoolReadinessStatus } from "@/components/school-readiness-status"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CalendarIcon, UsersIcon, GraduationCapIcon, FileTextIcon, TrendingUpIcon, Loader2, Eye, RefreshCw, BookOpenIcon, PlusCircleIcon, ClockIcon, EyeIcon, BarChart3Icon } from "lucide-react"
import { getHmrReports } from "@/app/actions/hmr-reports"
import { getUser, getUserSchoolInfo } from "@/app/actions/auth"
import { useRouter, useSearchParams } from "next/navigation"
import { AuthWrapper } from "@/components/auth-wrapper"

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
  
  // Get tab from URL params, with fallback
  const currentTab = searchParams.get('tab') || 'current-report'
  const currentMainTab = searchParams.get('mainTab') || 'dashboard'
  
  // State for reports and loading
  const [reports, setReports] = useState<HmrReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null)
  const [isNurserySchool, setIsNurserySchool] = useState(false)
  
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
      params.set('tab', 'nursery-assessment-form')
    }
    router.replace(`/dashboard/head-teacher?${params.toString()}`)
  }

  // Function to fetch school information
  const fetchSchoolInfo = async () => {
    try {
      console.log('Fetching school info...')
      const result = await getUserSchoolInfo()
      console.log('School info result:', result)
      
      if (result.error) {
        console.error('Error fetching school info:', result.error)
        return
      }

      if (result.school) {
        console.log('School data:', result.school)
        console.log('School level:', result.school.level)
        setSchoolInfo(result.school)
        const isNursery = result.school.level?.toLowerCase() === 'nursery'
        console.log('Is nursery school?', isNursery)
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

  useEffect(() => {
    fetchSchoolInfo()
    fetchReports()
  }, [])

  const formatReportMonth = (month: number, year: number) => {
    return `${monthNames[month - 1]} ${year}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  // Render function for view reports content
  const renderViewReportsContent = () => (
    <div className="grid gap-4">
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

              {/* Stats Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Overall Compliance */}
                <Card className="bg-white border border-gray-200 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-sm text-gray-600">Overall Compliance</span>
                        </div>
                        <p className="text-sm text-gray-500 mb-3">Average across all reports</p>
                        <p className="text-3xl font-bold text-gray-900">
                          {reports.length > 0 ? Math.round((reports.length / Math.max(reports.length, 1)) * 100) : 0}%
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

                {/* Assessment Status */}
                <Card className="bg-white border border-gray-200 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                          <span className="text-sm text-gray-600">Assessment Status</span>
                        </div>
                        <p className="text-sm text-gray-500 mb-3">Nursery assessments completed</p>
                        <p className="text-3xl font-bold text-gray-900">85%</p>
                      </div>
                      <div className="p-3 bg-orange-100 rounded-lg">
                        <BookOpenIcon className="h-6 w-6 text-orange-600" />
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
                        <UsersIcon className="h-6 w-6 text-purple-600" />
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
                      {/* Submitted Reports */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-sm text-gray-600">Submitted: {reports.length}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {reports.length > 0 ? '100%' : '0%'}
                        </span>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: reports.length > 0 ? '100%' : '0%' }}
                        ></div>
                      </div>

                      {/* Draft Reports */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                          <span className="text-sm text-gray-600">Draft: 0</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">0%</span>
                      </div>

                      {/* Overdue Reports */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <span className="text-sm text-gray-600">Overdue: 0</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">0%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Monthly Trend */}
                <Card className="bg-white border border-gray-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-gray-900">Monthly Submissions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <TrendingUpIcon className="h-8 w-8 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Consistent Progress</h3>
                        <p className="text-gray-600 text-sm">
                          You're maintaining a good submission schedule. Keep up the excellent work!
                        </p>
                      </div>
                    </div>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      onClick={() => {updateMainTab('nursery-assessment'); updateURL('submit-assessment')}}
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
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors">
                  <FileTextIcon className="h-4 w-4" />
                  Monthly Reports
                </button>
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
            <div className="space-y-4">
              <Card className="gradient-card border-0 shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl text-primary-700 flex items-center gap-2">
                    <BookOpenIcon className="h-6 w-6" />
                    Nursery Assessment Reports
                  </CardTitle>
                  <CardDescription className="text-primary-600">
                    Specialized assessment and development tracking for nursery students
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Sub-navigation for Nursery Assessment */}
                  <div className="flex flex-col sm:flex-row gap-3 p-2 bg-gray-50 rounded-lg border">
                    <button
                      onClick={() => updateURL('submit-assessment')}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md font-medium transition-all duration-200 ${
                        currentTab === 'submit-assessment'
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-white text-gray-700 hover:bg-purple-50 hover:text-purple-600 border'
                      }`}
                    >
                      <PlusCircleIcon className="h-4 w-4" />
                      Submit Assessment
                    </button>
                    <button
                      onClick={() => updateURL('view-assessments')}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md font-medium transition-all duration-200 ${
                        currentTab === 'view-assessments'
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-white text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 border'
                      }`}
                    >
                      <EyeIcon className="h-4 w-4" />
                      View Previous Assessments
                    </button>
                  </div>

                  {/* Content Area */}
                  <div className="min-h-[400px]">
                    {currentTab === 'submit-assessment' && (
                      <div className="space-y-4">
                        <div className="border-l-4 border-purple-500 bg-purple-50 p-4 rounded-r-lg">
                          <h3 className="font-semibold text-purple-800 mb-1">Submit Nursery Assessment</h3>
                          <p className="text-purple-700 text-sm">Complete developmental assessments and learning milestone reports for nursery students.</p>
                        </div>
                        <div className="text-center py-12">
                          <div className="p-6 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full w-fit mx-auto mb-6">
                            <BookOpenIcon className="h-16 w-16 text-purple-600" />
                          </div>
                          <h3 className="text-2xl font-semibold mb-3 text-gray-800">Assessment Form Coming Soon</h3>
                          <p className="text-gray-600 max-w-md mx-auto leading-relaxed">
                            The nursery assessment submission form is currently being developed. 
                            This will include student development tracking, learning milestones, and progress monitoring.
                          </p>
                          <div className="mt-6 px-4 py-2 bg-purple-100 text-purple-800 rounded-full text-sm font-medium w-fit mx-auto">
                            🚀 Feature in Development
                          </div>
                        </div>
                      </div>
                    )}
                    {currentTab === 'view-assessments' && (
                      <div className="space-y-4">
                        <div className="border-l-4 border-indigo-500 bg-indigo-50 p-4 rounded-r-lg">
                          <h3 className="font-semibold text-indigo-800 mb-1">View Previous Assessments</h3>
                          <p className="text-indigo-700 text-sm">Browse and review previously submitted nursery assessments and student progress reports.</p>
                        </div>
                        <div className="text-center py-12">
                          <div className="p-6 bg-gradient-to-br from-indigo-100 to-blue-100 rounded-full w-fit mx-auto mb-6">
                            <EyeIcon className="h-16 w-16 text-indigo-600" />
                          </div>
                          <h3 className="text-2xl font-semibold mb-3 text-gray-800">Assessment History Coming Soon</h3>
                          <p className="text-gray-600 max-w-md mx-auto leading-relaxed">
                            View, search, and manage your previously submitted nursery assessments. 
                            Track student progress over time with detailed reporting tools.
                          </p>
                          <div className="mt-6 px-4 py-2 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium w-fit mx-auto">
                            � Feature in Development
                          </div>
                        </div>
                      </div>
                    )}
                    {currentTab !== 'submit-assessment' && currentTab !== 'view-assessments' && (
                      <div className="text-center py-16">
                        <div className="p-6 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full w-fit mx-auto mb-6">
                          <BookOpenIcon className="h-16 w-16 text-amber-600" />
                        </div>
                        <h3 className="text-2xl font-semibold mb-3 text-gray-800">Select an Option Above</h3>
                        <p className="text-gray-600 max-w-md mx-auto leading-relaxed">
                          Choose either "Submit Assessment" or "View Previous Assessments" to get started with nursery assessment management.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        <p className="text-sm text-gray-500 mb-3">Reports submitted on time</p>
                        <p className="text-3xl font-bold text-gray-900">95%</p>
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
                      {/* Submitted Reports */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-sm text-gray-600">Submitted: {reports.length}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {reports.length > 0 ? '100%' : '0%'}
                        </span>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: reports.length > 0 ? '100%' : '0%' }}
                        ></div>
                      </div>
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
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors">
                  <FileTextIcon className="h-4 w-4" />
                  Monthly Reports
                </button>
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
                    <div className="mb-6">
                      <h2 className="text-lg font-semibold text-gray-900 mb-2">Submit Current Period Report</h2>
                      <p className="text-gray-600 text-sm">Complete and submit your monthly report for the current reporting period.</p>
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
