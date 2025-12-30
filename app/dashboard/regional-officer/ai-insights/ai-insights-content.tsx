"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2, Sparkles, TrendingUp, AlertCircle, CheckCircle2, Info, RefreshCw } from "lucide-react"
import { useAuth } from "@/components/auth-wrapper"
import { getRegionalAIInsights } from "@/app/actions/ai-insights"

interface AIInsight {
  summary: string
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
  trends: {
    metric: string
    direction: 'up' | 'down' | 'stable'
    change: string
  }[]
  performance_score: number
  last_updated: string
}

export function RegionalAIInsightsContent() {
  const { user } = useAuth()
  const [insight, setInsight] = useState<AIInsight | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timeframe, setTimeframe] = useState("current_month")

  useEffect(() => {
    fetchInsights()
  }, [timeframe])

  const fetchInsights = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getRegionalAIInsights(timeframe)
      if (result.error) {
        setError(result.error)
      } else {
        setInsight(result.data as AIInsight)
      }
    } catch (err) {
      console.error("Error fetching AI insights:", err)
      setError("Failed to load AI insights. Please try again later.")
    } finally {
      setIsLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-blue-600"
    if (score >= 40) return "text-yellow-600"
    return "text-red-600"
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Regional AI Insights</h2>
          <p className="text-muted-foreground">
            AI-powered analysis of school performance across {user?.region_name || 'your region'}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current_month">Current Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="last_quarter">Last Quarter</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={fetchInsights} 
            disabled={isLoading}
            title="Refresh insights"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg font-medium text-muted-foreground">Analyzing regional data...</p>
        </div>
      ) : error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-800">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
            <Button 
              variant="outline" 
              className="mt-4 border-red-300 text-red-800 hover:bg-red-100"
              onClick={fetchInsights}
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : insight ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Summary Card */}
          <Card className="md:col-span-2 lg:col-span-2 shadow-md border-primary/10">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle>Executive Summary</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-lg leading-relaxed text-gray-700">
                {insight.summary}
              </p>
              <div className="mt-6 flex items-center gap-4 p-4 bg-primary/5 rounded-lg border border-primary/10">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Regional Performance Score</p>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-4xl font-bold ${getScoreColor(insight.performance_score)}`}>
                      {insight.performance_score}%
                    </span>
                    <span className="text-sm text-muted-foreground">overall average</span>
                  </div>
                </div>
                <div className="h-12 w-px bg-primary/20 hidden sm:block" />
                <div className="flex-1 hidden sm:block">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Last Updated</p>
                  <p className="text-lg font-semibold">
                    {new Date(insight.last_updated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trends Card */}
          <Card className="shadow-md border-primary/10">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <CardTitle>Key Trends</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {insight.trends.map((trend, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-100">
                  <span className="font-medium text-gray-700">{trend.metric}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={trend.direction === 'up' ? 'default' : trend.direction === 'down' ? 'destructive' : 'secondary'} className="font-mono">
                      {trend.direction === 'up' ? '+' : trend.direction === 'down' ? '-' : ''}{trend.change}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Strengths & Weaknesses */}
          <Card className="shadow-md border-green-100">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <CardTitle className="text-green-800">Regional Strengths</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {insight.strengths.map((item, idx) => (
                  <li key={idx} className="flex gap-3 text-sm text-gray-700">
                    <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="h-2 w-2 rounded-full bg-green-600" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="shadow-md border-red-100">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <CardTitle className="text-red-800">Areas for Improvement</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {insight.weaknesses.map((item, idx) => (
                  <li key={idx} className="flex gap-3 text-sm text-gray-700">
                    <div className="h-5 w-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="h-2 w-2 rounded-full bg-red-600" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card className="shadow-md border-blue-100">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-blue-800">Strategic Recommendations</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {insight.recommendations.map((item, idx) => (
                  <li key={idx} className="flex gap-3 text-sm text-gray-700">
                    <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[10px] font-bold text-blue-700">{idx + 1}</span>
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-muted-foreground">No insights available for the selected timeframe.</p>
        </div>
      )}
    </div>
  )
}
