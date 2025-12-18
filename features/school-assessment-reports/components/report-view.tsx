"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  BookOpen,
  Users,
  Building2,
  GraduationCap,
  ClipboardList,
  HeartPulse,
  Handshake,
  Download,
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Award,
  Shield,
  Target,
  Sparkles,
  Loader2,
} from "lucide-react"
import type { 
  CategoryName, 
  RatingLevel, 
  ReportRecommendation,
  TAPSCategoryName,
  TAPSRatingGrade,
} from "../types"
import { TAPS_TOTAL_MAX_SCORE, TAPS_RATING_THRESHOLDS } from "../types"

// ============================================================================
// TYPES
// ============================================================================

interface ReportViewProps {
  report: {
    id: string
    schoolName: string
    regionName: string
    academicYear: string
    termName: string
    totalScore: number
    ratingLevel: RatingLevel
    // TAPS-specific fields
    isTAPS?: boolean
    tapsRatingGrade?: TAPSRatingGrade
    tapsCategoryScores?: {
      school_inputs: number
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
    categoryDetails?: {
      academic?: any
      attendance?: any
      infrastructure?: any
      teachingQuality?: any
      management?: any
      studentWelfare?: any
      community?: any
    }
  }
  recommendations?: ReportRecommendation[]
  isGeneratingRecommendations?: boolean
  onExportPDF?: () => void
  onExportExcel?: () => void
  showExportButtons?: boolean
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CATEGORY_ICONS: Record<CategoryName, React.ReactNode> = {
  academic: <BookOpen className="h-5 w-5" />,
  attendance: <Users className="h-5 w-5" />,
  infrastructure: <Building2 className="h-5 w-5" />,
  teaching_quality: <GraduationCap className="h-5 w-5" />,
  management: <ClipboardList className="h-5 w-5" />,
  student_welfare: <HeartPulse className="h-5 w-5" />,
  community: <Handshake className="h-5 w-5" />,
}

// TAPS category icons
const TAPS_CATEGORY_ICONS: Record<TAPSCategoryName, React.ReactNode> = {
  school_inputs: <Building2 className="h-5 w-5" />,
  leadership: <Target className="h-5 w-5" />,
  academics: <BookOpen className="h-5 w-5" />,
  teacher_development: <GraduationCap className="h-5 w-5" />,
  health_safety: <Shield className="h-5 w-5" />,
  school_culture: <Sparkles className="h-5 w-5" />,
}

// Maps lowercase category names to their display labels and max scores
const CATEGORY_CONFIG: Record<CategoryName, { label: string; maxScore: number }> = {
  academic: { label: 'Academic Performance', maxScore: 300 },
  attendance: { label: 'Attendance', maxScore: 150 },
  infrastructure: { label: 'Infrastructure', maxScore: 150 },
  teaching_quality: { label: 'Teaching Quality', maxScore: 150 },
  management: { label: 'Management', maxScore: 100 },
  student_welfare: { label: 'Student Welfare', maxScore: 100 },
  community: { label: 'Community Engagement', maxScore: 50 },
}

// TAPS category config
const TAPS_CATEGORY_CONFIG: Record<TAPSCategoryName, { label: string; maxScore: number }> = {
  school_inputs: { label: 'School Inputs & Operations', maxScore: 80 },
  leadership: { label: 'Leadership', maxScore: 30 },
  academics: { label: 'Academics', maxScore: 200 },
  teacher_development: { label: 'Teacher Development', maxScore: 20 },
  health_safety: { label: 'Health & Safety', maxScore: 50 },
  school_culture: { label: 'School Culture', maxScore: 70 },
}

const RATING_DISPLAY_LABELS: Record<RatingLevel, string> = {
  outstanding: 'Outstanding',
  very_good: 'Very Good',
  good: 'Good',
  satisfactory: 'Satisfactory',
  needs_improvement: 'Needs Improvement',
}

// TAPS rating grade display labels
const TAPS_RATING_LABELS: Record<TAPSRatingGrade, string> = {
  'A': 'Outstanding',
  'B': 'High Achieving',
  'C': 'Standard',
  'D': 'Struggling',
  'E': 'Critical Support Needed',
}

const RATING_COLORS: Record<RatingLevel, string> = {
  'outstanding': 'bg-emerald-500',
  'very_good': 'bg-blue-500',
  'good': 'bg-amber-500',
  'satisfactory': 'bg-orange-500',
  'needs_improvement': 'bg-red-500',
}

// TAPS grade colors
const TAPS_GRADE_COLORS: Record<TAPSRatingGrade, string> = {
  'A': 'bg-green-500',
  'B': 'bg-blue-500',
  'C': 'bg-amber-500',
  'D': 'bg-orange-500',
  'E': 'bg-red-500',
}

const TAPS_GRADE_BG_COLORS: Record<TAPSRatingGrade, string> = {
  'A': 'bg-green-100 text-green-700',
  'B': 'bg-blue-100 text-blue-700',
  'C': 'bg-amber-100 text-amber-700',
  'D': 'bg-orange-100 text-orange-700',
  'E': 'bg-red-100 text-red-700',
}

const RATING_TEXT_COLORS: Record<RatingLevel, string> = {
  'outstanding': 'text-emerald-600',
  'very_good': 'text-blue-600',
  'good': 'text-amber-600',
  'satisfactory': 'text-orange-600',
  'needs_improvement': 'text-red-600',
}

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-800 border-red-200',
  medium: 'bg-amber-100 text-amber-800 border-amber-200',
  low: 'bg-green-100 text-green-800 border-green-200',
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getPercentage(score: number, max: number): number {
  return Math.round((score / max) * 100)
}

function getRatingIcon(rating: RatingLevel): React.ReactNode {
  switch (rating) {
    case 'outstanding':
      return <Award className="h-6 w-6 text-emerald-500" />
    case 'very_good':
      return <TrendingUp className="h-6 w-6 text-blue-500" />
    case 'good':
      return <CheckCircle2 className="h-6 w-6 text-amber-500" />
    case 'satisfactory':
      return <AlertTriangle className="h-6 w-6 text-orange-500" />
    default:
      return <AlertTriangle className="h-6 w-6 text-red-500" />
  }
}

function getTAPSGradeIcon(grade: TAPSRatingGrade): React.ReactNode {
  switch (grade) {
    case 'A':
      return <Award className="h-6 w-6 text-green-500" />
    case 'B':
      return <TrendingUp className="h-6 w-6 text-blue-500" />
    case 'C':
      return <CheckCircle2 className="h-6 w-6 text-amber-500" />
    case 'D':
      return <AlertTriangle className="h-6 w-6 text-orange-500" />
    default:
      return <AlertTriangle className="h-6 w-6 text-red-500" />
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ReportView({
  report,
  recommendations = [],
  isGeneratingRecommendations = false,
  onExportPDF,
  onExportExcel,
  showExportButtons = true,
}: ReportViewProps) {
  const isTAPS = Boolean(report.isTAPS || report.tapsRatingGrade || report.tapsCategoryScores)

  const resolvedTAPSGrade: TAPSRatingGrade | null = (() => {
    if (!isTAPS) return null
    if (report.tapsRatingGrade) return report.tapsRatingGrade
    const total = Number(report.totalScore || 0)
    if (total >= TAPS_RATING_THRESHOLDS.A.min) return 'A'
    if (total >= TAPS_RATING_THRESHOLDS.B.min) return 'B'
    if (total >= TAPS_RATING_THRESHOLDS.C.min) return 'C'
    if (total >= TAPS_RATING_THRESHOLDS.D.min) return 'D'
    return 'E'
  })()

  const maxScore = isTAPS ? TAPS_TOTAL_MAX_SCORE : 1000
  const overallPercentage = getPercentage(report.totalScore, maxScore)
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">{report.schoolName}</CardTitle>
              <CardDescription className="text-base mt-1">{report.regionName}</CardDescription>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline">{report.academicYear}</Badge>
                <Badge variant="outline">{report.termName}</Badge>
                {isTAPS && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    TAPS Report
                  </Badge>
                )}
              </div>
            </div>
            {showExportButtons && (
              <div className="flex gap-2">
                {onExportPDF && (
                  <Button variant="outline" size="sm" onClick={onExportPDF}>
                    <Download className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                )}
                {onExportExcel && (
                  <Button variant="outline" size="sm" onClick={onExportExcel}>
                    <Download className="h-4 w-4 mr-2" />
                    Excel
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Overall Score - Different rendering for TAPS vs Demo */}
      {isTAPS ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                {resolvedTAPSGrade ? getTAPSGradeIcon(resolvedTAPSGrade) : <Award className="h-6 w-6 text-blue-500" />}
                <div>
                  <div className="text-4xl font-bold">{report.totalScore}</div>
                  <div className="text-sm text-muted-foreground">out of {TAPS_TOTAL_MAX_SCORE} points</div>
                </div>
              </div>
              <div className="text-center md:text-right">
                {resolvedTAPSGrade ? (
                  <>
                    <div className={`inline-flex items-center text-3xl font-bold px-6 py-2 rounded-lg ${TAPS_GRADE_BG_COLORS[resolvedTAPSGrade]}`}>
                      Grade {resolvedTAPSGrade}
                    </div>
                    <div className="text-sm font-medium mt-1">
                      {TAPS_RATING_LABELS[resolvedTAPSGrade]}
                    </div>
                  </>
                ) : (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-lg px-4 py-1">
                    TAPS Report
                  </Badge>
                )}
                <div className="text-sm text-muted-foreground mt-1">
                  Submitted: {formatDate(report.submittedAt)}
                </div>
              </div>
            </div>
            <div className="mt-6">
              <div className="flex justify-between text-sm mb-2">
                <span>Overall Performance</span>
                <span className="font-medium">{overallPercentage}%</span>
              </div>
              <Progress value={overallPercentage} className="h-3" />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                {getRatingIcon(report.ratingLevel)}
                <div>
                  <div className="text-4xl font-bold">{report.totalScore}</div>
                  <div className="text-sm text-muted-foreground">out of 1000 points</div>
                </div>
              </div>
              <div className="text-center md:text-right">
                <Badge className={`${RATING_COLORS[report.ratingLevel]} text-white text-lg px-4 py-1`}>
                  {RATING_DISPLAY_LABELS[report.ratingLevel]}
                </Badge>
                <div className="text-sm text-muted-foreground mt-2">
                  Submitted: {formatDate(report.submittedAt)}
                </div>
              </div>
            </div>
            <div className="mt-6">
              <div className="flex justify-between text-sm mb-2">
              <span>Overall Performance</span>
              <span className="font-medium">{overallPercentage}%</span>
            </div>
            <Progress value={overallPercentage} className="h-3" />
          </div>
        </CardContent>
      </Card>
      )}

      {/* Category Scores - Different for TAPS vs Demo */}
      {isTAPS && report.tapsCategoryScores ? (
        <Card>
          <CardHeader>
            <CardTitle>TAPS Category Scores</CardTitle>
            <CardDescription>Performance breakdown by TAPS category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(Object.entries(TAPS_CATEGORY_CONFIG) as [TAPSCategoryName, { label: string; maxScore: number }][]).map(([category, config]) => {
                const score = report.tapsCategoryScores![category] || 0
                const percentage = getPercentage(score, config.maxScore)
                const isWeak = percentage < 60
                
                return (
                  <Card key={category} className={`${isWeak ? 'border-amber-300' : ''}`}>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-3">
                        {TAPS_CATEGORY_ICONS[category]}
                        <span className="font-medium text-sm">{config.label}</span>
                      </div>
                      <div className="flex items-end justify-between mb-2">
                        <span className="text-2xl font-bold">{score}</span>
                        <span className="text-sm text-muted-foreground">/ {config.maxScore}</span>
                      </div>
                      <Progress 
                        value={percentage} 
                        className={`h-2 ${isWeak ? '[&>div]:bg-amber-500' : ''}`} 
                      />
                      <div className="text-xs text-muted-foreground mt-1 text-right">
                        {percentage}%
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Category Scores</CardTitle>
            <CardDescription>Performance breakdown by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(Object.entries(CATEGORY_CONFIG) as [CategoryName, { label: string; maxScore: number }][]).map(([category, config]) => {
                const score = report.categoryScores[category] || 0
                const percentage = getPercentage(score, config.maxScore)
                const isWeak = percentage < 60
                
                return (
                  <Card key={category} className={`${isWeak ? 'border-amber-300' : ''}`}>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-3">
                        {CATEGORY_ICONS[category]}
                        <span className="font-medium text-sm">{config.label}</span>
                      </div>
                      <div className="flex items-end justify-between mb-2">
                        <span className="text-2xl font-bold">{score}</span>
                        <span className="text-sm text-muted-foreground">/ {config.maxScore}</span>
                      </div>
                      <Progress 
                        value={percentage} 
                        className={`h-2 ${isWeak ? '[&>div]:bg-amber-500' : ''}`} 
                      />
                      <div className="text-xs text-muted-foreground mt-1 text-right">
                        {percentage}%
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations placeholder */}
      {isGeneratingRecommendations && recommendations.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Recommendations in progress
            </CardTitle>
            <CardDescription>
              Generating constructive improvement recommendations based on this report.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Please wait a moment…</p>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              Recommendations for Improvement
            </CardTitle>
            <CardDescription>
              AI-generated suggestions based on your assessment scores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className={`p-4 rounded-lg border ${PRIORITY_COLORS[rec.priority]}`}
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex items-center gap-2">
                      {isTAPS 
                        ? TAPS_CATEGORY_ICONS[rec.category as TAPSCategoryName] || <Lightbulb className="h-4 w-4" />
                        : CATEGORY_ICONS[rec.category as CategoryName] || <Lightbulb className="h-4 w-4" />
                      }
                      <span className="font-medium">
                        {isTAPS
                          ? TAPS_CATEGORY_CONFIG[rec.category as TAPSCategoryName]?.label || rec.category
                          : CATEGORY_CONFIG[rec.category as CategoryName]?.label || rec.category
                        }
                      </span>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {rec.priority} Priority
                    </Badge>
                  </div>
                  <p className="text-sm mb-3">{rec.recommendationText}</p>
                  {rec.focusAreas && rec.focusAreas.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {rec.focusAreas.map((area, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {area}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rating Scale Reference - Different for TAPS vs Demo */}
      {isTAPS ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">TAPS Rating Scale Reference</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
              <div className="flex items-center gap-2 p-2 rounded bg-green-50">
                <div className={`w-3 h-3 rounded ${TAPS_GRADE_COLORS['A']}`} />
                <span className="text-green-700">A: Outstanding ({TAPS_RATING_THRESHOLDS.A.min}-{TAPS_TOTAL_MAX_SCORE})</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded bg-blue-50">
                <div className={`w-3 h-3 rounded ${TAPS_GRADE_COLORS['B']}`} />
                <span className="text-blue-700">B: High Achieving ({TAPS_RATING_THRESHOLDS.B.min}-{TAPS_RATING_THRESHOLDS.B.max})</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded bg-amber-50">
                <div className={`w-3 h-3 rounded ${TAPS_GRADE_COLORS['C']}`} />
                <span className="text-amber-700">C: Standard ({TAPS_RATING_THRESHOLDS.C.min}-{TAPS_RATING_THRESHOLDS.C.max})</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded bg-orange-50">
                <div className={`w-3 h-3 rounded ${TAPS_GRADE_COLORS['D']}`} />
                <span className="text-orange-700">D: Struggling ({TAPS_RATING_THRESHOLDS.D.min}-{TAPS_RATING_THRESHOLDS.D.max})</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded bg-red-50">
                <div className={`w-3 h-3 rounded ${TAPS_GRADE_COLORS['E']}`} />
                <span className="text-red-700">E: Critical ({TAPS_RATING_THRESHOLDS.E.min}-{TAPS_RATING_THRESHOLDS.E.max})</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Rating Scale Reference</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded ${RATING_COLORS['outstanding']}`} />
                <span>Outstanding (850-1000)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded ${RATING_COLORS['very_good']}`} />
                <span>Very Good (700-849)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded ${RATING_COLORS['good']}`} />
                <span>Good (550-699)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded ${RATING_COLORS['satisfactory']}`} />
                <span>Satisfactory (400-549)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded ${RATING_COLORS['needs_improvement']}`} />
                <span>Needs Improvement (&lt;400)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
