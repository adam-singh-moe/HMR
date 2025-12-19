"use server"

import { createServiceRoleSupabaseClient } from "@/lib/supabase"
import { getUser } from "@/app/actions/auth"
import type {
  CategoryName,
  RatingLevel,
} from "../types"
import { RATING_THRESHOLDS, SCORING_WEIGHTS, CATEGORY_NAMES } from "../types"

async function assertCanAccessSchool(schoolId: string) {
  const user = await getUser()
  if (!user) {
    return { ok: false as const, error: 'You must be logged in.' }
  }

  if (user.role === 'Admin' || user.role === 'Education Official') {
    return { ok: true as const, user }
  }

  const supabase = createServiceRoleSupabaseClient()

  if (user.role === 'Head Teacher') {
    if (user.school_id && user.school_id === schoolId) {
      return { ok: true as const, user }
    }

    if (!user.school_id && user.school_name) {
      const { data: school, error: schoolError } = await supabase
        .from('sms_schools')
        .select('id')
        .eq('name', user.school_name)
        .single()
      if (!schoolError && school?.id === schoolId) {
        return { ok: true as const, user }
      }
    }

    return { ok: false as const, error: 'You do not have permission to view this school.' }
  }

  if (user.role === 'Regional Officer') {
    const { data: school, error: schoolError } = await supabase
      .from('sms_schools')
      .select('region_id')
      .eq('id', schoolId)
      .single()

    if (schoolError || !school) {
      return { ok: false as const, error: 'School not found.' }
    }

    if (school.region_id !== user.region) {
      return { ok: false as const, error: 'You do not have permission to view this school.' }
    }

    return { ok: true as const, user }
  }

  return { ok: false as const, error: 'You do not have permission to view this school.' }
}

// ============================================================================
// TYPES - Local analytics-specific types
// ============================================================================

interface SchoolRanking {
  schoolId: string
  schoolName: string
  regionId: string
  regionName: string
  totalScore: number
  ratingLevel: RatingLevel
  rank: number
}

interface CategoryPerformance {
  category: CategoryName
  categoryLabel: string
  averageScore: number
  maxScore: number
  averagePercentage: number
  schoolsAboveAverage: number
  schoolsBelowAverage: number
}

interface TrendData {
  period: string
  academicYear: string
  termName: string
  averageScore: number
  submissionCount: number
}

interface ComparisonData {
  entityId: string
  entityName: string
  totalScore: number
  categoryScores: Record<CategoryName, number>
  ratingLevel: RatingLevel
}

// Analytics-specific stats interfaces (different from DB view types)
interface AnalyticsRegionalStats {
  regionId: string
  regionName: string
  totalSchools: number
  submittedCount: number
  averageScore: number
  ratingDistribution: Record<RatingLevel, number>
  categoryAverages: Record<CategoryName, number>
}

interface AnalyticsNationalStats {
  totalRegions: number
  totalSchools: number
  submittedCount: number
  nationalAverageScore: number
  topPerformingRegion: { regionId: string; regionName: string; averageScore: number } | null
  ratingDistribution: Record<RatingLevel, number>
  categoryAverages: Record<CategoryName, number>
  regionComparison: { regionId: string; regionName: string; averageScore: number; submittedCount: number }[]
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculates rating level based on total score
 */
function calculateRating(totalScore: number): RatingLevel {
  if (totalScore >= RATING_THRESHOLDS.OUTSTANDING.min) return 'outstanding'
  if (totalScore >= RATING_THRESHOLDS.VERY_GOOD.min) return 'very_good'
  if (totalScore >= RATING_THRESHOLDS.GOOD.min) return 'good'
  if (totalScore >= RATING_THRESHOLDS.SATISFACTORY.min) return 'satisfactory'
  return 'needs_improvement'
}

/**
 * Calculates average of numbers array
 */
function calculateAverage(numbers: number[]): number {
  if (numbers.length === 0) return 0
  return Math.round(numbers.reduce((a, b) => a + b, 0) / numbers.length)
}

/**
 * Calculates percentage
 */
function calculatePercentage(value: number, max: number): number {
  if (max === 0) return 0
  return Math.round((value / max) * 100)
}

/**
 * Parses a synthetic term-window period ID into its components
 * Format: "term-window-{academicYear}-{termNumber}"
 * Example: "term-window-2024-2025-2" -> { academicYear: "2024-2025", termNumber: 2 }
 */
function parseTermWindowPeriodId(periodId: string): { academicYear: string; termNumber: number } | null {
  if (!periodId.startsWith('term-window-')) return null
  
  const parts = periodId.replace('term-window-', '').split('-')
  // Should be like ["2024", "2025", "2"] for academic year "2024-2025" term 2
  if (parts.length >= 3) {
    const termNumber = parseInt(parts[parts.length - 1], 10)
    const academicYear = parts.slice(0, -1).join('-') // e.g., "2024-2025"
    return { academicYear, termNumber }
  }
  return null
}

/**
 * Applies period filtering to a query, handling both real period_id and synthetic term-window IDs
 */
function applyPeriodFilter(query: any, periodId: string): any {
  const termWindowInfo = parseTermWindowPeriodId(periodId)
  
  if (termWindowInfo) {
    // Synthetic period from term window - filter by academic_year and term_name
    const termNameMap: Record<number, string> = {
      1: 'First Term',
      2: 'Second Term', 
      3: 'Third Term'
    }
    const termName = termNameMap[termWindowInfo.termNumber] || `Term ${termWindowInfo.termNumber}`
    
    return query
      .eq('academic_year', termWindowInfo.academicYear)
      .eq('term_name', termName)
  } else {
    // Real period_id from old system
    return query.eq('period_id', periodId)
  }
}

// ============================================================================
// REGIONAL ANALYTICS
// ============================================================================

/**
 * Gets comprehensive regional statistics for a specific period
 */
export async function getRegionalStatistics(
  regionId: string,
  periodId?: string
): Promise<{ stats: AnalyticsRegionalStats | null; error: string | null }> {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    // Get region info
    const { data: region, error: regionError } = await supabase
      .from('sms_regions')
      .select('id, name')
      .eq('id', regionId)
      .single()
    
    if (regionError || !region) {
      return { stats: null, error: 'Region not found.' }
    }
    
    // Build query for submitted reports
    let query = supabase
      .from('school_assessment_reports')
      .select(`
        id,
        total_score,
        rating_level,
        academic_scores,
        attendance_scores,
        infrastructure_scores,
        teaching_quality_scores,
        management_scores,
        student_welfare_scores,
        community_scores,
        sms_schools!inner(id, name, region_id)
      `)
      .eq('status', 'submitted')
      .eq('sms_schools.region_id', regionId)
    
    if (periodId) {
      query = applyPeriodFilter(query, periodId)
    }
    
    const { data: reports, error: reportsError } = await query
    
    if (reportsError) {
      console.error('Error fetching regional reports:', reportsError)
      return { stats: null, error: 'Failed to fetch reports.' }
    }
    
    if (!reports || reports.length === 0) {
      return {
        stats: {
          regionId,
          regionName: region.name,
          totalSchools: 0,
          submittedCount: 0,
          averageScore: 0,
          ratingDistribution: {
            outstanding: 0,
            very_good: 0,
            good: 0,
            satisfactory: 0,
            needs_improvement: 0,
          },
          categoryAverages: {
            academic: 0,
            attendance: 0,
            infrastructure: 0,
            teaching_quality: 0,
            management: 0,
            student_welfare: 0,
            community: 0,
          },
        },
        error: null,
      }
    }
    
    // Get total schools in region
    const { count: totalSchools } = await supabase
      .from('sms_schools')
      .select('id', { count: 'exact', head: true })
      .eq('region_id', regionId)
    
    // Calculate statistics
    const scores = reports.map(r => r.total_score || 0)
    const averageScore = calculateAverage(scores)
    
    // Rating distribution
    const ratingDistribution: Record<RatingLevel, number> = {
      outstanding: 0,
      very_good: 0,
      good: 0,
      satisfactory: 0,
      needs_improvement: 0,
    }
    
    reports.forEach(r => {
      const rating = r.rating_level as RatingLevel
      if (rating && ratingDistribution[rating] !== undefined) {
        ratingDistribution[rating]++
      }
    })
    
    // Category averages
    const categoryTotals: Record<CategoryName, number[]> = {
      academic: [],
      attendance: [],
      infrastructure: [],
      teaching_quality: [],
      management: [],
      student_welfare: [],
      community: [],
    }
    
    reports.forEach(r => {
      if (r.academic_scores?.total) categoryTotals.academic.push(r.academic_scores.total)
      if (r.attendance_scores?.total) categoryTotals.attendance.push(r.attendance_scores.total)
      if (r.infrastructure_scores?.total) categoryTotals.infrastructure.push(r.infrastructure_scores.total)
      if (r.teaching_quality_scores?.total) categoryTotals.teaching_quality.push(r.teaching_quality_scores.total)
      if (r.management_scores?.total) categoryTotals.management.push(r.management_scores.total)
      if (r.student_welfare_scores?.total) categoryTotals.student_welfare.push(r.student_welfare_scores.total)
      if (r.community_scores?.total) categoryTotals.community.push(r.community_scores.total)
    })
    
    const categoryAverages: Record<CategoryName, number> = {
      academic: calculateAverage(categoryTotals.academic),
      attendance: calculateAverage(categoryTotals.attendance),
      infrastructure: calculateAverage(categoryTotals.infrastructure),
      teaching_quality: calculateAverage(categoryTotals.teaching_quality),
      management: calculateAverage(categoryTotals.management),
      student_welfare: calculateAverage(categoryTotals.student_welfare),
      community: calculateAverage(categoryTotals.community),
    }
    
    return {
      stats: {
        regionId,
        regionName: region.name,
        totalSchools: totalSchools || 0,
        submittedCount: reports.length,
        averageScore,
        ratingDistribution,
        categoryAverages,
      },
      error: null,
    }
  } catch (error) {
    console.error('Error in getRegionalStatistics:', error)
    return { stats: null, error: 'An unexpected error occurred.' }
  }
}

