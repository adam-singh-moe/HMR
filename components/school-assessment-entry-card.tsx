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
  compact?: boolean
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
  isModuleEnabled?: boolean
}

export function HeadTeacherAssessmentCard({ 
  schoolId, 
  className = "",
  compact = false
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

  // Feature Toggle Check
  if (metrics?.isModuleEnabled === false) {
    return (
      <Card className={`overflow-hidden border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl ${className}`}>
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
            <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
              <Activity className="h-8 w-8 text-slate-400 dark:text-slate-500 opacity-40" />
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="text-xl font-bold text-slate-500 dark:text-slate-400">School Assessment Restricted</h3>
              <p className="text-slate-500 dark:text-slate-400">
                The school assessment module is currently not active for your school type. 
                Reporting windows are managed by the Ministry of Education.
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded-md text-slate-500 dark:text-slate-400 text-sm font-medium">
              <Minus className="h-4 w-4" />
              Module Inactive
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card className={`overflow-hidden bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 ${className}`}>
        <CardContent className="p-0">
          <div className="flex">
            <div className="flex-1 p-6 space-y-4">
              <Skeleton className="h-8 w-56 dark:bg-slate-700" />
              <Skeleton className="h-4 w-80 dark:bg-slate-700" />
              <Skeleton className="h-10 w-44 dark:bg-slate-700" />
            </div>
            <Skeleton className="w-64 h-48 dark:bg-slate-700" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`overflow-hidden border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl h-full border border-slate-200/50 dark:border-slate-700/50 ${className}`}>
      <CardContent className="p-0 h-full">
        <div className="flex flex-col h-full">
          {/* Content */}
          <div className={`flex-1 ${compact ? 'p-4' : 'p-6 lg:p-8'} flex flex-col justify-center`}>
            <div className={compact ? 'space-y-2' : 'space-y-4'}>
              <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <div className={`${compact ? 'p-1.5' : 'p-2'} rounded-lg bg-gradient-to-br ${config.gradient}`}>
                    <ClipboardCheck className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} text-white`} />
                  </div>
                  <Badge className={`bg-gradient-to-r ${config.gradient} text-white border-0 text-xs`}>
                    {config.label}
                  </Badge>
                  {/* Deadline Urgency Badge */}
                  {deadlineUrgency && !metrics?.hasSubmittedThisTerm && (
                    <Badge 
                      className={`border-0 text-xs animate-pulse ${
                        deadlineUrgency.color === 'red' 
                          ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' 
                          : deadlineUrgency.color === 'amber'
                            ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                            : 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                      }`}
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      {deadlineUrgency.label}
                    </Badge>
                  )}
                </div>
                <h3 className={`${compact ? 'text-lg' : 'text-2xl lg:text-3xl'} font-bold text-slate-900 dark:text-white ${compact ? 'mb-1' : 'mb-2'}`}>
                  School Assessment
                </h3>
                <p className={`text-slate-600 dark:text-slate-300 ${compact ? 'text-xs' : 'text-sm lg:text-base'} leading-relaxed`}>
                  {metrics?.hasSubmittedThisTerm 
                    ? compact ? `Submitted for ${metrics?.termName || 'this term'}.` : `Assessment submitted for ${metrics?.termName || 'this term'}. View your detailed performance breakdown.`
                    : deadlineUrgency?.urgent
                      ? compact ? `⚠️ Deadline: ${deadlineUrgency.label}` : `⚠️ Deadline approaching! Complete your assessment for ${metrics?.termName || 'this term'} now.`
                      : compact ? "Complete your termly assessment to benchmark your school's performance." : metrics?.currentScore 
                        ? "Track your school's progress and see detailed category breakdowns."
                        : "Complete your termly assessment to benchmark your school's performance."
                  }
                </p>
              </div>

              {/* Urgency-Driving Stats Row - Hide in compact mode */}
              {!compact && <div className="flex flex-wrap items-center gap-2">
                {/* Regional Rank */}
                {metrics?.regionalRank && metrics?.totalSchoolsInRegion > 0 && (
                  <div className="flex items-center gap-1.5 bg-purple-100 dark:bg-purple-900/30 px-3 py-1.5 rounded-full text-sm">
                    <Trophy className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <span className="font-semibold text-purple-700 dark:text-purple-300">
                      Rank #{metrics.regionalRank} of {metrics.totalSchoolsInRegion}
                    </span>
                  </div>
                )}
                {/* Points to Next Rating */}
                {metrics?.pointsToNextRating && metrics.pointsToNextRating > 0 && (
                  <div className="flex items-center gap-1.5 bg-blue-100 dark:bg-blue-900/30 px-3 py-1.5 rounded-full text-sm">
                    <ArrowUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="font-semibold text-blue-700 dark:text-blue-300">
                      {metrics.pointsToNextRating} pts to {metrics.nextRatingName}
                    </span>
                  </div>
                )}
                {/* Lowest Category Alert */}
                {metrics?.lowestCategory && metrics.lowestCategory.percentage < 50 && (
                  <div className="flex items-center gap-1.5 bg-red-100 dark:bg-red-900/30 px-3 py-1.5 rounded-full text-sm">
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <span className="font-semibold text-red-700 dark:text-red-300">
                      {metrics.lowestCategory.name}: {metrics.lowestCategory.percentage}%
                    </span>
                  </div>
                )}
                {/* Trend Badge */}
                {metrics?.trend && metrics.trend !== 'stable' && (
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                    metrics.trend === 'improving' 
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' 
                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                  }`}>
                    {metrics.trend === 'improving' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    {metrics.trend === 'improving' ? 'Improving' : 'Declining'}
                  </div>
                )}
              </div>}

              <Button 
                onClick={() => router.push('/dashboard/school-assessment')}
                size={compact ? "sm" : "lg"}
                className={`bg-gradient-to-r ${config.gradient} hover:opacity-90 text-white shadow-lg gap-2 font-semibold ${
                  deadlineUrgency?.urgent && !metrics?.hasSubmittedThisTerm ? 'animate-pulse' : ''
                } ${compact ? 'text-sm' : ''}`}
              >
                <ClipboardCheck className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
                {metrics?.hasSubmittedThisTerm ? 'View Assessment' : 'Enter Assessment'}
                <ArrowRight className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
              </Button>
            </div>
          </div>

          {/* Right Side - Interactive Radar Chart or Score Display - Hide in compact mode */}
          {!compact && <div className={`relative w-full lg:w-80 xl:w-96 bg-gradient-to-br ${config.gradient} flex items-center justify-center p-4 lg:p-6 min-h-[280px]`}>
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
                        {/* @ts-ignore */}
                        <PolarAngleAxis 
                          dataKey="category" 
                          tick={{ fill: 'white', fontSize: 9, fontWeight: 500 }}
                        />
                        {/* @ts-ignore */}
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
          </div>}
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
  const [dataLoaded, setDataLoaded] = useState(false)

  useEffect(() => {
    async function loadMetrics() {
      // Skip if data already loaded for this region
      if (dataLoaded && metrics) {
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/school-assessment/regional-metrics?regionId=${regionId}`)
        if (response.ok) {
          const data = await response.json()
          setMetrics(data)
          setDataLoaded(true)
        }
      } catch (error) {
        console.error('Failed to load regional metrics:', error)
      } finally {
        setLoading(false)
      }
    }
    if (regionId && !dataLoaded) {
      loadMetrics()
    } else if (!regionId) {
      setLoading(false)
    }
  }, [regionId, dataLoaded, metrics])

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
      <Card className={`overflow-hidden bg-white dark:bg-slate-800 border-0 shadow-xl ${className}`}>
        <CardContent className="p-0">
          <div className="flex">
            <div className="flex-1 p-6 space-y-4">
              <Skeleton className="h-8 w-64 dark:bg-slate-700" />
              <Skeleton className="h-4 w-96 dark:bg-slate-700" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-28 dark:bg-slate-700" />
                <Skeleton className="h-8 w-28 dark:bg-slate-700" />
              </div>
              <Skeleton className="h-10 w-52 dark:bg-slate-700" />
            </div>
            <Skeleton className="w-72 h-56 dark:bg-slate-700" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`overflow-hidden border border-slate-200/80 dark:border-slate-700/50 shadow-sm bg-white dark:bg-[hsl(222,47%,9%)] rounded-xl ${className}`}>
      <CardContent className="p-0">
        <div className="flex flex-col lg:flex-row min-h-[200px]">
          {/* Left Content - Compact Layout */}
          <div className="flex-1 p-4 lg:p-5 flex flex-col">
            {/* Header Row - Compact */}
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 shadow-md">
                  <School className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white leading-tight">
                    Regional School Assessment
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge variant="outline" className="h-5 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200/80 dark:border-slate-700/50 font-medium text-[10px] px-1.5">
                      <MapPin className="h-2.5 w-2.5 mr-0.5" />
                      {metrics?.regionName || regionId}
                    </Badge>
                    {metrics?.nationalRank && metrics?.totalRegions > 0 && (
                      <Badge className="h-5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-0 text-[10px] px-1.5">
                        <Trophy className="h-2.5 w-2.5 mr-0.5" />
                        #{metrics.nationalRank}/{metrics.totalRegions}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              {hasUrgentItems && (
                <Badge className="h-5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-0 text-[10px] px-1.5 shrink-0">
                  <Flame className="h-2.5 w-2.5 mr-0.5" />
                  {urgentTotal} Urgent
                </Badge>
              )}
            </div>

            {/* Description - Shorter */}
            <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed mb-3">
              {hasUrgentItems
                ? `${metrics?.overdueCount || 0} overdue, ${metrics?.nearDeadlineCount || 0} near deadline.`
                : submissionRate >= 80
                  ? "Excellent compliance! Review performance details."
                  : submissionRate >= 50
                    ? "Good progress. Follow up with remaining schools."
                    : "Many schools haven't submitted. Send reminders."
              }
            </p>

            {/* Compact Stats Row - Always show key stats */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              {/* At-Risk - Always show */}
              <div className="text-center p-2 rounded-lg bg-orange-50 dark:bg-orange-500/10 border border-orange-200/50 dark:border-orange-500/20">
                <AlertTriangle className="h-3.5 w-3.5 text-orange-500 dark:text-orange-400 mx-auto mb-0.5" />
                <p className="text-base font-bold text-orange-600 dark:text-orange-400 leading-none">{metrics?.atRiskCount ?? 0}</p>
                <p className="text-[9px] text-orange-500/70 dark:text-orange-400/70 uppercase font-medium mt-0.5">At-Risk</p>
              </div>

              {/* Avg Score - Always show */}
              <div className="text-center p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200/50 dark:border-blue-500/20">
                <BarChart3 className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400 mx-auto mb-0.5" />
                <p className="text-base font-bold text-blue-600 dark:text-blue-400 leading-none">{metrics?.averageScore ?? 0}</p>
                <p className="text-[9px] text-blue-500/70 dark:text-blue-400/70 uppercase font-medium mt-0.5">Avg Score</p>
              </div>

              {/* Submitted - Always show */}
              <div className="text-center p-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-500/20">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400 mx-auto mb-0.5" />
                <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 leading-none">{metrics?.submittedCount ?? 0}</p>
                <p className="text-[9px] text-emerald-500/70 dark:text-emerald-400/70 uppercase font-medium mt-0.5">Submitted</p>
              </div>

              {/* Pending - Always show */}
              <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-slate-500/10 border border-slate-200/50 dark:border-slate-500/20">
                <Clock className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400 mx-auto mb-0.5" />
                <p className="text-base font-bold text-slate-600 dark:text-slate-400 leading-none">{(metrics?.totalSchools ?? 0) - (metrics?.submittedCount ?? 0)}</p>
                <p className="text-[9px] text-slate-500/70 dark:text-slate-400/70 uppercase font-medium mt-0.5">Pending</p>
              </div>
            </div>

            {/* Action Button - Full width on left side */}
            <Button
              onClick={() => router.push('/dashboard/school-assessment/regional')}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md gap-2 font-medium h-9 text-sm mt-auto"
            >
              <School className="h-3.5 w-3.5" />
              View Regional Assessments
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Right Side - Submission Progress */}
          <div className="relative w-full lg:w-[280px] bg-gradient-to-br from-blue-600 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 flex flex-col items-center justify-center p-5">
            {/* Background decorative elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-2 left-2 opacity-10">
                <School className="h-6 w-6 text-white" />
              </div>
              <div className="absolute bottom-2 right-2 opacity-10">
                <CheckCircle2 className="h-5 w-5 text-white" />
              </div>
            </div>

            {/* Main Metric Display */}
            <div className="relative z-10 text-center w-full">
              {/* Status Badge */}
              <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm px-2 py-0.5 rounded-full mb-2">
                <div className={`w-1.5 h-1.5 rounded-full bg-white ${submissionRate < 40 ? 'animate-pulse' : ''}`} />
                <span className="text-white/90 font-semibold text-[9px] uppercase tracking-wider">{config.status} Compliance</span>
              </div>

              {/* Submission Counter */}
              <div className="mb-2">
                <div className="inline-flex items-baseline">
                  <span className="text-3xl font-bold text-white">
                    {metrics?.submittedCount ?? 0}
                  </span>
                  <span className="text-base text-white/60 font-medium ml-0.5">
                    /{metrics?.totalSchools ?? 0}
                  </span>
                </div>
                <p className="text-white/70 text-[10px] font-semibold uppercase tracking-wider mt-0.5">
                  Schools Submitted
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full max-w-[200px] mx-auto mb-2">
                <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${submissionRate}%` }}
                  />
                </div>
                <p className="text-white font-semibold text-xs mt-1">
                  {Math.round(submissionRate)}% Compliance
                </p>
              </div>

              {/* Mini Submission Velocity Chart */}
              {chartData.length > 0 && (
                <div className="w-full mt-2 bg-white/10 rounded-lg p-1.5">
                  <div className="h-10 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="submissionGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="white" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="white" stopOpacity={0.05}/>
                          </linearGradient>
                        </defs>
                        <Area
                          type="monotone"
                          dataKey="count"
                          stroke="white"
                          strokeWidth={1.5}
                          fill="url(#submissionGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-white/60 text-[8px] text-center mt-0.5 uppercase tracking-wide">This Week</p>
                </div>
              )}

              {/* Top School Callout */}
              {metrics?.topSchool && (
                <div className="bg-white/10 rounded-md px-3 py-1.5 mt-2">
                  <div className="flex items-center justify-center gap-1.5">
                    <Award className="h-3.5 w-3.5 text-yellow-300" />
                    <span className="text-white/80 text-[10px] truncate max-w-[200px]">
                      <span className="font-semibold">{metrics.topSchool.name}</span>: {metrics.topSchool.score}
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
    .sort((a, b) => {
      const nameA = a.region.toLowerCase();
      const nameB = b.region.toLowerCase();
      if (nameA.includes('georgetown')) return -1;
      if (nameB.includes('georgetown')) return 1;
      const numA = parseInt(a.region.match(/\d+/)?.[0] || '0');
      const numB = parseInt(b.region.match(/\d+/)?.[0] || '0');
      return numA - numB;
    })
    .slice(0, 11)
    .map(r => ({
      name: r.region.toLowerCase().includes('georgetown') ? 'GT' : `R${r.region.match(/\d+/)?.[0] || ''}`,
      fullName: r.region,
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
      <Card className={`overflow-hidden bg-white dark:bg-slate-800 ${className}`}>
        <CardContent className="p-0">
          <div className="flex">
            <div className="flex-1 p-6 space-y-4">
              <Skeleton className="h-8 w-72 dark:bg-slate-700" />
              <Skeleton className="h-4 w-full max-w-lg dark:bg-slate-700" />
              <div className="flex gap-2">
                <Skeleton className="h-10 w-32 dark:bg-slate-700" />
                <Skeleton className="h-10 w-32 dark:bg-slate-700" />
                <Skeleton className="h-10 w-32 dark:bg-slate-700" />
              </div>
              <Skeleton className="h-11 w-60 dark:bg-slate-700" />
            </div>
            <Skeleton className="w-80 h-64 dark:bg-slate-700" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`overflow-hidden border border-slate-200/80 dark:border-slate-700/50 shadow-xl bg-white dark:bg-[hsl(222,47%,11%)] rounded-xl ${className}`}>
      <CardContent className="p-0">
        <div className="flex flex-col xl:flex-row">
          {/* Left Content */}
          <div className="flex-1 p-4 lg:p-5 flex flex-col justify-center">
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-lg lg:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    National School Assessment
                  </h3>
                  {hasCriticalItems && (
                    <Badge className="bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-0 text-[10px] animate-pulse">
                      <AlertCircle className="h-2.5 w-2.5 mr-0.5" />
                      {metrics?.criticalRegionsCount} Regions Need Attention
                    </Badge>
                  )}
                </div>
                <p className="text-gray-600 dark:text-slate-400 text-xs leading-relaxed">
                  {hasCriticalItems
                    ? `${metrics?.criticalRegionsCount || 0} regions underperforming, ${metrics?.neverAssessedCount || 0} schools never assessed.`
                    : "Monitor education quality across all regions."
                  }
                </p>
              </div>

              {/* Stats Cards - Compact */}
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-800/50 rounded-lg p-2 text-center">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 mx-auto mb-0.5" />
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400 leading-none">{metrics?.outstandingCount ?? 0}</p>
                  <p className="text-[9px] text-emerald-600 dark:text-emerald-500 font-medium mt-0.5">Outstanding</p>
                </div>

                <div className={`border rounded-lg p-2 text-center ${
                  (metrics?.needsImprovementCount ?? 0) > 10
                    ? 'bg-red-50/80 dark:bg-red-950/40 border-red-300/50 dark:border-red-800/50'
                    : 'bg-red-50/80 dark:bg-red-950/40 border-red-200/50 dark:border-red-800/50'
                }`}>
                  <AlertTriangle className="h-3.5 w-3.5 text-red-600 dark:text-red-400 mx-auto mb-0.5" />
                  <p className="text-lg font-bold text-red-700 dark:text-red-400 leading-none">{metrics?.needsImprovementCount ?? 0}</p>
                  <p className="text-[9px] text-red-600 dark:text-red-500 font-medium mt-0.5">Need Support</p>
                </div>

                <div className="bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/50 dark:border-blue-800/50 rounded-lg p-2 text-center">
                  <School className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 mx-auto mb-0.5" />
                  <p className="text-lg font-bold text-blue-700 dark:text-blue-400 leading-none">{metrics?.totalSubmitted ?? 0}</p>
                  <p className="text-[9px] text-blue-600 dark:text-blue-500 font-medium mt-0.5">Assessed</p>
                </div>

                <div className={`border rounded-lg p-2 text-center ${
                  (metrics?.neverAssessedCount ?? 0) > 50
                    ? 'bg-orange-50/80 dark:bg-orange-950/40 border-orange-300/50 dark:border-orange-800/50'
                    : 'bg-purple-50/80 dark:bg-purple-950/40 border-purple-200/50 dark:border-purple-800/50'
                }`}>
                  {(metrics?.neverAssessedCount ?? 0) > 50 ? (
                    <>
                      <AlertCircle className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400 mx-auto mb-0.5" />
                      <p className="text-lg font-bold text-orange-700 dark:text-orange-400 leading-none">{metrics?.neverAssessedCount ?? 0}</p>
                      <p className="text-[9px] text-orange-600 dark:text-orange-500 font-medium mt-0.5">Not Assessed</p>
                    </>
                  ) : (
                    <>
                      <MapPin className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 mx-auto mb-0.5" />
                      <p className="text-lg font-bold text-purple-700 dark:text-purple-400 leading-none">{metrics?.totalRegions ?? 0}</p>
                      <p className="text-[9px] text-purple-600 dark:text-purple-500 font-medium mt-0.5">Regions</p>
                    </>
                  )}
                </div>
              </div>

              {/* Urgency Pills Row - Compact */}
              <div className="flex flex-wrap items-center gap-1.5">
                {metrics?.lowestRegion && (
                  <div className="flex items-center gap-1 bg-red-50 dark:bg-red-950/50 px-2 py-1 rounded-full text-xs border border-red-200 dark:border-red-800/50">
                    <ArrowDown className="h-3 w-3 text-red-600 dark:text-red-400" />
                    <span className="font-semibold text-red-700 dark:text-red-400">
                      Lowest: {metrics.lowestRegion.name} ({metrics.lowestRegion.score})
                    </span>
                  </div>
                )}
                {metrics?.topRegion && (
                  <div className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-1 rounded-full text-xs border border-emerald-200 dark:border-emerald-800/50">
                    <Award className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                      Top: {metrics.topRegion.name} ({metrics.topRegion.score})
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1 bg-blue-50 dark:bg-blue-950/50 px-2 py-1 rounded-full text-xs border border-blue-200 dark:border-blue-800/50">
                  <Activity className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  <span className="font-semibold text-blue-700 dark:text-blue-400">
                    {Math.round(metrics?.submissionRate ?? 0)}% Coverage
                  </span>
                </div>
              </div>

              <Button
                onClick={() => router.push('/dashboard/education-official/school-assessment')}
                size="sm"
                className={`bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md shadow-emerald-500/20 gap-1.5 font-semibold text-xs h-8 ${
                  hasCriticalItems ? 'animate-pulse' : ''
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                {hasCriticalItems ? 'View Critical Regions' : 'View National Data'}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Right Side - Interactive Regional Comparison Chart */}
          <div className={`relative w-full xl:w-[280px] bg-gradient-to-br ${config.gradient} flex flex-col items-center justify-center p-4 min-h-[240px]`}>
            {/* Background decorative elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-3 right-3 opacity-15">
                <Globe className="h-8 w-8 text-white" />
              </div>
              <div className="absolute bottom-3 left-3 opacity-15">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div className="absolute top-1/4 left-1/4 w-20 h-20 bg-white/10 rounded-full blur-2xl" />
            </div>

            {/* Main Display */}
            <div className="relative z-10 text-center w-full">
              {/* Large Score */}
              <div className="mb-2">
                <span className="text-4xl lg:text-5xl font-bold text-white drop-shadow-lg">
                  {Math.round(nationalAvg)}
                </span>
                <p className="text-white/80 text-xs font-medium">National Average</p>
                <p className="text-white/60 text-[10px]">out of 1000 points</p>
              </div>

              {/* Status Badge */}
              <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full mb-3">
                <Star className="h-3 w-3 text-yellow-300" />
                <span className="text-white font-semibold text-[10px]">{config.status} Performance</span>
              </div>

              {/* Regional Comparison Bar Chart */}
              {regionalData.length > 0 && (
                <div className="w-full h-20 bg-white/10 rounded-lg p-1.5 pb-0">
                  <p className="text-white/80 text-[8px] mb-0.5 font-medium">Regional Performance (GT & R1-R10)</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={regionalData} margin={{ top: 2, right: 2, left: 2, bottom: 10 }}>
                      <XAxis
                        dataKey="name"
                        tick={{ fill: 'white', fontSize: 6, fontWeight: 600 }}
                        tickLine={false}
                        axisLine={false}
                        interval={0}
                      />
                      <YAxis hide domain={[0, 1000]} />
                      <Tooltip
                        contentStyle={{
                          background: 'rgba(255,255,255,0.98)',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '10px',
                          color: '#1f2937',
                          boxShadow: '0 2px 4px rgb(0 0 0 / 0.1)'
                        }}
                        itemStyle={{ color: '#1f2937', padding: '1px 0' }}
                        labelStyle={{ color: '#4b5563', fontWeight: 'bold', marginBottom: '2px' }}
                        formatter={((value: number, name: string) => [
                          name === 'score' ? `${value} pts` : `${value}%`,
                          name === 'score' ? 'Avg Score' : 'Compliance'
                        ]) as any}
                      />
                      <Bar
                        dataKey="score"
                        radius={[2, 2, 0, 0]}
                        barSize={12}
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
                <div className="bg-red-500/30 backdrop-blur-sm rounded-lg p-1.5 mt-2 border border-red-300/50">
                  <div className="flex items-center justify-center gap-1">
                    <AlertCircle className="h-3 w-3 text-yellow-300" />
                    <span className="text-white text-[9px] font-semibold">
                      {metrics.lowestRegion.name} needs intervention ({metrics.lowestRegion.score} pts)
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
