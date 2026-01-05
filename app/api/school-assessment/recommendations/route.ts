import { NextResponse } from "next/server"

import {
  getOrGenerateRecommendations,
  getRecommendations,
} from "@/features/school-assessment-reports/actions/recommendations"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const reportId = url.searchParams.get("reportId")

  if (!reportId) {
    return NextResponse.json(
      { recommendations: [], error: "Missing reportId" },
      { status: 400 }
    )
  }

  const result = await getRecommendations(reportId)
  return NextResponse.json(result)
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { recommendations: [], error: "Invalid JSON body" },
      { status: 400 }
    )
  }

  const { reportId, generate } = body as {
    reportId?: string
    generate?: boolean
  }

  if (!reportId) {
    return NextResponse.json(
      { recommendations: [], error: "Missing reportId" },
      { status: 400 }
    )
  }

  const result = generate
    ? await getOrGenerateRecommendations(reportId)
    : await getRecommendations(reportId)

  return NextResponse.json(result)
}