/**
 * Gets school rankings within a region
 */
export async function getRegionalSchoolRankings(
  regionId: string,
  periodId?: string,
  limit: number = 20
): Promise<{ rankings: SchoolRanking[]; error: string | null }> {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    let query = supabase
      .from('school_assessment_reports')
      .select(`
        id,
        total_score,
        rating_level,
        sms_schools!inner(id, name, region_id, sms_regions(name))
      `)
      .eq('status', 'submitted')
      .eq('sms_schools.region_id', regionId)
      .order('total_score', { ascending: false })
      .limit(limit)
    
    if (periodId) {
      query = applyPeriodFilter(query, periodId)
    }
    
    const { data: reports, error } = await query
    
    if (error) {
      console.error('Error fetching regional rankings:', error)
      return { rankings: [], error: 'Failed to fetch rankings.' }
    }
    
    const rankings: SchoolRanking[] = (reports || []).map((r: any, index: number) => ({
      schoolId: r.sms_schools?.id || '',
      schoolName: r.sms_schools?.name || '',
      regionId: r.sms_schools?.region_id || '',
      regionName: r.sms_schools?.sms_regions?.name || '',
      totalScore: r.total_score || 0,
      ratingLevel: r.rating_level as RatingLevel,
      rank: index + 1,
    }))
    
    return { rankings, error: null }
  } catch (error) {
    console.error('Error in getRegionalSchoolRankings:', error)
    return { rankings: [], error: 'An unexpected error occurred.' }
  }
}

// ============================================================================
// NATIONAL ANALYTICS
// ============================================================================

/**
 * Gets comprehensive national statistics
 */
export async function getNationalStatistics(
  periodId?: string
): Promise<{ stats: AnalyticsNationalStats | null; error: string | null }> {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    // Build query
    let query = supabase
      .from('school_assessment_reports')
      .select(`
        id,
        total_score,
        rating_level,
        academic_scores,
        attendance_scores,
        infrastructure_scores,
        teaching_quality_scores,
        management_scores,
        student_welfare_scores,
        community_scores,
        sms_schools(id, name, region_id, sms_regions(id, name))
      `)
      .eq('status', 'submitted')
    
    if (periodId) {
      query = applyPeriodFilter(query, periodId)
    }
    
    const { data: reports, error: reportsError } = await query
    
    if (reportsError) {
      console.error('Error fetching national reports:', reportsError)
      return { stats: null, error: 'Failed to fetch reports.' }
    }
    
    // Get all regions
    const { data: regions } = await supabase
      .from('sms_regions')
      .select('id, name')
    
    // Get total schools
    const { count: totalSchools } = await supabase
      .from('sms_schools')
      .select('id', { count: 'exact', head: true })
    
    if (!reports || reports.length === 0) {
      return {
        stats: {
          totalRegions: regions?.length || 0,
          totalSchools: totalSchools || 0,
          submittedCount: 0,
          nationalAverageScore: 0,
          topPerformingRegion: null,
          ratingDistribution: {
            outstanding: 0,
            very_good: 0,
            good: 0,
            satisfactory: 0,
            needs_improvement: 0,
          },
          categoryAverages: {
            academic: 0,
            attendance: 0,
            infrastructure: 0,
            teaching_quality: 0,
            management: 0,
            student_welfare: 0,
            community: 0,
          },
          regionComparison: [],
        },
        error: null,
      }
    }
    
    // Calculate national average
    const scores = reports.map(r => r.total_score || 0)
    const nationalAverageScore = calculateAverage(scores)
    
    // Rating distribution
    const ratingDistribution: Record<RatingLevel, number> = {
      outstanding: 0,
      very_good: 0,
      good: 0,
      satisfactory: 0,
      needs_improvement: 0,
    }
    
    reports.forEach(r => {
      const rating = r.rating_level as RatingLevel
      if (rating && ratingDistribution[rating] !== undefined) {
        ratingDistribution[rating]++
      }
    })
    
    // Category averages
    const categoryTotals: Record<CategoryName, number[]> = {
      academic: [],
      attendance: [],
      infrastructure: [],
      teaching_quality: [],
      management: [],
      student_welfare: [],
      community: [],
    }
    
    reports.forEach(r => {
      if (r.academic_scores?.total) categoryTotals.academic.push(r.academic_scores.total)
      if (r.attendance_scores?.total) categoryTotals.attendance.push(r.attendance_scores.total)
      if (r.infrastructure_scores?.total) categoryTotals.infrastructure.push(r.infrastructure_scores.total)
      if (r.teaching_quality_scores?.total) categoryTotals.teaching_quality.push(r.teaching_quality_scores.total)
      if (r.management_scores?.total) categoryTotals.management.push(r.management_scores.total)
      if (r.student_welfare_scores?.total) categoryTotals.student_welfare.push(r.student_welfare_scores.total)
      if (r.community_scores?.total) categoryTotals.community.push(r.community_scores.total)
    })
    
    const categoryAverages: Record<CategoryName, number> = {
      academic: calculateAverage(categoryTotals.academic),
      attendance: calculateAverage(categoryTotals.attendance),
      infrastructure: calculateAverage(categoryTotals.infrastructure),
      teaching_quality: calculateAverage(categoryTotals.teaching_quality),
      management: calculateAverage(categoryTotals.management),
      student_welfare: calculateAverage(categoryTotals.student_welfare),
      community: calculateAverage(categoryTotals.community),
    }
    
    // Region comparison
    const regionScores: Record<string, { name: string; scores: number[] }> = {}
    
    reports.forEach((r: any) => {
      const regionId = r.sms_schools?.region_id
      const regionName = r.sms_schools?.sms_regions?.name
      if (regionId && regionName) {
        if (!regionScores[regionId]) {
          regionScores[regionId] = { name: regionName, scores: [] }
        }
        regionScores[regionId].scores.push(r.total_score || 0)
      }
    })
    
    const regionComparison = Object.entries(regionScores).map(([regionId, data]) => ({
      regionId,
      regionName: data.name,
      averageScore: calculateAverage(data.scores),
      submittedCount: data.scores.length,
    }))
    
    // Find top performing region
    const topPerformingRegion = regionComparison.length > 0
      ? regionComparison.reduce((top, current) => 
          current.averageScore > top.averageScore ? current : top
        )
      : null
    
    return {
      stats: {
        totalRegions: regions?.length || 0,
        totalSchools: totalSchools || 0,
        submittedCount: reports.length,
        nationalAverageScore,
        topPerformingRegion: topPerformingRegion 
          ? { regionId: topPerformingRegion.regionId, regionName: topPerformingRegion.regionName, averageScore: topPerformingRegion.averageScore }
          : null,
        ratingDistribution,
        categoryAverages,
        regionComparison,
      },
      error: null,
    }
  } catch (error) {
    console.error('Error in getNationalStatistics:', error)
    return { stats: null, error: 'An unexpected error occurred.' }
  }
}

