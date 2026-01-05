import { NextRequest, NextResponse } from "next/server"

import { getReport } from "@/features/school-assessment-reports/actions/reports"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { reportId?: string }
    const reportId = body.reportId

    if (!reportId) {
      return NextResponse.json({ report: null, error: "Missing reportId." }, { status: 400 })
    }

    const reportResult = await getReport(reportId)
    return NextResponse.json(reportResult)
  } catch (error) {
    console.error("Error in POST /api/school-assessment/education-official/report:", error)
    return NextResponse.json({ report: null, error: "Failed to load report." }, { status: 500 })
  }
}
