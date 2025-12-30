
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleSupabaseClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const reportId = searchParams.get('reportId')

  if (!reportId) {
    return NextResponse.json({ error: 'Report ID is required' }, { status: 400 })
  }

  try {
    const supabase = createServiceRoleSupabaseClient()
    
    // Log for debugging (will show in Vercel logs)
    console.log(`API: Fetching recommendations for reportId: ${reportId}`)
    
    const { data, error } = await supabase
      .from('hmr_school_assessment_recommendations')
      .select('*')
      .eq('report_id', reportId)
      .order('priority', { ascending: true })

    if (error) {
      console.error('API: Database error:', error)
      return NextResponse.json({ error: error.message, recommendations: [] }, { status: 500 })
    }

    if (!data || data.length === 0) {
      console.log('API: No recommendations found in DB')
      return NextResponse.json({ recommendations: [] })
    }

    console.log(`API: Found ${data.length} recommendations`)

    const mapped = data.map((row: any) => ({
      id: row.id,
      reportId: row.report_id,
      category: row.category,
      priority: row.priority,
      recommendationText: row.recommendation_text,
      focusAreas: row.focus_areas || [],
      generatedAt: row.generated_at,
      createdAt: row.created_at,
    }))

    return NextResponse.json({ recommendations: mapped })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
