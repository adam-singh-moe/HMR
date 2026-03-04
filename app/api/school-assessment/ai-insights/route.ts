import { NextResponse } from "next/server"

import {
  generateNationalAssessmentInsight,
  generateRegionalAssessmentInsight,
  generateSchoolAssessmentInsight,
} from "@/features/school-assessment-reports/actions/ai-insights"

export const runtime = "nodejs"

type Scope = "national" | "regional" | "school"

type Body = {
  scope: Scope
  id?: string
  periodId?: string
  schoolLevelId?: string
  insightType?:
    | "overview"
    | "regional_comparison"
    | "trends"
    | "policy_recommendations"
    | "comparison"
    | "recommendations"
    | "category_comparison"
  academicYear?: string
  termName?: string
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Body | null

    if (!body?.scope) {
      return NextResponse.json({ insight: null, error: "Missing scope." }, { status: 400 })
    }

    if (body.scope === "school") {
      if (!body.id) {
        return NextResponse.json({ insight: null, error: "Missing school id." }, { status: 400 })
      }
      const result = await generateSchoolAssessmentInsight(body.id, body.periodId)
      return NextResponse.json(result)
    }

    if (body.scope === "regional") {
      if (!body.id) {
        return NextResponse.json({ insight: null, error: "Missing region id." }, { status: 400 })
      }

      // Default to overview; allow passing other insight types.
      const insightType =
        (body.insightType as any) || ("overview" as const)

      const result = await generateRegionalAssessmentInsight(
        body.id,
        body.periodId,
        body.schoolLevelId,
        insightType,
        body.academicYear,
        body.termName
      )
      return NextResponse.json(result)
    }

    // national
    const insightType =
      (body.insightType as any) || ("overview" as const)

    const result = await generateNationalAssessmentInsight(body.periodId, body.schoolLevelId, insightType)
    return NextResponse.json(result)
  } catch (error) {
    console.error("/api/school-assessment/ai-insights error:", error)
    return NextResponse.json(
      {
        insight: null,
        error: error instanceof Error ? error.message : "Failed to generate insight.",
      },
      { status: 500 }
    )
  }
}