/**
 * Gets top performing schools nationally
 */
export async function getNationalSchoolRankings(
  periodId?: string,
  limit: number = 20
): Promise<{ rankings: SchoolRanking[]; error: string | null }> {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    let query = supabase
      .from('school_assessment_reports')
      .select(`
        id,
        total_score,
        rating_level,
        sms_schools(id, name, region_id, sms_regions(name))
      `)
      .eq('status', 'submitted')
      .order('total_score', { ascending: false })
      .limit(limit)
    
    if (periodId) {
      query = applyPeriodFilter(query, periodId)
    }
    
    const { data: reports, error } = await query
    
    if (error) {
      console.error('Error fetching national rankings:', error)
      return { rankings: [], error: 'Failed to fetch rankings.' }
    }
    
    const rankings: SchoolRanking[] = (reports || []).map((r: any, index: number) => ({
      schoolId: r.sms_schools?.id || '',
      schoolName: r.sms_schools?.name || '',
      regionId: r.sms_schools?.region_id || '',
      regionName: r.sms_schools?.sms_regions?.name || '',
      totalScore: r.total_score || 0,
      ratingLevel: r.rating_level as RatingLevel,
      rank: index + 1,
    }))
    
    return { rankings, error: null }
  } catch (error) {
    console.error('Error in getNationalSchoolRankings:', error)
    return { rankings: [], error: 'An unexpected error occurred.' }
  }
}

// ============================================================================
// TREND ANALYTICS
// ============================================================================

/**
 * Gets score trends over time for a school
 */
export async function getSchoolTrends(
  schoolId: string,
  limit: number = 9 // Last 3 academic years (3 terms each)
): Promise<{ trends: TrendData[]; error: string | null }> {
  try {
    const access = await assertCanAccessSchool(schoolId)
    if (!access.ok) {
      return { trends: [], error: access.error }
    }

    const supabase = createServiceRoleSupabaseClient()
    
    const { data: reports, error } = await supabase
      .from('school_assessment_reports')
      .select(`
        total_score,
        school_assessment_periods(academic_year, term_name, term_sequence)
      `)
      .eq('school_id', schoolId)
      .eq('status', 'submitted')
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) {
      console.error('Error fetching school trends:', error)
      return { trends: [], error: 'Failed to fetch trends.' }
    }
    
    const trends: TrendData[] = (reports || [])
      .filter((r: any) => r.school_assessment_periods)
      .map((r: any) => ({
        period: `${r.school_assessment_periods?.academic_year} - ${r.school_assessment_periods?.term_name}`,
        academicYear: r.school_assessment_periods?.academic_year || '',
        termName: r.school_assessment_periods?.term_name || '',
        averageScore: r.total_score || 0,
        submissionCount: 1,
      }))
      .reverse() // Oldest first for chart display
    
    return { trends, error: null }
  } catch (error) {
    console.error('Error in getSchoolTrends:', error)
    return { trends: [], error: 'An unexpected error occurred.' }
  }
}

/**
 * Gets regional trend data over time
 */
export async function getRegionalTrends(
  regionId: string,
  limit: number = 9
): Promise<{ trends: TrendData[]; error: string | null }> {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    // Get periods with reports for this region
    const { data: reports, error } = await supabase
      .from('school_assessment_reports')
      .select(`
        total_score,
        period_id,
        school_assessment_periods(academic_year, term_name, term_sequence),
        sms_schools!inner(region_id)
      `)
      .eq('status', 'submitted')
      .eq('sms_schools.region_id', regionId)
    
    if (error) {
      console.error('Error fetching regional trends:', error)
      return { trends: [], error: 'Failed to fetch trends.' }
    }
    
    // Group by period
    const periodGroups: Record<string, {
      academicYear: string
      termName: string
      termSequence: number
      scores: number[]
    }> = {}
    
    ;(reports || []).forEach((r: any) => {
      const periodId = r.period_id
      if (periodId && r.school_assessment_periods) {
        if (!periodGroups[periodId]) {
          periodGroups[periodId] = {
            academicYear: r.school_assessment_periods?.academic_year || '',
            termName: r.school_assessment_periods?.term_name || '',
            termSequence: r.school_assessment_periods?.term_sequence || 0,
            scores: [],
          }
        }
        periodGroups[periodId].scores.push(r.total_score || 0)
      }
    })
    
    // Convert to trends array and sort
    const trends: TrendData[] = Object.entries(periodGroups)
      .map(([periodId, data]) => ({
        period: `${data.academicYear} - ${data.termName}`,
        academicYear: data.academicYear,
        termName: data.termName,
        averageScore: calculateAverage(data.scores),
        submissionCount: data.scores.length,
      }))
      .sort((a, b) => {
        // Sort by academic year, then term
        if (a.academicYear !== b.academicYear) {
          return a.academicYear.localeCompare(b.academicYear)
        }
        const termOrder = ['September-December', 'January-March', 'April-July']
        return termOrder.indexOf(a.termName) - termOrder.indexOf(b.termName)
      })
      .slice(-limit) // Take most recent
    
    return { trends, error: null }
  } catch (error) {
    console.error('Error in getRegionalTrends:', error)
    return { trends: [], error: 'An unexpected error occurred.' }
  }
}

