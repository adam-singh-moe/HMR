import { NextResponse } from "next/server"

import { generateImprovementPlan } from "@/features/school-assessment-reports/actions/ai-insights"

export const runtime = "nodejs"

type Body = {
  schoolId?: string
  reportId?: string
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Body | null

    if (!body?.schoolId) {
      return NextResponse.json({ insight: null, error: "Missing schoolId." }, { status: 400 })
    }

    const result = await generateImprovementPlan(body.schoolId, body.reportId)
    return NextResponse.json(result)
  } catch (error) {
    console.error("/api/school-assessment/improvement-plan error:", error)
    return NextResponse.json(
      {
        insight: null,
        error: error instanceof Error ? error.message : "Failed to generate improvement plan.",
      },
      { status: 500 }
    )
  }
}
