import { NextResponse } from "next/server"

import { getActivePeriod, getAllPeriods } from "@/features/school-assessment-reports/actions/assessment-periods"

export const runtime = "nodejs"

export async function GET() {
  try {
    const [periodsResult, activeResult] = await Promise.all([getAllPeriods(), getActivePeriod()])

    return NextResponse.json({
      periods: periodsResult.periods ?? [],
      activePeriod: activeResult.period ?? null,
      error: periodsResult.error ?? activeResult.error ?? null,
    })
  } catch (error) {
    console.error("Error in GET /api/school-assessment/education-official/periods:", error)
    return NextResponse.json(
      { periods: [], activePeriod: null, error: "Failed to load assessment periods." },
      { status: 500 }
    )
  }
}
