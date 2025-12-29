import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleSupabaseClient } from "@/lib/supabase"
import {
  calculateAllCategoryScores,
  calculateTAPSAcademicsScore,
  calculateTAPSHealthSafetyScore,
  calculateTAPSLeadershipScore,
  calculateTAPSSchoolCultureScore,
  calculateTAPSSchoolInputsScore,
  calculateTAPSTeacherDevelopmentScore,
} from "@/features/school-assessment-reports/actions/scoring"
import {
  TAPS_RATING_THRESHOLDS,
  TAPS_SCORING_WEIGHTS,
  TAPS_TOTAL_MAX_SCORE,
  type TAPSRatingGrade,
} from "@/features/school-assessment-reports/types"

function coerceNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function getNextTAPSGradeInfo(totalScore: number): { pointsToNextRating: number | null; nextRatingName: string | null } {
  if (totalScore >= TAPS_RATING_THRESHOLDS.A.min) {
    return { pointsToNextRating: 0, nextRatingName: null }
  }
  if (totalScore >= TAPS_RATING_THRESHOLDS.B.min) {
    return { pointsToNextRating: TAPS_RATING_THRESHOLDS.A.min - totalScore, nextRatingName: 'Grade A' }
  }
  if (totalScore >= TAPS_RATING_THRESHOLDS.C.min) {
    return { pointsToNextRating: TAPS_RATING_THRESHOLDS.B.min - totalScore, nextRatingName: 'Grade B' }
  }
  if (totalScore >= TAPS_RATING_THRESHOLDS.D.min) {
    return { pointsToNextRating: TAPS_RATING_THRESHOLDS.C.min - totalScore, nextRatingName: 'Grade C' }
  }
  return { pointsToNextRating: TAPS_RATING_THRESHOLDS.D.min - totalScore, nextRatingName: 'Grade D' }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('schoolId')

    if (!schoolId) {
      return NextResponse.json({ error: "School ID required" }, { status: 400 })
    }

    const supabase = createServiceRoleSupabaseClient()

    // Get school info including region
    const { data: school } = await supabase
      .from('sms_schools')
      .select('id, name, region_id')
      .eq('id', schoolId)
      .single()

    // Get school's assessment reports
    const { data: reports, error } = await supabase
      .from('hmr_school_assessment_reports')
      .select(`
        id,
        total_score,
        rating_level,
        taps_rating_grade,
        school_type,
        status,
        submitted_at,
        created_at,
        academic_scores,
        attendance_scores,
        infrastructure_scores,
        teaching_quality_scores,
        management_scores,
        student_welfare_scores,
        community_scores,
        taps_school_inputs_scores,
        taps_leadership_scores,
        taps_academics_scores,
        taps_teacher_development_scores,
        taps_health_safety_scores,
        taps_school_culture_scores,
        hmr_school_assessment_periods(
          id,
          term_name,
          academic_year,
          end_date
        )
      `)
      .eq('school_id', schoolId)
      .eq('status', 'submitted')
      .order('submitted_at', { ascending: false })
      .limit(5)

    if (error) {
      console.error('Error fetching school reports:', error)
      return NextResponse.json({ error: "Failed to fetch metrics" }, { status: 500 })
    }

    // Calculate metrics
    const latestReport = reports?.[0]
    const previousReport = reports?.[1]

    const isTAPS = Boolean(
      latestReport && (
        latestReport.school_type === 'secondary' ||
        latestReport.taps_rating_grade ||
        latestReport.taps_academics_scores ||
        latestReport.taps_school_inputs_scores
      )
    )

    // Determine trend
    let trend: 'improving' | 'declining' | 'stable' | null = null
    if (latestReport && previousReport) {
      const scoreDiff = (latestReport.total_score || 0) - (previousReport.total_score || 0)
      if (scoreDiff > 20) trend = 'improving'
      else if (scoreDiff < -20) trend = 'declining'
      else trend = 'stable'
    }

    // Check if submitted this term (get current active period)
    const { data: activePeriod } = await supabase
      .from('hmr_school_assessment_periods')
      .select('id, term_name, end_date')
      .eq('is_active', true)
      .single()

    let hasSubmittedThisTerm = false
    let termName = activePeriod?.term_name || null
    let daysUntilDeadline: number | null = null

    if (activePeriod) {
      const { data: currentTermReport } = await supabase
        .from('hmr_school_assessment_reports')
        .select('id')
        .eq('school_id', schoolId)
        .eq('period_id', activePeriod.id)
        .eq('status', 'submitted')
        .single()
      
      hasSubmittedThisTerm = !!currentTermReport

      // Calculate days until deadline
      if (activePeriod.end_date && !hasSubmittedThisTerm) {
        const deadline = new Date(activePeriod.end_date)
        const today = new Date()
        const diffTime = deadline.getTime() - today.getTime()
        daysUntilDeadline = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      }
    }

    // NEW: Calculate regional rank
    let regionalRank: number | null = null
    let totalSchoolsInRegion = 0

    if (school?.region_id && activePeriod) {
      // Get all schools in region with their scores
      const { data: regionSchools } = await supabase
        .from('sms_schools')
        .select('id')
        .eq('region_id', school.region_id)

      totalSchoolsInRegion = regionSchools?.length || 0

      if (totalSchoolsInRegion > 0) {
        // Get scores for all schools in region for current period
        const { data: regionReports } = await supabase
          .from('hmr_school_assessment_reports')
          .select('school_id, total_score')
          .eq('period_id', activePeriod.id)
          .eq('status', 'submitted')
          .in('school_id', regionSchools?.map(s => s.id) || [])
          .order('total_score', { ascending: false })

        if (regionReports && regionReports.length > 0) {
          const rank = regionReports.findIndex(r => r.school_id === schoolId) + 1
          if (rank > 0) {
            regionalRank = rank
          }
        }
      }
    }

    // Calculate category scores for radar chart
    const categoryScores: { category: string; score: number; max: number }[] = []

    if (latestReport) {
      if (isTAPS) {
        const schoolInputsEarned =
          coerceNumber((latestReport.taps_school_inputs_scores as any)?.total) ||
          calculateTAPSSchoolInputsScore((latestReport.taps_school_inputs_scores as any) || {})
        const leadershipEarned =
          coerceNumber((latestReport.taps_leadership_scores as any)?.total) ||
          calculateTAPSLeadershipScore((latestReport.taps_leadership_scores as any) || {})
        const academicsEarned =
          coerceNumber((latestReport.taps_academics_scores as any)?.total) ||
          calculateTAPSAcademicsScore((latestReport.taps_academics_scores as any) || {})
        const teacherDevEarned =
          coerceNumber((latestReport.taps_teacher_development_scores as any)?.total) ||
          calculateTAPSTeacherDevelopmentScore((latestReport.taps_teacher_development_scores as any) || {})
        const healthSafetyEarned =
          coerceNumber((latestReport.taps_health_safety_scores as any)?.total) ||
          calculateTAPSHealthSafetyScore((latestReport.taps_health_safety_scores as any) || {})
        const schoolCultureEarned =
          coerceNumber((latestReport.taps_school_culture_scores as any)?.total) ||
          calculateTAPSSchoolCultureScore((latestReport.taps_school_culture_scores as any) || {})

        categoryScores.push(
          { category: 'School Inputs & Operations', score: schoolInputsEarned, max: TAPS_SCORING_WEIGHTS.SCHOOL_INPUTS_OPERATIONS },
          { category: 'Leadership', score: leadershipEarned, max: TAPS_SCORING_WEIGHTS.LEADERSHIP },
          { category: 'Academics', score: academicsEarned, max: TAPS_SCORING_WEIGHTS.ACADEMICS },
          { category: 'Teacher Development', score: teacherDevEarned, max: TAPS_SCORING_WEIGHTS.TEACHER_DEVELOPMENT },
          { category: 'Health & Safety', score: healthSafetyEarned, max: TAPS_SCORING_WEIGHTS.HEALTH_SAFETY },
          { category: 'School Culture', score: schoolCultureEarned, max: TAPS_SCORING_WEIGHTS.SCHOOL_CULTURE },
        )
      } else {
        // Derive demo totals from the raw score JSON to support older reports
        // that may not have persisted `{ total: <number> }` in the JSONB columns.
        const demoTotals = calculateAllCategoryScores({
          academic: (latestReport.academic_scores as any) || {},
          attendance: (latestReport.attendance_scores as any) || {},
          infrastructure: (latestReport.infrastructure_scores as any) || {},
          teachingQuality: (latestReport.teaching_quality_scores as any) || {},
          management: (latestReport.management_scores as any) || {},
          studentWelfare: (latestReport.student_welfare_scores as any) || {},
          community: (latestReport.community_scores as any) || {},
        })

        categoryScores.push(
          { category: 'Academic', score: coerceNumber(demoTotals.academic), max: 300 },
          { category: 'Attendance', score: coerceNumber(demoTotals.attendance), max: 150 },
          { category: 'Infrastructure', score: coerceNumber(demoTotals.infrastructure), max: 150 },
          { category: 'Teaching', score: coerceNumber(demoTotals.teaching_quality), max: 150 },
          { category: 'Management', score: coerceNumber(demoTotals.management), max: 100 },
          { category: 'Welfare', score: coerceNumber(demoTotals.student_welfare), max: 100 },
          { category: 'Community', score: coerceNumber(demoTotals.community), max: 50 },
        )
      }
    }

    // NEW: Find lowest category and calculate points to next rating
    let lowestCategory: { name: string; percentage: number } | null = null
    let pointsToNextRating: number | null = null
    let nextRatingName: string | null = null

    if (categoryScores.length > 0) {
      const categoryPercentages = categoryScores.map(c => ({
        name: c.category,
        percentage: c.max > 0 ? Math.round((c.score / c.max) * 100) : 0
      }))
      const lowest = categoryPercentages.reduce((min, c) => c.percentage < min.percentage ? c : min, categoryPercentages[0])
      lowestCategory = lowest
    }

    const currentScore = latestReport?.total_score || 0

    if (isTAPS) {
      const nextInfo = getNextTAPSGradeInfo(currentScore)
      pointsToNextRating = nextInfo.pointsToNextRating
      nextRatingName = nextInfo.nextRatingName
    } else {
      const ratingThresholds = [
        { threshold: 850, name: 'Outstanding' },
        { threshold: 700, name: 'Very Good' },
        { threshold: 550, name: 'Good' },
        { threshold: 400, name: 'Satisfactory' },
      ]

      for (const rating of ratingThresholds) {
        if (currentScore < rating.threshold) {
          pointsToNextRating = rating.threshold - currentScore
          nextRatingName = rating.name
          break
        }
      }
    }

    return NextResponse.json({
      schoolName: school?.name || '',
      currentScore: latestReport?.total_score || null,
      maxScore: isTAPS ? TAPS_TOTAL_MAX_SCORE : 1000,
      ratingLevel: (isTAPS ? (latestReport?.taps_rating_grade as TAPSRatingGrade | null) : (latestReport?.rating_level || null)) as any,
      trend,
      lastAssessmentDate: latestReport?.submitted_at || null,
      hasSubmittedThisTerm,
      termName,
      // NEW metrics
      daysUntilDeadline,
      regionalRank,
      totalSchoolsInRegion,
      lowestCategory,
      pointsToNextRating,
      nextRatingName,
      categoryScores,
    })
  } catch (error) {
    console.error('Error in head-teacher-metrics:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