/**
 * Gets national trend data over time
 */
export async function getNationalTrends(
  limit: number = 9
): Promise<{ trends: TrendData[]; error: string | null }> {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    const { data: reports, error } = await supabase
      .from('school_assessment_reports')
      .select(`
        total_score,
        period_id,
        school_assessment_periods(academic_year, term_name, term_sequence)
      `)
      .eq('status', 'submitted')
    
    if (error) {
      console.error('Error fetching national trends:', error)
      return { trends: [], error: 'Failed to fetch trends.' }
    }
    
    // Group by period
    const periodGroups: Record<string, {
      academicYear: string
      termName: string
      termSequence: number
      scores: number[]
    }> = {}
    
    ;(reports || []).forEach((r: any) => {
      const periodId = r.period_id
      if (periodId && r.school_assessment_periods) {
        if (!periodGroups[periodId]) {
          periodGroups[periodId] = {
            academicYear: r.school_assessment_periods?.academic_year || '',
            termName: r.school_assessment_periods?.term_name || '',
            termSequence: r.school_assessment_periods?.term_sequence || 0,
            scores: [],
          }
        }
        periodGroups[periodId].scores.push(r.total_score || 0)
      }
    })
    
    // Convert to trends array and sort
    const trends: TrendData[] = Object.entries(periodGroups)
      .map(([periodId, data]) => ({
        period: `${data.academicYear} - ${data.termName}`,
        academicYear: data.academicYear,
        termName: data.termName,
        averageScore: calculateAverage(data.scores),
        submissionCount: data.scores.length,
      }))
      .sort((a, b) => {
        if (a.academicYear !== b.academicYear) {
          return a.academicYear.localeCompare(b.academicYear)
        }
        const termOrder = ['September-December', 'January-March', 'April-July']
        return termOrder.indexOf(a.termName) - termOrder.indexOf(b.termName)
      })
      .slice(-limit)
    
    return { trends, error: null }
  } catch (error) {
    console.error('Error in getNationalTrends:', error)
    return { trends: [], error: 'An unexpected error occurred.' }
  }
}

// ============================================================================
// CATEGORY ANALYTICS
// ============================================================================

/**
 * Gets detailed category performance analysis
 */
export async function getCategoryPerformance(
  periodId?: string,
  regionId?: string
): Promise<{ performance: CategoryPerformance[]; error: string | null }> {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    let query = supabase
      .from('school_assessment_reports')
      .select(`
        academic_scores,
        attendance_scores,
        infrastructure_scores,
        teaching_quality_scores,
        management_scores,
        student_welfare_scores,
        community_scores,
        sms_schools(region_id)
      `)
      .eq('status', 'submitted')
    
    if (periodId) {
      query = applyPeriodFilter(query, periodId)
    }
    
    if (regionId) {
      query = query.eq('sms_schools.region_id', regionId)
    }
    
    const { data: reports, error } = await query
    
    if (error) {
      console.error('Error fetching category performance:', error)
      return { performance: [], error: 'Failed to fetch data.' }
    }
    
    if (!reports || reports.length === 0) {
      return { performance: [], error: null }
    }
    
    // Calculate performance for each category
    const categories: CategoryName[] = [
      'academic', 'attendance', 'infrastructure',
      'teaching_quality', 'management', 'student_welfare', 'community'
    ]
    
    const scoreKeyMap: Record<CategoryName, string> = {
      academic: 'academic_scores',
      attendance: 'attendance_scores',
      infrastructure: 'infrastructure_scores',
      teaching_quality: 'teaching_quality_scores',
      management: 'management_scores',
      student_welfare: 'student_welfare_scores',
      community: 'community_scores',
    }
    
    const maxScoreMap: Record<CategoryName, number> = {
      academic: SCORING_WEIGHTS.ACADEMIC,
      attendance: SCORING_WEIGHTS.ATTENDANCE,
      infrastructure: SCORING_WEIGHTS.INFRASTRUCTURE,
      teaching_quality: SCORING_WEIGHTS.TEACHING_QUALITY,
      management: SCORING_WEIGHTS.MANAGEMENT,
      student_welfare: SCORING_WEIGHTS.STUDENT_WELFARE,
      community: SCORING_WEIGHTS.COMMUNITY,
    }
    
    const categoryLabelMap: Record<CategoryName, string> = {
      academic: 'Academic Performance',
      attendance: 'Attendance',
      infrastructure: 'Infrastructure',
      teaching_quality: 'Teaching Quality',
      management: 'Management',
      student_welfare: 'Student Welfare',
      community: 'Community Engagement',
    }
    
    const performance: CategoryPerformance[] = categories.map(category => {
      const scores = reports
        .map(r => (r as any)[scoreKeyMap[category]]?.total)
        .filter((s): s is number => typeof s === 'number')
      
      const maxScore = maxScoreMap[category]
      const avgScore = calculateAverage(scores)
      const avgPercentage = calculatePercentage(avgScore, maxScore)
      
      const aboveAvg = scores.filter(s => s >= avgScore).length
      const belowAvg = scores.filter(s => s < avgScore).length
      
      return {
        category,
        categoryLabel: categoryLabelMap[category],
        averageScore: avgScore,
        maxScore,
        averagePercentage: avgPercentage,
        schoolsAboveAverage: aboveAvg,
        schoolsBelowAverage: belowAvg,
      }
    })
    
    return { performance, error: null }
  } catch (error) {
    console.error('Error in getCategoryPerformance:', error)
    return { performance: [], error: 'An unexpected error occurred.' }
  }
}

// ============================================================================
// SUBMISSION ANALYTICS
// ============================================================================

/**
 * Gets submission status by region
 */
export async function getSubmissionStatusByRegion(
  periodId?: string
): Promise<{ 
  data: { regionId: string; regionName: string; submitted: number; pending: number; total: number; totalSchools?: number; submittedCount?: number; pendingCount?: number }[];
  error: string | null 
}> {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    // Get all regions with school counts
    const { data: regions, error: regionsError } = await supabase
      .from('sms_regions')
      .select('id, name, sms_schools(id)')
    
    if (regionsError || !regions) {
      return { data: [], error: 'Failed to fetch regions.' }
    }
    
    // Get submitted reports (optionally filtered by period)
    let reportsQuery = supabase
      .from('school_assessment_reports')
      .select('school_id, sms_schools(region_id)')
      .eq('status', 'submitted')
    
    // Apply period filter only if periodId is provided
    if (periodId) {
      reportsQuery = applyPeriodFilter(reportsQuery, periodId)
    }
    
    const { data: reports, error: reportsError } = await reportsQuery
    
    if (reportsError) {
      return { data: [], error: 'Failed to fetch reports.' }
    }
    
    // Count submissions by region
    const submissionsByRegion: Record<string, number> = {}
    reports?.forEach((r: any) => {
      const regionId = r.sms_schools?.region_id
      if (regionId) {
        submissionsByRegion[regionId] = (submissionsByRegion[regionId] || 0) + 1
      }
    })
    
    // Build result
    const data = (regions || []).map((region: any) => {
      const total = region.sms_schools?.length || 0
      const submitted = submissionsByRegion[region.id] || 0
      return {
        regionId: region.id,
        regionName: region.name,
        submitted,
        pending: total - submitted,
        total,
        // Aliases for compatibility with different components
        totalSchools: total,
        submittedCount: submitted,
        pendingCount: total - submitted,
      }
    })
    
    return { data, error: null }
  } catch (error) {
    console.error('Error in getSubmissionStatusByRegion:', error)
    return { data: [], error: 'An unexpected error occurred.' }
  }
}

