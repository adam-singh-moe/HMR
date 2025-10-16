"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Loader2, Sparkles, Brain, TrendingUp, AlertCircle, Lightbulb, FileText, Zap } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { generateAIInsight, getAISuggestedPrompts, getAvailableSchools } from "@/app/actions/ai-insights"

interface School {
  id: string
  name: string
  region: string
}

export default function AIReportsPage() {
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
    { value: "finance", label: "Finance Analysis" },
    { value: "physical-education", label: "Physical Education Analysis" },
    { value: "general-overview", label: "General Overview" },
    { value: "challenges-analysis", label: "Challenges Analysis" },
    { value: "trends-forecasting", label: "Trends & Forecasting" }
  ]

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
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
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive"
        })
      } else {
        setSchools(result.schools)
      }
    } catch (error) {
      console.error("Error loading schools:", error)
    }
  }

  const loadSuggestedPrompts = async (category: string) => {
    try {
      setIsLoadingPrompts(true)
      const result = await getAISuggestedPrompts(category)
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive"
        })
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
        title: "Prompt Required",
        description: "Please enter a prompt or select a suggested one.",
        variant: "destructive"
      })
      return
    }

    try {
      setIsGenerating(true)
      setAiInsight("")

      const filters = {
        month: selectedMonth !== "all" ? selectedMonth : undefined,
        year: selectedYear !== "all" ? selectedYear : undefined,
        schoolId: selectedSchool !== "all" ? selectedSchool : undefined
      }

      const result = await generateAIInsight(customPrompt, selectedReportType, filters)

      if (result.error) {
        toast({
          title: "Error Generating Insight",
          description: result.error,
          variant: "destructive"
        })
      } else {
        setAiInsight(result.insight || "")
        toast({
          title: "AI Insight Generated",
          description: "Your AI analysis is ready!",
        })
      }
    } catch (error) {
      console.error("Error generating AI insight:", error)
      toast({
        title: "Error",
        description: "Failed to generate AI insight. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePromptSelect = (prompt: string) => {
    setCustomPrompt(prompt)
  }

  const getCurrentYear = () => new Date().getFullYear()
  const getAvailableYears = () => {
    const currentYear = getCurrentYear()
    return Array.from({ length: 5 }, (_, i) => currentYear - i)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI-Powered Report Insights</h1>
          <p className="text-muted-foreground">Generate intelligent analysis and insights from educational reports using AI</p>
        </div>
        {/* <Badge variant="secondary" className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Powered by Gemini AI
        </Badge> */}
      </div>

      <div className="relative">
        {/* Coming Soon Overlay */}
        <div className="absolute inset-0 bg-gray-500/30 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-lg">
          <Card className="max-w-md w-full mx-4 shadow-xl bg-white/95 backdrop-blur-sm">
            <CardContent className="pt-8 pb-8">
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-blue-50 rounded-full">
                    <Sparkles className="h-8 w-8 text-blue-500" />
                  </div>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-3">Coming Soon</h2>
                <p className="text-gray-600 mb-4 text-sm">
                  AI-Powered Report Insights are currently under development. This feature will provide intelligent analysis from your educational reports.
                </p>
                {/* <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                  <Zap className="h-3 w-3" />
                  <span>Powered by Gemini AI</span>
                </div> */}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Analysis Configuration
                </CardTitle>
              </CardHeader>
            <CardContent className="space-y-4">
              {/* Report Type Selection */}
              <div>
                <label className="text-sm font-medium mb-2 block">Report Type</label>
                <Select value={selectedReportType} onValueChange={setSelectedReportType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {reportTypes.map((type) => {
                      const Icon = type.icon
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">Month</label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Months</SelectItem>
                      {monthNames.map((month, index) => (
                        <SelectItem key={index + 1} value={(index + 1).toString()}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Year</label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {getAvailableYears().map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Specific School (Optional)</label>
                <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Schools</SelectItem>
                    {schools.map((school) => (
                      <SelectItem key={school.id} value={school.id}>
                        {school.name} ({school.region})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Suggested Prompts */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Suggested Prompts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingPrompts ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : (
                <div className="space-y-2">
                  {suggestedPrompts.map((prompt, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      size="sm"
                      className="h-auto p-3 text-left justify-start whitespace-normal"
                      onClick={() => handlePromptSelect(prompt)}
                    >
                      <Zap className="h-3 w-3 mr-2 flex-shrink-0 mt-0.5" />
                      {prompt}
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Custom Prompt Input */}
          <Card>
            <CardHeader>
              <CardTitle>Analysis Request</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Textarea
                  placeholder="Enter your analysis request here, or select from suggested prompts..."
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <Button 
                  onClick={handleGenerateInsight}
                  disabled={isGenerating || !customPrompt.trim()}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating AI Insight...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate AI Insight
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* AI Insight Results */}
          {(aiInsight || isGenerating) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI Analysis Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isGenerating ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                      <p className="text-muted-foreground">AI is analyzing your report data...</p>
                    </div>
                  </div>
                ) : aiInsight ? (
                  <div className="prose prose-sm max-w-none">
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                        {aiInsight}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No insights generated yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Info Card */}
          {!aiInsight && !isGenerating && (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-blue-600 mt-1" />
                  <div>
                    <h3 className="font-medium text-blue-900 mb-1">How to Use AI Insights</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Select a report type and configure filters for your analysis</li>
                      <li>• Choose from suggested prompts or create your own custom analysis request</li>
                      <li>• Click "Generate AI Insight" to get intelligent analysis of your educational data</li>
                      <li>• Use insights to identify trends, challenges, and opportunities for improvement</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          </div>
        </div>
      </div>
    </div>
  )
}