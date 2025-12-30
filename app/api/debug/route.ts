import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE!
  )

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