// ============================================================================
// ENHANCED ANALYTICS - School Ranking & Comparison
// ============================================================================

/**
 * Gets a school's ranking within their region and nationally
 */
export async function getSchoolRankingPosition(
  schoolId: string,
  periodId?: string
): Promise<{ 
  regionalRank: number | null
  regionalTotal: number
  nationalRank: number | null
  nationalTotal: number
  nationalPercentile: number | null
  regionName: string
  error: string | null 
}> {
  try {
    const access = await assertCanAccessSchool(schoolId)
    if (!access.ok) {
      return {
        regionalRank: null,
        regionalTotal: 0,
        nationalRank: null,
        nationalTotal: 0,
        nationalPercentile: null,
        regionName: '',
        error: access.error,
      }
    }

    const supabase = createServiceRoleSupabaseClient()
    
    // Get school's region
    const { data: school, error: schoolError } = await supabase
      .from('sms_schools')
      .select('id, region_id, sms_regions(name)')
      .eq('id', schoolId)
      .single()
    
    if (schoolError || !school) {
      return { 
        regionalRank: null, regionalTotal: 0, 
        nationalRank: null, nationalTotal: 0, 
        nationalPercentile: null, regionName: '',
        error: 'School not found.' 
      }
    }
    
    const regionId = school.region_id
    const regionName = (school.sms_regions as any)?.name || ''
    
    // Get all submitted reports with scores
    let query = supabase
      .from('school_assessment_reports')
      .select(`
        id,
        school_id,
        total_score,
        sms_schools!inner(id, region_id)
      `)
      .eq('status', 'submitted')
      .not('total_score', 'is', null)
    
    if (periodId) {
      query = applyPeriodFilter(query, periodId)
    }
    
    const { data: reports, error: reportsError } = await query
    
    if (reportsError || !reports) {
      return { 
        regionalRank: null, regionalTotal: 0, 
        nationalRank: null, nationalTotal: 0, 
        nationalPercentile: null, regionName,
        error: 'Failed to fetch reports.' 
      }
    }
    
    // Get school's report
    const schoolReport = reports.find(r => r.school_id === schoolId)
    if (!schoolReport) {
      return { 
        regionalRank: null, regionalTotal: reports.length, 
        nationalRank: null, nationalTotal: reports.length, 
        nationalPercentile: null, regionName,
        error: null 
      }
    }
    
    const schoolScore = schoolReport.total_score || 0
    
    // Calculate national ranking
    const nationalScores = reports.map(r => r.total_score || 0).sort((a, b) => b - a)
    const nationalRank = nationalScores.findIndex(s => s <= schoolScore) + 1
    const nationalTotal = nationalScores.length
    const nationalPercentile = nationalTotal > 0 
      ? Math.round(((nationalTotal - nationalRank + 1) / nationalTotal) * 100) 
      : null
    
    // Calculate regional ranking
    const regionalReports = reports.filter((r: any) => r.sms_schools?.region_id === regionId)
    const regionalScores = regionalReports.map(r => r.total_score || 0).sort((a, b) => b - a)
    const regionalRank = regionalScores.findIndex(s => s <= schoolScore) + 1
    const regionalTotal = regionalScores.length
    
    return {
      regionalRank,
      regionalTotal,
      nationalRank,
      nationalTotal,
      nationalPercentile,
      regionName,
      error: null,
    }
  } catch (error) {
    console.error('Error in getSchoolRankingPosition:', error)
    return { 
      regionalRank: null, regionalTotal: 0, 
      nationalRank: null, nationalTotal: 0, 
      nationalPercentile: null, regionName: '',
      error: 'An unexpected error occurred.' 
    }
  }
}

/**
 * Gets strongest and weakest categories for a report
 */
export async function getCategoryStrengthAnalysis(
  reportId: string
): Promise<{
  strongest: { category: string; label: string; score: number; maxScore: number; percentage: number } | null
  weakest: { category: string; label: string; score: number; maxScore: number; percentage: number } | null
  allCategories: { category: string; label: string; score: number; maxScore: number; percentage: number }[]
  error: string | null
}> {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    const { data: report, error } = await supabase
      .from('school_assessment_reports')
      .select(`
        academic_scores,
        attendance_scores,
        infrastructure_scores,
        teaching_quality_scores,
        management_scores,
        student_welfare_scores,
        community_scores
      `)
      .eq('id', reportId)
      .single()
    
    if (error || !report) {
      return { strongest: null, weakest: null, allCategories: [], error: 'Report not found.' }
    }
    
    const categoryConfig: { key: string; label: string; maxScore: number; scoreKey: string }[] = [
      { key: 'academic', label: 'Academic Performance', maxScore: 300, scoreKey: 'academic_scores' },
      { key: 'attendance', label: 'Attendance', maxScore: 150, scoreKey: 'attendance_scores' },
      { key: 'infrastructure', label: 'Infrastructure', maxScore: 150, scoreKey: 'infrastructure_scores' },
      { key: 'teaching_quality', label: 'Teaching Quality', maxScore: 150, scoreKey: 'teaching_quality_scores' },
      { key: 'management', label: 'Management', maxScore: 100, scoreKey: 'management_scores' },
      { key: 'student_welfare', label: 'Student Welfare', maxScore: 100, scoreKey: 'student_welfare_scores' },
      { key: 'community', label: 'Community Engagement', maxScore: 50, scoreKey: 'community_scores' },
    ]
    
    const allCategories = categoryConfig.map(cat => {
      const score = (report as any)[cat.scoreKey]?.total || 0
      return {
        category: cat.key,
        label: cat.label,
        score,
        maxScore: cat.maxScore,
        percentage: Math.round((score / cat.maxScore) * 100),
      }
    })
    
    // Sort by percentage to find strongest and weakest
    const sorted = [...allCategories].sort((a, b) => b.percentage - a.percentage)
    
    return {
      strongest: sorted[0] || null,
      weakest: sorted[sorted.length - 1] || null,
      allCategories: sorted,
      error: null,
    }
  } catch (error) {
    console.error('Error in getCategoryStrengthAnalysis:', error)
    return { strongest: null, weakest: null, allCategories: [], error: 'An unexpected error occurred.' }
  }
}

/**
 * Gets submission progress breakdown (draft, submitted, not started)
 */
