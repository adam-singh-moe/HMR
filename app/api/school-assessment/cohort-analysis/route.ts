import { NextResponse } from "next/server"

import { getCohortAnalysis } from "@/features/school-assessment-reports/actions/ai-insights"

export const runtime = "nodejs"

type Body = {
  schoolId?: string
  criteriaType?: "score" | "region" | "size"
  limit?: number
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Body | null

    const schoolId = body?.schoolId
    if (!schoolId) {
      return NextResponse.json({ cohort: [], insights: null, error: "Missing schoolId." }, { status: 400 })
    }

    const criteriaType = body?.criteriaType || "score"
    const limit = typeof body?.limit === "number" ? body.limit : undefined

    const result = await getCohortAnalysis(schoolId, criteriaType, limit)
    return NextResponse.json(result)
  } catch (error) {
    console.error("/api/school-assessment/cohort-analysis error:", error)
    return NextResponse.json(
      {
        cohort: [],
        insights: null,
        error: error instanceof Error ? error.message : "Failed to generate cohort analysis.",
      },
      { status: 500 }
    )
  }
}
