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

// ============================================================================
// PUBLIC REPORT DETAILS
// ============================================================================

export async function getPublicReportDetails(reportId: string) {
  const supabase = createServiceRoleSupabaseClient()

  try {
    // 1. Fetch Report Details
    const { data: report, error } = await supabase
      .from('hmr_school_assessment_reports')
      .select(`
        id,
        school_id,
        academic_year,
        period_id,
        total_score,
        rating_level,
        status,
        submitted_at, 
        created_at,
        taps_rating_grade,
        taps_school_inputs_scores,
        taps_leadership_scores,
        taps_academics_scores,
        taps_teacher_development_scores,
        taps_health_safety_scores,
        taps_school_culture_scores,
        academic_scores,
        attendance_scores,
        infrastructure_scores,
        teaching_quality_scores,
        management_scores,
        student_welfare_scores,
        community_scores,
        sms_schools (
          id,
          name,
          sms_regions ( id, name ),
          sms_school_levels ( name )
        ),
        hmr_school_assessment_periods (
          id,
          academic_year,
          term_name
        )
      `)
      .eq('id', reportId)
      .eq('status', 'submitted') // Security: Only show submitted reports
      .single()

    if (error || !report) {
      console.error('Error fetching public report:', error?.message || error, 'Code:', error?.code, 'Details:', error?.details)
      return null
    }

    // 2. Format Report Data (similar to authenticated getReport)
    const school = Array.isArray(report.sms_schools) ? report.sms_schools[0] : report.sms_schools
    const region = school?.sms_regions ? (Array.isArray(school.sms_regions) ? school.sms_regions[0] : school.sms_regions) : null
    const period = Array.isArray(report.hmr_school_assessment_periods) ? report.hmr_school_assessment_periods[0] : report.hmr_school_assessment_periods

    // Determine if this is a TAPS report based on whether TAPS data exists
    const hasTAPSData = Boolean(
      report.taps_rating_grade ||
      report.taps_school_inputs_scores ||
      report.taps_leadership_scores ||
      report.taps_academics_scores ||
      report.taps_teacher_development_scores ||
      report.taps_health_safety_scores ||
      report.taps_school_culture_scores
    )

    const formattedReport = {
      id: report.id,
      schoolId: school?.id,
      schoolName: school?.name,
      regionId: region?.id,
      regionName: region?.name,
      academicYear: period?.academic_year || report.academic_year,
      termName: period?.term_name,
      periodId: report.period_id,
      totalScore: report.total_score,
      ratingLevel: report.rating_level,
      status: report.status,
      submittedAt: report.submitted_at || report.created_at,
      
      // TAPS
      isTAPS: hasTAPSData,
      tapsRatingGrade: report.taps_rating_grade,
      tapsCategoryScores: hasTAPSData ? {
        school_inputs_operations: (report.taps_school_inputs_scores as any)?.total || 0,
        leadership: (report.taps_leadership_scores as any)?.total || 0,
        academics: (report.taps_academics_scores as any)?.total || 0,
        teacher_development: (report.taps_teacher_development_scores as any)?.total || 0,
        health_safety: (report.taps_health_safety_scores as any)?.total || 0,
        school_culture: (report.taps_school_culture_scores as any)?.total || 0,
      } : undefined,

      // Standard
      categoryScores: {
        academic: (report.academic_scores as any)?.total || 0,
        attendance: (report.attendance_scores as any)?.total || 0,
        infrastructure: (report.infrastructure_scores as any)?.total || 0,
        teaching_quality: (report.teaching_quality_scores as any)?.total || 0,
        management: (report.management_scores as any)?.total || 0,
        student_welfare: (report.student_welfare_scores as any)?.total || 0,
        community: (report.community_scores as any)?.total || 0,
      }
    }

    // 3. Fetch School Trends (Public Safe Version)
    const schoolTrends = await getPublicSchoolTrends(formattedReport.schoolId)

    return {
      report: formattedReport,
      schoolTrends: schoolTrends
    }

  } catch (err) {
    console.error('Unexpected error fetching public report:', err)
    return null
  }
}

/**
 * Gets score trends over time for a school (Public Version - No Auth Check)
 * Only returns submitted reports public data.
 */
