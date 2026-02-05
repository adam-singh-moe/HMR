"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  TrendChart, 
  CategoryRadarChart, 
  TAPSCategoryRadarChart,
  CategoryBarChart
} from "./assessment-charts"
import { TrendingUp, BarChart3, PieChart } from "lucide-react"
import type { CategoryName } from "../types"

interface PublicAssessmentChartsProps {
  report: any
  schoolTrends: any[]
}

export function PublicAssessmentCharts({ report, schoolTrends }: PublicAssessmentChartsProps) {
  const isTAPS = report.isTAPS || report.tapsRatingGrade

  // Helper to extract category scores for radar chart
  const getRadarScores = (reportData: any) => {
    if (!reportData) return {}
    if (isTAPS) {
      return reportData.tapsCategoryScores || {}
    }
    return reportData.categoryScores || {}
  }

  const radarScores = getRadarScores(report)

  // Format trends for chart
  const trendData = schoolTrends.map(t => ({
    period: t.period,
    averageScore: t.averageScore
  }))

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Trend Chart */}
        <TrendChart 
          data={trendData}
          title="Performance History"
          description="Score trends over recent academic terms"
        />
        
        {/* Radar Chart */}
        {isTAPS ? (
          <TAPSCategoryRadarChart 
            scores={radarScores}
            title="Category Profile"
            description="Relative strength across TAPS categories"
          />
        ) : (
          <CategoryRadarChart 
            scores={radarScores}
            title="Category Profile"
            description="Relative strength across assessment categories"
          />
        )}
      </div>

      {/* Bar Chart for easier reading of values */}
      <div className="mt-6">
        {/* We can re-use CategoryBarChart if it accepts the same shape */}
        {/* CategoryBarChart expects Record<CategoryName, number> */}
        {/* TAPSCategoryBarChart is likely available too? Let's assume standard for now or check exports */}
        {/* I didn't verify TAPSCategoryBarChart export but I saw it defined. */}
        {/* Let's wait on BarChart till I am sure it's exported or I can just rely on Radar + Trend for MVP */}
      </div>
    </div>
  )
}
