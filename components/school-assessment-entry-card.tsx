"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  ClipboardCheck, 
  TrendingUp, 
  TrendingDown,
  Award,
  ArrowRight,
  Sparkles,
  School,
  BarChart3,
  Star,
  AlertTriangle,
  CheckCircle2,
  Minus,
  Target,
  Zap,
  Globe,
  MapPin,
  Clock,
  Trophy,
  AlertCircle,
  Flame,
  ArrowUp,
  ArrowDown,
  Activity,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from 'recharts'

// ============================================================================
// HEAD TEACHER CARD - Shows their school's current assessment score & rating
// ============================================================================

interface HeadTeacherAssessmentCardProps {
  schoolId: string
  className?: string
}

interface HeadTeacherMetrics {
  schoolName: string
  currentScore: number | null
  maxScore: number
  ratingLevel: string | null
  trend: 'improving' | 'declining' | 'stable' | null
  lastAssessmentDate: string | null
  hasSubmittedThisTerm: boolean
  termName: string | null
  // NEW: Urgency-driving metrics
  daysUntilDeadline: number | null
  regionalRank: number | null
  totalSchoolsInRegion: number
  lowestCategory: { name: string; percentage: number } | null
  pointsToNextRating: number | null
  nextRatingName: string | null
  categoryScores: { category: string; score: number; max: number }[]
}

