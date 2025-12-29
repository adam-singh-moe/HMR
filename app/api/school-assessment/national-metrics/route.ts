import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleSupabaseClient } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleSupabaseClient()

    // Get total schools
    const { count: totalSchools } = await supabase
      .from('sms_schools')
      .select('*', { count: 'exact', head: true })

    // Get active assessment period
    const { data: activePeriod } = await supabase
      .from('hmr_school_assessment_periods')
      .select('id, end_date')
      .eq('is_active', true)
      .single()

    let totalSubmitted = 0
    let nationalAverage = 0
    let outstandingCount = 0
    let needsImprovementCount = 0
    let topRegion: { name: string; score: number } | null = null
    let lowestRegion: { name: string; score: number } | null = null
    let regionalPerformance: { region: string; score: number; submitted: number; total: number }[] = []
    let weeklyTrend: { week: string; submissions: number }[] = []
    let criticalRegionsCount = 0
    let neverAssessedCount = 0
    let nationalTrend: 'improving' | 'declining' | 'stable' | null = null
    let weeklyChange = 0

    if (activePeriod) {
      // Get all submitted reports for current period
      const { data: reports, error } = await supabase
        .from('hmr_school_assessment_reports')
        .select(`
          id,
          school_id,
          total_score,
          rating_level,
          submitted_at,
          sms_schools!inner(id, name, region_id, sms_regions(id, name))
        `)
        .eq('period_id', activePeriod.id)
        .eq('status', 'submitted')

      if (!error && reports) {
        totalSubmitted = reports.length

        if (reports.length > 0) {
          // Calculate national average
          const totalScoreSum = reports.reduce((sum, r) => sum + (r.total_score || 0), 0)
          nationalAverage = Math.round(totalScoreSum / reports.length)

          // Count ratings
          outstandingCount = reports.filter(r => r.rating_level === 'outstanding').length
          needsImprovementCount = reports.filter(r => r.rating_level === 'needs_improvement').length

          // Calculate regional averages and build performance data
          const regionScores: Record<string, { name: string; scores: number[]; submitted: number; total: number }> = {}
          
          reports.forEach(r => {
            const school = r.sms_schools as any
            const region = school?.sms_regions
            if (region) {
              if (!regionScores[region.id]) {
                regionScores[region.id] = { name: region.name, scores: [], submitted: 0, total: 0 }
              }
              regionScores[region.id].scores.push(r.total_score || 0)
              regionScores[region.id].submitted++
            }
          })

          // Get total schools per region
          const { data: allRegions } = await supabase
            .from('sms_regions')
            .select('id, name')

          for (const region of allRegions || []) {
            const { count } = await supabase
              .from('sms_schools')
              .select('*', { count: 'exact', head: true })
              .eq('region_id', region.name)

            if (regionScores[region.id]) {
              regionScores[region.id].total = count || 0
            } else {
              regionScores[region.id] = { 
                name: region.name, 
                scores: [], 
                submitted: 0, 
                total: count || 0 
              }
            }
          }

          // Find top and lowest regions, build regional performance data
          let maxAvg = -1
          let minAvg = Infinity
          
          Object.entries(regionScores).forEach(([regionId, data]) => {
            const avg = data.scores.length > 0 
              ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
              : 0
            
            regionalPerformance.push({
              region: data.name,
              score: avg,
              submitted: data.submitted,
              total: data.total
            })

            if (data.scores.length > 0) {
              if (avg > maxAvg) {
                maxAvg = avg
                topRegion = { name: data.name, score: avg }
              }
              if (avg < minAvg) {
                minAvg = avg
                lowestRegion = { name: data.name, score: avg }
              }
            }

            // Count critical regions (avg score below 400 or less than 30% submission)
            if (avg < 400 || (data.total > 0 && (data.submitted / data.total) < 0.3)) {
              criticalRegionsCount++
            }
          })

          // Calculate weekly submission trend (last 4 weeks)
          const today = new Date()
          for (let i = 3; i >= 0; i--) {
            const weekStart = new Date(today)
            weekStart.setDate(weekStart.getDate() - (i + 1) * 7)
            const weekEnd = new Date(today)
            weekEnd.setDate(weekEnd.getDate() - i * 7)

            const weekSubmissions = reports.filter(r => {
              if (!r.submitted_at) return false
              const submittedDate = new Date(r.submitted_at)
              return submittedDate >= weekStart && submittedDate < weekEnd
            }).length

            weeklyTrend.push({
              week: `Week ${4 - i}`,
              submissions: weekSubmissions
            })
          }

          // Calculate weekly change
          if (weeklyTrend.length >= 2) {
            const lastWeek = weeklyTrend[weeklyTrend.length - 1].submissions
            const prevWeek = weeklyTrend[weeklyTrend.length - 2].submissions
            if (prevWeek > 0) {
              weeklyChange = Math.round(((lastWeek - prevWeek) / prevWeek) * 100)
              nationalTrend = weeklyChange > 5 ? 'improving' : weeklyChange < -5 ? 'declining' : 'stable'
            } else if (lastWeek > 0) {
              weeklyChange = 100
              nationalTrend = 'improving'
            }
          }
        }
      }

      // Count schools that have never submitted
      const { data: allSchools } = await supabase
        .from('sms_schools')
        .select('id')

      if (allSchools) {
        const submittedSchoolIds = new Set(
          (await supabase
            .from('hmr_school_assessment_reports')
            .select('school_id')
            .eq('status', 'submitted'))
            .data?.map(r => r.school_id) || []
        )
        neverAssessedCount = allSchools.filter(s => !submittedSchoolIds.has(s.id)).length
      }
    }

    // Get total regions count
    const { count: totalRegions } = await supabase
      .from('sms_regions')
      .select('*', { count: 'exact', head: true })

    const submissionRate = totalSchools ? Math.round((totalSubmitted / totalSchools) * 100) : 0

    return NextResponse.json({
      nationalAverage,
      totalSchools: totalSchools || 0,
      totalSubmitted,
      submissionRate,
      totalRegions: totalRegions || 0,
      topRegion,
      lowestRegion,
      outstandingCount,
      needsImprovementCount,
      // NEW metrics
      regionalPerformance,
      weeklyTrend,
      criticalRegionsCount,
      neverAssessedCount,
      nationalTrend,
      weeklyChange,
    })
  } catch (error) {
    console.error('Error in national-metrics:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
