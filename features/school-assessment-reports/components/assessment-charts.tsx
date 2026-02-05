"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  AreaChart,
  Area,
  ComposedChart,
  ReferenceLine,
} from "recharts"

// Fix for Recharts 3.x type issues with React 18/19
const PolarAngleAxisAny = PolarAngleAxis as any;
import { Loader2, Medal, Trophy, TrendingUp, TrendingDown, Minus, Award, Target, Calendar, LineChart as LineChartIcon, BarChart as BarChartIcon, PieChart as PieChartIcon, BarChart3, FileText, AlertTriangle } from "lucide-react"
import type { CategoryName, RatingLevel, TAPSCategoryName, TAPSRatingGrade } from "../types"
import { TAPS_RATING_THRESHOLDS, TAPS_TOTAL_MAX_SCORE, RATING_THRESHOLDS } from "../types"
import { getRegionalCategoryRankings, getSchoolTrends } from "../actions/analytics"
import { getReport, getReportBySchoolAndPeriod } from "../actions/reports"

// ============================================================================
// TYPES
// ============================================================================

interface TrendDataPoint {
  period: string
  averageScore: number
  submissionCount?: number
}

interface CategoryScore {
  category: CategoryName
  score: number
  maxScore: number
}

interface TAPSCategoryScore {
  category: TAPSCategoryName
  score: number
  maxScore: number
}

interface RatingDistribution {
  'outstanding': number
  'very_good': number
  'good': number
  'satisfactory': number
  'needs_improvement': number
}

interface TAPSGradeDistribution {
  'A': number
  'B': number
  'C': number
  'D': number
  'E': number
}

interface RegionComparison {
  regionId: string
  regionName: string
  averageScore: number
  submittedCount: number
}

// ============================================================================
// CONSTANTS
// ============================================================================

const RATING_COLORS: Record<RatingLevel, string> = {
  'outstanding': '#22c55e',
  'very_good': '#3b82f6',
  'good': '#f59e0b',
  'satisfactory': '#f97316',
  'needs_improvement': '#ef4444',
}

// TAPS Grade Colors
const TAPS_GRADE_COLORS: Record<TAPSRatingGrade, string> = {
  'A': '#22c55e',
  'B': '#3b82f6',
  'C': '#f59e0b',
  'D': '#f97316',
  'E': '#ef4444',
}

// Display labels for ratings
const RATING_LABELS: Record<RatingLevel, string> = {
  'outstanding': 'Outstanding',
  'very_good': 'Very Good',
  'good': 'Good',
  'satisfactory': 'Satisfactory',
  'needs_improvement': 'Needs Improvement',
}

// TAPS Grade Labels
const TAPS_GRADE_LABELS: Record<TAPSRatingGrade, string> = {
  'A': 'Outstanding',
  'B': 'High Achieving',
  'C': 'Standard',
  'D': 'Struggling',
  'E': 'Critical Support',
}

// Category configuration for charts
const CATEGORY_CONFIG: Record<CategoryName, { label: string; maxScore: number }> = {
  academic: { label: 'Academic Performance', maxScore: 300 },
  attendance: { label: 'Attendance', maxScore: 150 },
  infrastructure: { label: 'Infrastructure', maxScore: 150 },
  teaching_quality: { label: 'Teaching Quality', maxScore: 150 },
  management: { label: 'Management', maxScore: 100 },
  student_welfare: { label: 'Student Welfare', maxScore: 100 },
  community: { label: 'Community Engagement', maxScore: 50 },
}

// TAPS Category configuration for charts
const TAPS_CATEGORY_CONFIG: Record<TAPSCategoryName, { label: string; maxScore: number }> = {
  school_inputs_operations: { label: 'School Inputs & Operations', maxScore: 80 },
  leadership: { label: 'Leadership', maxScore: 30 },
  academics: { label: 'Academics', maxScore: 200 },
  teacher_development: { label: 'Teacher Development', maxScore: 20 },
  health_safety: { label: 'Health & Safety', maxScore: 50 },
  school_culture: { label: 'School Culture', maxScore: 70 },
}

const CATEGORY_COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#a4de6c', '#d0ed57'
]

// ============================================================================
// COMPONENTS
// ============================================================================

interface TrendChartProps {
  data: TrendDataPoint[]
  title?: string
  description?: string
  compact?: boolean
}

