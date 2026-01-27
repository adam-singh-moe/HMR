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
    <div className="space-y-4 pb-12">
      {/* Modern Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-[hsl(222,47%,9%)] border border-slate-200/80 dark:border-slate-700/50">
        {/* Gradient Accent Bar */}
        <div className={`absolute top-0 left-0 right-0 h-1 ${
          resolvedGrade === 'A' ? 'bg-green-500' :
          resolvedGrade === 'B' ? 'bg-blue-500' :
          resolvedGrade === 'C' ? 'bg-amber-500' :
          resolvedGrade === 'D' ? 'bg-orange-500' : 'bg-red-500'
        }`} />

        <div className="p-5 md:p-6">
          {/* Top Row: School Info + Actions */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <LayoutDashboard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{report.schoolName}</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-medium">{report.regionName}</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-medium">{report.academicYear}</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-medium">{report.termName}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                <ArrowLeftRight className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                <Label htmlFor="comparison-mode" className="text-xs font-medium cursor-pointer text-slate-600 dark:text-slate-400">Compare</Label>
                <Switch id="comparison-mode" checked={isComparisonMode} onCheckedChange={handleComparisonToggle} className="scale-90" />
              </div>
              {isComparisonMode && (
                <Select value={comparisonSchoolId || ""} onValueChange={handleSchoolChange}>
                  <SelectTrigger className="h-8 w-[150px] text-xs bg-slate-100 dark:bg-slate-800 border-0">
                    <SelectValue placeholder="Select school..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="top-performer">Top Performer</SelectItem>
                    {availableSchools.map(s => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              )}
              {showExportButtons && (
                <>
                  <Button size="sm" className="h-8 text-xs gap-1.5 bg-slate-100 dark:bg-slate-800 border-0 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700" onClick={handleExportCSV}>
                    <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
                  </Button>
                  <Button size="sm" className="h-8 text-xs gap-1.5 bg-slate-100 dark:bg-slate-800 border-0 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700" onClick={handleExportPDF} disabled={isExporting}>
                    {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />} PDF
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Score Cards Row */}
          <div className={`grid gap-4 ${isComparisonMode ? 'md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3'}`}>
            {/* Main Grade Card */}
            <div className={`${isComparisonMode ? '' : 'md:col-span-1'} relative overflow-hidden rounded-xl p-5 ${gradeTone.bgClass} border ${gradeTone.borderClass}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1">Performance Grade</p>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-6xl font-black ${gradeTone.textClass}`}>{resolvedGrade}</span>
                    <span className={`text-lg font-bold ${gradeTone.textClass} opacity-70`}>{isTAPS ? TAPS_RATING_LABELS[resolvedGrade] : RATING_DISPLAY_LABELS[report.ratingLevel]}</span>
                  </div>
                </div>
                <div className={`h-16 w-16 rounded-full flex items-center justify-center ${gradeTone.badgeClass} shadow-lg`}>
                  {getTAPSGradeIcon(resolvedGrade)}
                </div>
              </div>
            </div>

            {/* Score Card */}
            <div className={`${isComparisonMode ? '' : 'md:col-span-2'} rounded-xl p-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/50`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Total Score</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-slate-900 dark:text-white">{report.totalScore}</span>
                    <span className="text-lg text-slate-400 dark:text-slate-500">/ {maxScore}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Achievement</p>
                  <span className={`text-3xl font-black ${gradeTone.textClass}`}>{overallPercentage}%</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                  <span>Progress to Maximum</span>
                  <span>{report.totalScore} of {maxScore} points</span>
                </div>
                <div className="h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
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

          {/* Comparison Section */}
          {isComparisonMode && (
            <div className={`mt-4 rounded-xl p-4 border-2 border-dashed ${isLoadingComparison ? 'animate-pulse' : ''} ${comparisonGradeTone?.borderClass || 'border-slate-300 dark:border-slate-600'} bg-slate-50/50 dark:bg-slate-800/20`}>
              {isLoadingComparison ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400" />
                </div>
              ) : comparisonReport ? (
                <div className="flex items-center gap-6">
                  <div className={`shrink-0 h-14 w-14 rounded-xl flex items-center justify-center ${comparisonGradeTone?.badgeClass}`}>
                    <span className="text-3xl font-black">{resolvedComparisonGrade}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">
                        {comparisonSchoolId === 'top-performer' ? 'Regional Top Performer' : comparisonReport.schoolName}
                      </p>
                      <Badge variant={percentageDiff! >= 0 ? "success" : "destructive"} className="shrink-0">
                        {percentageDiff! >= 0 ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                        {percentageDiff! >= 0 ? '+' : ''}{percentageDiff}% vs you
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xl font-bold text-slate-600 dark:text-slate-400">{comparisonReport.totalScore}<span className="text-sm font-normal text-slate-400 dark:text-slate-500">/{maxScore}</span></span>
                      <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            resolvedComparisonGrade === 'A' ? 'bg-green-500' :
                            resolvedComparisonGrade === 'B' ? 'bg-blue-500' :
                            resolvedComparisonGrade === 'C' ? 'bg-amber-500' :
                            resolvedComparisonGrade === 'D' ? 'bg-orange-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${comparisonPercentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{comparisonPercentage}%</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 py-4 text-slate-500 dark:text-slate-400">
                  <ArrowLeftRight className="h-4 w-4" />
                  <span className="text-sm">Select a school above to compare performance</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Visual Analytics Section */}
      <AssessmentCharts 
        reportId={report.id} 
        schoolId={report.schoolId}
        comparisonSchoolId={isComparisonMode ? comparisonSchoolId : undefined}
      />

      {/* Category Breakdown - Compact Grid Layout */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">Category Breakdown</h3>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[hsl(222,47%,13%)]" onClick={() => setExpandedCategories({})}>Collapse</Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[hsl(222,47%,13%)]" onClick={() => {
              const all: any = {}
              const configs = isTAPS ? TAPS_CATEGORY_CONFIG : CATEGORY_CONFIG
              Object.keys(configs).forEach(k => all[k] = true)
              setExpandedCategories(all)
            }}>Expand</Button>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-2">
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
                className={`rounded-lg border transition-all duration-200 ${isExpanded ? 'bg-white dark:bg-[hsl(222,47%,9%)] shadow-sm col-span-full' : 'bg-slate-50 dark:bg-[hsl(222,47%,8%)] hover:bg-slate-100 dark:hover:bg-[hsl(222,47%,10%)]'} ${tone.borderClass}`}
              >
                <CollapsibleTrigger asChild>
                  <div className="p-3 cursor-pointer flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${tone.bgClass}`}>
                        <span className={`${tone.iconClass} [&>svg]:h-4 [&>svg]:w-4`}>{isTAPS ? TAPS_CATEGORY_ICONS[category as TAPSCategoryName] : CATEGORY_ICONS[category as CategoryName]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold truncate text-slate-900 dark:text-white">{config.label}</span>
                          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 uppercase ${tone.badgeClass}`}>{tone.label}</Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">{score}<span className="text-xs text-slate-400 dark:text-slate-500 font-normal">/{config.maxScore}</span></span>
                          <div className="flex-1 max-w-[80px]">
                            <Progress value={percentage} className={`h-1 ${tone.barClass}`} />
                          </div>
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{percentage}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isComparisonMode && compScore !== null && (
                        <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${catDiff! >= 0 ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'}`}>
                          {catDiff! >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {Math.abs(catDiff!)}%
                        </div>
                      )}
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent className="px-3 pb-3 border-t border-dashed border-slate-200/80 dark:border-slate-700/50 pt-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="p-3 rounded-lg bg-slate-100 dark:bg-[hsl(222,47%,11%)] border border-dashed border-slate-200 dark:border-slate-700/50">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Metrics</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Detailed breakdown for {config.label}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200/50 dark:border-blue-500/20">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-2">AI Insight</h4>
                      <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                        {tone.label} performance in {config.label.toLowerCase()}.
                        {percentage < 60 ? ' Focus needed.' : ' Great progress!'}
                      </p>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )
          })}
        </div>
      </div>

      {/* Recommendations Section - Compact */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold tracking-tight flex items-center gap-2 text-slate-900 dark:text-white">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            Recommendations
          </h3>
          <Badge variant="secondary" className="text-xs bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30">
            {recommendations.length}
          </Badge>
        </div>

        {isGeneratingRecommendations && recommendations.length === 0 ? (
          <div className="p-6 rounded-lg border border-dashed border-slate-200/80 dark:border-slate-700/50 bg-slate-50 dark:bg-[hsl(222,47%,8%)] flex flex-col items-center justify-center text-center">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400 mb-2" />
            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Generating recommendations...</div>
          </div>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {recommendations.map((rec) => (
              <div key={rec.id} className={`p-3 rounded-lg border-l-3 bg-white dark:bg-[hsl(222,47%,9%)] border border-slate-200/80 dark:border-slate-700/50 ${rec.priority === 'high' ? 'border-l-red-500' : rec.priority === 'medium' ? 'border-l-amber-500' : 'border-l-emerald-500'}`}>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-md bg-slate-100 dark:bg-[hsl(222,47%,11%)] flex items-center justify-center text-slate-500 dark:text-slate-400 [&>svg]:h-3.5 [&>svg]:w-3.5">
                      {isTAPS
                        ? TAPS_CATEGORY_ICONS[rec.category as TAPSCategoryName | 'general'] || <Lightbulb className="h-3.5 w-3.5" />
                        : CATEGORY_ICONS[rec.category as CategoryName | 'general'] || <Lightbulb className="h-3.5 w-3.5" />
                      }
                    </div>
                    <span className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                      {isTAPS
                        ? TAPS_CATEGORY_CONFIG[rec.category as TAPSCategoryName | 'general']?.label || rec.category
                        : CATEGORY_CONFIG[rec.category as CategoryName | 'general']?.label || rec.category
                      }
                    </span>
                  </div>
                  <Badge className={`text-[9px] px-1.5 py-0 ${PRIORITY_COLORS[rec.priority]}`}>{rec.priority}</Badge>
                </div>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400 line-clamp-3">{rec.recommendationText}</p>
                {rec.focusAreas && rec.focusAreas.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {rec.focusAreas.slice(0, 3).map((area, idx) => (
                      <Badge key={idx} variant="secondary" className="text-[9px] px-1 py-0 font-normal bg-slate-100 dark:bg-[hsl(222,47%,11%)] text-slate-500 dark:text-slate-400">
                        {area}
                      </Badge>
                    ))}
                    {rec.focusAreas.length > 3 && (
                      <Badge variant="secondary" className="text-[9px] px-1 py-0 font-normal bg-slate-100 dark:bg-[hsl(222,47%,11%)] text-slate-500 dark:text-slate-400">
                        +{rec.focusAreas.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rating Scale Reference - Compact Inline */}
      <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-[hsl(222,47%,8%)] border border-slate-200/80 dark:border-slate-700/50">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-2">Scale:</span>
        {isTAPS ? (
          (Object.entries(TAPS_RATING_THRESHOLDS) as [TAPSRatingGrade, any][]).map(([grade, config]) => (
            <div key={grade} className={`flex items-center gap-1.5 px-2 py-1 rounded-md border ${getTAPSGradeTone(grade).borderClass} bg-white dark:bg-[hsl(222,47%,9%)]`}>
              <span className={`text-sm font-black ${getTAPSGradeTone(grade).textClass}`}>{grade}</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">{config.label}</span>
              <span className="text-[9px] text-slate-400 dark:text-slate-500">({config.min}-{config.max})</span>
            </div>
          ))
        ) : (
          (Object.entries(RATING_THRESHOLDS) as [any, any][]).map(([key, config]) => {
            const grade = config.grade as TAPSRatingGrade
            const tone = getTAPSGradeTone(grade)
            return (
              <div key={key} className={`flex items-center gap-1.5 px-2 py-1 rounded-md border ${tone.borderClass} bg-white dark:bg-[hsl(222,47%,9%)]`}>
                <span className={`text-sm font-black ${tone.textClass}`}>{grade}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">{config.label}</span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500">({config.min}-{config.max})</span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
