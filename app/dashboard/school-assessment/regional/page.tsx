"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
  AlertTriangle,
  ChevronLeft,
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
} from "@/features/school-assessment-reports/actions/assessment-periods"
import {
  getRegionalReports,
  getReport,
} from "@/features/school-assessment-reports/actions/reports"
import { getOrGenerateRecommendations, getRecommendations } from "@/features/school-assessment-reports/actions/recommendations"
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function RegionalOfficerAssessmentPage() {
  return (
    <AuthWrapper requiredRole="Regional Officer">
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
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [isGeneratingRecommendations, setIsGeneratingRecommendations] = useState(false)
  const recGenerationInFlight = useRef<Set<string>>(new Set())
  const [isExporting, setIsExporting] = useState(false)

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
        
        // Get active term window
        const windowResult = await getActiveTermWindow()
        if (windowResult.window) {
          setActiveWindow(windowResult.window)
        }
        
        // Load regional data (pass undefined for periodId - we'll filter by term later if needed)
        await loadRegionalData(userData.region, undefined)
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

  const loadRegionalData = async (regionId: string, periodId?: string) => {
    try {
      // Get regional statistics
      const statsResult = await getRegionalStatistics(regionId, periodId)
      if (statsResult.stats) {
        setStats(statsResult.stats)
      }
      
      // Get reports
      const reportsResult = await getRegionalReports(regionId, periodId)
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
      const rankingsResult = await getRegionalSchoolRankings(regionId, periodId, 500)
      if (rankingsResult.rankings) {
        setRankings(rankingsResult.rankings)
      }
      
      // Get trends
      const trendsResult = await getRegionalTrends(regionId)
      if (trendsResult.trends) {
        setTrends(trendsResult.trends)
      }
      
      // Get category performance
      const perfResult = await getCategoryPerformance(periodId, regionId)
      if (perfResult.performance) {
        setCategoryPerformance(perfResult.performance)
      }
      
      // NEW: Get submission progress breakdown
      const progressResult = await getSubmissionProgressBreakdown(regionId, periodId)
      if (!progressResult.error) {
        setSubmissionProgress(progressResult)
      }
      
      // NEW: Get category gap analysis
      const gapsResult = await getCategoryGapAnalysis(regionId, periodId)
      if (!gapsResult.error) {
        setCategoryGaps(gapsResult)
      }
      
      // NEW: Get most improved schools
      const improvedResult = await getMostImprovedSchools(regionId, 5)
      if (!improvedResult.error) {
        setMostImproved(improvedResult)
      }
      
      // NEW: Get region vs national comparison
      const comparisonResult = await getRegionVsNationalComparison(regionId, periodId)
      if (!comparisonResult.error) {
        setRegionVsNational(comparisonResult)
      }
      
      // NEW: Get category leaders
      const leadersResult = await getCategoryLeaders(regionId, periodId)
      if (!leadersResult.error) {
        setCategoryLeaders(leadersResult.leaders)
      }
      
      // NEW: Get schools needing attention
      const attentionResult = await getSchoolsNeedingAttention(regionId, 400, periodId)
      if (!attentionResult.error) {
        setSchoolsNeedingAttention(attentionResult.schools)
      }
    } catch (error) {
      console.error('Error loading regional data:', error)
    }
  }

  const handleViewReport = async (reportId: string) => {
    try {
      const reportResult = await getReport(reportId)
      if (reportResult.report) {
        setSelectedReport(reportResult.report)

        setRecommendations([])
        setIsGeneratingRecommendations(false)
        setCurrentTab('view')

        if (reportResult.report.status === 'submitted') {
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
    try {
      setRecommendations([])
      setIsGeneratingRecommendations(false)

      const existing = await getRecommendations(reportId)
      if (existing.recommendations && existing.recommendations.length > 0) {
        setRecommendations(existing.recommendations)
        return
      }

      if (!allowAutoBackfill) return

      if (recGenerationInFlight.current.has(reportId)) return
      recGenerationInFlight.current.add(reportId)
      setIsGeneratingRecommendations(true)

      const generated = await getOrGenerateRecommendations(reportId)
      setRecommendations(generated.recommendations || [])
    } catch (err) {
      console.error('Error loading recommendations:', err)
    } finally {
      setIsGeneratingRecommendations(false)
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
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
    <div className="container mx-auto py-6 space-y-6">
      {/* Header with Back Navigation */}
      <div className="flex items-center gap-4 mb-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleBackToDashboard}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Regional Assessment Dashboard</h1>
          <p className="text-muted-foreground flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {regionName || 'Your Region'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeWindow && (
            <Badge variant="outline">
              {activeWindow.academicYear} - {activeWindow.termNumber === 1 ? 'First' : activeWindow.termNumber === 2 ? 'Second' : 'Third'} Term
            </Badge>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportCSV}
            disabled={isExporting || !activeWindow}
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
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="schools" className="gap-2">
            <School className="h-4 w-4" />
            <span className="hidden sm:inline">Schools</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <FileTextIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Reports</span>
          </TabsTrigger>
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
              title="Total Schools"
              value={stats?.totalSchools || 0}
              description="In your region"
              icon={<School className="h-4 w-4 text-muted-foreground" />}
            />
            <StatCard
              title="Submitted"
              value={stats?.submittedCount || 0}
              description={`${stats?.pendingCount || 0} pending`}
              icon={<FileTextIcon className="h-4 w-4 text-muted-foreground" />}
            />
            <StatCard
              title="Average Score"
              value={stats?.averageScore || 0}
              description="Regional average"
              icon={<TrendingUpIcon className="h-4 w-4 text-muted-foreground" />}
            />
            <StatCard
              title="Submission Rate"
              value={stats?.totalSchools 
                ? `${Math.round((stats.submittedCount / stats.totalSchools) * 100)}%`
                : '0%'
              }
              description="For current period"
              icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
            />
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
              filters={{ regionId: regionId || undefined }}
            />
            
            {/* AI At-Risk Schools Alert */}
            <AIAtRiskAlert
              regionId={regionId || undefined}
              regionName={regionName || 'Your Region'}
              threshold={400}
            />
          </div>

          {/* AI Comparative Analysis - Full Width */}
          {regionId && (
            <AIComparativeAnalysis
              type="categories"
              entityIds={['academic', 'attendance', 'infrastructure', 'teaching_quality', 'management', 'student_welfare', 'community']}
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
