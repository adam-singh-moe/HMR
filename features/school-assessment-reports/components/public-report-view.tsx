"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  BookOpen,
  Users,
  Building2,
  GraduationCap,
  ClipboardList,
  HeartPulse,
  Handshake,
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Award,
  Shield,
  Target,
  Sparkles,
  LayoutDashboard,
} from "lucide-react"
import { useMemo } from "react"
import type { 
  CategoryName, 
  RatingLevel, 
  TAPSCategoryName,
  TAPSRatingGrade,
} from "../types"
import { TAPS_TOTAL_MAX_SCORE, TAPS_RATING_THRESHOLDS, RATING_THRESHOLDS } from "../types"
import { 
  getRatingGrade, 
  assignTAPSRatingGrade,
  getTAPSGradeTone,
  getPerformanceTone,
  getPercentage,
} from "../actions/scoring"
import { PublicAssessmentCharts } from "./public-assessment-charts"

// ============================================================================
// CONSTANTS
// ============================================================================

const CATEGORY_ICONS: Record<CategoryName | 'general', React.ReactNode> = {
  academic: <BookOpen className="h-5 w-5" />,
  attendance: <Users className="h-5 w-5" />,
  infrastructure: <Building2 className="h-5 w-5" />,
  teaching_quality: <GraduationCap className="h-5 w-5" />,
  management: <ClipboardList className="h-5 w-5" />,
  student_welfare: <HeartPulse className="h-5 w-5" />,
  community: <Handshake className="h-5 w-5" />,
  general: <Lightbulb className="h-5 w-5" />,
}

const TAPS_CATEGORY_ICONS: Record<TAPSCategoryName | 'general', React.ReactNode> = {
  school_inputs_operations: <Building2 className="h-5 w-5" />,
  leadership: <Target className="h-5 w-5" />,
  academics: <BookOpen className="h-5 w-5" />,
  teacher_development: <GraduationCap className="h-5 w-5" />,
  health_safety: <Shield className="h-5 w-5" />,
  school_culture: <Sparkles className="h-5 w-5" />,
  general: <Lightbulb className="h-5 w-5" />,
}

const CATEGORY_CONFIG: Record<CategoryName | 'general', { label: string; maxScore?: number }> = {
  academic: { label: 'Academic Performance', maxScore: 300 },
  attendance: { label: 'Attendance', maxScore: 150 },
  infrastructure: { label: 'Infrastructure', maxScore: 150 },
  teaching_quality: { label: 'Teaching Quality', maxScore: 150 },
  management: { label: 'Management', maxScore: 100 },
  student_welfare: { label: 'Student Welfare', maxScore: 100 },
  community: { label: 'Community Engagement', maxScore: 50 },
  general: { label: 'General Improvement' },
}

const TAPS_CATEGORY_CONFIG: Record<TAPSCategoryName | 'general', { label: string; maxScore?: number }> = {
  school_inputs_operations: { label: 'School Inputs & Operations', maxScore: 80 },
  leadership: { label: 'Leadership', maxScore: 30 },
  academics: { label: 'Academics', maxScore: 200 },
  teacher_development: { label: 'Teacher Development', maxScore: 20 },
  health_safety: { label: 'Health & Safety', maxScore: 50 },
  school_culture: { label: 'School Culture', maxScore: 70 },
  general: { label: 'General Improvement' },
}

const RATING_DISPLAY_LABELS: Record<RatingLevel, string> = {
  outstanding: 'Outstanding',
  very_good: 'Very Good',
  good: 'Good',
  satisfactory: 'Satisfactory',
  needs_improvement: 'Needs Improvement',
}

