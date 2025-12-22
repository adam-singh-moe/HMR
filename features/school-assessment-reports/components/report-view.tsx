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
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  ArrowLeftRight,
  Settings2,
} from "lucide-react"
import { useState, useEffect, useMemo } from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { 
  CategoryName, 
  RatingLevel, 
  ReportRecommendation,
  TAPSCategoryName,
  TAPSRatingGrade,
  UserPreferences,
} from "../types"
import { TAPS_TOTAL_MAX_SCORE, TAPS_RATING_THRESHOLDS, RATING_THRESHOLDS } from "../types"
import { saveUserPreferences, getUserPreferences, getRegionalTopPerformer } from "../actions/analytics"
import { getReportBySchoolAndPeriod } from "../actions/reports"
import { startExportJob, getExportJobStatus, type ExportJob } from "../actions/exports"
import { AssessmentCharts } from "./assessment-charts"
import { toast } from "sonner"

// ============================================================================
// TYPES
// ============================================================================

interface ReportViewProps {
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
  onExportPDF?: (settings?: any) => void
  onExportExcel?: () => void
  showExportButtons?: boolean
  availableSchools?: { id: string; name: string }[]
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
  school_inputs_operations: <Building2 className="h-5 w-5" />,
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
  school_inputs_operations: { label: 'School Inputs & Operations', maxScore: 80 },
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

function getPerformanceTone(percentage: number): {
  label: string
  barClass: string
  borderClass: string
  badgeClass: string
  iconClass: string
  textClass: string
  bgClass: string
} {
  if (!Number.isFinite(percentage) || percentage <= 0) {
    return {
      label: 'Not started',
      barClass: '[&>div]:bg-muted-foreground/30',
      borderClass: 'border-border',
      badgeClass: 'bg-muted text-muted-foreground border-border',
      iconClass: 'text-muted-foreground',
      textClass: 'text-muted-foreground',
      bgClass: 'bg-muted/30',
    }
  }

  if (percentage >= 85) {
    return {
      label: 'Excellent',
      barClass: '[&>div]:bg-emerald-500',
      borderClass: 'border-emerald-200',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      iconClass: 'text-emerald-600',
      textClass: 'text-emerald-700',
      bgClass: 'bg-emerald-50',
    }
  }

  if (percentage >= 70) {
    return {
      label: 'Strong',
      barClass: '[&>div]:bg-blue-500',
      borderClass: 'border-blue-200',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      iconClass: 'text-blue-600',
      textClass: 'text-blue-700',
      bgClass: 'bg-blue-50',
    }
  }

  if (percentage >= 60) {
    return {
      label: 'On track',
      barClass: '[&>div]:bg-amber-500',
      borderClass: 'border-amber-200',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      iconClass: 'text-amber-600',
      textClass: 'text-amber-700',
      bgClass: 'bg-amber-50',
    }
  }

  if (percentage >= 40) {
    return {
      label: 'Needs focus',
      barClass: '[&>div]:bg-orange-500',
      borderClass: 'border-orange-200',
      badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
      iconClass: 'text-orange-600',
      textClass: 'text-orange-700',
      bgClass: 'bg-orange-50',
    }
  }

  return {
    label: 'Critical',
    barClass: '[&>div]:bg-red-500',
    borderClass: 'border-red-200',
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
    iconClass: 'text-red-600',
    textClass: 'text-red-700',
    bgClass: 'bg-red-50',
  }
}

function getTAPSGradeTone(grade: TAPSRatingGrade): {
  barClass: string
  badgeClass: string
  iconClass: string
  bgClass: string
  ringClass: string
  textClass: string
  borderClass: string
} {
  switch (grade) {
    case 'A':
      return {
        barClass: '[&>div]:bg-green-500',
        badgeClass: 'bg-green-50 text-green-800 border-green-200',
        iconClass: 'text-green-600',
        bgClass: 'bg-green-50',
        ringClass: 'ring-1 ring-green-200',
        textClass: 'text-green-800',
        borderClass: 'border-green-200',
      }
    case 'B':
      return {
        barClass: '[&>div]:bg-blue-500',
        badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
        iconClass: 'text-blue-600',
        bgClass: 'bg-blue-50',
        ringClass: 'ring-1 ring-blue-200',
        textClass: 'text-blue-800',
        borderClass: 'border-blue-200',
      }
    case 'C':
      return {
        barClass: '[&>div]:bg-amber-500',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
        iconClass: 'text-amber-600',
        bgClass: 'bg-amber-50',
        ringClass: 'ring-1 ring-amber-200',
        textClass: 'text-amber-800',
        borderClass: 'border-amber-200',
      }
    case 'D':
      return {
        barClass: '[&>div]:bg-orange-500',
        badgeClass: 'bg-orange-50 text-orange-800 border-orange-200',
        iconClass: 'text-orange-600',
        bgClass: 'bg-orange-50',
        ringClass: 'ring-1 ring-orange-200',
        textClass: 'text-orange-800',
        borderClass: 'border-orange-200',
      }
    default:
      return {
        barClass: '[&>div]:bg-red-500',
        badgeClass: 'bg-red-50 text-red-800 border-red-200',
        iconClass: 'text-red-600',
        bgClass: 'bg-red-50',
        ringClass: 'ring-1 ring-red-200',
        textClass: 'text-red-800',
        borderClass: 'border-red-200',
      }
  }
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
  availableSchools = [],
}: ReportViewProps) {
  const [isComparisonMode, setIsComparisonMode] = useState(false)
  const [comparisonSchoolId, setComparisonSchoolId] = useState<string | null>(null)
  const [comparisonReport, setComparisonReport] = useState<any>(null)
  const [isLoadingComparison, setIsLoadingComparison] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})
  const [userPrefs, setUserPrefs] = useState<UserPreferences | null>(null)
  const [activeExportJob, setActiveExportJob] = useState<ExportJob | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  // Poll for export job status
  useEffect(() => {
    let pollInterval: NodeJS.Timeout

    if (activeExportJob && (activeExportJob.status === 'pending' || activeExportJob.status === 'processing')) {
      pollInterval = setInterval(async () => {
        const { job, error } = await getExportJobStatus(activeExportJob.id)
        if (error) {
          console.error('Polling error:', error)
          clearInterval(pollInterval)
          return
        }
        if (job) {
          setActiveExportJob(job)
          if (job.status === 'completed') {
            setIsExporting(false)
            toast.success('Report exported successfully!')
            window.open(job.download_url, '_blank')
            clearInterval(pollInterval)
          } else if (job.status === 'failed') {
            setIsExporting(false)
            toast.error(`Export failed: ${job.error_message}`)
            clearInterval(pollInterval)
          }
        }
      }, 2000)
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [activeExportJob])

  const handleExportPDF = async () => {
    setIsExporting(true)
    const { jobId, error } = await startExportJob(report.id, 'pdf')
    
    if (error) {
      toast.error(`Failed to start export: ${error}`)
      setIsExporting(false)
      return
    }

    if (jobId) {
      const { job } = await getExportJobStatus(jobId)
      setActiveExportJob(job)
      toast.info('Export started. Please wait...')
    }
  }

  // Load user preferences and default comparison
  useEffect(() => {
    async function loadPrefs() {
      const prefs = await getUserPreferences()
      if (prefs) {
        setUserPrefs(prefs as any)
        if (prefs.default_comparison_school_id) {
          setComparisonSchoolId(prefs.default_comparison_school_id)
        }
      } else {
        // Default to regional top performer if no prefs
        const topPerformerId = await getRegionalTopPerformer(report.regionId, report.periodId)
        if (topPerformerId) {
          setComparisonSchoolId(topPerformerId)
        }
      }
    }
    loadPrefs()
  }, [report.regionId, report.periodId])

  // Fetch comparison report
  useEffect(() => {
    async function fetchComparison() {
      if (isComparisonMode && comparisonSchoolId) {
        setIsLoadingComparison(true)
        const compReport = await getReportBySchoolAndPeriod(comparisonSchoolId, report.periodId)
        setComparisonReport(compReport)
        setIsLoadingComparison(false)
      } else {
        setComparisonReport(null)
      }
    }
    fetchComparison()
  }, [isComparisonMode, comparisonSchoolId, report.periodId])

  const handleComparisonToggle = (checked: boolean) => {
    setIsComparisonMode(checked)
  }

  const handleSchoolChange = async (schoolId: string) => {
    setComparisonSchoolId(schoolId)
    await saveUserPreferences({ default_comparison_school_id: schoolId })
  }

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }))
  }

  const isTAPS = Boolean(report.isTAPS || report.tapsRatingGrade || report.tapsCategoryScores)

  const resolvedTAPSGrade: TAPSRatingGrade | null = useMemo(() => {
    if (!isTAPS) return null
    if (report.tapsRatingGrade) return report.tapsRatingGrade
    const total = Number(report.totalScore || 0)
    if (total >= TAPS_RATING_THRESHOLDS.A.min) return 'A'
    if (total >= TAPS_RATING_THRESHOLDS.B.min) return 'B'
    if (total >= TAPS_RATING_THRESHOLDS.C.min) return 'C'
    if (total >= TAPS_RATING_THRESHOLDS.D.min) return 'D'
    return 'E'
  }, [isTAPS, report.tapsRatingGrade, report.totalScore])

  const maxScore = isTAPS ? TAPS_TOTAL_MAX_SCORE : 1000
  const overallPercentage = getPercentage(report.totalScore, maxScore)
  const overallTone = getPerformanceTone(overallPercentage)
  const tapsTone = resolvedTAPSGrade ? getTAPSGradeTone(resolvedTAPSGrade) : null

  const comparisonPercentage = comparisonReport ? getPercentage(comparisonReport.totalScore, maxScore) : null
  const scoreDiff = comparisonReport ? report.totalScore - comparisonReport.totalScore : null
  const percentageDiff = comparisonReport ? overallPercentage - comparisonPercentage! : null

  return (
    <div className="space-y-6 pb-20">
      {/* Sticky Header for Mobile */}
      <div className="sticky top-0 z-30 -mx-4 px-4 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b md:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${tapsTone?.bgClass || overallTone.bgClass}`}>
              <span className="text-xs font-bold">{isTAPS ? resolvedTAPSGrade : overallPercentage + '%'}</span>
            </div>
            <div>
              <div className="text-sm font-bold truncate max-w-[150px]">{report.schoolName}</div>
              <div className="text-[10px] text-muted-foreground">{report.totalScore} pts</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isComparisonMode && comparisonReport && (
              <Badge variant={percentageDiff! >= 0 ? "success" : "destructive"} className="text-[10px] px-1.5 py-0">
                {percentageDiff! >= 0 ? '+' : ''}{percentageDiff}%
              </Badge>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <ChevronUp className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Header & Controls */}
      <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-primary/5 via-background to-background">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <LayoutDashboard className="h-5 w-5 text-primary" />
                <CardTitle className="text-2xl font-bold tracking-tight">{report.schoolName}</CardTitle>
              </div>
              <CardDescription className="text-base flex items-center gap-2">
                {report.regionName} 
                <Separator orientation="vertical" className="h-4" />
                <span className="font-medium text-foreground">{report.academicYear}</span>
                <Separator orientation="vertical" className="h-4" />
                <span className="font-medium text-foreground">{report.termName}</span>
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg border">
                <div className="flex items-center gap-2 px-2">
                  <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="comparison-mode" className="text-xs font-medium cursor-pointer">Compare</Label>
                  <Switch 
                    id="comparison-mode" 
                    checked={isComparisonMode} 
                    onCheckedChange={handleComparisonToggle}
                  />
                </div>
                {isComparisonMode && (
                  <Select value={comparisonSchoolId || ""} onValueChange={handleSchoolChange}>
                    <SelectTrigger className="h-8 w-[180px] text-xs border-none bg-transparent focus:ring-0">
                      <SelectValue placeholder="Select school..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top-performer">Regional Top Performer</SelectItem>
                      {availableSchools.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {showExportButtons && (
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-9 shadow-sm" 
                    onClick={handleExportPDF}
                    disabled={isExporting}
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {activeExportJob?.status === 'processing' ? 'Processing...' : 'Starting...'}
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Export PDF
                      </>
                    )}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => {/* Open settings modal */}}>
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Hero Section: Overall Score & Comparison */}
      <div className={`grid gap-6 ${isComparisonMode ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Primary School Score */}
        <Card className={`relative overflow-hidden border-2 ${tapsTone?.ringClass || overallTone.borderClass}`}>
          <div className={`absolute top-0 right-0 p-4 opacity-10`}>
            {isTAPS ? getTAPSGradeIcon(resolvedTAPSGrade!) : getRatingIcon(report.ratingLevel)}
          </div>
          <CardContent className="pt-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Overall Score</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black tracking-tighter">{report.totalScore}</span>
                  <span className="text-xl text-muted-foreground font-medium">/ {maxScore}</span>
                </div>
              </div>
              <div className="text-right">
                {isTAPS ? (
                  <div className={`inline-flex flex-col items-center justify-center rounded-2xl p-4 ${tapsTone?.badgeClass}`}>
                    <span className="text-xs font-bold uppercase opacity-70">Grade</span>
                    <span className="text-4xl font-black">{resolvedTAPSGrade}</span>
                  </div>
                ) : (
                  <Badge className={`${RATING_COLORS[report.ratingLevel]} text-white text-lg px-6 py-2 rounded-xl shadow-lg`}>
                    {RATING_DISPLAY_LABELS[report.ratingLevel]}
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-bold">
                <span>Performance Index</span>
                <span>{overallPercentage}%</span>
              </div>
              <Progress value={overallPercentage} className={`h-4 rounded-full ${tapsTone?.barClass || overallTone.barClass}`} />
            </div>
          </CardContent>
        </Card>

        {/* Comparison School Score */}
        {isComparisonMode && (
          <Card className={`relative overflow-hidden border-2 border-dashed ${isLoadingComparison ? 'animate-pulse' : ''}`}>
            {isLoadingComparison ? (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : comparisonReport ? (
              <>
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  {isTAPS ? getTAPSGradeIcon(comparisonReport.tapsRatingGrade) : getRatingIcon(comparisonReport.ratingLevel)}
                </div>
                <CardContent className="pt-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        {comparisonSchoolId === 'top-performer' ? 'Regional Top Performer' : comparisonReport.schoolName}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-black tracking-tighter text-muted-foreground">{comparisonReport.totalScore}</span>
                        <span className="text-xl text-muted-foreground font-medium">/ {maxScore}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant={percentageDiff! >= 0 ? "success" : "destructive"} className="text-sm px-3 py-1 rounded-lg">
                          {percentageDiff! >= 0 ? <ArrowUpRight className="h-4 w-4 mr-1" /> : <ArrowDownRight className="h-4 w-4 mr-1" />}
                          {Math.abs(percentageDiff!)}% Difference
                        </Badge>
                        <div className="text-xs text-muted-foreground font-medium">
                          {scoreDiff! >= 0 ? '+' : ''}{scoreDiff} points vs baseline
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm font-medium text-muted-foreground">
                      <span>Comparison Index</span>
                      <span>{comparisonPercentage}%</span>
                    </div>
                    <Progress value={comparisonPercentage!} className="h-4 rounded-full bg-muted" />
                  </div>
                </CardContent>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <ArrowLeftRight className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <div className="font-bold">No comparison data</div>
                  <div className="text-sm text-muted-foreground">Select a school to see comparative analytics</div>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Visual Analytics Section */}
      <AssessmentCharts 
        reportId={report.id} 
        schoolId={report.schoolId}
        comparisonSchoolId={isComparisonMode ? comparisonSchoolId : undefined}
      />

      {/* Category Breakdown - Summary First Approach */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold tracking-tight">Category Breakdown</h3>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setExpandedCategories({})}>Collapse All</Button>
            <Button variant="ghost" size="sm" onClick={() => {
              const all: any = {}
              const configs = isTAPS ? TAPS_CATEGORY_CONFIG : CATEGORY_CONFIG
              Object.keys(configs).forEach(k => all[k] = true)
              setExpandedCategories(all)
            }}>Expand All</Button>
          </div>
        </div>

        <div className="grid gap-4">
          {(Object.entries(isTAPS ? TAPS_CATEGORY_CONFIG : CATEGORY_CONFIG) as [any, { label: string; maxScore: number }][]).map(([category, config]) => {
            const score = isTAPS ? report.tapsCategoryScores?.[category as TAPSCategoryName] || 0 : report.categoryScores[category as CategoryName] || 0
            const percentage = getPercentage(score, config.maxScore)
            const tone = getPerformanceTone(percentage)
            const isExpanded = expandedCategories[category]

            const compScore = isComparisonMode && comparisonReport 
              ? (isTAPS ? comparisonReport.tapsCategoryScores?.[category] : comparisonReport.categoryScores[category]) || 0
              : null
            const compPercentage = compScore !== null ? getPercentage(compScore, config.maxScore) : null
            const catDiff = compPercentage !== null ? percentage - compPercentage : null

            return (
              <Collapsible 
                key={category} 
                open={isExpanded} 
                onOpenChange={() => toggleCategory(category)}
                className={`rounded-xl border-2 transition-all duration-200 ${isExpanded ? 'bg-card shadow-md' : 'bg-muted/30 hover:bg-muted/50'} ${tone.borderClass}`}
              >
                <CollapsibleTrigger asChild>
                  <div className="p-4 cursor-pointer flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${tone.bgClass}`}>
                        <span className={tone.iconClass}>{isTAPS ? TAPS_CATEGORY_ICONS[category as TAPSCategoryName] : CATEGORY_ICONS[category as CategoryName]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold truncate">{config.label}</span>
                          <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${tone.badgeClass}`}>{tone.label}</Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                          <div className="flex items-baseline gap-1">
                            <span className="text-lg font-black">{score}</span>
                            <span className="text-xs text-muted-foreground">/ {config.maxScore}</span>
                          </div>
                          <div className="flex-1 max-w-[100px] md:max-w-[200px]">
                            <Progress value={percentage} className={`h-1.5 ${tone.barClass}`} />
                          </div>
                          <span className="text-xs font-bold">{percentage}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {isComparisonMode && compScore !== null && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${catDiff! >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                {catDiff! >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                {Math.abs(catDiff!)}%
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>vs {comparisonSchoolId === 'top-performer' ? 'Top Performer' : 'Comparison School'}</p>
                              <p className="font-bold">{compScore} / {config.maxScore} ({compPercentage}%)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {isExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                    </div>
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="px-4 pb-4 border-t border-dashed mt-2 pt-4">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Metric Breakdown</h4>
                      {/* Detailed metrics would go here */}
                      <div className="p-4 rounded-lg bg-muted/50 border border-dashed text-center text-sm text-muted-foreground">
                        Detailed metric visualization for {config.label}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">AI Insights</h4>
                      <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                        <p className="text-sm leading-relaxed italic">
                          "The school shows {tone.label.toLowerCase()} performance in {config.label.toLowerCase()}. 
                          {percentage < 60 ? ' Immediate focus is required to address underlying gaps.' : ' Maintaining this trajectory will lead to sustained excellence.'}"
                        </p>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )
          })}
        </div>
      </div>

      {/* Recommendations Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-amber-500" />
            Actionable Roadmap
          </h3>
          <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200">
            {recommendations.length} Suggestions
          </Badge>
        </div>

        {isGeneratingRecommendations && recommendations.length === 0 ? (
          <Card className="border-dashed bg-muted/30">
            <CardContent className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
              <div>
                <div className="font-bold">Analyzing performance data...</div>
                <div className="text-sm text-muted-foreground">Generating tailored recommendations for improvement</div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {recommendations.map((rec) => (
              <Card key={rec.id} className={`overflow-hidden border-l-4 ${rec.priority === 'high' ? 'border-l-red-500' : rec.priority === 'medium' ? 'border-l-amber-500' : 'border-l-emerald-500'}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                        {isTAPS 
                          ? TAPS_CATEGORY_ICONS[rec.category as TAPSCategoryName] || <Lightbulb className="h-4 w-4" />
                          : CATEGORY_ICONS[rec.category as CategoryName] || <Lightbulb className="h-4 w-4" />
                        }
                      </div>
                      <span className="font-bold text-sm">
                        {isTAPS
                          ? TAPS_CATEGORY_CONFIG[rec.category as TAPSCategoryName]?.label || rec.category
                          : CATEGORY_CONFIG[rec.category as CategoryName]?.label || rec.category
                        }
                      </span>
                    </div>
                    <Badge className={PRIORITY_COLORS[rec.priority]}>{rec.priority}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed mb-4">{rec.recommendationText}</p>
                  {rec.focusAreas && rec.focusAreas.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {rec.focusAreas.map((area, idx) => (
                        <Badge key={idx} variant="secondary" className="text-[10px] font-medium">
                          {area}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Rating Scale Reference */}
      <Collapsible className="rounded-xl border bg-muted/20">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full flex justify-between p-4 h-auto">
            <span className="text-sm font-bold">Rating Scale Reference</span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="p-4 pt-0">
          {isTAPS ? (
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {(Object.entries(TAPS_RATING_THRESHOLDS) as [TAPSRatingGrade, any][]).map(([grade, config]) => (
                <div key={grade} className={`p-3 rounded-xl border-2 ${getTAPSGradeTone(grade).bgClass} ${getTAPSGradeTone(grade).borderClass}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xl font-black">{grade}</span>
                    <div className={`h-2 w-2 rounded-full ${TAPS_GRADE_COLORS[grade]}`} />
                  </div>
                  <div className="text-[10px] font-bold uppercase opacity-70">{config.label}</div>
                  <div className="text-[10px] font-medium">{config.min}-{config.max} pts</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {(Object.entries(RATING_THRESHOLDS) as [any, any][]).map(([key, config]) => {
                const level = key.toLowerCase() as RatingLevel
                return (
                  <div key={key} className={`p-3 rounded-xl border-2 bg-background`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className={`h-3 w-3 rounded-full ${RATING_COLORS[level]}`} />
                      <span className="text-[10px] font-medium">{config.min}-{config.max}</span>
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-tight">{config.label}</div>
                  </div>
                )
              })}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
