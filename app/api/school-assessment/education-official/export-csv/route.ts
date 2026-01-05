import { NextRequest, NextResponse } from "next/server"

import { generateBulkExportCSV } from "@/features/school-assessment-reports/actions/exports"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { periodId?: string }
    const periodId = body.periodId

    if (!periodId) {
      return NextResponse.json({ csv: null, error: "Missing periodId." }, { status: 400 })
    }

    const result = await generateBulkExportCSV(periodId)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error in POST /api/school-assessment/education-official/export-csv:", error)
    return NextResponse.json({ csv: null, error: "Failed to generate CSV export." }, { status: 500 })
  }
}
