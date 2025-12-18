"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { AuthWrapper, useAuth } from "@/components/auth-wrapper"
import { 
  FileTextIcon, 
  TrendingUpIcon, 
  Loader2, 
  PlusCircleIcon,
  ClockIcon,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  Award,
  Target,
  Calendar,
  ChevronLeft,
} from "lucide-react"
import { getUserSchoolInfo } from "@/app/actions/auth"
import { 
  AssessmentReportForm, 
  ReportView, 
  ReportsList,
  TrendChart,
  CategoryRadarChart,
  TAPSCategoryRadarChart,
  StatCard,
  EnhancedTrendChart,
  CategoryProgressCards,
  TAPSCategoryProgressCards,
  EnhancedStatCard,
  MilestoneTracker,
  CategoryBarChart,
  TAPSCategoryBarChart,
  RankingPositionCard,
  CategoryStrengthCard,
  AIInsightCard,
  AIRecommendationPanel,
  AIActionPlanCard,
} from "@/features/school-assessment-reports/components"
import { 
  getActiveTermWindow,
  isSubmissionWindowOpen 
} from "@/features/school-assessment-reports/actions/assessment-periods"
import {
  getSchoolReports,
  getReport
} from "@/features/school-assessment-reports/actions/reports"
import { getOrGenerateRecommendations } from "@/features/school-assessment-reports/actions/recommendations"
import { 
  getSchoolTrends,
  getSchoolRankingPosition,
  getCategoryStrengthAnalysis,
} from "@/features/school-assessment-reports/actions/analytics"
import { calculateAllCategoryScores } from "@/features/school-assessment-reports/actions/scoring"
import { TAPS_RATING_THRESHOLDS, TAPS_TOTAL_MAX_SCORE, TOTAL_MAX_SCORE } from "@/features/school-assessment-reports/types"
import type { CurrentTermWindow, RatingLevel, TAPSRatingGrade } from "@/features/school-assessment-reports/types"
import { getSchoolTypeFromEmail, getSchoolTypeFromSchoolLevel } from "@/lib/school-type"

// ============================================================================
// TYPES
// ============================================================================

interface SchoolInfo {
  id: string
  name: string
  level: string
  region?: string
  regionName?: string
}

interface ReportData {
  id: string
  schoolId: string
  schoolName: string
  regionName: string
  academicYear: string
  termName: string
  status: 'draft' | 'submitted' | 'expired_draft'
  totalScore: number | null
  ratingLevel: RatingLevel | null
  submittedAt: string | null
  createdAt: string
  updatedAt: string
  categoryScores?: any
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function HeadTeacherAssessmentPage() {
  return (
    <AuthWrapper requiredRole="Head Teacher">
      <HeadTeacherAssessmentContent />
    </AuthWrapper>
  )
}

function HeadTeacherAssessmentContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { user } = useAuth()
  
  const currentTab = searchParams.get('tab') || 'overview'

  const handleBackToDashboard = () => {
    router.push('/dashboard/head-teacher')
  }
  