export function TrendChart({ data, title = "Score Trends", description, compact = false }: TrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border-slate-200/80 dark:border-slate-700/50">
        <CardHeader className={compact ? 'pb-2' : ''}>
          <CardTitle className={`flex items-center gap-2 text-slate-900 dark:text-white ${compact ? 'text-base' : ''}`}>
            <TrendingUp className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} text-blue-600 dark:text-blue-400`} />
            {title}
          </CardTitle>
          {description && <CardDescription className="text-slate-500 dark:text-slate-400 text-sm">{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className={`flex items-center justify-center ${compact ? 'h-40' : 'h-64'} text-slate-500 dark:text-slate-400`}>
            No trend data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border-slate-200/80 dark:border-slate-700/50">
      <CardHeader className={compact ? 'pb-2' : ''}>
        <CardTitle className={`flex items-center gap-2 text-slate-900 dark:text-white ${compact ? 'text-base' : ''}`}>
          <TrendingUp className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} text-blue-600 dark:text-blue-400`} />
          {title}
        </CardTitle>
        {description && <CardDescription className="text-slate-500 dark:text-slate-400 text-sm">{description}</CardDescription>}
      </CardHeader>
      <CardContent className={compact ? 'pt-0' : ''}>
        <ResponsiveContainer width="100%" height={compact ? 220 : 300}>
          <AreaChart data={data} margin={{ top: 10, right: compact ? 10 : 30, left: compact ? 0 : 10, bottom: compact ? 40 : 60 }}>
            <defs>
              <linearGradient id="colorScoreTrend" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.15)" vertical={false} />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              angle={-45}
              textAnchor="end"
              height={70}
              interval={0}
              axisLine={{ stroke: 'rgba(148, 163, 184, 0.2)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              domain={[0, (dataMax: number) => Math.max(dataMax * 1.1, 100)]}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(51, 65, 85, 0.5)',
                borderRadius: '12px',
                padding: '12px 16px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)'
              }}
              itemStyle={{ color: '#e2e8f0', fontSize: '13px' }}
              labelStyle={{ color: '#94a3b8', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}
              formatter={((value: any) => [value, 'Average Score']) as any}
            />
            <Legend verticalAlign="top" height={40} align="right" iconType="circle" />
            <Area
              type="monotone"
              dataKey="averageScore"
              stroke="#6366f1"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorScoreTrend)"
              name="Average Score"
              activeDot={{ r: 6, fill: "#6366f1", stroke: "#fff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

interface CategoryBarChartProps {
  scores: Record<CategoryName, number>
  title?: string
  description?: string
  compact?: boolean
}

export function CategoryBarChart({ scores, title = "Category Scores", description, compact = false }: CategoryBarChartProps) {
  const data = useMemo(() => {
    return (Object.entries(CATEGORY_CONFIG) as [CategoryName, { label: string; maxScore: number }][]).map(([category, config], index) => ({
      category: compact ? config.label.split(' ')[0] : config.label,
      fullCategory: config.label,
      score: scores[category] || 0,
      maxScore: config.maxScore,
      fill: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    }))
  }, [scores, compact])

  return (
    <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border-slate-200/80 dark:border-slate-700/50">
      <CardHeader className={compact ? 'pb-2' : ''}>
        <CardTitle className={`flex items-center gap-2 text-slate-900 dark:text-white ${compact ? 'text-base' : ''}`}>
          <BarChartIcon className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} text-blue-600 dark:text-blue-400`} />
          {title}
        </CardTitle>
        {description && <CardDescription className="text-slate-500 dark:text-slate-400 text-sm">{description}</CardDescription>}
      </CardHeader>
      <CardContent className={compact ? 'pt-0' : ''}>
        <ResponsiveContainer width="100%" height={compact ? 220 : 300}>
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: compact ? 10 : 30, left: compact ? 5 : 100, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.15)" />
            <XAxis type="number" domain={[0, 'dataMax']} tick={{ fill: '#94a3b8', fontSize: compact ? 10 : 11 }} axisLine={{ stroke: 'rgba(148, 163, 184, 0.2)' }} tickLine={false} />
            <YAxis type="category" dataKey="category" tick={{ fontSize: compact ? 9 : 11, fill: '#94a3b8' }} width={compact ? 60 : 140} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(51, 65, 85, 0.5)',
                borderRadius: '12px',
                padding: '12px 16px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)'
              }}
              itemStyle={{ color: '#e2e8f0', fontSize: '13px' }}
              labelStyle={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}
              formatter={((value: any, name: string, entry: any) => {
                const payload = entry?.payload;
                if (!payload) return [value, 'Score'];
                return [
                  `${value} / ${payload.maxScore}`,
                  'Score'
                ];
              }) as any}
            />
            <Bar dataKey="score" fill="#8884d8" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// TAPS Category Bar Chart for Secondary Schools
interface TAPSCategoryBarChartProps {
  scores: Record<TAPSCategoryName, number>
  title?: string
  description?: string
}

export function TAPSCategoryBarChart({ scores, title = "TAPS Category Scores", description }: TAPSCategoryBarChartProps) {
  const data = useMemo(() => {
    return (Object.entries(TAPS_CATEGORY_CONFIG) as [TAPSCategoryName, { label: string; maxScore: number }][]).map(([category, config], index) => ({
      category: config.label,
      score: scores[category] || 0,
      maxScore: config.maxScore,
      fill: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    }))
  }, [scores])

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" domain={[0, 'dataMax']} />
            <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={140} />
            <Tooltip 
              formatter={((value: number, name: string, entry: any) => {
                const payload = entry?.payload;
                if (!payload) return [value, 'Score'];
                return [
                  `${value} / ${payload.maxScore}`,
                  'Score'
                ];
              }) as any}
            />
            <Bar dataKey="score" fill="#8884d8" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// TAPS Grade Distribution Chart
interface TAPSGradeDistributionChartProps {
  distribution: TAPSGradeDistribution
  title?: string
  description?: string
}

export function TAPSGradeDistributionChart({ 
  distribution, 
  title = "TAPS Grade Distribution", 
  description 
}: TAPSGradeDistributionChartProps) {
  const data = useMemo(() => {
    return (Object.entries(distribution) as [TAPSRatingGrade, number][])
      .filter(([_, count]) => count > 0)
      .map(([grade, count]) => ({
        name: `Grade ${grade}: ${TAPS_GRADE_LABELS[grade]}`,
        value: count,
        fill: TAPS_GRADE_COLORS[grade],
      }))
  }, [distribution])

  const total = Object.values(distribution).reduce((a, b) => a + b, 0)

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No grade data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="w-full flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={5}
                  dataKey="value"
                  label={false}
                  labelLine={false}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} stroke="white" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-2 min-w-[280px] flex-shrink-0 bg-muted/10 p-4 rounded-xl border border-gray-100">
            {(Object.entries(TAPS_GRADE_LABELS) as [TAPSRatingGrade, string][]).map(([grade, label]) => {
              const count = distribution[grade] || 0;
              const percent = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={grade} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 text-sm w-full py-1">
                  <div className={`h-6 w-6 rounded flex items-center justify-center text-[10px] font-bold shrink-0 text-white`} style={{ backgroundColor: TAPS_GRADE_COLORS[grade] }}>
                    {grade}
                  </div>
                  <span className="font-medium text-muted-foreground truncate" title={`${grade}: ${label}`}>
                    {label}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-muted-foreground bg-white px-1.5 py-0.5 rounded border border-gray-100">
                      {percent.toFixed(0)}%
                    </span>
                    <Badge variant={count > 0 ? "default" : "secondary"} className="font-mono flex justify-center h-6 min-w-[32px]">
                      {count}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

import { UnifiedRatingBadge } from "./unified-rating-badge"

interface RatingDistributionChartProps {
  distribution: RatingDistribution
  title?: string
  description?: string
  compact?: boolean
}

export function RatingDistributionChart({
  distribution,
  title = "Rating Distribution",
  description,
  compact = false
}: RatingDistributionChartProps) {
  const data = useMemo(() => {
    return (Object.entries(distribution) as [RatingLevel, number][])
      .filter(([_, count]) => count > 0)
      .map(([rating, count]) => ({
        name: RATING_LABELS[rating],
        value: count,
        fill: RATING_COLORS[rating],
      }))
  }, [distribution])

  const total = Object.values(distribution).reduce((a, b) => a + b, 0)

  if (total === 0) {
    return (
      <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border-slate-200/80 dark:border-slate-700/50">
        <CardHeader className={compact ? 'pb-2' : ''}>
          <CardTitle className={`flex items-center gap-2 text-slate-900 dark:text-white ${compact ? 'text-base' : ''}`}>
            <PieChartIcon className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} text-blue-600 dark:text-blue-400`} />
            {title}
          </CardTitle>
          {description && <CardDescription className="text-slate-500 dark:text-slate-400 text-sm">{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className={`flex items-center justify-center ${compact ? 'h-40' : 'h-64'} text-slate-500 dark:text-slate-400`}>
            No rating data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border-slate-200/80 dark:border-slate-700/50">
      <CardHeader className={compact ? 'pb-2' : ''}>
        <CardTitle className={`flex items-center gap-2 text-slate-900 dark:text-white ${compact ? 'text-base' : ''}`}>
          <PieChartIcon className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} text-blue-600 dark:text-blue-400`} />
          {title}
        </CardTitle>
        {description && <CardDescription className="text-slate-500 dark:text-slate-400 text-sm">{description}</CardDescription>}
      </CardHeader>
      <CardContent className={compact ? 'pt-0' : ''}>
        <div className={`flex ${compact ? 'flex-row' : 'flex-col md:flex-row'} items-center gap-4`}>
          <div className={`${compact ? 'w-1/2' : 'w-full flex-1'} ${compact ? 'min-h-[200px]' : 'min-h-[300px]'}`}>
            <ResponsiveContainer width="100%" height={compact ? 200 : 300}>
              <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={compact ? 45 : 65}
                  outerRadius={compact ? 70 : 95}
                  paddingAngle={5}
                  dataKey="value"
                  label={false}
                  labelLine={false}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} stroke="transparent" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={((value: any) => [value, 'Schools']) as any}
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid rgba(51, 65, 85, 0.5)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)'
                  }}
                  itemStyle={{ color: '#e2e8f0', fontSize: '13px' }}
                  labelStyle={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className={`flex flex-col gap-1.5 ${compact ? 'w-1/2' : 'min-w-[280px]'} flex-shrink-0 bg-slate-50 dark:bg-slate-800/50 ${compact ? 'p-2' : 'p-4'} rounded-xl border border-slate-200 dark:border-slate-700`}>
            {(Object.entries(distribution) as [RatingLevel, number][]).map(([rating, count]) => {
              const percent = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={rating} className={`grid grid-cols-[auto_1fr_auto] items-center ${compact ? 'gap-2 text-xs' : 'gap-3 text-sm'} w-full ${compact ? 'py-0.5' : 'py-1'}`}>
                  <div
                    className={`${compact ? 'h-5 w-5 text-[9px]' : 'h-6 w-6 text-[10px]'} rounded flex items-center justify-center font-bold shrink-0 text-white`}
                    style={{ backgroundColor: RATING_COLORS[rating] }}
                  >
                    {RATING_THRESHOLDS[rating.toUpperCase() as keyof typeof RATING_THRESHOLDS]?.grade || rating[0].toUpperCase()}
                  </div>
                  <span className="font-medium text-slate-600 dark:text-slate-300 truncate" title={RATING_LABELS[rating]}>
                    {compact ? RATING_LABELS[rating].split(' ')[0] : RATING_LABELS[rating]}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`${compact ? 'text-[9px]' : 'text-[10px]'} font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700`}>
                      {percent.toFixed(0)}%
                    </span>
                    <Badge variant={count > 0 ? "default" : "secondary"} className={`font-mono flex justify-center ${compact ? 'h-5 min-w-[24px] text-[10px]' : 'h-6 min-w-[32px]'}`}>
                      {count}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface RadarChartProps {
  scores: Record<CategoryName, number>
  comparisonScores?: Record<CategoryName, number>
  comparisonLabel?: string
  title?: string
  description?: string
  showPercentage?: boolean
  compact?: boolean
}

export function CategoryRadarChart({
  scores,
  comparisonScores,
  comparisonLabel = "Comparison",
  title = "Performance Profile",
  description,
  showPercentage = true,
  compact = false
}: RadarChartProps) {
  const data = useMemo(() => {
    return (Object.entries(CATEGORY_CONFIG) as [CategoryName, { label: string; maxScore: number }][]).map(([category, config]) => ({
      category: config.label.split(' ')[0], // Shortened for radar
      fullName: config.label,
      score: scores[category] || 0,
      comparisonScore: comparisonScores ? (comparisonScores[category] || 0) : undefined,
      percentage: Math.round(((scores[category] || 0) / config.maxScore) * 100),
      comparisonPercentage: comparisonScores 
        ? Math.round(((comparisonScores[category] || 0) / config.maxScore) * 100) 
        : undefined,
      maxScore: config.maxScore,
    }))
  }, [scores, comparisonScores])

  return (
    <Card className="overflow-hidden bg-white dark:bg-[hsl(222,47%,9%)] border-slate-200/80 dark:border-slate-700/50">
      <CardHeader className={compact ? 'pb-2' : ''}>
        <CardTitle className={`flex items-center gap-2 text-slate-900 dark:text-white ${compact ? 'text-base' : ''}`}>
          <Target className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} text-blue-600 dark:text-blue-400`} />
          {title}
        </CardTitle>
        {description && <CardDescription className="text-slate-500 dark:text-slate-400 text-sm">{description}</CardDescription>}
      </CardHeader>
      <CardContent className={compact ? 'pt-0' : 'pt-2'}>
        <div className={`${compact ? 'h-[250px]' : 'h-[420px]'} w-full`}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="48%" outerRadius={compact ? "70%" : "80%"} data={data} margin={compact ? { top: 20, right: 30, bottom: 20, left: 30 } : { top: 30, right: 40, bottom: 30, left: 40 }}>
              <defs>
                <linearGradient id="radarFillGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.2} />
                </linearGradient>
              </defs>
              <PolarGrid stroke="#475569" strokeOpacity={0.3} />
              <PolarAngleAxisAny
                dataKey="category"
                tick={{ fontSize: compact ? 10 : 12, fontWeight: 500, fill: '#94a3b8' }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={showPercentage ? [0, 100] : [0, 'auto']}
                tick={false}
                axisLine={false}
              />
              <Radar
                name="Current School"
                dataKey={showPercentage ? "percentage" : "score"}
                stroke="#3b82f6"
                fill="url(#radarFillGradient)"
                strokeWidth={2}
              />
              {comparisonScores && (
                <Radar
                  name={comparisonLabel}
                  dataKey={showPercentage ? "comparisonPercentage" : "comparisonScore"}
                  stroke="#ef4444"
                  fill="#ef4444"
                  fillOpacity={0.3}
                  strokeWidth={2}
                  strokeDasharray="4 4"
                />
              )}
              <Tooltip
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid hsl(222, 47%, 20%)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  backgroundColor: 'hsl(222, 47%, 11%)',
                  color: '#fff'
                }}
                formatter={((value: any, name: string, entry: any) => {
                  const isComparison = name === comparisonLabel;
                  const payload = entry?.payload;
                  if (!payload) return [value, name];

                  const score = isComparison ? payload.comparisonScore : payload.score;
                  return [
                    showPercentage
                      ? `${value}% (${score}/${payload.maxScore})`
                      : `${value}/${payload.maxScore}`,
                    name
                  ];
                }) as any}
              />
              {comparisonScores && <Legend verticalAlign="bottom" height={36}/>}
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

interface TAPSRadarChartProps {
  scores: Record<TAPSCategoryName, number>
  comparisonScores?: Record<TAPSCategoryName, number>
  comparisonLabel?: string
  title?: string
  description?: string
  showPercentage?: boolean
}

export function TAPSCategoryRadarChart({
  scores,
  comparisonScores,
  comparisonLabel = "Comparison",
  title = "Performance Profile",
  description,
  showPercentage = true,
}: TAPSRadarChartProps) {
  const data = useMemo(() => {
    return (Object.entries(TAPS_CATEGORY_CONFIG) as [TAPSCategoryName, { label: string; maxScore: number }][]).map(([category, config]) => ({
      category: config.label.split(' ')[0],
      fullName: config.label,
      score: scores[category] || 0,
      comparisonScore: comparisonScores ? (comparisonScores[category] || 0) : undefined,
      percentage: Math.round(((scores[category] || 0) / config.maxScore) * 100),
      comparisonPercentage: comparisonScores 
        ? Math.round(((comparisonScores[category] || 0) / config.maxScore) * 100) 
        : undefined,
      maxScore: config.maxScore,
    }))
  }, [scores, comparisonScores])

  return (
    <Card className="overflow-hidden bg-white dark:bg-[hsl(222,47%,9%)] border-slate-200/80 dark:border-slate-700/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
          <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          {title}
        </CardTitle>
        {description && <CardDescription className="text-slate-500 dark:text-slate-400">{description}</CardDescription>}
      </CardHeader>
      <CardContent className="pt-2">
        <div className="h-[420px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="48%" outerRadius="80%" data={data} margin={{ top: 30, right: 40, bottom: 30, left: 40 }}>
              <defs>
                <linearGradient id="tapsRadarFillGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.2} />
                </linearGradient>
              </defs>
              <PolarGrid stroke="#475569" strokeOpacity={0.3} />
              <PolarAngleAxisAny
                dataKey="category"
                tick={{ fontSize: 12, fontWeight: 500, fill: '#94a3b8' }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={showPercentage ? [0, 100] : [0, 'auto']}
                tick={false}
                axisLine={false}
              />
              <Radar
                name="Current School"
                dataKey={showPercentage ? "percentage" : "score"}
                stroke="#3b82f6"
                fill="url(#tapsRadarFillGradient)"
                strokeWidth={2}
              />
              {comparisonScores && (
                <Radar
                  name={comparisonLabel}
                  dataKey={showPercentage ? "comparisonPercentage" : "comparisonScore"}
                  stroke="#ef4444"
                  fill="#ef4444"
                  fillOpacity={0.3}
                  strokeWidth={2}
                  strokeDasharray="4 4"
                />
              )}
              <Tooltip
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid hsl(222, 47%, 20%)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  backgroundColor: 'hsl(222, 47%, 11%)',
                  color: '#fff'
                }}
                formatter={((value: number, name: string, entry: any) => {
                  const isComparison = name === comparisonLabel;
                  const payload = entry?.payload;
                  if (!payload) return [value, name];

                  const score = isComparison ? payload.comparisonScore : payload.score;
                  return [
                    showPercentage
                      ? `${value}% (${score}/${payload.maxScore})`
                      : `${value}/${payload.maxScore}`,
                    name,
                  ]
                }) as any}
              />
              {comparisonScores && <Legend verticalAlign="bottom" height={36}/>}
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

interface SparklineProps {
  data: number[]
  color?: string
  height?: number
  width?: number
}

export function Sparkline({ data, color = "#8884d8", height = 30, width = 80 }: SparklineProps) {
  const chartData = data.map((val, i) => ({ value: val, index: i }))
  
  return (
    <ResponsiveContainer width={width} height={height}>
      <LineChart data={chartData}>
        <Line 
          type="monotone" 
          dataKey="value" 
          stroke={color} 
          strokeWidth={2} 
          dot={false} 
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

interface RegionComparisonChartProps {
  regions: RegionComparison[]
  title?: string
  description?: string
  compact?: boolean
}

export function RegionComparisonChart({
  regions,
  title = "Regional Comparison",
  description,
  compact = false
}: RegionComparisonChartProps) {
  const sortedRegions = useMemo(() => {
    return [...regions].sort((a, b) => b.averageScore - a.averageScore)
  }, [regions])

  const chartHeight = compact ? Math.min(350, Math.max(280, sortedRegions.length * 32)) : Math.max(300, sortedRegions.length * 40)

  if (!regions || regions.length === 0) {
    return (
      <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border-slate-200/80 dark:border-slate-700/50">
        <CardHeader className={compact ? 'pb-2' : ''}>
          <CardTitle className={`flex items-center gap-2 text-slate-900 dark:text-white ${compact ? 'text-base' : ''}`}>
            <BarChart3 className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} text-blue-600 dark:text-blue-400`} />
            {title}
          </CardTitle>
          {description && <CardDescription className="text-slate-500 dark:text-slate-400 text-sm">{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className={`flex items-center justify-center ${compact ? 'h-40' : 'h-64'} text-slate-500 dark:text-slate-400`}>
            No regional data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border-slate-200/80 dark:border-slate-700/50">
      <CardHeader className={compact ? 'pb-2' : ''}>
        <CardTitle className={`flex items-center gap-2 text-slate-900 dark:text-white ${compact ? 'text-base' : ''}`}>
          <BarChart3 className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} text-blue-600 dark:text-blue-400`} />
          {title}
        </CardTitle>
        {description && <CardDescription className="text-slate-500 dark:text-slate-400 text-sm">{description}</CardDescription>}
      </CardHeader>
      <CardContent className={compact ? 'pt-0' : ''}>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            data={sortedRegions}
            layout="vertical"
            margin={{ top: 5, right: compact ? 10 : 30, left: compact ? 5 : 100, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
            <XAxis type="number" domain={[0, 1000]} tick={{ fill: '#64748b', fontSize: compact ? 10 : 12 }} axisLine={{ stroke: '#cbd5e1' }} />
            <YAxis type="category" dataKey="regionName" tick={{ fontSize: compact ? 10 : 11, fill: '#64748b' }} width={compact ? 55 : 140} axisLine={{ stroke: '#cbd5e1' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(222, 47%, 11%)',
                border: '1px solid hsl(215, 20%, 25%)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '12px'
              }}
              formatter={((value: any, name: string, entry: any) => {
                const payload = entry?.payload;
                if (!payload) return [value, 'Average Score'];
                return [
                  `${value} pts (${payload.submittedCount} schools)`,
                  'Score'
                ];
              }) as any}
            />
            <Bar
              dataKey="averageScore"
              fill="#6366f1"
              radius={[0, 4, 4, 0]}
              label={compact ? false : { position: 'right', fontSize: 10, fill: '#64748b' }}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

interface SubmissionStatusChartProps {
  data: { regionName: string; submitted: number; pending: number }[]
  title?: string
  description?: string
  compact?: boolean
}

export function SubmissionStatusChart({
  data,
  title = "Submission Status by Region",
  description,
  compact = false
}: SubmissionStatusChartProps) {
  const chartHeight = compact ? Math.min(350, Math.max(280, data.length * 32)) : Math.max(300, data.length * 40)

  if (!data || data.length === 0) {
    return (
      <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border-slate-200/80 dark:border-slate-700/50">
        <CardHeader className={compact ? 'pb-2' : ''}>
          <CardTitle className={`flex items-center gap-2 text-slate-900 dark:text-white ${compact ? 'text-base' : ''}`}>
            <FileText className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} text-blue-600 dark:text-blue-400`} />
            {title}
          </CardTitle>
          {description && <CardDescription className="text-slate-500 dark:text-slate-400 text-sm">{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className={`flex items-center justify-center ${compact ? 'h-40' : 'h-64'} text-slate-500 dark:text-slate-400`}>
            No submission data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border-slate-200/80 dark:border-slate-700/50">
      <CardHeader className={compact ? 'pb-2' : ''}>
        <CardTitle className={`flex items-center gap-2 text-slate-900 dark:text-white ${compact ? 'text-base' : ''}`}>
          <FileText className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} text-blue-600 dark:text-blue-400`} />
          {title}
        </CardTitle>
        {description && <CardDescription className="text-slate-500 dark:text-slate-400 text-sm">{description}</CardDescription>}
      </CardHeader>
      <CardContent className={compact ? 'pt-0' : ''}>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: compact ? 10 : 30, left: compact ? 5 : 100, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
            <XAxis type="number" tick={{ fill: '#64748b', fontSize: compact ? 10 : 12 }} axisLine={{ stroke: '#cbd5e1' }} />
            <YAxis type="category" dataKey="regionName" tick={{ fontSize: compact ? 10 : 11, fill: '#64748b' }} width={compact ? 55 : 140} axisLine={{ stroke: '#cbd5e1' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(222, 47%, 11%)',
                border: '1px solid hsl(215, 20%, 25%)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '12px'
              }}
            />
            <Legend wrapperStyle={{ paddingTop: compact ? '5px' : '10px', fontSize: compact ? '11px' : '12px' }} />
            <Bar dataKey="submitted" fill="#22c55e" stackId="a" name="Submitted" radius={[0, 0, 0, 0]} />
            <Bar dataKey="pending" fill="#f97316" stackId="a" name="Pending" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// STATS CARDS
// ============================================================================

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  icon?: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
}

export function StatCard({ title, value, description, icon, trend }: StatCardProps) {
  return (
    <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border-slate-200/80 dark:border-slate-700/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">{title}</CardTitle>
        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
        {description && (
          <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
        )}
        {trend && (
          <p className={`text-xs mt-1 flex items-center gap-1 ${trend.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend.value)}% from last term
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// ENHANCED TREND CHART WITH AREA FILL
// ============================================================================

interface EnhancedTrendChartProps {
  data: TrendDataPoint[]
  title?: string
  description?: string
  showTarget?: boolean
  targetScore?: number
  height?: number
  variant?: 'demo' | 'taps'
}

export function EnhancedTrendChart({ 
  data, 
  title = "Performance Progress", 
  description,
  showTarget = true,
  targetScore,
  height = 350,
  variant = 'demo'
}: EnhancedTrendChartProps) {
  const maxScore = variant === 'taps' ? TAPS_TOTAL_MAX_SCORE : 1000
  const effectiveTargetScore = targetScore ?? (variant === 'taps' ? TAPS_RATING_THRESHOLDS.B.min : 700)

  // Calculate trend
  const trendInfo = useMemo(() => {
    if (data.length < 2) return null
    const latest = data[data.length - 1]?.averageScore || 0
    const previous = data[data.length - 2]?.averageScore || 0
    const change = latest - previous
    const percentChange = previous ? Math.round((change / previous) * 100) : 0
    return { change, percentChange, isPositive: change >= 0 }
  }, [data])

  // Calculate averages and milestones
  const stats = useMemo(() => {
    if (data.length === 0) return null
    const scores = data.map(d => d.averageScore)
    const highest = Math.max(...scores)
    const lowest = Math.min(...scores)
    const average = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    const latest = scores[scores.length - 1]
    return { highest, lowest, average, latest }
  }, [data])

  if (!data || data.length === 0) {
    return (
      <Card className="overflow-hidden bg-white dark:bg-[hsl(222,47%,9%)] border-slate-200/80 dark:border-slate-700/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
            <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            {title}
          </CardTitle>
          {description && <CardDescription className="text-slate-500 dark:text-slate-400">{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-slate-500 dark:text-slate-400">
            <Calendar className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-center">No performance data yet</p>
            <p className="text-sm text-center mt-1">Submit your first report to see your progress</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Add rating zones to data (used for tooltip/legend semantics)
  const chartData = data.map(d => {
    if (variant === 'taps') {
      return {
        ...d,
        gradeA: d.averageScore >= TAPS_RATING_THRESHOLDS.A.min ? d.averageScore : null,
        gradeB: d.averageScore >= TAPS_RATING_THRESHOLDS.B.min && d.averageScore < TAPS_RATING_THRESHOLDS.A.min ? d.averageScore : null,
        gradeC: d.averageScore >= TAPS_RATING_THRESHOLDS.C.min && d.averageScore < TAPS_RATING_THRESHOLDS.B.min ? d.averageScore : null,
        gradeD: d.averageScore >= TAPS_RATING_THRESHOLDS.D.min && d.averageScore < TAPS_RATING_THRESHOLDS.C.min ? d.averageScore : null,
        gradeE: d.averageScore < TAPS_RATING_THRESHOLDS.D.min ? d.averageScore : null,
      }
    }

    return {
      ...d,
      outstanding: d.averageScore >= 850 ? d.averageScore : null,
      veryGood: d.averageScore >= 700 && d.averageScore < 850 ? d.averageScore : null,
      good: d.averageScore >= 550 && d.averageScore < 700 ? d.averageScore : null,
      satisfactory: d.averageScore >= 400 && d.averageScore < 550 ? d.averageScore : null,
      needsImprovement: d.averageScore < 400 ? d.averageScore : null,
    }
  })

  return (
    <Card className="overflow-hidden bg-white dark:bg-[hsl(222,47%,9%)] border-slate-200/80 dark:border-slate-700/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              {title}
            </CardTitle>
            {description && <CardDescription className="text-slate-500 dark:text-slate-400">{description}</CardDescription>}
          </div>
          {trendInfo && (
            <Badge
              variant={trendInfo.isPositive ? "default" : "destructive"}
              className={`flex items-center gap-1 ${trendInfo.isPositive ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'}`}
            >
              {trendInfo.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {trendInfo.isPositive ? '+' : ''}{trendInfo.change} pts ({trendInfo.percentChange}%)
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats Summary */}
        {stats && (
          <div className="grid grid-cols-4 gap-3 mb-6">
            <div className="text-center p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200/50 dark:border-blue-500/20">
              <p className="text-[10px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">Latest</p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.latest}</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-slate-100 dark:bg-[hsl(222,47%,11%)] border border-slate-200/50 dark:border-slate-700/50">
              <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Average</p>
              <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">{stats.average}</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-500/20">
              <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Highest</p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stats.highest}</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-500/20">
              <p className="text-[10px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">Lowest</p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{stats.lowest}</p>
            </div>
          </div>
        )}

        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 30 }}>
            <defs>
              <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-700" opacity={0.5} />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              angle={-45}
              textAnchor="end"
              height={60}
              stroke="#64748b"
            />
            <YAxis
              domain={[0, maxScore]}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              stroke="#64748b"
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const score = payload[0].value as number
                  let rating = variant === 'taps' ? 'Critical Support' : 'Needs Improvement'
                  let ratingColor = 'text-red-400'

                  if (variant === 'taps') {
                    if (score >= TAPS_RATING_THRESHOLDS.A.min) { rating = TAPS_RATING_THRESHOLDS.A.label; ratingColor = 'text-emerald-400' }
                    else if (score >= TAPS_RATING_THRESHOLDS.B.min) { rating = TAPS_RATING_THRESHOLDS.B.label; ratingColor = 'text-blue-400' }
                    else if (score >= TAPS_RATING_THRESHOLDS.C.min) { rating = TAPS_RATING_THRESHOLDS.C.label; ratingColor = 'text-amber-400' }
                    else if (score >= TAPS_RATING_THRESHOLDS.D.min) { rating = TAPS_RATING_THRESHOLDS.D.label; ratingColor = 'text-orange-400' }
                  } else {
                    if (score >= 850) { rating = 'Outstanding'; ratingColor = 'text-emerald-400' }
                    else if (score >= 700) { rating = 'Very Good'; ratingColor = 'text-blue-400' }
                    else if (score >= 550) { rating = 'Good'; ratingColor = 'text-amber-400' }
                    else if (score >= 400) { rating = 'Satisfactory'; ratingColor = 'text-orange-400' }
                  }

                  return (
                    <div className="bg-[hsl(222,47%,11%)] p-3 border border-slate-700/50 rounded-xl shadow-lg">
                      <p className="font-semibold text-sm text-white">{label}</p>
                      <p className="text-2xl font-bold text-white">{score}<span className="text-sm text-slate-400">/{maxScore}</span></p>
                      <p className={`text-sm font-medium ${ratingColor}`}>{rating}</p>
                    </div>
                  )
                }
                return null
              }}
            />
            {showTarget && (
              <ReferenceLine 
                y={effectiveTargetScore} 
                stroke="#22c55e" 
                strokeDasharray="5 5" 
                label={{ value: `Target: ${effectiveTargetScore}`, fill: '#22c55e', fontSize: 11 }}
              />
            )}
            <Area
              type="monotone"
              dataKey="averageScore"
              stroke="#3b82f6"
              strokeWidth={3}
              fill="url(#colorScore)"
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 5 }}
              activeDot={{ r: 8, strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Rating Legend */}
        {variant === 'taps' ? (
          <div className="flex flex-wrap justify-center gap-3 mt-4 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span>A: Outstanding ({TAPS_RATING_THRESHOLDS.A.min}+)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span>B: High Achieving ({TAPS_RATING_THRESHOLDS.B.min}-{TAPS_RATING_THRESHOLDS.A.min - 1})</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span>C: Standard ({TAPS_RATING_THRESHOLDS.C.min}-{TAPS_RATING_THRESHOLDS.B.min - 1})</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span>D: Struggling ({TAPS_RATING_THRESHOLDS.D.min}-{TAPS_RATING_THRESHOLDS.C.min - 1})</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>E: Critical Support (&lt;{TAPS_RATING_THRESHOLDS.D.min})</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-3 mt-4 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span>Outstanding (850+)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span>Very Good (700-849)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span>Good (550-699)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span>Satisfactory (400-549)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>Needs Improvement (&lt;400)</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// CATEGORY PROGRESS CARDS
// ============================================================================

interface CategoryProgressCardsProps {
  scores: Record<CategoryName, number>
  previousScores?: Record<CategoryName, number>
  title?: string
  description?: string
}

export function CategoryProgressCards({ 
  scores, 
  previousScores,
  title = "Category Performance",
  description
}: CategoryProgressCardsProps) {
  const categories = useMemo(() => {
    return (Object.entries(CATEGORY_CONFIG) as [CategoryName, { label: string; maxScore: number }][]).map(([category, config]) => {
      const score = scores[category] || 0
      const percentage = Math.round((score / config.maxScore) * 100)
      const prevScore = previousScores?.[category] || 0
      const change = score - prevScore
      const hasImproved = change > 0
      const hasDeclined = change < 0
      
      return {
        category,
        label: config.label,
        score,
        maxScore: config.maxScore,
        percentage,
        change,
        hasImproved,
        hasDeclined,
      }
    })
  }, [scores, previousScores])

  // Sort by percentage (lowest first to highlight areas needing improvement)
  const sortedCategories = [...categories].sort((a, b) => a.percentage - b.percentage)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-blue-600" />
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedCategories.map(cat => (
          <div key={cat.category} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{cat.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">
                  {cat.score}/{cat.maxScore}
                </span>
                <span className="font-semibold">{cat.percentage}%</span>
                {previousScores && (
                  <span className={`text-xs flex items-center ${
                    cat.hasImproved ? 'text-green-600' : cat.hasDeclined ? 'text-red-600' : 'text-muted-foreground'
                  }`}>
                    {cat.hasImproved ? <TrendingUp className="h-3 w-3 mr-0.5" /> : 
                     cat.hasDeclined ? <TrendingDown className="h-3 w-3 mr-0.5" /> : 
                     <Minus className="h-3 w-3 mr-0.5" />}
                    {cat.change !== 0 && `${cat.change > 0 ? '+' : ''}${cat.change}`}
                  </span>
                )}
              </div>
            </div>
            <Progress 
              value={cat.percentage} 
              className={`h-2 ${
                cat.percentage >= 70 ? '[&>div]:bg-emerald-500' :
                cat.percentage >= 50 ? '[&>div]:bg-blue-500' :
                cat.percentage >= 35 ? '[&>div]:bg-amber-500' :
                '[&>div]:bg-red-500'
              }`}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

interface TAPSCategoryProgressCardsProps {
  scores: Record<TAPSCategoryName, number>
  previousScores?: Record<TAPSCategoryName, number>
  title?: string
  description?: string
}

export function TAPSCategoryProgressCards({
  scores,
  previousScores,
  title = "Category Performance",
  description,
}: TAPSCategoryProgressCardsProps) {
  const categories = useMemo(() => {
    return (Object.entries(TAPS_CATEGORY_CONFIG) as [TAPSCategoryName, { label: string; maxScore: number }][]).map(([category, config]) => {
      const score = scores[category] || 0
      const percentage = Math.round((score / config.maxScore) * 100)
      const prevScore = previousScores?.[category] || 0
      const change = score - prevScore
      const hasImproved = change > 0
      const hasDeclined = change < 0

      return {
        category,
        label: config.label,
        score,
        maxScore: config.maxScore,
        percentage,
        change,
        hasImproved,
        hasDeclined,
      }
    })
  }, [scores, previousScores])

  const sortedCategories = [...categories].sort((a, b) => a.percentage - b.percentage)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-blue-600" />
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedCategories.map(cat => (
          <div key={cat.category} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{cat.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">
                  {cat.score}/{cat.maxScore}
                </span>
                <span className="font-semibold">{cat.percentage}%</span>
                {previousScores && (
                  <span className={`text-xs flex items-center ${
                    cat.hasImproved ? 'text-green-600' : cat.hasDeclined ? 'text-red-600' : 'text-muted-foreground'
                  }`}>
                    {cat.hasImproved ? <TrendingUp className="h-3 w-3 mr-0.5" /> :
                     cat.hasDeclined ? <TrendingDown className="h-3 w-3 mr-0.5" /> :
                     <Minus className="h-3 w-3 mr-0.5" />}
                    {cat.change !== 0 && `${cat.change > 0 ? '+' : ''}${cat.change}`}
                  </span>
                )}
              </div>
            </div>
            <Progress
              value={cat.percentage}
              className={`h-2 ${
                cat.percentage >= 70 ? '[&>div]:bg-emerald-500' :
                cat.percentage >= 50 ? '[&>div]:bg-blue-500' :
                cat.percentage >= 35 ? '[&>div]:bg-amber-500' :
                '[&>div]:bg-red-500'
              }`}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// ENHANCED STAT CARD WITH VISUAL INDICATOR
// ============================================================================

interface EnhancedStatCardProps {
  title: string
  value: string | number
  subtitle?: string
  description?: string
  icon?: React.ReactNode
  trend?: {
    value: number
    label?: string
    isPositive?: boolean
  }
  progress?: {
    value: number
    max: number
    label?: string
  }
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}

const VARIANT_STYLES = {
  default: 'bg-white dark:bg-[hsl(222,47%,11%)] border border-slate-200 dark:border-slate-700/50',
  success: 'bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/20 border-emerald-200 dark:border-emerald-700/50',
  warning: 'bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/20 border-amber-200 dark:border-amber-700/50',
  danger: 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/20 border-red-200 dark:border-red-700/50',
  info: 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20 border-blue-200 dark:border-blue-700/50',
}

export function EnhancedStatCard({
  title,
  value,
  subtitle,
  description,
  icon,
  trend,
  progress,
  variant = 'default'
}: EnhancedStatCardProps) {
  return (
    <Card className={VARIANT_STYLES[variant]}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <div className="text-3xl font-bold text-slate-900 dark:text-white">{value}</div>
          {subtitle && <span className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</span>}
        </div>
        {description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{description}</p>
        )}
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-xs ${
            trend.isPositive === undefined ? 'text-slate-500 dark:text-slate-400' :
            trend.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {trend.isPositive !== undefined && (
              trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />
            )}
            <span>{trend.isPositive && trend.value > 0 ? '+' : ''}{trend.value}%</span>
            {trend.label && <span className="text-slate-500 dark:text-slate-400 ml-1">{trend.label}</span>}
          </div>
        )}
        {progress && (
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-500 dark:text-slate-400">{progress.label || 'Progress'}</span>
              <span className="text-slate-700 dark:text-slate-300">{Math.round((progress.value / progress.max) * 100)}%</span>
            </div>
            <Progress value={(progress.value / progress.max) * 100} className="h-1.5" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// PERFORMANCE MILESTONE TRACKER
// ============================================================================

interface MilestoneTrackerProps {
  currentScore: number
  reports: Array<{ score: number; period: string; date: string }>
  title?: string
  variant?: 'demo' | 'taps'
  maxScore?: number
}

const DEMO_MILESTONES = [
  { score: 400, label: 'Satisfactory', color: 'bg-orange-500' },
  { score: 550, label: 'Good', color: 'bg-amber-500' },
  { score: 700, label: 'Very Good', color: 'bg-blue-500' },
  { score: 850, label: 'Outstanding', color: 'bg-emerald-500' },
  { score: 1000, label: 'Perfect', color: 'bg-purple-500' },
]

const TAPS_MILESTONES = [
  { score: TAPS_RATING_THRESHOLDS.D.min, label: 'Struggling (D)', color: 'bg-orange-500' },
  { score: TAPS_RATING_THRESHOLDS.C.min, label: 'Standard (C)', color: 'bg-amber-500' },
  { score: TAPS_RATING_THRESHOLDS.B.min, label: 'High Achieving (B)', color: 'bg-blue-500' },
  { score: TAPS_RATING_THRESHOLDS.A.min, label: 'Outstanding (A)', color: 'bg-emerald-500' },
  { score: TAPS_TOTAL_MAX_SCORE, label: 'Perfect', color: 'bg-purple-500' },
]

export function MilestoneTracker({ currentScore, reports, title = "Achievement Progress", variant = 'demo', maxScore }: MilestoneTrackerProps) {
  const milestones = variant === 'taps' ? TAPS_MILESTONES : DEMO_MILESTONES
  const effectiveMaxScore = maxScore ?? (variant === 'taps' ? TAPS_TOTAL_MAX_SCORE : 1000)

  const achievedMilestones = milestones.filter(m => currentScore >= m.score)
  const nextMilestone = milestones.find(m => currentScore < m.score)
  const highestScore = Math.max(...reports.map(r => r.score), currentScore)
  
  // Find when each milestone was first achieved
  const milestoneHistory = useMemo(() => {
    const history: Record<number, string> = {}
    const sortedReports = [...reports].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    
    sortedReports.forEach(report => {
      milestones.forEach(m => {
        if (report.score >= m.score && !history[m.score]) {
          history[m.score] = report.period
        }
      })
    })
    return history
  }, [reports, milestones])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-amber-500" />
          {title}
        </CardTitle>
        <CardDescription>Track your journey to excellence</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Progress Bar */}
        <div className="relative mb-8">
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-orange-400 via-amber-400 via-blue-400 to-emerald-400 transition-all duration-500"
              style={{ width: `${(currentScore / effectiveMaxScore) * 100}%` }}
            />
          </div>
          {/* Milestone Markers */}
          {milestones.slice(0, -1).map(m => (
            <div 
              key={m.score}
              className="absolute top-0 -translate-x-1/2"
              style={{ left: `${(m.score / effectiveMaxScore) * 100}%` }}
            >
              <div className={`w-1 h-5 ${currentScore >= m.score ? m.color : 'bg-muted-foreground/30'}`} />
            </div>
          ))}
        </div>

        {/* Milestones List */}
        <div className="space-y-3">
          {milestones.map((milestone, index) => {
            const isAchieved = currentScore >= milestone.score
            const firstAchieved = milestoneHistory[milestone.score]
            
            return (
              <div
                key={milestone.score}
                className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                  isAchieved ? 'bg-slate-100 dark:bg-[hsl(222,47%,13%)]' : 'opacity-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isAchieved ? milestone.color : 'bg-muted'
                  }`}>
                    {isAchieved ? (
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="text-xs font-medium text-muted-foreground">{index + 1}</span>
                    )}
                  </div>
                  <div>
                    <p className={`font-medium ${isAchieved ? '' : 'text-muted-foreground'}`}>{milestone.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {milestone.score}+ points
                      {firstAchieved && <span className="ml-2">• Achieved in {firstAchieved}</span>}
                    </p>
                  </div>
                </div>
                {isAchieved && (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">Achieved</Badge>
                )}
              </div>
            )
          })}
        </div>

        {/* Next Target */}
        {nextMilestone && (
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10 rounded-lg border border-blue-100 dark:border-blue-500/20">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Next Target: {nextMilestone.label}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              {nextMilestone.score - currentScore} more points to reach {nextMilestone.score} points
            </p>
            <Progress
              value={((currentScore - (milestones[milestones.indexOf(nextMilestone) - 1]?.score || 0)) /
                (nextMilestone.score - (milestones[milestones.indexOf(nextMilestone) - 1]?.score || 0))) * 100}
              className="mt-2 h-2 bg-blue-100 dark:bg-blue-500/20 [&>div]:bg-blue-500"
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// CATEGORY COMPARISON OVER TIME
// ============================================================================

interface CategoryTrendData {
  period: string
  academic: number
  attendance: number
  infrastructure: number
  teaching_quality: number
  management: number
  student_welfare: number
  community: number
}

interface CategoryTrendChartProps {
  data: CategoryTrendData[]
  title?: string
  description?: string
}

export function CategoryTrendChart({ 
  data, 
  title = "Category Trends Over Time",
  description 
}: CategoryTrendChartProps) {
  const categoryColors: Record<CategoryName, string> = {
    academic: '#8884d8',
    attendance: '#82ca9d',
    infrastructure: '#ffc658',
    teaching_quality: '#ff7c7c',
    management: '#8dd1e1',
    student_welfare: '#a4de6c',
    community: '#d0ed57',
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No category trend data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis 
              dataKey="period" 
              tick={{ fontSize: 10 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ paddingTop: 20 }} />
            {(Object.entries(CATEGORY_CONFIG) as [CategoryName, { label: string; maxScore: number }][]).map(([category, config]) => (
              <Line
                key={category}
                type="monotone"
                dataKey={category}
                name={config.label}
                stroke={categoryColors[category]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// SCORE DISTRIBUTION HISTOGRAM
// ============================================================================

interface ScoreDistributionProps {
  distribution: { range: string; count: number; percentage: number; minScore: number; maxScore: number }[]
  totalReports: number
  title?: string
  description?: string
}

const RATING_BAR_COLORS = [
  '#ef4444', // Needs Improvement - red
  '#f97316', // Satisfactory - orange
  '#f59e0b', // Good - amber
  '#3b82f6', // Very Good - blue
  '#22c55e', // Outstanding - green
]

export function ScoreDistributionHistogram({
  distribution,
  totalReports,
  title = "Score Distribution",
  description
}: ScoreDistributionProps) {
  if (!distribution || distribution.length === 0) {
    return (
      <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border-slate-200/80 dark:border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-slate-900 dark:text-white">{title}</CardTitle>
          {description && <CardDescription className="text-slate-500 dark:text-slate-400">{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-slate-500 dark:text-slate-400">
            No distribution data available
          </div>
        </CardContent>
      </Card>
    )
  }

  const dataWithColors = distribution.map((d, i) => ({
    ...d,
    fill: RATING_BAR_COLORS[i] || '#8884d8',
  }))

  return (
    <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border-slate-200/80 dark:border-slate-700/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
          <BarChartIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          {title}
        </CardTitle>
        {description && <CardDescription className="text-slate-500 dark:text-slate-400">{description}</CardDescription>}
        <Badge variant="secondary" className="w-fit">{totalReports} reports total</Badge>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dataWithColors} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
            <XAxis 
              dataKey="range" 
              tick={({ x, y, payload }) => {
                // Shorten labels on XAxis: "0-399 (Needs Improvement)" -> "0-399"
                const label = payload.value.split(' ')[0];
                return (
                  <text x={x} y={y + 10} dy={16} textAnchor="middle" fill="#64748b" fontSize={10}>
                    {label}
                  </text>
                );
              }}
              height={50}
              interval={0}
            />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <Tooltip 
              formatter={((value: any, name: string, entry: any) => {
                const payload = entry?.payload;
                if (!payload) return [value, 'Count'];
                return [
                  `${value} schools (${payload.percentage}%)`,
                  'Count'
                ];
              }) as any}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={40}>
              {dataWithColors.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-4 px-2">
          {distribution.map((item, index) => {
            // Extract the label from "0-399 (Needs Improvement)" -> "Needs Improvement"
            const label = item.range.includes('(') 
              ? item.range.match(/\(([^)]+)\)/)?.[1] || item.range 
              : item.range;
            
            return (
              <div key={item.range} className="flex items-center gap-2 text-xs sm:text-sm">
                <div 
                  className="w-3 h-3 rounded-full shadow-sm" 
                  style={{ backgroundColor: RATING_BAR_COLORS[index] }}
                />
                <span className="font-medium text-slate-700">{label}:</span>
                <span className="text-muted-foreground">{item.count}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// CATEGORY GAP ANALYSIS CHART
// ============================================================================

interface CategoryGapProps {
  gaps: { category: string; label: string; averageScore: number; maxScore: number; gap: number; gapPercentage: number; filledPercentage: number }[]
  weakestCategory: string | null
  strongestCategory: string | null
  title?: string
  description?: string
}

export function CategoryGapAnalysisChart({
  gaps,
  weakestCategory,
  strongestCategory,
  title = "Category Gap Analysis",
  description
}: CategoryGapProps) {
  if (!gaps || gaps.length === 0) {
    return (
      <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border-slate-200/80 dark:border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-slate-900 dark:text-white">{title}</CardTitle>
          {description && <CardDescription className="text-slate-500 dark:text-slate-400">{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-slate-500 dark:text-slate-400">
            No gap analysis data available
          </div>
        </CardContent>
      </Card>
    )
  }

  // Sort by filled percentage (lowest first - showing biggest gaps at top)
  const sortedGaps = [...gaps].sort((a, b) => a.filledPercentage - b.filledPercentage)

  return (
    <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border-slate-200/80 dark:border-slate-700/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
          <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        <div className="flex gap-2 mt-2">
          {weakestCategory && (
            <Badge variant="destructive" className="text-xs">
              Weakest: {weakestCategory}
            </Badge>
          )}
          {strongestCategory && (
            <Badge className="bg-green-100 text-green-800 text-xs">
              Strongest: {strongestCategory}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedGaps.map((gap, index) => {
            const isWeakest = gap.label === weakestCategory
            const isStrongest = gap.label === strongestCategory
            
            return (
              <div key={gap.category} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className={`font-medium ${isWeakest ? 'text-red-600' : isStrongest ? 'text-green-600' : ''}`}>
                    {gap.label}
                    {isWeakest && <span className="ml-2 text-xs">(Priority)</span>}
                  </span>
                  <span className="text-muted-foreground">
                    {gap.averageScore}/{gap.maxScore} ({gap.filledPercentage}%)
                  </span>
                </div>
                <div className="relative h-6 bg-muted rounded-full overflow-hidden">
                  {/* Filled portion */}
                  <div 
                    className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                      isWeakest ? 'bg-red-500' : 
                      isStrongest ? 'bg-green-500' : 
                      gap.filledPercentage >= 70 ? 'bg-blue-500' :
                      gap.filledPercentage >= 50 ? 'bg-amber-500' :
                      'bg-orange-500'
                    }`}
                    style={{ width: `${gap.filledPercentage}%` }}
                  />
                  {/* Gap label */}
                  <div className="absolute inset-0 flex items-center justify-end pr-2">
                    <span className="text-xs font-medium text-gray-600">
                      Gap: {gap.gap} pts
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Summary */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Focus Area:</strong> Improving <span className="text-red-600 font-medium">{weakestCategory}</span> could 
            have the biggest impact on overall scores. Consider targeted interventions and resource allocation.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// SUBMISSION PROGRESS BREAKDOWN
// ============================================================================

interface SubmissionProgressProps {
  submitted: number
  inProgress: number
  notStarted: number
  total: number
  submittedPercentage: number
  inProgressPercentage: number
  notStartedPercentage: number
  title?: string
}

export function SubmissionProgressBreakdown({
  submitted,
  inProgress,
  notStarted,
  total,
  submittedPercentage,
  inProgressPercentage,
  notStartedPercentage,
  title = "Submission Progress"
}: SubmissionProgressProps) {
  const data = [
    { name: 'Submitted', value: submitted, color: '#22c55e', percentage: submittedPercentage },
    { name: 'In Progress', value: inProgress, color: '#f59e0b', percentage: inProgressPercentage },
    { name: 'Not Started', value: notStarted, color: '#ef4444', percentage: notStartedPercentage },
  ].filter(d => d.value > 0)

  return (
    <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border-slate-200/80 dark:border-slate-700/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
          <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          {title}
        </CardTitle>
        <CardDescription className="text-slate-500 dark:text-slate-400">{total} schools total</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Stacked Progress Bar */}
        <div className="relative h-8 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-emerald-500 dark:bg-emerald-500 transition-all duration-500"
            style={{ width: `${submittedPercentage}%` }}
          />
          <div
            className="h-full bg-amber-500 dark:bg-amber-500 transition-all duration-500"
            style={{ width: `${inProgressPercentage}%` }}
          />
          <div
            className="h-full bg-red-500 dark:bg-red-500 transition-all duration-500"
            style={{ width: `${notStartedPercentage}%` }}
          />
        </div>

        {/* Legend */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg border border-emerald-200 dark:border-emerald-500/20">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Submitted</span>
            </div>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{submitted}</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400/70">{submittedPercentage}%</p>
          </div>
          <div className="text-center p-3 bg-amber-50 dark:bg-amber-500/10 rounded-lg border border-amber-200 dark:border-amber-500/20">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">In Progress</span>
            </div>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{inProgress}</p>
            <p className="text-xs text-amber-600 dark:text-amber-400/70">{inProgressPercentage}%</p>
          </div>
          <div className="text-center p-3 bg-red-50 dark:bg-red-500/10 rounded-lg border border-red-200 dark:border-red-500/20">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-xs text-red-700 dark:text-red-400 font-medium">Not Started</span>
            </div>
            <p className="text-2xl font-bold text-red-700 dark:text-red-400">{notStarted}</p>
            <p className="text-xs text-red-600 dark:text-red-400/70">{notStartedPercentage}%</p>
          </div>
        </div>

        {/* Alert if many not started */}
        {notStartedPercentage > 30 && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-400">
              {notStarted} schools ({notStartedPercentage}%) haven't started their reports yet.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// RANKING POSITION CARD
// ============================================================================

interface RankingPositionProps {
  regionalRank: number | null
  regionalTotal: number
  nationalRank: number | null
  nationalTotal: number
  nationalPercentile: number | null
  regionName: string
  title?: string
}

export function RankingPositionCard({
  regionalRank,
  regionalTotal,
  nationalRank,
  nationalTotal,
  nationalPercentile,
  regionName,
  title = "Your Ranking"
}: RankingPositionProps) {
  const hasData = regionalRank !== null || nationalRank !== null

  return (
    <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border-slate-200/80 dark:border-slate-700/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
          <Award className="h-5 w-5 text-amber-500" />
          {title}
        </CardTitle>
        <CardDescription className="text-slate-500 dark:text-slate-400">See how you compare</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="text-center py-6 text-slate-500 dark:text-slate-400">
            <p>Submit a report to see your ranking</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {/* Regional Ranking */}
            <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-lg border border-blue-200 dark:border-blue-500/20">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">Regional Rank</p>
              <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">
                {regionalRank ? `#${regionalRank}` : '-'}
              </p>
              <p className="text-xs text-blue-500 dark:text-blue-400/70 mt-1">
                of {regionalTotal} schools in {regionName}
              </p>
            </div>

            {/* National Ranking */}
            <div className="p-4 bg-purple-50 dark:bg-purple-500/10 rounded-lg border border-purple-200 dark:border-purple-500/20">
              <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-1">National Rank</p>
              <p className="text-3xl font-bold text-purple-700 dark:text-purple-400">
                {nationalRank ? `#${nationalRank}` : '-'}
              </p>
              <p className="text-xs text-purple-500 dark:text-purple-400/70 mt-1">
                of {nationalTotal} schools nationally
              </p>
            </div>

            {/* Percentile */}
            {nationalPercentile !== null && (
              <div className="col-span-2 p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg border border-emerald-200 dark:border-emerald-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-1">National Percentile</p>
                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">Top {100 - nationalPercentile}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">{nationalPercentile}th</p>
                    <p className="text-xs text-emerald-500 dark:text-emerald-400/70">percentile</p>
                  </div>
                </div>
                <Progress
                  value={nationalPercentile}
                  className="mt-3 h-2 bg-emerald-100 dark:bg-emerald-500/20 [&>div]:bg-emerald-500"
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// STRONGEST/WEAKEST CATEGORY CARD
// ============================================================================

interface CategoryStrengthProps {
  strongest: { category: string; label: string; score: number; maxScore: number; percentage: number } | null
  weakest: { category: string; label: string; score: number; maxScore: number; percentage: number } | null
  title?: string
}

export function CategoryStrengthCard({
  strongest,
  weakest,
  title = "Category Highlights"
}: CategoryStrengthProps) {
  if (!strongest && !weakest) {
    return (
      <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border-slate-200/80 dark:border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-slate-900 dark:text-white">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-slate-500 dark:text-slate-400">
            <p>Submit a report to see category analysis</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border-slate-200/80 dark:border-slate-700/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
          <Target className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
          {title}
        </CardTitle>
        <CardDescription className="text-slate-500 dark:text-slate-400">Your performance by category</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Strongest */}
        {strongest && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg border border-emerald-200 dark:border-emerald-500/20">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase">Strongest Area</p>
                </div>
                <p className="text-lg font-bold text-emerald-800 dark:text-emerald-300">{strongest.label}</p>
                <p className="text-sm text-emerald-600 dark:text-emerald-400/70 mt-1">
                  {strongest.score}/{strongest.maxScore} points
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{strongest.percentage}%</p>
              </div>
            </div>
            <Progress
              value={strongest.percentage}
              className="mt-3 h-2 bg-emerald-100 dark:bg-emerald-500/20 [&>div]:bg-emerald-500"
            />
          </div>
        )}

        {/* Weakest */}
        {weakest && (
          <div className="p-4 bg-orange-50 dark:bg-orange-500/10 rounded-lg border border-orange-200 dark:border-orange-500/20">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Target className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  <p className="text-xs font-medium text-orange-700 dark:text-orange-400 uppercase">Needs Improvement</p>
                </div>
                <p className="text-lg font-bold text-orange-800 dark:text-orange-300">{weakest.label}</p>
                <p className="text-sm text-orange-600 dark:text-orange-400/70 mt-1">
                  {weakest.score}/{weakest.maxScore} points
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{weakest.percentage}%</p>
              </div>
            </div>
            <Progress
              value={weakest.percentage}
              className="mt-3 h-2 bg-orange-100 dark:bg-orange-500/20 [&>div]:bg-orange-500"
            />
            <p className="text-xs text-orange-600 dark:text-orange-400/70 mt-2">
              Focus on improving this area for the biggest score impact
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// MOST IMPROVED SCHOOLS TABLE
// ============================================================================

interface MostImprovedProps {
  improved: { schoolId: string; schoolName: string; regionName: string; currentScore: number; previousScore: number; improvement: number; improvementPercent: number }[]
  declined: { schoolId: string; schoolName: string; regionName: string; currentScore: number; previousScore: number; decline: number; declinePercent: number }[]
  title?: string
  showDeclined?: boolean
}

export function MostImprovedSchoolsTable({
  improved,
  declined,
  title = "Performance Changes",
  showDeclined = true
}: MostImprovedProps) {
  return (
    <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border-slate-200/80 dark:border-slate-700/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
          <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          {title}
        </CardTitle>
        <CardDescription className="text-slate-500 dark:text-slate-400">Schools with biggest score changes from previous term</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Most Improved */}
        {improved.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Most Improved ({improved.length})
            </h4>
            <div className="space-y-2">
              {improved.map((school, index) => (
                <div
                  key={school.schoolId}
                  className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg border border-emerald-200 dark:border-emerald-500/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-emerald-800 dark:text-emerald-300">{school.schoolName}</p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400/70">{school.regionName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">+{school.improvement}</p>
                    <p className="text-xs text-emerald-500 dark:text-emerald-400/70">
                      {school.previousScore} → {school.currentScore}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Declined */}
        {showDeclined && declined.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-red-700 dark:text-red-400 mb-3 flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Needs Attention ({declined.length})
            </h4>
            <div className="space-y-2">
              {declined.map((school, index) => (
                <div
                  key={school.schoolId}
                  className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-500/10 rounded-lg border border-red-200 dark:border-red-500/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-red-800 dark:text-red-300">{school.schoolName}</p>
                      <p className="text-xs text-red-600 dark:text-red-400/70">{school.regionName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-red-600 dark:text-red-400">-{school.decline}</p>
                    <p className="text-xs text-red-500 dark:text-red-400/70">
                      {school.previousScore} → {school.currentScore}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {improved.length === 0 && declined.length === 0 && (
          <div className="text-center py-6 text-slate-500 dark:text-slate-400">
            <p>Need at least 2 terms of data to show changes</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// REGION VS NATIONAL COMPARISON CARD
// ============================================================================

interface RegionVsNationalProps {
  regionAverage: number
  nationalAverage: number
  difference: number
  differencePercent: number
  regionRank: number
  totalRegions: number
  isAboveNational: boolean
  regionName?: string
  title?: string
}

export function RegionVsNationalCard({
  regionAverage,
  nationalAverage,
  difference,
  differencePercent,
  regionRank,
  totalRegions,
  isAboveNational,
  regionName = "Your Region",
  title = "Regional Performance"
}: RegionVsNationalProps) {
  return (
    <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border-slate-200/80 dark:border-slate-700/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
          <Award className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
          {title}
        </CardTitle>
        <CardDescription className="text-slate-500 dark:text-slate-400">How {regionName} compares nationally</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Regional Average */}
          <div className={`p-4 rounded-lg border ${isAboveNational ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20' : 'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20'}`}>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Regional Average</p>
            <p className={`text-3xl font-bold ${isAboveNational ? 'text-emerald-700 dark:text-emerald-400' : 'text-orange-700 dark:text-orange-400'}`}>
              {regionAverage}
            </p>
          </div>

          {/* National Average */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/50">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">National Average</p>
            <p className="text-3xl font-bold text-slate-700 dark:text-slate-300">{nationalAverage}</p>
          </div>
        </div>

        {/* Difference */}
        <div className={`p-4 rounded-lg ${isAboveNational ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-orange-50 dark:bg-orange-500/10'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isAboveNational ? (
                <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <TrendingDown className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              )}
              <span className={`font-medium ${isAboveNational ? 'text-emerald-700 dark:text-emerald-400' : 'text-orange-700 dark:text-orange-400'}`}>
                {isAboveNational ? 'Above' : 'Below'} National Average
              </span>
            </div>
            <span className={`text-xl font-bold ${isAboveNational ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'}`}>
              {isAboveNational ? '+' : ''}{difference} pts
            </span>
          </div>
          <p className={`text-sm mt-1 ${isAboveNational ? 'text-emerald-600 dark:text-emerald-400/70' : 'text-orange-600 dark:text-orange-400/70'}`}>
            {Math.abs(differencePercent)}% {isAboveNational ? 'higher' : 'lower'} than national average
          </p>
        </div>

        {/* Regional Rank */}
        <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg border border-indigo-200 dark:border-indigo-500/20">
          <div className="flex items-center justify-between">
            <span className="text-sm text-indigo-700 dark:text-indigo-400">Regional Ranking</span>
            <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
              #{regionRank} of {totalRegions} regions
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// CATEGORY LEADERS TABLE
// ============================================================================

interface CategoryLeadersProps {
  leaders: { category: string; label: string; schoolName: string; schoolId: string; score: number; maxScore: number; percentage: number }[]
  title?: string
  regionId?: string
  periodId?: string
  onViewSchool?: (schoolId: string) => void
}

export function CategoryLeadersTable({
  leaders,
  title = "Category Leaders",
  regionId,
  periodId,
  onViewSchool,
}: CategoryLeadersProps) {
  const [activeCategory, setActiveCategory] = useState<string>(() => leaders?.[0]?.category || 'academic')
  const [rankings, setRankings] = useState<{ rank: number; schoolId: string; schoolName: string; regionName?: string; score: number; maxScore: number; percentage: number }[]>([])
  const [loadingRankings, setLoadingRankings] = useState(false)
  const [rankingsError, setRankingsError] = useState<string | null>(null)

  useEffect(() => {
    if (!regionId) return
    if (!activeCategory) return

    setLoadingRankings(true)
    setRankingsError(null)

    void getRegionalCategoryRankings(activeCategory as CategoryName, regionId, periodId)
      .then((res) => {
        if (res.error) {
          setRankingsError(res.error)
          setRankings([])
        } else {
          setRankings(res.rankings || [])
        }
      })
      .catch(() => {
        setRankingsError('Failed to load rankings')
        setRankings([])
      })
      .finally(() => setLoadingRankings(false))
  }, [activeCategory, regionId, periodId])

  if (!leaders || leaders.length === 0) {
    return (
      <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border-slate-200/80 dark:border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-slate-900 dark:text-white">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-slate-500 dark:text-slate-400">
            <p>No data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const leaderByCategory = new Map(leaders.map((l) => [l.category, l]))
  const top3 = rankings.slice(0, 3)

  // Fallback: when regionId isn't provided, keep the simple summary list
  // (used in contexts like Education Official where drilldown isn't wired).
  if (!regionId) {
    return (
      <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border-slate-200/80 dark:border-slate-700/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
            <Award className="h-5 w-5 text-amber-500" />
            {title}
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">Top performing school in each category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {leaders.map((leader, index) => (
              <div
                key={leader.category}
                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg"
                    style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{leader.label}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{leader.schoolName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{leader.percentage}%</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {leader.score}/{leader.maxScore}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border-slate-200/80 dark:border-slate-700/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
          <Award className="h-5 w-5 text-amber-500" />
          {title}
        </CardTitle>
        <CardDescription className="text-slate-500 dark:text-slate-400">Click a category to view the full rankings</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7 h-auto bg-slate-100 dark:bg-slate-800">
            {leaders.map((leader, index) => (
              <TabsTrigger
                key={leader.category}
                value={leader.category}
                className="py-3 data-[state=active]:shadow-none data-[state=active]:bg-white dark:data-[state=active]:bg-[hsl(222,47%,11%)]"
              >
                <div className="w-full text-left">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
                    />
                    <span className="text-xs font-medium leading-tight line-clamp-1 text-slate-700 dark:text-slate-300">
                      {leader.label}
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between gap-2">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                      {leader.schoolName}
                    </span>
                    <Badge variant="secondary" className="shrink-0 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {leader.percentage}%
                    </Badge>
                  </div>
                </div>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeCategory} className="mt-4">
            {loadingRankings ? (
              <div className="flex items-center justify-center py-10 text-slate-500 dark:text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading category rankings…
              </div>
            ) : rankingsError ? (
              <div className="flex items-center justify-center py-10 text-slate-500 dark:text-slate-400">
                {rankingsError}
              </div>
            ) : rankings.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-slate-500 dark:text-slate-400">
                No rankings available for this category
              </div>
            ) : (
              <div className="space-y-4">
                {/* Top 3 spotlight */}
                <div className="rounded-lg border border-slate-200/80 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">Top 3 schools</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Highest performers in {leaderByCategory.get(activeCategory)?.label || 'this category'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <Trophy className="h-4 w-4 text-amber-500" />
                      <span className="text-xs">Spotlight</span>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {top3.map((s, idx) => (
                      <div
                        key={s.schoolId}
                        className={`rounded-lg border border-slate-200/80 dark:border-slate-700/50 p-3 bg-white dark:bg-[hsl(222,47%,9%)] ${idx === 0 ? 'md:col-span-1' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Medal className={`h-4 w-4 ${idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-slate-400' : 'text-orange-400'}`} />
                            <span className="text-sm font-medium text-slate-900 dark:text-white">#{s.rank}</span>
                          </div>
                          <Badge variant={idx === 0 ? 'default' : 'secondary'} className={idx === 0 ? '' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}>
                            {s.percentage}%
                          </Badge>
                        </div>
                        <button
                          type="button"
                          className={onViewSchool ? 'mt-2 text-left w-full hover:underline' : 'mt-2 text-left w-full'}
                          onClick={() => onViewSchool?.(s.schoolId)}
                        >
                          <p className="font-medium leading-tight line-clamp-1 text-slate-900 dark:text-white">{s.schoolName}</p>
                        </button>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {s.score}/{s.maxScore}
                        </p>
                        <div className="mt-2">
                          <Progress value={s.percentage} className="bg-slate-100 dark:bg-slate-700" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Full ranked list */}
                <div className="rounded-md border border-slate-200/80 dark:border-slate-700/50 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 dark:bg-[hsl(222,47%,8%)] border-b border-slate-200/80 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-[hsl(222,47%,8%)]">
                        <TableHead className="w-[70px] text-slate-600 dark:text-slate-400">Rank</TableHead>
                        <TableHead className="text-slate-600 dark:text-slate-400">School</TableHead>
                        <TableHead className="w-[120px] text-slate-600 dark:text-slate-400">Percent</TableHead>
                        <TableHead className="text-right w-[140px] text-slate-600 dark:text-slate-400">Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rankings.map((s) => (
                        <TableRow
                          key={s.schoolId}
                          className={`border-b border-slate-200/50 dark:border-slate-700/30 ${onViewSchool ? 'cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-500/5' : ''}`}
                          onClick={() => onViewSchool?.(s.schoolId)}
                        >
                          <TableCell>
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                              s.rank <= 3 ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400 font-bold' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                            }`}>
                              {s.rank}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-900 dark:text-white">{s.schoolName}</span>
                              {s.regionName ? (
                                <span className="text-xs text-slate-500 dark:text-slate-400">{s.regionName}</span>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">{s.percentage}%</Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold text-slate-900 dark:text-white">
                            {s.score}/{s.maxScore}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// UNDERPERFORMING REGIONS ALERT
// ============================================================================

interface UnderperformingRegionsProps {
  regions: { regionId: string; regionName: string; average: number; nationalAverage: number; deficit: number; schoolCount: number }[]
  title?: string
  onRegionClick?: (regionName: string) => void
}

export function UnderperformingRegionsAlert({
  regions,
  title = "Regions Below National Average",
  onRegionClick
}: UnderperformingRegionsProps) {
  if (!regions || regions.length === 0) {
    return (
      <Card className="bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500 dark:bg-emerald-500/80 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-emerald-800 dark:text-emerald-400">All Regions Performing Well</p>
              <p className="text-sm text-emerald-600 dark:text-emerald-400/80">All regions are at or above the national average</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border-orange-200 dark:border-orange-500/30">
      <CardHeader className="bg-orange-50 dark:bg-orange-500/10 rounded-t-lg border-b border-orange-100 dark:border-orange-500/20">
        <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-400">
          <AlertTriangle className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription className="text-orange-600 dark:text-orange-400/80">
          {regions.length} region{regions.length !== 1 ? 's' : ''} need attention
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-3">
          {regions.map(region => (
            <div
              key={region.regionId}
              className={`flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-500/10 rounded-lg border border-orange-100 dark:border-orange-500/20 ${onRegionClick ? 'cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-500/15 transition-colors' : ''}`}
              onClick={() => onRegionClick?.(region.regionName)}
            >
              <div>
                <p className="font-medium text-orange-800 dark:text-orange-400">{region.regionName}</p>
                <p className="text-xs text-orange-600 dark:text-orange-400/70">{region.schoolCount} schools</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-orange-700 dark:text-orange-400">{region.average}</p>
                <p className="text-xs text-orange-500 dark:text-orange-400/70">
                  -{region.deficit} below avg ({region.nationalAverage})
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// COMPLETION RATE GAUGE
// ============================================================================

interface CompletionRateProps {
  submitted: number
  total: number
  percentage: number
  title?: string
}

export function CompletionRateGauge({
  submitted,
  total,
  percentage,
  title = "Completion Rate"
}: CompletionRateProps) {
  const getColor = () => {
    if (percentage >= 80) return { bg: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', light: 'bg-emerald-50 dark:bg-emerald-500/10' }
    if (percentage >= 50) return { bg: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', light: 'bg-amber-50 dark:bg-amber-500/10' }
    return { bg: 'bg-red-500', text: 'text-red-600 dark:text-red-400', light: 'bg-red-50 dark:bg-red-500/10' }
  }

  const colors = getColor()

  return (
    <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border-slate-200/80 dark:border-slate-700/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
          <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Circular Progress */}
        <div className="flex flex-col items-center justify-center py-4">
          <div className="relative w-32 h-32">
            {/* Background circle */}
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                className="text-slate-200 dark:text-slate-700"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 56}
                strokeDashoffset={2 * Math.PI * 56 * (1 - percentage / 100)}
                className={colors.text}
                strokeLinecap="round"
              />
            </svg>
            {/* Percentage text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-3xl font-bold ${colors.text}`}>{percentage}%</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            {submitted} of {total} schools submitted
          </p>
        </div>

        {/* Status indicator */}
        <div className={`p-3 ${colors.light} rounded-lg mt-4`}>
          <p className={`text-sm ${colors.text} text-center`}>
            {percentage >= 80 && '✅ Great progress! Most schools have submitted.'}
            {percentage >= 50 && percentage < 80 && '⏳ Good progress. Keep encouraging submissions.'}
            {percentage < 50 && '⚠️ More submissions needed. Consider follow-ups.'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// Export a BarChart icon component for use
// (Using lucide-react BarChartIcon instead)




// ============================================================================
// MAIN ASSESSMENT CHARTS WRAPPER
// ============================================================================

interface AssessmentChartsProps {
  reportId: string
  schoolId: string
  comparisonSchoolId?: string | null
}

export function AssessmentCharts({ reportId, schoolId, comparisonSchoolId }: AssessmentChartsProps) {
  const [data, setData] = useState<{
    schoolTrends: any[]
    comparisonTrends: any[]
    currentReport: any
    comparisonReport: any
  }>({
    schoolTrends: [],
    comparisonTrends: [],
    currentReport: null,
    comparisonReport: null
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      try {
        const [trendsRes, reportRes] = await Promise.all([
          getSchoolTrends(schoolId),
          getReport(reportId)
        ])

        let compTrends: any[] = []
        let compReport: any = null

        if (comparisonSchoolId && reportRes?.report) {
          const [cTrendsRes, cReportRes] = await Promise.all([
            getSchoolTrends(comparisonSchoolId),
            getReportBySchoolAndPeriod(comparisonSchoolId, reportRes.report.periodId)
          ])
          compTrends = cTrendsRes.trends || []
          compReport = cReportRes
        }

        setData({
          schoolTrends: trendsRes.trends || [],
          comparisonTrends: compTrends,
          currentReport: reportRes?.report,
          comparisonReport: compReport
        })
      } catch (error) {
        console.error("Error loading assessment charts data:", error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [schoolId, reportId, comparisonSchoolId])

  if (isLoading) {
    return (
      <div className="h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    )
  }

  const isTAPS = data.currentReport?.isTAPS || data.currentReport?.tapsRatingGrade

  // Helper to extract category scores for radar chart
  const getRadarScores = (report: any) => {
    if (!report) return null
    if (isTAPS) {
      return report.tapsCategoryScores
    }
    return report.categoryScores
  }

  const currentRadarScores = getRadarScores(data.currentReport)
  const comparisonRadarScores = getRadarScores(data.comparisonReport)

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2">
        <EnhancedTrendChart 
          data={data.schoolTrends.map(t => ({
            period: t.period,
            averageScore: t.averageScore
          }))}
          title="Score History"
          description="Performance over the last few terms"
          variant={isTAPS ? 'taps' : 'demo'}
        />
        
        {isTAPS ? (
          <TAPSCategoryRadarChart 
            scores={currentRadarScores || {}}
            comparisonScores={comparisonRadarScores}
            comparisonLabel={comparisonSchoolId ? "Comparison" : undefined}
            title="Category Profile"
            description="Relative strength across TAPS categories"
          />
        ) : (
          <CategoryRadarChart 
            scores={currentRadarScores || {}}
            comparisonScores={comparisonRadarScores}
            comparisonLabel={comparisonSchoolId ? "Comparison" : undefined}
            title="Category Profile"
            description="Relative strength across assessment categories"
          />
        )}
      </div>

      {/* Sparklines for quick category trends could be added here */}
    </div>
  )
}
