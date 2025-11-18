"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { AuthWrapper } from "@/components/auth-wrapper"
import { RegionalPEReportsContent } from "./pe-reports/page"
import { RegionalAIInsightsContent } from "./ai-insights/page"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts"
import {
  School,
  CheckCircle,
  Clock,
  BarChart3,
  Eye,
  Download,
  MoreHorizontal,
  Mail,
  AlertCircle,
  CheckCircle2,
  Loader2,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  BookOpen,
  User,
  Calendar,
  Filter,
  TrendingUp,
  History,
  Activity,
  Brain,
} from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ClickableReportRow } from "@/components/clickable-report-row"
import { sendReportReminders } from "@/app/actions/notifications"
import { getHistoricalReports } from "@/app/actions/regional-reports"
import { getCurrentMonthSchools } from "@/app/actions/current-month-reports"
import { useAuth } from "@/components/auth-wrapper"
import { getExpenditureTrends } from "@/app/actions/expenditure-trends"
import { getRegionalAttendanceTrends } from "@/app/actions/regional-attendance"
import { getTopExpenditureSchools, getAvailableFinancePeriods } from "@/app/actions/top-expenditure-schools"
import { getSchoolReadinessPercentage } from "@/app/actions/regional-officer-school-readiness"
import { toast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useRouter, useSearchParams } from "next/navigation"
import { getAllNurseryAssessments } from "@/app/actions/nursery-assessment"
import Link from "next/link"
import { format } from "date-fns"

// Data will be loaded from actual database

type CurrentMonthSchool = {
  id: string
  schoolName: string
  headTeacher: string
  headTeacherEmail: string
  headTeacherId: string | null
  region: string
  level: string
  dueDate: string
  status: string
  submittedDate: string | null
  reportId: string | null
}

type HistoricalReport = {
  id: string
  schoolId: string
  schoolName: string
  headTeacherName: string
  month: number
  year: number
  monthYear: string
  submittedDate: string
  submittedDateTime: string
}

export default function RegionalOfficerDashboard() {
  return (
    <AuthWrapper requiredRole="Regional Officer">
      <RegionalOfficerDashboardContent />
    </AuthWrapper>
  )
}

function RegionalOfficerDashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isLoading: authLoading } = useAuth()
  
  // Get tab and view from URL params, with fallbacks
  const currentTab = searchParams.get('tab') || 'overview'
  const currentView = searchParams.get('view') || 'current'
  
  // Convert URL params to state
  const showCurrentMonth = currentView === 'current'
  
  // State variables
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [schoolLevelFilter, setSchoolLevelFilter] = useState<string>("all")
  const [previousReportsSearch, setPreviousReportsSearch] = useState<string>("")
  const [previousReportsYear, setPreviousReportsYear] = useState<string>("all")
  const [previousReportsMonth, setPreviousReportsMonth] = useState<string>("all")
  const [selectedSchools, setSelectedSchools] = useState<string[]>([])
  const [isSendingReminders, setIsSendingReminders] = useState<boolean>(false)
  const [reminderResult, setReminderResult] = useState<{ success: boolean; message: string } | null>(null)
  const [historicalReports, setHistoricalReports] = useState<HistoricalReport[]>([])
  const [currentMonthSchools, setCurrentMonthSchools] = useState<CurrentMonthSchool[]>([])
  const [isLoadingReports, setIsLoadingReports] = useState<boolean>(false)
  const [isLoadingCurrentMonth, setIsLoadingCurrentMonth] = useState<boolean>(false)
  const [reportsError, setReportsError] = useState<string | null>(null)
  const [currentMonthError, setCurrentMonthError] = useState<string | null>(null)
  const [schoolReadinessPercentage, setSchoolReadinessPercentage] = useState<number | null>(null)
  const [expenditureData, setExpenditureData] = useState<any[]>([])
  const [expenditureSchools, setExpenditureSchools] = useState<string[]>([])
  const [isLoadingExpenditure, setIsLoadingExpenditure] = useState<boolean>(false)
  const [expenditureError, setExpenditureError] = useState<string | null>(null)
  
  // Top expenditure schools state
  const [topExpenditureSchools, setTopExpenditureSchools] = useState<any[]>([])
  const [availableFinancePeriods, setAvailableFinancePeriods] = useState<{year: number, month: number}[]>([])
  const [selectedFinanceYear, setSelectedFinanceYear] = useState<number>(new Date().getFullYear())
  const [selectedFinanceMonth, setSelectedFinanceMonth] = useState<number>(new Date().getMonth() + 1)
  const [isLoadingTopExpenditure, setIsLoadingTopExpenditure] = useState<boolean>(false)
  const [topExpenditureError, setTopExpenditureError] = useState<string | null>(null)
  
  // Function to update URL parameters
  const updateURL = (newTab?: string, newView?: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (newTab) params.set('tab', newTab)
    if (newView) params.set('view', newView)
    router.replace(`/dashboard/regional-officer?${params.toString()}`)
  }
  
  // Function to toggle between current month and historical reports
  const toggleView = () => {
    const newView = showCurrentMonth ? 'historical' : 'current'
    updateURL(currentTab, newView)
  }
  
  // Add state for actual dashboard data
  const [schoolPerformanceData, setSchoolPerformanceData] = useState<any[]>([])
  const [reportStatusData, setReportStatusData] = useState<any[]>([])
  const [regionComparisonData, setRegionComparisonData] = useState<any[]>([])
  const [attendanceTrendsData, setAttendanceTrendsData] = useState<any[]>([])
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [isLoadingDashboardData, setIsLoadingDashboardData] = useState<boolean>(true)
  const [isLoadingAttendanceTrends, setIsLoadingAttendanceTrends] = useState<boolean>(false)
  const [dashboardDataError, setDashboardDataError] = useState<string | null>(null)
  const [attendanceTrendsError, setAttendanceTrendsError] = useState<string | null>(null)

  // Pagination state for historical reports
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(25)

  // Pagination state for current month schools
  const [currentMonthPage, setCurrentMonthPage] = useState<number>(1)
  const [currentMonthPageSize, setCurrentMonthPageSize] = useState<number>(25)

  // Scroll to top button state
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false)

  // Nursery assessment state
  const [nurseryAssessments, setNurseryAssessments] = useState<any[]>([])
  const [isLoadingNurseryAssessments, setIsLoadingNurseryAssessments] = useState<boolean>(false)
  const [nurseryAssessmentsError, setNurseryAssessmentsError] = useState<string | null>(null)
  const [nurseryAssessmentSearch, setNurseryAssessmentSearch] = useState<string>("")
  const [nurseryAssessmentRegionFilter, setNurseryAssessmentRegionFilter] = useState<string>("all")
  const [nurseryAssessmentTypeFilter, setNurseryAssessmentTypeFilter] = useState<string>("all")
  const [nurseryAssessmentYearFilter, setNurseryAssessmentYearFilter] = useState<string>("all")
  const [nurseryAssessmentsLoaded, setNurseryAssessmentsLoaded] = useState<boolean>(false)

  // Load all dashboard data in parallel when component mounts
  useEffect(() => {
    loadAllDashboardData()
  }, [])

  // Load school readiness percentage when user is available
  useEffect(() => {
    if (user?.region_name) {
      loadSchoolReadinessPercentage()
    }
  }, [user?.region_name])

  // Load nursery assessments for the regional officer's region
  const loadNurseryAssessments = async (forceReload = false) => {
    if (!user?.region_name) return
    
    // Prevent double loading
    if (isLoadingNurseryAssessments) return
    
    // Skip loading if data already exists and not forcing reload
    if (nurseryAssessmentsLoaded && !forceReload) return
    
    setIsLoadingNurseryAssessments(true)
    setNurseryAssessmentsError(null)

    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setIsLoadingNurseryAssessments(false)
      setNurseryAssessmentsError("Request timed out. Please try refreshing.")
    }, 30000) // 30 second timeout

    try {
      console.log('Loading nursery assessments for region:', user.region_name)
      const result = await getAllNurseryAssessments(user.region_name)
      
      clearTimeout(timeoutId) // Clear timeout on success

      if (result.error) {
        setNurseryAssessmentsError(result.error)
        setNurseryAssessments([])
      } else {
        setNurseryAssessments(result.assessments)
        setNurseryAssessmentsLoaded(true)
        console.log('Loaded', result.assessments.length, 'nursery assessments')
      }
    } catch (error) {
      clearTimeout(timeoutId) // Clear timeout on error
      console.error("Error loading nursery assessments:", error)
      setNurseryAssessmentsError("Failed to load nursery assessments")
      setNurseryAssessments([])
    } finally {
      setIsLoadingNurseryAssessments(false)
    }
  }

  // Load nursery assessments when user is available or tab changes to nursery-assessment
  useEffect(() => {
    // Only load if user has region, tab is active, and data hasn't been loaded yet
    if (user?.region_name && currentTab === 'nursery-assessment' && !nurseryAssessmentsLoaded) {
      loadNurseryAssessments()
    }
  }, [user?.region_name, currentTab])

  // Simple preload without complex dependencies to avoid loops
  useEffect(() => {
    // Disable preloading for now to debug the issue
    // if (user?.region_name && !nurseryAssessmentsLoaded) {
    //   const preloadTimer = setTimeout(() => {
    //     if (!nurseryAssessmentsLoaded && !isLoadingNurseryAssessments) {
    //       loadNurseryAssessments()
    //     }
    //   }, 3000)
      
    //   return () => clearTimeout(preloadTimer)
    // }
  }, [user?.region_name]) // Only depend on region_name

  // Emergency reset function
  const resetNurseryAssessments = () => {
    setIsLoadingNurseryAssessments(false)
    setNurseryAssessmentsLoaded(false)
    setNurseryAssessments([])
    setNurseryAssessmentsError(null)
  }

  // Scroll to top button functionality
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  // Load school readiness percentage (lightweight)
  const loadSchoolReadinessPercentage = async () => {
    if (!user?.region_name) return
    
    try {
      const result = await getSchoolReadinessPercentage(user.region_name)
      if (result.success && result.ready_percentage !== undefined) {
        setSchoolReadinessPercentage(result.ready_percentage)
      }
    } catch (error) {
      console.error("Error loading school readiness percentage:", error)
    }
  }

  // Load top expenditure schools when year/month changes
  useEffect(() => {
    if (availableFinancePeriods.length > 0) {
      loadTopExpenditureSchools()
    }
  }, [selectedFinanceYear, selectedFinanceMonth, availableFinancePeriods])

  // Parallel loading function for all dashboard data
  const loadAllDashboardData = async () => {
    // Set all loading states to true
    setIsLoadingCurrentMonth(true)
    setIsLoadingExpenditure(true)
    setIsLoadingAttendanceTrends(true)
    setIsLoadingTopExpenditure(true)

    // Clear all errors
    setCurrentMonthError(null)
    setExpenditureError(null)
    setAttendanceTrendsError(null)
    setTopExpenditureError(null)

    try {
      // Load all data in parallel
      const [
        currentMonthResult,
        expenditureResult,
        attendanceResult,
        financePeriodsResult
      ] = await Promise.all([
        getCurrentMonthSchools(),
        getExpenditureTrends(),
        getRegionalAttendanceTrends(),
        getAvailableFinancePeriods()
      ])

      // Process current month schools
      if (currentMonthResult.error) {
        setCurrentMonthError(currentMonthResult.error)
        setCurrentMonthSchools([])
      } else {
        setCurrentMonthSchools(currentMonthResult.schools)
        // Generate dashboard data from current month schools
        loadDashboardData(currentMonthResult.schools)
      }

      // Process expenditure trends
      if (expenditureResult.error) {
        setExpenditureError(expenditureResult.error)
        setExpenditureData([])
        setExpenditureSchools([])
      } else {
        setExpenditureData(expenditureResult.expenditures)
        setExpenditureSchools(expenditureResult.topSchools || [])
      }

      // Process attendance trends
      if (attendanceResult.error) {
        setAttendanceTrendsError(attendanceResult.error)
        setAttendanceTrendsData([])
      } else {
        setAttendanceTrendsData(attendanceResult.trendsData)
      }

      // Process finance periods
      if (financePeriodsResult.error) {
        console.error("Error loading finance periods:", financePeriodsResult.error)
        setAvailableFinancePeriods([])
      } else {
        setAvailableFinancePeriods(financePeriodsResult.periods)
        
        // Set default selection to most recent period if available
        if (financePeriodsResult.periods.length > 0) {
          const mostRecent = financePeriodsResult.periods[0]
          setSelectedFinanceYear(mostRecent.year)
          setSelectedFinanceMonth(mostRecent.month)
          
          // Load top expenditure schools with the default selection
          loadTopExpenditureSchools(mostRecent.year, mostRecent.month)
        }
      }

    } catch (error) {
      console.error("Error loading dashboard data:", error)
      setCurrentMonthError("Failed to load dashboard data")
      setExpenditureError("Failed to load expenditure data")
      setAttendanceTrendsError("Failed to load attendance trends")
      setTopExpenditureError("Failed to load expenditure schools")
    } finally {
      // Set all loading states to false
      setIsLoadingCurrentMonth(false)
      setIsLoadingExpenditure(false)
      setIsLoadingAttendanceTrends(false)
      setIsLoadingTopExpenditure(false)
    }
  }

  // Load historical reports when switching to previous reports view
  useEffect(() => {
    if (!showCurrentMonth) {
      loadHistoricalReports()
    }
  }, [showCurrentMonth])

  const loadCurrentMonthSchools = async () => {
    setIsLoadingCurrentMonth(true)
    setCurrentMonthError(null)

    try {
      const result = await getCurrentMonthSchools()

      if (result.error) {
        setCurrentMonthError(result.error)
        setCurrentMonthSchools([])
      } else {
        setCurrentMonthSchools(result.schools)
        // Load dashboard data after current month schools are loaded
        loadDashboardData(result.schools)
      }
    } catch (error) {
      console.error("Error loading current month schools:", error)
      setCurrentMonthError("Failed to load current month schools")
      setCurrentMonthSchools([])
    } finally {
      setIsLoadingCurrentMonth(false)
    }
  }

  const loadHistoricalReports = async () => {
    setIsLoadingReports(true)
    setReportsError(null)

    try {
      const result = await getHistoricalReports()

      if (result.error) {
        setReportsError(result.error)
        setHistoricalReports([])
      } else {
        setHistoricalReports(result.reports)
      }
    } catch (error) {
      console.error("Error loading historical reports:", error)
      setReportsError("Failed to load historical reports")
      setHistoricalReports([])
    } finally {
      setIsLoadingReports(false)
    }
  }

  const loadExpenditureTrends = async () => {
    setIsLoadingExpenditure(true)
    setExpenditureError(null)

    try {
      const result = await getExpenditureTrends()

      if (result.error) {
        setExpenditureError(result.error)
        setExpenditureData([])
        setExpenditureSchools([])
      } else {
        setExpenditureData(result.expenditures)
        setExpenditureSchools(result.topSchools || [])
      }
    } catch (error) {
      console.error("Error loading expenditure trends:", error)
      setExpenditureError("Failed to load expenditure trends")
      setExpenditureData([])
      setExpenditureSchools([])
    } finally {
      setIsLoadingExpenditure(false)
    }
  }

  const loadAttendanceTrends = async () => {
    setIsLoadingAttendanceTrends(true)
    setAttendanceTrendsError(null)

    try {
      const result = await getRegionalAttendanceTrends()

      if (result.error) {
        setAttendanceTrendsError(result.error)
        setAttendanceTrendsData([])
      } else {
        setAttendanceTrendsData(result.trendsData)
      }
    } catch (error) {
      console.error("Error loading attendance trends:", error)
      setAttendanceTrendsError("Failed to load attendance trends")
      setAttendanceTrendsData([])
    } finally {
      setIsLoadingAttendanceTrends(false)
    }
  }

  const loadAvailableFinancePeriods = async () => {
    try {
      const result = await getAvailableFinancePeriods()

      if (result.error) {
        console.error("Error loading finance periods:", result.error)
        setAvailableFinancePeriods([])
      } else {
        setAvailableFinancePeriods(result.periods)
        
        // Set default selection to most recent period if available
        if (result.periods.length > 0) {
          const mostRecent = result.periods[0]
          setSelectedFinanceYear(mostRecent.year)
          setSelectedFinanceMonth(mostRecent.month)
        }
      }
    } catch (error) {
      console.error("Error loading finance periods:", error)
      setAvailableFinancePeriods([])
    }
  }

  const loadTopExpenditureSchools = async (year?: number, month?: number) => {
    setIsLoadingTopExpenditure(true)
    setTopExpenditureError(null)

    try {
      const yearToUse = year || selectedFinanceYear
      const monthToUse = month || selectedFinanceMonth
      const result = await getTopExpenditureSchools(yearToUse, monthToUse)

      if (result.error) {
        setTopExpenditureError(result.error)
        setTopExpenditureSchools([])
      } else {
        setTopExpenditureSchools(result.schools)
      }
    } catch (error) {
      console.error("Error loading top expenditure schools:", error)
      setTopExpenditureError("Failed to load top expenditure schools")
      setTopExpenditureSchools([])
    } finally {
      setIsLoadingTopExpenditure(false)
    }
  }

  const loadDashboardData = async (schools: CurrentMonthSchool[] = currentMonthSchools) => {
    setIsLoadingDashboardData(true)
    setDashboardDataError(null)

    try {
      // Generate report status data from current month schools
      const generateReportStatusData = () => {
        const submitted = schools.filter(s => s.status === "submitted").length
        const notSubmitted = schools.filter(s => s.status === "not-submitted").length
        
        return [
          { name: "Submitted", value: submitted, color: "#22c55e" },
          { name: "Not Submitted", value: notSubmitted, color: "#f59e0b" },
        ]
      }

      // For now, use data derived from current month schools
      // In a real implementation, you would fetch additional data for school performance and region comparison
      setReportStatusData(generateReportStatusData())
      
      // Set empty arrays for now - these would need separate API endpoints
      setSchoolPerformanceData([])
      setRegionComparisonData([])
      
    } catch (error) {
      console.error("Error loading dashboard data:", error)
      setDashboardDataError("Failed to load dashboard data")
      setReportStatusData([])
      setSchoolPerformanceData([])
      setRegionComparisonData([])
    } finally {
      setIsLoadingDashboardData(false)
    }
  }

  const filteredCurrentMonthSchools = currentMonthSchools.filter((school) => {
    const matchesSearch =
      school.schoolName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      school.headTeacher.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || school.status === statusFilter
    const matchesLevel = schoolLevelFilter === "all" || school.level === schoolLevelFilter
    return matchesSearch && matchesStatus && matchesLevel
  })

  // Calculate pagination for current month schools
  const totalCurrentMonthSchools = filteredCurrentMonthSchools.length
  const totalCurrentMonthPages = Math.ceil(totalCurrentMonthSchools / currentMonthPageSize)
  const currentMonthStartIndex = (currentMonthPage - 1) * currentMonthPageSize
  const currentMonthEndIndex = currentMonthStartIndex + currentMonthPageSize
  const paginatedCurrentMonthSchools = filteredCurrentMonthSchools.slice(currentMonthStartIndex, currentMonthEndIndex)

  // Handle current month page change
  const handleCurrentMonthPageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalCurrentMonthPages) {
      setCurrentMonthPage(newPage)
    }
  }

  const filteredHistoricalReports = historicalReports.filter((report) => {
    const matchesSearch =
      report.headTeacherName.toLowerCase().includes(previousReportsSearch.toLowerCase()) ||
      report.schoolName.toLowerCase().includes(previousReportsSearch.toLowerCase())
    
    // Extract year and month from report
    const reportYear = report.year.toString()
    const reportMonth = report.month.toString()
    
    const matchesYear = previousReportsYear === "all" || reportYear === previousReportsYear
    const matchesMonth = previousReportsMonth === "all" || reportMonth === previousReportsMonth
    
    return matchesSearch && matchesYear && matchesMonth
  })

  // Calculate pagination for historical reports
  const totalReports = filteredHistoricalReports.length
  const totalPages = Math.ceil(totalReports / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedHistoricalReports = filteredHistoricalReports.slice(startIndex, endIndex)

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
    }
  }

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [previousReportsSearch, previousReportsYear, previousReportsMonth])

  // Reset pagination when page size changes
  useEffect(() => {
    setCurrentPage(1)
  }, [pageSize])

  // Sort expenditure data by month order for proper chronological display
  const sortedExpenditureData = useMemo(() => {
    const monthOrder = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ]
    
    return [...expenditureData].sort((a, b) => {
      const monthA = monthOrder.indexOf(a.month)
      const monthB = monthOrder.indexOf(b.month)
      return monthA - monthB
    })
  }, [expenditureData])

  // Reset current month pagination when filters change
  useEffect(() => {
    setCurrentMonthPage(1)
  }, [searchTerm, statusFilter, schoolLevelFilter])

  // Reset current month pagination when page size changes
  useEffect(() => {
    setCurrentMonthPage(1)
  }, [currentMonthPageSize])

  // Get unique years and months from historical reports for filter dropdowns
  const availableReportYears = Array.from(new Set(historicalReports.map((report) => report.year))).sort((a, b) => b - a)
  
  const availableReportMonths = Array.from(new Set(historicalReports.map((report) => report.month))).sort((a, b) => a - b)
  
  // Month names for display
  const getReportMonthName = (monthNum: number) => {
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ]
    return monthNames[monthNum - 1]
  }

  // Helper functions for nursery assessments
  const getNurseryAssessmentTypeColor = (assessmentType: string) => {
    if (assessmentType?.includes('assessment-1-year-1')) {
      return 'bg-green-100 text-green-800 border-green-200'
    } else if (assessmentType?.includes('assessment-2-year-2')) {
      return 'bg-orange-100 text-orange-800 border-orange-200'
    } else if (assessmentType?.includes('assessment-3-year-2')) {
      return 'bg-purple-100 text-purple-800 border-purple-200'
    }
    return 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const formatNurseryAssessmentType = (assessmentType: string) => {
    if (assessmentType?.includes('assessment-1-year-1')) {
      return 'Assessment 1 - Year 1'
    } else if (assessmentType?.includes('assessment-2-year-2')) {
      return 'Assessment 2 - Year 2'
    } else if (assessmentType?.includes('assessment-3-year-2')) {
      return 'Assessment 3 - Year 2'
    }
    return assessmentType || 'N/A'
  }

  // Filter nursery assessments
  const filteredNurseryAssessments = nurseryAssessments.filter((assessment) => {
    const matchesSearch =
      assessment.schools?.name?.toLowerCase().includes(nurseryAssessmentSearch.toLowerCase()) ||
      assessment.headteacher?.name?.toLowerCase().includes(nurseryAssessmentSearch.toLowerCase())
    
    const matchesType = nurseryAssessmentTypeFilter === "all" || 
      formatNurseryAssessmentType(assessment.assessment_type) === nurseryAssessmentTypeFilter
    
    const assessmentYear = new Date(assessment.created_at).getFullYear().toString()
    const matchesYear = nurseryAssessmentYearFilter === "all" || assessmentYear === nurseryAssessmentYearFilter
    
    return matchesSearch && matchesType && matchesYear
  })

  // Get unique assessment types and years for filters
  const nurseryAssessmentTypes = [...new Set(nurseryAssessments.map(a => formatNurseryAssessmentType(a.assessment_type)).filter(Boolean))]
  const nurseryAssessmentYears = [...new Set(nurseryAssessments.map(a => new Date(a.created_at).getFullYear()).filter(Boolean))]

  // Helper functions for attendance trends filtering
  const getAvailableYears = () => {
    const currentYear = new Date().getFullYear()
    const dataYears = Array.from(new Set(attendanceTrendsData.map(d => d.year)))
    
    // Always include current year even if no data exists
    const allYears = Array.from(new Set([currentYear, ...dataYears]))
    
    return allYears.sort((a, b) => b - a) // Most recent first
  }

  const getFilteredAttendanceData = () => {
    const filtered = attendanceTrendsData.filter(d => d.year === selectedYear)
    
    // Add month-only labels for display
    return filtered.map(item => ({
      ...item,
      monthOnly: item.monthYear ? item.monthYear.split(' ')[0] : item.month || 'Unknown'
    }))
  }

  // Helper functions for finance period filtering
  const getAvailableFinanceYears = () => {
    const years = Array.from(new Set(availableFinancePeriods.map(p => p.year)))
    // Filter out invalid years (2028 and 1024) to improve data accuracy
    const validYears = years.filter(year => year >= 2020 && year <= 2027)
    return validYears.sort((a, b) => b - a) // Most recent first
  }

  const getAvailableFinanceMonths = () => {
    const months = availableFinancePeriods
      .filter(p => p.year === selectedFinanceYear)
      .map(p => p.month)
    return Array.from(new Set(months)).sort((a, b) => b - a) // Most recent first
  }

  const getMonthName = (monthNumber: number) => {
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ]
    return monthNames[monthNumber - 1] || ""
  }

  const availableYears = getAvailableYears()
  const filteredAttendanceData = getFilteredAttendanceData()
  const availableFinanceYears = getAvailableFinanceYears()
  const availableFinanceMonths = getAvailableFinanceMonths()

  const handleViewReport = (reportId: string | null) => {
    if (reportId) {
      // Find the report in historical reports first
      let report = historicalReports.find(r => r.id === reportId)
      let schoolId, month, year
      if (report) {
        // Historical report
        schoolId = report.schoolId
        month = report.month
        year = report.year
      } else {
        // Check if it's a current month school with submitted report
        const currentSchool = currentMonthSchools.find(s => s.reportId === reportId)
        if (currentSchool) {
          schoolId = currentSchool.id
          // Get current reporting period (previous month)
          const now = new Date()
          let reportingMonth = now.getMonth() // JavaScript months are 0-indexed, so this gives us last month
          let reportingYear = now.getFullYear()
          
          // Handle year rollover for January (month 0)
          if (reportingMonth === 0) {
            reportingMonth = 12
            reportingYear = reportingYear - 1
          }
          
          month = reportingMonth
          year = reportingYear
        }
      }
      if (schoolId && month && year) {
        const monthParam = `${month}-${year}`
        const backUrl = encodeURIComponent('/dashboard/regional-officer')
        
        const navigationUrl = `/dashboard/reports/view/${schoolId}/${monthParam}?back=${backUrl}`
        // Navigate to the unified report view page
        router.push(navigationUrl)
      } else {
        console.error(`Missing navigation parameters:`, { schoolId, month, year })
      }
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "submitted":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Submitted</Badge>
      case "not-submitted":
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Not Submitted</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const handleSelectAllSchools = (checked: boolean) => {
    if (checked) {
      // Select all schools that haven't submitted reports
      const notSubmittedSchools = filteredCurrentMonthSchools
        .filter((school) => school.status === "not-submitted")
        .map((school) => school.id)
      setSelectedSchools(notSubmittedSchools)
    } else {
      // Deselect all schools
      setSelectedSchools([])
    }
  }

  const handleSelectSchool = (schoolId: string, checked: boolean) => {
    if (checked) {
      setSelectedSchools((prev) => [...prev, schoolId])
    } else {
      setSelectedSchools((prev) => prev.filter((id) => id !== schoolId))
    }
  }

  const handleSendReminders = async () => {
    if (selectedSchools.length === 0) {
      toast({
        title: "No schools selected",
        description: "Please select at least one school to send reminders.",
        variant: "destructive",
      })
      return
    }

    setIsSendingReminders(true)
    setReminderResult(null)

    try {
      const result = await sendReportReminders(selectedSchools)
      setReminderResult(result)

      if (result.success) {
        toast({
          title: "Reminders sent",
          description: `${result.message} Test emails sent to head teachers.`,
          variant: "default",
        })
        // Clear selections after successful send
        setSelectedSchools([])
      } else {
        toast({
          title: "Failed to send reminders",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error sending reminders:", error)
      setReminderResult({
        success: false,
        message: "An unexpected error occurred while sending reminders.",
      })
      toast({
        title: "Error",
        description: "An unexpected error occurred while sending reminders.",
        variant: "destructive",
      })
    } finally {
      setIsSendingReminders(false)
      // Refresh the data
      loadCurrentMonthSchools()
    }
  }

  // Count of schools that haven't submitted reports
  const notSubmittedCount = filteredCurrentMonthSchools.filter(
    (school) => school.status === "not-submitted",
  ).length

  // Get current reporting period month name for display (previous month)
  const getCurrentMonthName = () => {
    const now = new Date()
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
    
    // Get previous month (current reporting period)
    let month = now.getMonth() - 1
    let year = now.getFullYear()
    
    // Handle year rollover for January
    if (month < 0) {
      month = 11 // December
      year = year - 1
    }
    
    return `${monthNames[month]} ${year}`
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-blue-600">Regional Officer Dashboard</h1>
        <p className="text-gray-500 mt-1">Monitor reports and school performance across the system</p>
      </div>

      <Tabs value={currentTab} onValueChange={(value) => updateURL(value)} className="space-y-4">
        <div className="flex justify-center">
          <TabsList className="w-fit p-1 bg-white rounded-lg shadow-sm border h-auto flex-wrap">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-600 hover:text-gray-900 hover:bg-gray-50 text-xs sm:text-sm py-2 px-2 sm:px-4 font-medium transition-all duration-200 whitespace-nowrap"
            >
              <span className="hidden sm:inline">Dashboard Overview</span>
              <span className="sm:hidden">Overview</span>
            </TabsTrigger>
            <TabsTrigger 
              value="reports" 
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-600 hover:text-gray-900 hover:bg-gray-50 text-xs sm:text-sm py-2 px-2 sm:px-4 font-medium transition-all duration-200 whitespace-nowrap"
            >
              <span className="hidden sm:inline">Submitted Reports</span>
              <span className="sm:hidden">Reports</span>
            </TabsTrigger>
            <TabsTrigger 
              value="pe-reports" 
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-600 hover:text-gray-900 hover:bg-gray-50 text-xs sm:text-sm py-2 px-2 sm:px-4 font-medium transition-all duration-200 whitespace-nowrap"
            >
              <span className="hidden sm:inline">Regional PE Reports</span>
              <span className="sm:hidden">PE</span>
            </TabsTrigger>
            <TabsTrigger 
              value="nursery-assessment" 
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-600 hover:text-gray-900 hover:bg-gray-50 text-xs sm:text-sm py-2 px-2 sm:px-4 font-medium transition-all duration-200 whitespace-nowrap"
            >
              <span className="hidden sm:inline">Nursery Assessment</span>
              <span className="sm:hidden">Nursery</span>
            </TabsTrigger>
            <TabsTrigger 
              value="ai-insights" 
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-600 hover:text-gray-900 hover:bg-gray-50 text-xs sm:text-sm py-2 px-2 sm:px-4 font-medium transition-all duration-200 whitespace-nowrap"
            >
              <span className="hidden sm:inline">AI Insights</span>
              <span className="sm:hidden">AI</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-4 lg:space-y-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-blue-600 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />
                System Overview
              </h2>
              <p className="text-gray-500 text-sm sm:text-base">Monitor key metrics and performance indicators</p>
            </div>
            <div 
              onClick={() => router.push('/dashboard/regional-officer/school-readiness')}
              className="cursor-pointer bg-red-500 hover:bg-red-600 transition-all duration-200 rounded-full px-3 sm:px-4 py-2 text-center text-white shadow-lg hover:shadow-xl"
            >
              <div className="flex items-center gap-2">
                <School className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm font-medium">School Readiness</span>
              </div>
              <div className="text-sm sm:text-lg font-bold">
                {schoolReadinessPercentage !== null ? `${schoolReadinessPercentage}%` : '--'}
              </div>
            </div>
          </div>
          
          {/* Key Metrics */}
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="gradient-card border-0 shadow-md">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                    <School className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground">Total Schools</p>
                    <p className="text-xl sm:text-2xl font-bold text-primary-700">{currentMonthSchools.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="gradient-card border-0 shadow-md">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground">Reports Submitted</p>
                    <p className="text-xl sm:text-2xl font-bold text-green-700">
                      {currentMonthSchools.filter((s) => s.status === "submitted").length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="gradient-card border-0 shadow-md sm:col-span-2 lg:col-span-1">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg flex-shrink-0">
                    <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground">Not Submitted</p>
                    <p className="text-xl sm:text-2xl font-bold text-orange-700">
                      {currentMonthSchools.filter((s) => s.status === "not-submitted").length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Charts Section */}
          <div className="grid gap-4 lg:gap-6 grid-cols-1 lg:grid-cols-2">
            {/* Monthly Expenditure Trends */}
            <Card className="gradient-card border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-primary-700">Monthly Expenditure Trends</CardTitle>
                <CardDescription>School expenditures by month for current year</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingExpenditure ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                    <span className="ml-2 text-primary-600">Loading expenditure data...</span>
                  </div>
                ) : expenditureError ? (
                  <div className="flex items-center justify-center h-[300px] text-red-600">
                    <AlertCircle className="h-8 w-8 mr-2" />
                    <span>{expenditureError}</span>
                  </div>
                ) : expenditureData.length === 0 ? (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    <span>No expenditure data available for current year</span>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={sortedExpenditureData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                      <Tooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                                <p className="font-medium text-gray-900">{`Month: ${label}`}</p>
                                {payload.map((entry, index) => (
                                  <p key={index} style={{ color: entry.color }} className="text-sm">
                                    <span className="font-medium">
                                      {entry.dataKey === 'total' ? 'Total Expenditure' : entry.dataKey}:
                                    </span>
                                    {' '}${entry.value?.toLocaleString()}
                                  </p>
                                ))}
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="total" 
                        stroke="#dc2626" 
                        strokeWidth={3} 
                        name="Total Expenditure"
                        dot={{ fill: "#dc2626", strokeWidth: 2, r: 4 }}
                      />
                      {expenditureSchools.slice(0, 3).map((school, index) => {
                        const colors = ["#3b82f6", "#10b981", "#f59e0b"]
                        return (
                          <Line
                            key={school}
                            type="monotone"
                            dataKey={school}
                            stroke={colors[index]}
                            strokeWidth={2}
                            name={school}
                            strokeDasharray={index > 0 ? "5 5" : undefined}
                            dot={{ fill: colors[index], strokeWidth: 1, r: 3 }}
                          />
                        )
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Report Status Distribution */}
            <Card className="gradient-card border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-primary-700">Report Status Distribution</CardTitle>
                <CardDescription>Current status of monthly reports</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingDashboardData ? (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                    <span className="ml-2 text-primary-600">Loading report status data...</span>
                  </div>
                ) : reportStatusData.length === 0 ? (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    <span>No report status data available</span>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={reportStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {reportStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* School Performance and Region Comparison */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Top Expenditure Schools */}
            <Card className="gradient-card border-0 shadow-lg">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="text-primary-700">Top Expenditure Schools</CardTitle>
                    <CardDescription>Schools with highest total expenditure</CardDescription>
                  </div>
                  {availableFinancePeriods.length > 0 && (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="flex items-center gap-2">
                        <label htmlFor="finance-year-filter" className="text-sm font-medium text-muted-foreground">
                          Year:
                        </label>
                        <Select
                          value={selectedFinanceYear.toString()}
                          onValueChange={(value) => setSelectedFinanceYear(parseInt(value))}
                        >
                          <SelectTrigger id="finance-year-filter" className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availableFinanceYears.map((year) => (
                              <SelectItem key={year} value={year.toString()}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2">
                        <label htmlFor="finance-month-filter" className="text-sm font-medium text-muted-foreground">
                          Month:
                        </label>
                        <Select
                          value={selectedFinanceMonth.toString()}
                          onValueChange={(value) => setSelectedFinanceMonth(parseInt(value))}
                        >
                          <SelectTrigger id="finance-month-filter" className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availableFinanceMonths.map((month) => (
                              <SelectItem key={month} value={month.toString()}>
                                {getMonthName(month)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingTopExpenditure ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                    <span className="ml-2 text-primary-600">Loading expenditure data...</span>
                  </div>
                ) : topExpenditureError ? (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    <div className="text-center">
                      <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
                      <p className="text-red-600">{topExpenditureError}</p>
                    </div>
                  </div>
                ) : topExpenditureSchools.length === 0 ? (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p>No expenditure data available</p>
                      <p className="text-xs mt-2">for {getMonthName(selectedFinanceMonth)} {selectedFinanceYear}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={topExpenditureSchools}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="schoolName" 
                          tick={{ fontSize: 10 }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis 
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                          label={{ value: 'Total Expenditure', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip 
                          formatter={(value) => [`$${value.toLocaleString()}`, 'Total Expenditure']}
                          labelStyle={{ fontSize: '12px' }}
                        />
                        <Bar 
                          dataKey="totalExpenditure" 
                          fill="#dc2626"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Regional Attendance & Punctuality Trends */}
            <Card className="gradient-card border-0 shadow-lg">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="text-primary-700">Regional Performance Trends</CardTitle>
                    <CardDescription>Monthly attendance and punctuality rates for teachers and students</CardDescription>
                  </div>
                  {availableYears.length > 0 && (
                    <div className="flex items-center gap-2">
                      <label htmlFor="year-filter" className="text-sm font-medium text-muted-foreground">
                        Year:
                      </label>
                      <Select
                        value={selectedYear.toString()}
                        onValueChange={(value) => setSelectedYear(parseInt(value))}
                      >
                        <SelectTrigger id="year-filter" className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableYears.map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingAttendanceTrends ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                    <span className="ml-2 text-primary-600">Loading attendance trends...</span>
                  </div>
                ) : attendanceTrendsError ? (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    <div className="text-center">
                      <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
                      <p className="text-red-600">{attendanceTrendsError}</p>
                    </div>
                  </div>
                ) : filteredAttendanceData.length === 0 ? (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p>No attendance data available for {selectedYear}</p>
                      <p className="text-xs mt-2">Submit some reports to see attendance trends</p>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={filteredAttendanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="monthOnly" 
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        domain={[0, 100]}
                        tick={{ fontSize: 12 }}
                        label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip 
                        labelFormatter={(label) => label}
                        formatter={(value, name) => [`${value}%`, name]}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="studentAttendance" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        name="Student Attendance"
                        dot={{ fill: "#3b82f6", r: 4 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="teacherAttendance" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        name="Teacher Attendance"
                        dot={{ fill: "#10b981", r: 4 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="studentPunctuality" 
                        stroke="#f59e0b" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        name="Student Punctuality"
                        dot={{ fill: "#f59e0b", r: 4 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="teacherPunctuality" 
                        stroke="#ef4444" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        name="Teacher Punctuality"
                        dot={{ fill: "#ef4444", r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4 lg:space-y-6">
          {/* Page Header */}
          
          {/* Toggle Section */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-primary-700 flex items-center gap-2">
                  {showCurrentMonth ? (
                    <>
                      <Calendar className="h-5 w-5 sm:h-6 sm:w-6" />
                      Current Month Report Status
                    </>
                  ) : (
                    <>
                      <History className="h-5 w-5 sm:h-6 sm:w-6" />
                      Historical Monthly Reports
                    </>
                  )}
                </h2>
                <p className="text-muted-foreground text-sm sm:text-base">
                  {showCurrentMonth
                    ? `${getCurrentMonthName()} - Track submission status for all schools in your region`
                    : "Historical reports from previous months in your region"}
                </p>
              </div>
            </div>

            {/* Filters */}
            <Card className="gradient-card border-0 shadow-md">
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 flex-1 w-full lg:w-auto">
                    {showCurrentMonth ? (
                      <>
                        <div>
                          <Input
                            placeholder="Search schools..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="border-primary-200 focus:border-primary-500 text-sm"
                          />
                        </div>
                        <div>
                          <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="border-primary-200 focus:border-primary-500">
                              <SelectValue placeholder="Filter by Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Status</SelectItem>
                              <SelectItem value="submitted">Submitted</SelectItem>
                              <SelectItem value="not-submitted">Not Submitted</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Select value={schoolLevelFilter} onValueChange={setSchoolLevelFilter}>
                            <SelectTrigger className="border-primary-200 focus:border-primary-500">
                              <SelectValue placeholder="Filter by Level" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Levels</SelectItem>
                              <SelectItem value="Primary">Primary</SelectItem>
                              <SelectItem value="Secondary">Secondary</SelectItem>
                              <SelectItem value="Nursery">Nursery</SelectItem>
                              <SelectItem value="Post Secondary">Post Secondary</SelectItem>
                              <SelectItem value="Technical Institutes">Technical Institutes</SelectItem>
                              <SelectItem value="Practical Instruction Centre">Practical Instruction Centre</SelectItem>
                              <SelectItem value="Special Education Needs">Special Education Needs</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="sm:col-span-2 lg:col-span-2 flex justify-start">
                          <Button
                            onClick={loadCurrentMonthSchools}
                            disabled={isLoadingCurrentMonth}
                            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-1 text-sm"
                            size="sm"
                          >
                            {isLoadingCurrentMonth ? (
                              <>
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                <span className="hidden sm:inline">Loading...</span>
                                <span className="sm:hidden">Loading</span>
                              </>
                            ) : (
                              <>
                                <span className="hidden sm:inline">Refresh Data</span>
                                <span className="sm:hidden">Refresh</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <Input
                            placeholder="Search reports..."
                            value={previousReportsSearch}
                            onChange={(e) => setPreviousReportsSearch(e.target.value)}
                            className="border-primary-200 focus:border-primary-500 text-sm"
                          />
                        </div>
                        <div>
                          <Select value={previousReportsYear} onValueChange={setPreviousReportsYear}>
                            <SelectTrigger className="border-primary-200 focus:border-primary-500">
                              <SelectValue placeholder="Select Year" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Years</SelectItem>
                              {availableReportYears.map((year) => (
                                <SelectItem key={year} value={year.toString()}>
                                  {year}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Select value={previousReportsMonth} onValueChange={setPreviousReportsMonth}>
                            <SelectTrigger className="border-primary-200 focus:border-primary-500">
                              <SelectValue placeholder="Select Month" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Months</SelectItem>
                              {availableReportMonths.map((month) => (
                                <SelectItem key={month} value={month.toString()}>
                                  {getReportMonthName(month)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Button
                            onClick={loadHistoricalReports}
                            disabled={isLoadingReports}
                            className="bg-primary-600 hover:bg-primary-700 text-white w-full"
                            size="sm"
                          >
                            {isLoadingReports ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                <span className="hidden sm:inline">Loading...</span>
                                <span className="sm:hidden">Loading</span>
                              </>
                            ) : (
                              <>
                                <span className="hidden sm:inline">Refresh Reports</span>
                                <span className="sm:hidden">Refresh</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Toggle Button */}
                  <div className="ml-4">
                    <Button
                      onClick={toggleView}
                      className="gradient-button text-white hover:shadow-lg transition-all duration-200"
                    >
                      {showCurrentMonth ? "View Historical Reports" : "View Current Month"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reminder Result Alert */}
            {reminderResult && (
              <Alert
                variant={reminderResult.success ? "default" : "destructive"}
                className={
                  reminderResult.success ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50"
                }
              >
                {reminderResult.success ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertTitle>{reminderResult.success ? "Success" : "Error"}</AlertTitle>
                <AlertDescription>{reminderResult.message}</AlertDescription>
              </Alert>
            )}

            {/* Error Alert for Current Month */}
            {currentMonthError && showCurrentMonth && (
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{currentMonthError}</AlertDescription>
              </Alert>
            )}

            {/* Error Alert for Historical Reports */}
            {reportsError && !showCurrentMonth && (
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{reportsError}</AlertDescription>
              </Alert>
            )}

            {/* Conditional Table Rendering */}
            {showCurrentMonth ? (
              /* Current Month Schools Table */
              <Card className="gradient-card border-0 shadow-lg">
                <CardHeader className="pb-3 sm:pb-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg sm:text-xl text-primary-700">School Report Status - {getCurrentMonthName()}</CardTitle>
                      <CardDescription className="text-sm">
                        {isLoadingCurrentMonth
                          ? "Loading schools..."
                          : `Showing ${currentMonthStartIndex + 1}-${Math.min(currentMonthEndIndex, totalCurrentMonthSchools)} of ${totalCurrentMonthSchools} schools in your region`}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-green-600 border-green-600 bg-green-50 text-xs">
                        {currentMonthSchools.filter((s) => s.status === "submitted").length} Submitted
                      </Badge>
                      <Badge variant="outline" className="text-red-600 border-red-600 bg-red-50 text-xs">
                        {
                          currentMonthSchools.filter((s) => s.status === "not-submitted")
                            .length
                        }{" "}
                        Not Submitted
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  {isLoadingCurrentMonth ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                      <span className="ml-2 text-primary-600 text-sm">Loading current month schools...</span>
                    </div>
                  ) : filteredCurrentMonthSchools.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {currentMonthError ? "Failed to load schools" : "No schools found in your region"}
                    </div>
                  ) : (
                    <>
                      {/* Reminder Button */}
                      <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="select-all"
                            checked={
                                selectedSchools.length > 0 &&
                                selectedSchools.length ===
                                  filteredCurrentMonthSchools.filter(
                                    (s) => s.status === "not-submitted",
                                  ).length
                              }
                            onCheckedChange={handleSelectAllSchools}
                            disabled={notSubmittedCount === 0}
                          />
                          <label
                            htmlFor="select-all"
                            className={`text-sm font-medium ${
                              notSubmittedCount === 0 ? "text-gray-400" : "text-primary-700"
                            }`}
                          >
                            <span className="hidden sm:inline">Select All Non-Submitted ({notSubmittedCount})</span>
                            <span className="sm:hidden">Select All ({notSubmittedCount})</span>
                          </label>
                        </div>
                        <Button
                          onClick={handleSendReminders}
                          disabled={selectedSchools.length === 0 || isSendingReminders}
                          className="bg-primary-600 hover:bg-primary-700 text-white w-full sm:w-auto"
                          size="sm"
                        >
                          {isSendingReminders ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              <span className="hidden sm:inline">Sending...</span>
                              <span className="sm:hidden">Sending</span>
                            </>
                          ) : (
                            <>
                              <Mail className="mr-2 h-4 w-4" />
                              <span className="hidden sm:inline">Send Reminders ({selectedSchools.length})</span>
                              <span className="sm:hidden">Send ({selectedSchools.length})</span>
                            </>
                          )}
                        </Button>
                      </div>

                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[50px]">Select</TableHead>
                              <TableHead>School Name</TableHead>
                              <TableHead className="hidden sm:table-cell">Head Teacher</TableHead>
                              <TableHead className="hidden lg:table-cell">Due Date</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="hidden md:table-cell">Submitted Date</TableHead>
                              <TableHead className="text-right w-[80px]">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedCurrentMonthSchools.map((school) => (
                              <TableRow key={school.id}>
                                <TableCell>
                                  {school.status === "not-submitted" ? (
                                    <Checkbox
                                      checked={selectedSchools.includes(school.id)}
                                      onCheckedChange={(checked) => handleSelectSchool(school.id, !!checked)}
                                    />
                                  ) : (
                                    <Checkbox disabled checked={false} />
                                  )}
                                </TableCell>
                                <TableCell className="font-medium">
                                  <div>
                                    <div className="text-sm">{school.schoolName}</div>
                                    <div className="text-xs text-muted-foreground sm:hidden">
                                      {school.headTeacher || "No Head Teacher"}
                                    </div>
                                    <div className="text-xs text-muted-foreground lg:hidden">
                                      Due: {new Date(school.dueDate).toLocaleDateString()}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="hidden sm:table-cell text-sm">{school.headTeacher || "-"}</TableCell>
                                <TableCell className="hidden lg:table-cell text-sm">{new Date(school.dueDate).toLocaleDateString()}</TableCell>
                                <TableCell>{getStatusBadge(school.status)}</TableCell>
                                <TableCell className="hidden md:table-cell text-sm">
                                  {school.submittedDate ? new Date(school.submittedDate).toLocaleDateString() : "-"}
                                </TableCell>
                                <TableCell className="text-right">
                                  {school.status === "submitted" ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="border-primary-200 text-primary-700 hover:bg-primary-50 bg-transparent"
                                      onClick={() => handleViewReport(school.reportId)}
                                    >
                                      <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                      <span className="hidden sm:inline">View Report</span>
                                      <span className="sm:hidden">View</span>
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="border-orange-200 text-orange-700 hover:bg-orange-50 bg-transparent"
                                      onClick={() => {
                                        handleSelectSchool(school.id, !selectedSchools.includes(school.id))
                                      }}
                                    >
                                      <Mail className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                      <span className="hidden sm:inline">{selectedSchools.includes(school.id) ? "Selected" : "Send Reminder"}</span>
                                      <span className="sm:hidden">{selectedSchools.includes(school.id) ? "✓" : "Send"}</span>
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      
                      {/* Current Month Pagination Controls */}
                      {totalCurrentMonthPages > 1 && (
                        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCurrentMonthPageChange(currentMonthPage - 1)}
                              disabled={currentMonthPage === 1}
                              className="border-primary-200 text-primary-700 hover:bg-primary-50"
                            >
                              <ChevronLeft className="h-4 w-4 mr-1" />
                              Previous
                            </Button>
                            
                            <div className="flex items-center space-x-1">
                              {Array.from({ length: Math.min(5, totalCurrentMonthPages) }, (_, i) => {
                                let pageNum
                                if (totalCurrentMonthPages <= 5) {
                                  pageNum = i + 1
                                } else if (currentMonthPage <= 3) {
                                  pageNum = i + 1
                                } else if (currentMonthPage >= totalCurrentMonthPages - 2) {
                                  pageNum = totalCurrentMonthPages - 4 + i
                                } else {
                                  pageNum = currentMonthPage - 2 + i
                                }
                                
                                return (
                                  <Button
                                    key={pageNum}
                                    variant={currentMonthPage === pageNum ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handleCurrentMonthPageChange(pageNum)}
                                    className={`w-10 ${
                                      currentMonthPage === pageNum 
                                        ? "bg-primary-600 text-white hover:bg-primary-700" 
                                        : "border-primary-200 text-primary-700 hover:bg-primary-50"
                                    }`}
                                  >
                                    {pageNum}
                                  </Button>
                                )
                              })}
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCurrentMonthPageChange(currentMonthPage + 1)}
                              disabled={currentMonthPage === totalCurrentMonthPages}
                              className="border-primary-200 text-primary-700 hover:bg-primary-50"
                            >
                              Next
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-sm text-muted-foreground">
                              Page {currentMonthPage} of {totalCurrentMonthPages}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">Show:</span>
                              <Select value={currentMonthPageSize.toString()} onValueChange={(value) => setCurrentMonthPageSize(parseInt(value))}>
                                <SelectTrigger className="w-16 h-8 border-primary-200">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="10">10</SelectItem>
                                  <SelectItem value="25">25</SelectItem>
                                  <SelectItem value="50">50</SelectItem>
                                  <SelectItem value="100">100</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              /* Historical Reports Table */
              <Card className="gradient-card border-0 shadow-lg">
                <CardHeader className="pb-3 sm:pb-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg sm:text-xl text-primary-700 flex items-center gap-2">
                        <History className="h-5 w-5 sm:h-6 sm:w-6" />
                        Historical Monthly Reports
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {isLoadingReports
                          ? "Loading reports..."
                          : `Showing ${startIndex + 1}-${Math.min(endIndex, totalReports)} of ${totalReports} reports from your region`}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="bg-primary-100 text-primary-700 text-xs">
                        {totalReports} Reports
                      </Badge>
                      <Button className="gradient-button text-white text-xs sm:text-sm" size="sm" disabled={isLoadingReports}>
                        <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Export All</span>
                        <span className="sm:hidden">Export</span>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  {isLoadingReports ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                      <span className="ml-2 text-primary-600 text-sm">Loading historical reports...</span>
                    </div>
                  ) : filteredHistoricalReports.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {reportsError ? "Failed to load reports" : "No historical reports found for your region"}
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>School Name</TableHead>
                              <TableHead className="hidden sm:table-cell">Head Teacher</TableHead>
                              <TableHead>Month & Year</TableHead>
                              <TableHead className="hidden md:table-cell">Date Submitted</TableHead>
                              <TableHead className="text-right w-[80px]">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedHistoricalReports.map((report) => {
                            // Create a mock report object that matches the EO reports structure
                            const mockReport = {
                              id: report.id,
                              month: report.month,
                              year: report.year,
                              sms_schools: {
                                id: report.schoolId,
                                name: report.schoolName
                              },
                              school_id: report.schoolId
                            }
                            
                            return (
                              <ClickableReportRow key={report.id} report={mockReport}>
                                <TableCell className="font-medium">
                                  <div>
                                    <div className="text-sm">{report.schoolName}</div>
                                    <div className="text-xs text-muted-foreground sm:hidden">
                                      {report.headTeacherName}
                                    </div>
                                    <div className="text-xs text-muted-foreground md:hidden">
                                      Submitted: {report.submittedDate}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="hidden sm:table-cell text-sm">{report.headTeacherName}</TableCell>
                                <TableCell>
                                  <span className="font-medium text-primary-700 text-sm">{report.monthYear}</span>
                                </TableCell>
                                <TableCell className="hidden md:table-cell text-sm">{report.submittedDate}</TableCell>
                                <TableCell className="text-right">
                                  <Button asChild variant="outline" size="sm" className="border-primary-200 text-primary-700 hover:bg-primary-50 bg-transparent">
                                    <span>
                                      <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                      <span className="hidden sm:inline">View Report</span>
                                      <span className="sm:hidden">View</span>
                                    </span>
                                  </Button>
                                </TableCell>
                              </ClickableReportRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="border-primary-200 text-primary-700 hover:bg-primary-50"
                          >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Previous
                          </Button>
                          
                          <div className="flex items-center space-x-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              let pageNum
                              if (totalPages <= 5) {
                                pageNum = i + 1
                              } else if (currentPage <= 3) {
                                pageNum = i + 1
                              } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i
                              } else {
                                pageNum = currentPage - 2 + i
                              }
                              
                              return (
                                <Button
                                  key={pageNum}
                                  variant={currentPage === pageNum ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => handlePageChange(pageNum)}
                                  className={`w-10 ${
                                    currentPage === pageNum 
                                      ? "bg-primary-600 text-white hover:bg-primary-700" 
                                      : "border-primary-200 text-primary-700 hover:bg-primary-50"
                                  }`}
                                >
                                  {pageNum}
                                </Button>
                              )
                            })}
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="border-primary-200 text-primary-700 hover:bg-primary-50"
                          >
                            Next
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-sm text-muted-foreground">
                            Page {currentPage} of {totalPages}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Show:</span>
                            <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(parseInt(value))}>
                              <SelectTrigger className="w-16 h-8 border-primary-200">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                                <SelectItem value="100">100</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="pe-reports" className="space-y-4 lg:space-y-6">
          {/* Page Header */}
          <div>
            <h2 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
              <Activity className="h-6 w-6" />
              Regional Physical Education Reports
            </h2>
            <p className="text-gray-500">Monitor physical education program reports and activities in your region</p>
          </div>
          
          <RegionalPEReportsContent />
        </TabsContent>

        <TabsContent value="nursery-assessment" className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-blue-600 flex items-center gap-2">
                <BookOpen className="h-5 w-5 sm:h-6 sm:w-6" />
                Nursery Assessments - {user?.region_name || 'Your Region'}
                {nurseryAssessmentsLoaded && !isLoadingNurseryAssessments && (
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                    Loaded
                  </Badge>
                )}
              </h1>
              <p className="text-gray-600 text-sm sm:text-base mt-1">
                Monitor and review nursery assessments from schools in your region
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
                    placeholder="Search by school name, head teacher..."
                    className="sm:max-w-md"
                    value={nurseryAssessmentSearch}
                    onChange={(e) => setNurseryAssessmentSearch(e.target.value)}
                  />
                  <Select value={nurseryAssessmentTypeFilter} onValueChange={setNurseryAssessmentTypeFilter}>
                    <SelectTrigger className="sm:w-56">
                      <SelectValue placeholder="All Assessment Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Assessment Types</SelectItem>
                      {nurseryAssessmentTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={nurseryAssessmentYearFilter} onValueChange={setNurseryAssessmentYearFilter}>
                    <SelectTrigger className="sm:w-40">
                      <SelectValue placeholder="All Years" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {nurseryAssessmentYears.map(year => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    className="flex items-center gap-2 flex-shrink-0"
                    onClick={() => loadNurseryAssessments(true)}
                    disabled={isLoadingNurseryAssessments}
                  >
                    {isLoadingNurseryAssessments ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Refreshing...
                      </>
                    ) : (
                      <>
                        Refresh Data
                      </>
                    )}
                  </Button>
                  {isLoadingNurseryAssessments && (
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={resetNurseryAssessments}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Alert */}
          {nurseryAssessmentsError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{nurseryAssessmentsError}</AlertDescription>
            </Alert>
          )}

          {/* Assessments List */}
          {isLoadingNurseryAssessments && !nurseryAssessmentsLoaded ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 mx-auto text-gray-400 mb-4 animate-spin" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Nursery Assessments</h3>
                  <p className="text-gray-600">Fetching nursery assessments for {user?.region_name}...</p>
                </div>
              </CardContent>
            </Card>
          ) : filteredNurseryAssessments.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Nursery Assessments</h3>
                  <p className="text-gray-600">
                    {nurseryAssessments.length === 0 
                      ? `No nursery assessments have been submitted in ${user?.region_name} yet.`
                      : "No assessments match your current filter criteria."
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
                        <TableHead className="min-w-[180px] font-semibold">Assessment Type</TableHead>
                        <TableHead className="min-w-[100px] font-semibold">Enrollment</TableHead>
                        <TableHead className="min-w-[140px] font-semibold">Date Submitted</TableHead>
                        <TableHead className="min-w-[100px] font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredNurseryAssessments.map((assessment) => (
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
                            <Badge 
                              variant="outline" 
                              className={`text-xs font-medium border ${getNurseryAssessmentTypeColor(assessment.assessment_type)}`}
                            >
                              {formatNurseryAssessmentType(assessment.assessment_type)}
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
                                {new Date(assessment.created_at).toLocaleDateString('en-US', { 
                                  year: 'numeric', 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
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
                                href={`/dashboard/nursery-assessment/view/${assessment.id}?back=${encodeURIComponent('/dashboard/regional-officer?tab=nursery-assessment')}`}
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
        </TabsContent>

        <TabsContent value="ai-insights" className="space-y-4 lg:space-y-6">          
          <RegionalAIInsightsContent />
        </TabsContent>

      </Tabs>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <Button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 h-12 w-12 rounded-full bg-primary-600 hover:bg-primary-700 text-white shadow-lg transition-all duration-300 hover:shadow-xl"
          size="sm"
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      )}
    </div>
  )
}