const TAPS_RATING_LABELS: Record<TAPSRatingGrade, string> = {
  'A': 'Outstanding',
  'B': 'High Achieving',
  'C': 'Standard',
  'D': 'Struggling',
  'E': 'Critical Support Needed',
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getTAPSGradeIcon(grade: TAPSRatingGrade): React.ReactNode {
  switch (grade) {
    case 'A': return <Award className="h-6 w-6 text-green-500" />
    case 'B': return <TrendingUp className="h-6 w-6 text-blue-500" />
    case 'C': return <CheckCircle2 className="h-6 w-6 text-amber-500" />
    case 'D': return <AlertTriangle className="h-6 w-6 text-orange-500" />
    default: return <AlertTriangle className="h-6 w-6 text-red-500" />
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

interface PublicReportViewProps {
  report: {
    id: string
    schoolId: string
    schoolName: string
    regionId: string
    regionName: string
    academicYear: string
    termName: string
    periodId: string
    totalScore: number
    ratingLevel: RatingLevel
    // TAPS-specific fields
    isTAPS?: boolean
    tapsRatingGrade?: TAPSRatingGrade
    tapsCategoryScores?: {
      school_inputs_operations: number
      leadership: number
      academics: number
      teacher_development: number
      health_safety: number
      school_culture: number
    }
    submittedAt: string
    categoryScores: {
      academic: number
      attendance: number
      infrastructure: number
      teaching_quality: number
      management: number
      student_welfare: number
      community: number
    }
  }
  schoolTrends: any[]
}

export function PublicReportView({ report, schoolTrends }: PublicReportViewProps) {
  const isTAPS = Boolean(report.isTAPS || report.tapsRatingGrade || report.tapsCategoryScores)

  const resolvedGrade: TAPSRatingGrade = useMemo(() => {
    if (isTAPS) {
      return (report.tapsRatingGrade as TAPSRatingGrade) || assignTAPSRatingGrade(report.totalScore)
    } else {
      return getRatingGrade(report.totalScore) as TAPSRatingGrade
    }
  }, [isTAPS, report.tapsRatingGrade, report.totalScore])

  const maxScore = isTAPS ? TAPS_TOTAL_MAX_SCORE : 1000
  const overallPercentage = getPercentage(report.totalScore, maxScore)
  const gradeTone = getTAPSGradeTone(resolvedGrade)

  return (
    <div className="space-y-6 pb-12">
      {/* Modern Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-[hsl(222,47%,9%)] border border-slate-200/80 dark:border-slate-700/50 shadow-sm">
        {/* Gradient Accent Bar */}
        <div className={`absolute top-0 left-0 right-0 h-1 ${
          resolvedGrade === 'A' ? 'bg-green-500' :
          resolvedGrade === 'B' ? 'bg-blue-500' :
          resolvedGrade === 'C' ? 'bg-amber-500' :
          resolvedGrade === 'D' ? 'bg-orange-500' : 'bg-red-500'
        }`} />

        <div className="p-5 md:p-8">
          {/* Top Row: School Info */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <LayoutDashboard className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{report.schoolName}</h2>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                <Badge variant="outline" className="font-normal bg-slate-50">{report.regionName}</Badge>
                <Separator orientation="vertical" className="h-4" />
                <span className="font-medium">{report.academicYear} - {report.termName}</span>
                <Separator orientation="vertical" className="h-4" />
                <span>Assessed: {new Date(report.submittedAt).toLocaleDateString()}</span>
              </div>
            </div>
            
            {/* Report Type Badge */}
            <Badge variant="secondary" className="self-start md:self-center">
              {isTAPS ? 'Secondary Assessment (TAPS)' : 'Primary Assessment'}
            </Badge>
          </div>

          {/* Score Cards Row */}
          <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
            {/* Main Grade Card */}
            <div className={`relative overflow-hidden rounded-xl p-6 ${gradeTone.bgClass} border ${gradeTone.borderClass}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-2">Performance Grade</p>
                  <div className="flex items-baseline gap-3">
                    <span className={`text-7xl font-black ${gradeTone.textClass}`}>{resolvedGrade}</span>
                    <span className={`text-lg font-bold ${gradeTone.textClass} opacity-80 leading-tight`}>
                      {isTAPS ? TAPS_RATING_LABELS[resolvedGrade] : RATING_DISPLAY_LABELS[report.ratingLevel]}
                    </span>
                  </div>
                </div>
                <div className={`h-20 w-20 rounded-full flex items-center justify-center ${gradeTone.badgeClass} shadow-lg ring-4 ring-white/50 dark:ring-black/20`}>
                  {getTAPSGradeIcon(resolvedGrade)}
                </div>
              </div>
            </div>

            {/* Score Card */}
            <div className="md:col-span-2 rounded-xl p-6 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/50 flex flex-col justify-center">
              <div className="flex items-end justify-between mb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Total Score</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black text-slate-900 dark:text-white">{report.totalScore}</span>
                    <span className="text-xl text-slate-400 dark:text-slate-500 font-medium">/ {maxScore}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Achievement</p>
                  <span className={`text-4xl font-black ${gradeTone.textClass}`}>{overallPercentage}%</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                  <span>Progress to Excellence</span>
                </div>
                <div className="h-4 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${
                      resolvedGrade === 'A' ? 'bg-green-500' :
                      resolvedGrade === 'B' ? 'bg-blue-500' :
                      resolvedGrade === 'C' ? 'bg-amber-500' :
                      resolvedGrade === 'D' ? 'bg-orange-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${overallPercentage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Analytics Section */}
      <PublicAssessmentCharts 
        report={report} 
        schoolTrends={schoolTrends}
      />

      {/* Category Breakdown - List Layout */}
      <div className="space-y-4 pt-4">
        <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          Category Breakdown
        </h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm -mt-2 mb-4">
          Detailed performance metrics across all assessment areas
        </p>

        <div className="grid gap-3 md:grid-cols-2">
          {(Object.entries(isTAPS ? TAPS_CATEGORY_CONFIG : CATEGORY_CONFIG) as [any, { label: string; maxScore: number }][]).map(([category, config]) => {
            const score = isTAPS ? report.tapsCategoryScores?.[category as TAPSCategoryName] || 0 : report.categoryScores[category as CategoryName] || 0
            const percentage = getPercentage(score, config.maxScore || 0)
            const tone = getPerformanceTone(percentage)
            const Icon = isTAPS ? TAPS_CATEGORY_ICONS[category as TAPSCategoryName] : CATEGORY_ICONS[category as CategoryName]

            return (
              <Card key={category} className="overflow-hidden border-slate-200/80 dark:border-slate-700/50 hover:shadow-md transition-all duration-200">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 rounded-lg p-2 ${tone.bgClass} ${tone.textClass}`}>
                        {Icon}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white text-sm">{config.label}</h4>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge variant="outline" className={`${tone.bgClass} ${tone.textClass} border-0 font-medium`}>
                            {tone.label}
                          </Badge>
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            {score} / {config.maxScore} pts
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-2xl font-bold ${tone.textClass}`}>{percentage}%</span>
                    </div>
                  </div>
                  
                  <div className="mt-3 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${tone.barClass.replace('[&>div]:', '')}`} 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
