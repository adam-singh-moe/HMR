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
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/components/auth-wrapper"
import { usePermissions } from "@/hooks/use-permissions"
import {
  FileTextIcon,
  TrendingUpIcon,
  Loader2,
  BarChart3,
  MapPin,
  School,

  Globe,
  AlertTriangle,
  Search,
  Trophy,
  Target,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Settings,
} from "lucide-react"
import {
  ReportView,
  ReportsList,
  TrendChart,
  CategoryBarChart,
  RatingDistributionChart,
  RegionComparisonChart,
  SubmissionStatusChart,
  CategoryRadarChart,
  StatCard,
  ScoreDistributionHistogram,
  CategoryGapAnalysisChart,
  MostImprovedSchoolsTable,
  UnderperformingRegionsAlert,
  CompletionRateGauge,
  CategoryLeadersTable,
  AIInsightCard,
  AIAtRiskAlert,
  AITrendPrediction,
  AIComparativeAnalysis,
  UnifiedRatingBadge,
  SchoolRankingsTable,
  ModuleAccessSettings,
  PeriodManagement,
} from "@/features/school-assessment-reports/components"
import { calculateAllCategoryScores } from "@/features/school-assessment-reports/actions/scoring"
import type { AssessmentPeriod, RatingLevel } from "@/features/school-assessment-reports/types"
import { ChevronLeft } from "lucide-react"

// ============================================================================
// TYPES
// ============================================================================

interface RegionPerformance {
  regionId: string
  regionName: string
  totalSchools: number
  submittedCount: number
  averageScore: number
  ratingDistribution: Record<RatingLevel, number>
  trend?: 'up' | 'down' | 'stable'
  changePercent?: number
}

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

async function fetchPeriodsAndActive() {
  return getJson<{ periods: AssessmentPeriod[]; activePeriod: AssessmentPeriod | null; error: string | null }>(
    "/api/school-assessment/education-official/periods"
  )
}

async function fetchDashboardData(periodId: string | null) {
  return postJson<{
    statsResult: any
    reportsResult: any
    rankingsResult: any
    trendsResult: any
    submissionResult: any
    distributionResult: any
    gapsResult: any
    improvedResult: any
    underperformingResult: any
    progressResult: any
    leadersResult: any
    categoryPerformanceResult: any
    error: string | null
  }>("/api/school-assessment/education-official/dashboard-data", { periodId })
}

async function fetchReport(reportId: string) {
  return postJson<{ report: any | null; error: string | null }>(
    "/api/school-assessment/education-official/report",
    { reportId }
  )
}



// ============================================================================
// MAIN COMPONENT - National Dashboard for Admin/Education Official
// ============================================================================

