'use server'

import { createServiceRoleSupabaseClient } from "@/lib/supabase"

export async function getPublicTopSchools() {
  const supabase = createServiceRoleSupabaseClient()

  try {
    const { data: reports, error } = await supabase
      .from('hmr_school_assessment_reports')
      .select(`
        id,
        total_score,
        rating_level,
        status,
        sms_schools (
          id,
          name,
          sms_regions ( name ),
          sms_school_levels ( name )
        )
      `)
      .eq('status', 'submitted')
      .order('total_score', { ascending: false })

    if (error) {
      console.error('Error fetching top schools:', error)
      return { data: {}, regions: [] }
    }

    // Process and group by region
    const schoolsByRegion: Record<string, any[]> = {}
    const regionsSet = new Set<string>()

    // Filter valid reports and organize
    const validReports = reports.filter(r => r.sms_schools)
    
    validReports.forEach((report: any) => {
      // Ensure we have region data
      if (!report.sms_schools?.sms_regions) return

      const region = report.sms_schools.sms_regions.name
      const school = {
        id: report.sms_schools.id,
        reportId: report.id,
        name: report.sms_schools.name,
        score: report.total_score,
        rating: report.rating_level?.split(' ')[0] || 'N/A', // Extract "A" from "A (Outstanding)"
        level: report.sms_schools.sms_school_levels?.name || 'Primary',
        trend: '+0' // Placeholder as we don't have historical comparison easily yet
      }

      if (!schoolsByRegion[region]) {
        schoolsByRegion[region] = []
        regionsSet.add(region)
      }

      // Limit to top 3 per region
      if (schoolsByRegion[region].length < 3) {
        schoolsByRegion[region].push(school)
      }
    })

    // Sort regions alphabetically
    const regions = Array.from(regionsSet).sort()

    return {
      data: schoolsByRegion,
      regions
    }
  } catch (err) {
    console.error('Unexpected error fetching top schools:', err)
    return { data: {}, regions: [] }
  }
}
// touch