export async function getSubmissionProgressBreakdown(
  regionId?: string,
  periodId?: string
): Promise<{
  submitted: number
  inProgress: number
  notStarted: number
  total: number
  submittedPercentage: number
  inProgressPercentage: number
  notStartedPercentage: number
  error: string | null
}> {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    // Get total schools
    let schoolsQuery = supabase.from('sms_schools').select('id', { count: 'exact' })
    if (regionId) {
      schoolsQuery = schoolsQuery.eq('region_id', regionId)
    }
    const { count: totalSchools } = await schoolsQuery
    const total = totalSchools || 0
    
    // Get reports
    let reportsQuery = supabase
      .from('school_assessment_reports')
      .select(`
        id,
        status,
        school_id,
        sms_schools!inner(region_id)
      `)
    
    if (regionId) {
      reportsQuery = reportsQuery.eq('sms_schools.region_id', regionId)
    }
    
    if (periodId) {
      reportsQuery = applyPeriodFilter(reportsQuery, periodId)
    }
    
    const { data: reports, error } = await reportsQuery
    
    if (error) {
      return { 
        submitted: 0, inProgress: 0, notStarted: 0, total: 0,
        submittedPercentage: 0, inProgressPercentage: 0, notStartedPercentage: 0,
        error: 'Failed to fetch reports.' 
      }
    }
    
    // Count by status
    const submitted = reports?.filter(r => r.status === 'submitted').length || 0
    const inProgress = reports?.filter(r => r.status === 'draft').length || 0
    const notStarted = total - submitted - inProgress
    
    return {
      submitted,
      inProgress,
      notStarted: Math.max(0, notStarted),
      total,
      submittedPercentage: total > 0 ? Math.round((submitted / total) * 100) : 0,
      inProgressPercentage: total > 0 ? Math.round((inProgress / total) * 100) : 0,
      notStartedPercentage: total > 0 ? Math.round((notStarted / total) * 100) : 0,
      error: null,
    }
  } catch (error) {
    console.error('Error in getSubmissionProgressBreakdown:', error)
    return { 
      submitted: 0, inProgress: 0, notStarted: 0, total: 0,
      submittedPercentage: 0, inProgressPercentage: 0, notStartedPercentage: 0,
      error: 'An unexpected error occurred.' 
    }
  }
}

/**
 * Gets most improved schools compared to previous term
 */
export async function getMostImprovedSchools(
  regionId?: string,
  limit: number = 5
): Promise<{
  improved: { schoolId: string; schoolName: string; regionName: string; currentScore: number; previousScore: number; improvement: number; improvementPercent: number }[]
  declined: { schoolId: string; schoolName: string; regionName: string; currentScore: number; previousScore: number; decline: number; declinePercent: number }[]
  error: string | null
}> {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    // Get all submitted reports with their periods
    let query = supabase
      .from('school_assessment_reports')
      .select(`
        id,
        school_id,
        total_score,
        submitted_at,
        academic_year,
        term_name,
        sms_schools!inner(id, name, region_id, sms_regions(name))
      `)
      .eq('status', 'submitted')
      .not('total_score', 'is', null)
      .order('submitted_at', { ascending: false })
    
    if (regionId) {
      query = query.eq('sms_schools.region_id', regionId)
    }
    
    const { data: reports, error } = await query
    
    if (error || !reports) {
      return { improved: [], declined: [], error: 'Failed to fetch reports.' }
    }
    
    // Group reports by school
    const schoolReports: Record<string, any[]> = {}
    reports.forEach((r: any) => {
      const schoolId = r.school_id
      if (!schoolReports[schoolId]) {
        schoolReports[schoolId] = []
      }
      schoolReports[schoolId].push(r)
    })
    
    // Calculate improvement for schools with at least 2 reports
    const comparisons: { 
      schoolId: string; schoolName: string; regionName: string;
      currentScore: number; previousScore: number; change: number; changePercent: number 
    }[] = []
    
    Object.entries(schoolReports).forEach(([schoolId, schoolReps]) => {
      if (schoolReps.length >= 2) {
        // Sort by date (most recent first)
        const sorted = schoolReps.sort((a, b) => 
          new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
        )
        const current = sorted[0]
        const previous = sorted[1]
        
        const currentScore = current.total_score || 0
        const previousScore = previous.total_score || 0
        const change = currentScore - previousScore
        const changePercent = previousScore > 0 ? Math.round((change / previousScore) * 100) : 0
        
        comparisons.push({
          schoolId,
          schoolName: current.sms_schools?.name || 'Unknown',
          regionName: current.sms_schools?.sms_regions?.name || '',
          currentScore,
          previousScore,
          change,
          changePercent,
        })
      }
    })
    
    // Sort and separate improved vs declined
    const improved = comparisons
      .filter(c => c.change > 0)
      .sort((a, b) => b.change - a.change)
      .slice(0, limit)
      .map(c => ({
        schoolId: c.schoolId,
        schoolName: c.schoolName,
        regionName: c.regionName,
        currentScore: c.currentScore,
        previousScore: c.previousScore,
        improvement: c.change,
        improvementPercent: c.changePercent,
      }))
    
    const declined = comparisons
      .filter(c => c.change < 0)
      .sort((a, b) => a.change - b.change)
      .slice(0, limit)
      .map(c => ({
        schoolId: c.schoolId,
        schoolName: c.schoolName,
        regionName: c.regionName,
        currentScore: c.currentScore,
        previousScore: c.previousScore,
        decline: Math.abs(c.change),
        declinePercent: Math.abs(c.changePercent),
      }))
    
    return { improved, declined, error: null }
  } catch (error) {
    console.error('Error in getMostImprovedSchools:', error)
    return { improved: [], declined: [], error: 'An unexpected error occurred.' }
  }
}

/**
 * Gets category gap analysis - showing gap between actual and maximum scores
 */
export async function getCategoryGapAnalysis(
  regionId?: string,
  periodId?: string
): Promise<{
  gaps: { category: string; label: string; averageScore: number; maxScore: number; gap: number; gapPercentage: number; filledPercentage: number }[]
  weakestCategory: string | null
  strongestCategory: string | null
  error: string | null
}> {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    let query = supabase
      .from('school_assessment_reports')
      .select(`
        academic_scores,
        attendance_scores,
        infrastructure_scores,
        teaching_quality_scores,
        management_scores,
        student_welfare_scores,
        community_scores,
        sms_schools!inner(region_id)
      `)
      .eq('status', 'submitted')
    
    if (regionId) {
      query = query.eq('sms_schools.region_id', regionId)
    }
    
    if (periodId) {
      query = applyPeriodFilter(query, periodId)
    }
    
    const { data: reports, error } = await query
    
    if (error || !reports || reports.length === 0) {
      return { gaps: [], weakestCategory: null, strongestCategory: null, error: error ? 'Failed to fetch data.' : null }
    }
    
    const categoryConfig: { key: string; label: string; maxScore: number; scoreKey: string }[] = [
      { key: 'academic', label: 'Academic Performance', maxScore: 300, scoreKey: 'academic_scores' },
      { key: 'attendance', label: 'Attendance', maxScore: 150, scoreKey: 'attendance_scores' },
      { key: 'infrastructure', label: 'Infrastructure', maxScore: 150, scoreKey: 'infrastructure_scores' },
      { key: 'teaching_quality', label: 'Teaching Quality', maxScore: 150, scoreKey: 'teaching_quality_scores' },
      { key: 'management', label: 'Management', maxScore: 100, scoreKey: 'management_scores' },
      { key: 'student_welfare', label: 'Student Welfare', maxScore: 100, scoreKey: 'student_welfare_scores' },
      { key: 'community', label: 'Community Engagement', maxScore: 50, scoreKey: 'community_scores' },
    ]
    
    const gaps = categoryConfig.map(cat => {
      const scores = reports
        .map(r => (r as any)[cat.scoreKey]?.total)
        .filter((s): s is number => typeof s === 'number')
      
      const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
      const gap = cat.maxScore - averageScore
      const filledPercentage = Math.round((averageScore / cat.maxScore) * 100)
      
      return {
        category: cat.key,
        label: cat.label,
        averageScore,
        maxScore: cat.maxScore,
        gap,
        gapPercentage: Math.round((gap / cat.maxScore) * 100),
        filledPercentage,
      }
    })
    
    // Sort by filled percentage to find weakest and strongest
    const sorted = [...gaps].sort((a, b) => a.filledPercentage - b.filledPercentage)
    
    return {
      gaps,
      weakestCategory: sorted[0]?.label || null,
      strongestCategory: sorted[sorted.length - 1]?.label || null,
      error: null,
    }
  } catch (error) {
    console.error('Error in getCategoryGapAnalysis:', error)
    return { gaps: [], weakestCategory: null, strongestCategory: null, error: 'An unexpected error occurred.' }
  }
}

