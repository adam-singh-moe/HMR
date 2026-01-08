"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { AuthWrapper, useAuth } from "@/components/auth-wrapper"
import { 
  FileTextIcon, 
  TrendingUpIcon, 
  Loader2, 
  BarChart3,
  MapPin,
  School,
  Download,
  Settings,
  Globe,
  AlertTriangle,
  ChevronLeft,
} from "lucide-react"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { 
  ReportView, 
  ReportsList,
  SchoolRankingsTable,
  TrendChart,
  EnhancedTrendChart,
  CategoryBarChart,
  RatingDistributionChart,
  RegionComparisonChart,
  SubmissionStatusChart,
  CategoryRadarChart,
  StatCard,
  PeriodManagement,
  ScoreDistributionHistogram,
  CategoryGapAnalysisChart,
  MostImprovedSchoolsTable,
  UnderperformingRegionsAlert,
  CompletionRateGauge,
  AIInsightCard,
  AIAtRiskAlert,
  AITrendPrediction,
  AIComparativeAnalysis,
} from "@/features/school-assessment-reports/components"
import { calculateAllCategoryScores } from "@/features/school-assessment-reports/actions/scoring"
import { 
  getActivePeriod,
  getAllPeriods,
  getActiveTermWindow,
} from "@/features/school-assessment-reports/actions/assessment-periods"
import {
  getNationalReports,
  getReport,
  deleteAssessmentReport,
  getSchoolReports,
  recalculateReportCategoryTotals,
} from "@/features/school-assessment-reports/actions/reports"
import { 
  getNationalStatistics, 
  getNationalSchoolRankings,
  getNationalTrends,
  getCategoryPerformance,
  getSubmissionStatusByRegion,
  getScoreDistribution,
  getCategoryGapAnalysis,
  getMostImprovedSchools,
  getUnderperformingRegions,
  getSubmissionProgressBreakdown,
  getSchoolTrends,
  getSchoolRankingPosition,
  getRegionalStatistics,
  getRegionalSchoolRankings,
  getRegionalTrends,
  getRegionVsNationalComparison,
  getCategoryLeaders,
  getSchoolsNeedingAttention,
  getAllRegions,
} from "@/features/school-assessment-reports/actions/analytics"
import { generateBulkExportCSV } from "@/features/school-assessment-reports/actions/exports"
import type { AssessmentPeriod } from "@/features/school-assessment-reports/types"
import { 
  RegionVsNationalCard,
  CategoryLeadersTable,
  SubmissionProgressBreakdown
} from "@/features/school-assessment-reports/components"

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
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

// ============================================================================
// CONSTANTS
// ============================================================================

const REGIONS = [
  { id: '1', name: 'Region 1' },
  { id: '2', name: 'Region 2' },
  { id: '3', name: 'Region 3' },
  { id: '4', name: 'Region 4' },
  { id: '5', name: 'Region 5' },
  { id: '6', name: 'Region 6' },
  { id: '7', name: 'Region 7' },
  { id: '8', name: 'Region 8' },
  { id: '9', name: 'Region 9' },
  { id: '10', name: 'Region 10' },
  { id: '11', name: 'Georgetown' },
]

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AdminAssessmentPage() {
  return (
    <AuthWrapper requiredRole={["Admin", "Education Official"]}>
      <AdminAssessmentContent />
    </AuthWrapper>
  )
}

function AdminAssessmentContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { user } = useAuth()
  
  const currentTab = searchParams.get('tab') || 'overview'
  
  // State
  const [loading, setLoading] = useState(true)
  const [activePeriod, setActivePeriod] = useState<AssessmentPeriod | null>(null)
  const [allPeriods, setAllPeriods] = useState<AssessmentPeriod[]>([])
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null)
  const [dbRegions, setDbRegions] = useState<{ id: string; name: string }[]>([])
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
  const [isExporting, setIsExporting] = useState(false)
  const [isDeletingReport, setIsDeletingReport] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<{
    id: string
    schoolName?: string
    regionName?: string
  } | null>(null)
  const [scoreDistribution, setScoreDistribution] = useState<any[] | null>(null)
  const [categoryGaps, setCategoryGaps] = useState<any>(null)
  const [mostImproved, setMostImproved] = useState<any>(null)
  const [underperformingRegions, setUnderperformingRegions] = useState<any[] | null>(null)
  const [submissionProgress, setSubmissionProgress] = useState<any>(null)

  // Regional Drill-down State
  const [selectedRegion, setSelectedRegion] = useState<{ id: string, name: string } | null>(null)
  const [regionalStats, setRegionalStats] = useState<any>(null)
  const [regionalRankings, setRegionalRankings] = useState<any[]>([])
  const [regionalTrends, setRegionalTrends] = useState<any[]>([])
  const [regionalLoading, setRegionalLoading] = useState(false)
  const [regionalSubmissionProgress, setRegionalSubmissionProgress] = useState<any>(null)
  const [regionalCategoryGaps, setRegionalCategoryGaps] = useState<any>(null)
  const [regionalMostImproved, setRegionalMostImproved] = useState<any>(null)
  const [regionVsNational, setRegionVsNational] = useState<any>(null)
  const [regionalCategoryLeaders, setRegionalCategoryLeaders] = useState<any>(null)
  const [regionalSchoolsNeedingAttention, setRegionalSchoolsNeedingAttention] = useState<any[]>([])

  const [schoolOverviewLoading, setSchoolOverviewLoading] = useState(false)
  const [schoolOverviewReports, setSchoolOverviewReports] = useState<any[]>([])
  const [schoolOverviewTrends, setSchoolOverviewTrends] = useState<any[]>([])
  const [schoolOverviewRanking, setSchoolOverviewRanking] = useState<any>(null)
  const [schoolOverviewError, setSchoolOverviewError] = useState<string | null>(null)
  
  const overviewSeq = useRef(0)

  const recommendations = selectedReport?.id
    ? (recommendationsByReportId[selectedReport.id] ?? [])
    : []

  const isAdmin = user?.role === 'Admin'

  const loadSchoolOverview = async (schoolId: string, periodId?: string) => {
    const seq = ++overviewSeq.current
    console.log(`[Admin] Loading school overview for ${schoolId}, seq: ${seq}`)
    
    // Reset state
    setSchoolOverviewReports([])
    setSchoolOverviewTrends([])
    setSchoolOverviewRanking(null)
    setSchoolOverviewError(null)
    setSchoolOverviewLoading(true)

    // Parallel requests with independent resolution
    // Each task handles its own errors so the Promise.allSettled always "succeeds"
    const reportsTask = getSchoolReports(schoolId)
      .then(res => {
        if (seq !== overviewSeq.current) return
        if (res.error) setSchoolOverviewError(res.error)
        else setSchoolOverviewReports(res.reports || [])
      })
      .catch(err => {
        console.error(`[Admin] reportsTask failure (seq ${seq}):`, err)
      })

    const trendsTask = getSchoolTrends(schoolId)
      .then(res => {
        if (seq !== overviewSeq.current) return
        setSchoolOverviewTrends(res.error ? [] : (res.trends || []))
      })
      .catch(err => {
        console.error(`[Admin] trendsTask failure (seq ${seq}):`, err)
      })

    const rankingTask = getSchoolRankingPosition(schoolId, periodId)
      .then(res => {
        if (seq !== overviewSeq.current) return
        setSchoolOverviewRanking(res.error ? null : res)
      })
      .catch(err => {
        console.error(`[Admin] rankingTask failure (seq ${seq}):`, err)
      })

    // Safety timeout to ensure spinner is removed even if tasks hang
    const timeoutPromise = new Promise(resolve => setTimeout(resolve, 15000))

    try {
      // Race the core data against a safety timeout
      await Promise.race([
        Promise.allSettled([reportsTask, trendsTask]),
        timeoutPromise
      ])
      
      console.log(`[Admin] Primary overview loading finished for seq: ${seq}`)
    } catch (error) {
      console.error(`[Admin] Error in loadSchoolOverview (seq ${seq}):`, error)
    } finally {
      if (seq === overviewSeq.current) {
        setSchoolOverviewLoading(false)
        // If we still have no reports after timeout/completion, it might be an error
      }
    }

    // Ranking is allowed to finish later in the background via its own .then()
  }

  const loadRegionalDetailOverview = async (regionId: string, regionName: string, periodId?: string) => {
    setRegionalLoading(true)
    setSelectedRegion({ id: regionId, name: regionName })
    
    try {
      // Use "all" as undefined for backend calls if it's the period selector
      const pId = periodId === 'all' ? undefined : periodId

      const [
        statsRes,
        rankingsRes,
        trendsRes,
        progressRes,
        gapsRes,
        improvedRes,
        vsNationalRes,
        leadersRes,
        needingAttentionRes
      ] = await Promise.all([
        getRegionalStatistics(regionId, pId).catch(err => { console.error('stats error:', err); return { stats: null, error: err.message }; }),
        getRegionalSchoolRankings(regionId, pId).catch(err => { console.error('rankings error:', err); return { rankings: [], error: err.message }; }),
        getRegionalTrends(regionId).catch(err => { console.error('trends error:', err); return { trends: [], error: err.message }; }),
        getSubmissionProgressBreakdown(regionId, pId).catch(err => { console.error('progress error:', err); return { error: err.message }; }),
        getCategoryGapAnalysis(regionId, pId).catch(err => { console.error('gaps error:', err); return { error: err.message }; }),
        getMostImprovedSchools(regionId).catch(err => { console.error('improved error:', err); return { error: err.message }; }),
        getRegionVsNationalComparison(regionId, pId).catch(err => { console.error('vsNational error:', err); return { error: err.message }; }),
        getCategoryLeaders(regionId, pId).catch(err => { console.error('leaders error:', err); return { error: err.message }; }),
        getSchoolsNeedingAttention(regionId, pId).catch(err => { console.error('attention error:', err); return { schools: [], error: err.message }; })
      ])

      if (statsRes?.stats) setRegionalStats(statsRes.stats)
      if (rankingsRes?.rankings) setRegionalRankings(rankingsRes.rankings)
      if (trendsRes?.trends) setRegionalTrends(trendsRes.trends)
      setRegionalSubmissionProgress(progressRes?.error ? null : progressRes)
      setRegionalCategoryGaps(gapsRes?.error ? null : gapsRes)
      setRegionalMostImproved(improvedRes?.error ? null : improvedRes)
      setRegionVsNational(vsNationalRes?.error ? null : vsNationalRes)
      setRegionalCategoryLeaders(leadersRes?.error ? null : leadersRes)
      setRegionalSchoolsNeedingAttention(needingAttentionRes?.schools || [])

    } catch (error) {
      console.error('Error loading regional detail:', error)
      toast({
        title: 'Error',
        description: 'Failed to load regional data.',
        variant: 'destructive',
      })
    } finally {
      setRegionalLoading(false)
    }
  }

  const handleDeleteReport = async (reportId: string, report?: any) => {
    if (!isAdmin) {
      toast({
        title: "Not allowed",
        description: "Only Admin users can delete assessment reports.",
        variant: "destructive",
      })
      return
    }

    if (isDeletingReport) return

    setPendingDelete({
      id: reportId,
      schoolName: report?.schoolName,
      regionName: report?.regionName,
    })
    setDeleteDialogOpen(true)
  }

  const confirmDeleteReport = async () => {
    if (!pendingDelete) return
    if (!isAdmin) return
    if (isDeletingReport) return

    setIsDeletingReport(true)
    try {
      const result = await deleteAssessmentReport(pendingDelete.id)
      if (!result.success) {
        toast({
          title: "Delete failed",
          description: result.error || "Could not delete the report.",
          variant: "destructive",
        })
        return
      }

      setReports((prev) => prev.filter((r: any) => r.id !== pendingDelete.id))
      setSelectedReport((prev: any) => (prev?.id === pendingDelete.id ? null : prev))
      setDeleteDialogOpen(false)
      setPendingDelete(null)

      toast({
        title: "Report deleted",
        description: "The assessment report has been removed.",
      })
    } catch (error) {
      console.error('Error deleting report:', error)
      toast({
        title: "Delete failed",
        description: "An unexpected error occurred.",
        variant: "destructive",
      })
    } finally {
      setIsDeletingReport(false)
    }
  }

  // ============================================================================
  // DATA LOADING
  // ============================================================================
  
  useEffect(() => {
    loadInitialData()
  }, [])
  
  useEffect(() => {
    if (selectedPeriodId) {
      loadNationalData(selectedPeriodId)
      
      // If a region is currently selected, refresh its data too
      if (selectedRegion) {
        loadRegionalDetailOverview(selectedRegion.id, selectedRegion.name, selectedPeriodId)
      }
    }
  }, [selectedPeriodId])
  
  const loadInitialData = async () => {
    setLoading(true)
    try {
      // Get all legacy periods first
      let fetchedPeriods: AssessmentPeriod[] = []
      const periodsResult = await getAllPeriods()
      if (periodsResult.periods) {
        fetchedPeriods = [...periodsResult.periods]
      }
      
      // Get active term window
      const termWindowResult = await getActiveTermWindow()
      let syntheticActive: AssessmentPeriod | null = null
      
      if (termWindowResult.window) {
        const window = termWindowResult.window
        syntheticActive = {
          id: `term-window-${window.academicYear}-${window.termNumber}`,
          academicYear: window.academicYear,
          termName: window.termNumber === 1 ? 'First Term' : window.termNumber === 2 ? 'Second Term' : 'Third Term',
          startDate: window.submissionStart,
          endDate: window.submissionEnd,
          submissionStartDate: window.submissionStart,
          submissionEndDate: window.submissionEnd,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as any
        
        // Add to periods list if not already present (match by year/term)
        const exists = fetchedPeriods.some(p => 
          p.academicYear === syntheticActive?.academicYear && 
          p.termName === syntheticActive?.termName
        )
        if (!exists && syntheticActive) {
          fetchedPeriods.unshift(syntheticActive)
        }
      }

      // Add "All Periods" option
      const allOption = {
        id: 'all',
        academicYear: 'All Historical',
        termName: 'Records',
        isActive: false
      } as any
      
      const periodsWithAll = [allOption, ...fetchedPeriods]
      setAllPeriods(periodsWithAll)

      // Set default selected period
      // 1. Check if we have an active legacy period
      const activeLegacy = fetchedPeriods.find(p => p.isActive && !p.id.startsWith('term-window-'))
      if (activeLegacy) {
        setActivePeriod(activeLegacy)
        setSelectedPeriodId(activeLegacy.id)
      } else if (syntheticActive) {
        setActivePeriod(syntheticActive)
        setSelectedPeriodId(syntheticActive.id)
      } else if (fetchedPeriods.length > 0) {
        setSelectedPeriodId(fetchedPeriods[0].id)
      } else {
        setSelectedPeriodId('all')
      }
      
      // Fetch regions from database
      const regionsResult = await getAllRegions()
      if (regionsResult.regions && regionsResult.regions.length > 0) {
        const sortedRegions = [...regionsResult.regions].sort((a, b) => {
          // Helper to extract region number
          const getRegionNum = (name: string) => {
            if (name === 'Georgetown') return 0
            const match = name.match(/Region (\d+)/i)
            return match ? parseInt(match[1], 10) : 999
          }
          
          return getRegionNum(a.name) - getRegionNum(b.name)
        })
        setDbRegions(sortedRegions)
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

  const loadNationalData = async (periodId: string) => {
    try {
      // Get national statistics
      const statsResult = await getNationalStatistics(periodId)
      if (statsResult.stats) {
        setStats(statsResult.stats)
      }
      
      // Get reports
      const reportsResult = await getNationalReports({ periodId })
      if (reportsResult.reports) {
        setReports(reportsResult.reports.map((r: any) => ({
          id: r.id,
          schoolId: r.schoolId || r.school_id,
          schoolName: r.schoolName || r.sms_schools?.name || 'Unknown School',
          regionName: r.regionName || r.sms_schools?.sms_regions?.name || '',
          status: r.status,
          totalScore: r.totalScore !== undefined ? r.totalScore : r.total_score,
          ratingLevel: r.ratingLevel || r.rating_level,
          submittedAt: r.submittedAt || r.submitted_at,
          createdAt: r.createdAt || r.created_at,
          updatedAt: r.updatedAt || r.updated_at,
          academicYear: r.academicYear || r.academic_year,
          termName: r.termName || r.term_name,
          isTAPS: r.isTAPS,
          tapsRatingGrade: r.tapsRatingGrade || r.taps_rating_grade,
        })))
      }
      
      // Get rankings
      const rankingsResult = await getNationalSchoolRankings(periodId, 20)
      if (rankingsResult.rankings) {
        setRankings(rankingsResult.rankings)
      }
      
      // Get trends
      const trendsResult = await getNationalTrends()
      if (trendsResult.trends) {
        setTrends(trendsResult.trends)
      }
      
      // Get submission status
      const statusResult = await getSubmissionStatusByRegion(periodId)
      if (statusResult.data) {
        setSubmissionStatus(statusResult.data)
      }
      
      // NEW: Get score distribution
      const distributionResult = await getScoreDistribution(undefined, periodId)
      if (!distributionResult.error) {
        setScoreDistribution(distributionResult.distribution)
      }
      
      // NEW: Get category gap analysis (national level)
      const gapsResult = await getCategoryGapAnalysis(undefined, periodId)
      if (!gapsResult.error) {
        setCategoryGaps(gapsResult)
      }
      
      // NEW: Get most improved schools (national)
      const improvedResult = await getMostImprovedSchools(undefined, 5)
      if (!improvedResult.error) {
        setMostImproved(improvedResult)
      }
      
      // NEW: Get underperforming regions
      const underperformingResult = await getUnderperformingRegions(periodId)
      if (!underperformingResult.error) {
        setUnderperformingRegions(underperformingResult.regions)
      }
      
      // NEW: Get submission progress breakdown (national)
      const progressResult = await getSubmissionProgressBreakdown(undefined, periodId)
      if (!progressResult.error) {
        setSubmissionProgress(progressResult)
      }
    } catch (error) {
      console.error('Error loading national data:', error)
    }
  }

  const handleViewReport = async (reportId: string) => {
    try {
      let reportResult = await getReport(reportId)
      if (reportResult.report) {
        // Check if category totals are missing and recalculate if needed
        const report = reportResult.report
        const needsRecalc = report.academicScores?.total === undefined ||
                           report.attendanceScores?.total === undefined ||
                           report.infrastructureScores?.total === undefined
        
        if (needsRecalc && isAdmin) {
          // Recalculate and save category totals
          await recalculateReportCategoryTotals(reportId)
          // Re-fetch the report with updated totals
          reportResult = await getReport(reportId)
        }
        
        if (reportResult.report) {
          setSelectedReport(reportResult.report)
          setIsGeneratingRecommendations(false)
          setCurrentTab('view')

          if (reportResult.report.status !== 'draft' && reportResult.report.status !== 'expired_draft') {
            void loadRecommendations(reportId, true)
          }

          // Load headteacher-like overview for the selected school's full history
          if (reportResult.report.schoolId) {
            void loadSchoolOverview(reportResult.report.schoolId, selectedPeriodId || undefined)
          } else {
            setSchoolOverviewReports([])
            setSchoolOverviewTrends([])
            setSchoolOverviewRanking(null)
            setSchoolOverviewError(null)
          }
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
    router.push(`/dashboard/school-assessment/admin?${params.toString()}`)
  }

  const handleExportCSV = async () => {
    if (!selectedPeriodId) return
    
    setIsExporting(true)
    try {
      const result = await generateBulkExportCSV(selectedPeriodId)
      if (result.csv) {
        const blob = new Blob([result.csv], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `national_assessment_${activePeriod?.academicYear}_${activePeriod?.termName}.csv`
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

  const handleRefreshPeriods = () => {
    loadInitialData()
  }

  // ============================================================================
  // RENDER
  // ============================================================================
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {isAdmin ? 'Assessment Administration' : 'National Assessment Dashboard'}
          </h1>
          <p className="text-muted-foreground flex items-center gap-1">
            <Globe className="h-4 w-4" />
            National Overview
          </p>
        </div>
        <div className="flex items-center gap-2">
          {allPeriods.length > 0 && (
            <Select
              value={selectedPeriodId || ''}
              onValueChange={setSelectedPeriodId}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                {allPeriods.map(period => (
                  <SelectItem key={period.id} value={period.id}>
                    {period.academicYear} - {period.termName}
                    {period.isActive && ' (Active)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportCSV}
            disabled={isExporting || !selectedPeriodId}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export CSV
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="regions" className="gap-2">
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Regions</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <FileTextIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Reports</span>
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="view" className="gap-2" disabled={!selectedReport}>
            <TrendingUpIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Details</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Regions"
              value={stats?.totalRegions || 0}
              description="Across the country"
              icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
            />
            <StatCard
              title="Total Schools"
              value={stats?.totalSchools || 0}
              description={`${stats?.submittedCount || 0} submitted`}
              icon={<School className="h-4 w-4 text-muted-foreground" />}
            />
            <StatCard
              title="National Average"
              value={stats?.nationalAverageScore || 0}
              description="Average assessment score"
              icon={<TrendingUpIcon className="h-4 w-4 text-muted-foreground" />}
            />
            <StatCard
              title="Top Region"
              value={stats?.topPerformingRegion?.regionName || 'N/A'}
              description={stats?.topPerformingRegion 
                ? `Score: ${stats.topPerformingRegion.averageScore}`
                : ''
              }
              icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
            />
          </div>

          {/* Charts Stacking */}
          <div className="flex flex-col gap-6">
            {stats?.ratingDistribution && (
              <RatingDistributionChart 
                distribution={stats.ratingDistribution}
                title="National Rating Distribution"
                description="Schools by performance level"
              />
            )}
            {stats?.categoryAverages && (
              <CategoryRadarChart
                scores={stats.categoryAverages}
                title="National Performance Profile"
                description="Average scores by category"
              />
            )}

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

          {/* Category Gap Analysis */}
          {categoryGaps && !categoryGaps.error && categoryGaps.gaps && categoryGaps.gaps.length > 0 && (
            <CategoryGapAnalysisChart
              gaps={categoryGaps.gaps}
              weakestCategory={categoryGaps.weakestCategory}
              strongestCategory={categoryGaps.strongestCategory}
              title="National Category Improvement Opportunities"
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

          {/* Trends */}
          {trends.length > 0 && (
            <TrendChart 
              data={trends} 
              title="National Trends"
              description="Average scores over time"
            />
          )}

          {/* Top Schools */}
          <SchoolRankingsTable
            rankings={rankings.slice(0, 10)}
            title="Top 10 Schools Nationally"
            description="Highest performing schools this term"
            onViewSchool={(schoolId) => {
              const report = reports.find(r => r.schoolId === schoolId)
              if (report) handleViewReport(report.id)
            }}
          />

          {/* AI Insights Section */}
          <div className="flex flex-col gap-6">
            {/* AI National Overview */}
            <AIInsightCard
              type="overview"
              title="AI National Analysis"
              description="Get AI-powered insights about national assessment performance"
              autoGenerate={false}
            />
            
            {/* AI At-Risk Schools */}
            <AIAtRiskAlert
              threshold={400}
              autoGenerate={false}
            />
          </div>

          {/* AI Trend Prediction */}
          {trends.length > 0 && (
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
          )}

          {/* AI Comparative Analysis */}
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
          {!selectedRegion ? (
            <>
              {/* Region Selection Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary" />
                    Regional Dashboards
                  </CardTitle>
                  <CardDescription>
                    Select a region to view its detailed performance overview and analytics.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {(dbRegions.length > 0 ? dbRegions : REGIONS).map((region) => (
                      <Button
                        key={region.id}
                        variant="outline"
                        className="h-auto py-4 flex flex-col items-center gap-2 hover:border-primary hover:bg-primary/5 transition-colors"
                        onClick={() => loadRegionalDetailOverview(region.id, region.name, selectedPeriodId || undefined)}
                      >
                        <MapPin className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium text-center">{region.name}</span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Underperforming Regions Alert */}
              {underperformingRegions && underperformingRegions.length > 0 && (
                <UnderperformingRegionsAlert
                  regions={underperformingRegions}
                />
              )}
              
              <RegionComparisonChart
                regions={stats?.regionComparison || []}
                title="Regional Comparison"
                description="Average scores by region"
              />
              
              <SubmissionStatusChart
                data={submissionStatus || []}
                title="Submission Status by Region"
                description="Report submission progress"
              />
            </>
          ) : (
            <>
              {/* Regional Detail Dashboard */}
              <div className="flex items-center justify-between mb-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedRegion(null)}
                  className="gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back to National Regions Overview
                </Button>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="px-3 py-1 text-sm bg-primary/5 border-primary/20">
                    <MapPin className="h-3.5 w-3.5 mr-1.5 text-primary" />
                    Currently Viewing: {selectedRegion.name}
                  </Badge>
                </div>
              </div>

              {regionalLoading ? (
                <Card className="w-full flex flex-col items-center justify-center p-20">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground font-medium">Loading {selectedRegion.name} Data...</p>
                </Card>
              ) : (
                <div className="space-y-6 animate-in fade-in duration-500">
                  {/* Regional Stat Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard
                      title="Average Score"
                      value={Math.round(regionalStats?.averageScore || 0)}
                      description={`Across ${regionalStats?.submittedCount || 0} reports`}
                      trend={regionVsNational ? {
                        value: regionVsNational.difference,
                        isPositive: regionVsNational.isAboveNational,
                      } : undefined}
                      icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
                    />
                    <StatCard
                      title="Schools Submitted"
                      value={regionalStats?.submittedCount || 0}
                      description={`Out of ${regionalStats?.totalSchools || 0} schools`}
                      icon={<School className="h-4 w-4 text-muted-foreground" />}
                    />
                    {regionVsNational && (
                      <RegionVsNationalCard
                        {...regionVsNational}
                        regionName={selectedRegion.name}
                      />
                    )}
                  </div>

                  {/* Main Charts Row */}
                  <div className={`grid gap-6 ${isAdmin ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
                    <RatingDistributionChart
                      distribution={regionalStats?.ratingDistribution || {}}
                      title={`${selectedRegion.name} Rating Distribution`}
                    />
                    <TrendChart
                      data={regionalTrends || []}
                      title={`${selectedRegion.name} Performance Trend`}
                    />
                  </div>

                  {/* Category Performance Row */}
                  <div className={`grid gap-6 ${isAdmin ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
                    <CategoryBarChart
                      scores={regionalStats?.categoryAverages || {}}
                      title="Category Performance"
                    />
                    <CategoryRadarChart
                      scores={regionalStats?.categoryAverages || {}}
                      title="Category Balance"
                    />
                  </div>

                  {/* Regional Rankings & Analysis */}
                  <div className="grid grid-cols-1 gap-6">
                    <SchoolRankingsTable
                      rankings={regionalRankings}
                      title={`Top Schools in ${selectedRegion.name}`}
                      onViewSchool={(schoolId) => {
                        // Navigate to view tab with this school
                        const matchingReport = reports.find(r => r.schoolId === schoolId)
                        if (matchingReport) {
                          handleViewReport(matchingReport.id, matchingReport)
                        } else {
                          toast({
                            title: "Information",
                            description: "No current report details available for this school.",
                          })
                        }
                      }}
                    />
                  </div>

                  {/* Submission & Gap Analysis Row - Only show if data exists */}
                  {(regionalSubmissionProgress || regionalCategoryGaps) && (
                    <div className={`grid gap-6 ${isAdmin ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
                      {regionalSubmissionProgress && (
                        <SubmissionProgressBreakdown
                          {...regionalSubmissionProgress}
                          title="Report Status Breakdown"
                        />
                      )}
                      {regionalCategoryGaps && (
                        <CategoryGapAnalysisChart
                          gaps={regionalCategoryGaps.gaps || []}
                          weakestCategory={regionalCategoryGaps.weakestCategory}
                          strongestCategory={regionalCategoryGaps.strongestCategory}
                          title="Regional Gap Analysis"
                          description={`How ${selectedRegion.name} compares to national averages by category`}
                        />
                      )}
                    </div>
                  )}

                  {/* Improvement & Leaders Row - Only show if data exists */}
                  {(regionalMostImproved || regionalCategoryLeaders) && (
                    <div className={`grid gap-6 ${isAdmin ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
                      {regionalMostImproved && (
                        <MostImprovedSchoolsTable
                          improved={regionalMostImproved.improved || []}
                          declined={regionalMostImproved.declined || []}
                          title="Performance Gains"
                        />
                      )}
                      {regionalCategoryLeaders && (
                        <CategoryLeadersTable
                          leaders={regionalCategoryLeaders.leaders || []}
                          title="Category Excellence"
                          regionId={selectedRegion.id}
                          periodId={selectedPeriodId || undefined}
                          onViewSchool={(schoolId) => {
                            const matchingReport = reports.find(r => r.schoolId === schoolId)
                            if (matchingReport) {
                              handleViewReport(matchingReport.id, matchingReport)
                            }
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <ReportsList
            reports={reports}
            onViewReport={handleViewReport}
            onDeleteReport={isAdmin ? handleDeleteReport : undefined}
            showSchoolColumn={true}
            showRegionColumn={true}
            emptyMessage="No assessment reports found for the selected period."
          />
        </TabsContent>

        {/* Settings Tab (Admin only) */}
        {isAdmin && (
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Assessment Period Management</CardTitle>
                <CardDescription>
                  Configure recurring submission windows for each term
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PeriodManagement />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* View Details Tab */}
        <TabsContent value="view">
          {selectedReport ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>School Overview</CardTitle>
                  <CardDescription>
                    History and performance summary for {selectedReport.school?.name || 'this school'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {schoolOverviewError ? (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Unable to load school history</AlertTitle>
                      <AlertDescription>{schoolOverviewError}</AlertDescription>
                    </Alert>
                  ) : null}

                  {schoolOverviewLoading ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Loading school overview…
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-4 md:grid-cols-4">
                        <StatCard
                          title="Submitted Reports"
                          value={schoolOverviewReports.filter((r: any) => r.status === 'submitted').length}
                          description="All-time submissions"
                        />
                        <StatCard
                          title="Best Score"
                          value={
                            Math.max(
                              0,
                              ...schoolOverviewReports
                                .filter((r: any) => r.status === 'submitted')
                                .map((r: any) => r.totalScore || 0)
                            )
                          }
                          description="Highest submitted score"
                        />
                        <StatCard
                          title="Average Score"
                          value={(() => {
                            const submitted = schoolOverviewReports.filter((r: any) => r.status === 'submitted')
                            if (submitted.length === 0) return 0
                            const sum = submitted.reduce((acc: number, r: any) => acc + (r.totalScore || 0), 0)
                            return Math.round(sum / submitted.length)
                          })()}
                          description="Across submitted reports"
                        />
                        <StatCard
                          title="Regional Rank"
                          value={
                            schoolOverviewRanking?.regionalRank
                              ? `${schoolOverviewRanking.regionalRank}/${schoolOverviewRanking.regionalTotal}`
                              : '—'
                          }
                          description={schoolOverviewRanking?.regionName ? schoolOverviewRanking.regionName : 'Current period'}
                        />
                      </div>

                      <EnhancedTrendChart
                        data={schoolOverviewTrends}
                        title="Performance Journey"
                        description="Submitted score trend over time"
                        showTarget={true}
                        variant={Boolean(selectedReport.isTAPS || selectedReport.is_taps || selectedReport.tapsRatingGrade || selectedReport.taps_rating_grade) ? 'taps' : 'demo'}
                      />

                      <ReportsList
                        reports={schoolOverviewReports.map((r: any) => ({
                          ...r,
                          ratingLevel: r.ratingLevel || r.rating_level as any,
                        }))}
                        onViewReport={handleViewReport}
                        showSchoolColumn={false}
                        showRegionColumn={false}
                        emptyMessage="No assessment reports found for this school."
                      />
                    </>
                  )}
                </CardContent>
              </Card>

              <ReportView
                report={{
                  id: selectedReport.id,
                  schoolId: selectedReport.schoolId || selectedReport.school_id || selectedReport.school?.id || '',
                  schoolName: selectedReport.schoolName || selectedReport.school?.name || 'Unknown School',
                  regionId: selectedReport.regionId || selectedReport.region_id || selectedReport.school?.region_id || '',
                  regionName: selectedReport.regionName || selectedReport.school?.regionName || selectedReport.school?.sms_regions?.name || '',
                  academicYear: selectedReport.academicYear || selectedReport.academic_year || activePeriod?.academicYear || '',
                  termName: selectedReport.termName || selectedReport.term_name || activePeriod?.termName || '',
                  periodId: selectedReport.periodId || selectedReport.period_id || activePeriod?.id || '',
                  totalScore: selectedReport.totalScore !== undefined ? selectedReport.totalScore : (selectedReport.total_score || 0),
                  ratingLevel: selectedReport.ratingLevel || selectedReport.rating_level || 'needs_improvement',
                  submittedAt: selectedReport.submittedAt || selectedReport.submitted_at || '',
                  // TAPS fields for secondary schools
                  isTAPS: selectedReport.isTAPS || selectedReport.is_taps || Boolean(selectedReport.taps_rating_grade || selectedReport.tapsRatingGrade),
                  tapsRatingGrade: selectedReport.tapsRatingGrade || selectedReport.taps_rating_grade || undefined,
                  tapsCategoryScores: selectedReport.tapsCategoryScores || selectedReport.taps_category_scores || (
                    (selectedReport.isTAPS || selectedReport.is_taps) ? {
                      school_inputs: (selectedReport.tapsSchoolInputsScores || selectedReport.taps_school_inputs_scores)?.total || 0,
                      leadership: (selectedReport.tapsLeadershipScores || selectedReport.taps_leadership_scores)?.total || 0,
                      academics: (selectedReport.tapsAcademicsScores || selectedReport.taps_academics_scores)?.total || 0,
                      teacher_development: (selectedReport.tapsTeacherDevelopmentScores || selectedReport.taps_teacher_development_scores)?.total || 0,
                      health_safety: (selectedReport.tapsHealthSafetyScores || selectedReport.taps_health_safety_scores)?.total || 0,
                      school_culture: (selectedReport.tapsSchoolCultureScores || selectedReport.taps_school_culture_scores)?.total || 0,
                    } : undefined
                  ),
                  // Demo category scores
                  categoryScores: calculateAllCategoryScores({
                    academic: selectedReport.academicScores || selectedReport.academic_scores || {},
                    attendance: selectedReport.attendanceScores || selectedReport.attendance_scores || {},
                    infrastructure: selectedReport.infrastructureScores || selectedReport.infrastructure_scores || {},
                    teachingQuality: selectedReport.teachingQualityScores || selectedReport.teaching_quality_scores || {},
                    management: selectedReport.managementScores || selectedReport.management_scores || {},
                    studentWelfare: selectedReport.studentWelfareScores || selectedReport.student_welfare_scores || {},
                    community: selectedReport.communityScores || selectedReport.community_scores || {},
                  }),
                }}
                recommendations={recommendations}
                isGeneratingRecommendations={isGeneratingRecommendations && selectedReport?.status !== 'draft' && selectedReport?.status !== 'expired_draft'}
              />
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">Select a report to view details</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (isDeletingReport) return
          setDeleteDialogOpen(open)
          if (!open) setPendingDelete(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete assessment report?
            </DialogTitle>
            <DialogDescription>
              This permanently deletes the report and any linked recommendations/audit entries.
              {pendingDelete?.schoolName ? (
                <span className="block mt-2">
                  <span className="font-medium text-foreground">{pendingDelete.schoolName}</span>
                  {pendingDelete.regionName ? (
                    <span className="text-muted-foreground"> · {pendingDelete.regionName}</span>
                  ) : null}
                </span>
              ) : null}
              <span className="block mt-2 text-destructive">This action cannot be undone.</span>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (isDeletingReport) return
                setDeleteDialogOpen(false)
                setPendingDelete(null)
              }}
              disabled={isDeletingReport}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDeleteReport}
              disabled={isDeletingReport || !pendingDelete}
            >
              {isDeletingReport ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                'Delete Report'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
