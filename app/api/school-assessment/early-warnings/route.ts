import { NextResponse } from "next/server"

import { getEarlyWarnings } from "@/features/school-assessment-reports/actions/ai-insights"

export const runtime = "nodejs"

type Body = {
  regionId?: string
  threshold?: number
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Body | null

    const result = await getEarlyWarnings(body?.regionId, body?.threshold)
    return NextResponse.json(result)
  } catch (error) {
    console.error("/api/school-assessment/early-warnings error:", error)
    return NextResponse.json(
      {
        warnings: [],
        error: error instanceof Error ? error.message : "Failed to generate early warnings.",
      },
      { status: 500 }
    )
  }
}
