"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { AuthWrapper, useAuth } from "@/components/auth-wrapper"
import { Pagination } from "@/components/pagination"
import {
  FileTextIcon,
  TrendingUpIcon,
  Loader2,
  BarChart3,
  MapPin,
  School,
  Download,
  AlertTriangle,
  ClipboardCheck,
  Building2,
  Search,
} from "lucide-react"
import { getUser } from "@/app/actions/auth"
import { 
  ReportView, 
  ReportsList,
  SchoolRankingsTable,
  TrendChart,
  CategoryBarChart,
  RatingDistributionChart,
  SubmissionStatusChart,
  CategoryRadarChart,
  StatCard,
  SubmissionProgressBreakdown,
  CategoryGapAnalysisChart,
  MostImprovedSchoolsTable,
  RegionVsNationalCard,
  CategoryLeadersTable,
  AIInsightCard,
  AIAtRiskAlert,
  AIComparativeAnalysis,
} from "@/features/school-assessment-reports/components"
import { 
  getActiveTermWindow,
  getAcademicYearPeriods,
  getAllPeriods,
} from "@/features/school-assessment-reports/actions/assessment-periods"
import {
  getRegionalReports,
  getReport,
} from "@/features/school-assessment-reports/actions/reports"
import { 
  getRegionalStatistics, 
  getRegionalSchoolRankings,
  getRegionalTrends,
  getCategoryPerformance,
  getSubmissionProgressBreakdown,
  getMostImprovedSchools,
  getCategoryGapAnalysis,
  getRegionVsNationalComparison,
  getCategoryLeaders,
  getSchoolsNeedingAttention,
} from "@/features/school-assessment-reports/actions/analytics"
import { calculateAllCategoryScores } from "@/features/school-assessment-reports/actions/scoring"
import { generateBulkExportCSV } from "@/features/school-assessment-reports/actions/exports"
import type { CurrentTermWindow, RatingLevel } from "@/features/school-assessment-reports/types"

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return (await res.json()) as T
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { method: "GET" })
  return (await res.json()) as T
}

interface SchoolLevelOption {
  id: string
  name: string
}

interface NonSubmittedSchool {
  id: string
  name: string
  code: string | null
  grade: string | null
  regionId: string
  regionName: string
  schoolLevelId: string | null
  schoolLevelName: string
}

async function fetchSchoolLevels() {
  return getJson<{ levels: SchoolLevelOption[]; error: string | null }>(
    "/api/school-assessment/education-official/school-levels"
  )
}

async function fetchNonSubmittedSchools(periodId: string | null, schoolLevelId: string | null) {
  return postJson<{
    schools: NonSubmittedSchool[]
    regions: { id: string; name: string }[]
    grades: string[]
    total: number
    error: string | null
  }>("/api/school-assessment/education-official/non-submitted-schools", { periodId, schoolLevelId })
}

async function fetchRecommendations(reportId: string) {
  return postJson<{ recommendations: any[]; error: string | null }>(
    "/api/school-assessment/recommendations",
    { reportId, generate: false }
  )
}

