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

    // Get region name (regionId might be the name itself or an ID)
    let regionName = regionId

    // Get total schools in region - try matching by name first
    let { count: totalSchools, data: schoolsData } = await supabase
      .from('sms_schools')
      .select('id', { count: 'exact' })
      .ilike('region_id', regionId)

    // If no results, region might be stored differently
    if (!totalSchools) {
      const result = await supabase
        .from('sms_schools')
        .select('id', { count: 'exact' })
        .eq('region_id', regionId)
      totalSchools = result.count
      schoolsData = result.data
    }

    const schoolIds = schoolsData?.map(s => s.id) || []

    // Get active assessment period
    const { data: activePeriod } = await supabase
      .from('hmr_school_assessment_periods')
      .select('id, end_date')
      .eq('is_active', true)
      .single()

    let submittedCount = 0
    let averageScore = 0
    let topSchool: { name: string; score: number } | null = null
    let atRiskCount = 0
    let overdueCount = 0
    let nearDeadlineCount = 0
    let decliningSchools = 0
    let submissionTrend: { date: string; count: number }[] = []

    if (activePeriod && schoolIds.length > 0) {
      // Get submitted reports for this region in current period
      const { data: reports, error } = await supabase
        .from('hmr_school_assessment_reports')
        .select(`
          id,
          school_id,
          total_score,
          rating_level,
          submitted_at,
          sms_schools!inner(id, name, region_id)
        `)
        .eq('period_id', activePeriod.id)
        .eq('status', 'submitted')
        .in('school_id', schoolIds)
        .order('total_score', { ascending: false })

      // Filter by region after the query (double-check)
      const regionReports = reports?.filter(r => {
        const school = r.sms_schools as any
        return school?.region_id?.toLowerCase() === regionId.toLowerCase()
      }) || []

      if (!error && regionReports.length > 0) {
        submittedCount = regionReports.length

        // Calculate average
        const totalScoreSum = regionReports.reduce((sum, r) => sum + (r.total_score || 0), 0)
        averageScore = Math.round(totalScoreSum / regionReports.length)

        // Top school
        const topReport = regionReports[0]
        if (topReport && topReport.sms_schools) {
          topSchool = {
            name: (topReport.sms_schools as any).name,
            score: topReport.total_score || 0
          }
        }

        // At-risk schools (below 400 score or needs_improvement rating)
        atRiskCount = regionReports.filter(r => 
          (r.total_score || 0) < 400 || r.rating_level === 'needs_improvement'
        ).length

        // Calculate submission trend for last 7 days
        const today = new Date()
        const last7Days: { date: string; count: number }[] = []
        for (let i = 6; i >= 0; i--) {
          const date = new Date(today)
          date.setDate(date.getDate() - i)
          const dateStr = date.toISOString().split('T')[0]
          const count = regionReports.filter(r => {
            if (!r.submitted_at) return false
            const submittedDate = new Date(r.submitted_at).toISOString().split('T')[0]
            return submittedDate === dateStr
          }).length
          last7Days.push({ date: dateStr.slice(5), count }) // Just MM-DD
        }
        submissionTrend = last7Days
      }

      // Calculate overdue and near deadline
      if (activePeriod.end_date) {
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
      const { data: previousPeriod } = await supabase
        .from('hmr_school_assessment_periods')
        .select('id')
        .neq('id', activePeriod.id)
        .lt('end_date', activePeriod.end_date || new Date().toISOString())
        .order('end_date', { ascending: false })
        .limit(1)
        .single()

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

    // Calculate national rank for this region
    let nationalRank: number | null = null
    let totalRegions = 0

    const { data: allRegions } = await supabase
      .from('sms_regions')
      .select('id, name')

    totalRegions = allRegions?.length || 0

    if (activePeriod && allRegions && allRegions.length > 0) {
      // Calculate average score for all regions
      const regionAvgScores: { regionId: string; avgScore: number }[] = []

      for (const region of allRegions) {
        const { data: regionSchools } = await supabase
          .from('sms_schools')
          .select('id')
          .eq('region_id', region.name)

        if (regionSchools && regionSchools.length > 0) {
          const { data: regionReports } = await supabase
            .from('hmr_school_assessment_reports')
            .select('total_score')
            .eq('period_id', activePeriod.id)
            .eq('status', 'submitted')
            .in('school_id', regionSchools.map(s => s.id))

          if (regionReports && regionReports.length > 0) {
            const avg = regionReports.reduce((sum, r) => sum + (r.total_score || 0), 0) / regionReports.length
            regionAvgScores.push({ regionId: region.name, avgScore: avg })
          }
        }
      }

      // Sort and find rank
      regionAvgScores.sort((a, b) => b.avgScore - a.avgScore)
      const rank = regionAvgScores.findIndex(r => r.regionId.toLowerCase() === regionId.toLowerCase()) + 1
      if (rank > 0) {
        nationalRank = rank
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
      averageScore,
      totalSchools: totalSchools || 0,
      submittedCount,
      submissionRate,
      topSchool,
      atRiskCount,
      trend: null,
      // NEW metrics
      overdueCount,
      nearDeadlineCount,
      submissionTrend,
      decliningSchools,
      nationalRank,
      totalRegions,
      weeklyVelocity,
    })
  } catch (error) {
    console.error('Error in regional-metrics:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