export default function NationalAssessmentDashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { user } = useAuth()
  const { hasPermission } = usePermissions()

  // Check if user has settings permission
  const canAccessSettings = hasPermission("school_assessments.settings")

  const currentTab = searchParams.get('tab') || 'overview'
  
  // State
  const [loading, setLoading] = useState(true)
  const [activePeriod, setActivePeriod] = useState<AssessmentPeriod | null>(null)
  const [allPeriods, setAllPeriods] = useState<AssessmentPeriod[]>([])
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [reports, setReports] = useState<any[]>([])
  const [rankings, setRankings] = useState<any[]>([])
  const [trends, setTrends] = useState<any[]>([])
  const [submissionStatus, setSubmissionStatus] = useState<any[]>([])
  const [selectedReport, setSelectedReport] = useState<any>(null)
  const [recommendationsByReportId, setRecommendationsByReportId] = useState<Record<string, any[]>>({})
  const [isGeneratingRecommendations, setIsGeneratingRecommendations] = useState(false)
  const recGenerationInFlight = useRef<Set<string>>(new Set())
  const recLoadSeq = useRef(0)

  const [underperformingSchools, setUnderperformingSchools] = useState<any[]>([])
  const [scoreThreshold, setScoreThreshold] = useState<number>(400)
  const [searchQuery, setSearchQuery] = useState("")
  const [regionFilter, setRegionFilter] = useState<string>("all")
  const [scoreDistribution, setScoreDistribution] = useState<any[] | null>(null)
  const [categoryGaps, setCategoryGaps] = useState<any>(null)
  const [mostImproved, setMostImproved] = useState<any>(null)
  const [underperformingRegions, setUnderperformingRegions] = useState<any[] | null>(null)
  const [submissionProgress, setSubmissionProgress] = useState<any>(null)
  const [categoryLeaders, setCategoryLeaders] = useState<any[] | null>(null)

  const recommendations = selectedReport?.id
    ? (recommendationsByReportId[selectedReport.id] ?? [])
    : []

  // ============================================================================
  // DATA LOADING
  // ============================================================================
  
  useEffect(() => {
    loadInitialData()
  }, [])
  
  useEffect(() => {
    if (selectedPeriodId) {
      loadPeriodData(selectedPeriodId)
    }
  }, [selectedPeriodId])

  async function loadInitialData() {
    setLoading(true)
    try {
      // Load all periods and active period
      const result = await fetchPeriodsAndActive()

      if (result.periods) {
        setAllPeriods(result.periods)
      }

      if (result.activePeriod) {
        setActivePeriod(result.activePeriod)
        setSelectedPeriodId(result.activePeriod.id)
        // Data will be loaded by the useEffect watching selectedPeriodId
      } else if (result.periods && result.periods.length > 0) {
        // Use most recent period if no active one
        setSelectedPeriodId(result.periods[0].id)
      } else {
        // No periods available - load data without period filter
        await loadPeriodData(null)
      }
    } catch (error) {
      console.error('Error loading initial data:', error)
      toast({
        title: "Error",
        description: "Failed to load assessment data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  async function loadPeriodData(periodId?: string | null) {
    setLoading(true)
    try {
      const {
        statsResult,
        reportsResult,
        rankingsResult,
        trendsResult,
        submissionResult,
        distributionResult,
        gapsResult,
        improvedResult,
        underperformingResult,
        progressResult,
        leadersResult,
      } = await fetchDashboardData(periodId ?? null)

      if (statsResult.stats) setStats(statsResult.stats)
      if (reportsResult.reports) {
        setReports(reportsResult.reports)
        // Filter underperforming schools
        const underperforming = reportsResult.reports.filter(
          (r: any) => r.totalScore !== null && r.totalScore < scoreThreshold
        )
        setUnderperformingSchools(underperforming)
      }
      if (rankingsResult.rankings) setRankings(rankingsResult.rankings)
      if (trendsResult.trends) setTrends(trendsResult.trends)
      if (submissionResult.data) setSubmissionStatus(submissionResult.data)
      
      // NEW: Set new analytics data
      if (!distributionResult.error) setScoreDistribution(distributionResult.distribution)
      if (!gapsResult.error) setCategoryGaps(gapsResult)
      if (!improvedResult.error) setMostImproved(improvedResult)
      if (!underperformingResult.error) setUnderperformingRegions(underperformingResult.regions)
      if (!progressResult.error) setSubmissionProgress(progressResult)
      if (!leadersResult.error) setCategoryLeaders(leadersResult.leaders)

    } catch (error) {
      console.error('Error loading period data:', error)
      toast({
        title: "Error",
        description: "Failed to load assessment data.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Update underperforming schools when threshold changes
  useEffect(() => {
    const underperforming = reports.filter(
      (r: any) => r.totalScore !== null && r.totalScore < scoreThreshold
    )
    setUnderperformingSchools(underperforming)
  }, [scoreThreshold, reports])

  async function handleViewReport(reportId: string) {
    try {
      const reportResult = await fetchReport(reportId)

      if (reportResult.report) {
        setSelectedReport(reportResult.report)
        setIsGeneratingRecommendations(false)
        router.push(`/dashboard/school-assessment?tab=details`)

        if (reportResult.report.status !== 'draft' && reportResult.report.status !== 'expired_draft') {
          void loadRecommendations(reportId, true)
        }
      } else {
        toast({
          title: "Error",
          description: reportResult.error || "Failed to load report.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error loading report:', error)
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



  function handleTabChange(value: string) {
    router.push(`/dashboard/school-assessment?tab=${value}`)
  }

  function handleBackToDashboard() {
    router.push('/dashboard/education-official')
  }

  // Get unique regions for filter
  const regions = Array.from(new Set(reports.map((r: any) => r.school?.region?.name || r.regionName))).filter(Boolean)

  // Filter reports for display
  const filteredReports = reports.filter((report: any) => {
    const matchesSearch = searchQuery === "" || 
      (report.school?.name || report.schoolName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (report.school?.region?.name || report.regionName || "").toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesRegion = regionFilter === "all" || 
      (report.school?.region?.name || report.regionName) === regionFilter
    
    return matchesSearch && matchesRegion
  })

  // Filter underperforming schools
  const filteredUnderperforming = underperformingSchools.filter((report: any) => {
    const matchesSearch = searchQuery === "" || 
      (report.school?.name || report.schoolName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (report.school?.region?.name || report.regionName || "").toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesRegion = regionFilter === "all" || 
      (report.school?.region?.name || report.regionName) === regionFilter
    
    return matchesSearch && matchesRegion
  })

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 rounded-full bg-blue-50 dark:bg-blue-500/10">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-slate-500 dark:text-slate-400">Loading assessment data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <Globe className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            National School Assessment
          </h1>
          <p className="text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-1">
            <MapPin className="h-4 w-4" />
            Country-wide Performance Overview
          </p>
        </div>
        <div className="flex items-center gap-3">
          {allPeriods.length > 0 && (
            <Select
              value={selectedPeriodId || ""}
              onValueChange={(value) => setSelectedPeriodId(value)}
            >
              <SelectTrigger className="w-[220px] bg-white dark:bg-[hsl(222,47%,11%)] border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[hsl(222,47%,11%)] border-slate-200 dark:border-slate-700">
                {allPeriods.map((period) => (
                  <SelectItem key={period.id} value={period.id}>
                    {period.academicYear} - {period.termName}
                    {period.id === activePeriod?.id && " (Active)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList
          className={`grid w-full grid-cols-4 ${selectedReport ? "sm:grid-cols-5" : ""} ${canAccessSettings ? (selectedReport ? "sm:grid-cols-6" : "sm:grid-cols-5") : ""} lg:w-auto lg:inline-grid bg-slate-100 dark:bg-[hsl(222,47%,11%)] border border-slate-200/50 dark:border-slate-700/50`}
        >
          <TabsTrigger value="overview" className="flex items-center gap-2 text-slate-600 dark:text-slate-400 data-[state=active]:bg-white dark:data-[state=active]:bg-[hsl(222,47%,15%)] data-[state=active]:text-slate-900 dark:data-[state=active]:text-white">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="regions" className="flex items-center gap-2 text-slate-600 dark:text-slate-400 data-[state=active]:bg-white dark:data-[state=active]:bg-[hsl(222,47%,15%)] data-[state=active]:text-slate-900 dark:data-[state=active]:text-white">
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Regions</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2 text-slate-600 dark:text-slate-400 data-[state=active]:bg-white dark:data-[state=active]:bg-[hsl(222,47%,15%)] data-[state=active]:text-slate-900 dark:data-[state=active]:text-white">
            <FileTextIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Reports</span>
          </TabsTrigger>
          <TabsTrigger value="underperforming" className="flex items-center gap-2 text-slate-600 dark:text-slate-400 data-[state=active]:bg-white dark:data-[state=active]:bg-[hsl(222,47%,15%)] data-[state=active]:text-slate-900 dark:data-[state=active]:text-white">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">Needs Attention</span>
          </TabsTrigger>
          {selectedReport && (
            <TabsTrigger value="details" className="flex items-center gap-2 text-slate-600 dark:text-slate-400 data-[state=active]:bg-white dark:data-[state=active]:bg-[hsl(222,47%,15%)] data-[state=active]:text-slate-900 dark:data-[state=active]:text-white">
              <FileTextIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Details</span>
            </TabsTrigger>
          )}
          {canAccessSettings && (
            <TabsTrigger value="settings" className="flex items-center gap-2 text-slate-600 dark:text-slate-400 data-[state=active]:bg-white dark:data-[state=active]:bg-[hsl(222,47%,15%)] data-[state=active]:text-slate-900 dark:data-[state=active]:text-white">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 lg:space-y-6">
          {/* Stats Cards - Colorful Style */}
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <div className="px-4 py-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200/80 dark:border-blue-500/20">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-500/20">
                  <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{stats?.totalRegions || 11}</p>
              <p className="text-xs text-blue-600/70 dark:text-blue-400/70 font-medium">Total Regions</p>
              <p className="text-[10px] text-blue-500/60 dark:text-blue-400/50 mt-0.5">Across the country</p>
            </div>

            <div className="px-4 py-4 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200/80 dark:border-purple-500/20">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-500/20">
                  <School className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">{stats?.totalSchools || 0}</p>
              <p className="text-xs text-purple-600/70 dark:text-purple-400/70 font-medium">Total Schools</p>
              <p className="text-[10px] text-purple-500/60 dark:text-purple-400/50 mt-0.5">{stats?.submittedCount || 0} submitted assessments</p>
            </div>

            <div className="px-4 py-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/20">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-500/20">
                  <TrendingUpIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{stats?.nationalAverageScore || 0}</p>
              <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 font-medium">National Average</p>
              <p className="text-[10px] text-emerald-500/60 dark:text-emerald-400/50 mt-0.5">Average assessment score</p>
            </div>

            <div className="px-4 py-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/20">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-500/20">
                  <Trophy className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400 truncate">{stats?.topPerformingRegion?.regionName || 'N/A'}</p>
              <p className="text-xs text-amber-600/70 dark:text-amber-400/70 font-medium">Top Region</p>
              <p className="text-[10px] text-amber-500/60 dark:text-amber-400/50 mt-0.5">
                {stats?.topPerformingRegion ? `Score: ${stats.topPerformingRegion.averageScore}` : 'Score: 0'}
              </p>
            </div>
          </div>

          {/* AI Insights Section - At top for visibility */}
          <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
            <AIInsightCard
              type="overview"
              title="AI National Analysis"
              description="Get AI-powered insights about national assessment performance"
              autoGenerate={false}
            />
            <AIAtRiskAlert
              threshold={400}
              autoGenerate={false}
            />
            {trends.length > 0 ? (
              <AITrendPrediction
                type="national"
                historicalData={trends.map(t => ({
                  period: t.period,
                  score: t.averageScore || 0
                }))}
                title="AI Performance Prediction"
                description="AI-powered forecast of national assessment trends"
                autoGenerate={false}
              />
            ) : (
              <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border-slate-200/80 dark:border-slate-700/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white text-base">
                    <TrendingUpIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    AI Performance Prediction
                  </CardTitle>
                  <CardDescription className="text-slate-500 dark:text-slate-400 text-sm">
                    AI-powered forecast of national assessment trends
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center py-6 text-slate-500 dark:text-slate-400">
                    <p className="text-sm">No trend data available yet</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Charts Grid - 2 columns */}
          <div className="grid gap-4 lg:gap-6 grid-cols-1 lg:grid-cols-2">
            <RatingDistributionChart
              distribution={stats?.ratingDistribution || {}}
              title="National Rating Distribution"
              description="Schools by performance level"
            />
            <CategoryRadarChart
              scores={stats?.categoryAverages || {}}
              title="National Performance Profile"
              description="Average scores by category"
            />
          </div>

          {/* Second Row - Completion Rate & Score Distribution */}
          <div className="grid gap-4 lg:gap-6 grid-cols-1 lg:grid-cols-2">
            {submissionProgress && !submissionProgress.error && (
              <CompletionRateGauge
                submitted={submissionProgress.submitted}
                total={(submissionProgress.submitted || 0) + (submissionProgress.inProgress || 0) + (submissionProgress.notStarted || 0)}
                percentage={((submissionProgress.submitted || 0) + (submissionProgress.inProgress || 0) + (submissionProgress.notStarted || 0)) > 0
                  ? Math.round(((submissionProgress.submitted || 0) / ((submissionProgress.submitted || 0) + (submissionProgress.inProgress || 0) + (submissionProgress.notStarted || 0))) * 100)
                  : 0}
                title="National Completion Rate"
              />
            )}
            {scoreDistribution && scoreDistribution.length > 0 && (
              <ScoreDistributionHistogram
                distribution={scoreDistribution}
                totalReports={rankings.length || 0}
                title="Score Distribution"
              />
            )}
          </div>

          {/* Third Row - Category Gap & Most Improved */}
          <div className="grid gap-4 lg:gap-6 grid-cols-1 lg:grid-cols-2">
            {categoryGaps && !categoryGaps.error && categoryGaps.gaps && categoryGaps.gaps.length > 0 && (
              <CategoryGapAnalysisChart
                gaps={categoryGaps.gaps}
                weakestCategory={categoryGaps.weakestCategory}
                strongestCategory={categoryGaps.strongestCategory}
                title="Category Improvement Opportunities"
              />
            )}
            {mostImproved && (mostImproved.improved?.length > 0 || mostImproved.declined?.length > 0) && (
              <MostImprovedSchoolsTable
                improved={mostImproved.improved || []}
                declined={mostImproved.declined || []}
                title="School Improvement Trends"
              />
            )}
          </div>

          {/* Fourth Row - Trends & Top Schools */}
          <div className="grid gap-4 lg:gap-6 grid-cols-1 lg:grid-cols-2">
            {trends.length > 0 && (
              <TrendChart
                data={trends}
                title="National Trends"
                description="Average scores over time"
              />
            )}
            <SchoolRankingsTable
              rankings={rankings.slice(0, 10)}
              title="Top 10 Schools Nationally"
              description="Highest performing schools this term"
              onViewSchool={(schoolId) => {
                const report = reports.find((r: any) => r.schoolId === schoolId)
                if (report) handleViewReport(report.id)
              }}
            />
          </div>

          {/* AI Comparative Analysis - Only show if we have region data */}
          {stats?.regionComparison && stats.regionComparison.length > 2 && (
            <AIComparativeAnalysis
              type="regions"
              entityIds={stats.regionComparison.slice(0, 5).map((r: any) => r.regionId || r.regionName)}
              title="AI Regional Comparison"
              description="AI-powered analysis comparing top performing regions"
            />
          )}
        </TabsContent>

        {/* Regions Tab */}
        <TabsContent value="regions" className="space-y-6">
          {/* Underperforming Regions Alert */}
          {underperformingRegions && underperformingRegions.length > 0 && (
            <UnderperformingRegionsAlert
              regions={underperformingRegions}
              onRegionClick={(regionName) => {
                setRegionFilter(regionName)
                handleTabChange('reports')
              }}
            />
          )}

          {/* Charts Grid - Side by Side */}
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            <RegionComparisonChart
              regions={stats?.regionComparison || []}
              title="Regional Comparison"
              description="Average scores by region"
              compact
            />
            <SubmissionStatusChart
              data={submissionStatus}
              title="Submission Status by Region"
              description="Report submission progress"
              compact
            />
          </div>

          {/* Regional Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {submissionStatus.map((region: any, index: number) => {
              const progress = region.totalSchools > 0
                ? Math.round((region.submittedCount / region.totalSchools) * 100)
                : 0
              const colors = [
                { bg: 'bg-blue-50 dark:bg-blue-500/10', border: 'border-blue-200/80 dark:border-blue-500/20', icon: 'bg-blue-100 dark:bg-blue-500/20', iconText: 'text-blue-600 dark:text-blue-400', text: 'text-blue-700 dark:text-blue-400' },
                { bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-200/80 dark:border-emerald-500/20', icon: 'bg-emerald-100 dark:bg-emerald-500/20', iconText: 'text-emerald-600 dark:text-emerald-400', text: 'text-emerald-700 dark:text-emerald-400' },
                { bg: 'bg-purple-50 dark:bg-purple-500/10', border: 'border-purple-200/80 dark:border-purple-500/20', icon: 'bg-purple-100 dark:bg-purple-500/20', iconText: 'text-purple-600 dark:text-purple-400', text: 'text-purple-700 dark:text-purple-400' },
                { bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-200/80 dark:border-amber-500/20', icon: 'bg-amber-100 dark:bg-amber-500/20', iconText: 'text-amber-600 dark:text-amber-400', text: 'text-amber-700 dark:text-amber-400' },
                { bg: 'bg-rose-50 dark:bg-rose-500/10', border: 'border-rose-200/80 dark:border-rose-500/20', icon: 'bg-rose-100 dark:bg-rose-500/20', iconText: 'text-rose-600 dark:text-rose-400', text: 'text-rose-700 dark:text-rose-400' },
                { bg: 'bg-cyan-50 dark:bg-cyan-500/10', border: 'border-cyan-200/80 dark:border-cyan-500/20', icon: 'bg-cyan-100 dark:bg-cyan-500/20', iconText: 'text-cyan-600 dark:text-cyan-400', text: 'text-cyan-700 dark:text-cyan-400' },
              ]
              const color = colors[index % colors.length]

              return (
                <div
                  key={region.regionId}
                  className={`px-4 py-4 rounded-xl ${color.bg} border ${color.border} cursor-pointer hover:shadow-md transition-all`}
                  onClick={() => {
                    setRegionFilter(region.regionName)
                    handleTabChange('reports')
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${color.icon}`}>
                        <MapPin className={`w-4 h-4 ${color.iconText}`} />
                      </div>
                      <h3 className={`font-semibold ${color.text}`}>{region.regionName}</h3>
                    </div>
                    <ChevronRight className={`h-4 w-4 ${color.iconText}`} />
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className={`text-lg font-bold ${color.text}`}>{region.totalSchools}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Schools</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{region.submittedCount}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Submitted</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{region.pendingCount}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Pending</p>
                    </div>
                    <div>
                      <p className={`text-lg font-bold ${progress >= 75 ? 'text-emerald-600 dark:text-emerald-400' : progress >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                        {progress}%
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Progress</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${progress >= 75 ? 'bg-emerald-500' : progress >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border-slate-200/80 dark:border-slate-700/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                  <FileTextIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Assessment Reports
                </CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400">
                  {filteredReports.length} of {reports.length} reports
                </CardDescription>
              </div>

            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                  <Input
                    placeholder="Search by school or region..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white dark:bg-[hsl(222,47%,11%)] border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
                <Select value={regionFilter} onValueChange={setRegionFilter}>
                  <SelectTrigger className="w-[180px] bg-white dark:bg-[hsl(222,47%,11%)] border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                    <SelectValue placeholder="All Regions" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[hsl(222,47%,11%)] border-slate-200 dark:border-slate-700">
                    <SelectItem value="all">All Regions</SelectItem>
                    {regions.map((region) => (
                      <SelectItem key={region} value={region}>
                        {region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Reports Table */}
              <div className="rounded-lg border border-slate-200/80 dark:border-slate-700/50 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-[hsl(222,47%,8%)] border-b border-slate-200/80 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-[hsl(222,47%,8%)]">
                      <TableHead className="text-slate-600 dark:text-slate-400 font-semibold">School</TableHead>
                      <TableHead className="text-slate-600 dark:text-slate-400 font-semibold">Region</TableHead>
                      <TableHead className="text-slate-600 dark:text-slate-400 font-semibold">Status</TableHead>
                      <TableHead className="text-slate-600 dark:text-slate-400 font-semibold">Score</TableHead>
                      <TableHead className="text-slate-600 dark:text-slate-400 font-semibold">Rating</TableHead>
                      <TableHead className="text-slate-600 dark:text-slate-400 font-semibold">Date</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReports.map((report: any) => (
                      <TableRow
                        key={report.id}
                        className="cursor-pointer border-b border-slate-200/50 dark:border-slate-700/30 hover:bg-blue-50/50 dark:hover:bg-blue-500/5 transition-colors"
                        onClick={() => handleViewReport(report.id)}
                      >
                        <TableCell className="font-medium text-slate-900 dark:text-white">
                          {report.school?.name || report.schoolName || 'Unknown'}
                        </TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-400">
                          {report.school?.region?.name || report.regionName || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={report.status === 'submitted' ? 'default' : 'secondary'}
                            className={report.status === 'submitted'
                              ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                              : 'bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-500/30'
                            }
                          >
                            {report.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-900 dark:text-white font-medium">
                          {report.totalScore || '-'}
                          {report.totalScore && (
                            <span className="text-slate-400 dark:text-slate-500 text-xs ml-1">
                              /{report.isTAPS ? '429' : '1000'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <UnifiedRatingBadge
                            ratingLevel={report.ratingLevel}
                            tapsRatingGrade={report.tapsRatingGrade}
                            isTAPS={report.isTAPS}
                          />
                        </TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-400">
                          {report.submittedAt
                            ? new Date(report.submittedAt).toLocaleDateString()
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredReports.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-slate-500 dark:text-slate-400 py-8">
                          No reports found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Underperforming Schools Tab */}
        <TabsContent value="underperforming" className="space-y-6">
          <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border-slate-200/80 dark:border-slate-700/50">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                    <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    Schools Needing Attention
                  </CardTitle>
                  <CardDescription className="text-slate-500 dark:text-slate-400">
                    Schools scoring below the threshold require additional support
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500 dark:text-slate-400">Score below:</span>
                  <Select
                    value={scoreThreshold.toString()}
                    onValueChange={(v) => setScoreThreshold(parseInt(v))}
                  >
                    <SelectTrigger className="w-[120px] bg-white dark:bg-[hsl(222,47%,11%)] border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-[hsl(222,47%,11%)] border-slate-200 dark:border-slate-700">
                      <SelectItem value="400">400 (Satisfactory)</SelectItem>
                      <SelectItem value="550">550 (Good)</SelectItem>
                      <SelectItem value="700">700 (Very Good)</SelectItem>
                      <SelectItem value="850">850 (Outstanding)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Summary Stats */}
              <div className="grid gap-4 md:grid-cols-3 mb-6">
                <div className="px-4 py-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200/80 dark:border-red-500/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-100 dark:bg-red-500/20">
                      <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                        {reports.filter((r: any) => r.totalScore && r.totalScore < 400).length}
                      </p>
                      <p className="text-xs text-red-600/70 dark:text-red-400/70 font-medium">Needs Improvement</p>
                      <p className="text-[10px] text-red-500/60 dark:text-red-400/50">Score below 400</p>
                    </div>
                  </div>
                </div>
                <div className="px-4 py-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-500/20">
                      <Target className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                        {reports.filter((r: any) => r.totalScore && r.totalScore >= 400 && r.totalScore < 550).length}
                      </p>
                      <p className="text-xs text-amber-600/70 dark:text-amber-400/70 font-medium">Satisfactory</p>
                      <p className="text-[10px] text-amber-500/60 dark:text-amber-400/50">Score 400-549</p>
                    </div>
                  </div>
                </div>
                <div className="px-4 py-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-500/20">
                      <Trophy className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                        {reports.filter((r: any) => r.totalScore && r.totalScore >= scoreThreshold).length}
                      </p>
                      <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 font-medium">Above Threshold</p>
                      <p className="text-[10px] text-emerald-500/60 dark:text-emerald-400/50">Score {scoreThreshold}+</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                  <Input
                    placeholder="Search by school or region..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white dark:bg-[hsl(222,47%,11%)] border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
                <Select value={regionFilter} onValueChange={setRegionFilter}>
                  <SelectTrigger className="w-[180px] bg-white dark:bg-[hsl(222,47%,11%)] border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                    <SelectValue placeholder="All Regions" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[hsl(222,47%,11%)] border-slate-200 dark:border-slate-700">
                    <SelectItem value="all">All Regions</SelectItem>
                    {regions.map((region) => (
                      <SelectItem key={region} value={region}>
                        {region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Underperforming Schools Table */}
              <div className="rounded-lg border border-slate-200/80 dark:border-slate-700/50 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-[hsl(222,47%,8%)] border-b border-slate-200/80 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-[hsl(222,47%,8%)]">
                      <TableHead className="text-slate-600 dark:text-slate-400 font-semibold">School</TableHead>
                      <TableHead className="text-slate-600 dark:text-slate-400 font-semibold">Region</TableHead>
                      <TableHead className="text-slate-600 dark:text-slate-400 font-semibold">Score</TableHead>
                      <TableHead className="text-slate-600 dark:text-slate-400 font-semibold">Rating</TableHead>
                      <TableHead className="text-slate-600 dark:text-slate-400 font-semibold">Gap to Threshold</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUnderperforming.map((report: any) => (
                      <TableRow
                        key={report.id}
                        className="cursor-pointer border-b border-slate-200/50 dark:border-slate-700/30 hover:bg-blue-50/50 dark:hover:bg-blue-500/5 transition-colors"
                        onClick={() => handleViewReport(report.id)}
                      >
                        <TableCell className="font-medium text-slate-900 dark:text-white">
                          {report.school?.name || report.schoolName || 'Unknown'}
                        </TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-400">
                          {report.school?.region?.name || report.regionName || 'Unknown'}
                        </TableCell>
                        <TableCell className="font-bold text-red-600 dark:text-red-400">
                          {report.totalScore || 0}
                        </TableCell>
                        <TableCell>
                          <UnifiedRatingBadge
                            ratingLevel={report.ratingLevel}
                            tapsRatingGrade={report.tapsRatingGrade}
                            isTAPS={report.isTAPS}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                            <ArrowDownRight className="h-4 w-4" />
                            {scoreThreshold - (report.totalScore || 0)} points
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredUnderperforming.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-slate-500 dark:text-slate-400 py-8">
                          {reports.length === 0
                            ? "No submitted reports yet"
                            : "No schools below the threshold - great job!"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Details Tab */}
        {selectedReport && (
          <TabsContent value="details">
            <ReportView
              report={{
                id: selectedReport.id,
                schoolId: selectedReport.schoolId || selectedReport.school?.id || '',
                schoolName: selectedReport.school?.name || selectedReport.schoolName || 'Unknown School',
                regionId: selectedReport.regionId || selectedReport.school?.regionId || '',
                regionName: selectedReport.school?.regionName || selectedReport.regionName || '',
                academicYear: selectedReport.academicYear || selectedReport.period?.academicYear || '',
                termName: selectedReport.termName || selectedReport.period?.termName || '',
                periodId: selectedReport.periodId || selectedReport.period?.id || '',
                totalScore: selectedReport.totalScore || 0,
                ratingLevel: selectedReport.ratingLevel || 'needs_improvement',
                submittedAt: selectedReport.submittedAt || '',
                // TAPS fields for secondary schools
                isTAPS: Boolean(selectedReport.tapsRatingGrade || selectedReport.tapsSchoolInputsScores),
                tapsRatingGrade: selectedReport.tapsRatingGrade || undefined,
                tapsCategoryScores: selectedReport.tapsSchoolInputsScores ? {
                  school_inputs_operations: selectedReport.tapsSchoolInputsScores?.total || 0,
                  leadership: selectedReport.tapsLeadershipScores?.total || 0,
                  academics: selectedReport.tapsAcademicsScores?.total || 0,
                  teacher_development: selectedReport.tapsTeacherDevelopmentScores?.total || 0,
                  health_safety: selectedReport.tapsHealthSafetyScores?.total || 0,
                  school_culture: selectedReport.tapsSchoolCultureScores?.total || 0,
                } : undefined,
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
          </TabsContent>
        )}

        {/* Settings Tab - Only visible with school_assessments.settings permission */}
        {canAccessSettings && (
          <TabsContent value="settings">
            <div className="space-y-6">
              <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border-slate-200/80 dark:border-slate-700/50">
                <CardHeader className="border-b border-slate-200/80 dark:border-slate-700/50 bg-slate-50 dark:bg-[hsl(222,47%,8%)]">
                  <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                    <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    Feature Access Control
                  </CardTitle>
                  <CardDescription className="text-slate-500 dark:text-slate-400">
                    Enable or disable the School Assessment module for specific school types
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <ModuleAccessSettings />
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border-slate-200/80 dark:border-slate-700/50">
                <CardHeader className="border-b border-slate-200/80 dark:border-slate-700/50 bg-slate-50 dark:bg-[hsl(222,47%,8%)]">
                  <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                    <FileTextIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    Assessment Period Management
                  </CardTitle>
                  <CardDescription className="text-slate-500 dark:text-slate-400">
                    Configure recurring submission windows for each term
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <PeriodManagement />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getRatingVariant(rating: string): "default" | "secondary" | "destructive" | "outline" {
  switch (rating) {
    case 'outstanding':
    case 'A':
      return 'default'
    case 'very_good':
    case 'B':
      return 'default'
    case 'good':
    case 'C':
      return 'secondary'
    case 'satisfactory':
      return 'outline'
    case 'needs_improvement':
    case 'D':
    case 'E':
      return 'destructive'
    default:
      return 'secondary'
  }
}

function formatRating(rating: string): string {
  switch (rating) {
    case 'outstanding':
      return 'Outstanding'
    case 'very_good':
      return 'Very Good'
    case 'good':
      return 'Good'
    case 'satisfactory':
      return 'Satisfactory'
    case 'needs_improvement':
      return 'Needs Improvement'
    case 'A':
      return 'Grade A - Outstanding'
    case 'B':
      return 'Grade B - High Achieving'
    case 'C':
      return 'Grade C - Standard'
    case 'D':
      return 'Grade D - Struggling'
    case 'E':
      return 'Grade E - Critical'
    default:
      return rating
  }
}
