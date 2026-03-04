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
    const body = (await request.json().catch(() => ({}))) as { periodId?: string | null; schoolLevelId?: string | null }
    const periodId = body.periodId ?? null
    const schoolLevelId = body.schoolLevelId ?? undefined

    const filters = periodId || schoolLevelId ? { periodId: periodId ?? undefined, schoolLevelId: schoolLevelId ?? undefined } : undefined

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
      getNationalStatistics(periodId || undefined, schoolLevelId),
      getNationalReports(filters),
      getNationalSchoolRankings(periodId || undefined, 100, schoolLevelId),
      getNationalTrends(9, schoolLevelId),
      getSubmissionStatusByRegion(periodId || undefined, schoolLevelId),
      getScoreDistribution(undefined, periodId || undefined, schoolLevelId),
      getCategoryGapAnalysis(undefined, periodId || undefined, schoolLevelId),
      getMostImprovedSchools(undefined, 5, schoolLevelId),
      getUnderperformingRegions(periodId || undefined, schoolLevelId),
      getSubmissionProgressBreakdown(undefined, periodId || undefined, schoolLevelId),
      getCategoryLeaders(undefined, periodId || undefined, schoolLevelId),
      getCategoryPerformance(periodId || undefined, undefined, schoolLevelId),
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