/**
 * Gets score distribution for histogram
 */
export async function getScoreDistribution(
  regionId?: string,
  periodId?: string
): Promise<{
  distribution: { range: string; count: number; percentage: number; minScore: number; maxScore: number }[]
  totalReports: number
  error: string | null
}> {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    let query = supabase
      .from('school_assessment_reports')
      .select(`
        total_score,
        sms_schools!inner(region_id)
      `)
      .eq('status', 'submitted')
      .not('total_score', 'is', null)
    
    if (regionId) {
      query = query.eq('sms_schools.region_id', regionId)
    }
    
    if (periodId) {
      query = applyPeriodFilter(query, periodId)
    }
    
    const { data: reports, error } = await query
    
    if (error) {
      return { distribution: [], totalReports: 0, error: 'Failed to fetch data.' }
    }
    
    const scores = (reports || []).map(r => r.total_score || 0)
    const totalReports = scores.length
    
    // Define score ranges with rating labels
    const ranges = [
      { label: '0-399 (Needs Improvement)', min: 0, max: 399 },
      { label: '400-549 (Satisfactory)', min: 400, max: 549 },
      { label: '550-699 (Good)', min: 550, max: 699 },
      { label: '700-849 (Very Good)', min: 700, max: 849 },
      { label: '850-1000 (Outstanding)', min: 850, max: 1000 },
    ]
    
    const distribution = ranges.map(range => {
      const count = scores.filter(s => s >= range.min && s <= range.max).length
      return {
        range: range.label,
        count,
        percentage: totalReports > 0 ? Math.round((count / totalReports) * 100) : 0,
        minScore: range.min,
        maxScore: range.max,
      }
    })
    
    return { distribution, totalReports, error: null }
  } catch (error) {
    console.error('Error in getScoreDistribution:', error)
    return { distribution: [], totalReports: 0, error: 'An unexpected error occurred.' }
  }
}

/**
 * Gets region comparison with national average
 */
export async function getRegionVsNationalComparison(
  regionId: string,
  periodId?: string
): Promise<{
  regionAverage: number
  nationalAverage: number
  difference: number
  differencePercent: number
  regionRank: number
  totalRegions: number
  isAboveNational: boolean
  error: string | null
}> {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    // Get all submitted reports
    let query = supabase
      .from('school_assessment_reports')
      .select(`
        total_score,
        sms_schools!inner(region_id, sms_regions(id, name))
      `)
      .eq('status', 'submitted')
      .not('total_score', 'is', null)
    
    if (periodId) {
      query = applyPeriodFilter(query, periodId)
    }
    
    const { data: reports, error } = await query
    
    if (error || !reports || reports.length === 0) {
      return { 
        regionAverage: 0, nationalAverage: 0, difference: 0, differencePercent: 0,
        regionRank: 0, totalRegions: 0, isAboveNational: false,
        error: error ? 'Failed to fetch data.' : null 
      }
    }
    
    // Calculate national average
    const allScores = reports.map(r => r.total_score || 0)
    const nationalAverage = Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
    
    // Calculate regional averages
    const regionScores: Record<string, number[]> = {}
    reports.forEach((r: any) => {
      const rId = r.sms_schools?.region_id
      if (rId) {
        if (!regionScores[rId]) regionScores[rId] = []
        regionScores[rId].push(r.total_score || 0)
      }
    })
    
    const regionAverages = Object.entries(regionScores).map(([rId, scores]) => ({
      regionId: rId,
      average: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    }))
    
    // Sort by average to get rank
    regionAverages.sort((a, b) => b.average - a.average)
    const regionRank = regionAverages.findIndex(r => r.regionId === regionId) + 1
    const regionData = regionAverages.find(r => r.regionId === regionId)
    const regionAverage = regionData?.average || 0
    
    const difference = regionAverage - nationalAverage
    const differencePercent = nationalAverage > 0 ? Math.round((difference / nationalAverage) * 100) : 0
    
    return {
      regionAverage,
      nationalAverage,
      difference,
      differencePercent,
      regionRank,
      totalRegions: regionAverages.length,
      isAboveNational: difference > 0,
      error: null,
    }
  } catch (error) {
    console.error('Error in getRegionVsNationalComparison:', error)
    return { 
      regionAverage: 0, nationalAverage: 0, difference: 0, differencePercent: 0,
      regionRank: 0, totalRegions: 0, isAboveNational: false,
      error: 'An unexpected error occurred.' 
    }
  }
}

/**
 * Gets schools needing attention (below threshold)
 */
export async function getSchoolsNeedingAttention(
  regionId?: string,
  threshold: number = 400,
  periodId?: string
): Promise<{
  schools: { schoolId: string; schoolName: string; regionName: string; score: number; deficit: number; ratingLevel: string }[]
  count: number
  error: string | null
}> {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    let query = supabase
      .from('school_assessment_reports')
      .select(`
        id,
        school_id,
        total_score,
        rating_level,
        sms_schools!inner(id, name, region_id, sms_regions(name))
      `)
      .eq('status', 'submitted')
      .lt('total_score', threshold)
      .order('total_score', { ascending: true })
    
    if (regionId) {
      query = query.eq('sms_schools.region_id', regionId)
    }
    
    if (periodId) {
      query = applyPeriodFilter(query, periodId)
    }
    
    const { data: reports, error } = await query
    
    if (error) {
      return { schools: [], count: 0, error: 'Failed to fetch data.' }
    }
    
    const schools = (reports || []).map((r: any) => ({
      schoolId: r.school_id,
      schoolName: r.sms_schools?.name || 'Unknown',
      regionName: r.sms_schools?.sms_regions?.name || '',
      score: r.total_score || 0,
      deficit: threshold - (r.total_score || 0),
      ratingLevel: r.rating_level || 'needs_improvement',
    }))
    
    return { schools, count: schools.length, error: null }
  } catch (error) {
    console.error('Error in getSchoolsNeedingAttention:', error)
    return { schools: [], count: 0, error: 'An unexpected error occurred.' }
  }
}

/**
 * Gets category leaders - top school per category
 */
