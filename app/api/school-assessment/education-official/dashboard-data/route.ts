import { NextRequest, NextResponse } from "next/server"

import {
  getNationalStatistics,
  getNationalSchoolRankings,
  getNationalTrends,
  getCategoryPerformance,
  getSubmissionStatusByRegion,
  getScoreDistribution,
  getCategoryGapAnalysis,
  getMostImprovedSchools,
  getUnderperformingRegions,
  getSubmissionProgressBreakdown,
  getCategoryLeaders,
} from "@/features/school-assessment-reports/actions/analytics"
import { getNationalReports } from "@/features/school-assessment-reports/actions/reports"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { periodId?: string | null }
    const periodId = body.periodId ?? null

    const filters = periodId ? { periodId } : undefined

    const [
      statsResult,
      reportsResult,
      rankingsResult,
      trendsResult,
      submissionResult,
      distributionResult,
      gapsResult,
      improvedResult,
      underperformingResult,
      progressResult,
      leadersResult,
      categoryPerformanceResult,
    ] = await Promise.all([
      getNationalStatistics(periodId || undefined),
      getNationalReports(filters),
      getNationalSchoolRankings(periodId || undefined, 100),
      getNationalTrends(9),
      getSubmissionStatusByRegion(periodId || undefined),
      getScoreDistribution(undefined, periodId || undefined),
      getCategoryGapAnalysis(undefined, periodId || undefined),
      getMostImprovedSchools(undefined, 5),
      getUnderperformingRegions(periodId || undefined),
      getSubmissionProgressBreakdown(undefined, periodId || undefined),
      getCategoryLeaders(undefined, periodId || undefined),
      getCategoryPerformance(undefined, periodId || undefined),
    ])

    return NextResponse.json({
      statsResult,
      reportsResult,
      rankingsResult,
      trendsResult,
      submissionResult,
      distributionResult,
      gapsResult,
      improvedResult,
      underperformingResult,
      progressResult,
      leadersResult,
      categoryPerformanceResult,
      error: null,
    })
  } catch (error) {
    console.error("Error in POST /api/school-assessment/education-official/dashboard-data:", error)
    return NextResponse.json(
      { error: "Failed to load dashboard data." },
      { status: 500 }
    )
  }
}
