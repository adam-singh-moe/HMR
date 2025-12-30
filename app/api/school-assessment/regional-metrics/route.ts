import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleSupabaseClient } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const regionId = searchParams.get('regionId')

    if (!regionId) {
      return NextResponse.json({ error: "Region ID required" }, { status: 400 })
    }

    const supabase = createServiceRoleSupabaseClient()

    // Get region name and ID (regionId might be the name itself or an ID)
    let regionName = regionId
    let actualRegionId = regionId

    // Try to find the region by name or ID to get both
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(regionId)
    
    let regionQuery = supabase.from('sms_regions').select('id, name')
    if (isUUID) {
      regionQuery = regionQuery.eq('id', regionId)
    } else {
      regionQuery = regionQuery.ilike('name', regionId)
    }
    
    const { data: regionData } = await regionQuery.maybeSingle()

    if (regionData) {
      regionName = regionData.name
      actualRegionId = regionData.id
    }

    // Get total schools in region
    let { count: totalSchools, data: schoolsData } = await supabase
      .from('sms_schools')
      .select('id', { count: 'exact' })
      .eq('region_id', actualRegionId)

    const schoolIds = schoolsData?.map(s => s.id) || []

    // Get active assessment period
    let { data: activePeriod } = await supabase
      .from('hmr_school_assessment_periods')
      .select('id, end_date')
      .eq('is_active', true)
      .maybeSingle()

    let submittedCount = 0
    let averageScore = 0
    let topSchool: { name: string; score: number } | null = null
    let atRiskCount = 0
    let overdueCount = 0
    let nearDeadlineCount = 0
    let decliningSchools = 0
    let submissionTrend: { date: string; count: number }[] = []

    if (schoolIds.length > 0) {
      // Determine which reports to fetch
      let reportsQuery = supabase
        .from('hmr_school_assessment_reports')
        .select(`
          id,
          school_id,
          total_score,
          rating_level,
          taps_rating_grade,
          submitted_at,
          academic_year,
          term_name,
          sms_schools!inner(id, name, region_id)
        `)
        .eq('status', 'submitted')
        .in('school_id', schoolIds)

      // Check if we have reports for the active period
      let usePeriodFilter = false
      if (activePeriod) {
        const { count } = await supabase
          .from('hmr_school_assessment_reports')
          .select('id', { count: 'exact', head: true })
          .eq('period_id', activePeriod.id)
          .in('school_id', schoolIds)
        
        if (count && count > 0) {
          usePeriodFilter = true
        }
      }

      if (usePeriodFilter && activePeriod) {
        reportsQuery = reportsQuery.eq('period_id', activePeriod.id)
      } else {
        // Fallback: Get the most recent academic year and term from reports for these schools
        const { data: latestReport } = await supabase
          .from('hmr_school_assessment_reports')
          .select('academic_year, term_name')
          .eq('status', 'submitted')
          .in('school_id', schoolIds)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (latestReport?.academic_year && latestReport?.term_name) {
          reportsQuery = reportsQuery
            .eq('academic_year', latestReport.academic_year)
            .eq('term_name', latestReport.term_name)
        } else {
          // No reports for this region
          return NextResponse.json({
            regionName,
            totalSchools: totalSchools || 0,
            submittedCount: 0,
            averageScore: 0,
            topSchool: null,
            atRiskCount: 0,
            overdueCount: 0,
            nearDeadlineCount: 0,
            decliningSchools: 0,
            submissionTrend: [],
            submissionRate: 0
          })
        }
      }

      const { data: reports, error } = await reportsQuery
        .order('total_score', { ascending: false })

      if (!error && reports && reports.length > 0) {
        submittedCount = reports.length

        // Calculate average
        const totalScoreSum = reports.reduce((sum, r) => sum + (r.total_score || 0), 0)
        averageScore = Math.round(totalScoreSum / reports.length)

        // Top school
        const topReport = reports[0]
        if (topReport && topReport.sms_schools) {
          topSchool = {
            name: (topReport.sms_schools as any).name,
            score: topReport.total_score || 0
          }
        }

        // At-risk schools (below 400 score or needs_improvement/D/E rating)
        atRiskCount = reports.filter(r => 
          (r.total_score || 0) < 400 || 
          r.rating_level === 'needs_improvement' ||
          r.taps_rating_grade === 'D' ||
          r.taps_rating_grade === 'E'
        ).length

        // Calculate submission trend for last 7 days
        const today = new Date()
        const last7Days: { date: string; count: number }[] = []
        for (let i = 6; i >= 0; i--) {
          const date = new Date(today)
          date.setDate(date.getDate() - i)
          const dateStr = date.toISOString().split('T')[0]
          const count = reports.filter(r => {
            if (!r.submitted_at) return false
            const submittedDate = new Date(r.submitted_at).toISOString().split('T')[0]
            return submittedDate === dateStr
          }).length
          last7Days.push({ date: dateStr.slice(5), count }) // Just MM-DD
        }
        submissionTrend = last7Days
      }

      // Calculate overdue and near deadline
      if (activePeriod?.end_date) {
        const deadline = new Date(activePeriod.end_date)
        const today = new Date()
        const daysToDeadline = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        // Schools that haven't submitted
        const notSubmittedCount = (totalSchools || 0) - submittedCount

        if (daysToDeadline < 0) {
          // Deadline passed
          overdueCount = notSubmittedCount
        } else if (daysToDeadline <= 7) {
          // Within 7 days of deadline
          nearDeadlineCount = notSubmittedCount
        }
      }

      // Check for declining schools (comparing to previous period)
      if (activePeriod) {
        const { data: previousPeriod } = await supabase
          .from('hmr_school_assessment_periods')
          .select('id')
          .neq('id', activePeriod.id)
          .lt('end_date', activePeriod.end_date || new Date().toISOString())
          .order('end_date', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (previousPeriod && schoolIds.length > 0) {
          const { data: previousReports } = await supabase
            .from('hmr_school_assessment_reports')
            .select('school_id, total_score')
            .eq('period_id', previousPeriod.id)
            .eq('status', 'submitted')
            .in('school_id', schoolIds)

          if (previousReports && reports) {
            const currentScores = new Map(reports.map(r => [r.school_id, r.total_score || 0]))
            const prevScores = new Map(previousReports.map(r => [r.school_id, r.total_score || 0]))
            
            decliningSchools = Array.from(currentScores.entries()).filter(([schoolId, score]) => {
              const prevScore = prevScores.get(schoolId)
              return prevScore !== undefined && score < prevScore - 20 // Declined by more than 20 points
            }).length
          }
        }
      }
    }

    // Calculate national rank for this region
    let nationalRank: number | null = null
    let totalRegions = 0

    const { data: allRegions } = await supabase
      .from('sms_regions')
      .select('id, name')

    totalRegions = allRegions?.length || 0

    if (allRegions && allRegions.length > 0) {
      // Calculate average score for all regions
      const regionAvgScores: { regionId: string; avgScore: number }[] = []

      for (const region of allRegions) {
        const { data: regionSchools } = await supabase
          .from('sms_schools')
          .select('id')
          .eq('region_id', region.id)

        if (regionSchools && regionSchools.length > 0) {
          let regionReportsQuery = supabase
            .from('hmr_school_assessment_reports')
            .select('total_score')
            .eq('status', 'submitted')
            .in('school_id', regionSchools.map(s => s.id))

          if (activePeriod) {
            regionReportsQuery = regionReportsQuery.eq('period_id', activePeriod.id)
          } else {
            // Fallback to latest academic year/term for this region
            const { data: latest } = await supabase
              .from('hmr_school_assessment_reports')
              .select('academic_year, term_name')
              .eq('status', 'submitted')
              .in('school_id', regionSchools.map(s => s.id))
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
            
            if (latest) {
              regionReportsQuery = regionReportsQuery
                .eq('academic_year', latest.academic_year)
                .eq('term_name', latest.term_name)
            }
          }

          const { data: regionReports } = await regionReportsQuery

          if (regionReports && regionReports.length > 0) {
            const avg = regionReports.reduce((sum, r) => sum + (r.total_score || 0), 0) / regionReports.length
            regionAvgScores.push({ regionId: region.id, avgScore: avg })
          }
        }
      }

      // Sort and find rank
      regionAvgScores.sort((a, b) => b.avgScore - a.avgScore)
      const rankIndex = regionAvgScores.findIndex(r => r.regionId === actualRegionId)
      if (rankIndex !== -1) {
        nationalRank = rankIndex + 1
      }
    }

    const submissionRate = totalSchools ? Math.round((submittedCount / totalSchools) * 100) : 0

    // Calculate weekly velocity (change from last week)
    let weeklyVelocity = 0
    if (submissionTrend.length >= 7) {
      const thisWeekTotal = submissionTrend.slice(4).reduce((sum, d) => sum + d.count, 0)
      const lastWeekTotal = submissionTrend.slice(0, 3).reduce((sum, d) => sum + d.count, 0)
      if (lastWeekTotal > 0) {
        weeklyVelocity = Math.round(((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100)
      } else if (thisWeekTotal > 0) {
        weeklyVelocity = 100
      }
    }

    return NextResponse.json({
      regionName,
      totalSchools: totalSchools || 0,
      submittedCount,
      submissionRate,
      averageScore,
      topSchool,
      atRiskCount,
      overdueCount,
      nearDeadlineCount,
      decliningSchools,
      submissionTrend,
      nationalRank,
      totalRegions,
      weeklyVelocity
    })
  } catch (error) {
    console.error('Error in regional-metrics:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