  // State
  const [loading, setLoading] = useState(true)
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null)
  const [activeWindow, setActiveWindow] = useState<CurrentTermWindow | null>(null)
  const [submissionOpen, setSubmissionOpen] = useState(false)
  const [reports, setReports] = useState<ReportData[]>([])
  const [currentReport, setCurrentReport] = useState<ReportData | null>(null)
  const [selectedReport, setSelectedReport] = useState<any>(null)
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [isGeneratingRecommendations, setIsGeneratingRecommendations] = useState(false)
  const [trends, setTrends] = useState<any[]>([])
  
  // New metrics state
  const [rankingData, setRankingData] = useState<{
    regionalRank: number | null
    regionalTotal: number
    nationalRank: number | null
    nationalTotal: number
    nationalPercentile: number | null
    regionName: string
  } | null>(null)
  const [categoryStrength, setCategoryStrength] = useState<{
    strongest: { category: string; label: string; score: number; maxScore: number; percentage: number } | null
    weakest: { category: string; label: string; score: number; maxScore: number; percentage: number } | null
  } | null>(null)

  // ============================================================================
  // DATA LOADING
  // ============================================================================
  
  useEffect(() => {
    loadInitialData()
  }, [])
  
  const loadInitialData = async () => {
    setLoading(true)
    try {
      // Get school info
      const schoolResult = await getUserSchoolInfo()
      if (schoolResult.error || !schoolResult.school) {
        toast({ title: 'Error', description: schoolResult.error || 'Could not find your school.', variant: 'destructive' })
        setLoading(false)
        return
      }
      
      const school = schoolResult.school
      setSchoolInfo({
        id: school.id,
        name: school.name,
        level: school.level,
        region: school.region,
        regionName: school.region || '',
      })
      
      // Get active submission window
      const windowResult = await getActiveTermWindow()
      if (windowResult.window) {
        setActiveWindow(windowResult.window)
        setSubmissionOpen(windowResult.window.isOpen)
      } else {
        // Check if submissions are open even without active window
        const submissionResult = await isSubmissionWindowOpen()
        setSubmissionOpen(submissionResult.isOpen)
        if (submissionResult.window) {
          setActiveWindow(submissionResult.window)
        }
      }
      
      // Get reports for this school
      const reportsResult = await getSchoolReports(school.id)
      if (reportsResult.reports) {
        const mappedReports = reportsResult.reports.map((r: any) => ({
          id: r.id,
          schoolId: r.schoolId,
          schoolName: school.name,
          regionName: school.region || '',
          academicYear: r.academicYear || '',
          termName: r.termName || '',
          status: r.status,
          totalScore: r.totalScore,
          ratingLevel: r.ratingLevel,
          submittedAt: r.submittedAt,
          createdAt: r.createdAt || '',
          updatedAt: r.updatedAt || '',
        }))
        setReports(mappedReports)
          
          // Find current term report based on academic year and term
          const currentWindowResult = await getActiveTermWindow()
          if (currentWindowResult.window) {
            const termNumber = currentWindowResult.window.termNumber
            const termName = termNumber === 1 ? 'First Term' : termNumber === 2 ? 'Second Term' : 'Third Term'
            const current = reportsResult.reports.find(
              (r: any) => r.academicYear === currentWindowResult.window!.academicYear && r.termName === termName
            )
            if (current) {
              setCurrentReport({
                id: current.id,
                schoolId: current.schoolId,
                schoolName: school.name,
                regionName: school.region || '',
                academicYear: currentWindowResult.window.academicYear,
                termName: termName,
                status: current.status,
                totalScore: current.totalScore,
                ratingLevel: current.ratingLevel,
                submittedAt: current.submittedAt,
                createdAt: '',
                updatedAt: '',
              })
              
              // Fetch detailed report for category scores if submitted
              if (current.status === 'submitted') {
                const detailedResult = await getReport(current.id)
                if (detailedResult.report) {
                  setSelectedReport(detailedResult.report)

                  // Load recommendations (non-blocking)
                  setRecommendations([])
                  setIsGeneratingRecommendations(true)
                  void getOrGenerateRecommendations(current.id)
                    .then((recResult) => {
                      setRecommendations(recResult.recommendations || [])
                    })
                    .catch((err) => console.error('Error loading recommendations:', err))
                    .finally(() => setIsGeneratingRecommendations(false))
                  
                  // Fetch category strength analysis
                  const strengthResult = await getCategoryStrengthAnalysis(current.id)
                  if (!strengthResult.error) {
                    setCategoryStrength({
                      strongest: strengthResult.strongest,
                      weakest: strengthResult.weakest,
                    })
                  }
                }
              }
            }
          }
        }
        
        // Fetch school ranking position
        const rankingResult = await getSchoolRankingPosition(school.id)
        if (!rankingResult.error) {
          setRankingData(rankingResult)
        }
        
        // Get trends - build from reports if period-based trends aren't available
        const trendsResult = await getSchoolTrends(school.id)
        if (trendsResult.trends && trendsResult.trends.length > 0) {
          setTrends(trendsResult.trends)
        } else if (reportsResult.reports && reportsResult.reports.length > 0) {
          // Build trends from reports directly
          const submittedReports = reportsResult.reports
            .filter((r: any) => r.status === 'submitted' && r.totalScore)
            .sort((a: any, b: any) => new Date(a.submittedAt || a.createdAt).getTime() - new Date(b.submittedAt || b.createdAt).getTime())
          
          const builtTrends = submittedReports.map((r: any) => ({
            period: `${r.academicYear} - ${r.termName}`,
            academicYear: r.academicYear || '',
            termName: r.termName || '',
            averageScore: r.totalScore || 0,
            submissionCount: 1,
          }))
          setTrends(builtTrends)
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

  const handleViewReport = async (reportId: string) => {
    try {
      const reportResult = await getReport(reportId)
      if (reportResult.report) {
        setSelectedReport(reportResult.report)
        setCurrentTab('view')
        setRecommendations([])
        setIsGeneratingRecommendations(false)
        
        // Load recommendations if submitted
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
    router.push(`/dashboard/school-assessment?${params.toString()}`)
  }

  const handleFormSuccess = () => {
    loadInitialData()
    setCurrentTab('overview')
    toast({
      title: 'Success',
      description: 'Your assessment report has been submitted!',
    })
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

  if (!schoolInfo) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>No School Assigned</AlertTitle>
        <AlertDescription>
          Your account is not linked to a school. Please contact an administrator.
        </AlertDescription>
      </Alert>
    )
  }

  // Calculate latest scores for charts
  const latestReportCandidates = reports
    .filter(r => r.status === 'submitted' && typeof r.totalScore === 'number')
    .sort((a, b) => {
      const aTime = new Date(a.submittedAt || a.createdAt).getTime()
      const bTime = new Date(b.submittedAt || b.createdAt).getTime()
      return aTime - bTime
    })

  const latestReport = latestReportCandidates.length > 0 ? latestReportCandidates[latestReportCandidates.length - 1] : undefined

  const reportLooksLikeTAPS = (report: any): boolean => {
    if (!report) return false
    if (report.isTAPS === true) return true
    if (report.tapsRatingGrade) return true
    if (report.tapsCategoryScores && Object.keys(report.tapsCategoryScores).length > 0) return true
    if (report.tapsTotalScore != null) return true
    return false
  }

  const accountSchoolType = getSchoolTypeFromSchoolLevel(schoolInfo.level) || getSchoolTypeFromEmail(user?.email)?.type || 'primary'
  const isTAPS = selectedReport ? reportLooksLikeTAPS(selectedReport) : accountSchoolType === 'secondary'
  const totalMaxScore = isTAPS ? TAPS_TOTAL_MAX_SCORE : TOTAL_MAX_SCORE

  const latestScoreNumber = typeof latestReport?.totalScore === 'number' ? latestReport.totalScore : null

  const latestTAPSGrade: TAPSRatingGrade | null = (() => {
    if (!isTAPS) return null
    const grade = selectedReport?.tapsRatingGrade as TAPSRatingGrade | undefined
    if (grade) return grade
    if (latestScoreNumber === null) return null
    if (latestScoreNumber >= TAPS_RATING_THRESHOLDS.A.min) return 'A'
    if (latestScoreNumber >= TAPS_RATING_THRESHOLDS.B.min) return 'B'
    if (latestScoreNumber >= TAPS_RATING_THRESHOLDS.C.min) return 'C'
    if (latestScoreNumber >= TAPS_RATING_THRESHOLDS.D.min) return 'D'
    return 'E'
  })()

  const latestTAPSLabel = latestTAPSGrade ? TAPS_RATING_THRESHOLDS[latestTAPSGrade].label : null

  const tapsStrength = (() => {
    if (!isTAPS || !selectedReport) return null

    const scores = (selectedReport.tapsCategoryScores || {}) as Record<string, number>
    const resolvedScores: Record<string, { label: string; score: number; maxScore: number; percentage: number }> = {
      school_inputs: { label: 'School Inputs & Operations', score: Number(scores.school_inputs ?? scores.school_inputs_operations ?? 0), maxScore: 80, percentage: 0 },
      leadership: { label: 'Leadership', score: Number(scores.leadership ?? 0), maxScore: 30, percentage: 0 },
      academics: { label: 'Academics', score: Number(scores.academics ?? 0), maxScore: 200, percentage: 0 },
      teacher_development: { label: 'Teacher Development', score: Number(scores.teacher_development ?? 0), maxScore: 20, percentage: 0 },
      health_safety: { label: 'Health & Safety', score: Number(scores.health_safety ?? 0), maxScore: 50, percentage: 0 },
      school_culture: { label: 'School Culture', score: Number(scores.school_culture ?? 0), maxScore: 70, percentage: 0 },
    }

    const entries = Object.entries(resolvedScores).map(([category, info]) => {
      const percentage = info.maxScore > 0 ? Math.round((info.score / info.maxScore) * 100) : 0
      return { category, ...info, percentage }
    })

    if (entries.length === 0) return null
    const strongest = entries.reduce((best, current) => (current.percentage > best.percentage ? current : best), entries[0])
    const weakest = entries.reduce((worst, current) => (current.percentage < worst.percentage ? current : worst), entries[0])

    return {
      strongest,
      weakest,
    }
  })()

  // Use the scoring functions to derive demo category totals from raw JSON.
  // This supports older submitted reports where `{ total }` was not persisted in JSONB.
  const categoryScores = selectedReport
    ? calculateAllCategoryScores({
        academic: selectedReport.academicScores || {},
        attendance: selectedReport.attendanceScores || {},
        infrastructure: selectedReport.infrastructureScores || {},
        teachingQuality: selectedReport.teachingQualityScores || {},
        management: selectedReport.managementScores || {},
        studentWelfare: selectedReport.studentWelfareScores || {},
        community: selectedReport.communityScores || {},
      })
    : {
        academic: 0,
        attendance: 0,
        infrastructure: 0,
        teaching_quality: 0,
        management: 0,
        student_welfare: 0,
        community: 0,
      }

  const tapsCategoryScores = isTAPS
    ? {
        school_inputs: Number(
          (selectedReport?.tapsCategoryScores as any)?.school_inputs ??
            (selectedReport?.tapsCategoryScores as any)?.school_inputs_operations ??
            selectedReport?.tapsSchoolInputsScores?.total ??
            0
        ),
        leadership: Number((selectedReport?.tapsCategoryScores as any)?.leadership ?? selectedReport?.tapsLeadershipScores?.total ?? 0),
        academics: Number((selectedReport?.tapsCategoryScores as any)?.academics ?? selectedReport?.tapsAcademicsScores?.total ?? 0),
        teacher_development: Number(
          (selectedReport?.tapsCategoryScores as any)?.teacher_development ?? selectedReport?.tapsTeacherDevelopmentScores?.total ?? 0
        ),
        health_safety: Number((selectedReport?.tapsCategoryScores as any)?.health_safety ?? selectedReport?.tapsHealthSafetyScores?.total ?? 0),
        school_culture: Number((selectedReport?.tapsCategoryScores as any)?.school_culture ?? selectedReport?.tapsSchoolCultureScores?.total ?? 0),
      }
    : null

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
          <h1 className="text-2xl font-bold">School Assessment</h1>
          <p className="text-muted-foreground">{schoolInfo.name}</p>
        </div>
        {activeWindow && (
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {activeWindow.academicYear} - {activeWindow.termNumber === 1 ? 'First' : activeWindow.termNumber === 2 ? 'Second' : 'Third'} Term
            </Badge>
            <Badge variant={submissionOpen ? "default" : "secondary"}>
              {submissionOpen ? `Open (${activeWindow.daysRemaining || 0} days left)` : "Closed"}
            </Badge>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="submit" className="gap-2">
            <PlusCircleIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Submit Report</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <FileTextIcon className="h-4 w-4" />
            <span className="hidden sm:inline">History</span>
          </TabsTrigger>
          <TabsTrigger value="view" className="gap-2" disabled={!selectedReport}>
            <TrendingUpIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Details</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Status Alert */}
          {!submissionOpen && (
            <Alert>
              <ClockIcon className="h-4 w-4" />
              <AlertTitle>Submissions Closed</AlertTitle>
              <AlertDescription>
                The submission window is currently closed. Please wait for the next term's submission window to open.
              </AlertDescription>
            </Alert>
          )}

          {submissionOpen && !currentReport && (
            <Alert className="border-blue-200 bg-blue-50">
              <PlusCircleIcon className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-800">Report Required</AlertTitle>
              <AlertDescription className="text-blue-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <span>You haven't started your assessment report for this term.</span>
                <Button size="sm" onClick={() => setCurrentTab('submit')} className="bg-blue-600 hover:bg-blue-700">
                  Start Report
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {currentReport?.status === 'draft' && submissionOpen && (
            <Alert className="border-amber-200 bg-amber-50">
              <ClockIcon className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800">Draft In Progress</AlertTitle>
              <AlertDescription className="text-amber-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <span>You have an unsubmitted draft report.</span>
                <Button size="sm" onClick={() => setCurrentTab('submit')} className="bg-amber-600 hover:bg-amber-700">
                  Continue Editing
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {currentReport?.status === 'submitted' && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Report Submitted</AlertTitle>
              <AlertDescription className="text-green-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <span>Your assessment report for this term has been submitted.</span>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="border-green-600 text-green-700 hover:bg-green-100"
                  onClick={() => handleViewReport(currentReport.id)}
                >
                  View Report
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Enhanced Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <EnhancedStatCard
              title="Latest Score"
              value={latestReport?.totalScore || '-'}
              subtitle={`/${totalMaxScore}`}
              description={`Out of ${totalMaxScore} points`}
              icon={<TrendingUpIcon className="h-5 w-5 text-blue-600" />}
              variant={
                latestScoreNumber === null
                  ? 'default'
                  : isTAPS
                    ? (latestTAPSGrade === 'A' || latestTAPSGrade === 'B')
                      ? 'success'
                      : latestTAPSGrade === 'C'
                        ? 'warning'
                        : 'danger'
                    : latestScoreNumber >= 700
                      ? 'success'
                      : latestScoreNumber >= 400
                        ? 'warning'
                        : 'danger'
              }
              trend={trends.length >= 2 ? {
                value: Math.round(((trends[trends.length - 1]?.averageScore || 0) - (trends[trends.length - 2]?.averageScore || 0)) / 
                       Math.max(1, trends[trends.length - 2]?.averageScore || 1) * 100),
                label: "vs last term",
                isPositive: (trends[trends.length - 1]?.averageScore || 0) >= (trends[trends.length - 2]?.averageScore || 0)
              } : undefined}
            />
            <EnhancedStatCard
              title="Latest Rating"
              value={
                isTAPS
                  ? (latestTAPSLabel || '-')
                  : latestReport?.ratingLevel
                    ? (latestReport.ratingLevel === 'needs_improvement' ? 'Needs Improvement' :
                      latestReport.ratingLevel === 'very_good' ? 'Very Good' :
                      latestReport.ratingLevel.charAt(0).toUpperCase() + latestReport.ratingLevel.slice(1))
                    : '-'
              }
              description="Overall performance level"
              icon={<Award className="h-5 w-5 text-amber-500" />}
              variant={
                isTAPS
                  ? (latestTAPSGrade === 'A' || latestTAPSGrade === 'B')
                    ? 'success'
                    : latestTAPSGrade === 'C'
                      ? 'warning'
                      : latestTAPSGrade
                        ? 'danger'
                        : 'default'
                  : latestReport?.ratingLevel === 'outstanding' || latestReport?.ratingLevel === 'very_good'
                    ? 'success'
                    : latestReport?.ratingLevel === 'good' || latestReport?.ratingLevel === 'satisfactory'
                      ? 'warning'
                      : latestReport?.ratingLevel === 'needs_improvement'
                        ? 'danger'
                        : 'default'
              }
            />
            <EnhancedStatCard
              title="Reports Submitted"
              value={reports.filter(r => r.status === 'submitted').length}
              description="Total assessments completed"
              icon={<FileTextIcon className="h-5 w-5 text-green-600" />}
              variant="info"
            />
            <EnhancedStatCard
              title="Current Term"
              value={activeWindow ? `${activeWindow.termNumber === 1 ? 'First' : activeWindow.termNumber === 2 ? 'Second' : 'Third'} Term` : 'None'}
              description={activeWindow?.academicYear || ''}
              icon={<Calendar className="h-5 w-5 text-purple-600" />}
              progress={submissionOpen && activeWindow ? {
                value: Math.max(0, (activeWindow.daysRemaining || 0)),
                max: 15, // Assuming 15 day window
                label: `${activeWindow.daysRemaining || 0} days left`
              } : undefined}
            />
          </div>

          {/* Main Charts Section */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Performance Trend Chart */}
            <EnhancedTrendChart 
              data={trends} 
              title="Performance Progress"
              description="Track your school's assessment scores over time"
              showTarget={true}
              targetScore={isTAPS ? TAPS_RATING_THRESHOLDS.B.min : 700}
              variant={isTAPS ? 'taps' : 'demo'}
            />
            
            {/* Category Radar Chart */}
            {latestReport && (
              isTAPS && tapsCategoryScores ? (
                <TAPSCategoryRadarChart
                  scores={tapsCategoryScores}
                  title="Performance Profile"
                  description="Category breakdown from your latest assessment"
                />
              ) : (
                <CategoryRadarChart 
                  scores={categoryScores}
                  title="Performance Profile"
                  description="Category breakdown from your latest assessment"
                />
              )
            )}
          </div>

          {/* New Metrics Row - Ranking and Category Strength */}
          {latestReport && (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Ranking Position */}
              {rankingData && (
                <RankingPositionCard
                  regionalRank={rankingData.regionalRank}
                  regionalTotal={rankingData.regionalTotal}
                  nationalRank={rankingData.nationalRank}
                  nationalTotal={rankingData.nationalTotal}
                  nationalPercentile={rankingData.nationalPercentile}
                  regionName={rankingData.regionName || schoolInfo?.regionName || 'Your Region'}
                  title="Your Ranking"
                />
              )}
              
              {/* Category Strength Analysis */}
              {(isTAPS ? tapsStrength : categoryStrength) && (
                <CategoryStrengthCard
                  strongest={(isTAPS ? tapsStrength : categoryStrength)!.strongest}
                  weakest={(isTAPS ? tapsStrength : categoryStrength)!.weakest}
                  title="Category Highlights"
                />
              )}
            </div>
          )}

          {/* Category Progress Cards */}
          {latestReport && (
            <div className="grid gap-6 lg:grid-cols-2">
              {isTAPS && tapsCategoryScores ? (
                <TAPSCategoryProgressCards
                  scores={tapsCategoryScores}
                  title="Category Performance"
                  description="Detailed breakdown by assessment category (sorted by lowest to highest)"
                />
              ) : (
                <CategoryProgressCards 
                  scores={categoryScores}
                  title="Category Performance"
                  description="Detailed breakdown by assessment category (sorted by lowest to highest)"
                />
              )}
              
              {/* Milestone Tracker */}
              <MilestoneTracker
                currentScore={latestReport.totalScore || 0}
                reports={reports
                  .filter(r => r.status === 'submitted' && r.totalScore)
                  .map(r => ({
                    score: r.totalScore || 0,
                    period: `${r.academicYear} - ${r.termName}`,
                    date: r.submittedAt || r.createdAt
                  }))}
                title="Achievement Progress"
                variant={isTAPS ? 'taps' : 'demo'}
                maxScore={totalMaxScore}
              />
            </div>
          )}

          {/* AI Insights Section */}
          {latestReport && selectedReport && (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* AI Performance Insight */}
              <AIInsightCard
                type="overview"
                title="AI Performance Analysis"
                description="Get AI-powered insights about your school's assessment"
                filters={{ schoolId: schoolInfo?.id }}
              />
              
              {/* AI Recommendations */}
              <AIRecommendationPanel
                reportId={selectedReport.id}
                schoolName={schoolInfo?.name || 'Your School'}
              />
            </div>
          )}

          {/* AI Action Plan - Full Width */}
          {latestReport && selectedReport && (
            <AIActionPlanCard
              schoolId={schoolInfo?.id || ''}
              reportId={selectedReport.id}
              schoolName={schoolInfo?.name || 'Your School'}
            />
          )}

          {/* No Data State */}
          {!latestReport && reports.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <FileTextIcon className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Assessment Reports Yet</h3>
                <p className="text-muted-foreground mb-4 max-w-md">
                  Submit your first school assessment report to start tracking your school's performance and see detailed analytics here.
                </p>
                {submissionOpen && (
                  <Button onClick={() => setCurrentTab('submit')}>
                    <PlusCircleIcon className="h-4 w-4 mr-2" />
                    Create Your First Report
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Submit Tab */}
        <TabsContent value="submit">
          {!submissionOpen ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Cannot Submit</AlertTitle>
              <AlertDescription>
                The submission window is currently closed. Please wait for the next submission window to open.
              </AlertDescription>
            </Alert>
          ) : currentReport?.status === 'submitted' ? (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Already Submitted</AlertTitle>
              <AlertDescription>
                You have already submitted a report for this period. View it in the History tab.
              </AlertDescription>
            </Alert>
          ) : (
            <AssessmentReportForm
              schoolId={schoolInfo.id}
              schoolName={schoolInfo.name}
              regionName={schoolInfo.regionName || ''}
              schoolLevel={schoolInfo.level}
              userId={user?.id || ''}
              userEmail={user?.email}
              existingReportId={currentReport?.id}
              onSuccess={handleFormSuccess}
            />
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          {/* Performance Over Time Chart */}
          {trends.length > 0 && (
            <EnhancedTrendChart 
              data={trends} 
              title="Your Performance Journey"
              description="Track how your school's assessment scores have evolved over time"
              showTarget={true}
              targetScore={700}
              height={300}
            />
          )}

          {/* Category Bar Chart - if we have reports */}
          {latestReport && trends.length > 1 && (
            <div className="grid gap-6 lg:grid-cols-2">
              <CategoryBarChart 
                scores={categoryScores}
                title="Latest Category Scores"
                description="Performance breakdown by category"
              />
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    Performance Summary
                  </CardTitle>
                  <CardDescription>Key metrics from your assessment history</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-emerald-50 rounded-lg">
                      <p className="text-xs text-emerald-600 font-medium">Best Score</p>
                      <p className="text-2xl font-bold text-emerald-700">
                        {Math.max(...reports.filter(r => r.status === 'submitted').map(r => r.totalScore || 0))}
                      </p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-600 font-medium">Average Score</p>
                      <p className="text-2xl font-bold text-blue-700">
                        {Math.round(
                          reports
                            .filter(r => r.status === 'submitted')
                            .reduce((sum, r) => sum + (r.totalScore || 0), 0) / 
                          Math.max(1, reports.filter(r => r.status === 'submitted').length)
                        )}
                      </p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <p className="text-xs text-purple-600 font-medium">Reports Submitted</p>
                      <p className="text-2xl font-bold text-purple-700">
                        {reports.filter(r => r.status === 'submitted').length}
                      </p>
                    </div>
                    <div className="p-4 bg-amber-50 rounded-lg">
                      <p className="text-xs text-amber-600 font-medium">Improvement</p>
                      <p className="text-2xl font-bold text-amber-700">
                        {trends.length >= 2 ? 
                          `${(trends[trends.length - 1]?.averageScore || 0) - (trends[0]?.averageScore || 0) >= 0 ? '+' : ''}${(trends[trends.length - 1]?.averageScore || 0) - (trends[0]?.averageScore || 0)}` 
                          : '-'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Reports List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileTextIcon className="h-5 w-5" />
                Assessment Reports
              </CardTitle>
              <CardDescription>{reports.length} of {reports.length} reports</CardDescription>
            </CardHeader>
            <CardContent>
              <ReportsList
                reports={reports.map(r => ({
                  ...r,
                  ratingLevel: r.ratingLevel as RatingLevel | null,
                }))}
                onViewReport={handleViewReport}
                showSchoolColumn={false}
                showRegionColumn={false}
                emptyMessage="No assessment reports found. Start by submitting your first report."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* View Details Tab */}
        <TabsContent value="view">
          {selectedReport ? (
            <ReportView
              report={{
                id: selectedReport.id,
                schoolName: schoolInfo.name,
                regionName: schoolInfo.regionName || '',
                academicYear: selectedReport.academicYear || activeWindow?.academicYear || '',
                termName: selectedReport.termName || (activeWindow ? `${activeWindow.termNumber === 1 ? 'First' : activeWindow.termNumber === 2 ? 'Second' : 'Third'} Term` : ''),
                totalScore: selectedReport.totalScore || 0,
                ratingLevel: selectedReport.ratingLevel || 'needs_improvement',
                submittedAt: selectedReport.submittedAt || '',
                // TAPS fields for secondary schools
                isTAPS: reportLooksLikeTAPS(selectedReport),
                tapsRatingGrade: selectedReport.tapsRatingGrade || undefined,
                tapsCategoryScores: tapsCategoryScores || undefined,
                categoryScores: {
                  academic: categoryScores.academic || 0,
                  attendance: categoryScores.attendance || 0,
                  infrastructure: categoryScores.infrastructure || 0,
                  teaching_quality: categoryScores.teaching_quality || 0,
                  management: categoryScores.management || 0,
                  student_welfare: categoryScores.student_welfare || 0,
                  community: categoryScores.community || 0,
                },
              }}
              recommendations={recommendations}
              isGeneratingRecommendations={isGeneratingRecommendations && selectedReport?.status === 'submitted'}
              showExportButtons={selectedReport.status === 'submitted'}
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
