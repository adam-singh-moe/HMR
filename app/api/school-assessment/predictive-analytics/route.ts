import { NextResponse } from "next/server"

import { generatePredictiveAnalytics } from "@/features/school-assessment-reports/actions/ai-insights"

export const runtime = "nodejs"

type Body = {
  entityId?: string
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Body | null

    const entityId = body?.entityId
    if (!entityId) {
      return NextResponse.json({ predictions: null, error: "Missing entityId." }, { status: 400 })
    }

    const result = await generatePredictiveAnalytics(entityId)
    return NextResponse.json(result)
  } catch (error) {
    console.error("/api/school-assessment/predictive-analytics error:", error)
    return NextResponse.json(
      {
        predictions: null,
        error: error instanceof Error ? error.message : "Failed to generate predictive analytics.",
      },
      { status: 500 }
    )
  }
}