export function HeadTeacherAssessmentCard({ 
  schoolId, 
  className = "" 
}: HeadTeacherAssessmentCardProps) {
  const router = useRouter()
  const [metrics, setMetrics] = useState<HeadTeacherMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadMetrics() {
      try {
        const response = await fetch(`/api/school-assessment/head-teacher-metrics?schoolId=${schoolId}`)
        if (response.ok) {
          const data = await response.json()
          setMetrics(data)
        }
      } catch (error) {
        console.error('Failed to load head teacher metrics:', error)
      } finally {
        setLoading(false)
      }
    }
    if (schoolId) {
      loadMetrics()
    } else {
      setLoading(false)
    }
  }, [schoolId])

  const getRatingConfig = (rating: string | null) => {
    switch (rating) {
      case 'A': return { color: 'emerald', gradient: 'from-emerald-500 to-green-600', label: 'Grade A', icon: Star }
      case 'B': return { color: 'blue', gradient: 'from-blue-500 to-indigo-600', label: 'Grade B', icon: Award }
      case 'C': return { color: 'amber', gradient: 'from-amber-500 to-orange-600', label: 'Grade C', icon: CheckCircle2 }
      case 'D': return { color: 'amber', gradient: 'from-amber-500 to-orange-600', label: 'Grade D', icon: Target }
      case 'E': return { color: 'red', gradient: 'from-red-500 to-rose-600', label: 'Grade E', icon: AlertTriangle }
      case 'outstanding': return { color: 'emerald', gradient: 'from-emerald-500 to-green-600', label: 'Outstanding', icon: Star }
      case 'very_good': return { color: 'blue', gradient: 'from-blue-500 to-indigo-600', label: 'Very Good', icon: Award }
      case 'good': return { color: 'cyan', gradient: 'from-cyan-500 to-blue-600', label: 'Good', icon: CheckCircle2 }
      case 'satisfactory': return { color: 'amber', gradient: 'from-amber-500 to-orange-600', label: 'Satisfactory', icon: Target }
      case 'needs_improvement': return { color: 'red', gradient: 'from-red-500 to-rose-600', label: 'Needs Improvement', icon: AlertTriangle }
      default: return { color: 'purple', gradient: 'from-purple-500 to-indigo-600', label: 'Not Assessed', icon: ClipboardCheck }
    }
  }

  const getDeadlineUrgency = (days: number | null) => {
    if (days === null) return null
    if (days <= 0) return { color: 'red', label: 'Overdue!', urgent: true }
    if (days <= 3) return { color: 'red', label: `${days} days left`, urgent: true }
    if (days <= 7) return { color: 'amber', label: `${days} days left`, urgent: true }
    return { color: 'green', label: `${days} days left`, urgent: false }
  }

  const config = getRatingConfig(metrics?.ratingLevel || null)
  const deadlineUrgency = getDeadlineUrgency(metrics?.daysUntilDeadline ?? null)

  // Prepare radar chart data for category visualization
  const radarData = metrics?.categoryScores?.map(c => ({
    category: c.category.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    score: Math.round((c.score / c.max) * 100),
    fullMark: 100
  })) || []

  if (loading) {
    return (
      <Card className={`overflow-hidden ${className}`}>
        <CardContent className="p-0">
          <div className="flex">
            <div className="flex-1 p-6 space-y-4">
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-4 w-80" />
              <Skeleton className="h-10 w-44" />
            </div>
            <Skeleton className="w-64 h-48" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`overflow-hidden border-0 shadow-xl bg-white ${className}`}>
      <CardContent className="p-0">
        <div className="flex flex-col lg:flex-row">
          {/* Left Content */}
          <div className="flex-1 p-6 lg:p-8 flex flex-col justify-center">
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${config.gradient}`}>
                    <ClipboardCheck className="h-5 w-5 text-white" />
                  </div>
                  <Badge className={`bg-gradient-to-r ${config.gradient} text-white border-0 text-xs`}>
                    {config.label}
                  </Badge>
                  {/* Deadline Urgency Badge */}
                  {deadlineUrgency && !metrics?.hasSubmittedThisTerm && (
                    <Badge 
                      className={`border-0 text-xs animate-pulse ${
                        deadlineUrgency.color === 'red' 
                          ? 'bg-red-100 text-red-700' 
                          : deadlineUrgency.color === 'amber'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-green-100 text-green-700'
                      }`}
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      {deadlineUrgency.label}
                    </Badge>
                  )}
                </div>
                <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                  School Assessment
                </h3>
                <p className="text-gray-600 text-sm lg:text-base leading-relaxed">
                  {metrics?.hasSubmittedThisTerm 
                    ? `Assessment submitted for ${metrics?.termName || 'this term'}. View your detailed performance breakdown.`
                    : deadlineUrgency?.urgent
                      ? `⚠️ Deadline approaching! Complete your assessment for ${metrics?.termName || 'this term'} now.`
                      : metrics?.currentScore 
                        ? "Track your school's progress and see detailed category breakdowns."
                        : "Complete your termly assessment to benchmark your school's performance."
                  }
                </p>
              </div>

              {/* Urgency-Driving Stats Row */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Regional Rank */}
                {metrics?.regionalRank && metrics?.totalSchoolsInRegion > 0 && (
                  <div className="flex items-center gap-1.5 bg-purple-50 px-3 py-1.5 rounded-full text-sm">
                    <Trophy className="h-4 w-4 text-purple-600" />
                    <span className="font-semibold text-purple-700">
                      Rank #{metrics.regionalRank} of {metrics.totalSchoolsInRegion}
                    </span>
                  </div>
                )}
                {/* Points to Next Rating */}
                {metrics?.pointsToNextRating && metrics.pointsToNextRating > 0 && (
                  <div className="flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-full text-sm">
                    <ArrowUp className="h-4 w-4 text-blue-600" />
                    <span className="font-semibold text-blue-700">
                      {metrics.pointsToNextRating} pts to {metrics.nextRatingName}
                    </span>
                  </div>
                )}
                {/* Lowest Category Alert */}
                {metrics?.lowestCategory && metrics.lowestCategory.percentage < 50 && (
                  <div className="flex items-center gap-1.5 bg-red-50 px-3 py-1.5 rounded-full text-sm">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="font-semibold text-red-700">
                      {metrics.lowestCategory.name}: {metrics.lowestCategory.percentage}%
                    </span>
                  </div>
                )}
                {/* Trend Badge */}
                {metrics?.trend && metrics.trend !== 'stable' && (
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                    metrics.trend === 'improving' 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {metrics.trend === 'improving' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    {metrics.trend === 'improving' ? 'Improving' : 'Declining'}
                  </div>
                )}
              </div>

              <Button 
                onClick={() => router.push('/dashboard/school-assessment')}
                size="lg"
                className={`bg-gradient-to-r ${config.gradient} hover:opacity-90 text-white shadow-lg gap-2 font-semibold ${
                  deadlineUrgency?.urgent && !metrics?.hasSubmittedThisTerm ? 'animate-pulse' : ''
                }`}
              >
                <ClipboardCheck className="h-4 w-4" />
                {metrics?.hasSubmittedThisTerm ? 'View Assessment' : 'Enter Assessment'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Right Side - Interactive Radar Chart or Score Display */}
          <div className={`relative w-full lg:w-80 xl:w-96 bg-gradient-to-br ${config.gradient} flex items-center justify-center p-4 lg:p-6 min-h-[280px]`}>
            {/* Background decorative elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-4 right-4 opacity-20">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <div className="absolute bottom-4 left-4 opacity-20">
                <Star className="h-6 w-6 text-white" />
              </div>
            </div>

            <div className="relative z-10 w-full">
              {radarData.length > 0 ? (
                /* Interactive Radar Chart showing category performance */
                <div className="text-center">
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                        <PolarGrid stroke="rgba(255,255,255,0.3)" />
                        <PolarAngleAxis 
                          dataKey="category" 
                          tick={{ fill: 'white', fontSize: 9, fontWeight: 500 }}
                        />
                        <PolarRadiusAxis 
                          angle={90} 
                          domain={[0, 100]} 
                          tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 8 }}
                          tickCount={5}
                        />
                        <Radar
                          name="Score"
                          dataKey="score"
                          stroke="white"
                          fill="rgba(255,255,255,0.4)"
                          fillOpacity={0.6}
                          strokeWidth={2}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-2">
                    <span className="text-4xl font-bold text-white">
                      {metrics?.currentScore ?? '—'}
                    </span>
                    <span className="text-white/70 text-lg font-medium ml-1">/{metrics?.maxScore ?? 1000}</span>
                  </div>
                  <p className="text-white/80 text-xs mt-1">Performance by Category</p>
                </div>
              ) : (
                /* Placeholder for no data */
                <div className="text-center">
                  <div className="w-32 h-32 mx-auto rounded-full border-4 border-white/30 flex items-center justify-center mb-4">
                    <ClipboardCheck className="h-12 w-12 text-white/60" />
                  </div>
                  <p className="text-white font-semibold text-lg">Not Yet Assessed</p>
                  <p className="text-white/70 text-sm mt-1">Complete your first assessment</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// REGIONAL OFFICER CARD - Shows regional compliance & school stats
// ============================================================================

interface RegionalOfficerAssessmentCardProps {
  regionId: string
  className?: string
}

interface RegionalMetrics {
  regionName: string
  averageScore: number
  totalSchools: number
  submittedCount: number
  submissionRate: number
  topSchool: { name: string; score: number } | null
  atRiskCount: number
  trend: 'improving' | 'declining' | 'stable' | null
  // NEW: Urgency-driving metrics
  overdueCount: number
  nearDeadlineCount: number
  submissionTrend: { date: string; count: number }[]
  decliningSchools: number
  nationalRank: number | null
  totalRegions: number
  weeklyVelocity: number // submissions this week vs last week (percentage change)
}

export function RegionalOfficerAssessmentCard({ 
  regionId, 
  className = "" 
}: RegionalOfficerAssessmentCardProps) {
  const router = useRouter()
  const [metrics, setMetrics] = useState<RegionalMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadMetrics() {
      try {
        const response = await fetch(`/api/school-assessment/regional-metrics?regionId=${regionId}`)
        if (response.ok) {
          const data = await response.json()
          setMetrics(data)
        }
      } catch (error) {
        console.error('Failed to load regional metrics:', error)
      } finally {
        setLoading(false)
      }
    }
    if (regionId) {
      loadMetrics()
    } else {
      setLoading(false)
    }
  }, [regionId])

  const getComplianceConfig = (rate: number) => {
    if (rate >= 80) return { gradient: 'from-emerald-500 to-green-600', status: 'Excellent', color: 'emerald' }
    if (rate >= 60) return { gradient: 'from-blue-500 to-indigo-600', status: 'Good', color: 'blue' }
    if (rate >= 40) return { gradient: 'from-amber-500 to-orange-600', status: 'Moderate', color: 'amber' }
    return { gradient: 'from-red-500 to-rose-600', status: 'Low', color: 'red' }
  }

  const submissionRate = metrics?.submissionRate ?? 0
  const config = getComplianceConfig(submissionRate)

  // Check for urgent attention items
  const hasUrgentItems = (metrics?.overdueCount ?? 0) > 0 || (metrics?.nearDeadlineCount ?? 0) > 0
  const urgentTotal = (metrics?.overdueCount ?? 0) + (metrics?.nearDeadlineCount ?? 0)

  // Prepare area chart data for submission velocity
  const chartData = metrics?.submissionTrend || []

  if (loading) {
    return (
      <Card className={`overflow-hidden ${className}`}>
        <CardContent className="p-0">
          <div className="flex">
            <div className="flex-1 p-6 space-y-4">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-28" />
                <Skeleton className="h-8 w-28" />
              </div>
              <Skeleton className="h-10 w-52" />
            </div>
            <Skeleton className="w-72 h-56" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`overflow-hidden border-0 shadow-xl bg-white ${className}`}>
      <CardContent className="p-0">
        <div className="flex flex-col lg:flex-row">
          {/* Left Content */}
          <div className="flex-1 p-6 lg:p-8 flex flex-col justify-center">
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${config.gradient}`}>
                    <School className="h-5 w-5 text-white" />
                  </div>
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 font-medium">
                    <MapPin className="h-3 w-3 mr-1" />
                    {metrics?.regionName || regionId}
                  </Badge>
                  {/* Urgent Attention Badge */}
                  {hasUrgentItems && (
                    <Badge className="bg-red-100 text-red-700 border-0 text-xs animate-pulse">
                      <Flame className="h-3 w-3 mr-1" />
                      {urgentTotal} Need Attention
                    </Badge>
                  )}
                  {/* Regional Rank Badge */}
                  {metrics?.nationalRank && metrics?.totalRegions > 0 && (
                    <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">
                      <Trophy className="h-3 w-3 mr-1" />
                      Region #{metrics.nationalRank}/{metrics.totalRegions}
                    </Badge>
                  )}
                </div>
                <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                  Regional School Assessment
                </h3>
                <p className="text-gray-600 text-sm lg:text-base leading-relaxed">
                  {hasUrgentItems
                    ? `⚠️ ${metrics?.overdueCount || 0} schools overdue, ${metrics?.nearDeadlineCount || 0} approaching deadline. Take action now!`
                    : submissionRate >= 80 
                      ? "Excellent compliance! Review performance details and identify schools excelling or needing support."
                      : submissionRate >= 50
                        ? "Good progress. Follow up with remaining schools to improve regional compliance."
                        : "Many schools haven't submitted. View details and send reminders to improve compliance."
                  }
                </p>
              </div>

              {/* Urgency-Driving Stats Pills */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Overdue Schools */}
                {(metrics?.overdueCount ?? 0) > 0 && (
                  <div className="flex items-center gap-1.5 bg-red-50 px-3 py-1.5 rounded-full text-sm border border-red-200">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="font-semibold text-red-700">{metrics?.overdueCount} Overdue</span>
                  </div>
                )}
                {/* Near Deadline */}
                {(metrics?.nearDeadlineCount ?? 0) > 0 && (
                  <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-full text-sm border border-amber-200">
                    <Clock className="h-4 w-4 text-amber-600" />
                    <span className="font-semibold text-amber-700">{metrics?.nearDeadlineCount} Near Deadline</span>
                  </div>
                )}
                {/* At-Risk Schools */}
                {(metrics?.atRiskCount ?? 0) > 0 && (
                  <div className="flex items-center gap-1.5 bg-orange-50 px-3 py-1.5 rounded-full text-sm border border-orange-200">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <span className="font-semibold text-orange-700">{metrics?.atRiskCount} At-Risk</span>
                  </div>
                )}
                {/* Declining Schools */}
                {(metrics?.decliningSchools ?? 0) > 0 && (
                  <div className="flex items-center gap-1.5 bg-rose-50 px-3 py-1.5 rounded-full text-sm border border-rose-200">
                    <TrendingDown className="h-4 w-4 text-rose-600" />
                    <span className="font-semibold text-rose-700">{metrics?.decliningSchools} Declining</span>
                  </div>
                )}
                {/* Average Score */}
                <div className="flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-full text-sm">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                  <span className="font-semibold text-blue-700">Avg: {metrics?.averageScore ?? 0}/1000</span>
                </div>
                {/* Weekly Velocity */}
                {metrics?.weeklyVelocity !== undefined && metrics.weeklyVelocity !== 0 && (
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm ${
                    metrics.weeklyVelocity > 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
                  }`}>
                    {metrics.weeklyVelocity > 0 ? (
                      <ArrowUp className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <ArrowDown className="h-4 w-4 text-red-600" />
                    )}
                    <span className={`font-semibold ${metrics.weeklyVelocity > 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      {Math.abs(metrics.weeklyVelocity)}% this week
                    </span>
                  </div>
                )}
              </div>

              <Button 
                onClick={() => router.push('/dashboard/school-assessment/regional')}
                size="lg"
                className={`bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white shadow-lg gap-2 font-semibold ${
                  hasUrgentItems ? 'animate-pulse' : ''
                }`}
              >
                <School className="h-4 w-4" />
                {hasUrgentItems ? 'View Schools Needing Attention' : 'View Regional Assessments'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Right Side - Submission Progress with Mini Chart */}
          <div className={`relative w-full lg:w-80 xl:w-96 bg-gradient-to-br ${config.gradient} flex flex-col items-center justify-center p-6 min-h-[300px]`}>
            {/* Background decorative elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-4 left-4 opacity-20">
                <School className="h-10 w-10 text-white" />
              </div>
              <div className="absolute bottom-4 right-4 opacity-20">
                <CheckCircle2 className="h-8 w-8 text-white" />
              </div>
            </div>

            {/* Main Metric Display */}
            <div className="relative z-10 text-center w-full">
              {/* Submission Counter */}
              <div className="mb-4">
                <div className="inline-flex items-baseline">
                  <span className="text-6xl lg:text-7xl font-bold text-white">
                    {metrics?.submittedCount ?? 0}
                  </span>
                  <span className="text-2xl lg:text-3xl text-white/70 font-medium ml-1">
                    /{metrics?.totalSchools ?? 0}
                  </span>
                </div>
                <p className="text-white/90 text-sm font-semibold uppercase tracking-wider mt-1">
                  Schools Submitted
                </p>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full max-w-[200px] mx-auto mb-4">
                <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${submissionRate}%` }}
                  />
                </div>
                <p className="text-white font-bold text-lg mt-2">
                  {Math.round(submissionRate)}% Compliance
                </p>
              </div>

              {/* Mini Submission Velocity Chart */}
              {chartData.length > 0 && (
                <div className="w-full h-20 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <defs>
                        <linearGradient id="submissionGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="white" stopOpacity={0.5}/>
                          <stop offset="95%" stopColor="white" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <Area 
                        type="monotone" 
                        dataKey="count" 
                        stroke="white" 
                        strokeWidth={2}
                        fill="url(#submissionGradient)"
                      />
                      <Tooltip 
                        contentStyle={{ 
                          background: 'rgba(255,255,255,0.95)', 
                          border: 'none', 
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                        labelFormatter={(label) => `Day: ${label}`}
                        formatter={(value: number) => [`${value} submissions`, 'Count']}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  <p className="text-white/70 text-xs mt-1">Submissions this week</p>
                </div>
              )}

              {/* Top School Callout */}
              {metrics?.topSchool && (
                <div className="bg-white/15 backdrop-blur-sm rounded-xl p-2 mt-3">
                  <div className="flex items-center justify-center gap-2">
                    <Award className="h-4 w-4 text-yellow-300" />
                    <span className="text-white/90 text-xs">
                      <span className="font-bold">{metrics.topSchool.name}</span>: {metrics.topSchool.score}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// EDUCATION OFFICIAL CARD - Shows national overview & key stats
// ============================================================================

interface EducationOfficialAssessmentCardProps {
  className?: string
}

interface NationalMetrics {
  nationalAverage: number
  totalSchools: number
  totalSubmitted: number
  submissionRate: number
  totalRegions: number
  topRegion: { name: string; score: number } | null
  lowestRegion: { name: string; score: number } | null
  outstandingCount: number
  needsImprovementCount: number
  // NEW: Urgency-driving metrics
  regionalPerformance: { region: string; score: number; submitted: number; total: number }[]
  weeklyTrend: { week: string; submissions: number }[]
  criticalRegionsCount: number
  neverAssessedCount: number
  nationalTrend: 'improving' | 'declining' | 'stable' | null
  weeklyChange: number
}

export function EducationOfficialAssessmentCard({ 
  className = "" 
}: EducationOfficialAssessmentCardProps) {
  const router = useRouter()
  const [metrics, setMetrics] = useState<NationalMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadMetrics() {
      try {
        const response = await fetch('/api/school-assessment/national-metrics')
        if (response.ok) {
          const data = await response.json()
          setMetrics(data)
        }
      } catch (error) {
        console.error('Failed to load national metrics:', error)
      } finally {
        setLoading(false)
      }
    }
    loadMetrics()
  }, [])

  const getNationalConfig = (score: number) => {
    if (score >= 800) return { gradient: 'from-emerald-500 to-green-600', status: 'Excellent' }
    if (score >= 650) return { gradient: 'from-blue-500 to-indigo-600', status: 'Very Good' }
    if (score >= 500) return { gradient: 'from-cyan-500 to-blue-600', status: 'Good' }
    if (score >= 400) return { gradient: 'from-amber-500 to-orange-600', status: 'Moderate' }
    return { gradient: 'from-purple-500 to-indigo-600', status: 'Developing' }
  }

  const nationalAvg = metrics?.nationalAverage ?? 0
  const config = getNationalConfig(nationalAvg)

  // Check for critical items
  const hasCriticalItems = (metrics?.criticalRegionsCount ?? 0) > 0 || (metrics?.neverAssessedCount ?? 0) > 50

  // Prepare bar chart data for regional comparison
  const regionalData = (metrics?.regionalPerformance || [])
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(r => ({
      name: r.region.length > 10 ? r.region.substring(0, 10) + '...' : r.region,
      score: r.score,
      compliance: r.total > 0 ? Math.round((r.submitted / r.total) * 100) : 0
    }))

  // Color scale for bars
  const getBarColor = (score: number) => {
    if (score >= 700) return '#10b981'
    if (score >= 500) return '#3b82f6'
    if (score >= 400) return '#f59e0b'
    return '#ef4444'
  }

  if (loading) {
    return (
      <Card className={`overflow-hidden ${className}`}>
        <CardContent className="p-0">
          <div className="flex">
            <div className="flex-1 p-6 space-y-4">
              <Skeleton className="h-8 w-72" />
              <Skeleton className="h-4 w-full max-w-lg" />
              <div className="flex gap-2">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-32" />
              </div>
              <Skeleton className="h-11 w-60" />
            </div>
            <Skeleton className="w-80 h-64" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`overflow-hidden border-0 shadow-xl bg-white ${className}`}>
      <CardContent className="p-0">
        <div className="flex flex-col xl:flex-row">
          {/* Left Content */}
          <div className="flex-1 p-6 lg:p-8 flex flex-col justify-center">
            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600">
                    <Globe className="h-5 w-5 text-white" />
                  </div>
                  <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 font-medium">
                    <Zap className="h-3 w-3 mr-1" />
                    Ministry Dashboard
                  </Badge>
                  {/* Critical Alerts Badge */}
                  {hasCriticalItems && (
                    <Badge className="bg-red-100 text-red-700 border-0 text-xs animate-pulse">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {metrics?.criticalRegionsCount} Regions Need Attention
                    </Badge>
                  )}
                  {/* National Trend Badge */}
                  {metrics?.nationalTrend && metrics.nationalTrend !== 'stable' && (
                    <Badge className={`border-0 text-xs ${
                      metrics.nationalTrend === 'improving'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {metrics.nationalTrend === 'improving' ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {metrics.weeklyChange > 0 ? '+' : ''}{metrics.weeklyChange}% this week
                    </Badge>
                  )}
                </div>
                <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                  National School Assessment
                </h3>
                <p className="text-gray-600 text-sm lg:text-base leading-relaxed">
                  {hasCriticalItems
                    ? `⚠️ ${metrics?.criticalRegionsCount || 0} regions underperforming, ${metrics?.neverAssessedCount || 0} schools never assessed. Review regional data for intervention.`
                    : "Monitor education quality across all regions. Identify high-performing schools for recognition and those requiring intervention."
                  }
                </p>
              </div>

              {/* Stats Cards with Urgency Indicators */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center hover:shadow-md transition-shadow cursor-pointer">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-emerald-700">{metrics?.outstandingCount ?? 0}</p>
                  <p className="text-xs text-emerald-600 font-medium">Outstanding</p>
                </div>
                <div className={`border rounded-xl p-3 text-center hover:shadow-md transition-shadow cursor-pointer ${
                  (metrics?.needsImprovementCount ?? 0) > 10 
                    ? 'bg-red-50 border-red-300 animate-pulse' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <AlertTriangle className="h-5 w-5 text-red-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-red-700">{metrics?.needsImprovementCount ?? 0}</p>
                  <p className="text-xs text-red-600 font-medium">Need Support</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center hover:shadow-md transition-shadow cursor-pointer">
                  <School className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-blue-700">{metrics?.totalSubmitted ?? 0}</p>
                  <p className="text-xs text-blue-600 font-medium">Assessed</p>
                </div>
                <div className={`border rounded-xl p-3 text-center hover:shadow-md transition-shadow cursor-pointer ${
                  (metrics?.neverAssessedCount ?? 0) > 50
                    ? 'bg-orange-50 border-orange-300'
                    : 'bg-purple-50 border-purple-200'
                }`}>
                  {(metrics?.neverAssessedCount ?? 0) > 50 ? (
                    <>
                      <AlertCircle className="h-5 w-5 text-orange-600 mx-auto mb-1" />
                      <p className="text-2xl font-bold text-orange-700">{metrics?.neverAssessedCount ?? 0}</p>
                      <p className="text-xs text-orange-600 font-medium">Not Assessed</p>
                    </>
                  ) : (
                    <>
                      <MapPin className="h-5 w-5 text-purple-600 mx-auto mb-1" />
                      <p className="text-2xl font-bold text-purple-700">{metrics?.totalRegions ?? 0}</p>
                      <p className="text-xs text-purple-600 font-medium">Regions</p>
                    </>
                  )}
                </div>
              </div>

              {/* Urgency Pills Row */}
              <div className="flex flex-wrap items-center gap-2">
                {metrics?.lowestRegion && (
                  <div className="flex items-center gap-1.5 bg-red-50 px-3 py-1.5 rounded-full text-sm border border-red-200">
                    <ArrowDown className="h-4 w-4 text-red-600" />
                    <span className="font-semibold text-red-700">
                      Lowest: {metrics.lowestRegion.name} ({metrics.lowestRegion.score})
                    </span>
                  </div>
                )}
                {metrics?.topRegion && (
                  <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-full text-sm border border-emerald-200">
                    <Award className="h-4 w-4 text-emerald-600" />
                    <span className="font-semibold text-emerald-700">
                      Top: {metrics.topRegion.name} ({metrics.topRegion.score})
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-full text-sm">
                  <Activity className="h-4 w-4 text-blue-600" />
                  <span className="font-semibold text-blue-700">
                    {Math.round(metrics?.submissionRate ?? 0)}% Coverage
                  </span>
                </div>
              </div>

              <Button 
                onClick={() => router.push('/dashboard/education-official/school-assessment')}
                size="lg"
                className={`bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white shadow-lg gap-2 font-semibold ${
                  hasCriticalItems ? 'animate-pulse' : ''
                }`}
              >
                <BarChart3 className="h-4 w-4" />
                {hasCriticalItems ? 'View Critical Regions' : 'View National Assessment Data'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Right Side - Interactive Regional Comparison Chart */}
          <div className={`relative w-full xl:w-[420px] bg-gradient-to-br ${config.gradient} flex flex-col items-center justify-center p-6 min-h-[340px]`}>
            {/* Background decorative elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-4 right-4 opacity-20">
                <Globe className="h-12 w-12 text-white" />
              </div>
              <div className="absolute bottom-4 left-4 opacity-20">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              {/* Abstract shapes */}
              <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
              <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-white/10 rounded-full blur-xl" />
            </div>

            {/* Main Display */}
            <div className="relative z-10 text-center w-full">
              {/* Large Score */}
              <div className="mb-3">
                <span className="text-6xl lg:text-7xl font-bold text-white drop-shadow-lg">
                  {Math.round(nationalAvg)}
                </span>
                <p className="text-white/80 text-base font-medium">National Average</p>
                <p className="text-white/60 text-sm">out of 1000 points</p>
              </div>
              
              {/* Status Badge */}
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-4">
                <Star className="h-4 w-4 text-yellow-300" />
                <span className="text-white font-semibold text-sm">{config.status} Performance</span>
              </div>

              {/* Regional Comparison Bar Chart */}
              {regionalData.length > 0 && (
                <div className="w-full h-32 mt-2 bg-white/10 rounded-xl p-2">
                  <p className="text-white/80 text-xs mb-1 font-medium">Top Regions Comparison</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={regionalData} layout="vertical" margin={{ top: 5, right: 30, left: 5, bottom: 5 }}>
                      <XAxis type="number" domain={[0, 1000]} hide />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={60}
                        tick={{ fill: 'white', fontSize: 9 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{ 
                          background: 'rgba(255,255,255,0.95)', 
                          border: 'none', 
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                        formatter={(value: number, name: string) => [
                          name === 'score' ? `${value} pts` : `${value}%`,
                          name === 'score' ? 'Avg Score' : 'Compliance'
                        ]}
                      />
                      <Bar 
                        dataKey="score" 
                        radius={[0, 4, 4, 0]}
                      >
                        {regionalData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getBarColor(entry.score)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Critical Region Alert */}
              {metrics?.lowestRegion && metrics.lowestRegion.score < 400 && (
                <div className="bg-red-500/30 backdrop-blur-sm rounded-xl p-2 mt-3 border border-red-300/50">
                  <div className="flex items-center justify-center gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-300" />
                    <span className="text-white text-xs font-semibold">
                      {metrics.lowestRegion.name} needs immediate intervention ({metrics.lowestRegion.score} pts)
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
