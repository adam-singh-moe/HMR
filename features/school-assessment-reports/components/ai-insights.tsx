"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Sparkles, 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Target,
  Lightbulb,
  RefreshCw,
  MessageSquare,
  ChevronRight,
  Info,
  CheckCircle,
  XCircle,
  Minus,
  Users,
  BarChart3,
  School,
  Loader2,
  Send,
  History,
  Zap,
  Shield,
  BookOpen,
} from "lucide-react"

// ============================================================================
// MARKDOWN RENDERER HELPER
// ============================================================================

/**
 * Parse and render markdown content with proper formatting
 */
function MarkdownRenderer({ content }: { content: string }) {
  const sections = useMemo(() => {
    return parseMarkdownToSections(content)
  }, [content])

  return (
    <div className="space-y-4">
      {sections.map((section, idx) => (
        <RenderSection key={idx} section={section} />
      ))}
    </div>
  )
}

interface ParsedSection {
  type: 'heading' | 'paragraph' | 'list' | 'table' | 'keyValue' | 'divider'
  level?: number
  content: string
  items?: string[]
  rows?: string[][]
  headers?: string[]
}

function parseMarkdownToSections(content: string): ParsedSection[] {
  const lines = content.split('\n')
  const sections: ParsedSection[] = []
  let currentList: string[] = []
  let inTable = false
  let tableHeaders: string[] = []
  let tableRows: string[][] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Skip empty lines but close any open lists
    if (!line) {
      if (currentList.length > 0) {
        sections.push({ type: 'list', content: '', items: [...currentList] })
        currentList = []
      }
      if (inTable && tableRows.length > 0) {
        sections.push({ type: 'table', content: '', headers: tableHeaders, rows: tableRows })
        inTable = false
        tableHeaders = []
        tableRows = []
      }
      continue
    }

    // Divider
    if (line === '---' || line === '***' || line === '___') {
      sections.push({ type: 'divider', content: '' })
      continue
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      if (currentList.length > 0) {
        sections.push({ type: 'list', content: '', items: [...currentList] })
        currentList = []
      }
      sections.push({ 
        type: 'heading', 
        level: headingMatch[1].length, 
        content: headingMatch[2].replace(/\*\*/g, '').trim() 
      })
      continue
    }

    // Table detection
    if (line.includes('|') && line.split('|').length >= 3) {
      const cells = line.split('|').map(c => c.trim()).filter(c => c && !c.match(/^-+$/))
      if (cells.length > 0) {
        // Check if this is the separator line
        if (line.match(/^\|?\s*[-:]+\s*\|/)) {
          continue // Skip separator
        }
        if (!inTable) {
          inTable = true
          tableHeaders = cells
        } else {
          tableRows.push(cells)
        }
        continue
      }
    }

    // List items
    if (line.match(/^[-*•]\s+/) || line.match(/^\d+\.\s+/)) {
      const itemContent = line.replace(/^[-*•]\s+/, '').replace(/^\d+\.\s+/, '')
      currentList.push(itemContent)
      continue
    }

    // Key-value pairs (like **Key:** Value)
    const kvMatch = line.match(/^\*\*([^*]+)\*\*:?\s*(.*)$/)
    if (kvMatch) {
      if (currentList.length > 0) {
        sections.push({ type: 'list', content: '', items: [...currentList] })
        currentList = []
      }
      sections.push({ type: 'keyValue', content: kvMatch[1], items: [kvMatch[2] || ''] })
      continue
    }

    // Regular paragraph
    if (currentList.length > 0) {
      sections.push({ type: 'list', content: '', items: [...currentList] })
      currentList = []
    }
    sections.push({ type: 'paragraph', content: line.replace(/\*\*/g, '').replace(/\*/g, '') })
  }

  // Close any remaining lists or tables
  if (currentList.length > 0) {
    sections.push({ type: 'list', content: '', items: [...currentList] })
  }
  if (inTable && tableRows.length > 0) {
    sections.push({ type: 'table', content: '', headers: tableHeaders, rows: tableRows })
  }

  return sections
}

