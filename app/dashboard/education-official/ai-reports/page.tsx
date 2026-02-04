"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Loader2, Sparkles, Brain, TrendingUp, AlertCircle, Lightbulb, FileText, Download, Send, RotateCcw, Copy, Check, ShieldX } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { generateAIInsight, getAISuggestedPrompts, getAvailableSchools } from "@/app/actions/ai-insights"
import { AuthWrapper, useAuth } from "@/components/auth-wrapper"
import { usePermissions } from "@/hooks/use-permissions"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface School {
  id: string
  name: string
  region: string
}

export default function EducationOfficialAIInsightsPage() {
  return (
    <AuthWrapper requiredRole="Education Official">
      <EducationOfficialAIInsightsContent />
    </AuthWrapper>
  )
}

function EducationOfficialAIInsightsContent() {
  const { user } = useAuth()
  const { hasPermission, isLoading: permissionsLoading } = usePermissions()
  const canViewAll = hasPermission("ai_insights.View")
  const [selectedReportType, setSelectedReportType] = useState("")
  const [selectedMonth, setSelectedMonth] = useState("")
  const [selectedYear, setSelectedYear] = useState("")
  const [selectedRegion, setSelectedRegion] = useState("all")
  const [customPrompt, setCustomPrompt] = useState("")
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([])
  const [aiInsight, setAiInsight] = useState<string>("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [schools, setSchools] = useState<School[]>([])
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false)
  const [isExportingPDF, setIsExportingPDF] = useState(false)
  const [dailyUsage, setDailyUsage] = useState(0)
  const [lastUsageDate, setLastUsageDate] = useState<string>('')
  const [visualizationData, setVisualizationData] = useState<any>(null)
  const [copied, setCopied] = useState(false)

  const DAILY_LIMIT = 10 // Higher limit for Education Officials
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

  const reportTypes = [
    { value: "student-enrollment", label: "Student Enrollment" },
    { value: "attendance", label: "Attendance Reports" },
    { value: "staffing", label: "Staffing & Vacancies" },
    { value: "staff-development", label: "Staff Development" },
    { value: "supervision", label: "Supervision Reports" },
    { value: "curriculum", label: "Curriculum Monitoring" },
    { value: "finance", label: "Finance Reports" },
    { value: "income-sources", label: "Income Sources" },
    { value: "safety", label: "Safety Reports" },
    { value: "staff-meetings", label: "Staff Meetings" },
    { value: "physical-facilities", label: "Physical Facilities" },
    { value: "resources", label: "Resources Needed" },
    { value: "physical-education", label: "Physical Education" },
    { value: "all-reports", label: "All Reports Combined" }
  ]

  const months = [
    { value: "all", label: "All Months" },
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" }
  ]

  const regions = [
    { value: "all", label: "All Regions" },
    { value: "Region 1", label: "Region 1" },
    { value: "Region 2", label: "Region 2" },
    { value: "Region 3", label: "Region 3" },
    { value: "Region 4", label: "Region 4" },
    { value: "Region 5", label: "Region 5" },
    { value: "Region 6", label: "Region 6" },
    { value: "Region 7", label: "Region 7" },
    { value: "Region 8", label: "Region 8" },
    { value: "Region 9", label: "Region 9" },
    { value: "Region 10", label: "Region 10" }
  ]

  useEffect(() => {
    loadSchools()
  }, [])

  useEffect(() => {
    if (user?.id) {
      loadDailyUsage()
    }
  }, [user?.id])

  useEffect(() => {
    if (selectedReportType) {
      loadSuggestedPrompts(selectedReportType)
    }
  }, [selectedReportType])

  const loadDailyUsage = () => {
    try {
      const today = new Date().toDateString()
      const storedUsage = localStorage.getItem(`ai-insights-usage-edu-official-${user?.id}`)
      const storedDate = localStorage.getItem(`ai-insights-date-edu-official-${user?.id}`)

      if (storedDate === today && storedUsage) {
        setDailyUsage(parseInt(storedUsage, 10))
        setLastUsageDate(today)
      } else {
        setDailyUsage(0)
        setLastUsageDate(today)
        localStorage.setItem(`ai-insights-usage-edu-official-${user?.id}`, '0')
        localStorage.setItem(`ai-insights-date-edu-official-${user?.id}`, today)
      }
    } catch (error) {
      setDailyUsage(0)
    }
  }

  const incrementDailyUsage = () => {
    try {
      const today = new Date().toDateString()
      const newUsage = dailyUsage + 1
      setDailyUsage(newUsage)
      setLastUsageDate(today)
      localStorage.setItem(`ai-insights-usage-edu-official-${user?.id}`, newUsage.toString())
      localStorage.setItem(`ai-insights-date-edu-official-${user?.id}`, today)
    } catch (error) {}
  }

  const getRemainingGenerations = () => Math.max(0, DAILY_LIMIT - dailyUsage)
  const canGenerateInsight = () => dailyUsage < DAILY_LIMIT

  const extractVisualizationData = (insightText: string) => {
    const data = { charts: [] as any[], tables: [] as any[] }
    try {
      const tableRegex = /\|(.*?)\|\s*\n\|([-\s:|]+)\|\s*\n((\|.*?\|\s*\n)*)/gm
      let tableMatch
      while ((tableMatch = tableRegex.exec(insightText)) !== null) {
        const headers = tableMatch[1].split('|').map(h => h.trim()).filter(h => h)
        const rows = tableMatch[3].split('\n').filter(row => row.trim() && row.includes('|'))
          .map(row => row.split('|').map(cell => cell.trim()).filter(cell => cell))
          .filter(row => row.length > 0)
        if (headers.length > 0 && rows.length > 0) {
          data.tables.push({ headers, rows })
        }
      }
      const numberPatterns = [/([^:,\n]+):\s*(\d+(?:\.\d+)?%?)/g]
      for (const pattern of numberPatterns) {
        const matches = [...insightText.matchAll(pattern)]
        if (matches.length >= 2) {
          const chartData = matches.map(match => ({
            name: match[1].trim().substring(0, 15),
            value: parseFloat(match[2].replace('%', ''))
          }))
          data.charts.push({ type: matches.length <= 5 ? 'pie' : 'bar', data: chartData })
          break
        }
      }
    } catch (error) {}
    return data.charts.length > 0 || data.tables.length > 0 ? data : null
  }

  const loadSchools = async () => {
    try {
      const result = await getAvailableSchools()
      if (!result.error) {
        // Load all schools for Education Official (no region filter)
        setSchools(result.schools)
      }
    } catch (error) {}
  }

  const loadSuggestedPrompts = async (category: string) => {
    setIsLoadingPrompts(true)
    try {
      const result = await getAISuggestedPrompts(category)
      if (!result.error) setSuggestedPrompts(result.prompts)
    } catch (error) {}
    finally { setIsLoadingPrompts(false) }
  }

  const isFormValid = () => selectedReportType && selectedMonth && selectedYear && customPrompt.trim() && canGenerateInsight()

  const handleGenerateInsight = async () => {
    if (!canGenerateInsight()) {
      toast({ title: "Daily Limit Reached", description: `You've used all ${DAILY_LIMIT} generations today.`, variant: "destructive" })
      return
    }
    if (!selectedReportType || !selectedMonth || !selectedYear || !customPrompt.trim()) {
      toast({ title: "Missing Information", description: "Please fill in all fields.", variant: "destructive" })
      return
    }

    setIsGenerating(true)
    setAiInsight("")
    setVisualizationData(null)

    try {
      const filters = {
        month: selectedMonth !== "all" ? selectedMonth : undefined,
        year: selectedYear !== "all" ? selectedYear : undefined,
        region: selectedRegion !== "all" ? selectedRegion : undefined, // Optional region filter
      }

      // Use API route instead of server action for better timeout handling on Netlify
      const response = await fetch("/api/ai-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: customPrompt,
          reportType: selectedReportType,
          filters
        })
      })

      const result = await response.json()

      if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" })
      } else if (result.insight) {
        setAiInsight(result.insight)
        setVisualizationData(extractVisualizationData(result.insight))
        incrementDailyUsage()
        toast({ title: "Analysis Complete", description: `${getRemainingGenerations() - 1} generations remaining.` })
      } else {
        toast({ title: "No Results", description: "No insights could be generated.", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" })
    } finally {
      setIsGenerating(false)
    }
  }

  const formatAIInsight = (text: string) => {
    if (!text) return text
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-900 dark:text-white">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^## (.*?)$/gm, '<h3 class="text-base font-bold text-slate-900 dark:text-white mt-5 mb-2">$1</h3>')
      .replace(/^### (.*?)$/gm, '<h4 class="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-4 mb-1.5">$1</h4>')
      .replace(/^\* (.*?)$/gm, '<li class="ml-4 mb-1 text-slate-700 dark:text-slate-300 text-sm">$1</li>')
      .replace(/^(\d+)\. (.*?)$/gm, '<li class="ml-4 mb-1 list-decimal text-slate-700 dark:text-slate-300 text-sm">$2</li>')
      .replace(/(<li.*?>.*?<\/li>\s*)+/gs, '<ul class="list-disc space-y-0.5 my-2 pl-4">$&</ul>')
      .replace(/\n\n/g, '</p><p class="mb-2 text-slate-700 dark:text-slate-300 text-sm">')
      .replace(/\n/g, ' ')
      .replace(/^/, '<p class="mb-2 text-slate-700 dark:text-slate-300 text-sm">')
      .replace(/$/, '</p>')
      .replace(/<p class="mb-2 text-slate-700 dark:text-slate-300 text-sm"><\/p>/g, '')
  }

  const renderChart = (chart: any, index: number) => {
    if (chart.type === 'pie') {
      return (
        <div key={index} className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chart.data} cx="50%" cy="50%" outerRadius={60} dataKey="value" label={({name, percent}) => `${(percent * 100).toFixed(0)}%`} fontSize={10}>
                {chart.data.map((entry: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: 'hsl(222, 47%, 11%)', border: '1px solid hsl(222, 47%, 20%)', borderRadius: '6px', fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )
    }
    return (
      <div key={index} className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart.data}>
            <CartesianGrid strokeDasharray="3 3" className="text-slate-700" />
            <XAxis dataKey="name" fontSize={10} />
            <YAxis fontSize={10} />
            <Tooltip contentStyle={{ backgroundColor: 'hsl(222, 47%, 11%)', border: '1px solid hsl(222, 47%, 20%)', borderRadius: '6px', fontSize: '11px' }} />
            <Bar dataKey="value" fill="#6366f1" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  const handleExportPDF = async () => {
    if (!aiInsight.trim()) return
    setIsExportingPDF(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      let currentY = 20
      const margin = 20
      const maxWidth = pageWidth - margin * 2

      pdf.setFontSize(18)
      pdf.setFont(undefined, 'bold')
      pdf.text('AI Insights Report - Education Official', pageWidth / 2, currentY, { align: 'center' })
      currentY += 12

      pdf.setFontSize(10)
      pdf.setFont(undefined, 'normal')
      pdf.setTextColor(100)
      const regionText = selectedRegion !== 'all' ? selectedRegion : 'All Regions'
      pdf.text(`${regionText} | ${reportTypes.find(r => r.value === selectedReportType)?.label} | ${new Date().toLocaleDateString()}`, pageWidth / 2, currentY, { align: 'center' })
      currentY += 15

      pdf.setTextColor(40)
      pdf.setFontSize(11)

      const content = aiInsight.replace(/\*\*/g, '').replace(/\*/g, '').replace(/#{1,6}\s*/g, '').replace(/^\s*[-*]\s+/gm, '• ')
      const lines = pdf.splitTextToSize(content, maxWidth)

      for (const line of lines) {
        if (currentY > pageHeight - 20) {
          pdf.addPage()
          currentY = 20
        }
        pdf.text(line, margin, currentY)
        currentY += 5
      }

      pdf.save(`ai-insights-education-official-${new Date().toISOString().split('T')[0]}.pdf`)
      toast({ title: "PDF Exported", description: "Report downloaded successfully." })
    } catch (error) {
      toast({ title: "Export Error", description: "Failed to export PDF.", variant: "destructive" })
    } finally {
      setIsExportingPDF(false)
    }
  }

  const handleCopy = async () => {
    if (!aiInsight) return
    await navigator.clipboard.writeText(aiInsight.replace(/\*\*/g, '').replace(/\*/g, '').replace(/#{1,6}\s*/g, ''))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const allFiltersSelected = selectedReportType && selectedMonth && selectedYear

  // Show loading state while checking permissions
  if (permissionsLoading) {
    return (
      <div className="h-[calc(100vh-120px)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Show access denied if user doesn't have permission
  if (!canViewAll) {
    return (
      <div className="h-[calc(100vh-120px)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <ShieldX className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Access Denied</h2>
          <p className="text-slate-500 dark:text-slate-400">
            You don't have permission to access AI Insights. Please contact your administrator if you believe this is an error.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            AI Insights
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Analyze education data across all regions</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50">
            <Sparkles className="h-3 w-3 mr-1" />Beta
          </Badge>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-[hsl(222,47%,11%)] rounded-lg border border-slate-200 dark:border-slate-700/50">
            <div className={`w-1.5 h-1.5 rounded-full ${getRemainingGenerations() > 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{getRemainingGenerations()}/{DAILY_LIMIT}</span>
          </div>
        </div>
      </div>

      {/* Main Layout - Side by Side */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
        {/* Left Panel - Input */}
        <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border border-slate-200/80 dark:border-slate-700/50 rounded-xl overflow-hidden flex flex-col">
          {/* Filters */}
          <div className="p-4 border-b border-slate-200/80 dark:border-slate-700/50 bg-slate-50 dark:bg-[hsl(222,47%,8%)]">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">Report Type</label>
                <Select value={selectedReportType} onValueChange={setSelectedReportType}>
                  <SelectTrigger className="bg-white dark:bg-[hsl(222,47%,11%)] border-slate-200 dark:border-slate-700/50 h-9 text-sm rounded-lg">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/50 rounded-lg">
                    {reportTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value} className="text-sm">{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">Region</label>
                <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                  <SelectTrigger className="bg-white dark:bg-[hsl(222,47%,11%)] border-slate-200 dark:border-slate-700/50 h-9 text-sm rounded-lg">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/50 rounded-lg">
                    {regions.map((r) => <SelectItem key={r.value} value={r.value} className="text-sm">{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">Month</label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="bg-white dark:bg-[hsl(222,47%,11%)] border-slate-200 dark:border-slate-700/50 h-9 text-sm rounded-lg">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/50 rounded-lg">
                    {months.map((m) => <SelectItem key={m.value} value={m.value} className="text-sm">{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">Year</label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="bg-white dark:bg-[hsl(222,47%,11%)] border-slate-200 dark:border-slate-700/50 h-9 text-sm rounded-lg">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/50 rounded-lg">
                    <SelectItem value="all" className="text-sm">All Years</SelectItem>
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                      <SelectItem key={year} value={year.toString()} className="text-sm">{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Prompt Input */}
          <div className="flex-1 p-4 flex flex-col min-h-0">
            <Textarea
              placeholder="What would you like to know about the education data?"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="flex-1 min-h-[100px] resize-none bg-slate-50 dark:bg-[hsl(222,47%,11%)] border-slate-200 dark:border-slate-700/50 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg text-sm"
            />

            {/* Suggested Prompts */}
            {selectedReportType && suggestedPrompts.length > 0 && (
              <div className="mt-3">
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Lightbulb className="h-3 w-3" />
                  Try these
                </p>
                <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                  {suggestedPrompts.slice(0, 5).map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => setCustomPrompt(prompt)}
                      className="w-full text-left text-xs p-2.5 rounded-lg bg-slate-100 dark:bg-[hsl(222,47%,11%)] hover:bg-violet-100 dark:hover:bg-violet-900/20 border border-slate-200/80 dark:border-slate-700/50 hover:border-violet-300 dark:hover:border-violet-700/50 text-slate-600 dark:text-slate-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors line-clamp-2"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Generate Button */}
            <div className="mt-4 flex gap-2">
              <Button
                onClick={handleGenerateInsight}
                disabled={isGenerating || !isFormValid()}
                className="flex-1 h-10 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-medium rounded-lg disabled:opacity-50"
              >
                {isGenerating ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Analyzing...</>
                ) : (
                  <><Send className="h-4 w-4 mr-2" />Generate</>
                )}
              </Button>
              {customPrompt && (
                <Button variant="outline" onClick={() => setCustomPrompt("")} className="h-10 px-3 border-slate-200 dark:border-slate-700 rounded-lg">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
            </div>

            {!allFiltersSelected && (
              <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Select report type, month, and year to enable generation
              </p>
            )}
          </div>
        </Card>

        {/* Right Panel - Results */}
        <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border border-slate-200/80 dark:border-slate-700/50 rounded-xl overflow-hidden flex flex-col">
          {/* Results Header */}
          <div className="p-3 border-b border-slate-200/80 dark:border-slate-700/50 bg-slate-50 dark:bg-[hsl(222,47%,8%)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Results</span>
            </div>
            {aiInsight && (
              <div className="flex items-center gap-1.5">
                <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 px-2 text-xs">
                  {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                <Button
                  size="sm"
                  onClick={handleExportPDF}
                  disabled={isExportingPDF}
                  className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isExportingPDF ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Download className="h-3 w-3 mr-1" />}
                  PDF
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setAiInsight(""); setVisualizationData(null) }} className="h-7 px-2 text-xs text-slate-500 hover:text-red-500">
                  Clear
                </Button>
              </div>
            )}
          </div>

          {/* Results Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {isGenerating ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/30 dark:to-indigo-900/30 flex items-center justify-center mb-3">
                  <Loader2 className="h-6 w-6 text-violet-600 dark:text-violet-400 animate-spin" />
                </div>
                <p className="font-medium text-slate-700 dark:text-slate-300 text-sm">Analyzing education data...</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">This may take a moment</p>
              </div>
            ) : aiInsight ? (
              <div>
                {/* Charts */}
                {visualizationData?.charts?.map((chart: any, i: number) => (
                  <div key={i} className="mb-4 p-3 bg-slate-50 dark:bg-[hsl(222,47%,11%)] rounded-lg border border-slate-200/80 dark:border-slate-700/50">
                    {renderChart(chart, i)}
                  </div>
                ))}

                {/* Tables */}
                {visualizationData?.tables?.map((table: any, i: number) => (
                  <div key={i} className="mb-4 overflow-x-auto rounded-lg border border-slate-200/80 dark:border-slate-700/50">
                    <Table>
                      <TableHeader className="bg-slate-50 dark:bg-[hsl(222,47%,8%)]">
                        <TableRow>
                          {table.headers.map((h: string, j: number) => (
                            <TableHead key={j} className="text-[11px] uppercase tracking-wider font-semibold">{h}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {table.rows.map((row: string[], j: number) => (
                          <TableRow key={j}>
                            {row.map((cell: string, k: number) => (
                              <TableCell key={k} className="text-xs">{cell}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}

                {/* Text Content */}
                <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: formatAIInsight(aiInsight) }} />
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                  <Brain className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                </div>
                <p className="font-medium text-slate-600 dark:text-slate-400 text-sm">No results yet</p>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1 max-w-[200px]">
                  Configure filters and ask a question to generate insights
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
