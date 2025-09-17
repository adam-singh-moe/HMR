import { NextRequest, NextResponse } from 'next/server'
import { getSchoolsOverviewData, clearSchoolsCache } from '@/app/actions/education-official-reports'

export async function GET(request: NextRequest) {
  try {
    // Check if this is a cache refresh request
    const url = new URL(request.url)
    const refresh = url.searchParams.get('refresh') === 'true'
    
    if (refresh) {
      clearSchoolsCache()
    }
    
    const { schools, error } = await getSchoolsOverviewData()
    
    if (error) {
      return NextResponse.json({ error }, { status: 500 })
    }
    
    return NextResponse.json({ 
      schools,
      timestamp: new Date().toISOString(),
      count: schools.length,
      cached: !refresh
    })
  } catch (error) {
    console.error('API Error fetching schools:', error)
    return NextResponse.json(
      { error: 'Failed to fetch schools data' }, 
      { status: 500 }
    )
  }
}
