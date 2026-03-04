import { NextRequest, NextResponse } from 'next/server'
import { getNonSubmittedSchools } from '@/features/school-assessment-reports/actions/analytics'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const {
      periodId,
      schoolLevelId,
      regionId,
      searchQuery,
      grade,
    } = body || {}

    const result = await getNonSubmittedSchools({
      periodId,
      schoolLevelId,
      regionId,
      searchQuery,
      grade,
    })

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in non-submitted schools API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch non-submitted schools.' },
      { status: 500 }
    )
  }
}
