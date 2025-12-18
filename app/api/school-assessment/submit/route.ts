import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { submitReport } from '@/features/school-assessment-reports/actions/reports'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const reportId = body?.reportId

    if (typeof reportId !== 'string' || reportId.length === 0) {
      return NextResponse.json({ error: 'Missing reportId.' }, { status: 400 })
    }

    const result = await submitReport(reportId)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in /api/school-assessment/submit:', error)
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 })
  }
}
