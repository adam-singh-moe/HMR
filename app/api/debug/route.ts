import { NextResponse } from 'next/server'
import { createServiceRoleSupabaseClient } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function GET() {
  let supabase
  try {
    supabase = createServiceRoleSupabaseClient()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to initialize Supabase client'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  const { data: periods } = await supabase
    .from('hmr_reporting_periods')
    .select('*')
    .order('year', { ascending: false })
    .order('month', { ascending: false })
    .limit(5)

  const { data: reports } = await supabase
    .from('hmr_school_assessment_reports')
    .select(`
      id,
      school_id,
      period_id,
      status,
      total_score,
      rating_level,
      sms_schools (
        name,
        region,
        school_type
      )
    `)
    .order('created_at', { ascending: false })
    .limit(10)

  return NextResponse.json({
    periods,
    reports
  })
}
