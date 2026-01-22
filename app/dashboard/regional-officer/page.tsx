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
import { RegionalPEReportsContent } from "./pe-reports/pe-reports-content"
import { RegionalAIInsightsContent } from "./ai-insights/page"
import { RegionalOfficerAssessmentCard } from "@/components/school-assessment-entry-card"
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
  LayoutDashboard,
  FileText,
  ClipboardList,
  Baby,
  Sparkles,
  Building2,
  Users,
  PieChart as PieChartIcon,
  Menu,
  X,
  Search,
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
  const [pageSize, setPageSize] = useState<number>(10)

  // Pagination state for current month schools
  const [currentMonthPage, setCurrentMonthPage] = useState<number>(1)
  const [currentMonthPageSize, setCurrentMonthPageSize] = useState<number>(10)

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
  const [nurseryAssessmentPage, setNurseryAssessmentPage] = useState<number>(1)
  const [nurseryAssessmentPageSize, setNurseryAssessmentPageSize] = useState<number>(10)

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
        
        // Set default selection to most recent period if available, but not in the future
        if (financePeriodsResult.periods.length > 0) {
          const currentDate = new Date()
          const currentYear = currentDate.getFullYear()
          const currentMonth = currentDate.getMonth() + 1
          
          // Find the most recent period that's not in the future
          const validPeriods = financePeriodsResult.periods.filter(period => {
            if (period.year < currentYear) return true
            if (period.year === currentYear && period.month <= currentMonth) return true
            return false
          })
          
          let mostRecent
          if (validPeriods.length > 0) {
            mostRecent = validPeriods[0] // Already sorted by most recent first
          } else {
            // Fallback to current year/month if no valid periods found
            mostRecent = { year: currentYear, month: currentMonth }
          }
          
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
        
        // Set default selection to most recent period if available, but not in the future
        if (result.periods.length > 0) {
          const currentDate = new Date()
          const currentYear = currentDate.getFullYear()
          const currentMonth = currentDate.getMonth() + 1
          
          // Find the most recent period that's not in the future
          const validPeriods = result.periods.filter(period => {
            if (period.year < currentYear) return true
            if (period.year === currentYear && period.month <= currentMonth) return true
            return false
          })
          
          let mostRecent
          if (validPeriods.length > 0) {
            mostRecent = validPeriods[0] // Already sorted by most recent first
          } else {
            // Fallback to current year/month if no valid periods found
            mostRecent = { year: currentYear, month: currentMonth }
          }
          
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
      return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700'
    } else if (assessmentType?.includes('assessment-2-year-2')) {
      return 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700'
    } else if (assessmentType?.includes('assessment-3-year-2')) {
      return 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700'
    }
    return 'bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600'
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

  // Nursery assessment pagination calculations
  const totalNurseryAssessments = filteredNurseryAssessments.length
  const totalNurseryAssessmentPages = Math.ceil(totalNurseryAssessments / nurseryAssessmentPageSize)
  const nurseryAssessmentStartIndex = (nurseryAssessmentPage - 1) * nurseryAssessmentPageSize
  const nurseryAssessmentEndIndex = nurseryAssessmentStartIndex + nurseryAssessmentPageSize
  const paginatedNurseryAssessments = filteredNurseryAssessments.slice(nurseryAssessmentStartIndex, nurseryAssessmentEndIndex)

  // Reset to page 1 when filters change for nursery assessments
  useEffect(() => {
    setNurseryAssessmentPage(1)
  }, [nurseryAssessmentSearch, nurseryAssessmentTypeFilter, nurseryAssessmentYearFilter])

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
        return <Badge className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700 whitespace-nowrap">Submitted</Badge>
      case "not-submitted":
        return <Badge className="bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 whitespace-nowrap">Not Submitted</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700 whitespace-nowrap">Pending</Badge>
      case "draft":
        return <Badge className="bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 whitespace-nowrap">Draft</Badge>
      default:
        return <Badge variant="secondary" className="whitespace-nowrap">{status}</Badge>
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

  // State for mobile sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Navigation items for sidebar
  const navigationItems = [
    { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard, description: 'Key metrics & analytics' },
    { id: 'reports', label: 'Submitted Reports', icon: FileText, description: 'School report submissions' },
    { id: 'pe-reports', label: 'Regional PE Reports', icon: ClipboardList, description: 'Physical education reports' },
    { id: 'nursery-assessment', label: 'Nursery Assessment', icon: Baby, description: 'Early childhood evaluations' },
    { id: 'ai-insights', label: 'AI Insights', icon: Sparkles, description: 'AI-powered analytics' },
  ]

  return (
    <div className="min-h-screen">
      {/* Fixed Sidebar Navigation - starts below main header */}
      <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed top-14 sm:top-16 md:top-20 bottom-0 left-0 z-40 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 transition-transform duration-300 ease-in-out flex flex-col shadow-2xl`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Regional Dashboard</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{user?.region_name || 'Region'}</p>
        </div>

        {/* Navigation Items - Scrollable */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = currentTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => {
                  updateURL(item.id)
                  setSidebarOpen(false)
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-white/20'
                    : 'bg-slate-100 dark:bg-slate-800 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
                }`}>
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300'}`} />
                </div>
                <div className="flex-1 text-left">
                  <p className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>{item.label}</p>
                  <p className={`text-xs ${isActive ? 'text-white/70' : 'text-slate-500 dark:text-slate-500'}`}>{item.description}</p>
                </div>
                {isActive && (
                  <div className="w-1.5 h-8 bg-white/30 rounded-full" />
                )}
              </button>
            )
          })}
        </nav>

        {/* School Readiness Card - Fixed at Bottom */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <div 
            onClick={() => router.push('/dashboard/regional-officer/school-readiness')}
            className="p-4 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white cursor-pointer hover:shadow-xl hover:shadow-orange-500/20 transition-all duration-300 hover:scale-[1.02]"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                <span className="font-semibold">School Readiness</span>
              </div>
              <ChevronRight className="w-5 h-5" />
            </div>
            <p className="text-3xl font-bold">{schoolReadinessPercentage !== null ? `${schoolReadinessPercentage}%` : '--'}</p>
            <p className="text-xs text-white/80 mt-1">Click to view details</p>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/60 z-30 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Header - only shows on small screens */}
      <div className="lg:hidden fixed top-14 sm:top-16 md:top-20 left-0 right-0 z-20 flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Regional Dashboard</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">{user?.region_name || 'Region'}</p>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          {sidebarOpen ? <X className="h-5 w-5 text-slate-700 dark:text-white" /> : <Menu className="h-5 w-5 text-slate-700 dark:text-white" />}
        </button>
      </div>

      {/* Main Content Area */}
      <main className="lg:ml-72 min-h-screen pt-14 lg:pt-0">
        <div className="p-4 lg:p-6 max-w-7xl mx-auto">
        <Tabs value={currentTab} onValueChange={(value) => updateURL(value)} className="space-y-4 lg:space-y-6">
          {/* Hidden TabsList - using sidebar for navigation but keeping Tabs for content organization */}
          <TabsList className="hidden">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="pe-reports">PE Reports</TabsTrigger>
            <TabsTrigger value="nursery-assessment">Nursery</TabsTrigger>
            <TabsTrigger value="ai-insights">AI</TabsTrigger>
          </TabsList>

        <TabsContent value="overview" className="space-y-4 lg:space-y-6">
          {/* Page Header with Stats */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent flex items-center gap-2">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
                System Overview
              </h2>
              <p className="text-slate-400 text-sm sm:text-base">Monitor key metrics and performance indicators</p>
            </div>
            {/* Quick Stats Cards */}
            <div className="flex gap-3">
              <div className="px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/30">
                <div className="flex items-center gap-2">
                  <School className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-2xl font-bold text-blue-400">{currentMonthSchools.length}</p>
                    <p className="text-xs text-blue-400/70">Total Schools</p>
                  </div>
                </div>
              </div>
              <div className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="text-2xl font-bold text-emerald-400">{currentMonthSchools.filter((s) => s.status === "submitted").length}</p>
                    <p className="text-xs text-emerald-400/70">Submitted</p>
                  </div>
                </div>
              </div>
              <div className="px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-400" />
                  <div>
                    <p className="text-2xl font-bold text-amber-400">{currentMonthSchools.filter((s) => s.status !== "submitted").length}</p>
                    <p className="text-xs text-amber-400/70">Pending</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* School Assessment Entry Card */}
          <RegionalOfficerAssessmentCard regionId={user?.region_name || ''} />
          
          {/* Key Metrics - Removed since they're already in sidebar */}

          {/* Charts Section */}
          <div className="grid gap-4 lg:gap-6 grid-cols-1 lg:grid-cols-2">
            {/* Monthly Expenditure Trends */}
            <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg rounded-2xl">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white">Monthly Expenditure Trends</CardTitle>
                <CardDescription className="dark:text-slate-400">School expenditures by month for current year</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingExpenditure ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <span className="ml-2 text-blue-600">Loading expenditure data...</span>
                  </div>
                ) : expenditureError ? (
                  <div className="flex items-center justify-center h-[300px] text-red-600 dark:text-red-400">
                    <AlertCircle className="h-8 w-8 mr-2" />
                    <span>{expenditureError}</span>
                  </div>
                ) : expenditureData.length === 0 ? (
                  <div className="flex items-center justify-center h-[300px] text-slate-500 dark:text-slate-400">
                    <span>No expenditure data available for current year</span>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={sortedExpenditureData}>
                      <CartesianGrid strokeDasharray="3 3" className="dark:opacity-30" />
                      <XAxis dataKey="month" className="dark:text-slate-400" />
                      <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} className="dark:text-slate-400" />
                      <Tooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg">
                                <p className="font-medium text-slate-900 dark:text-white">{`Month: ${label}`}</p>
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
            <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg rounded-2xl">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white">Report Status Distribution</CardTitle>
                <CardDescription className="dark:text-slate-400">Current status of monthly reports</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingDashboardData ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <span className="ml-2 text-blue-600">Loading report status data...</span>
                  </div>
                ) : reportStatusData.length === 0 ? (
                  <div className="flex items-center justify-center h-[300px] text-slate-500 dark:text-slate-400">
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
            <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-slate-900 dark:text-white">Top School Expenditure</CardTitle>
                <CardDescription className="dark:text-slate-400">Schools with highest total expenditure</CardDescription>
                {availableFinancePeriods.length > 0 && (
                  <div className="flex flex-wrap items-center gap-3 pt-3">
                    <div className="flex items-center gap-2">
                      <label htmlFor="finance-year-filter" className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        Year:
                      </label>
                      <Select
                        value={selectedFinanceYear.toString()}
                        onValueChange={(value) => setSelectedFinanceYear(parseInt(value))}
                      >
                        <SelectTrigger id="finance-year-filter" className="w-20 h-9 dark:bg-slate-800 dark:border-slate-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                          {availableFinanceYears.map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <label htmlFor="finance-month-filter" className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        Month:
                      </label>
                      <Select
                        value={selectedFinanceMonth.toString()}
                        onValueChange={(value) => setSelectedFinanceMonth(parseInt(value))}
                      >
                        <SelectTrigger id="finance-month-filter" className="w-32 h-9 dark:bg-slate-800 dark:border-slate-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
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
              </CardHeader>
              <CardContent>
                {isLoadingTopExpenditure ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
                    <span className="ml-2 text-blue-600 dark:text-blue-400">Loading expenditure data...</span>
                  </div>
                ) : topExpenditureError ? (
                  <div className="flex items-center justify-center h-[300px] text-slate-500 dark:text-slate-400">
                    <div className="text-center">
                      <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
                      <p className="text-red-600">{topExpenditureError}</p>
                    </div>
                  </div>
                ) : topExpenditureSchools.length === 0 ? (
                  <div className="flex items-center justify-center h-[300px] text-slate-500 dark:text-slate-400">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 text-slate-500 dark:text-slate-400" />
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
                          formatter={(value: any) => [`$${(value || 0).toLocaleString()}`, 'Total Expenditure']}
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
            <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-slate-900 dark:text-white">Regional Performance Trends</CardTitle>
                <CardDescription className="dark:text-slate-400">Monthly attendance and punctuality rates for teachers and students</CardDescription>
                {availableYears.length > 0 && (
                  <div className="flex items-center gap-3 pt-3">
                    <div className="flex items-center gap-2">
                      <label htmlFor="year-filter" className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        Year:
                      </label>
                      <Select
                        value={selectedYear.toString()}
                        onValueChange={(value) => setSelectedYear(parseInt(value))}
                      >
                        <SelectTrigger id="year-filter" className="w-24 h-9 dark:bg-slate-800 dark:border-slate-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                          {availableYears.map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {isLoadingAttendanceTrends ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
                    <span className="ml-2 text-blue-600 dark:text-blue-400">Loading attendance trends...</span>
                  </div>
                ) : attendanceTrendsError ? (
                  <div className="flex items-center justify-center h-[300px] text-slate-500 dark:text-slate-400">
                    <div className="text-center">
                      <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
                      <p className="text-red-600">{attendanceTrendsError}</p>
                    </div>
                  </div>
                ) : filteredAttendanceData.length === 0 ? (
                  <div className="flex items-center justify-center h-[300px] text-slate-500 dark:text-slate-400">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 text-slate-500 dark:text-slate-400" />
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
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
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
                <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base">
                  {showCurrentMonth
                    ? `${getCurrentMonthName()} - Track submission status for all schools in your region`
                    : "Historical reports from previous months in your region"}
                </p>
              </div>
            </div>

            {/* Filters */}
            <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg rounded-2xl">
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
                            className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm"
                          />
                        </div>
                        <div>
                          <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
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
                            <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
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
                            className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm"
                          />
                        </div>
                        <div>
                          <Select value={previousReportsYear} onValueChange={setPreviousReportsYear}>
                            <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
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
                            <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
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
              <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg rounded-2xl">
                <CardHeader className="pb-3 sm:pb-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg sm:text-xl text-slate-900 dark:text-white">School Report Status - {getCurrentMonthName()}</CardTitle>
                      <CardDescription className="text-sm">
                        {isLoadingCurrentMonth
                          ? "Loading schools..."
                          : `Showing ${currentMonthStartIndex + 1}-${Math.min(currentMonthEndIndex, totalCurrentMonthSchools)} of ${totalCurrentMonthSchools} schools in your region`}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-green-600 dark:text-green-400 border-green-600 dark:border-green-500 bg-green-50 dark:bg-green-900/30 text-xs">
                        {currentMonthSchools.filter((s) => s.status === "submitted").length} Submitted
                      </Badge>
                      <Badge variant="outline" className="text-red-600 dark:text-red-400 border-red-600 dark:border-red-500 bg-red-50 dark:bg-red-900/30 text-xs">
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
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
                      <span className="ml-2 text-blue-600 dark:text-blue-400 text-sm">Loading current month schools...</span>
                    </div>
                  ) : filteredCurrentMonthSchools.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                      {currentMonthError ? "Failed to load schools" : "No schools found in your region"}
                    </div>
                  ) : (
                    <>
                      {/* Reminder Button */}
                      <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3">
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
                            className="h-5 w-5 border-slate-400 dark:border-slate-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                          />
                          <label
                            htmlFor="select-all"
                            className={`text-sm font-medium cursor-pointer ${
                              notSubmittedCount === 0 ? "text-slate-400 dark:text-slate-500" : "text-slate-700 dark:text-slate-200"
                            }`}
                          >
                            <span className="hidden sm:inline">Select All Non-Submitted ({notSubmittedCount})</span>
                            <span className="sm:hidden">Select All ({notSubmittedCount})</span>
                          </label>
                        </div>
                        <Button
                          onClick={handleSendReminders}
                          disabled={selectedSchools.length === 0 || isSendingReminders}
                          className="bg-slate-800 hover:bg-slate-700 dark:bg-slate-600 dark:hover:bg-slate-500 text-white w-full sm:w-auto"
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

                      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                              <TableHead className="w-[50px] text-slate-600 dark:text-slate-300 font-semibold">Select</TableHead>
                              <TableHead className="text-slate-600 dark:text-slate-300 font-semibold">School Name</TableHead>
                              <TableHead className="hidden sm:table-cell text-slate-600 dark:text-slate-300 font-semibold">Head Teacher</TableHead>
                              <TableHead className="hidden lg:table-cell text-slate-600 dark:text-slate-300 font-semibold">Due Date</TableHead>
                              <TableHead className="text-slate-600 dark:text-slate-300 font-semibold">Status</TableHead>
                              <TableHead className="hidden md:table-cell text-slate-600 dark:text-slate-300 font-semibold">Submitted Date</TableHead>
                              <TableHead className="text-right w-[130px] text-slate-600 dark:text-slate-300 font-semibold">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedCurrentMonthSchools.map((school) => (
                              <TableRow 
                                key={school.id}
                                className="border-b border-slate-200/50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                              >
                                <TableCell>
                                  <Checkbox
                                    checked={selectedSchools.includes(school.id)}
                                    onCheckedChange={(checked) => handleSelectSchool(school.id, !!checked)}
                                    disabled={school.status === "submitted"}
                                    className="border-slate-400 dark:border-slate-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                  />
                                </TableCell>
                                <TableCell className="font-medium">
                                  <div>
                                    <div className="text-sm text-slate-900 dark:text-slate-100">{school.schoolName}</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 sm:hidden">
                                      {school.headTeacher || "No Head Teacher"}
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 lg:hidden">
                                      Due: {new Date(school.dueDate).toLocaleDateString()}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="hidden sm:table-cell text-sm text-slate-700 dark:text-slate-300">{school.headTeacher || "-"}</TableCell>
                                <TableCell className="hidden lg:table-cell text-sm text-slate-700 dark:text-slate-300">{new Date(school.dueDate).toLocaleDateString()}</TableCell>
                                <TableCell>{getStatusBadge(school.status)}</TableCell>
                                <TableCell className="hidden md:table-cell text-sm text-slate-700 dark:text-slate-300">
                                  {school.submittedDate ? new Date(school.submittedDate).toLocaleDateString() : "-"}
                                </TableCell>
                                <TableCell className="text-right">
                                  {school.status === "submitted" ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-blue-600 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-950"
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
                                      className="border-orange-300 dark:border-orange-600 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30 bg-transparent"
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
                              className="border-primary-200 text-slate-900 dark:text-white hover:bg-primary-50"
                            >
                              <ChevronLeft className="h-4 w-4 mr-1" />
                              Previous
                            </Button>
                            
                            <div className="flex items-center space-x-1">
                              {Array.from({ length: Math.min(5, totalCurrentMonthPages) }, (_, i) => {
                                let pageNum: number
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
                                        : "border-primary-200 text-slate-900 dark:text-white hover:bg-primary-50"
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
                              className="border-primary-200 text-slate-900 dark:text-white hover:bg-primary-50"
                            >
                              Next
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-sm text-slate-500 dark:text-slate-400">
                              Page {currentMonthPage} of {totalCurrentMonthPages}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-slate-500 dark:text-slate-400">Show:</span>
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
              <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg rounded-2xl">
                <CardHeader className="pb-3 sm:pb-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg sm:text-xl text-slate-900 dark:text-white flex items-center gap-2">
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
                      <Badge variant="secondary" className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs">
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
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
                      <span className="ml-2 text-blue-600 dark:text-blue-400 text-sm">Loading historical reports...</span>
                    </div>
                  ) : filteredHistoricalReports.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">
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
                                    <div className="text-xs text-slate-500 dark:text-slate-400 sm:hidden">
                                      {report.headTeacherName}
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 md:hidden">
                                      Submitted: {report.submittedDate}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="hidden sm:table-cell text-sm">{report.headTeacherName}</TableCell>
                                <TableCell>
                                  <span className="font-medium text-slate-900 dark:text-white text-sm">{report.monthYear}</span>
                                </TableCell>
                                <TableCell className="hidden md:table-cell text-sm">{report.submittedDate}</TableCell>
                                <TableCell className="text-right">
                                  <Button asChild variant="outline" size="sm" className="text-blue-600 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-950">
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
                            className="border-primary-200 text-slate-900 dark:text-white hover:bg-primary-50"
                          >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Previous
                          </Button>
                          
                          <div className="flex items-center space-x-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              let pageNum: number
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
                                      : "border-primary-200 text-slate-900 dark:text-white hover:bg-primary-50"
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
                            className="border-primary-200 text-slate-900 dark:text-white hover:bg-primary-50"
                          >
                            Next
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-sm text-slate-500 dark:text-slate-400">
                            Page {currentPage} of {totalPages}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-500 dark:text-slate-400">Show:</span>
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
            <p className="text-slate-500 dark:text-slate-400">Monitor physical education program reports and activities in your region</p>
          </div>
          
          <RegionalPEReportsContent />
        </TabsContent>

        <TabsContent value="nursery-assessment" className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
                <BookOpen className="h-5 w-5 sm:h-6 sm:w-6" />
                Nursery Assessments - {user?.region_name || 'Your Region'}
                {nurseryAssessmentsLoaded && !isLoadingNurseryAssessments && (
                  <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700">
                    Loaded
                  </Badge>
                )}
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base mt-1">
                Monitor and review nursery assessments from schools in your region
              </p>
            </div>
          </div>

          {/* Filters */}
          <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg rounded-2xl">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 flex-shrink-0">
                  <Filter className="h-4 w-4" />
                  <span className="font-medium">Filters:</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 flex-1">
                  <Input
                    placeholder="Search by school name, head teacher..."
                    className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    value={nurseryAssessmentSearch}
                    onChange={(e) => setNurseryAssessmentSearch(e.target.value)}
                  />
                  <Select value={nurseryAssessmentTypeFilter} onValueChange={setNurseryAssessmentTypeFilter}>
                    <SelectTrigger className="sm:w-56 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
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
                    <SelectTrigger className="sm:w-40 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
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
                    className="flex items-center gap-2 flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white"
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
                      className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
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
            <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg rounded-2xl">
              <CardContent className="py-12">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 mx-auto text-blue-500 dark:text-blue-400 mb-4 animate-spin" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Loading Nursery Assessments</h3>
                  <p className="text-slate-600 dark:text-slate-400">Fetching nursery assessments for {user?.region_name}...</p>
                </div>
              </CardContent>
            </Card>
          ) : filteredNurseryAssessments.length === 0 ? (
            <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg rounded-2xl">
              <CardContent className="py-12">
                <div className="text-center">
                  <BookOpen className="h-12 w-12 mx-auto text-slate-400 dark:text-slate-500 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No Nursery Assessments</h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    {nurseryAssessments.length === 0 
                      ? `No nursery assessments have been submitted in ${user?.region_name} yet.`
                      : "No assessments match your current filter criteria."
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg rounded-2xl">
              <CardContent className="p-4 sm:p-6">
                {/* Results Summary */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Showing {nurseryAssessmentStartIndex + 1}-{Math.min(nurseryAssessmentEndIndex, totalNurseryAssessments)} of {totalNurseryAssessments} assessments
                  </p>
                  <Badge className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 w-fit">
                    {totalNurseryAssessments} Total
                  </Badge>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <TableHead className="min-w-[200px] font-semibold text-slate-600 dark:text-slate-300">School</TableHead>
                        <TableHead className="min-w-[150px] font-semibold text-slate-600 dark:text-slate-300">Head Teacher</TableHead>
                        <TableHead className="min-w-[180px] font-semibold text-slate-600 dark:text-slate-300">Assessment Type</TableHead>
                        <TableHead className="min-w-[100px] font-semibold text-slate-600 dark:text-slate-300">Enrollment</TableHead>
                        <TableHead className="min-w-[140px] font-semibold text-slate-600 dark:text-slate-300">Date Submitted</TableHead>
                        <TableHead className="min-w-[100px] font-semibold text-slate-600 dark:text-slate-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedNurseryAssessments.map((assessment) => (
                        <TableRow 
                          key={assessment.id} 
                          className="border-b border-slate-200/50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <School className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                              <div>
                                <p className="font-medium text-slate-900 dark:text-white">
                                  {assessment.schools?.name || 'Unknown School'}
                                </p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Nursery Level</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                              <div>
                                <p className="font-medium text-slate-900 dark:text-white">
                                  {assessment.headteacher?.name || 'Unknown'}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {assessment.headteacher?.email || ''}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={`text-xs font-medium border whitespace-nowrap ${getNurseryAssessmentTypeColor(assessment.assessment_type)}`}
                            >
                              {formatNurseryAssessmentType(assessment.assessment_type)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              {assessment.enrollment} students
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                              <Calendar className="h-3 w-3 text-slate-400 dark:text-slate-500" />
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
                              className="h-8 px-3 text-xs font-medium text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30"
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

                {/* Pagination Controls */}
                {totalNurseryAssessmentPages > 1 && (
                  <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setNurseryAssessmentPage(p => Math.max(1, p - 1))}
                        disabled={nurseryAssessmentPage === 1}
                        className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: Math.min(5, totalNurseryAssessmentPages) }, (_, i) => {
                          let pageNum: number
                          if (totalNurseryAssessmentPages <= 5) {
                            pageNum = i + 1
                          } else if (nurseryAssessmentPage <= 3) {
                            pageNum = i + 1
                          } else if (nurseryAssessmentPage >= totalNurseryAssessmentPages - 2) {
                            pageNum = totalNurseryAssessmentPages - 4 + i
                          } else {
                            pageNum = nurseryAssessmentPage - 2 + i
                          }
                          
                          return (
                            <Button
                              key={pageNum}
                              variant={nurseryAssessmentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => setNurseryAssessmentPage(pageNum)}
                              className={`w-10 ${
                                nurseryAssessmentPage === pageNum 
                                  ? "bg-blue-600 text-white hover:bg-blue-700" 
                                  : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
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
                        onClick={() => setNurseryAssessmentPage(p => Math.min(totalNurseryAssessmentPages, p + 1))}
                        disabled={nurseryAssessmentPage === totalNurseryAssessmentPages}
                        className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        Page {nurseryAssessmentPage} of {totalNurseryAssessmentPages}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-500 dark:text-slate-400">Show:</span>
                        <Select 
                          value={nurseryAssessmentPageSize.toString()} 
                          onValueChange={(value) => {
                            setNurseryAssessmentPageSize(parseInt(value))
                            setNurseryAssessmentPage(1)
                          }}
                        >
                          <SelectTrigger className="w-16 h-8 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5</SelectItem>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="ai-insights" className="space-y-4 lg:space-y-6">          
          <RegionalAIInsightsContent />
        </TabsContent>

        </Tabs>
        </div>
      </main>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <Button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 h-12 w-12 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg transition-all duration-300 hover:shadow-xl"
          size="sm"
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      )}
    </div>
  )
}
