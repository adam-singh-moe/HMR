"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Sparkles, Brain, TrendingUp, AlertCircle, Lightbulb, FileText, Zap, Eye, X, Download, Info } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { generateAIInsight, getAISuggestedPrompts, getAvailableSchools } from "@/app/actions/ai-insights"
import { AuthWrapper, useAuth } from "@/components/auth-wrapper"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface School {
  id: string
  name: string
  region: string
}

export default function RegionalAIInsightsPage() {
  return (
    <AuthWrapper requiredRole="Regional Officer">
      <RegionalAIInsightsContent />
    </AuthWrapper>
  )
}

// Export the content component for use in tabs
export { RegionalAIInsightsContent }

function RegionalAIInsightsContent() {
  const { user } = useAuth()
  const [selectedReportType, setSelectedReportType] = useState("")
  const [selectedMonth, setSelectedMonth] = useState("")
  const [selectedYear, setSelectedYear] = useState("") 
  const [customPrompt, setCustomPrompt] = useState("")
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([])
  const [aiInsight, setAiInsight] = useState<string>("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [schools, setSchools] = useState<School[]>([])
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false)
  const [showFullInsight, setShowFullInsight] = useState(false)
  const [isExportingPDF, setIsExportingPDF] = useState(false)
  const [dailyUsage, setDailyUsage] = useState(0)
  const [lastUsageDate, setLastUsageDate] = useState<string>('')
  const [visualizationData, setVisualizationData] = useState<any>(null)

  const DAILY_LIMIT = 5
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

  const reportTypes = [
    { value: "student-enrollment", label: "Student Enrollment", icon: FileText },
    { value: "attendance", label: "Attendance Reports", icon: TrendingUp },
    { value: "staffing", label: "Staffing & Vacancies", icon: FileText },
    { value: "staff-development", label: "Staff Development", icon: FileText },
    { value: "supervision", label: "Supervision Reports", icon: FileText },
    { value: "curriculum", label: "Curriculum Monitoring", icon: FileText },
    { value: "finance", label: "Finance Reports", icon: FileText },
    { value: "income-sources", label: "Income Sources", icon: FileText },
    { value: "safety", label: "Safety Reports", icon: AlertCircle },
    { value: "staff-meetings", label: "Staff Meetings", icon: FileText },
    { value: "physical-facilities", label: "Physical Facilities", icon: FileText },
    { value: "resources", label: "Resources Needed", icon: FileText },
    { value: "physical-education", label: "Physical Education", icon: TrendingUp },
    { value: "all-reports", label: "All Reports Combined", icon: Brain }
  ]

  const promptCategories = [
    { value: "student-enrollment", label: "Student Enrollment Analysis" },
    { value: "attendance", label: "Attendance Analysis" },
    { value: "staffing", label: "Staffing Analysis" },
    { value: "staff-development", label: "Staff Development Analysis" },
    { value: "supervision", label: "Supervision Analysis" },
    { value: "curriculum", label: "Curriculum Analysis" },
    { value: "finance", label: "Financial Analysis" },
    { value: "income-sources", label: "Income Analysis" },
    { value: "safety", label: "Safety Analysis" },
    { value: "staff-meetings", label: "Staff Meetings Analysis" },
    { value: "physical-facilities", label: "Facilities Analysis" },
    { value: "resources", label: "Resources Analysis" },
    { value: "physical-education", label: "Physical Education Analysis" },
    { value: "trends", label: "Trend Analysis" },
    { value: "recommendations", label: "Recommendations & Action Items" }
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
      const storedUsage = localStorage.getItem(`ai-insights-usage-${user?.id}`)
      const storedDate = localStorage.getItem(`ai-insights-date-${user?.id}`)
      
      if (storedDate === today && storedUsage) {
        setDailyUsage(parseInt(storedUsage, 10))
        setLastUsageDate(today)
      } else {
        // Reset usage for new day
        setDailyUsage(0)
        setLastUsageDate(today)
        localStorage.setItem(`ai-insights-usage-${user?.id}`, '0')
        localStorage.setItem(`ai-insights-date-${user?.id}`, today)
      }
    } catch (error) {
      // Silent fail - usage tracking is not critical
      setDailyUsage(0)
    }
  }

  const incrementDailyUsage = () => {
    try {
      const today = new Date().toDateString()
      const newUsage = dailyUsage + 1
      
      setDailyUsage(newUsage)
      setLastUsageDate(today)
      
      localStorage.setItem(`ai-insights-usage-${user?.id}`, newUsage.toString())
      localStorage.setItem(`ai-insights-date-${user?.id}`, today)
    } catch (error) {
      // Silent fail - usage tracking is not critical
    }
  }

  const getRemainingGenerations = () => {
    return Math.max(0, DAILY_LIMIT - dailyUsage)
  }

  const canGenerateInsight = () => {
    return dailyUsage < DAILY_LIMIT
  }

  // Extract visualization data from AI insight text
  const extractVisualizationData = (insightText: string) => {
    const data = {
      charts: [] as any[],
      tables: [] as any[]
    }

    try {
      // Look for data patterns in the text that could be visualized
      // This is a simplified implementation - you can expand based on your AI response format
      
      // Extract tables from markdown-style tables
      const tableRegex = /\|(.*?)\|\s*\n\|([-\s:|]+)\|\s*\n((\|.*?\|\s*\n)*)/gm
      let tableMatch
      while ((tableMatch = tableRegex.exec(insightText)) !== null) {
        const headers = tableMatch[1].split('|').map(h => h.trim()).filter(h => h)
        const rows = tableMatch[3].split('\n').filter(row => row.trim() && row.includes('|'))
          .map(row => row.split('|').map(cell => cell.trim()).filter(cell => cell))
          .filter(row => row.length > 0)
        
        if (headers.length > 0 && rows.length > 0) {
          data.tables.push({
            headers,
            rows
          })
        }
      }

      // Extract data that could be charted (numbers with labels)
      const numberPatterns = [
        // Pattern: "School A: 85%, School B: 92%" etc.
        /([^:,\n]+):\s*(\d+(?:\.\d+)?%?)/g,
        // Pattern: "January: 150, February: 200" etc.
        /([A-Za-z]+):\s*(\d+(?:\.\d+)?)/g
      ]

      for (const pattern of numberPatterns) {
        const matches = [...insightText.matchAll(pattern)]
        if (matches.length >= 2) {
          const chartData = matches.map(match => ({
            name: match[1].trim(),
            value: parseFloat(match[2].replace('%', ''))
          }))
          
          // Determine chart type based on data
          const chartType = matches.length <= 5 ? 'pie' : 'bar'
          
          data.charts.push({
            type: chartType,
            title: 'Data Visualization',
            data: chartData
          })
          break // Only take the first good match to avoid duplicates
        }
      }
    } catch (error) {
      console.warn('Error extracting visualization data:', error)
    }

    return data.charts.length > 0 || data.tables.length > 0 ? data : null
  }

  const loadSchools = async () => {
    try {
      const result = await getAvailableSchools()
      if (result.error) {
        console.error("Error loading schools:", result.error)
        toast({
          title: "Error",
          description: "Failed to load available schools.",
          variant: "destructive",
        })
      } else {
        // For regional officers, filter schools by their region
        const regionSchools = result.schools.filter(school => 
          school.region === user?.region_name
        )
        setSchools(regionSchools)
      }
    } catch (error) {
      console.error("Error loading schools:", error)
    }
  }

  const loadSuggestedPrompts = async (category: string) => {
    setIsLoadingPrompts(true)
    try {
      const result = await getAISuggestedPrompts(category)
      if (result.error) {
        console.error("Error loading prompts:", result.error)
      } else {
        setSuggestedPrompts(result.prompts)
      }
    } catch (error) {
      console.error("Error loading suggested prompts:", error)
    } finally {
      setIsLoadingPrompts(false)
    }
  }

  const isFormValid = () => {
    return selectedReportType && selectedMonth && selectedYear && customPrompt.trim() && canGenerateInsight()
  }

  const handleGenerateInsight = async () => {
    if (!canGenerateInsight()) {
      toast({
        title: "Daily Limit Reached",
        description: `You've reached your daily limit of ${DAILY_LIMIT} AI insight generations. Please try again tomorrow.`,
        variant: "destructive",
      })
      return
    }

    if (!selectedReportType) {
      toast({
        title: "Error",
        description: "Please select a report type.",
        variant: "destructive",
      })
      return
    }

    if (!selectedMonth) {
      toast({
        title: "Error",
        description: "Please select a month.",
        variant: "destructive",
      })
      return
    }

    if (!selectedYear) {
      toast({
        title: "Error",
        description: "Please select a year.",
        variant: "destructive",
      })
      return
    }

    if (!customPrompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a prompt for AI analysis.",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)
    setAiInsight("")

    try {
      const filters = {
        month: selectedMonth !== "all" ? selectedMonth : undefined,
        year: selectedYear !== "all" ? selectedYear : undefined,
        region: user?.region_name, // Always filter by regional officer's region
        // School filter removed - analyze all schools in the region
      }

      const result = await generateAIInsight(customPrompt, selectedReportType, filters)

      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      } else if (result.insight) {
        setAiInsight(result.insight)
        const vizData = extractVisualizationData(result.insight)
        setVisualizationData(vizData)
        incrementDailyUsage() // Track successful generation
        toast({
          title: "Success",
          description: `AI insight generated successfully! ${getRemainingGenerations()} generations remaining today.`,
        })
      } else {
        toast({
          title: "No Results",
          description: "No insights could be generated for the selected criteria.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error generating AI insight:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred while generating insights.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePromptSelect = (prompt: string) => {
    setCustomPrompt(prompt)
  }

  // Simple markdown-to-HTML converter for AI insights
  const formatAIInsight = (text: string) => {
    if (!text) return text

    let formattedText = text
      // Convert **bold** to <strong>
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Convert *italic* to <em>
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Convert ## Headers to <h3> with proper spacing
      .replace(/^## (.*?)$/gm, '<h3 class="text-lg font-bold text-gray-900 mt-6 mb-3 first:mt-0">$1</h3>')
      // Convert ### Headers to <h4> with proper spacing
      .replace(/^### (.*?)$/gm, '<h4 class="text-base font-semibold text-gray-800 mt-5 mb-2">$1</h4>')
      // Convert bullet points with proper spacing
      .replace(/^\* (.*?)$/gm, '<li class="ml-4 mb-1">$1</li>')
      // Convert numbered lists with proper spacing
      .replace(/^(\d+)\. (.*?)$/gm, '<li class="ml-4 mb-1 list-decimal">$2</li>')
      // Wrap consecutive <li> elements in <ul> with proper spacing
      .replace(/(<li.*?>.*?<\/li>\s*)+/gs, '<ul class="list-disc space-y-1 my-3 pl-4">$&</ul>')
      // Handle paragraphs - convert double line breaks to paragraph breaks
      .replace(/\n\n/g, '</p><p class="mb-3">')
      // Convert remaining single line breaks to spaces (within paragraphs)
      .replace(/\n/g, ' ')
      // Wrap everything in paragraph tags and clean up
      .replace(/^/, '<p class="mb-3">')
      .replace(/$/, '</p>')
      // Clean up empty paragraphs and fix paragraph breaks around headers
      .replace(/<p class="mb-3"><\/p>/g, '')
      .replace(/<\/p><p class="mb-3">(<h[3-4])/g, '$1')
      .replace(/(<\/h[3-4]>)<p class="mb-3">/g, '$1')
      // Fix spacing around lists
      .replace(/<\/p><p class="mb-3">(<ul)/g, '$1')
      .replace(/(<\/ul>)<p class="mb-3">/g, '$1<p class="mb-3 mt-3">')

    return formattedText
  }

  const renderChart = (chart: any, index: number) => {
    switch (chart.type) {
      case 'bar':
        return (
          <div key={index} className="mb-6">
            <h4 className="text-md font-semibold mb-3 text-gray-800">{chart.title}</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chart.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip 
                  formatter={(value, name) => [value, name]}
                  labelFormatter={(label) => `${label}`}
                />
                <Bar dataKey="value" fill="#0088FE" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )
      
      case 'line':
        return (
          <div key={index} className="mb-6">
            <h4 className="text-md font-semibold mb-3 text-gray-800">{chart.title}</h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chart.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip 
                  formatter={(value, name) => [value, name]}
                  labelFormatter={(label) => `${label}`}
                />
                <Line type="monotone" dataKey="value" stroke="#00C49F" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )
      
      case 'pie':
        return (
          <div key={index} className="mb-6">
            <h4 className="text-md font-semibold mb-3 text-gray-800">{chart.title}</h4>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chart.data}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {chart.data.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )
      
      default:
        return null
    }
  }

  const renderTable = (table: any, index: number) => {
    return (
      <div key={index} className="mb-6">
        <h4 className="text-md font-semibold mb-3 text-gray-800">Data Summary</h4>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                {table.headers.map((header: string, i: number) => (
                  <TableHead key={i} className="font-medium">{header}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.rows.map((row: string[], i: number) => (
                <TableRow key={i}>
                  {row.map((cell: string, j: number) => (
                    <TableCell key={j}>{cell}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  // Generate a brief summary of the AI insight
  const generateSummary = (text: string) => {
    if (!text) return ""

    // Count basic elements in the report to generate a descriptive summary
    const lines = text.split('\n').filter(line => line.trim())
    const sections = text.split('##').length - 1
    const hasCharts = text.toLowerCase().includes('chart') || text.toLowerCase().includes('graph')
    const hasTables = text.includes('|') && text.includes('---')
    const hasRecommendations = text.toLowerCase().includes('recommendation')
    const hasData = /\d+/.test(text)

    // Determine report type based on content
    let reportType = selectedReportType || "analysis"
    const reportTypeLabels: Record<string, string> = {
      "student-enrollment": "Student Enrollment Analysis",
      "nursery-assessment": "Nursery Assessment Analysis", 
      "regional-pe": "Physical Education Analysis",
      "trends": "Trend Analysis",
      "recommendations": "Recommendations & Action Items"
    }
    
    const reportLabel = reportTypeLabels[reportType] || "Educational Data Analysis"
    
    // Build summary components
    const summaryParts = []
    
    // Basic description
    summaryParts.push(`This ${reportLabel.toLowerCase()} has been generated for ${selectedMonth} ${selectedYear}.`)
    
    // Content description
    const contentFeatures = []
    if (sections > 0) contentFeatures.push(`${sections} main sections`)
    if (hasData) contentFeatures.push("statistical data")
    if (hasCharts) contentFeatures.push("visualizations")
    if (hasTables) contentFeatures.push("data tables")
    if (hasRecommendations) contentFeatures.push("actionable recommendations")
    
    if (contentFeatures.length > 0) {
      summaryParts.push(`The report includes ${contentFeatures.join(', ')}.`)
    }
    
    // Call to action
    summaryParts.push("Click 'View Details' to see the complete analysis.")
    
    return summaryParts.join(' ')
  }

  // Export AI insights as PDF
  const handleExportPDF = async () => {
    if (!aiInsight.trim()) return

    setIsExportingPDF(true)

    try {
      // Dynamically import jsPDF
      const { default: jsPDF } = await import('jspdf')
      
      // Create a new PDF instance
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })
      
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      let currentY = 20
      const leftMargin = 20
      const rightMargin = 20
      const lineHeight = 6
      const maxWidth = pageWidth - leftMargin - rightMargin
      
      // Helper function to add text with word wrapping
      const addText = (text: string, fontSize: number = 12, isBold: boolean = false) => {
        pdf.setFontSize(fontSize)
        pdf.setFont(undefined, isBold ? 'bold' : 'normal')
        
        // Split text into lines that fit the page width
        const lines = pdf.splitTextToSize(text, maxWidth)
        
        for (const line of lines) {
          // Check if we need a new page
          if (currentY + lineHeight > pageHeight - 20) {
            pdf.addPage()
            currentY = 20
          }
          
          pdf.text(line, leftMargin, currentY)
          currentY += lineHeight
        }
        currentY += 2 // Extra spacing after paragraphs
      }
      
      // Add header
      pdf.setFontSize(20)
      pdf.setFont(undefined, 'bold')
      pdf.setTextColor(40, 40, 40)
      pdf.text('AI Insights Report', pageWidth / 2, currentY, { align: 'center' })
      currentY += 15
      
      // Add region and date information
      pdf.setFontSize(12)
      pdf.setFont(undefined, 'normal')
      pdf.setTextColor(80, 80, 80)
      const dateStr = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
      pdf.text(`Region: ${user?.region_name || 'N/A'}`, leftMargin, currentY)
      currentY += 8
      pdf.text(`Report Type: ${reportTypes.find(rt => rt.value === selectedReportType)?.label || 'N/A'}`, leftMargin, currentY)
      currentY += 8
      pdf.text(`Generated: ${dateStr}`, leftMargin, currentY)
      currentY += 15
      
      // Add content
      pdf.setTextColor(40, 40, 40)
      
      // Convert markdown-style formatting to plain text for PDF
      let pdfContent = aiInsight
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markers
        .replace(/\*(.*?)\*/g, '$1') // Remove italic markers  
        .replace(/#{1,6}\s*/g, '') // Remove header markers
        .replace(/^\s*[-*]\s+/gm, '• ') // Convert list items to bullets
        .replace(/^\s*\d+\.\s+/gm, '') // Remove numbered list numbers
      
      // Split content into paragraphs and sections
      const sections = pdfContent.split(/\n\s*\n/)
      
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i].trim()
        if (!section) continue
        
        // Check if this looks like a heading (short line, often in caps or title case)
        const isHeading = section.length < 60 && 
          (section === section.toUpperCase() || 
           section.split(' ').every(word => word.charAt(0) === word.charAt(0).toUpperCase()))
        
        if (isHeading) {
          currentY += 5 // Extra space before headings
          addText(section, 14, true)
          currentY += 3 // Space after headings
        } else {
          addText(section, 12, false)
          currentY += 3 // Space between paragraphs
        }
      }
      
      // Add footer
      const totalPages = pdf.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i)
        pdf.setFontSize(8)
        pdf.setTextColor(120, 120, 120)
        pdf.text(`Page ${i} of ${totalPages}`, pageWidth - 30, pageHeight - 10)
        pdf.text('Generated by MOEGY HMR System', leftMargin, pageHeight - 10)
      }
      
      // Save the PDF
      const filename = `ai-insights-${user?.region_name?.toLowerCase().replace(/\s+/g, '-') || 'report'}-${new Date().toISOString().split('T')[0]}.pdf`
      pdf.save(filename)
      
      toast({
        title: "PDF Export Successful",
        description: "Your AI insights report has been downloaded.",
      })
      
    } catch (error) {
      console.error('Error exporting PDF:', error)
      toast({
        title: "Export Error",
        description: "Failed to export PDF. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsExportingPDF(false)
    }
  }

  const getCurrentDateFilters = () => {
    const now = new Date()
    const currentYear = now.getFullYear().toString()
    const currentMonth = (now.getMonth() + 1).toString()
    return { currentYear, currentMonth }
  }

  const { currentYear, currentMonth } = getCurrentDateFilters()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
              <Brain className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            AI Insights
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base mt-1">
            Generate intelligent insights and analysis from your region's education data
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 px-3 py-1.5">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            {user?.region_name || 'Your Region'}
          </Badge>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-500 dark:text-slate-400">Usage:</span>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{dailyUsage}/{DAILY_LIMIT}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">({getRemainingGenerations()} left)</span>
          </div>
        </div>
      </div>

      {/* Beta Notice */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
        <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
          <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <span className="font-semibold text-amber-800 dark:text-amber-300">Beta Feature: </span>
          <span className="text-amber-700 dark:text-amber-400">AI Insights is in development. Your feedback helps us improve!</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Panel - Controls */}
        <div className="lg:col-span-5 space-y-5">
          {/* Filters Card */}
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800/80 border-b border-slate-200 dark:border-slate-700 pb-4">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                  <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <span className="text-slate-900 dark:text-white">Analysis Settings</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">Configure your data analysis parameters</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              {/* Report Type Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  Report Type <span className="text-red-500">*</span>
                </label>
                <Select value={selectedReportType} onValueChange={setSelectedReportType}>
                  <SelectTrigger className={`bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 h-11 ${!selectedReportType ? "border-red-300 dark:border-red-800" : ""}`}>
                    <SelectValue placeholder="Select report type to analyze" />
                  </SelectTrigger>
                  <SelectContent>
                    {reportTypes.map((type) => {
                      const IconComponent = type.icon
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <IconComponent className="h-4 w-4 text-slate-500" />
                            {type.label}
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Time Period Filters */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    Month <span className="text-red-500">*</span>
                  </label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className={`bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 h-11 ${!selectedMonth ? "border-red-300 dark:border-red-800" : ""}`}>
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Months</SelectItem>
                      <SelectItem value="1">January</SelectItem>
                      <SelectItem value="2">February</SelectItem>
                      <SelectItem value="3">March</SelectItem>
                      <SelectItem value="4">April</SelectItem>
                      <SelectItem value="5">May</SelectItem>
                      <SelectItem value="6">June</SelectItem>
                      <SelectItem value="7">July</SelectItem>
                      <SelectItem value="8">August</SelectItem>
                      <SelectItem value="9">September</SelectItem>
                      <SelectItem value="10">October</SelectItem>
                      <SelectItem value="11">November</SelectItem>
                      <SelectItem value="12">December</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    Year <span className="text-red-500">*</span>
                  </label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className={`bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 h-11 ${!selectedYear ? "border-red-300 dark:border-red-800" : ""}`}>
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {Array.from({ length: 5 }, (_, i) => {
                        const year = new Date().getFullYear() - i
                        return (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Suggested Prompts */}
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border-b border-slate-200 dark:border-slate-700 pb-4">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
                  <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <span className="text-slate-900 dark:text-white">Suggested Prompts</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">Click to use a ready-made query</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {!selectedReportType ? (
                <div className="text-center py-8 px-4">
                  <div className="p-3 bg-slate-100 dark:bg-slate-700/50 rounded-full w-fit mx-auto mb-3">
                    <Lightbulb className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Select a report type to see suggested prompts</p>
                </div>
              ) : isLoadingPrompts ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-500 mr-2" />
                  <span className="text-sm text-slate-500 dark:text-slate-400">Loading suggestions...</span>
                </div>
              ) : suggestedPrompts.length > 0 ? (
                <div className="space-y-2">
                  {suggestedPrompts.map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => handlePromptSelect(prompt)}
                      className="text-left w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/30 border border-slate-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-700 transition-all group"
                    >
                      <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-blue-700 dark:group-hover:text-blue-300 leading-relaxed">
                        {prompt}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-slate-500 dark:text-slate-400">No prompts available for this report type</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Analysis */}
        <div className="lg:col-span-7 space-y-5">
          {/* Custom Prompt */}
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border-b border-slate-200 dark:border-slate-700 pb-4">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                  <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <span className="text-slate-900 dark:text-white">Your Analysis Request</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">Describe what insights you want to generate</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  What would you like to analyze? <span className="text-red-500">*</span>
                </label>
                <Textarea
                  placeholder="e.g., 'What are the attendance trends in my region?', 'Which schools need the most support?', 'Analyze student enrollment patterns and provide recommendations'..."
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  className="min-h-[140px] resize-none bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl"
                />
              </div>
              
              <Button
                onClick={handleGenerateInsight}
                disabled={isGenerating || !isFormValid()}
                className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Analyzing Your Data...
                  </>
                ) : !canGenerateInsight() ? (
                  <>
                    <AlertCircle className="mr-2 h-5 w-5" />
                    Daily Limit Reached
                  </>
                ) : (
                  <>
                    <Brain className="mr-2 h-5 w-5" />
                    Generate AI Insight
                    <Badge className="ml-2 bg-white/20 text-white border-0 text-xs">
                      {getRemainingGenerations()} left
                    </Badge>
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* AI Insights Result - Summary View */}
          {aiInsight && (
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-xl rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-b border-slate-200 dark:border-slate-700 pb-4">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <span className="text-slate-900 dark:text-white">AI Analysis Results</span>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">Insights generated for your query</p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {/* Render visualizations if available */}
                {visualizationData && (
                  <div className="mb-6">
                    {visualizationData.tables?.map((table: any, index: number) => renderTable(table, index))}
                    {visualizationData.charts?.map((chart: any, index: number) => renderChart(chart, index))}
                  </div>
                )}
                
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <div 
                    className="text-slate-700 dark:text-slate-300 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: formatAIInsight(generateSummary(aiInsight)) }}
                  />
                </div>
                
                <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <Dialog open={showFullInsight} onOpenChange={setShowFullInsight}>
                    <DialogTrigger asChild>
                      <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white">
                        <Eye className="h-4 w-4 mr-2" />
                        View Full Analysis
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[85vh] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                          <Brain className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                          Complete AI Analysis Results
                        </DialogTitle>
                        <DialogDescription className="text-slate-600 dark:text-slate-400">
                          Detailed insights and recommendations for {user?.region_name || 'your region'}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="max-h-[60vh] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
                        {visualizationData && (
                          <div className="mb-6">
                            {visualizationData.tables?.map((table: any, index: number) => renderTable(table, index))}
                            {visualizationData.charts?.map((chart: any, index: number) => renderChart(chart, index))}
                          </div>
                        )}
                        
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          <div 
                            className="text-slate-700 dark:text-slate-300 leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: formatAIInsight(aiInsight) }}
                          />
                        </div>
                      </div>
                      <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700 mt-4">
                        <Button 
                          variant="outline" 
                          onClick={handleExportPDF}
                          disabled={isExportingPDF}
                          className="border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          {isExportingPDF ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Download className="h-4 w-4 mr-2" />
                          )}
                          {isExportingPDF ? "Exporting..." : "Export PDF"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setAiInsight("")
                      setVisualizationData(null)
                    }}
                    className="border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear Results
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={handleExportPDF}
                    disabled={isExportingPDF}
                    className="border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    {isExportingPDF ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Export PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Help Card */}
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-b border-slate-200 dark:border-slate-700 pb-4">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                  <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-slate-900 dark:text-white">How to Use AI Insights</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { step: "1", title: "Select Report Type", desc: "Choose the data category you want to analyze" },
                  { step: "2", title: "Set Time Period", desc: "Filter by specific month and year" },
                  { step: "3", title: "Enter Your Query", desc: "Use a suggested prompt or write your own" },
                  { step: "4", title: "Generate Insights", desc: "Let AI analyze patterns and trends" },
                ].map((item) => (
                  <div key={item.step} className="flex gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{item.step}</span>
                    </div>
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white text-sm">{item.title}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                <div className="flex items-start gap-3">
                  <Lightbulb className="h-5 w-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-indigo-800 dark:text-indigo-300">Pro Tip: </span>
                    <span className="text-indigo-700 dark:text-indigo-400 text-sm">
                      Be specific in your questions! Instead of "analyze data", try "what are the top 3 attendance concerns and how can we address them?"
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