async function fetchOrGenerateRecommendations(reportId: string) {
  return postJson<{ recommendations: any[]; error: string | null }>(
    "/api/school-assessment/recommendations",
    { reportId, generate: true }
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function RegionalOfficerAssessmentPage() {
  return (
    <AuthWrapper>
      <RegionalOfficerAssessmentContent />
    </AuthWrapper>
  )
}

function RegionalOfficerAssessmentContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleBackToDashboard = () => {
    router.push('/dashboard/regional-officer')
  }
  const { toast } = useToast()
  const { user } = useAuth()
  const canUseSchoolLevelFilter = user?.role === "Education Official" || user?.role === "Regional Officer"
  
  const currentTab = searchParams.get('tab') || 'overview'
  
  // State
  const [loading, setLoading] = useState(true)
  const [regionId, setRegionId] = useState<string | null>(null)
  const [regionName, setRegionName] = useState<string>('')
  const [activeWindow, setActiveWindow] = useState<CurrentTermWindow | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [reports, setReports] = useState<any[]>([])
  const [rankings, setRankings] = useState<any[]>([])
  const [trends, setTrends] = useState<any[]>([])
  
  // New metrics state
  const [submissionProgress, setSubmissionProgress] = useState<any>(null)
  const [categoryGaps, setCategoryGaps] = useState<any>(null)
  const [mostImproved, setMostImproved] = useState<any>(null)
  const [regionVsNational, setRegionVsNational] = useState<any>(null)
  const [categoryLeaders, setCategoryLeaders] = useState<any>(null)
  const [schoolsNeedingAttention, setSchoolsNeedingAttention] = useState<any[]>([])
  const [categoryPerformance, setCategoryPerformance] = useState<any[]>([])
  const [selectedReport, setSelectedReport] = useState<any>(null)
  const [recommendationsByReportId, setRecommendationsByReportId] = useState<Record<string, any[]>>({})
  const [isGeneratingRecommendations, setIsGeneratingRecommendations] = useState(false)
  const recGenerationInFlight = useRef<Set<string>>(new Set())
  const recLoadSeq = useRef(0)
  const [isExporting, setIsExporting] = useState(false)
  const [allPeriods, setAllPeriods] = useState<any[]>([])
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('all')
  const [schoolLevels, setSchoolLevels] = useState<SchoolLevelOption[]>([])
  const [selectedSchoolLevelId, setSelectedSchoolLevelId] = useState<string>('all')
  const [nonSubmittedSchools, setNonSubmittedSchools] = useState<NonSubmittedSchool[]>([])
  const [nonSubmittedGrades, setNonSubmittedGrades] = useState<string[]>([])
  const [nonSubmittedLoading, setNonSubmittedLoading] = useState(false)
  const [nonSubmittedSearchQuery, setNonSubmittedSearchQuery] = useState("")
  const [nonSubmittedGradeFilter, setNonSubmittedGradeFilter] = useState<string>("all")
  const [nonSubmittedPage, setNonSubmittedPage] = useState(1)
  const nonSubmittedPageSize = 15

  const recommendations = selectedReport?.id
    ? (recommendationsByReportId[selectedReport.id] ?? [])
    : []

  // ============================================================================
  // DATA LOADING
  // ============================================================================
  
  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    setLoading(true)
    try {
      // Get user's region - note: session stores 'region' not 'region_id'
      const userData = await getUser()
      if (userData?.region) {
        setRegionId(userData.region)
        setRegionName(userData.region_name || '')

        // Get all periods for selector
        const [allPeriodsResult, schoolLevelsResult] = await Promise.all([
          getAllPeriods(),
          fetchSchoolLevels(),
        ])
        if (allPeriodsResult.periods) {
          setAllPeriods(allPeriodsResult.periods)
        }
        if (schoolLevelsResult.levels) {
          setSchoolLevels(schoolLevelsResult.levels)
        }

        const windowResult = await getActiveTermWindow()
        let periodId: string | undefined = undefined

        if (windowResult.window) {
          setActiveWindow(windowResult.window)

          // Try to match active window to a period in our list
          // Match by academicYear and termName
          const activePeriod = allPeriodsResult.periods.find(
            (p) => p.academicYear === windowResult.window!.academicYear && p.termName === windowResult.window!.termName
          )
          
          if (activePeriod) {
            periodId = activePeriod.id
            setSelectedPeriodId(activePeriod.id)
          }
        } else if (allPeriodsResult.periods.length > 0) {
           // Default to most recent period if no active window
           periodId = allPeriodsResult.periods[0].id
           setSelectedPeriodId(allPeriodsResult.periods[0].id)
        }

        // Load regional data with the resolved period ID
        await loadRegionalData(userData.region, periodId, selectedSchoolLevelId === 'all' ? undefined : selectedSchoolLevelId)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const loadRegionalData = async (regionId: string, periodId?: string, schoolLevelId?: string) => {
    try {
      // Get regional statistics
      const statsResult = await getRegionalStatistics(regionId, periodId, schoolLevelId)
      if (statsResult.stats) {
        setStats(statsResult.stats)
      }
      
      // Get reports
      const reportsResult = await getRegionalReports(regionId, periodId, schoolLevelId)
      if (reportsResult.reports) {
        setReports(reportsResult.reports.map((r: any) => ({
          id: r.id,
          schoolId: r.schoolId,
          schoolName: r.schoolName || 'Unknown School',
          regionName: statsResult.stats?.regionName || '',
          status: r.status,
          totalScore: r.totalScore,
          ratingLevel: r.ratingLevel,
          submittedAt: r.submittedAt,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        })))
      }
      
      // Get rankings
      const rankingsResult = await getRegionalSchoolRankings(regionId, periodId, 500, schoolLevelId)
      if (rankingsResult.rankings) {
        setRankings(rankingsResult.rankings)
      }
      
      // Get trends
      const trendsResult = await getRegionalTrends(regionId, 9, schoolLevelId)
      if (trendsResult.trends) {
        setTrends(trendsResult.trends)
      }
      
      // Get category performance
      const perfResult = await getCategoryPerformance(periodId, regionId, schoolLevelId)
      if (perfResult.performance) {
        setCategoryPerformance(perfResult.performance)
      }
      
      // NEW: Get submission progress breakdown
      const progressResult = await getSubmissionProgressBreakdown(regionId, periodId, schoolLevelId)
      if (!progressResult.error) {
        setSubmissionProgress(progressResult)
      }
      
      // NEW: Get category gap analysis
      const gapsResult = await getCategoryGapAnalysis(regionId, periodId, schoolLevelId)
      if (!gapsResult.error) {
        setCategoryGaps(gapsResult)
      }
      
      // NEW: Get most improved schools
      const improvedResult = await getMostImprovedSchools(regionId, 5, schoolLevelId)
      if (!improvedResult.error) {
        setMostImproved(improvedResult)
      }
      
      // NEW: Get region vs national comparison
      const comparisonResult = await getRegionVsNationalComparison(regionId, periodId, schoolLevelId)
      if (!comparisonResult.error) {
        setRegionVsNational(comparisonResult)
      }
      
      // NEW: Get category leaders
      const leadersResult = await getCategoryLeaders(regionId, periodId, schoolLevelId)
      if (!leadersResult.error) {
        setCategoryLeaders(leadersResult.leaders)
      }
      
      // NEW: Get schools needing attention
      const attentionResult = await getSchoolsNeedingAttention(regionId, 400, periodId, schoolLevelId)
      if (!attentionResult.error) {
        setSchoolsNeedingAttention(attentionResult.schools)
      }

      setNonSubmittedLoading(true)
      const nonSubmittedResult = await fetchNonSubmittedSchools(
        periodId || null,
        schoolLevelId || null
      )
      if (!nonSubmittedResult.error) {
        setNonSubmittedSchools(nonSubmittedResult.schools || [])
        setNonSubmittedGrades(nonSubmittedResult.grades || [])
      }
    } catch (error) {
      console.error('Error loading regional data:', error)
    } finally {
      setNonSubmittedLoading(false)
    }
  }

  const handleViewReport = async (reportId: string) => {
    try {
      const reportResult = await getReport(reportId)
      if (reportResult.report) {
        setSelectedReport(reportResult.report)
        setIsGeneratingRecommendations(false)
        setCurrentTab('view')

          if (reportResult.report.status !== 'draft' && reportResult.report.status !== 'expired_draft') {
          void loadRecommendations(reportId, true)
        }
      }
    } catch (error) {
      console.error('Error loading report:', error)
      toast({
        title: 'Error',
        description: 'Failed to load report details.',
        variant: 'destructive',
      })
    }
  }

  const loadRecommendations = async (reportId: string, allowAutoBackfill: boolean) => {
    const requestId = ++recLoadSeq.current
    try {
      setIsGeneratingRecommendations(false)

      const existing = await fetchRecommendations(reportId)
      if (existing.error) return
      if (existing.recommendations && existing.recommendations.length > 0) {
        if (requestId !== recLoadSeq.current) return
        setRecommendationsByReportId(prev => ({ ...prev, [reportId]: existing.recommendations }))
        return
      }

      if (!allowAutoBackfill) return

      if (recGenerationInFlight.current.has(reportId)) return
      recGenerationInFlight.current.add(reportId)
      setIsGeneratingRecommendations(true)

      const generated = await fetchOrGenerateRecommendations(reportId)
      if (requestId !== recLoadSeq.current) return
      setRecommendationsByReportId(prev => ({ ...prev, [reportId]: generated.recommendations || [] }))
    } catch (err) {
      console.error('Error loading recommendations:', err)
    } finally {
      if (recLoadSeq.current === requestId) {
        setIsGeneratingRecommendations(false)
      }
      recGenerationInFlight.current.delete(reportId)
    }
  }

  const setCurrentTab = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.push(`/dashboard/school-assessment/regional?${params.toString()}`)
  }

  const handleExportCSV = async () => {
    if (!regionId || !activeWindow) return
    
    setIsExporting(true)
    try {
      const { periods, error: periodsError } = await getAcademicYearPeriods(activeWindow.academicYear)
      if (periodsError) {
        toast({ title: 'Error', description: periodsError, variant: 'destructive' })
        return
      }

      const period = periods.find((p: any) => p.termName === activeWindow.termName)
      if (!period) {
        toast({ title: 'Error', description: 'Could not find assessment period for the active term.', variant: 'destructive' })
        return
      }

      // Generate filename with current term info
      const termName = activeWindow.termNumber === 1 ? 'First_Term' : activeWindow.termNumber === 2 ? 'Second_Term' : 'Third_Term'
      const result = await generateBulkExportCSV(period.id, regionId)
      if (result.csv) {
        // Download CSV
        const blob = new Blob([result.csv], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `regional_assessment_${regionName}_${activeWindow.academicYear}_${termName}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
        
        toast({ title: 'Success', description: 'Export downloaded successfully.' })
      } else {
        toast({ title: 'Error', description: result.error || 'Failed to export.', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Error exporting:', error)
      toast({ title: 'Error', description: 'Failed to export data.', variant: 'destructive' })
    } finally {
      setIsExporting(false)
    }
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  const filteredNonSubmittedSchools = nonSubmittedSchools.filter((school) => {
    const matchesSearch = nonSubmittedSearchQuery.trim() === "" ||
      school.name.toLowerCase().includes(nonSubmittedSearchQuery.toLowerCase())

    const matchesGrade = nonSubmittedGradeFilter === "all" ||
      (school.grade || "") === nonSubmittedGradeFilter

    return matchesSearch && matchesGrade
  })

  useEffect(() => {
    setNonSubmittedPage(1)
  }, [nonSubmittedSearchQuery, nonSubmittedGradeFilter, selectedPeriodId, selectedSchoolLevelId])

  const nonSubmittedTotalPages = Math.max(1, Math.ceil(filteredNonSubmittedSchools.length / nonSubmittedPageSize))
  const paginatedNonSubmittedSchools = filteredNonSubmittedSchools.slice(
    (nonSubmittedPage - 1) * nonSubmittedPageSize,
    nonSubmittedPage * nonSubmittedPageSize
  )
  
  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
        <span className="ml-2 text-blue-600 dark:text-blue-400 text-sm">Loading assessment data...</span>
      </div>
    )
  }

  if (!regionId) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>No Region Assigned</AlertTitle>
        <AlertDescription>
          Your account is not linked to a region. Please contact an administrator.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Regional Assessment Dashboard
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{regionName || 'Your Region'} • {stats?.totalSchools || 0} schools</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {activeWindow && (
            <span className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-medium border border-blue-200/80 dark:border-blue-500/20">
              {activeWindow.academicYear} - {activeWindow.termNumber === 1 ? 'First' : activeWindow.termNumber === 2 ? 'Second' : 'Third'} Term
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={isExporting || !activeWindow}
            className="h-9 px-4 bg-white dark:bg-[hsl(222,47%,9%)] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export CSV
          </Button>
          
          <Select 
            value={selectedPeriodId} 
            onValueChange={(value) => {
              setSelectedPeriodId(value)
              loadRegionalData(regionId!, value === 'all' ? undefined : value, selectedSchoolLevelId === 'all' ? undefined : selectedSchoolLevelId)
            }}
          >
            <SelectTrigger className="w-[180px] h-9 bg-white dark:bg-[hsl(222,47%,9%)] border-slate-200 dark:border-slate-700">
              <SelectValue placeholder="Select Period" />
            </SelectTrigger>
            <SelectContent>
              {allPeriods.map((period) => (
                <SelectItem key={period.id} value={period.id}>
                  {period.academicYear} - {period.termName}
                </SelectItem>
              ))}
              {allPeriods.length === 0 && <SelectItem value="all" disabled>No periods available</SelectItem>}
            </SelectContent>
          </Select>

          {canUseSchoolLevelFilter && (
            <Select
              value={selectedSchoolLevelId}
              onValueChange={(value) => {
                setSelectedSchoolLevelId(value)
                loadRegionalData(regionId!, selectedPeriodId === 'all' ? undefined : selectedPeriodId, value === 'all' ? undefined : value)
              }}
            >
              <SelectTrigger className="w-[180px] h-9 bg-white dark:bg-[hsl(222,47%,9%)] border-slate-200 dark:border-slate-700">
                <SelectValue placeholder="Select Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {schoolLevels.map((level) => (
                  <SelectItem key={level.id} value={level.id}>
                    {level.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-[hsl(222,47%,9%)] p-1 text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700/50">
          <TabsTrigger value="overview" className="gap-2 rounded-lg px-3 py-1.5 text-sm font-medium data-[state=active]:bg-white data-[state=active]:dark:bg-[hsl(222,47%,11%)] data-[state=active]:text-slate-900 data-[state=active]:dark:text-white data-[state=active]:shadow-sm">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="schools" className="gap-2 rounded-lg px-3 py-1.5 text-sm font-medium data-[state=active]:bg-white data-[state=active]:dark:bg-[hsl(222,47%,11%)] data-[state=active]:text-slate-900 data-[state=active]:dark:text-white data-[state=active]:shadow-sm">
            <School className="h-4 w-4" />
            <span className="hidden sm:inline">Schools</span>
          </TabsTrigger>
          <TabsTrigger value="not-submitted" className="gap-2 rounded-lg px-3 py-1.5 text-sm font-medium data-[state=active]:bg-white data-[state=active]:dark:bg-[hsl(222,47%,11%)] data-[state=active]:text-slate-900 data-[state=active]:dark:text-white data-[state=active]:shadow-sm">
            <ClipboardCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Not Submitted</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2 rounded-lg px-3 py-1.5 text-sm font-medium data-[state=active]:bg-white data-[state=active]:dark:bg-[hsl(222,47%,11%)] data-[state=active]:text-slate-900 data-[state=active]:dark:text-white data-[state=active]:shadow-sm">
            <FileTextIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Reports</span>
          </TabsTrigger>
          <TabsTrigger value="view" className="gap-2 rounded-lg px-3 py-1.5 text-sm font-medium data-[state=active]:bg-white data-[state=active]:dark:bg-[hsl(222,47%,11%)] data-[state=active]:text-slate-900 data-[state=active]:dark:text-white data-[state=active]:shadow-sm disabled:opacity-50" disabled={!selectedReport}>
            <TrendingUpIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Details</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Row - Pill Style */}
          <div className="flex gap-2.5 flex-wrap">
            {/* Total Schools */}
            <div className="px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200/80 dark:border-blue-500/20">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-xl font-bold text-blue-700 dark:text-blue-400">{stats?.totalSchools || 0}</p>
                  <p className="text-[11px] text-blue-600/70 dark:text-blue-400/70 font-medium">Total Schools</p>
                </div>
              </div>
            </div>

            {/* Submitted */}
            <div className="px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/20">
              <div className="flex items-center gap-2.5">
                <FileTextIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{stats?.submittedCount || 0}</p>
                  <p className="text-[11px] text-emerald-600/70 dark:text-emerald-400/70 font-medium">Submitted ({stats?.pendingCount || 0} pending)</p>
                </div>
              </div>
            </div>

            {/* Average Score */}
            <div className="px-4 py-2.5 rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200/80 dark:border-violet-500/20">
              <div className="flex items-center gap-2.5">
                <TrendingUpIcon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                <div>
                  <p className="text-xl font-bold text-violet-700 dark:text-violet-400">{stats?.averageScore || 0}</p>
                  <p className="text-[11px] text-violet-600/70 dark:text-violet-400/70 font-medium">Regional Average</p>
                </div>
              </div>
            </div>

            {/* Submission Rate */}
            <div className="px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/20">
              <div className="flex items-center gap-2.5">
                <BarChart3 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="text-xl font-bold text-amber-700 dark:text-amber-400">
                    {stats?.totalSchools ? `${Math.round((stats.submittedCount / stats.totalSchools) * 100)}%` : '0%'}
                  </p>
                  <p className="text-[11px] text-amber-600/70 dark:text-amber-400/70 font-medium">Submission Rate</p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            {stats?.ratingDistribution && (
              <RatingDistributionChart 
                distribution={stats.ratingDistribution}
                title="Rating Distribution"
                description="Schools by performance level"
              />
            )}
            {stats?.categoryAverages && (
              <CategoryRadarChart
                scores={stats.categoryAverages}
                title="Regional Performance Profile"
                description="Average scores by category"
              />
            )}
          </div>

          {/* Region vs National Comparison */}
          {regionVsNational && !regionVsNational.error && (
            <div className="grid gap-6 lg:grid-cols-2">
              <RegionVsNationalCard
                regionAverage={regionVsNational.regionAverage}
                nationalAverage={regionVsNational.nationalAverage}
                difference={regionVsNational.difference}
                differencePercent={regionVsNational.differencePercent}
                regionRank={regionVsNational.regionRank}
                totalRegions={regionVsNational.totalRegions}
                isAboveNational={regionVsNational.isAboveNational}
                regionName={regionName}
              />
              {submissionProgress && !submissionProgress.error && (
                <SubmissionProgressBreakdown
                  submitted={submissionProgress.submitted}
                  inProgress={submissionProgress.inProgress}
                  notStarted={submissionProgress.notStarted}
                  total={submissionProgress.total}
                  submittedPercentage={submissionProgress.submittedPercentage}
                  inProgressPercentage={submissionProgress.inProgressPercentage}
                  notStartedPercentage={submissionProgress.notStartedPercentage}
                  title="Submission Progress"
                />
              )}
            </div>
          )}

          {/* Category Gap Analysis */}
          {categoryGaps && !categoryGaps.error && categoryGaps.gaps && categoryGaps.gaps.length > 0 && (
            <CategoryGapAnalysisChart
              gaps={categoryGaps.gaps}
              weakestCategory={categoryGaps.weakestCategory}
              strongestCategory={categoryGaps.strongestCategory}
              title="Category Improvement Opportunities"
            />
          )}

          {/* Most Improved Schools */}
          {mostImproved && (mostImproved.improved?.length > 0 || mostImproved.declined?.length > 0) && (
            <MostImprovedSchoolsTable
              improved={mostImproved.improved || []}
              declined={mostImproved.declined || []}
              title="School Improvement Trends"
            />
          )}

          {/* Schools Needing Attention Alert */}
          {schoolsNeedingAttention && schoolsNeedingAttention.length > 0 && (
            <Alert variant="destructive" className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertTitle className="text-orange-800 dark:text-orange-200">
                Schools Needing Attention ({schoolsNeedingAttention.length})
              </AlertTitle>
              <AlertDescription className="text-orange-700 dark:text-orange-300">
                <p className="mb-2">The following schools scored below 400 points and may need additional support:</p>
                <ul className="list-disc list-inside space-y-1">
                  {schoolsNeedingAttention.slice(0, 5).map((school: any) => (
                    <li key={school.schoolId}>
                      <span className="font-medium">{school.schoolName}</span> - {school.totalScore} points ({school.ratingLevel})
                    </li>
                  ))}
                </ul>
                {schoolsNeedingAttention.length > 5 && (
                  <p className="mt-2 text-sm italic">
                    ...and {schoolsNeedingAttention.length - 5} more schools
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Trends */}
          {trends.length > 0 && (
            <TrendChart 
              data={trends} 
              title="Regional Trends"
              description="Average scores over time"
            />
          )}

          {/* AI Insights Section */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* AI Regional Analysis */}
            <AIInsightCard
              type="regional_comparison"
              title="AI Regional Analysis"
              description="Get AI-powered insights about your region's performance"
              filters={{
                regionId: regionId || undefined,
                periodId: selectedPeriodId !== 'all' ? selectedPeriodId : undefined,
                schoolLevelId: selectedSchoolLevelId === 'all' ? undefined : selectedSchoolLevelId,
              }}
              autoGenerate={false}
            />
            
            {/* AI At-Risk Schools Alert */}
            <AIAtRiskAlert
              regionId={regionId || undefined}
              regionName={regionName || 'Your Region'}
              threshold={400}
              schoolLevelId={selectedSchoolLevelId === 'all' ? undefined : selectedSchoolLevelId}
              autoGenerate={false}
            />
          </div>

          {/* AI Comparative Analysis - Full Width */}
          {regionId && (
            <AIComparativeAnalysis
              type="categories"
              entityIds={['academic', 'attendance', 'infrastructure', 'teaching_quality', 'management', 'student_welfare', 'community']}
              filters={{
                regionId: regionId || undefined,
                periodId: selectedPeriodId !== 'all' ? selectedPeriodId : undefined,
                schoolLevelId: selectedSchoolLevelId === 'all' ? undefined : selectedSchoolLevelId,
              }}
              title="AI Category Comparison"
              description="AI-powered analysis comparing performance across assessment categories"
            />
          )}
        </TabsContent>

        {/* Schools Tab */}
        <TabsContent value="schools" className="space-y-6">
          <SchoolRankingsTable
            rankings={rankings}
            title="School Rankings"
            description="Schools ranked by assessment score"
            onViewSchool={(schoolId) => {
              // Find report for this school
              const report = reports.find(r => r.schoolId === schoolId)
              if (report) {
                handleViewReport(report.id)
              }
            }}
          />
          
          {/* Category Leaders */}
          {categoryLeaders && categoryLeaders.length > 0 && (
            <CategoryLeadersTable
              leaders={categoryLeaders}
              title="Category Leaders"
              regionId={regionId}
              onViewSchool={(schoolId) => {
                const report = reports.find(r => r.schoolId === schoolId)
                if (report) {
                  handleViewReport(report.id)
                }
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="not-submitted" className="space-y-6">
          <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border-slate-200/80 dark:border-slate-700/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                <ClipboardCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Schools Without Submitted Reports
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                {filteredNonSubmittedSchools.length} schools pending submission for the selected term and level in {regionName || 'your region'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col lg:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                  <Input
                    placeholder="Search by school name..."
                    value={nonSubmittedSearchQuery}
                    onChange={(e) => setNonSubmittedSearchQuery(e.target.value)}
                    className="pl-10 bg-white dark:bg-[hsl(222,47%,11%)] border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>

                <Select value={nonSubmittedGradeFilter} onValueChange={setNonSubmittedGradeFilter}>
                  <SelectTrigger className="w-[180px] bg-white dark:bg-[hsl(222,47%,11%)] border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                    <SelectValue placeholder="All Grades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Grades</SelectItem>
                    {nonSubmittedGrades.map((grade) => (
                      <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-lg border border-slate-200/80 dark:border-slate-700/50 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-[hsl(222,47%,8%)] border-b border-slate-200/80 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-[hsl(222,47%,8%)]">
                      <TableHead className="text-slate-600 dark:text-slate-400 font-semibold">School</TableHead>
                      <TableHead className="text-slate-600 dark:text-slate-400 font-semibold">Grade</TableHead>
                      <TableHead className="text-slate-600 dark:text-slate-400 font-semibold">School Level</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nonSubmittedLoading ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-slate-500 dark:text-slate-400 py-8">
                          Loading non-submitted schools...
                        </TableCell>
                      </TableRow>
                    ) : filteredNonSubmittedSchools.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-slate-500 dark:text-slate-400 py-8">
                          No schools found
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedNonSubmittedSchools.map((school) => (
                        <TableRow key={school.id} className="border-b border-slate-200/50 dark:border-slate-700/30">
                          <TableCell className="font-medium text-slate-900 dark:text-white">{school.name}</TableCell>
                          <TableCell className="text-slate-600 dark:text-slate-400">{school.grade || '-'}</TableCell>
                          <TableCell className="text-slate-600 dark:text-slate-400">{school.schoolLevelName}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {!nonSubmittedLoading && filteredNonSubmittedSchools.length > 0 && (
                <div className="mt-4">
                  <Pagination
                    currentPage={Math.min(nonSubmittedPage, nonSubmittedTotalPages)}
                    totalPages={nonSubmittedTotalPages}
                    totalItems={filteredNonSubmittedSchools.length}
                    pageSize={nonSubmittedPageSize}
                    onPageChange={setNonSubmittedPage}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <ReportsList
            reports={reports}
            onViewReport={handleViewReport}
            showSchoolColumn={true}
            showRegionColumn={false}
            emptyMessage="No assessment reports found for your region."
          />
        </TabsContent>

        {/* View Details Tab */}
        <TabsContent value="view">
          {selectedReport ? (
            <ReportView
              report={{
                id: selectedReport.id,
                schoolId: selectedReport.schoolId || selectedReport.school?.id || '',
                schoolName: selectedReport.school?.name || 'Unknown School',
                regionId: selectedReport.regionId || '',
                regionName: regionName,
                academicYear: selectedReport.period?.academicYear || selectedReport.academicYear || activeWindow?.academicYear || '',
                termName: selectedReport.period?.termName || selectedReport.termName || (activeWindow ? `${activeWindow.termNumber === 1 ? 'First' : activeWindow.termNumber === 2 ? 'Second' : 'Third'} Term` : ''),
                periodId: selectedReport.periodId || selectedReport.period?.id || '',
                totalScore: selectedReport.totalScore || 0,
                ratingLevel: selectedReport.ratingLevel || 'needs_improvement',
                submittedAt: selectedReport.submittedAt || '',
                // TAPS fields for secondary schools
                isTAPS: selectedReport.isTAPS || Boolean(selectedReport.tapsRatingGrade),
                tapsRatingGrade: selectedReport.tapsRatingGrade || undefined,
                tapsCategoryScores: selectedReport.tapsCategoryScores || (selectedReport.isTAPS ? {
                  school_inputs: selectedReport.tapsSchoolInputsScores?.total || 0,
                  leadership: selectedReport.tapsLeadershipScores?.total || 0,
                  academics: selectedReport.tapsAcademicsScores?.total || 0,
                  teacher_development: selectedReport.tapsTeacherDevelopmentScores?.total || 0,
                  health_safety: selectedReport.tapsHealthSafetyScores?.total || 0,
                  school_culture: selectedReport.tapsSchoolCultureScores?.total || 0,
                } : undefined),
                // Demo category scores
                categoryScores: calculateAllCategoryScores({
                  academic: selectedReport.academicScores || {},
                  attendance: selectedReport.attendanceScores || {},
                  infrastructure: selectedReport.infrastructureScores || {},
                  teachingQuality: selectedReport.teachingQualityScores || {},
                  management: selectedReport.managementScores || {},
                  studentWelfare: selectedReport.studentWelfareScores || {},
                  community: selectedReport.communityScores || {},
                }),
              }}
              recommendations={recommendations}
              isGeneratingRecommendations={isGeneratingRecommendations && selectedReport?.status !== 'draft' && selectedReport?.status !== 'expired_draft'}
            />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">Select a report to view details</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      </div>
    </div>
  )
}
