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
  FileSpreadsheet,
  Printer,
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
import { 
  getRatingGrade, 
  assignTAPSRatingGrade,
  getTAPSGradeTone,
  getPerformanceTone,
  getPercentage,
} from "../actions/scoring"
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
      bullying: number
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

// TAPS category icons
const TAPS_CATEGORY_ICONS: Record<TAPSCategoryName | 'general', React.ReactNode> = {
  school_inputs_operations: <Building2 className="h-5 w-5" />,
  leadership: <Target className="h-5 w-5" />,
  academics: <BookOpen className="h-5 w-5" />,
  teacher_development: <GraduationCap className="h-5 w-5" />,
  health_safety: <Shield className="h-5 w-5" />,
  school_culture: <Sparkles className="h-5 w-5" />,
  bullying: <AlertTriangle className="h-5 w-5" />,
  general: <Lightbulb className="h-5 w-5" />,
}

// Maps lowercase category names to their display labels and max scores
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

// TAPS category config
const TAPS_CATEGORY_CONFIG: Record<TAPSCategoryName | 'general', { label: string; maxScore?: number }> = {
  school_inputs_operations: { label: 'School Inputs & Operations', maxScore: 80 },
  leadership: { label: 'Leadership', maxScore: 30 },
  academics: { label: 'Academics', maxScore: 200 },
  teacher_development: { label: 'Teacher Development', maxScore: 20 },
  health_safety: { label: 'Health & Safety', maxScore: 50 },
  school_culture: { label: 'School Culture', maxScore: 70 },
  bullying: { label: 'Bullying & Resolution', maxScore: 10 },
  general: { label: 'General Improvement' },
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

  const handleExportCSV = () => {
    const configs = isTAPS ? TAPS_CATEGORY_CONFIG : CATEGORY_CONFIG
    const headers = ['Category', 'Score', 'Max Score', 'Percentage', 'Rating']
    const rows = (Object.entries(configs) as [any, { label: string; maxScore: number }][]).map(([category, config]) => {
      const score = isTAPS ? report.tapsCategoryScores?.[category as TAPSCategoryName] || 0 : report.categoryScores[category as CategoryName] || 0
      const percentage = getPercentage(score, config.maxScore)
      const tone = getPerformanceTone(percentage)
      return [
        config.label,
        score,
        config.maxScore,
        `${percentage}%`,
        tone.label
      ]
    })

    const csvContent = [
      ['School Name', report.schoolName],
      ['Region', report.regionName],
      ['Academic Year', report.academicYear],
      ['Term', report.termName],
      ['Total Score', report.totalScore],
      ['Grade', resolvedGrade],
      [],
      headers,
      ...rows
    ].map(e => e.join(",")).join("\n")

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `${report.schoolName.replace(/\s+/g, '_')}_Assessment_Report.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast.success('Report exported to CSV')
  }

  const handleExportPDF = async () => {
    // Use the professional print-based PDF generation
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    document.body.appendChild(iframe)

    const configs = isTAPS ? TAPS_CATEGORY_CONFIG : CATEGORY_CONFIG
    const categoryRows = (Object.entries(configs) as [any, { label: string; maxScore: number }][]).map(([category, config]) => {
      const score = isTAPS ? report.tapsCategoryScores?.[category as TAPSCategoryName] || 0 : report.categoryScores[category as CategoryName] || 0
      const percentage = getPercentage(score, config.maxScore)
      const tone = getPerformanceTone(percentage)
      return `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #eee;"><strong>${config.label}</strong></td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${score} / ${config.maxScore}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${percentage}%</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;"><span style="padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; background: ${tone.bgClass.includes('emerald') ? '#ecfdf5' : tone.bgClass.includes('blue') ? '#eff6ff' : tone.bgClass.includes('amber') ? '#fffbeb' : tone.bgClass.includes('orange') ? '#fff7ed' : '#fef2f2'}; color: ${tone.textClass.includes('emerald') ? '#059669' : tone.textClass.includes('blue') ? '#2563eb' : tone.textClass.includes('amber') ? '#d97706' : tone.textClass.includes('orange') ? '#ea580c' : '#dc2626'};">${tone.label}</span></td>
        </tr>
      `
    }).join('')

    const recommendationItems = recommendations.map(rec => `
      <div style="margin-bottom: 15px; padding: 15px; border-left: 4px solid ${rec.priority === 'high' ? '#ef4444' : rec.priority === 'medium' ? '#f59e0b' : '#10b981'}; background: #f9fafb; border-radius: 0 8px 8px 0;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <strong style="font-size: 14px; color: #111827;">${isTAPS ? TAPS_CATEGORY_CONFIG[rec.category as TAPSCategoryName | 'general']?.label || rec.category : CATEGORY_CONFIG[rec.category as CategoryName | 'general']?.label || rec.category}</strong>
          <span style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: ${rec.priority === 'high' ? '#ef4444' : rec.priority === 'medium' ? '#f59e0b' : '#10b981'};">${rec.priority} Priority</span>
        </div>
        <p style="margin: 0; font-size: 13px; color: #4b5563; line-height: 1.5;">${rec.recommendationText}</p>
        ${rec.focusAreas && rec.focusAreas.length > 0 ? `<div style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 5px;">${rec.focusAreas.map(area => `<span style="font-size: 10px; background: #e5e7eb; padding: 2px 6px; border-radius: 4px; color: #374151;">${area}</span>`).join('')}</div>` : ''}
      </div>
    `).join('')

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Libre Baskerville', serif; color: #1a1a1a; line-height: 1.6; padding: 40px; max-width: 800px; margin: 0 auto; }
          h1, h2, h3 { font-family: 'Inter', sans-serif; color: #111827; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
          .moe-title { font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; margin: 0; }
          .report-title { font-size: 18px; font-weight: 700; margin-top: 10px; color: #4b5563; }
          .school-info { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; margin-bottom: 30px; background: #f3f4f6; padding: 20px; border-radius: 12px; }
          .info-item { font-family: 'Inter', sans-serif; font-size: 14px; }
          .info-label { font-weight: 700; color: #6b7280; text-transform: uppercase; font-size: 11px; display: block; }
          .info-value { font-size: 16px; font-weight: 700; color: #111827; }
          .score-card { display: flex; align-items: center; justify-content: space-between; background: #fff; border: 2px solid #e5e7eb; padding: 25px; border-radius: 16px; margin-bottom: 30px; }
          .score-main { flex: 1; }
          .score-label { font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #6b7280; }
          .score-value { font-family: 'Inter', sans-serif; font-size: 48px; font-weight: 900; color: #111827; line-height: 1; }
          .score-max { font-size: 18px; color: #9ca3af; }
          .grade-badge { width: 80px; height: 80px; background: #111827; color: #fff; border-radius: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
          .grade-label { font-family: 'Inter', sans-serif; font-size: 10px; font-weight: 700; text-transform: uppercase; opacity: 0.7; }
          .grade-value { font-family: 'Inter', sans-serif; font-size: 36px; font-weight: 900; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-family: 'Inter', sans-serif; font-size: 13px; }
          th { text-align: left; padding: 12px; background: #f9fafb; color: #6b7280; text-transform: uppercase; font-size: 11px; border-bottom: 2px solid #e5e7eb; }
          .footer { margin-top: 50px; border-top: 1px solid #e5e7eb; pt: 20px; font-size: 10px; color: #9ca3af; text-align: center; font-family: 'Inter', sans-serif; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="moe-title">Ministry of Education</div>
          <div style="font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 700; color: #059669;">Co-operative Republic of Guyana</div>
          <div class="report-title">School Performance Assessment Report</div>
        </div>

        <div class="school-info">
          <div class="info-item">
            <span class="info-label">School Name</span>
            <span class="info-value">${report.schoolName}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Region</span>
            <span class="info-value">${report.regionName}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Academic Period</span>
            <span class="info-value">${report.academicYear} - ${report.termName}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Assessment Date</span>
            <span class="info-value">${formatDate(report.submittedAt)}</span>
          </div>
        </div>

        <div class="score-card">
          <div class="score-main">
            <div class="score-label">Overall Performance Score</div>
            <div class="score-value">${report.totalScore} <span class="score-max">/ ${maxScore}</span></div>
            <div style="font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 700; color: #059669; margin-top: 5px;">${overallPercentage}% Achievement Index</div>
          </div>
          <div class="grade-badge" style="background: ${gradeTone.textClass.includes('emerald') ? '#059669' : gradeTone.textClass.includes('blue') ? '#2563eb' : gradeTone.textClass.includes('amber') ? '#d97706' : gradeTone.textClass.includes('orange') ? '#ea580c' : '#dc2626'};">
            <span class="grade-label">Grade</span>
            <span class="grade-value">${resolvedGrade}</span>
          </div>
        </div>

        <h3 style="margin-top: 40px; border-left: 4px solid #111827; padding-left: 15px;">Category Breakdown</h3>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th style="text-align: center;">Score</th>
              <th style="text-align: center;">Percentage</th>
              <th style="text-align: right;">Rating</th>
            </tr>
          </thead>
          <tbody>
            ${categoryRows}
          </tbody>
        </table>

        <h3 style="margin-top: 40px; border-left: 4px solid #111827; padding-left: 15px;">Actionable Roadmap & Recommendations</h3>
        <div style="margin-top: 20px;">
          ${recommendationItems || '<p style="font-style: italic; color: #6b7280;">No specific recommendations generated for this period.</p>'}
        </div>

        <div class="footer">
          <p>This is an official document generated by the Ministry of Education School Assessment System.</p>
          <p>Generated on ${new Date().toLocaleString()} | Report ID: ${report.id}</p>
        </div>

        <script>
          window.onload = () => {
            window.print();
            setTimeout(() => {
              window.frameElement.parentElement.removeChild(window.frameElement);
            }, 1000);
          };
        </script>
      </body>
      </html>
    `

    iframe.srcdoc = htmlContent
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

  const resolvedGrade: TAPSRatingGrade = useMemo(() => {
    if (isTAPS) {
      return (report.tapsRatingGrade as TAPSRatingGrade) || assignTAPSRatingGrade(report.totalScore)
    } else {
      return getRatingGrade(report.totalScore) as TAPSRatingGrade
    }
  }, [isTAPS, report.tapsRatingGrade, report.totalScore])

  const maxScore = isTAPS ? TAPS_TOTAL_MAX_SCORE : 1000
  const overallPercentage = getPercentage(report.totalScore, maxScore)
  const overallTone = getPerformanceTone(overallPercentage)
  const gradeTone = getTAPSGradeTone(resolvedGrade)

  const resolvedComparisonGrade: TAPSRatingGrade | null = useMemo(() => {
    if (!comparisonReport) return null;
    if (isTAPS) {
      return (comparisonReport.tapsRatingGrade as TAPSRatingGrade) || assignTAPSRatingGrade(comparisonReport.totalScore)
    } else {
      return getRatingGrade(comparisonReport.totalScore) as TAPSRatingGrade
    }
  }, [isTAPS, comparisonReport]);

  const comparisonGradeTone = useMemo(() => 
    resolvedComparisonGrade ? getTAPSGradeTone(resolvedComparisonGrade) : null
  , [resolvedComparisonGrade]);

  const comparisonPercentage = comparisonReport ? getPercentage(comparisonReport.totalScore, maxScore) : null
  const scoreDiff = comparisonReport ? report.totalScore - comparisonReport.totalScore : null
  const percentageDiff = comparisonReport ? overallPercentage - comparisonPercentage! : null

  return (
    <div className="space-y-6 pb-20">
      {/* Sticky Header for Mobile */}
      <div className="sticky top-0 z-30 -mx-4 px-4 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b md:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${gradeTone.bgClass}`}>
              <span className="text-xs font-bold">{resolvedGrade}</span>
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
            <div className="flex items-center gap-6">
              <div className={`relative overflow-hidden border-2 ${gradeTone.ringClass} h-24 w-24 rounded-3xl flex flex-col items-center justify-center shadow-inner bg-white/50 backdrop-blur-sm`}>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
                <span className="text-[10px] font-bold uppercase tracking-tighter opacity-60 mb-1">Grade</span>
                <span className={`text-5xl font-black leading-none ${gradeTone.textClass}`}>{resolvedGrade}</span>
              </div>
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
                    className="h-9 shadow-sm gap-2" 
                    onClick={handleExportCSV}
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Export CSV
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-9 shadow-sm gap-2" 
                    onClick={handleExportPDF}
                    disabled={isExporting}
                  >
                    {isExporting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Printer className="h-4 w-4" />
                    )}
                    Export PDF
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
        <Card className={`relative overflow-hidden border-2 ${gradeTone.ringClass}`}>
          <div className={`absolute top-0 right-0 p-4 opacity-10`}>
            {getTAPSGradeIcon(resolvedGrade)}
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
                <div className={`inline-flex flex-col items-center justify-center rounded-2xl p-4 ${gradeTone.badgeClass}`}>
                  <span className="text-xs font-bold uppercase opacity-70">Grade</span>
                  <span className="text-4xl font-black">{resolvedGrade}</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-bold">
                <span>Performance Index</span>
                <span>{overallPercentage}%</span>
              </div>
              <Progress value={overallPercentage} className={`h-4 rounded-full ${gradeTone.barClass}`} />
            </div>
          </CardContent>
        </Card>

        {/* Comparison School Score */}
        {isComparisonMode && (
          <Card className={`relative overflow-hidden border-2 border-dashed ${isLoadingComparison ? 'animate-pulse' : ''} ${comparisonGradeTone?.ringClass || ''}`}>
            {isLoadingComparison ? (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : comparisonReport ? (
              <>
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  {getTAPSGradeIcon(resolvedComparisonGrade!)}
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
                    <div className="text-right flex flex-col items-end gap-3">
                      {resolvedComparisonGrade && (
                        <div className={`inline-flex flex-col items-center justify-center rounded-xl p-2 px-4 ${comparisonGradeTone?.badgeClass}`}>
                          <span className="text-[10px] font-bold uppercase opacity-70">Grade</span>
                          <span className="text-2xl font-black">{resolvedComparisonGrade}</span>
                        </div>
                      )}
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant={percentageDiff! >= 0 ? "success" : "destructive"} className="text-xs px-2 py-0.5 rounded-lg">
                          {percentageDiff! >= 0 ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                          {Math.abs(percentageDiff!)}% Diff
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm font-medium text-muted-foreground">
                      <span>Comparison Index</span>
                      <span>{comparisonPercentage}%</span>
                    </div>
                    <Progress value={comparisonPercentage!} className={`h-4 rounded-full ${comparisonGradeTone?.barClass || 'bg-muted'}`} />
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
                          ? TAPS_CATEGORY_ICONS[rec.category as TAPSCategoryName | 'general'] || <Lightbulb className="h-4 w-4" />
                          : CATEGORY_ICONS[rec.category as CategoryName | 'general'] || <Lightbulb className="h-4 w-4" />
                        }
                      </div>
                      <span className="font-bold text-sm">
                        {isTAPS
                          ? TAPS_CATEGORY_CONFIG[rec.category as TAPSCategoryName | 'general']?.label || rec.category
                          : CATEGORY_CONFIG[rec.category as CategoryName | 'general']?.label || rec.category
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
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {isTAPS ? (
              (Object.entries(TAPS_RATING_THRESHOLDS) as [TAPSRatingGrade, any][]).map(([grade, config]) => (
                <div key={grade} className={`p-3 rounded-xl border-2 ${getTAPSGradeTone(grade).bgClass} ${getTAPSGradeTone(grade).borderClass}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xl font-black">{grade}</span>
                    <div className={`h-2 w-2 rounded-full ${TAPS_GRADE_COLORS[grade]}`} />
                  </div>
                  <div className="text-[10px] font-bold uppercase opacity-70">{config.label}</div>
                  <div className="text-[10px] font-medium">{config.min}-{config.max} pts</div>
                </div>
              ))
            ) : (
              (Object.entries(RATING_THRESHOLDS) as [any, any][]).map(([key, config]) => {
                const grade = config.grade as TAPSRatingGrade
                const tone = getTAPSGradeTone(grade)
                return (
                  <div key={key} className={`p-3 rounded-xl border-2 ${tone.bgClass} ${tone.borderClass}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xl font-black">{grade}</span>
                      <div className={`h-2 w-2 rounded-full ${TAPS_GRADE_COLORS[grade]}`} />
                    </div>
                    <div className="text-[10px] font-bold uppercase opacity-70">{config.label}</div>
                    <div className="text-[10px] font-medium">{config.min}-{config.max} pts</div>
                  </div>
                )
              })
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
