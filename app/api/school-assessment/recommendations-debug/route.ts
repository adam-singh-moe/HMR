import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceRoleSupabaseClient } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const reportId = url.searchParams.get('reportId')

  if (!reportId) {
    return NextResponse.json({ error: 'Missing reportId' }, { status: 400 })
  }

  try {
    const cookieStore = await cookies()
    const userSession = cookieStore.get('user_session')
    if (!userSession) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    let user: any
    try {
      user = JSON.parse(userSession.value)
    } catch {
      return NextResponse.json({ error: 'Invalid session data' }, { status: 401 })
    }

    const role = user?.role
    if (role !== 'Admin' && role !== 'Education Official') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = createServiceRoleSupabaseClient()

    const { data: report, error: reportError } = await supabase
      .from('hmr_school_assessment_reports')
      .select('id,status,submitted_at,school_type,taps_rating_grade,created_at,updated_at')
      .eq('id', reportId)
      .single()

    const { data: recs, error: recsError } = await supabase
      .from('hmr_school_assessment_recommendations')
      .select('id,category,priority,generated_at,created_at')
      .eq('report_id', reportId)
      .order('generated_at', { ascending: false })

    return NextResponse.json({
      report,
      reportError: reportError ? { message: reportError.message, code: reportError.code } : null,
      recommendationsCount: recs?.length ?? 0,
      recommendations: recs ?? [],
      recommendationsError: recsError ? { message: recsError.message, code: recsError.code } : null,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Unknown error' }, { status: 500 })
  }
}
