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
  const [selectedReportType, setSelectedReportType] = useState("physical-education")
  const [selectedMonth, setSelectedMonth] = useState("all")
  const [selectedYear, setSelectedYear] = useState("all") 
  const [selectedSchool, setSelectedSchool] = useState("all")
  const [customPrompt, setCustomPrompt] = useState("")
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([])
  const [aiInsight, setAiInsight] = useState<string>("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [schools, setSchools] = useState<School[]>([])
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false)
  const [showFullInsight, setShowFullInsight] = useState(false)
  const [isExportingPDF, setIsExportingPDF] = useState(false)

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
    if (selectedReportType) {
      loadSuggestedPrompts(selectedReportType)
    }
  }, [selectedReportType])

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

  const handleGenerateInsight = async () => {
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
        schoolId: selectedSchool !== "all" ? selectedSchool : undefined
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
        toast({
          title: "Success",
          description: "AI insight generated successfully!",
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

  // Generate a summary of the AI insight
  const generateSummary = (text: string) => {
    if (!text) return ""

    // Split the text into sections
    const lines = text.split('\n').filter(line => line.trim())
    
    // Find key sections
    const summary = []
    let foundSummary = false
    let foundKeyFindings = false
    let foundRecommendations = false
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // Look for summary/executive summary
      if (line.toLowerCase().includes('summary') && !foundSummary) {
        foundSummary = true
        if (i + 1 < lines.length) {
          summary.push(`**Summary:** ${lines[i + 1].trim()}`)
        }
        continue
      }
      
      // Look for key findings
      if ((line.toLowerCase().includes('key finding') || line.toLowerCase().includes('finding')) && !foundKeyFindings) {
        foundKeyFindings = true
        // Get the next few bullet points or important lines
        for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
          const nextLine = lines[j].trim()
          if (nextLine.startsWith('*') || nextLine.startsWith('-')) {
            summary.push(nextLine)
            break
          }
        }
        continue
      }
      
      // Look for recommendations
      if (line.toLowerCase().includes('recommendation') && !foundRecommendations) {
        foundRecommendations = true
        if (i + 1 < lines.length) {
          summary.push(`**Key Recommendation:** ${lines[i + 1].trim()}`)
        }
        continue
      }
    }
    
    // If no structured summary found, take first meaningful paragraph
    if (summary.length === 0) {
      const paragraphs = text.split('\n\n').filter(p => p.trim().length > 50)
      if (paragraphs.length > 0) {
        // Take first substantial paragraph and limit to ~200 characters
        let firstParagraph = paragraphs[0].replace(/\*+/g, '').trim()
        if (firstParagraph.length > 200) {
          firstParagraph = firstParagraph.substring(0, 200) + "..."
        }
        summary.push(firstParagraph)
      }
    }
    
    return summary.length > 0 ? summary.join('\n\n') : "Analysis completed. Click 'View Details' for full insights."
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
          <h1 className="text-xl sm:text-2xl font-bold text-blue-600 flex items-center gap-2">
            <Brain className="h-5 w-5 sm:h-6 sm:w-6" />
            AI Insights - {user?.region_name || 'Your Region'}
          </h1>
          <p className="text-gray-600 text-sm sm:text-base mt-1">
            Generate intelligent insights and analysis from your region's education data
          </p>
        </div>
      </div>

      {/* Development Notice */}
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Beta Feature:</strong> AI Insights is currently in development. Feel free to try it out and provide feedback to help us improve this feature.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Panel - Controls */}
        <div className="lg:col-span-5 space-y-6">
          {/* Filters Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Zap className="h-5 w-5 text-blue-600" />
                Analysis Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Report Type Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Report Type</label>
                <Select value={selectedReportType} onValueChange={setSelectedReportType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select report type" />
                  </SelectTrigger>
                  <SelectContent>
                    {reportTypes.map((type) => {
                      const IconComponent = type.icon
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <IconComponent className="h-4 w-4" />
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
                  <label className="text-sm font-medium">Month</label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger>
                      <SelectValue placeholder="All months" />
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
                  <label className="text-sm font-medium">Year</label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger>
                      <SelectValue placeholder="All years" />
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

              {/* School Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">School (Optional)</label>
                <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                  <SelectTrigger>
                    <SelectValue placeholder="All schools in your region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Schools in {user?.region_name || 'Your Region'}</SelectItem>
                    {schools.map((school) => (
                      <SelectItem key={school.id} value={school.id}>
                        {school.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Suggested Prompts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lightbulb className="h-5 w-5 text-yellow-600" />
                Suggested Prompts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingPrompts ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">Loading suggestions...</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {suggestedPrompts.map((prompt, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="text-left h-auto p-3 w-full justify-start text-sm whitespace-normal break-words leading-relaxed"
                      onClick={() => handlePromptSelect(prompt)}
                    >
                      <span className="text-left whitespace-normal break-words">
                        {prompt}
                      </span>
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Analysis */}
        <div className="lg:col-span-7 space-y-6">
          {/* Custom Prompt */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-purple-600" />
                Your Analysis Request
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  What would you like to analyze about your region's education data?
                </label>
                <Textarea
                  placeholder="e.g., 'What are the attendance trends in my region?', 'Which schools need the most support?', 'Analyze student enrollment patterns'..."
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  className="min-h-[120px] resize-none"
                />
              </div>
              
              <Button
                onClick={handleGenerateInsight}
                disabled={isGenerating || !customPrompt.trim()}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing Data...
                  </>
                ) : (
                  <>
                    <Brain className="mr-2 h-4 w-4" />
                    Generate AI Insight
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* AI Insights Result - Summary View */}
          {aiInsight && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  AI Analysis Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="prose prose-sm max-w-none">
                  <div 
                    className="text-gray-800 leading-relaxed"
                    style={{ fontFamily: 'inherit' }}
                    dangerouslySetInnerHTML={{ __html: formatAIInsight(generateSummary(aiInsight)) }}
                  />
                </div>
                
                <div className="flex gap-2 pt-4 border-t">
                  <Dialog open={showFullInsight} onOpenChange={setShowFullInsight}>
                    <DialogTrigger asChild>
                      <Button variant="default" className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        View Details
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh]">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Brain className="h-5 w-5 text-blue-600" />
                          Complete AI Analysis Results
                        </DialogTitle>
                        <DialogDescription>
                          Detailed insights and recommendations for {user?.region_name || 'your region'}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="max-h-[60vh] overflow-y-auto pr-4">
                        <div className="prose prose-sm max-w-none">
                          <div 
                            className="text-gray-800 leading-relaxed"
                            style={{ fontFamily: 'inherit' }}
                            dangerouslySetInnerHTML={{ __html: formatAIInsight(aiInsight) }}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 pt-4 border-t mt-4">
                        <Button 
                          variant="outline" 
                          onClick={handleExportPDF}
                          disabled={isExportingPDF}
                          className="flex items-center gap-2"
                        >
                          {isExportingPDF ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                          {isExportingPDF ? "Exporting..." : "Export PDF"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => setAiInsight("")}
                    className="flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Clear Results
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Help Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertCircle className="h-5 w-5 text-blue-600" />
                How to Use AI Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-gray-600 space-y-2">
                <p><strong>1. Select Report Type:</strong> Choose the type of data you want to analyze from your region.</p>
                <p><strong>2. Filter Data:</strong> Narrow down by time period and specific schools if needed.</p>
                <p><strong>3. Choose a Prompt:</strong> Use suggested prompts or write your own analysis question.</p>
                <p><strong>4. Generate Insights:</strong> Let AI analyze patterns, trends, and provide actionable recommendations.</p>
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Tip:</strong> Be specific in your questions for better insights. For example, instead of "analyze data", 
                  try "what trends do you see in student attendance over the last 3 months?"
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}