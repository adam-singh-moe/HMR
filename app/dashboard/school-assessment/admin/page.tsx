"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
} from "lucide-react"
import { 
  ReportView, 
  ReportsList,
  SchoolRankingsTable,
  TrendChart,
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
  recalculateReportCategoryTotals,
} from "@/features/school-assessment-reports/actions/reports"
import { getOrGenerateRecommendations } from "@/features/school-assessment-reports/actions/recommendations"
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
} from "@/features/school-assessment-reports/actions/analytics"
import { generateBulkExportCSV } from "@/features/school-assessment-reports/actions/exports"
import type { AssessmentPeriod } from "@/features/school-assessment-reports/types"

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
  const [stats, setStats] = useState<any>(null)
  const [reports, setReports] = useState<any[]>([])
  const [rankings, setRankings] = useState<any[]>([])
  const [trends, setTrends] = useState<any[]>([])
  const [submissionStatus, setSubmissionStatus] = useState<any[]>([])
  const [selectedReport, setSelectedReport] = useState<any>(null)
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [isGeneratingRecommendations, setIsGeneratingRecommendations] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [scoreDistribution, setScoreDistribution] = useState<any[] | null>(null)
  const [categoryGaps, setCategoryGaps] = useState<any>(null)
  const [mostImproved, setMostImproved] = useState<any>(null)
  const [underperformingRegions, setUnderperformingRegions] = useState<any[] | null>(null)
  const [submissionProgress, setSubmissionProgress] = useState<any>(null)

  const isAdmin = user?.role === 'Admin'

  // ============================================================================
  // DATA LOADING
  // ============================================================================
  
  useEffect(() => {
    loadInitialData()
  }, [])
  
  useEffect(() => {
    if (selectedPeriodId) {
      loadNationalData(selectedPeriodId)
    }
  }, [selectedPeriodId])
  
  const loadInitialData = async () => {
    setLoading(true)
    try {
      // Get active period from old system first
      const periodResult = await getActivePeriod()
      if (periodResult.period) {
        setActivePeriod(periodResult.period)
        setSelectedPeriodId(periodResult.period.id)
      } else {
        // Fallback: Try to get the active term window from new system
        // and create a synthetic period object for compatibility
        const termWindowResult = await getActiveTermWindow()
        if (termWindowResult.window) {
          const window = termWindowResult.window
          // Create a synthetic period that matches the term window
          const syntheticPeriod: AssessmentPeriod = {
            id: `term-window-${window.academicYear}-${window.termNumber}`,
            academicYear: window.academicYear,
            termName: window.termNumber === 1 ? 'First Term' : window.termNumber === 2 ? 'Second Term' : 'Third Term',
            startDate: window.startDate,
            endDate: window.endDate,
            submissionStartDate: window.startDate,
            submissionEndDate: window.endDate,
            isActive: window.isOpen,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
          setActivePeriod(syntheticPeriod)
          // Still set a fake period ID to trigger data loading - we'll handle this in getNationalReports
          setSelectedPeriodId(syntheticPeriod.id)
        }
      }
      
      // Get all periods (for admin)
      if (isAdmin) {
        const periodsResult = await getAllPeriods()
        if (periodsResult.periods) {
          setAllPeriods(periodsResult.periods)
        }
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
          schoolId: r.schoolId,
          schoolName: r.schoolName || 'Unknown School',
          regionName: r.regionName || '',
          status: r.status,
          totalScore: r.totalScore,
          ratingLevel: r.ratingLevel,
          submittedAt: r.submittedAt,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
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

          setRecommendations([])
          setIsGeneratingRecommendations(false)
          setCurrentTab('view')

          if (reportResult.report.status === 'submitted') {
            setIsGeneratingRecommendations(true)
            void getOrGenerateRecommendations(reportId)
              .then((recResult) => {
                setRecommendations(recResult.recommendations || [])
              })
              .catch((err) => console.error('Error loading recommendations:', err))
              .finally(() => setIsGeneratingRecommendations(false))
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

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
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
          </div>

          {/* Completion Rate Gauge and Score Distribution */}
          <div className="grid gap-6 lg:grid-cols-2">
            {submissionProgress && !submissionProgress.error && (
              <CompletionRateGauge
                submitted={submissionProgress.submitted}
                total={submissionProgress.submitted + submissionProgress.drafts + submissionProgress.notStarted}
                percentage={submissionProgress.submitted + submissionProgress.drafts + submissionProgress.notStarted > 0 
                  ? Math.round((submissionProgress.submitted / (submissionProgress.submitted + submissionProgress.drafts + submissionProgress.notStarted)) * 100)
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
          <div className="grid gap-6 lg:grid-cols-2">
            {/* AI National Overview */}
            <AIInsightCard
              type="overview"
              title="AI National Analysis"
              description="Get AI-powered insights about national assessment performance"
            />
            
            {/* AI At-Risk Schools */}
            <AIAtRiskAlert
              threshold={400}
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
          {/* Underperforming Regions Alert */}
          {underperformingRegions && underperformingRegions.length > 0 && (
            <UnderperformingRegionsAlert
              regions={underperformingRegions}
            />
          )}
          
          {stats?.regionComparison && (
            <RegionComparisonChart
              regions={stats.regionComparison}
              title="Regional Comparison"
              description="Average scores by region"
            />
          )}
          
          {submissionStatus.length > 0 && (
            <SubmissionStatusChart
              data={submissionStatus}
              title="Submission Status by Region"
              description="Report submission progress"
            />
          )}
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <ReportsList
            reports={reports}
            onViewReport={handleViewReport}
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
            <ReportView
              report={{
                id: selectedReport.id,
                schoolName: selectedReport.school?.name || 'Unknown School',
                regionName: selectedReport.school?.regionName || '',
                academicYear: selectedReport.academicYear || activePeriod?.academicYear || '',
                termName: selectedReport.termName || activePeriod?.termName || '',
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
              isGeneratingRecommendations={isGeneratingRecommendations && selectedReport?.status === 'submitted'}
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
  )
}
