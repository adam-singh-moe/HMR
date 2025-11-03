"use client"

import { useEffect, useState } from "react"
import { MonthlyReportForm } from "@/components/monthly-report-form"
import { PreviousReportForm } from "@/components/previous-report-form"
import { SchoolReadinessStatus } from "@/components/school-readiness-status"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CalendarIcon, UsersIcon, GraduationCapIcon, FileTextIcon, TrendingUpIcon, Loader2, Eye, RefreshCw, BookOpenIcon } from "lucide-react"
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
  const currentMainTab = searchParams.get('mainTab') || 'monthly-reports'
  
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
        
        // Temporary: Force nursery for testing
        console.log('Forcing nursery mode for testing...')
        setIsNurserySchool(true)
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

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Section */}
      <div className="gradient-header rounded-lg sm:rounded-xl p-4 sm:p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-start sm:items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 bg-white/20 rounded-lg flex-shrink-0">
              <FileTextIcon className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Head Teacher Dashboard</h1>
              <p className="text-blue-100 text-sm sm:text-base">
                Manage your monthly school reports and track submissions
              </p>
              {/* Debug info */}
              {schoolInfo && (
                <p className="text-blue-200 text-xs mt-1">
                  Debug: School Level: {schoolInfo.level} | Is Nursery: {isNurserySchool ? 'Yes' : 'No'}
                </p>
              )}
            </div>
          </div>
          
          {/* School Readiness Status */}
          <div className="w-full sm:w-auto">
            <SchoolReadinessStatus className="justify-start sm:justify-end" />
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="gradient-card border-0 shadow-md">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded-lg flex-shrink-0">
                <TrendingUpIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Total Reports</p>
                <p className="text-xl sm:text-2xl font-bold text-primary-700">{reports.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="gradient-card border-0 shadow-md">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                <GraduationCapIcon className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">This Year</p>
                <p className="text-xl sm:text-2xl font-bold text-green-700">
                  {reports.filter((r) => r.year === new Date().getFullYear()).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="gradient-card border-0 shadow-md sm:col-span-2 lg:col-span-1">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                <UsersIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Recent Reports</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-700">
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
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conditional Tab Structure */}
      {isNurserySchool ? (
        /* Nursery School: Two-level tab structure */
        <Tabs value={currentMainTab} onValueChange={updateMainTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 bg-primary-50 border border-primary-200 h-auto">
            <TabsTrigger
              value="monthly-reports"
              className="data-[state=active]:bg-primary-600 data-[state=active]:text-white text-sm py-3"
            >
              <FileTextIcon className="h-4 w-4 mr-2" />
              Monthly Report
            </TabsTrigger>
            <TabsTrigger
              value="nursery-assessment"
              className="data-[state=active]:bg-primary-600 data-[state=active]:text-white text-sm py-3"
            >
              <BookOpenIcon className="h-4 w-4 mr-2" />
              Nursery Assessment Report
            </TabsTrigger>
          </TabsList>

          <TabsContent value="monthly-reports" className="space-y-4">
            {/* Nested tabs for monthly reports */}
            <Tabs value={currentTab} onValueChange={updateURL} className="space-y-4">
              <TabsList className="grid w-full grid-cols-3 bg-blue-50 border border-blue-200 h-auto">
                <TabsTrigger
                  value="current-report"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs sm:text-sm py-2 sm:py-3"
                >
                  Submit report for current period
                </TabsTrigger>
                <TabsTrigger
                  value="previous-report"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs sm:text-sm py-2 sm:py-3"
                >
                  Submit previous report
                </TabsTrigger>
                <TabsTrigger
                  value="view-reports"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs sm:text-sm py-2 sm:py-3"
                >
                  View previous reports
                </TabsTrigger>
              </TabsList>

              <TabsContent value="current-report" className="space-y-4">
                <MonthlyReportForm onSuccess={handleReportSuccess} />
              </TabsContent>

              <TabsContent value="previous-report" className="space-y-4">
                <PreviousReportForm onSuccess={handleReportSuccess} />
              </TabsContent>

              <TabsContent value="view-reports" className="space-y-4">
                {renderViewReportsContent()}
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="nursery-assessment" className="space-y-4">
            <Card className="gradient-card border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl text-primary-700 flex items-center gap-2">
                  <BookOpenIcon className="h-5 w-5" />
                  Nursery Assessment Report
                </CardTitle>
                <CardDescription>
                  Submit nursery-specific assessment reports for student development and learning outcomes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <BookOpenIcon className="h-16 w-16 text-primary-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-primary-700">Coming Soon</h3>
                  <p className="text-muted-foreground">
                    Nursery assessment reporting functionality is currently under development.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        /* Non-Nursery Schools: Original single-level tab structure */
        <Tabs value={currentTab} onValueChange={updateURL} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 bg-primary-50 border border-primary-200 h-auto">
            <TabsTrigger
              value="current-report"
              className="data-[state=active]:bg-primary-600 data-[state=active]:text-white text-xs sm:text-sm py-2 sm:py-3"
            >
              Submit report for current period
            </TabsTrigger>
            <TabsTrigger
              value="previous-report"
              className="data-[state=active]:bg-primary-600 data-[state=active]:text-white text-xs sm:text-sm py-2 sm:py-3"
            >
              Submit previous report
            </TabsTrigger>
            <TabsTrigger
              value="view-reports"
              className="data-[state=active]:bg-primary-600 data-[state=active]:text-white text-xs sm:text-sm py-2 sm:py-3"
            >
              View previous reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="current-report" className="space-y-4">
            <MonthlyReportForm onSuccess={handleReportSuccess} />
          </TabsContent>

          <TabsContent value="previous-report" className="space-y-4">
            <PreviousReportForm onSuccess={handleReportSuccess} />
          </TabsContent>

          <TabsContent value="view-reports" className="space-y-4">
            {renderViewReportsContent()}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