async function getPublicSchoolTrends(schoolId: string, limit: number = 9) {
  const supabase = createServiceRoleSupabaseClient()

  try {
    const { data: reports, error } = await supabase
      .from('hmr_school_assessment_reports')
      .select(`
        total_score,
        academic_year,
        term_name,
        submitted_at,
        hmr_school_assessment_periods(academic_year, term_name, sequence_order)
      `)
      .eq('school_id', schoolId)
      .eq('status', 'submitted')
      .order('submitted_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) {
      console.error('Error fetching public school trends:', error)
      return []
    }
    
    const inferTermOrder = (termName: string): number => {
      const t = (termName || '').toLowerCase()
      if (t.includes('first')) return 1
      if (t.includes('second')) return 2
      if (t.includes('third')) return 3
      if (t.includes('september') || t.includes('december')) return 1
      if (t.includes('january') || t.includes('march')) return 2
      if (t.includes('april') || t.includes('july')) return 3
      return 0
    }

    const parseAcademicYearStart = (academicYear: string): number => {
      const start = Number.parseInt((academicYear || '').split('-')[0] || '', 10)
      return Number.isFinite(start) ? start : 0
    }

    const trends = (reports || [])
      .map((r: any) => {
        const period = r.hmr_school_assessment_periods
        const academicYear = period?.academic_year ?? r.academic_year ?? ''
        const termName = period?.term_name ?? r.term_name ?? ''
        const sequenceOrder = period?.sequence_order ?? inferTermOrder(termName)

        return {
          period: academicYear && termName ? `${academicYear} - ${termName}` : 'Unknown Period',
          academicYear,
          termName,
          averageScore: r.total_score ?? 0,
          submissionCount: 1,
          _sequenceOrder: sequenceOrder,
          _yearStart: parseAcademicYearStart(academicYear),
        }
      })
      .filter((t: any) => t.academicYear && t.termName)
      .sort((a: any, b: any) => (a._yearStart - b._yearStart) || (a._sequenceOrder - b._sequenceOrder))
      .map(({ _sequenceOrder, _yearStart, ...rest }: any) => rest)
    
    return trends
  } catch (error) {
    console.error('Error in getPublicSchoolTrends:', error)
    return []
  }
}
// touch

// ============================================================================
// PUBLIC SCHOOL SEARCH
// ============================================================================

export async function searchPublicSchools(query: string) {
  const supabase = createServiceRoleSupabaseClient()

  try {
    if (!query || query.trim().length < 2) {
      return { schools: [] }
    }

    const searchTerm = query.trim()

    // Use DISTINCT ON to get only the latest report for each school
    // PostgreSQL's DISTINCT ON returns the first row for each unique school_id
    // when ordered by school_id, submitted_at DESC, created_at DESC
    const { data: reports, error } = await supabase
      .from('hmr_school_assessment_reports')
      .select(`
        id,
        school_id,
        total_score,
        rating_level,
        academic_year,
        term_name,
        submitted_at,
        created_at,
        sms_schools (
          id,
          name,
          sms_regions ( name )
        )
      `)
      .eq('status', 'submitted')
      .ilike('sms_schools.name', `%${searchTerm}%`)
      .order('submitted_at', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error searching schools:', error)
      return { schools: [] }
    }

    // Process results to ensure we only get the latest report per school
    const schoolMap = new Map<string, any>()
    
    for (const report of reports || []) {
      const school = Array.isArray(report.sms_schools) ? report.sms_schools[0] : report.sms_schools
      const schoolId = school?.id || report.school_id

      // Only keep the first (latest) report for each school
      if (!schoolMap.has(schoolId)) {
        const region = school?.sms_regions 
          ? (Array.isArray(school.sms_regions) ? school.sms_regions[0] : school.sms_regions)
          : null

        schoolMap.set(schoolId, {
          schoolId: schoolId,
          schoolName: school?.name || 'Unknown School',
          regionName: region?.name || 'Unknown Region',
          reportId: report.id,
          totalScore: report.total_score,
          ratingLevel: report.rating_level,
          academicYear: report.academic_year,
          termName: report.term_name,
          submittedAt: report.submitted_at || report.created_at,
        })
      }
    }

    const schools = Array.from(schoolMap.values())
    
    return { schools }
  } catch (err) {
    console.error('Unexpected error searching schools:', err)
    return { schools: [] }
  }
}
