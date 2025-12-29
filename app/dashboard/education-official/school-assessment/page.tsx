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
import { AuthWrapper, useAuth } from "@/components/auth-wrapper"
import { 
  FileTextIcon, 
  TrendingUpIcon, 
  Loader2, 
  BarChart3,
  MapPin,
  School,
  Download,
  Globe,
  AlertTriangle,
  Search,
  Trophy,
  Target,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
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
} from "@/features/school-assessment-reports/components"
import { 
  getActivePeriod,
  getAllPeriods,
} from "@/features/school-assessment-reports/actions/assessment-periods"
import { calculateAllCategoryScores } from "@/features/school-assessment-reports/actions/scoring"
import {
  getNationalReports,
  getReport,
} from "@/features/school-assessment-reports/actions/reports"
import { getOrGenerateRecommendations, getRecommendations } from "@/features/school-assessment-reports/actions/recommendations"
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
  getCategoryLeaders,
} from "@/features/school-assessment-reports/actions/analytics"
import { generateBulkExportCSV } from "@/features/school-assessment-reports/actions/exports"
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function EducationOfficialAssessmentPage() {
  return (
    <AuthWrapper requiredRole="Education Official">
      <EducationOfficialAssessmentContent />
    </AuthWrapper>
  )
}

function EducationOfficialAssessmentContent() {
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
  const recGenerationInFlight = useRef<Set<string>>(new Set())
  const [isExporting, setIsExporting] = useState(false)
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
      const [periodsResult, activeResult] = await Promise.all([
        getAllPeriods(),
        getActivePeriod(),
      ])

      if (periodsResult.periods) {
        setAllPeriods(periodsResult.periods)
      }

      if (activeResult.period) {
        setActivePeriod(activeResult.period)
        setSelectedPeriodId(activeResult.period.id)
        // Data will be loaded by the useEffect watching selectedPeriodId
      } else if (periodsResult.periods && periodsResult.periods.length > 0) {
        // Use most recent period if no active one
        setSelectedPeriodId(periodsResult.periods[0].id)
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
      const filters = periodId ? { periodId } : undefined
      
      const [
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
      ] = await Promise.all([
        getNationalStatistics(periodId || undefined),
        getNationalReports(filters),
        getNationalSchoolRankings(periodId || undefined, 100),
        getNationalTrends(9),
        getSubmissionStatusByRegion(periodId || undefined),
        getScoreDistribution(undefined, periodId || undefined),
        getCategoryGapAnalysis(undefined, periodId || undefined),
        getMostImprovedSchools(undefined, 5),
        getUnderperformingRegions(periodId || undefined),
        getSubmissionProgressBreakdown(undefined, periodId || undefined),
        getCategoryLeaders(undefined, periodId || undefined),
      ])

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
      const reportResult = await getReport(reportId)

      if (reportResult.report) {
        setSelectedReport(reportResult.report)
        setRecommendations([])
        setIsGeneratingRecommendations(false)
        router.push(`/dashboard/education-official/school-assessment?tab=details`)

        if (reportResult.report.status === 'submitted') {
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

  async function handleExportCSV() {
    if (!selectedPeriodId) return
    
    setIsExporting(true)
    try {
      const result = await generateBulkExportCSV(selectedPeriodId)
      if (result.csv) {
        // Create and download CSV
        const blob = new Blob([result.csv], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `national-assessment-export-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        
        toast({
          title: "Export Successful",
          description: "Assessment data has been exported to CSV.",
        })
      } else {
        toast({
          title: "Export Failed",
          description: result.error || "Failed to export data.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error exporting:', error)
    } finally {
      setIsExporting(false)
    }
  }

  function handleTabChange(value: string) {
    router.push(`/dashboard/education-official/school-assessment?tab=${value}`)
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
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading assessment data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
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
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" />
            National School Assessment
          </h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
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
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                {allPeriods.map((period) => (
                  <SelectItem key={period.id} value={period.id}>
                    {period.academicYear} - {period.termName}
                    {period.id === activePeriod?.id && " (Active)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            variant="outline"
            onClick={handleExportCSV}
            disabled={isExporting || !reports.length}
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
      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="regions" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Regions</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileTextIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Reports</span>
          </TabsTrigger>
          <TabsTrigger value="underperforming" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">Needs Attention</span>
          </TabsTrigger>
          {selectedReport && (
            <TabsTrigger value="details" className="flex items-center gap-2">
              <FileTextIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Details</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Regions</CardTitle>
                <Globe className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalRegions || 11}</div>
                <p className="text-xs text-muted-foreground">Across the country</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Schools</CardTitle>
                <School className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalSchools || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.submittedCount || 0} submitted assessments
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">National Average</CardTitle>
                <TrendingUpIcon className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.nationalAverageScore || 0}</div>
                <p className="text-xs text-muted-foreground">Average assessment score</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Top Region</CardTitle>
                <Trophy className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.topPerformingRegion?.regionName || 'N/A'}</div>
                <p className="text-xs text-muted-foreground">
                  Score: {stats?.topPerformingRegion?.averageScore || 0}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Historical Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>National Performance Trend</CardTitle>
              <CardDescription>Historical average scores across assessment periods</CardDescription>
            </CardHeader>
            <CardContent>
              {trends.length > 0 ? (
                <TrendChart data={trends} />
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  No historical data available yet
                </div>
              )}
            </CardContent>
          </Card>

          {/* Charts Row */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>National Rating Distribution</CardTitle>
                <CardDescription>Schools by performance level</CardDescription>
              </CardHeader>
              <CardContent>
                {stats?.ratingDistribution && Object.keys(stats.ratingDistribution).length > 0 ? (
                  <RatingDistributionChart distribution={stats.ratingDistribution} />
                ) : (
                  <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>National Performance Profile</CardTitle>
                <CardDescription>Average scores by category</CardDescription>
              </CardHeader>
              <CardContent>
                {stats?.categoryAverages && Object.keys(stats.categoryAverages).length > 0 ? (
                  <CategoryRadarChart scores={stats.categoryAverages} />
                ) : (
                  <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Completion Rate and Score Distribution */}
          <div className="grid gap-6 md:grid-cols-2">
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

          {/* Category Leaders Table */}
          {categoryLeaders && categoryLeaders.length > 0 && (
            <CategoryLeadersTable
              leaders={categoryLeaders}
              title="Category Leaders"
            />
          )}

          {/* Top Schools */}
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Schools Nationally</CardTitle>
              <CardDescription>Highest performing schools this term</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>School</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rankings.slice(0, 10).map((school: any, index: number) => (
                    <TableRow 
                      key={school.schoolId}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        const report = reports.find((r: any) => r.schoolId === school.schoolId)
                        if (report) handleViewReport(report.id)
                      }}
                    >
                      <TableCell>
                        <Badge variant={index < 3 ? "default" : "secondary"}>
                          {index + 1}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{school.schoolName}</TableCell>
                      <TableCell>{school.regionName}</TableCell>
                      <TableCell>{school.totalScore}</TableCell>
                      <TableCell>
                        <Badge variant={getRatingVariant(school.ratingLevel)}>
                          {formatRating(school.ratingLevel)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {rankings.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No school rankings available yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

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
          
          {/* Region Comparison Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Regional Comparison</CardTitle>
              <CardDescription>Average scores by region</CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.regionComparison && stats.regionComparison.length > 0 ? (
                <RegionComparisonChart regions={stats.regionComparison} />
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  No regional data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submission Status */}
          <Card>
            <CardHeader>
              <CardTitle>Submission Status by Region</CardTitle>
              <CardDescription>Report submission progress</CardDescription>
            </CardHeader>
            <CardContent>
              {submissionStatus.length > 0 ? (
                <SubmissionStatusChart data={submissionStatus} />
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  No submission data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Regional Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {submissionStatus.map((region: any) => (
              <Card 
                key={region.regionId} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  setRegionFilter(region.regionName)
                  handleTabChange('reports')
                }}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{region.regionName}</CardTitle>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Schools</p>
                      <p className="text-xl font-bold">{region.totalSchools}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Submitted</p>
                      <p className="text-xl font-bold text-green-600">{region.submittedCount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Pending</p>
                      <p className="text-xl font-bold text-amber-600">{region.pendingCount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Progress</p>
                      <p className="text-xl font-bold">
                        {region.totalSchools > 0 
                          ? Math.round((region.submittedCount / region.totalSchools) * 100)
                          : 0}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Assessment Reports</CardTitle>
              <CardDescription>
                {filteredReports.length} of {reports.length} reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by school or region..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={regionFilter} onValueChange={setRegionFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Regions" />
                  </SelectTrigger>
                  <SelectContent>
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>School</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report: any) => (
                    <TableRow 
                      key={report.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleViewReport(report.id)}
                    >
                      <TableCell className="font-medium">
                        {report.school?.name || report.schoolName || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        {report.school?.region?.name || report.regionName || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={report.status === 'submitted' ? 'default' : 'secondary'}>
                          {report.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{report.totalScore || '-'}</TableCell>
                      <TableCell>
                        {report.ratingLevel && (
                          <Badge variant={getRatingVariant(report.ratingLevel)}>
                            {formatRating(report.ratingLevel)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {report.submittedAt 
                          ? new Date(report.submittedAt).toLocaleDateString()
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredReports.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No reports found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Underperforming Schools Tab */}
        <TabsContent value="underperforming" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    Schools Needing Attention
                  </CardTitle>
                  <CardDescription>
                    Schools scoring below the threshold require additional support
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Score below:</span>
                  <Select 
                    value={scoreThreshold.toString()} 
                    onValueChange={(v) => setScoreThreshold(parseInt(v))}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
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
                <Card className="bg-red-50 border-red-200">
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <p className="text-sm text-red-600 font-medium">Needs Improvement</p>
                      <p className="text-3xl font-bold text-red-700">
                        {reports.filter((r: any) => r.totalScore && r.totalScore < 400).length}
                      </p>
                      <p className="text-xs text-red-500">Score below 400</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-amber-50 border-amber-200">
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <p className="text-sm text-amber-600 font-medium">Satisfactory</p>
                      <p className="text-3xl font-bold text-amber-700">
                        {reports.filter((r: any) => r.totalScore && r.totalScore >= 400 && r.totalScore < 550).length}
                      </p>
                      <p className="text-xs text-amber-500">Score 400-549</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <p className="text-sm text-green-600 font-medium">Above Threshold</p>
                      <p className="text-3xl font-bold text-green-700">
                        {reports.filter((r: any) => r.totalScore && r.totalScore >= scoreThreshold).length}
                      </p>
                      <p className="text-xs text-green-500">Score {scoreThreshold}+</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by school or region..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={regionFilter} onValueChange={setRegionFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Regions" />
                  </SelectTrigger>
                  <SelectContent>
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>School</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Gap to Threshold</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUnderperforming.map((report: any) => (
                    <TableRow 
                      key={report.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleViewReport(report.id)}
                    >
                      <TableCell className="font-medium">
                        {report.school?.name || report.schoolName || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        {report.school?.region?.name || report.regionName || 'Unknown'}
                      </TableCell>
                      <TableCell className="font-bold text-red-600">
                        {report.totalScore || 0}
                      </TableCell>
                      <TableCell>
                        {report.ratingLevel && (
                          <Badge variant={getRatingVariant(report.ratingLevel)}>
                            {formatRating(report.ratingLevel)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-red-600">
                          <ArrowDownRight className="h-4 w-4" />
                          {scoreThreshold - (report.totalScore || 0)} points
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredUnderperforming.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        {reports.length === 0 
                          ? "No submitted reports yet" 
                          : "No schools below the threshold - great job!"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
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
              isGeneratingRecommendations={isGeneratingRecommendations && selectedReport?.status === 'submitted'}
            />
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
      return 'default'
    case 'very_good':
      return 'default'
    case 'good':
      return 'secondary'
    case 'satisfactory':
      return 'outline'
    case 'needs_improvement':
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
    default:
      return rating
  }
}