export async function getCategoryLeaders(
  regionId?: string,
  periodId?: string
): Promise<{
  leaders: { category: string; label: string; schoolName: string; schoolId: string; score: number; maxScore: number; percentage: number }[]
  error: string | null
}> {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    let query = supabase
      .from('school_assessment_reports')
      .select(`
        school_id,
        academic_scores,
        attendance_scores,
        infrastructure_scores,
        teaching_quality_scores,
        management_scores,
        student_welfare_scores,
        community_scores,
        sms_schools!inner(id, name, region_id)
      `)
      .eq('status', 'submitted')
    
    if (regionId) {
      query = query.eq('sms_schools.region_id', regionId)
    }
    
    if (periodId) {
      query = applyPeriodFilter(query, periodId)
    }
    
    const { data: reports, error } = await query
    
    if (error || !reports || reports.length === 0) {
      return { leaders: [], error: error ? 'Failed to fetch data.' : null }
    }
    
    const categoryConfig: { key: string; label: string; maxScore: number; scoreKey: string }[] = [
      { key: 'academic', label: 'Academic Performance', maxScore: 300, scoreKey: 'academic_scores' },
      { key: 'attendance', label: 'Attendance', maxScore: 150, scoreKey: 'attendance_scores' },
      { key: 'infrastructure', label: 'Infrastructure', maxScore: 150, scoreKey: 'infrastructure_scores' },
      { key: 'teaching_quality', label: 'Teaching Quality', maxScore: 150, scoreKey: 'teaching_quality_scores' },
      { key: 'management', label: 'Management', maxScore: 100, scoreKey: 'management_scores' },
      { key: 'student_welfare', label: 'Student Welfare', maxScore: 100, scoreKey: 'student_welfare_scores' },
      { key: 'community', label: 'Community Engagement', maxScore: 50, scoreKey: 'community_scores' },
    ]
    
    const leaders = categoryConfig.map(cat => {
      // Find school with highest score in this category
      let topSchool: any = null
      let topScore = -1
      
      reports.forEach((r: any) => {
        const score = r[cat.scoreKey]?.total || 0
        if (score > topScore) {
          topScore = score
          topSchool = r
        }
      })
      
      return {
        category: cat.key,
        label: cat.label,
        schoolName: topSchool?.sms_schools?.name || 'N/A',
        schoolId: topSchool?.school_id || '',
        score: topScore >= 0 ? topScore : 0,
        maxScore: cat.maxScore,
        percentage: topScore >= 0 ? Math.round((topScore / cat.maxScore) * 100) : 0,
      }
    })
    
    return { leaders, error: null }
  } catch (error) {
    console.error('Error in getCategoryLeaders:', error)
    return { leaders: [], error: 'An unexpected error occurred.' }
  }
}

/**
 * Gets school rankings for a single category (highest to lowest)
 */
export async function getRegionalCategoryRankings(
  category: CategoryName,
  regionId?: string,
  periodId?: string
): Promise<{
  rankings: { rank: number; schoolId: string; schoolName: string; regionName?: string; score: number; maxScore: number; percentage: number }[]
  error: string | null
}> {
  try {
    const supabase = createServiceRoleSupabaseClient()

    const categoryConfig: Record<CategoryName, { label: string; maxScore: number; scoreKey: string }> = {
      academic: { label: 'Academic Performance', maxScore: 300, scoreKey: 'academic_scores' },
      attendance: { label: 'Attendance', maxScore: 150, scoreKey: 'attendance_scores' },
      infrastructure: { label: 'Infrastructure', maxScore: 150, scoreKey: 'infrastructure_scores' },
      teaching_quality: { label: 'Teaching Quality', maxScore: 150, scoreKey: 'teaching_quality_scores' },
      management: { label: 'Management', maxScore: 100, scoreKey: 'management_scores' },
      student_welfare: { label: 'Student Welfare', maxScore: 100, scoreKey: 'student_welfare_scores' },
      community: { label: 'Community Engagement', maxScore: 50, scoreKey: 'community_scores' },
    }

    const config = categoryConfig[category]

    let query = supabase
      .from('school_assessment_reports')
      .select(`
        school_id,
        academic_scores,
        attendance_scores,
        infrastructure_scores,
        teaching_quality_scores,
        management_scores,
        student_welfare_scores,
        community_scores,
        sms_schools!inner(id, name, region_id, sms_regions(name))
      `)
      .eq('status', 'submitted')

    if (regionId) {
      query = query.eq('sms_schools.region_id', regionId)
    }

    if (periodId) {
      query = applyPeriodFilter(query, periodId)
    }

    const { data: reports, error } = await query

    if (error || !reports) {
      console.error('Error fetching category rankings:', error)
      return { rankings: [], error: 'Failed to fetch data.' }
    }

    const scored = (reports || []).map((r: any) => {
      const score = r[config.scoreKey]?.total || 0
      return {
        schoolId: r.school_id || '',
        schoolName: r.sms_schools?.name || 'Unknown',
        regionName: r.sms_schools?.sms_regions?.name || '',
        score,
        maxScore: config.maxScore,
        percentage: config.maxScore > 0 ? Math.round((score / config.maxScore) * 100) : 0,
      }
    })

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.schoolName.localeCompare(b.schoolName)
    })

    const rankings = scored.map((r, idx) => ({
      rank: idx + 1,
      ...r,
    }))

    return { rankings, error: null }
  } catch (err) {
    console.error('Error in getRegionalCategoryRankings:', err)
    return { rankings: [], error: 'An unexpected error occurred.' }
  }
}

/**
 * Gets underperforming regions (below national average)
 */
export async function getUnderperformingRegions(
  periodId?: string
): Promise<{
  regions: { regionId: string; regionName: string; average: number; nationalAverage: number; deficit: number; schoolCount: number }[]
  count: number
  error: string | null
}> {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    let query = supabase
      .from('school_assessment_reports')
      .select(`
        total_score,
        sms_schools!inner(region_id, sms_regions(id, name))
      `)
      .eq('status', 'submitted')
      .not('total_score', 'is', null)
    
    if (periodId) {
      query = applyPeriodFilter(query, periodId)
    }
    
    const { data: reports, error } = await query
    
    if (error || !reports || reports.length === 0) {
      return { regions: [], count: 0, error: error ? 'Failed to fetch data.' : null }
    }
    
    // Calculate national average
    const allScores = reports.map(r => r.total_score || 0)
    const nationalAverage = Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
    
    // Calculate regional averages
    const regionData: Record<string, { name: string; scores: number[] }> = {}
    reports.forEach((r: any) => {
      const regionId = r.sms_schools?.region_id
      const regionName = r.sms_schools?.sms_regions?.name
      if (regionId && regionName) {
        if (!regionData[regionId]) {
          regionData[regionId] = { name: regionName, scores: [] }
        }
        regionData[regionId].scores.push(r.total_score || 0)
      }
    })
    
    // Find regions below national average
    const underperforming = Object.entries(regionData)
      .map(([regionId, data]) => {
        const average = Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
        return {
          regionId,
          regionName: data.name,
          average,
          nationalAverage,
          deficit: nationalAverage - average,
          schoolCount: data.scores.length,
        }
      })
      .filter(r => r.average < nationalAverage)
      .sort((a, b) => a.average - b.average)
    
    return { regions: underperforming, count: underperforming.length, error: null }
  } catch (error) {
    console.error('Error in getUnderperformingRegions:', error)
    return { regions: [], count: 0, error: 'An unexpected error occurred.' }
  }
}