function RenderSection({ section }: { section: ParsedSection }) {
  switch (section.type) {
    case 'heading':
      const level = Math.min(section.level || 2, 6)
      const headingClasses: Record<number, string> = {
        1: 'text-xl font-bold text-purple-800 dark:text-purple-200 border-b pb-2 mb-3',
        2: 'text-lg font-semibold text-purple-700 dark:text-purple-300 mt-4 mb-2',
        3: 'text-base font-semibold text-gray-800 dark:text-gray-200 mt-3 mb-2',
        4: 'text-sm font-semibold text-gray-700 dark:text-gray-300 mt-2 mb-1',
        5: 'text-sm font-medium text-gray-600 dark:text-gray-400 mt-2 mb-1',
        6: 'text-xs font-medium text-gray-500 dark:text-gray-500 mt-1 mb-1',
      }
      const className = headingClasses[level] || headingClasses[2]
      
      // Use explicit heading elements based on level
      if (level === 1) return <h1 className={className}>{section.content}</h1>
      if (level === 2) return <h2 className={className}>{section.content}</h2>
      if (level === 3) return <h3 className={className}>{section.content}</h3>
      if (level === 4) return <h4 className={className}>{section.content}</h4>
      if (level === 5) return <h5 className={className}>{section.content}</h5>
      return <h6 className={className}>{section.content}</h6>

    case 'paragraph':
      return (
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          {section.content}
        </p>
      )

    case 'list':
      return (
        <ul className="space-y-1.5 ml-1">
          {section.items?.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm">
              <span className="text-purple-500 mt-1.5">•</span>
              <span className="text-gray-700 dark:text-gray-300">{item}</span>
            </li>
          ))}
        </ul>
      )

    case 'table':
      return (
        <div className="rounded-lg border overflow-hidden my-3">
          <Table>
            <TableHeader>
              <TableRow className="bg-purple-50 dark:bg-purple-950/30">
                {section.headers?.map((header, idx) => (
                  <TableHead key={idx} className="font-semibold text-purple-800 dark:text-purple-200">
                    {header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {section.rows?.map((row, rowIdx) => (
                <TableRow key={rowIdx} className="hover:bg-muted/50">
                  {row.map((cell, cellIdx) => (
                    <TableCell key={cellIdx} className="text-sm">
                      {cell}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )

    case 'keyValue':
      return (
        <div className="flex flex-wrap gap-x-2 py-1">
          <span className="font-semibold text-purple-700 dark:text-purple-300 text-sm">
            {section.content}:
          </span>
          <span className="text-gray-700 dark:text-gray-300 text-sm">
            {section.items?.[0]}
          </span>
        </div>
      )

    case 'divider':
      return <hr className="my-4 border-gray-200 dark:border-gray-700" />

    default:
      return null
  }
}

// ============================================================================
// SESSION STORAGE CACHE HELPERS
// ============================================================================

function getCacheKey(type: string, filters: Record<string, string | undefined>): string {
  const filterStr = Object.entries(filters)
    .filter(([_, v]) => v)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join('|')
  return `ai-insight-${type}-${filterStr || 'global'}`
}

function getFromCache(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    const cached = sessionStorage.getItem(key)
    if (cached) {
      const { data, timestamp } = JSON.parse(cached)
      // Cache valid for 30 minutes
      if (Date.now() - timestamp < 30 * 60 * 1000) {
        return data
      }
      sessionStorage.removeItem(key)
    }
  } catch {
    // Ignore cache errors
  }
  return null
}

function saveToCache(key: string, data: string): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }))
  } catch {
    // Ignore cache errors (e.g., quota exceeded)
  }
}

// ============================================================================
// TYPES
// ============================================================================

interface AIInsightPanelProps {
  title?: string
  description?: string
  onGenerateInsight: (prompt: string) => Promise<{ insight: string | null; error: string | null }>
  suggestedPrompts?: string[]
  context?: string
  className?: string
}

interface PredictiveAnalyticsCardProps {
  predictions: {
    nextTermScore: number
    confidence: number
    trend: 'improving' | 'declining' | 'stable'
    riskLevel: 'low' | 'medium' | 'high'
    factors: string[]
  } | null
  isLoading?: boolean
  onRefresh?: () => void
  schoolName?: string
}

interface EarlyWarningAlertProps {
  warnings: {
    schoolId: string
    schoolName: string
    regionName: string
    currentScore: number
    predictedScore: number
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
    warningType: string
    recommendation: string
    indicators: string[]
  }[]
  onViewSchool?: (schoolId: string) => void
  isLoading?: boolean
  title?: string
}

interface CohortComparisonCardProps {
  cohort: {
    schoolId: string
    schoolName: string
    totalScore: number
    similarity: number
    strengths: string[]
    challenges: string[]
  }[]
  insights: string | null
  targetSchoolName?: string
  isLoading?: boolean
  onViewSchool?: (schoolId: string) => void
}

interface AIInsightDisplayProps {
  insight: string | null
  isLoading?: boolean
  error?: string | null
  title?: string
}

interface QuickInsightButtonProps {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  isLoading?: boolean
  variant?: 'default' | 'outline' | 'ghost'
}

// ============================================================================
// AI INSIGHT PANEL - Main interactive component
// ============================================================================

export function AIInsightPanel({
  title = "AI Insights",
  description = "Get AI-powered analysis and recommendations",
  onGenerateInsight,
  suggestedPrompts = [],
  context,
  className = ""
}: AIInsightPanelProps) {
  const [prompt, setPrompt] = useState("")
  const [insight, setInsight] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<{ prompt: string; insight: string }[]>([])

  const handleGenerateInsight = useCallback(async (customPrompt?: string) => {
    const promptToUse = customPrompt || prompt
    if (!promptToUse.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await onGenerateInsight(promptToUse)
      if (result.error) {
        setError(result.error)
      } else if (result.insight) {
        setInsight(result.insight)
        setHistory(prev => [...prev.slice(-4), { prompt: promptToUse, insight: result.insight! }])
        setPrompt("")
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate insight")
    } finally {
      setIsLoading(false)
    }
  }, [prompt, onGenerateInsight])

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardHeader className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-b">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      
      <CardContent className="p-4 space-y-4">
        {/* Suggested Prompts */}
        {suggestedPrompts.length > 0 && !insight && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-medium">Suggested Questions:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedPrompts.slice(0, 4).map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="text-xs h-auto py-1.5 px-3"
                  onClick={() => handleGenerateInsight(suggestion)}
                  disabled={isLoading}
                >
                  <Lightbulb className="h-3 w-3 mr-1" />
                  {suggestion.length > 50 ? suggestion.slice(0, 50) + '...' : suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Custom Prompt Input */}
        <div className="space-y-2">
          <div className="relative">
            <Textarea
              placeholder="Ask a question about the assessment data..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[80px] pr-12 resize-none"
              disabled={isLoading}
            />
            <Button
              size="sm"
              className="absolute bottom-2 right-2"
              onClick={() => handleGenerateInsight()}
              disabled={isLoading || !prompt.trim()}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          {context && (
            <p className="text-xs text-muted-foreground">
              <Info className="h-3 w-3 inline mr-1" />
              Context: {context}
            </p>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-3 py-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Brain className="h-5 w-5 animate-pulse text-purple-600" />
              <span className="text-sm">Analyzing data and generating insights...</span>
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        )}

        {/* Insight Display */}
        {insight && !isLoading && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3 w-3" />
                AI Generated
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setInsight(null)}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                New Question
              </Button>
            </div>
            <div className="max-h-[400px] overflow-y-auto rounded-lg border p-4 bg-muted/30">
              <MarkdownRenderer content={insight} />
            </div>
          </div>
        )}

        {/* History */}
        {history.length > 0 && !insight && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-medium flex items-center gap-1">
              <History className="h-3 w-3" />
              Recent Questions:
            </p>
            <div className="space-y-1">
              {history.slice(-3).reverse().map((item, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs text-left h-auto py-1.5"
                  onClick={() => {
                    setInsight(item.insight)
                    setPrompt(item.prompt)
                  }}
                >
                  <MessageSquare className="h-3 w-3 mr-2 flex-shrink-0" />
                  <span className="truncate">{item.prompt}</span>
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// PREDICTIVE ANALYTICS CARD
// ============================================================================

export function PredictiveAnalyticsCard({
  predictions,
  isLoading,
  onRefresh,
  schoolName
}: PredictiveAnalyticsCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Predictive Analytics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    )
  }

  if (!predictions) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-muted-foreground" />
            Predictive Analytics
          </CardTitle>
          <CardDescription>
            Performance predictions are not available. More historical data is needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              At least 2 submitted assessment reports are needed to generate predictions.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const trendIcon = {
    improving: <TrendingUp className="h-5 w-5 text-green-600" />,
    declining: <TrendingDown className="h-5 w-5 text-red-600" />,
    stable: <Minus className="h-5 w-5 text-blue-600" />
  }

  const trendColor = {
    improving: 'text-green-600 bg-green-50 dark:bg-green-950',
    declining: 'text-red-600 bg-red-50 dark:bg-red-950',
    stable: 'text-blue-600 bg-blue-50 dark:bg-blue-950'
  }

  const riskColor = {
    low: 'bg-green-500',
    medium: 'bg-amber-500',
    high: 'bg-red-500'
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            Predictive Analytics
          </CardTitle>
          {onRefresh && (
            <Button variant="ghost" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
        {schoolName && (
          <CardDescription>Performance forecast for {schoolName}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Predicted Score */}
        <div className="text-center p-6 rounded-lg bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30">
          <p className="text-sm text-muted-foreground mb-1">Predicted Next Term Score</p>
          <p className="text-4xl font-bold text-purple-700 dark:text-purple-300">
            {predictions.nextTermScore}
          </p>
          <p className="text-sm text-muted-foreground mt-1">out of 1000</p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <Badge variant="outline" className="gap-1">
              <Target className="h-3 w-3" />
              {Math.round(predictions.confidence * 100)}% confidence
            </Badge>
          </div>
        </div>

        {/* Trend & Risk */}
        <div className="grid grid-cols-2 gap-4">
          <div className={`p-4 rounded-lg ${trendColor[predictions.trend]}`}>
            <div className="flex items-center gap-2 mb-1">
              {trendIcon[predictions.trend]}
              <span className="text-sm font-medium capitalize">{predictions.trend}</span>
            </div>
            <p className="text-xs text-muted-foreground">Performance Trend</p>
          </div>
          
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-3 h-3 rounded-full ${riskColor[predictions.riskLevel]}`} />
              <span className="text-sm font-medium capitalize">{predictions.riskLevel} Risk</span>
            </div>
            <p className="text-xs text-muted-foreground">Risk Level</p>
          </div>
        </div>

        {/* Contributing Factors */}
        {predictions.factors.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Contributing Factors:</p>
            <ul className="space-y-1">
              {predictions.factors.map((factor, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  {factor}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// EARLY WARNING ALERT
// ============================================================================

export function EarlyWarningAlert({
  warnings,
  onViewSchool,
  isLoading,
  title = "Early Warning System"
}: EarlyWarningAlertProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!warnings || warnings.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
            <CheckCircle className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-green-700 dark:text-green-300">
            All schools are performing within acceptable parameters. No early warnings at this time.
          </p>
        </CardContent>
      </Card>
    )
  }

  const riskColors = {
    critical: 'border-red-500 bg-red-50 dark:bg-red-950/30',
    high: 'border-orange-500 bg-orange-50 dark:bg-orange-950/30',
    medium: 'border-amber-500 bg-amber-50 dark:bg-amber-950/30',
    low: 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
  }

  const riskBadgeColors = {
    critical: 'bg-red-500 text-white',
    high: 'bg-orange-500 text-white',
    medium: 'bg-amber-500 text-white',
    low: 'bg-blue-500 text-white'
  }

  // Group by risk level
  const criticalWarnings = warnings.filter(w => w.riskLevel === 'critical')
  const highWarnings = warnings.filter(w => w.riskLevel === 'high')
  const otherWarnings = warnings.filter(w => w.riskLevel !== 'critical' && w.riskLevel !== 'high')

  return (
    <Card className="border-orange-200">
      <CardHeader className="bg-orange-50/50 dark:bg-orange-950/20">
        <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
          <Shield className="h-5 w-5" />
          {title}
          <Badge variant="secondary" className="ml-auto">
            {warnings.length} {warnings.length === 1 ? 'alert' : 'alerts'}
          </Badge>
        </CardTitle>
        <CardDescription>
          Schools identified as at-risk based on performance analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        <div className="max-h-[400px] overflow-y-auto">
          <div className="space-y-3">
            {/* Critical Alerts First */}
            {criticalWarnings.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wider">
                  Critical - Immediate Action Required
                </p>
                {criticalWarnings.map((warning) => (
                  <WarningCard 
                    key={warning.schoolId} 
                    warning={warning} 
                    onViewSchool={onViewSchool}
                    riskColors={riskColors}
                    riskBadgeColors={riskBadgeColors}
                  />
                ))}
              </div>
            )}

            {/* High Risk Alerts */}
            {highWarnings.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider">
                  High Risk - Action Needed
                </p>
                {highWarnings.map((warning) => (
                  <WarningCard 
                    key={warning.schoolId} 
                    warning={warning} 
                    onViewSchool={onViewSchool}
                    riskColors={riskColors}
                    riskBadgeColors={riskBadgeColors}
                  />
                ))}
              </div>
            )}

            {/* Other Alerts */}
            {otherWarnings.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Monitoring Required
                </p>
                {otherWarnings.slice(0, 5).map((warning) => (
                  <WarningCard 
                    key={warning.schoolId} 
                    warning={warning} 
                    onViewSchool={onViewSchool}
                    riskColors={riskColors}
                    riskBadgeColors={riskBadgeColors}
                  />
                ))}
                {otherWarnings.length > 5 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    +{otherWarnings.length - 5} more schools require monitoring
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function WarningCard({ 
  warning, 
  onViewSchool, 
  riskColors, 
  riskBadgeColors 
}: { 
  warning: EarlyWarningAlertProps['warnings'][0]
  onViewSchool?: (schoolId: string) => void
  riskColors: Record<string, string>
  riskBadgeColors: Record<string, string>
}) {
  return (
    <div 
      className={`p-3 rounded-lg border-l-4 ${riskColors[warning.riskLevel]} cursor-pointer hover:shadow-md transition-shadow`}
      onClick={() => onViewSchool?.(warning.schoolId)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm truncate">{warning.schoolName}</p>
            <Badge className={`text-xs ${riskBadgeColors[warning.riskLevel]}`}>
              {warning.riskLevel}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{warning.regionName}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-medium">{warning.currentScore}</p>
          <p className="text-xs text-muted-foreground">→ {warning.predictedScore}</p>
        </div>
      </div>
      <div className="mt-2 space-y-1">
        <p className="text-xs font-medium text-orange-700 dark:text-orange-300">
          {warning.warningType}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {warning.recommendation}
        </p>
      </div>
    </div>
  )
}

// ============================================================================
// COHORT COMPARISON CARD
// ============================================================================

export function CohortComparisonCard({
  cohort,
  insights,
  targetSchoolName,
  isLoading,
  onViewSchool
}: CohortComparisonCardProps) {
  const [showInsights, setShowInsights] = useState(false)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Cohort Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!cohort || cohort.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            Cohort Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              No similar schools found for comparison. Try adjusting the comparison criteria.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600" />
          Cohort Analysis
        </CardTitle>
        <CardDescription>
          {targetSchoolName 
            ? `Schools similar to ${targetSchoolName}` 
            : 'Comparable schools based on performance metrics'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cohort Schools List */}
        <div className="space-y-2">
          {cohort.map((school, index) => (
            <div 
              key={school.schoolId}
              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => onViewSchool?.(school.schoolId)}
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-sm font-medium text-blue-700 dark:text-blue-300">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{school.schoolName}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {school.strengths.slice(0, 2).map((s, i) => (
                    <Badge key={i} variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">{school.totalScore}</p>
                <p className="text-xs text-muted-foreground">{school.similarity}% similar</p>
              </div>
            </div>
          ))}
        </div>

        {/* AI Insights Toggle */}
        {insights && (
          <div className="pt-2 border-t">
            <Button
              variant="ghost"
              className="w-full justify-between"
              onClick={() => setShowInsights(!showInsights)}
            >
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                AI Cohort Insights
              </span>
              <ChevronRight className={`h-4 w-4 transition-transform ${showInsights ? 'rotate-90' : ''}`} />
            </Button>
            {showInsights && (
              <div className="mt-3 p-4 rounded-lg bg-purple-50 dark:bg-purple-950/30">
                <MarkdownRenderer content={insights} />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// AI INSIGHT DISPLAY
// ============================================================================

export function AIInsightDisplay({
  insight,
  isLoading,
  error,
  title = "AI Analysis"
}: AIInsightDisplayProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 animate-pulse text-purple-600" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Generating insights...</p>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <XCircle className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (!insight) {
    return null
  }

  return (
    <Card className="border-purple-200 dark:border-purple-800">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          {title}
          <Badge variant="secondary" className="ml-auto">AI Generated</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="max-h-[500px] overflow-y-auto">
          <MarkdownRenderer content={insight} />
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// QUICK INSIGHT BUTTONS
// ============================================================================

export function QuickInsightButton({
  label,
  icon,
  onClick,
  isLoading,
  variant = 'outline'
}: QuickInsightButtonProps) {
  return (
    <Button
      variant={variant}
      size="sm"
      onClick={onClick}
      disabled={isLoading}
      className="gap-2"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        icon || <Zap className="h-4 w-4" />
      )}
      {label}
    </Button>
  )
}

// ============================================================================
// AI FEATURE BADGE
// ============================================================================

export function AIFeatureBadge({ className = "" }: { className?: string }) {
  return (
    <Badge 
      variant="secondary" 
      className={`gap-1 bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 dark:from-purple-900 dark:to-blue-900 dark:text-purple-300 ${className}`}
    >
      <Sparkles className="h-3 w-3" />
      AI Powered
    </Badge>
  )
}

// ============================================================================
// IMPROVEMENT PLAN CARD
// ============================================================================

interface ImprovementPlanCardProps {
  plan: string | null
  schoolName?: string
  isLoading?: boolean
  onGenerate?: () => void
}

export function ImprovementPlanCard({
  plan,
  schoolName,
  isLoading,
  onGenerate
}: ImprovementPlanCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 animate-pulse text-purple-600" />
            Improvement Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Brain className="h-5 w-5 animate-pulse" />
            <span className="text-sm">Generating personalized improvement plan...</span>
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    )
  }

  if (!plan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
            Improvement Plan
          </CardTitle>
          <CardDescription>
            Get an AI-generated improvement plan tailored to your school's needs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onGenerate} className="w-full gap-2">
            <Sparkles className="h-4 w-4" />
            Generate Improvement Plan
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-green-200 dark:border-green-800">
      <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-green-600" />
          Improvement Plan
          {schoolName && <span className="text-sm font-normal text-muted-foreground">for {schoolName}</span>}
        </CardTitle>
        <div className="flex items-center gap-2">
          <AIFeatureBadge />
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="max-h-[600px] overflow-y-auto">
          <MarkdownRenderer content={plan} />
        </div>
      </CardContent>
      <CardFooter className="border-t bg-muted/30">
        <Button variant="outline" size="sm" onClick={onGenerate} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Regenerate Plan
        </Button>
      </CardFooter>
    </Card>
  )
}

// ============================================================================
// CATEGORY ANALYSIS SELECTOR
// ============================================================================

interface CategoryAnalysisSelectorProps {
  selectedCategory: string | null
  onSelectCategory: (category: string) => void
  categoryScores?: Record<string, { score: number; max: number }>
}

export function CategoryAnalysisSelector({
  selectedCategory,
  onSelectCategory,
  categoryScores
}: CategoryAnalysisSelectorProps) {
  const categories = [
    { key: 'academic', label: 'Academic Performance', icon: BookOpen, max: 300 },
    { key: 'attendance', label: 'Attendance', icon: Users, max: 150 },
    { key: 'infrastructure', label: 'Infrastructure', icon: School, max: 150 },
    { key: 'teaching_quality', label: 'Teaching Quality', icon: Target, max: 150 },
    { key: 'management', label: 'Management', icon: BarChart3, max: 100 },
    { key: 'student_welfare', label: 'Student Welfare', icon: Shield, max: 100 },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {categories.map(({ key, label, icon: Icon, max }) => {
        const score = categoryScores?.[key]?.score || 0
        const percentage = Math.round((score / max) * 100)
        const isSelected = selectedCategory === key

        return (
          <Button
            key={key}
            variant={isSelected ? "default" : "outline"}
            className={`h-auto py-3 flex-col items-start justify-start gap-1 ${
              isSelected ? 'ring-2 ring-purple-500' : ''
            }`}
            onClick={() => onSelectCategory(key)}
          >
            <div className="flex items-center gap-2 w-full">
              <Icon className="h-4 w-4" />
              <span className="text-xs font-medium truncate">{label}</span>
            </div>
            {categoryScores && (
              <div className="w-full">
                <Progress value={percentage} className="h-1.5" />
                <p className="text-xs text-muted-foreground mt-1">
                  {score}/{max} ({percentage}%)
                </p>
              </div>
            )}
          </Button>
        )
      })}
    </div>
  )
}

// ============================================================================
// MAIN DASHBOARD AI COMPONENTS (Wrapper Components for Page Integration)
// ============================================================================

import { 
  generateSchoolAssessmentInsight,
  generateRegionalAssessmentInsight,
  generateNationalAssessmentInsight,
  generatePredictiveAnalytics,
  getEarlyWarnings,
  generateImprovementPlan,
  getCohortAnalysis,
} from "../actions/ai-insights"

interface AIInsightCardProps {
  type: 'overview' | 'category_analysis' | 'regional_comparison' | 'improvement_opportunities' | 'trend_analysis'
  title?: string
  description?: string
  filters?: {
    schoolId?: string
    regionId?: string
    periodId?: string
  }
  className?: string
  autoGenerate?: boolean // Auto-generate on mount (default: true)
}

/**
 * AIInsightCard - Main AI insight component for dashboard overview
 * - Auto-generates insights on page entry
 * - Caches results in session storage for 30 minutes
 * - Displays content in formatted markdown with tables
 */
export function AIInsightCard({
  type,
  title = "AI Analysis",
  description = "Get AI-powered insights",
  filters = {},
  className = "",
  autoGenerate = true
}: AIInsightCardProps) {
  const [insight, setInsight] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasGenerated, setHasGenerated] = useState(false)
  const [fromCache, setFromCache] = useState(false)

  // Get cache key based on type and filters
  const cacheKey = useMemo(() => 
    getCacheKey(type, {
      schoolId: filters.schoolId,
      regionId: filters.regionId,
      periodId: filters.periodId
    }), [type, filters.schoolId, filters.regionId, filters.periodId]
  )

  const generateInsight = useCallback(async (skipCache = false) => {
    // Check cache first unless explicitly skipping
    if (!skipCache) {
      const cached = getFromCache(cacheKey)
      if (cached) {
        setInsight(cached)
        setHasGenerated(true)
        setFromCache(true)
        return
      }
    }

    setLoading(true)
    setError(null)
    setFromCache(false)
    
    try {
      // Use appropriate function based on filters
      let result: { insight?: string | null; error?: string | null }
      if (filters.schoolId) {
        result = await generateSchoolAssessmentInsight(filters.schoolId, filters.periodId)
      } else if (filters.regionId) {
        result = await generateRegionalAssessmentInsight(filters.regionId, filters.periodId)
      } else {
        result = await generateNationalAssessmentInsight(filters.periodId)
      }
      
      if (result.error) {
        setError(result.error)
      } else if (result.insight) {
        setInsight(result.insight)
        setHasGenerated(true)
        // Save to cache
        saveToCache(cacheKey, result.insight)
      }
    } catch (err) {
      setError('Failed to generate insight')
    } finally {
      setLoading(false)
    }
  }, [filters.schoolId, filters.regionId, filters.periodId, cacheKey])

  // Auto-generate on mount
  useEffect(() => {
    if (autoGenerate && !hasGenerated && !loading) {
      generateInsight()
    }
  }, [autoGenerate]) // Only run on mount

  return (
    <Card className={`border-purple-200 dark:border-purple-800 ${className}`}>
      <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-purple-600" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {hasGenerated && (
            <div className="flex items-center gap-2">
              {fromCache && (
                <Badge variant="outline" className="text-xs gap-1">
                  <History className="h-3 w-3" />
                  Cached
                </Badge>
              )}
              <Badge variant="secondary" className="gap-1 bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                <Sparkles className="h-3 w-3" />
                AI
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {!hasGenerated && !loading && !autoGenerate && (
          <div className="text-center py-8">
            <Brain className="h-12 w-12 mx-auto text-purple-300 mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              Click below to generate AI-powered insights based on your assessment data.
            </p>
            <Button onClick={() => generateInsight()} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Generate Insights
            </Button>
          </div>
        )}
        
        {loading && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="relative">
              <Brain className="h-12 w-12 text-purple-300" />
              <Loader2 className="h-6 w-6 animate-spin text-purple-600 absolute -bottom-1 -right-1" />
            </div>
            <p className="text-sm text-muted-foreground">Analyzing assessment data with AI...</p>
            <div className="w-48">
              <Progress value={33} className="h-1" />
            </div>
          </div>
        )}
        
        {error && !loading && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => generateInsight(true)}
                className="ml-4 gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        {insight && !loading && (
          <div className="space-y-4">
            <div className="max-h-[400px] overflow-y-auto rounded-lg border p-4 bg-muted/30">
              <MarkdownRenderer content={insight} />
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => generateInsight(true)}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Regenerate
              </Button>
              {fromCache && (
                <span className="text-xs text-muted-foreground">
                  Showing cached result • Click regenerate for fresh analysis
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface AIAtRiskAlertProps {
  regionId?: string
  regionName?: string
  threshold?: number
  className?: string
  autoGenerate?: boolean
}

/**
 * AIAtRiskAlert - Displays AI-identified at-risk schools
 * - Auto-generates on page entry
 * - Caches results in session storage
 */
export function AIAtRiskAlert({
  regionId,
  regionName = "Your Region",
  threshold,
  className = "",
  autoGenerate = true
}: AIAtRiskAlertProps) {
  const [schools, setSchools] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [fromCache, setFromCache] = useState(false)

  const thresholdKey = threshold === undefined ? 'auto' : String(threshold)
  const cacheKey = useMemo(
    () => getCacheKey('at-risk', { regionId, threshold: thresholdKey }),
    [regionId, thresholdKey]
  )

  const loadAtRiskSchools = useCallback(async (skipCache = false) => {
    // Check cache first
    if (!skipCache) {
      const cached = getFromCache(cacheKey)
      if (cached) {
        try {
          setSchools(JSON.parse(cached))
          setHasLoaded(true)
          setFromCache(true)
          return
        } catch { /* ignore parse errors */ }
      }
    }

    setLoading(true)
    setError(null)
    setFromCache(false)
    
    try {
      const result = await getEarlyWarnings(regionId, threshold)
      if (result.error) {
        setError(result.error)
      } else {
        const warnings = result.warnings || []
        setSchools(warnings)
        setHasLoaded(true)
        // Cache the results
        saveToCache(cacheKey, JSON.stringify(warnings))
      }
    } catch (err) {
      setError('Failed to identify at-risk schools')
    } finally {
      setLoading(false)
    }
  }, [regionId, threshold, cacheKey])

  // Auto-load on mount
  useEffect(() => {
    if (autoGenerate && !hasLoaded && !loading) {
      loadAtRiskSchools()
    }
  }, [autoGenerate])

  const criticalSchools = schools.filter(s => s.riskLevel === 'critical')
  const highRiskSchools = schools.filter(s => s.riskLevel === 'high')
  const mediumRiskSchools = schools.filter(s => s.riskLevel === 'medium')
  // Catch-all for schools without a specific risk level or with other values
  const otherRiskSchools = schools.filter(s => 
    !['critical', 'high', 'medium'].includes(s.riskLevel)
  )

  return (
    <Card className={`border-orange-200 dark:border-orange-800 ${className}`}>
      <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-orange-600" />
              At-Risk Schools
              {hasLoaded && schools.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {schools.length} identified
                </Badge>
              )}
            </CardTitle>
            <CardDescription>AI-powered early warning system for schools needing attention</CardDescription>
          </div>
          {hasLoaded && (
            <div className="flex items-center gap-2">
              {fromCache && (
                <Badge variant="outline" className="text-xs gap-1">
                  <History className="h-3 w-3" />
                  Cached
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {!hasLoaded && !loading && !autoGenerate && (
          <div className="text-center py-6">
            <Shield className="h-10 w-10 mx-auto text-orange-300 mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              Analyze schools that may need intervention based on performance patterns.
            </p>
            <Button onClick={() => loadAtRiskSchools()} variant="outline" className="gap-2">
              <Zap className="h-4 w-4" />
              Analyze At-Risk Schools
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-6 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
            <p className="text-sm text-muted-foreground">Analyzing performance patterns...</p>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {hasLoaded && !loading && schools.length === 0 && (
          <div className="text-center py-6">
            <CheckCircle className="h-10 w-10 mx-auto text-green-500 mb-3" />
            <p className="text-sm text-muted-foreground">
              No schools currently identified as at-risk. Great work!
            </p>
          </div>
        )}

        {hasLoaded && schools.length > 0 && (
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {criticalSchools.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-600 uppercase mb-2">Critical</p>
                {criticalSchools.map((school) => (
                  <div key={school.schoolId} className="p-2 rounded bg-red-50 dark:bg-red-950/20 mb-2">
                    <p className="font-medium text-sm">{school.schoolName}</p>
                    <p className="text-xs text-muted-foreground">
                      Score: {school.currentScore} | {school.warningType || school.indicators?.[0] || 'At Risk'}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {highRiskSchools.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-orange-600 uppercase mb-2">High Risk</p>
                {highRiskSchools.map((school) => (
                  <div key={school.schoolId} className="p-2 rounded bg-orange-50 dark:bg-orange-950/20 mb-2">
                    <p className="font-medium text-sm">{school.schoolName}</p>
                    <p className="text-xs text-muted-foreground">
                      Score: {school.currentScore} | {school.warningType || school.indicators?.[0] || 'At Risk'}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {mediumRiskSchools.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-yellow-600 uppercase mb-2">Medium Risk</p>
                {mediumRiskSchools.map((school) => (
                  <div key={school.schoolId} className="p-2 rounded bg-yellow-50 dark:bg-yellow-950/20 mb-2">
                    <p className="font-medium text-sm">{school.schoolName}</p>
                    <p className="text-xs text-muted-foreground">
                      Score: {school.currentScore} | {school.warningType || school.indicators?.[0] || 'At Risk'}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {otherRiskSchools.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase mb-2">At Risk</p>
                {otherRiskSchools.map((school) => (
                  <div key={school.schoolId} className="p-2 rounded bg-gray-50 dark:bg-gray-950/20 mb-2">
                    <p className="font-medium text-sm">{school.schoolName}</p>
                    <p className="text-xs text-muted-foreground">
                      Score: {school.currentScore} | {school.warningType || school.indicators?.[0] || 'At Risk'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface AIRecommendationPanelProps {
  reportId: string
  schoolName?: string
  categoryFocus?: string
  className?: string
  autoGenerate?: boolean
}

/**
 * AIRecommendationPanel - School-specific AI recommendations
 * - Auto-generates on mount
 * - Caches results in session storage
 */
export function AIRecommendationPanel({
  reportId,
  schoolName = "School",
  categoryFocus,
  className = "",
  autoGenerate = true
}: AIRecommendationPanelProps) {
  const [recommendations, setRecommendations] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fromCache, setFromCache] = useState(false)

  const cacheKey = useMemo(() => 
    getCacheKey('recommendations', { reportId, categoryFocus }), 
    [reportId, categoryFocus]
  )

  const loadRecommendations = useCallback(async (skipCache = false) => {
    // Check cache first
    if (!skipCache) {
      const cached = getFromCache(cacheKey)
      if (cached) {
        setRecommendations(cached)
        setFromCache(true)
        return
      }
    }

    setLoading(true)
    setError(null)
    setFromCache(false)
    
    try {
      // Note: generateImprovementPlan uses the reportId to look up the school
      const result = await generateImprovementPlan(reportId, reportId)
      if (result.error) {
        setError(result.error)
      } else if (result.insight) {
        setRecommendations(result.insight)
        // Cache the results
        saveToCache(cacheKey, result.insight)
      }
    } catch (err) {
      setError('Failed to generate recommendations')
    } finally {
      setLoading(false)
    }
  }, [reportId, cacheKey])

  // Auto-load on mount
  useEffect(() => {
    if (autoGenerate && !recommendations && !loading) {
      loadRecommendations()
    }
  }, [autoGenerate])

  return (
    <Card className={`border-blue-200 dark:border-blue-800 ${className}`}>
      <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="h-5 w-5 text-blue-600" />
            AI Recommendations
            <span className="text-sm font-normal text-muted-foreground">for {schoolName}</span>
          </CardTitle>
          {recommendations && (
            <div className="flex items-center gap-2">
              {fromCache && (
                <Badge variant="outline" className="text-xs gap-1">
                  <History className="h-3 w-3" />
                  Cached
                </Badge>
              )}
              <Badge variant="secondary" className="gap-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                <Sparkles className="h-3 w-3" />
                AI
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {!recommendations && !loading && !autoGenerate && (
          <div className="text-center py-6">
            <Lightbulb className="h-10 w-10 mx-auto text-blue-300 mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              Get personalized improvement recommendations based on assessment data.
            </p>
            <Button onClick={() => loadRecommendations()} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Get Recommendations
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-6 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <p className="text-sm text-muted-foreground">Generating personalized recommendations...</p>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => loadRecommendations(true)}
                className="ml-4 gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {recommendations && !loading && (
          <div className="space-y-4">
            <div className="max-h-[300px] overflow-y-auto rounded-lg border p-4 bg-muted/30">
              <MarkdownRenderer content={recommendations} />
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => loadRecommendations(true)}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Regenerate
              </Button>
              {fromCache && (
                <span className="text-xs text-muted-foreground">
                  Showing cached result
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface AITrendPredictionProps {
  type: 'school' | 'region' | 'national'
  entityId?: string
  historicalData?: { period: string; score: number }[]
  title?: string
  description?: string
  className?: string
  autoGenerate?: boolean
}

/**
 * AITrendPrediction - AI-powered performance prediction
 * - Auto-generates on mount
 * - Caches results in session storage
 */
export function AITrendPrediction({
  type,
  entityId,
  historicalData = [],
  title = "Performance Prediction",
  description = "AI-powered forecast based on historical trends",
  className = "",
  autoGenerate = true
}: AITrendPredictionProps) {
  const [prediction, setPrediction] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fromCache, setFromCache] = useState(false)

  const cacheKey = useMemo(() => 
    getCacheKey('prediction', { type, entityId }), 
    [type, entityId]
  )

  const generatePrediction = useCallback(async (skipCache = false) => {
    // Check cache first
    if (!skipCache) {
      const cached = getFromCache(cacheKey)
      if (cached) {
        try {
          setPrediction(JSON.parse(cached))
          setFromCache(true)
          return
        } catch { /* ignore parse errors */ }
      }
    }

    setLoading(true)
    setError(null)
    setFromCache(false)
    
    try {
      const result = await generatePredictiveAnalytics(entityId || '')
      if (result.error) {
        setError(result.error)
      } else if (result.predictions) {
        setPrediction(result.predictions)
        // Cache the results
        saveToCache(cacheKey, JSON.stringify(result.predictions))
      }
    } catch (err) {
      setError('Failed to generate prediction')
    } finally {
      setLoading(false)
    }
  }, [entityId, cacheKey])

  // Auto-generate on mount
  useEffect(() => {
    if (autoGenerate && !prediction && !loading) {
      generatePrediction()
    }
  }, [autoGenerate])

  const getTrendIcon = (trend?: string) => {
    if (trend === 'improving') return <TrendingUp className="h-5 w-5 text-green-600" />
    if (trend === 'declining') return <TrendingDown className="h-5 w-5 text-red-600" />
    return <Minus className="h-5 w-5 text-gray-600" />
  }

  return (
    <Card className={`border-indigo-200 dark:border-indigo-800 ${className}`}>
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-indigo-600" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {prediction && (
            <div className="flex items-center gap-2">
              {fromCache && (
                <Badge variant="outline" className="text-xs gap-1">
                  <History className="h-3 w-3" />
                  Cached
                </Badge>
              )}
              <Badge variant="secondary" className="gap-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                <Sparkles className="h-3 w-3" />
                AI
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {!prediction && !loading && !autoGenerate && (
          <div className="text-center py-6">
            <Target className="h-10 w-10 mx-auto text-indigo-300 mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              Generate a forecast of future performance based on historical data.
            </p>
            <Button onClick={() => generatePrediction()} variant="outline" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Generate Prediction
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-6 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            <p className="text-sm text-muted-foreground">Analyzing trends and generating forecast...</p>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {prediction && !loading && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground">Predicted Score</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {prediction.predictedScore || '—'}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground">Trend</p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  {getTrendIcon(prediction.trend)}
                  <span className="text-sm font-medium capitalize">{prediction.trend || 'stable'}</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground">Confidence</p>
                <p className="text-lg font-bold">{prediction.confidence || 0}%</p>
              </div>
            </div>
            {prediction.insight && (
              <div className="rounded-lg border p-3 bg-muted/30">
                <MarkdownRenderer content={prediction.insight} />
              </div>
            )}
            <div className="flex items-center gap-2 pt-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => generatePrediction(true)}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Regenerate
              </Button>
              {fromCache && (
                <span className="text-xs text-muted-foreground">
                  Showing cached result
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface AIComparativeAnalysisProps {
  type: 'schools' | 'regions' | 'categories'
  entityIds: string[]
  periodId?: string
  title?: string
  description?: string
  className?: string
}

/**
 * AIComparativeAnalysis - Compare entities with AI insights
 */
export function AIComparativeAnalysis({
  type,
  entityIds,
  periodId,
  title = "Comparative Analysis",
  description = "AI-powered comparison insights",
  className = ""
}: AIComparativeAnalysisProps) {
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateAnalysis = async () => {
    setLoading(true)
    setError(null)
    try {
      // Use getCohortAnalysis for comparisons - requires a schoolId
      const criteriaType = type === 'regions' ? 'region' : 'score'
      const result = await getCohortAnalysis(entityIds[0], criteriaType as 'score' | 'region' | 'size')
      if (result.error) {
        setError(result.error)
      } else {
        setAnalysis(result.insights || null)
      }
    } catch (err) {
      setError('Failed to generate comparative analysis')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className={`border-teal-200 dark:border-teal-800 ${className}`}>
      <CardHeader className="bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5 text-teal-600" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        {!analysis && !loading && (
          <div className="text-center py-6">
            <BarChart3 className="h-10 w-10 mx-auto text-teal-300 mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              Generate a detailed comparison with AI-powered insights.
            </p>
            <Button onClick={generateAnalysis} variant="outline" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Generate Comparison
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-6 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
            <p className="text-sm text-muted-foreground">Comparing and analyzing data...</p>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {analysis && !loading && (
          <div className="space-y-4">
            <div className="max-h-[300px] overflow-y-auto rounded-lg border p-4 bg-muted/30">
              <MarkdownRenderer content={analysis} />
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={generateAnalysis}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Regenerate
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface AIActionPlanCardProps {
  schoolId: string
  reportId: string
  schoolName?: string
  className?: string
}

/**
 * AIActionPlanCard - AI-generated improvement action plan
 */
export function AIActionPlanCard({
  schoolId,
  reportId,
  schoolName = "School",
  className = ""
}: AIActionPlanCardProps) {
  const [plan, setPlan] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generatePlan = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await generateImprovementPlan(schoolId, reportId)
      if (result.error) {
        setError(result.error)
      } else {
        setPlan(result.insight || null)
      }
    } catch (err) {
      setError('Failed to generate action plan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className={`border-green-200 dark:border-green-800 ${className}`}>
      <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BookOpen className="h-5 w-5 text-green-600" />
          AI Improvement Plan
          <span className="text-sm font-normal text-muted-foreground">for {schoolName}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {!plan && !loading && (
          <div className="text-center py-6">
            <BookOpen className="h-10 w-10 mx-auto text-green-300 mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              Generate a comprehensive improvement plan tailored to this school's needs.
            </p>
            <Button onClick={generatePlan} className="gap-2 bg-green-600 hover:bg-green-700">
              <Sparkles className="h-4 w-4" />
              Generate Action Plan
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-6 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-green-600" />
            <p className="text-sm text-muted-foreground">Creating personalized improvement plan...</p>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {plan && !loading && (
          <div className="space-y-4">
            <div className="max-h-[400px] overflow-y-auto rounded-lg border p-4 bg-muted/30">
              <MarkdownRenderer content={plan} />
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={generatePlan}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Regenerate Plan
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
