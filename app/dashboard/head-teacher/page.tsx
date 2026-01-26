"use client"

import { useEffect, useState } from "react"
import { MonthlyReportForm } from "@/components/monthly-report-form"
import { PreviousReportForm } from "@/components/previous-report-form"
import { NurseryAssessmentForm } from "@/components/nursery-assessment-form"
import { NurseryAssessmentsList } from "@/components/nursery-assessments-list"
import { SchoolReadinessStatus } from "@/components/school-readiness-status"
import { HeadTeacherAssessmentCard } from "@/components/school-assessment-entry-card"
import { TeachersList } from "@/components/teachers-list"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CalendarIcon, UsersIcon, GraduationCapIcon, FileTextIcon, TrendingUpIcon, Loader2, Eye, RefreshCw, BookOpenIcon, PlusCircleIcon, ClockIcon, EyeIcon, BarChart3Icon, Sun, Moon, Bell, Lightbulb } from "lucide-react"
import { useTheme } from "next-themes"
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
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Mount effect for theme toggle
  useEffect(() => {
    setMounted(true)
  }, [])

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
  
  // State for reports and loading (cached to prevent re-fetching on tab switch)
  const [reports, setReports] = useState<HmrReport[]>([])
  const [reportsLoaded, setReportsLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null)
  const [schoolInfoLoaded, setSchoolInfoLoaded] = useState(false)
  const [isNurserySchool, setIsNurserySchool] = useState(false)

  // State for nursery assessments (cached to prevent re-fetching on tab switch)
  const [nurseryAssessments, setNurseryAssessments] = useState<any[]>([])
  const [nurseryAssessmentsLoaded, setNurseryAssessmentsLoaded] = useState(false)
  const [nurseryAssessmentsLoading, setNurseryAssessmentsLoading] = useState(false)
  const [nurseryAssessmentsError, setNurseryAssessmentsError] = useState<string | null>(null)

  // State for teachers (cached to prevent re-fetching on tab switch)
  const [cachedTeachers, setCachedTeachers] = useState<any[] | undefined>(undefined)
  const [cachedDeletedTeachers, setCachedDeletedTeachers] = useState<any[] | undefined>(undefined)

  // State for current report status (cached to prevent re-fetching on tab switch)
  const [cachedReportStatus, setCachedReportStatus] = useState<{
    reportId: string | null
    isSubmitted: boolean
    status: string
    hasExistingReport: boolean
  } | undefined>(undefined)

  // State for dashboard trends (cached to prevent re-fetching on tab switch)
  const [trendsData, setTrendsData] = useState<any>({
    enrollmentTrends: [],
    attendanceTrends: [],
    punctualityTrends: [],
    expenditureTrends: [],
    availableYears: []
  })
  const [trendsLoaded, setTrendsLoaded] = useState(false)
  const [trendsLoading, setTrendsLoading] = useState(false)
  const [selectedTrendsYear, setSelectedTrendsYear] = useState<number | null>(null)
  const [initialYearSet, setInitialYearSet] = useState(false)
  
  // Callback to cache teachers data
  const handleTeachersDataLoaded = (teachers: any[], deletedTeachers: any[]) => {
    setCachedTeachers(teachers)
    setCachedDeletedTeachers(deletedTeachers)
  }
  
  // Callback to cache report status
  const handleReportStatusLoaded = (status: {
    reportId: string | null
    isSubmitted: boolean
    status: string
    hasExistingReport: boolean
  }) => {
    setCachedReportStatus(status)
  }
  
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

  // Function to fetch school information (with caching)
  const fetchSchoolInfo = async (forceRefresh = false) => {
    // Skip if already loaded and not forcing refresh
    if (schoolInfoLoaded && !forceRefresh) return

    try {
      const result = await getUserSchoolInfo()

      if (result.error) {
        console.error('Error fetching school info:', result.error)
        return
      }

      if (result.school) {
        setSchoolInfo(result.school)
        const isNursery = result.school.level?.toLowerCase() === 'nursery' || result.school.has_nursery_class === true
        setIsNurserySchool(isNursery)
        setSchoolInfoLoaded(true)
      }
    } catch (err) {
      console.error('Error in fetchSchoolInfo:', err)
    }
  }

  // Function to fetch reports (with caching)
  const fetchReports = async (forceRefresh = false) => {
    // Skip if already loaded and not forcing refresh
    if (reportsLoaded && !forceRefresh) {
      setLoading(false)
      return
    }

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
        setReportsLoaded(true)
      }
    } catch (err) {
      console.error("Error in fetchReports:", err)
      setError("Failed to load reports")
    } finally {
      setLoading(false)
    }
  }

  // Function to fetch nursery assessments (with caching)
  const fetchNurseryAssessments = async (forceRefresh = false) => {
    if (!user?.id) return

    // Skip if already loaded and not forcing refresh
    if (nurseryAssessmentsLoaded && !forceRefresh) return

    try {
      setNurseryAssessmentsLoading(true)
      setNurseryAssessmentsError(null)

      const result = await getSubmittedNurseryAssessments(user.id)

      if (result.error) {
        console.error("Error from getSubmittedNurseryAssessments:", result.error)
        setNurseryAssessmentsError(result.error)
      } else {
        setNurseryAssessments(result.assessments)
        setNurseryAssessmentsLoaded(true)
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
    // Force refresh reports and trends data
    setReportsLoaded(false)
    setTrendsLoaded(false)
    setCachedReportStatus(undefined)
    fetchReports(true)
    fetchTrendsData(selectedTrendsYear || undefined, true)
    updateURL('view-reports') // Switch to view previous reports tab to show the submitted report
  }

  // Function to handle successful nursery assessment submission
  const handleNurseryAssessmentSuccess = () => {
    // Force refresh nursery assessments
    setNurseryAssessmentsLoaded(false)
    fetchNurseryAssessments(true)
    updateURL('view-assessments') // Switch to view previous assessments tab to show the submitted assessment
  }

  // Function to fetch trends data (with caching)
  const fetchTrendsData = async (year?: number, forceRefresh = false) => {
    // Skip if already loaded for this year and not forcing refresh (unless year changed)
    if (trendsLoaded && !forceRefresh && year === selectedTrendsYear) return

    setTrendsLoading(true)
    try {
      console.log('Fetching trends for year:', year)
      const result = await getHeadTeacherDashboardTrends(year)
      console.log('Trends result:', result)
      if (result.error) {
        console.error('Error fetching trends:', result.error)
      } else {
        setTrendsData(result)
        setTrendsLoaded(true)
        // On initial load, set to the latest year with actual data
        if (!initialYearSet && result.availableYears?.length > 0) {
          // Use latestYearWithData if available, otherwise first in list
          const defaultYear = result.latestYearWithData || result.availableYears[0]
          setSelectedTrendsYear(defaultYear)
          setInitialYearSet(true)
        }
      }
    } catch (error) {
      console.error('Error fetching trends data:', error)
    } finally {
      setTrendsLoading(false)
    }
  }

  // Re-fetch trends when year changes (but not on initial null state)
  useEffect(() => {
    if (selectedTrendsYear !== null && initialYearSet) {
      // Force refresh when year changes
      fetchTrendsData(selectedTrendsYear, true)
    }
  }, [selectedTrendsYear])

  // Initial data fetch - only runs once
  useEffect(() => {
    if (!schoolInfoLoaded) fetchSchoolInfo()
    if (!reportsLoaded) fetchReports()
    if (!trendsLoaded) fetchTrendsData()
    if (user?.id && !nurseryAssessmentsLoaded) {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Eye className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Submitted Reports
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Browse and review your previously submitted monthly reports
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchReports(true)}
            disabled={loading}
            className="h-9 px-3 rounded-lg border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
          <div className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/50">
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{reports.length} Reports</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-10 w-10 text-blue-500 dark:text-blue-400 mb-4 animate-spin" />
            <h3 className="text-lg font-semibold mb-2 text-slate-900 dark:text-white">Loading Reports</h3>
            <p className="text-slate-500 dark:text-slate-400 text-center text-sm">
              Please wait while we fetch your reports...
            </p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-12">
          <div className="flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
              <FileTextIcon className="h-8 w-8 text-red-500 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-red-700 dark:text-red-400">Error Loading Reports</h3>
            <p className="text-slate-500 dark:text-slate-400 text-center text-sm">{error}</p>
          </div>
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-12">
          <div className="flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-4">
              <CalendarIcon className="h-8 w-8 text-emerald-500 dark:text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-slate-900 dark:text-white">No Reports Yet</h3>
            <p className="text-slate-500 dark:text-slate-400 text-center text-sm max-w-md">
              You haven't submitted any monthly reports yet. Use the "Current Report" tab to create your first report.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {reports.map((report) => (
            <div
              key={report.id}
              className="group relative bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden hover:shadow-xl hover:shadow-blue-500/10 dark:hover:shadow-blue-500/5 transition-all duration-300 cursor-pointer"
              onClick={() => handleViewReport(report)}
            >
              {/* Left accent border */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 to-emerald-600" />

              <div className="p-5 pl-6">
                {/* Header with icon and badge */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center flex-shrink-0 border border-blue-100 dark:border-blue-800/50">
                    <FileTextIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {formatReportMonth(report.month, report.year)}
                      </h3>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Submitted
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {report.sms_schools?.name || "Unknown School"}
                    </p>
                  </div>
                </div>

                {/* Details */}
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <CalendarIcon className="h-3.5 w-3.5" />
                      <span>{formatDate(report.updated_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>View</span>
                    <svg className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  // Main component return
  return (
    <div className="space-y-4 sm:space-y-6 max-w-6xl mx-auto p-4 lg:p-6">
      {/* Conditional Tab Structure */}
      {isNurserySchool ? (
        /* Nursery School: Content based on selected tab */
        <div className="space-y-6">
          {/* Action Icons - Top Right */}
          <div className="flex justify-end">
            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 text-slate-600 dark:text-slate-300"
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {mounted && (theme === 'dark' ? (
                  <Sun className="h-5 w-5 text-amber-500" />
                ) : (
                  <Moon className="h-5 w-5 text-slate-600" />
                ))}
              </button>

              {/* Notifications */}
              <button
                className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 text-slate-600 dark:text-slate-300 relative"
                title="Notifications"
              >
                <Bell className="h-5 w-5" />
              </button>

              {/* Feature Requests */}
              <Link href="/dashboard/feature-requests">
                <button
                  className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 text-slate-600 dark:text-slate-300"
                  title="Feature Requests"
                >
                  <Lightbulb className="h-5 w-5" />
                </button>
              </Link>
            </div>
          </div>

          {/* Dashboard Tab Content */}
          {currentMainTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Compact Welcome Header with School Info */}
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Welcome Card - Glass Morphism Style */}
                <div className="flex-1 relative overflow-hidden rounded-2xl">
                  {/* Gradient Background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 dark:from-blue-700 dark:via-indigo-800 dark:to-slate-900" />
                  
                  {/* Animated Background Elements */}
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-20 -right-20 w-48 h-48 bg-white/10 rounded-full blur-2xl animate-pulse-slow" />
                    <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-cyan-400/10 rounded-full blur-2xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-purple-400/10 rounded-full blur-xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
                  </div>
                  
                  {/* Content */}
                  <div className="relative z-10 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-blue-200/80 text-xs mb-1 font-medium tracking-wide uppercase">Welcome back</p>
                        <h1 className="text-xl sm:text-2xl font-bold text-white">
                          Hello, Head Teacher
                        </h1>
                      </div>
                      <div className="hidden sm:flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-xl px-3 py-2 border border-white/20 shadow-lg">
                        <GraduationCapIcon className="h-4 w-4 text-cyan-300" />
                        <span className="text-white text-sm font-medium">{schoolInfo?.name || 'Loading...'}</span>
                      </div>
                    </div>
                    
                    {/* Stats Row */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="group bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-xl p-3 border border-white/10 transition-all duration-300 hover:scale-105 hover:shadow-xl">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                            <FileTextIcon className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="text-xl font-bold text-white">{reports.length}</p>
                            <p className="text-[11px] text-blue-200/80">Reports This Year</p>
                          </div>
                        </div>
                      </div>
                      <div className="group bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-xl p-3 border border-white/10 transition-all duration-300 hover:scale-105 hover:shadow-xl">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                            <TrendingUpIcon className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="text-xl font-bold text-white">{calculateCompliancePercentage()}%</p>
                            <p className="text-[11px] text-blue-200/80">Submission Rate</p>
                          </div>
                        </div>
                      </div>
                      <div className="group bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-xl p-3 border border-white/10 transition-all duration-300 hover:scale-105 hover:shadow-xl">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                            <ClockIcon className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="text-xl font-bold text-white">{calculateOverdueReports()}</p>
                            <p className="text-[11px] text-blue-200/80">Overdue Reports</p>
                          </div>
                        </div>
                      </div>
                      <div className="group bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-xl p-3 border border-white/10 transition-all duration-300 hover:scale-105 hover:shadow-xl">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                            <BookOpenIcon className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="text-xl font-bold text-white">{calculateNurseryAssessmentPercentage()}%</p>
                            <p className="text-[11px] text-blue-200/80">Assessment</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* School Assessment Mini Card */}
                <div className="lg:w-72">
                  <HeadTeacherAssessmentCard schoolId={schoolInfo?.id || ''} compact />
                </div>
              </div>

              {/* Year Filter and Charts Grid */}
              <div className="space-y-4">
                {/* Year Filter */}
                {trendsData.availableYears?.length > 0 && (
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Year:</span>
                    <select
                      value={selectedTrendsYear || ''}
                      onChange={(e) => setSelectedTrendsYear(Number(e.target.value))}
                      className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                    >
                      {trendsData.availableYears.map((year: number) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Charts Grid - Modern Glass Design with Legends */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Monthly Enrollment Trends */}
                  <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <div className="p-1.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg shadow-blue-500/20">
                            <UsersIcon className="h-4 w-4 text-white" />
                          </div>
                          Enrollment Trends
                        </CardTitle>
                        <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-md">{selectedTrendsYear || '...'}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      {trendsLoading ? (
                        <div className="h-48 flex items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                        </div>
                      ) : trendsData.enrollmentTrends?.length === 0 ? (
                        <div className="h-48 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
                          No enrollment data for {selectedTrendsYear || 'selected year'}
                        </div>
                      ) : (
                        <>
                          <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={trendsData.enrollmentTrends}>
                                <defs>
                                  <linearGradient id="enrollmentGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" vertical={false} />
                                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={35} />
                                <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                                <Line type="monotone" dataKey="enrollment" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} name="Students" />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        <div className="flex items-center justify-center gap-4 mt-2 text-xs">
                          <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full shadow-md"></div>
                            <span className="text-slate-600 dark:text-slate-400">Students Enrolled</span>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Monthly Attendance Trends */}
                <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <div className="p-1.5 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg shadow-lg shadow-emerald-500/20">
                          <TrendingUpIcon className="h-4 w-4 text-white" />
                        </div>
                        Attendance Rates
                      </CardTitle>
                      <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-md">{selectedTrendsYear || '...'}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    {trendsLoading ? (
                      <div className="h-48 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                      </div>
                    ) : (
                      <>
                        <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendsData.attendanceTrends}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" vertical={false} />
                              <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                              <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} tickLine={false} axisLine={false} width={35} />
                              <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} formatter={(value) => [`${value}%`]} />
                              <Line type="monotone" dataKey="studentAttendance" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} name="Students" />
                              <Line type="monotone" dataKey="teacherAttendance" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 3 }} name="Teachers" />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex items-center justify-center gap-4 mt-2 text-xs">
                          <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full shadow-md"></div>
                            <span className="text-slate-600 dark:text-slate-400">Students</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 bg-gradient-to-r from-amber-500 to-amber-600 rounded-full shadow-md"></div>
                            <span className="text-slate-600 dark:text-slate-400">Teachers</span>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Monthly Punctuality Trends */}
                <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <div className="p-1.5 bg-gradient-to-br from-violet-500 to-violet-600 rounded-lg shadow-lg shadow-violet-500/20">
                          <ClockIcon className="h-4 w-4 text-white" />
                        </div>
                        Punctuality Rates
                      </CardTitle>
                      <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-md">{selectedTrendsYear || '...'}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    {trendsLoading ? (
                      <div className="h-48 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
                      </div>
                    ) : (
                      <>
                        <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendsData.punctualityTrends}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" vertical={false} />
                              <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                              <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} tickLine={false} axisLine={false} width={35} />
                              <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} formatter={(value) => [`${value}%`]} />
                              <Line type="monotone" dataKey="studentPunctuality" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 3 }} name="Students" />
                              <Line type="monotone" dataKey="teacherPunctuality" stroke="#ec4899" strokeWidth={2} dot={{ fill: '#ec4899', r: 3 }} name="Teachers" />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex items-center justify-center gap-4 mt-2 text-xs">
                          <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 bg-gradient-to-r from-violet-500 to-violet-600 rounded-full shadow-md"></div>
                            <span className="text-slate-600 dark:text-slate-400">Students</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 bg-gradient-to-r from-pink-500 to-pink-600 rounded-full shadow-md"></div>
                            <span className="text-slate-600 dark:text-slate-400">Teachers</span>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Monthly Expenditure Trends */}
                <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <div className="p-1.5 bg-gradient-to-br from-rose-500 to-rose-600 rounded-lg shadow-lg shadow-rose-500/20">
                          <BarChart3Icon className="h-4 w-4 text-white" />
                        </div>
                        Expenditure
                      </CardTitle>
                      <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-md">Monthly</span>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    {trendsLoading ? (
                      <div className="h-48 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-rose-600" />
                      </div>
                    ) : (
                      <>
                        <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={trendsData.expenditureTrends}>
                              <defs>
                                <linearGradient id="expenditureGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.9}/>
                                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.4}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" vertical={false} />
                              <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={45} />
                              <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} formatter={(value) => [`$${value?.toLocaleString()}`]} />
                              <Bar dataKey="expenditure" fill="url(#expenditureGradient)" radius={[6, 6, 0, 0]} name="Expenditure" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex items-center justify-center gap-4 mt-2 text-xs">
                          <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 bg-gradient-to-r from-rose-500 to-rose-600 rounded-full shadow-md"></div>
                            <span className="text-slate-600 dark:text-slate-400">Total Expenditure</span>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
              </div>
            </div>
          )}

          {/* Monthly Reports Tab Content */}
          {currentMainTab === 'monthly-reports' && (
            <div className="space-y-6">
              {/* Simple Header */}
              <div className="flex items-center gap-3">
                <FileTextIcon className="h-7 w-7 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Monthly School Reports</h1>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">Submit and manage monthly school reports and submissions</p>
                </div>
              </div>

              {/* Sub-navigation */}
              <div className="flex gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 backdrop-blur-xl rounded-xl w-fit border border-slate-200/50 dark:border-slate-700/50">
                <button
                  onClick={() => updateURL('current-report')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    currentTab === 'current-report'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700'
                  }`}
                >
                  Current Report
                </button>
                <button
                  onClick={() => updateURL('previous-report')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    currentTab === 'previous-report'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700'
                  }`}
                >
                  Previous Report
                </button>
                <button
                  onClick={() => updateURL('view-reports')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    currentTab === 'view-reports'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700'
                  }`}
                >
                  View Reports
                </button>
              </div>

              {/* Content Area - Glass Morphism */}
              <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6">
                {currentTab === 'current-report' && (
                  <div>
                    <MonthlyReportForm 
                      onSuccess={handleReportSuccess}
                      cachedReportStatus={cachedReportStatus}
                      onReportStatusLoaded={handleReportStatusLoaded}
                    />
                  </div>
                )}
                {currentTab === 'previous-report' && (
                  <div>
                    <PreviousReportForm onSuccess={handleReportSuccess} />
                  </div>
                )}
                {currentTab === 'view-reports' && (
                  <div>
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
              <div className="flex items-center gap-3">
                <GraduationCapIcon className="h-7 w-7 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Nursery Assessment Reports</h1>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">Specialized assessment and development tracking for nursery students</p>
                </div>
              </div>

              {/* Sub-navigation */}
              <div className="flex gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 backdrop-blur-xl rounded-xl w-fit border border-slate-200/50 dark:border-slate-700/50">
                <button
                  onClick={() => updateURL('submit-assessment')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    currentTab === 'submit-assessment'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700'
                  }`}
                >
                  Submit Assessment
                </button>
                <button
                  onClick={() => updateURL('view-assessments')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    currentTab === 'view-assessments'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700'
                  }`}
                >
                  View Previous Assessments
                </button>
              </div>

              {/* Content Area */}
              <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6">
                {currentTab === 'submit-assessment' && (
                  <div>
                    <NurseryAssessmentForm onSuccess={handleNurseryAssessmentSuccess} />
                  </div>
                )}
                {currentTab === 'view-assessments' && (
                  <div>
                    <NurseryAssessmentsList />
                  </div>
                )}
                {currentTab !== 'submit-assessment' && currentTab !== 'view-assessments' && (
                  <div>
                    <div className="mb-6">
                      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Nursery Assessment Management</h2>
                      <p className="text-slate-600 dark:text-slate-400 text-sm">Choose an option from the navigation above to get started.</p>
                    </div>
                    <div className="text-center py-16">
                      <div className="p-6 bg-gradient-to-br from-amber-400/20 to-orange-400/20 dark:from-amber-500/20 dark:to-orange-500/20 rounded-full w-fit mx-auto mb-6">
                        <BookOpenIcon className="h-16 w-16 text-amber-600 dark:text-amber-400" />
                      </div>
                      <h3 className="text-2xl font-semibold mb-3 text-slate-800 dark:text-white">Select an Option Above</h3>
                      <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                        Choose either "Submit Assessment" or "View Previous Assessments" to get started with nursery assessment management.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Teachers Tab Content */}
          {currentMainTab === 'teachers' && (
            <div className="space-y-6">
              {/* Simple Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <UsersIcon className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Teacher Management</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">Add and manage your school's teaching staff information</p>
                  </div>
                </div>
              </div>

              <TeachersList
                initialTeachers={cachedTeachers}
                initialDeletedTeachers={cachedDeletedTeachers}
                onDataLoaded={handleTeachersDataLoaded}
              />
            </div>
          )}
        </div>
      ) : (
        /* Non-Nursery Schools: Clean structure with sidebar navigation */
        <div className="space-y-4 sm:space-y-6">
          {/* Action Icons - Top Right */}
          <div className="flex justify-end">
            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 text-slate-600 dark:text-slate-300"
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {mounted && (theme === 'dark' ? (
                  <Sun className="h-5 w-5 text-amber-500" />
                ) : (
                  <Moon className="h-5 w-5 text-slate-600" />
                ))}
              </button>

              {/* Notifications */}
              <button
                className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 text-slate-600 dark:text-slate-300 relative"
                title="Notifications"
              >
                <Bell className="h-5 w-5" />
              </button>

              {/* Feature Requests */}
              <Link href="/dashboard/feature-requests">
                <button
                  className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 text-slate-600 dark:text-slate-300"
                  title="Feature Requests"
                >
                  <Lightbulb className="h-5 w-5" />
                </button>
              </Link>
            </div>
          </div>

          {/* Dashboard Tab Content */}
          {currentMainTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Compact Welcome Header with School Info */}
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Welcome Card - Glass Morphism Style */}
                <div className="flex-1 relative overflow-hidden rounded-2xl">
                  {/* Gradient Background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 dark:from-blue-700 dark:via-indigo-800 dark:to-slate-900" />
                  
                  {/* Animated Background Elements */}
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-20 -right-20 w-48 h-48 bg-white/10 rounded-full blur-2xl animate-pulse-slow" />
                    <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-cyan-400/10 rounded-full blur-2xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-purple-400/10 rounded-full blur-xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
                  </div>
                  
                  {/* Content */}
                  <div className="relative z-10 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-blue-200/80 text-xs mb-1 font-medium tracking-wide uppercase">Welcome back</p>
                        <h1 className="text-xl sm:text-2xl font-bold text-white">
                          Hello, Head Teacher
                        </h1>
                      </div>
                      <div className="hidden sm:flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-xl px-3 py-2 border border-white/20 shadow-lg">
                        <GraduationCapIcon className="h-4 w-4 text-cyan-300" />
                        <span className="text-white text-sm font-medium">{schoolInfo?.name || 'Loading...'}</span>
                      </div>
                    </div>
                    {/* Stats Row Inside Header */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="group bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-xl p-3 border border-white/10 transition-all duration-300 hover:scale-105 hover:shadow-xl">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                            <FileTextIcon className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="text-xl font-bold text-white">{reports.length}</p>
                            <p className="text-[11px] text-blue-200/80">Reports This Year</p>
                          </div>
                        </div>
                      </div>
                      <div className="group bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-xl p-3 border border-white/10 transition-all duration-300 hover:scale-105 hover:shadow-xl">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                            <TrendingUpIcon className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="text-xl font-bold text-white">{calculateCompliancePercentage()}%</p>
                            <p className="text-[11px] text-blue-200/80">Submission Rate</p>
                          </div>
                        </div>
                      </div>
                      <div className="group bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-xl p-3 border border-white/10 transition-all duration-300 hover:scale-105 hover:shadow-xl">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                            <ClockIcon className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="text-xl font-bold text-white">{calculateOverdueReports()}</p>
                            <p className="text-[11px] text-blue-200/80">Overdue Reports</p>
                          </div>
                        </div>
                      </div>
                      <div className="group bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-xl p-3 border border-white/10 transition-all duration-300 hover:scale-105 hover:shadow-xl">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                            <CalendarIcon className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="text-xl font-bold text-white">
                              {reports.filter((r) => {
                                const reportDate = new Date(r.updated_at)
                                const threeMonthsAgo = new Date()
                                threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
                                return reportDate >= threeMonthsAgo
                              }).length}
                            </p>
                            <p className="text-[11px] text-blue-200/80">Last 90 Days</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* School Assessment Mini Card */}
                <div className="lg:w-72">
                  <HeadTeacherAssessmentCard schoolId={schoolInfo?.id || ''} compact />
                </div>
              </div>

              {/* Year Filter and Charts Grid */}
              <div className="space-y-4">
                {/* Year Filter */}
                {trendsData.availableYears?.length > 0 && (
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Year:</span>
                    <select
                      value={selectedTrendsYear || ''}
                      onChange={(e) => setSelectedTrendsYear(Number(e.target.value))}
                      className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                    >
                      {trendsData.availableYears.map((year: number) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Charts Grid - 2x2 Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Attendance Trends Chart */}
                  <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <div className="p-1.5 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg shadow-lg shadow-emerald-500/20">
                            <TrendingUpIcon className="h-4 w-4 text-white" />
                          </div>
                          Attendance Rates
                        </CardTitle>
                        <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-md">{selectedTrendsYear || '...'}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      {trendsLoading ? (
                        <div className="h-44 flex items-center justify-center">
                          <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                        </div>
                      ) : trendsData.attendanceTrends?.length === 0 ? (
                        <div className="h-44 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
                          No attendance data for {selectedTrendsYear || 'selected year'}
                        </div>
                      ) : (
                        <>
                          <div className="h-40">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={trendsData.attendanceTrends}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" vertical={false} />
                                <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 100]} tickLine={false} axisLine={false} width={30} />
                                <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '11px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} formatter={(value) => [`${value}%`]} />
                                <Line type="monotone" dataKey="studentAttendance" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 2 }} name="Students" />
                                <Line type="monotone" dataKey="teacherAttendance" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 2 }} name="Teachers" />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="flex items-center justify-center gap-4 mt-1 text-[10px]">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full shadow-sm"></div>
                              <span className="text-slate-500 dark:text-slate-400">Students</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 bg-gradient-to-r from-amber-500 to-amber-600 rounded-full shadow-sm"></div>
                              <span className="text-slate-500 dark:text-slate-400">Teachers</span>
                            </div>
                          </div>
                        </>
                      )}
                  </CardContent>
                </Card>

                {/* Punctuality Trends Chart */}
                <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <div className="p-1.5 bg-gradient-to-br from-violet-500 to-violet-600 rounded-lg shadow-lg shadow-violet-500/20">
                          <ClockIcon className="h-4 w-4 text-white" />
                        </div>
                        Punctuality Rates
                      </CardTitle>
                      <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-md">{selectedTrendsYear || '...'}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    {trendsLoading ? (
                      <div className="h-44 flex items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
                      </div>
                    ) : trendsData.punctualityTrends?.length === 0 ? (
                      <div className="h-44 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
                        No punctuality data for {selectedTrendsYear || 'selected year'}
                      </div>
                    ) : (
                      <>
                        <div className="h-40">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendsData.punctualityTrends}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" vertical={false} />
                              <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                              <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 100]} tickLine={false} axisLine={false} width={30} />
                              <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '11px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} formatter={(value) => [`${value}%`]} />
                              <Line type="monotone" dataKey="studentPunctuality" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 2 }} name="Students" />
                              <Line type="monotone" dataKey="teacherPunctuality" stroke="#ec4899" strokeWidth={2} dot={{ fill: '#ec4899', r: 2 }} name="Teachers" />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex items-center justify-center gap-4 mt-1 text-[10px]">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 bg-gradient-to-r from-violet-500 to-violet-600 rounded-full shadow-sm"></div>
                            <span className="text-slate-500 dark:text-slate-400">Students</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 bg-gradient-to-r from-pink-500 to-pink-600 rounded-full shadow-sm"></div>
                            <span className="text-slate-500 dark:text-slate-400">Teachers</span>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Expenditure Trends Chart */}
                <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <div className="p-1.5 bg-gradient-to-br from-rose-500 to-rose-600 rounded-lg shadow-lg shadow-rose-500/20">
                          <BarChart3Icon className="h-4 w-4 text-white" />
                        </div>
                        Expenditure
                      </CardTitle>
                      <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-md">Monthly</span>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    {trendsLoading ? (
                      <div className="h-44 flex items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-rose-600" />
                      </div>
                    ) : trendsData.expenditureTrends?.length === 0 ? (
                      <div className="h-44 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
                        No expenditure data for {selectedTrendsYear || 'selected year'}
                      </div>
                    ) : (
                      <>
                        <div className="h-40">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={trendsData.expenditureTrends}>
                              <defs>
                                <linearGradient id="expenditureGradientNonNursery" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.9}/>
                                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.4}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" vertical={false} />
                              <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} width={40} tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`} />
                              <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '11px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} formatter={(value) => [`$${value?.toLocaleString()}`]} />
                              <Bar dataKey="expenditure" fill="url(#expenditureGradientNonNursery)" radius={[6, 6, 0, 0]} name="Expenditure" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex items-center justify-center mt-1 text-[10px]">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 bg-gradient-to-r from-rose-500 to-rose-600 rounded-full shadow-sm"></div>
                            <span className="text-slate-500 dark:text-slate-400">Total Expenditure</span>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Recent Reports - Compact */}
                <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <div className="p-1.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg shadow-blue-500/20">
                        <FileTextIcon className="h-4 w-4 text-white" />
                      </div>
                      Recent Reports
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    {reports.length === 0 ? (
                      <div className="h-44 flex flex-col items-center justify-center">
                        <FileTextIcon className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
                        <p className="text-sm text-slate-500 dark:text-slate-400">No reports submitted yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {reports.slice(0, 4).map((report) => (
                          <div 
                            key={report.id} 
                            className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-700/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-all duration-200 hover:shadow-md"
                            onClick={() => handleViewReport(report)}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
                                <span className="text-[10px] font-bold text-white">{monthNames[report.month - 1]?.substring(0, 3)}</span>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-slate-900 dark:text-slate-100">{formatReportMonth(report.month, report.year)}</p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400">{formatDate(report.updated_at)}</p>
                              </div>
                            </div>
                            <Badge className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-[10px] px-2 py-0.5 border border-emerald-200 dark:border-emerald-800">Submitted</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
                </div>
              </div>
            </div>
          )}

          {/* Monthly Reports Tab Content */}
          {currentMainTab === 'monthly-reports' && (
            <div className="space-y-6">
              {/* Simple Header */}
              <div className="flex items-center gap-3">
                <FileTextIcon className="h-7 w-7 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Monthly School Reports</h1>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">Submit and manage monthly school reports and submissions</p>
                </div>
              </div>

              {/* Sub-navigation */}
              <div className="flex gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 backdrop-blur-xl rounded-xl w-fit border border-slate-200/50 dark:border-slate-700/50">
                <button
                  onClick={() => updateURL('current-report')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    currentTab === 'current-report'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700'
                  }`}
                >
                  Current Report
                </button>
                <button
                  onClick={() => updateURL('previous-report')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    currentTab === 'previous-report'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700'
                  }`}
                >
                  Previous Report
                </button>
                <button
                  onClick={() => updateURL('view-reports')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    currentTab === 'view-reports'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700'
                  }`}
                >
                  View Reports
                </button>
              </div>

              {/* Content Area */}
              <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6">
                {currentTab === 'current-report' && (
                  <div>
                    {/* Header Band */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-xl mb-6 shadow-lg shadow-blue-500/20">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg">
                          <FileTextIcon className="h-6 w-6" />
                        </div>
                        <div>
                          <h2 className="text-xl font-semibold mb-1">Submit Current Period Report</h2>
                          <p className="text-blue-100">Complete and submit your monthly report for the current reporting period.</p>
                        </div>
                      </div>
                    </div>
                    <MonthlyReportForm 
                      onSuccess={handleReportSuccess}
                      cachedReportStatus={cachedReportStatus}
                      onReportStatusLoaded={handleReportStatusLoaded}
                    />
                  </div>
                )}
                {currentTab === 'previous-report' && (
                  <div>
                    <div className="mb-6">
                      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Submit Previous Report</h2>
                      <p className="text-slate-600 dark:text-slate-400 text-sm">Submit any missed reports from previous reporting periods.</p>
                    </div>
                    <PreviousReportForm onSuccess={handleReportSuccess} />
                  </div>
                )}
                {currentTab === 'view-reports' && (
                  <div>
                    {renderViewReportsContent()}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Teachers Tab Content */}
          {currentMainTab === 'teachers' && (
            <div className="space-y-6">
              {/* Simple Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <UsersIcon className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Teacher Management</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">Add and manage your school's teaching staff information</p>
                  </div>
                </div>
              </div>

              <TeachersList
                initialTeachers={cachedTeachers}
                initialDeletedTeachers={cachedDeletedTeachers}
                onDataLoaded={handleTeachersDataLoaded}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
