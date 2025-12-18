"use server"

import { GeminiService } from "@/lib/gemini-service"
import { createServiceRoleSupabaseClient } from "@/lib/supabase"
import { getUser } from "@/app/actions/auth"

import {
  calculateAllCategoryScores,
  calculateTAPSAcademicsScore,
  calculateTAPSHealthSafetyScore,
  calculateTAPSLeadershipScore,
  calculateTAPSSchoolCultureScore,
  calculateTAPSSchoolInputsScore,
  calculateTAPSTeacherDevelopmentScore,
} from "./scoring"

import {
  SCORING_WEIGHTS,
  TAPS_SCORING_WEIGHTS,
  TOTAL_MAX_SCORE,
  TAPS_TOTAL_MAX_SCORE,
} from "../types"

// ============================================================================
// TYPES
// ============================================================================

interface AssessmentInsightContext {
  schoolData?: any
  regionData?: any
  nationalData?: any
  historicalData?: any[]
  comparisonData?: any
  categoryScores?: Record<string, number>
}

type AssessmentSystem = "demo" | "taps"

interface AIInsightResult {
  insight: string | null
  error: string | null
  cached?: boolean
}

interface PredictiveResult {
  predictions: {
    nextTermScore: number
    confidence: number
    trend: 'improving' | 'declining' | 'stable'
    riskLevel: 'low' | 'medium' | 'high'
    factors: string[]
  } | null
  error: string | null
}

interface EarlyWarningResult {
  warnings: {
    schoolId: string
    schoolName: string
    regionName: string
    currentScore: number
    predictedScore: number
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
    warningType: string
    recommendation: string
    indicators: string[]
  }[]
  error: string | null
}

interface CohortAnalysisResult {
  cohort: {
    schoolId: string
    schoolName: string
    totalScore: number
    similarity: number
    strengths: string[]
    challenges: string[]
  }[]
  insights: string | null
  error: string | null
}

// ============================================================================
// AI INSIGHT GENERATION FOR SCHOOL ASSESSMENTS
// ============================================================================

/**
 * Generate AI insights for a specific school's assessment
 */
export async function generateSchoolAssessmentInsight(
  schoolId: string,
  reportId?: string,
  insightType: 'overview' | 'improvement' | 'comparison' | 'prediction' = 'overview'
): Promise<AIInsightResult> {
  try {
    const user = await getUser()
    if (!user) {
      return { insight: null, error: "User not authenticated." }
    }

    const supabase = createServiceRoleSupabaseClient()
    
    // Fetch school data
    const { data: school } = await supabase
      .from('sms_schools')
      .select('id, name, region_id, sms_regions(name)')
      .eq('id', schoolId)
      .single()

    if (!school) {
      return { insight: null, error: "School not found." }
    }

    // Fetch current and historical reports
    let reportQuery = supabase
      .from('school_assessment_reports')
      .select('*')
      .eq('school_id', schoolId)
      .eq('status', 'submitted')
      .order('submitted_at', { ascending: false })
      .limit(5)

    const { data: reports } = await reportQuery

    if (!reports || reports.length === 0) {
      return { insight: null, error: "No submitted assessment reports found for this school." }
    }

    const currentReport = reports[0]
    const system = detectAssessmentSystem(currentReport)

    // Fetch regional averages for comparison (match assessment system to avoid mixing 1000-scale and 419-scale reports)
    let regionQuery = supabase
      .from('school_assessment_reports')
      .select(
        system === 'taps'
          ? 'total_score, school_type, taps_rating_grade, taps_school_inputs_scores, taps_leadership_scores, taps_academics_scores, taps_teacher_development_scores, taps_health_safety_scores, taps_school_culture_scores, sms_schools!inner(region_id)'
          : 'total_score, school_type, rating_level, academic_scores, attendance_scores, infrastructure_scores, teaching_quality_scores, management_scores, student_welfare_scores, community_scores, sms_schools!inner(region_id)'
      )
      .eq('status', 'submitted')
      .eq('sms_schools.region_id', school.region_id)

    if (currentReport.school_type) {
      regionQuery = regionQuery.eq('school_type', currentReport.school_type)
    } else {
      regionQuery = system === 'taps'
        ? regionQuery.not('taps_rating_grade', 'is', null)
        : regionQuery.is('taps_rating_grade', null)
    }

    const { data: regionReports } = await regionQuery

    // Build context for AI
    const context: AssessmentInsightContext = {
      schoolData: {
        name: school.name,
        regionName: (school as any).sms_regions?.name,
        currentReport,
        historicalReports: reports.slice(1)
      },
      regionData: regionReports ? calculateAverages(regionReports, system) : null
    }

    // Generate prompt based on insight type
    const prompt = buildAssessmentPrompt(insightType, context)
    
    const geminiService = new GeminiService()
    const insight = await geminiService.generateInsight(prompt, reports)

    return { insight, error: null }

  } catch (error) {
    console.error('Error generating school assessment insight:', error)
    return { 
      insight: null, 
      error: error instanceof Error ? error.message : 'Failed to generate insight.' 
    }
  }
}

/**
 * Generate AI insights for regional performance
 */
export async function generateRegionalAssessmentInsight(
  regionId: string,
  periodId?: string,
  insightType: 'overview' | 'comparison' | 'trends' | 'recommendations' = 'overview'
): Promise<AIInsightResult> {
  try {
    const user = await getUser()
    if (!user) {
      return { insight: null, error: "User not authenticated." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Fetch region info
    const { data: region } = await supabase
      .from('sms_regions')
      .select('id, name')
      .eq('id', regionId)
      .single()

    if (!region) {
      return { insight: null, error: "Region not found." }
    }

    // Fetch regional school reports
    let query = supabase
      .from('school_assessment_reports')
      .select(`
        *,
        sms_schools!inner(id, name, region_id)
      `)
      .eq('sms_schools.region_id', regionId)
      .eq('status', 'submitted')
      .order('total_score', { ascending: false })
      .limit(50)

    if (periodId) {
      query = query.eq('period_id', periodId)
    }

    const { data: reports } = await query

    if (!reports || reports.length === 0) {
      return { insight: null, error: "No submitted assessment reports found for this region." }
    }

    // Avoid mixing Demo (1000 scale) and TAPS (419 scale) reports.
    const tapsCount = reports.filter(r => detectAssessmentSystem(r) === 'taps').length
    const demoCount = reports.length - tapsCount
    const system: AssessmentSystem = tapsCount > 0 && demoCount > 0
      ? (tapsCount >= demoCount ? 'taps' : 'demo')
      : (tapsCount > 0 ? 'taps' : 'demo')

    const systemReports = reports.filter(r => detectAssessmentSystem(r) === system)
    const maxTotal = getMaxTotal(system)

    // Fetch national averages for comparison
    let nationalQuery = supabase
      .from('school_assessment_reports')
      .select('total_score')
      .eq('status', 'submitted')
      .limit(500)

    if (periodId) {
      nationalQuery = nationalQuery.eq('period_id', periodId)
    }

    // Prefer DB filter by school_type; fall back to TAPS marker if needed.
    nationalQuery = system === 'taps'
      ? nationalQuery.eq('school_type', 'secondary')
      : nationalQuery.neq('school_type', 'secondary')

    const { data: nationalReports } = await nationalQuery

    const nationalAverage = nationalReports?.length 
      ? nationalReports.reduce((sum, r) => sum + (r.total_score || 0), 0) / nationalReports.length 
      : 0

    const regionAverage = systemReports.reduce((sum, r) => sum + (r.total_score || 0), 0) / systemReports.length

    const context = {
      regionName: region.name,
      assessmentSystem: system,
      maxTotal,
      totalSchools: systemReports.length,
      regionAverage,
      nationalAverage,
      topSchools: systemReports.slice(0, 5),
      bottomSchools: systemReports.slice(-5).reverse(),
      categoryAverages: calculateCategoryAverages(systemReports, system)
    }

    const prompt = buildRegionalPrompt(insightType, context)
    
    const geminiService = new GeminiService()
    const insight = await geminiService.generateInsight(prompt, systemReports)

    return { insight, error: null }

  } catch (error) {
    console.error('Error generating regional assessment insight:', error)
    return { 
      insight: null, 
      error: error instanceof Error ? error.message : 'Failed to generate insight.' 
    }
  }
}

/**
 * Generate AI insights for national performance
 */
export async function generateNationalAssessmentInsight(
  periodId?: string,
  insightType: 'overview' | 'regional_comparison' | 'trends' | 'policy_recommendations' = 'overview'
): Promise<AIInsightResult> {
  try {
    const user = await getUser()
    if (!user) {
      return { insight: null, error: "User not authenticated." }
    }

    if (user.role !== 'Admin' && user.role !== 'Education Official') {
      return { insight: null, error: "Only Admins and Education Officials can access national insights." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Fetch all regions with their performance data
    const { data: regions } = await supabase
      .from('sms_regions')
      .select('id, name')

    if (!regions) {
      return { insight: null, error: "Could not fetch regions." }
    }

    // Fetch reports with region info
    let query = supabase
      .from('school_assessment_reports')
      .select(`
        *,
        sms_schools!inner(id, name, region_id, sms_regions(id, name))
      `)
      .eq('status', 'submitted')
      .limit(200)

    if (periodId) {
      query = query.eq('period_id', periodId)
    }

    const { data: reports } = await query

    if (!reports || reports.length === 0) {
      return { insight: null, error: "No submitted assessment reports found." }
    }

    // Avoid mixing Demo (1000 scale) and TAPS (419 scale) reports.
    const tapsCount = reports.filter(r => detectAssessmentSystem(r) === 'taps').length
    const demoCount = reports.length - tapsCount
    const system: AssessmentSystem = tapsCount > 0 && demoCount > 0
      ? (tapsCount >= demoCount ? 'taps' : 'demo')
      : (tapsCount > 0 ? 'taps' : 'demo')

    const systemReports = reports.filter(r => detectAssessmentSystem(r) === system)
    const maxTotal = getMaxTotal(system)

    // Calculate regional statistics
    const regionStats = regions.map(region => {
      const regionReports = systemReports.filter(r => 
        (r.sms_schools as any)?.region_id === region.id
      )
      return {
        regionId: region.id,
        regionName: region.name,
        schoolCount: regionReports.length,
        averageScore: regionReports.length > 0 
          ? regionReports.reduce((sum, r) => sum + (r.total_score || 0), 0) / regionReports.length
          : 0,
        categoryAverages: calculateCategoryAverages(regionReports, system)
      }
    }).filter(r => r.schoolCount > 0)

    const nationalAverage = systemReports.reduce((sum, r) => sum + (r.total_score || 0), 0) / systemReports.length

    const context = {
      assessmentSystem: system,
      maxTotal,
      totalSchools: systemReports.length,
      totalRegions: regionStats.length,
      nationalAverage,
      regionStats: regionStats.sort((a, b) => b.averageScore - a.averageScore),
      topPerformers: systemReports.sort((a, b) => (b.total_score || 0) - (a.total_score || 0)).slice(0, 10),
      bottomPerformers: systemReports.sort((a, b) => (a.total_score || 0) - (b.total_score || 0)).slice(0, 10)
    }

    const prompt = buildNationalPrompt(insightType, context)
    
    const geminiService = new GeminiService()
    const insight = await geminiService.generateInsight(prompt, systemReports.slice(0, 50))

    return { insight, error: null }

  } catch (error) {
    console.error('Error generating national assessment insight:', error)
    return { 
      insight: null, 
      error: error instanceof Error ? error.message : 'Failed to generate insight.' 
    }
  }
}

// ============================================================================
// PREDICTIVE ANALYTICS
// ============================================================================

/**
 * Generate predictive analytics for a school's future performance
 */
export async function generatePredictiveAnalytics(
  schoolId: string
): Promise<PredictiveResult> {
  try {
    const user = await getUser()
    if (!user) {
      return { predictions: null, error: "User not authenticated." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Fetch historical reports (at least 2 needed for prediction)
    const { data: reports } = await supabase
      .from('school_assessment_reports')
      .select('*')
      .eq('school_id', schoolId)
      .eq('status', 'submitted')
      .order('submitted_at', { ascending: true })
      .limit(10)

    if (!reports || reports.length < 2) {
      return { 
        predictions: null, 
        error: "Insufficient historical data. At least 2 submitted reports are needed for predictions." 
      }
    }

    // Avoid mixing scales: determine which assessment system these reports represent.
    const system: AssessmentSystem = detectAssessmentSystem(reports[reports.length - 1])
    const maxTotal = getMaxTotal(system)

    // Calculate trend
    const scores = reports.map(r => r.total_score || 0)
    const avgChange = calculateTrendSlope(scores)
    const lastScore = scores[scores.length - 1]
    const predictedScore = Math.max(0, Math.min(maxTotal, lastScore + avgChange))

    // Scale trend thresholds with max score (demo: 20 points ~= 2% of 1000)
    const changeThreshold = Math.max(1, Math.round(maxTotal * 0.02))

    // Determine trend direction
    let trend: 'improving' | 'declining' | 'stable'
    if (avgChange > changeThreshold) trend = 'improving'
    else if (avgChange < -changeThreshold) trend = 'declining'
    else trend = 'stable'

    // Calculate risk level
    let riskLevel: 'low' | 'medium' | 'high'
    const lowThreshold = Math.round(maxTotal * 0.6)
    const mediumThreshold = Math.round(maxTotal * 0.4)

    if (predictedScore >= lowThreshold || (predictedScore >= mediumThreshold && trend === 'improving')) {
      riskLevel = 'low'
    } else if (predictedScore >= mediumThreshold || trend === 'stable') {
      riskLevel = 'medium'
    } else {
      riskLevel = 'high'
    }

    // Identify contributing factors
    const factors = identifyPerformanceFactors(reports)

    // Calculate confidence based on data quantity and consistency
    const variance = calculateVariance(scores)
    const confidence = Math.max(0.3, Math.min(0.95, 1 - (variance / 50000) + (reports.length * 0.05)))

    return {
      predictions: {
        nextTermScore: Math.round(predictedScore),
        confidence: Math.round(confidence * 100) / 100,
        trend,
        riskLevel,
        factors
      },
      error: null
    }

  } catch (error) {
    console.error('Error generating predictive analytics:', error)
    return { 
      predictions: null, 
      error: error instanceof Error ? error.message : 'Failed to generate predictions.' 
    }
  }
}

/**
 * Generate batch predictions for all schools in a region
 */
export async function generateRegionalPredictions(
  regionId: string
): Promise<{ schools: any[], error: string | null }> {
  try {
    const user = await getUser()
    if (!user) {
      return { schools: [], error: "User not authenticated." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Get all schools in region with their reports
    const { data: schools } = await supabase
      .from('sms_schools')
      .select('id, name')
      .eq('region_id', regionId)

    if (!schools || schools.length === 0) {
      return { schools: [], error: "No schools found in this region." }
    }

    const predictions = await Promise.all(
      schools.map(async (school) => {
        const result = await generatePredictiveAnalytics(school.id)
        return {
          schoolId: school.id,
          schoolName: school.name,
          ...result.predictions
        }
      })
    )

    return {
      schools: predictions.filter(p => p.nextTermScore !== undefined),
      error: null
    }

  } catch (error) {
    console.error('Error generating regional predictions:', error)
    return { 
      schools: [], 
      error: error instanceof Error ? error.message : 'Failed to generate predictions.' 
    }
  }
}

// ============================================================================
// EARLY WARNING SYSTEM
// ============================================================================

/**
 * Identify schools at risk of performance decline
 */
export async function getEarlyWarnings(
  regionId?: string,
  threshold?: number
): Promise<EarlyWarningResult> {
  try {
    const user = await getUser()
    if (!user) {
      return { warnings: [], error: "User not authenticated." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Fetch schools with recent reports
    let query = supabase
      .from('school_assessment_reports')
      .select(`
        *,
        sms_schools!inner(id, name, region_id, sms_regions(name))
      `)
      .eq('status', 'submitted')
      .order('submitted_at', { ascending: false })

    if (regionId) {
      query = query.eq('sms_schools.region_id', regionId)
    }

    const { data: reports } = await query

    if (!reports || reports.length === 0) {
      return { warnings: [], error: null }
    }

    // Group reports by school
    const schoolReports = new Map<string, any[]>()
    reports.forEach(report => {
      const schoolId = report.school_id
      if (!schoolReports.has(schoolId)) {
        schoolReports.set(schoolId, [])
      }
      schoolReports.get(schoolId)!.push(report)
    })

    const warnings: EarlyWarningResult['warnings'] = []

    for (const [schoolId, schoolData] of schoolReports) {
      const latestReport = schoolData[0]
      const school = latestReport.sms_schools

      const system = detectAssessmentSystem(latestReport)
      const maxTotal = getMaxTotal(system)
      const effectiveThreshold = threshold ?? Math.round(maxTotal * 0.4)
      const criticalThreshold = Math.round(maxTotal * 0.3)
      const trendThreshold = Math.max(1, Math.round(maxTotal * 0.03))

      // Check for various warning conditions
      const warningIndicators: string[] = []
      let warningType = ''
      let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'

      // 1. Score below threshold
      if ((latestReport.total_score || 0) < effectiveThreshold) {
        warningIndicators.push(`Current score (${latestReport.total_score}) is below threshold (${effectiveThreshold})`)
        riskLevel = (latestReport.total_score || 0) < criticalThreshold ? 'critical' : 'high'
        warningType = 'Low Performance'
      }

      // 2. Declining trend
      if (schoolData.length >= 2) {
        const scores = schoolData.map(r => r.total_score || 0)
        const trend = calculateTrendSlope(scores.reverse())
        if (trend < -trendThreshold) {
          warningIndicators.push(`Declining trend: ${Math.round(trend)} points per term`)
          riskLevel = riskLevel === 'critical' ? 'critical' : 'high'
          warningType = warningType || 'Declining Performance'
        }
      }

      // 3. Category-specific issues
      let categoryIssueCount = 0

      const categoryDescriptors = getCategoryDescriptors(system)
      categoryDescriptors.forEach(cat => {
        const score = cat.getScore(latestReport)
        const percentage = (score / cat.max) * 100

        if (percentage < 40) {
          warningIndicators.push(`${cat.name}: only ${Math.round(percentage)}% of max score`)
          categoryIssueCount++
        }
      })

      // Upgrade risk level based on category issues if not already set
      if (categoryIssueCount > 0 && riskLevel === 'low') {
        if (categoryIssueCount >= 3) {
          riskLevel = 'high'
          warningType = warningType || 'Multiple Category Issues'
        } else {
          riskLevel = 'medium'
          warningType = warningType || 'Category Performance Issue'
        }
      }

      if (warningIndicators.length > 0) {
        // Generate recommendation based on issues
        const recommendation = generateWarningRecommendation(warningIndicators, latestReport)

        // Predict next score
        let predictedScore = latestReport.total_score
        if (schoolData.length >= 2) {
          const scores = schoolData.map(r => r.total_score || 0).reverse()
          const trend = calculateTrendSlope(scores)
          predictedScore = Math.round((latestReport.total_score || 0) + trend)
        }

        predictedScore = Math.max(0, Math.min(maxTotal, predictedScore || 0))

        warnings.push({
          schoolId,
          schoolName: school.name,
          regionName: school.sms_regions?.name || 'Unknown',
          currentScore: latestReport.total_score,
          predictedScore,
          riskLevel,
          warningType: warningType || 'Performance Concern',
          recommendation,
          indicators: warningIndicators
        })
      }
    }

    // Sort by risk level
    const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    warnings.sort((a, b) => riskOrder[a.riskLevel] - riskOrder[b.riskLevel])

    return { warnings, error: null }

  } catch (error) {
    console.error('Error getting early warnings:', error)
    return { 
      warnings: [], 
      error: error instanceof Error ? error.message : 'Failed to get early warnings.' 
    }
  }
}

// ============================================================================
// COHORT ANALYSIS
// ============================================================================

/**
 * Find similar schools for comparison (cohort analysis)
 */
export async function getCohortAnalysis(
  schoolId: string,
  criteriaType: 'score' | 'region' | 'size' = 'score',
  limit: number = 10
): Promise<CohortAnalysisResult> {
  try {
    const user = await getUser()
    if (!user) {
      return { cohort: [], insights: null, error: "User not authenticated." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Get the target school's data
    const { data: targetSchool } = await supabase
      .from('sms_schools')
      .select('id, name, region_id')
      .eq('id', schoolId)
      .single()

    if (!targetSchool) {
      return { cohort: [], insights: null, error: "School not found." }
    }

    // Get target school's latest report
    const { data: targetReport } = await supabase
      .from('school_assessment_reports')
      .select('*')
      .eq('school_id', schoolId)
      .eq('status', 'submitted')
      .order('submitted_at', { ascending: false })
      .limit(1)
      .single()

    if (!targetReport) {
      return { cohort: [], insights: null, error: "No submitted reports found for this school." }
    }

    // Find similar schools based on criteria
    let query = supabase
      .from('school_assessment_reports')
      .select(`
        *,
        sms_schools!inner(id, name, region_id, sms_regions(name))
      `)
      .eq('status', 'submitted')
      .neq('school_id', schoolId)
      .order('submitted_at', { ascending: false })

    if (criteriaType === 'region') {
      query = query.eq('sms_schools.region_id', targetSchool.region_id)
    } else if (criteriaType === 'score') {
      // Get schools with similar scores (within 100 points)
      const maxTotal = getMaxTotalForReport(targetReport)
      const windowSize = Math.max(1, Math.round(maxTotal * 0.1))
      const minScore = Math.max(0, (targetReport.total_score || 0) - windowSize)
      const maxScore = Math.min(maxTotal, (targetReport.total_score || 0) + windowSize)
      query = query.gte('total_score', minScore).lte('total_score', maxScore)
    }

    const { data: similarReports } = await query

    if (!similarReports || similarReports.length === 0) {
      return { cohort: [], insights: null, error: "No similar schools found." }
    }

    // Deduplicate by school (keep latest report per school)
    const latestBySchool = new Map<string, any>()
    similarReports.forEach(report => {
      const existingReport = latestBySchool.get(report.school_id)
      if (!existingReport || new Date(report.submitted_at) > new Date(existingReport.submitted_at)) {
        latestBySchool.set(report.school_id, report)
      }
    })

    // Calculate similarity scores and identify strengths/challenges
    const cohortSchools = Array.from(latestBySchool.values())
      .map(report => {
        const similarity = calculateSimilarity(targetReport, report)
        const { strengths, challenges } = identifyStrengthsAndChallenges(report)
        
        return {
          schoolId: report.school_id,
          schoolName: report.sms_schools.name,
          totalScore: report.total_score,
          similarity,
          strengths,
          challenges
        }
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)

    // Generate AI insights about the cohort
    let insights: string | null = null
    if (cohortSchools.length >= 3) {
      try {
        const geminiService = new GeminiService()
        const cohortData = cohortSchools.map(s => ({
          school_name: s.schoolName,
          total_score: s.totalScore,
          strengths: s.strengths.join(', '),
          challenges: s.challenges.join(', ')
        }))
        
        const prompt = `Analyze this cohort of similar schools and provide insights on:
1. Common patterns in strengths and challenges
2. What the top performers are doing differently
3. Specific recommendations for improvement based on peer performance
Focus on actionable insights.`

        insights = await geminiService.generateInsight(prompt, cohortData)
      } catch (e) {
        console.error('Error generating cohort insights:', e)
      }
    }

    return { cohort: cohortSchools, insights, error: null }

  } catch (error) {
    console.error('Error in cohort analysis:', error)
    return { 
      cohort: [], 
      insights: null,
      error: error instanceof Error ? error.message : 'Failed to perform cohort analysis.' 
    }
  }
}

// ============================================================================
// AI-POWERED RECOMMENDATIONS
// ============================================================================

/**
 * Generate personalized improvement recommendations
 */
export async function generateImprovementPlan(
  schoolId: string,
  reportId?: string
): Promise<AIInsightResult> {
  try {
    const user = await getUser()
    if (!user) {
      return { insight: null, error: "User not authenticated." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Fetch school and report data
    const { data: school } = await supabase
      .from('sms_schools')
      .select('id, name, region_id, sms_regions(name)')
      .eq('id', schoolId)
      .single()

    if (!school) {
      return { insight: null, error: "School not found." }
    }

    // Get school's reports
    const { data: reports } = await supabase
      .from('school_assessment_reports')
      .select('*')
      .eq('school_id', schoolId)
      .eq('status', 'submitted')
      .order('submitted_at', { ascending: false })
      .limit(3)

    if (!reports || reports.length === 0) {
      return { insight: null, error: "No assessment reports found." }
    }

    const currentReport = reports[0]
    const system = detectAssessmentSystem(currentReport)

    // Get top performing schools in region for benchmarking (match same assessment system)
    let topSchoolsQuery = supabase
      .from('school_assessment_reports')
      .select(`
        *,
        sms_schools!inner(name, region_id)
      `)
      .eq('sms_schools.region_id', school.region_id)
      .eq('status', 'submitted')
      .order('total_score', { ascending: false })
      .limit(5)

    if (currentReport.school_type) {
      topSchoolsQuery = topSchoolsQuery.eq('school_type', currentReport.school_type)
    } else {
      topSchoolsQuery = system === 'taps'
        ? topSchoolsQuery.not('taps_rating_grade', 'is', null)
        : topSchoolsQuery.is('taps_rating_grade', null)
    }

    const { data: topSchools } = await topSchoolsQuery

    // Identify weak categories
    const weakCategories = identifyWeakCategories(currentReport, system)

    const maxTotal = getMaxTotal(system)
    const ratingLabel = system === 'taps' ? 'Grade' : 'Rating'
    const ratingValue = system === 'taps'
      ? (currentReport.taps_rating_grade || 'N/A')
      : (currentReport.rating_level || 'N/A')
    
    // Build comprehensive prompt
    const prompt = `You are an educational improvement specialist. Generate a detailed, actionable improvement plan for this school.

SCHOOL INFORMATION:
- Name: ${school.name}
- Region: ${(school as any).sms_regions?.name}
- Current Total Score: ${currentReport.total_score}/${maxTotal}
- ${ratingLabel}: ${ratingValue}

CURRENT PERFORMANCE BY CATEGORY:
${formatCategoryScores(currentReport, system)}

IDENTIFIED WEAK AREAS:
${weakCategories.map(c => `- ${c.name}: ${c.score}/${c.maxScore} (${Math.round(c.percentage)}%)`).join('\n')}

TOP REGIONAL PERFORMERS FOR COMPARISON:
${topSchools?.slice(0, 3).map(s => `- ${s.sms_schools.name}: ${s.total_score} points`).join('\n') || 'No comparison data available'}

Please provide:
1. PRIORITY ACTIONS (3-5 specific, immediate actions to take)
2. MEDIUM-TERM GOALS (improvements achievable within 1-2 terms)
3. RESOURCE RECOMMENDATIONS (what support/resources are needed)
4. SUCCESS METRICS (how to measure improvement)
5. TIMELINE (suggested milestones)

Make recommendations specific, measurable, and practical for a Guyanese school context.`

    const geminiService = new GeminiService()
    const insight = await geminiService.generateInsight(prompt, reports)

    return { insight, error: null }

  } catch (error) {
    console.error('Error generating improvement plan:', error)
    return { 
      insight: null, 
      error: error instanceof Error ? error.message : 'Failed to generate improvement plan.' 
    }
  }
}

/**
 * Generate category-specific analysis and recommendations
 */
export async function generateCategoryAnalysis(
  schoolId: string,
  category: 'academic' | 'attendance' | 'infrastructure' | 'teaching_quality' | 'management' | 'student_welfare' | 'community'
): Promise<AIInsightResult> {
  try {
    const user = await getUser()
    if (!user) {
      return { insight: null, error: "User not authenticated." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Fetch school data
    const { data: school } = await supabase
      .from('sms_schools')
      .select('id, name, region_id, sms_regions(name)')
      .eq('id', schoolId)
      .single()

    if (!school) {
      return { insight: null, error: "School not found." }
    }

    // Get historical reports for this school
    const { data: reports } = await supabase
      .from('school_assessment_reports')
      .select('*')
      .eq('school_id', schoolId)
      .eq('status', 'submitted')
      .order('submitted_at', { ascending: false })
      .limit(5)

    if (!reports || reports.length === 0) {
      return { insight: null, error: "No assessment reports found." }
    }

    const categoryScoresKey = `${category}_scores` as keyof typeof reports[0]
    const categoryMaxScores: Record<string, number> = {
      academic: 300,
      attendance: 150,
      infrastructure: 150,
      teaching_quality: 150,
      management: 100,
      student_welfare: 100,
      community: 50
    }

    const maxScore = categoryMaxScores[category]
    const currentScore = (reports[0][categoryScoresKey as keyof typeof reports[0]] as any)?.total || 0
    const historicalScores = reports.map(r => ({
      score: (r[categoryScoresKey as keyof typeof r] as any)?.total || 0,
      date: r.submitted_at
    }))

    // Get regional average for this category
    const { data: regionReports } = await supabase
      .from('school_assessment_reports')
      .select(`${String(categoryScoresKey)}, sms_schools!inner(region_id)`)
      .eq('sms_schools.region_id', school.region_id)
      .eq('status', 'submitted')

    const regionAverage = regionReports?.length 
      ? regionReports.reduce((sum, r) => sum + ((r as any)[categoryScoresKey]?.total || 0), 0) / regionReports.length
      : 0

    const categoryLabels: Record<string, string> = {
      academic: 'Academic Performance',
      attendance: 'Attendance',
      infrastructure: 'Infrastructure',
      teaching_quality: 'Teaching Quality',
      management: 'School Management',
      student_welfare: 'Student Welfare',
      community: 'Community Engagement'
    }

    const prompt = `Analyze the ${categoryLabels[category]} category for this school and provide detailed insights.

SCHOOL: ${school.name}
REGION: ${(school as any).sms_regions?.name}

CURRENT ${categoryLabels[category].toUpperCase()} SCORE:
- Score: ${currentScore}/${maxScore} (${Math.round((currentScore/maxScore)*100)}%)
- Regional Average: ${Math.round(regionAverage)}/${maxScore} (${Math.round((regionAverage/maxScore)*100)}%)
- Performance vs Region: ${currentScore >= regionAverage ? 'Above' : 'Below'} average by ${Math.abs(Math.round(currentScore - regionAverage))} points

HISTORICAL TREND:
${historicalScores.map((h, i) => `Term ${i+1}: ${h.score}/${maxScore}`).join('\n')}

Please provide:
1. PERFORMANCE ANALYSIS - What does this score indicate about ${categoryLabels[category].toLowerCase()}?
2. TREND INTERPRETATION - Is the school improving, declining, or stable in this area?
3. KEY STRENGTHS - What is the school doing well?
4. AREAS FOR IMPROVEMENT - Specific aspects needing attention
5. RECOMMENDED ACTIONS - 3-5 specific, actionable recommendations
6. RESOURCES NEEDED - What support would help improve this category?`

    const geminiService = new GeminiService()
    const insight = await geminiService.generateInsight(prompt, reports)

    return { insight, error: null }

  } catch (error) {
    console.error('Error generating category analysis:', error)
    return { 
      insight: null, 
      error: error instanceof Error ? error.message : 'Failed to generate category analysis.' 
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateAverages(reports: any[], system?: AssessmentSystem): Record<string, number> {
  if (!reports || reports.length === 0) return {}

  const detected = system ?? detectAssessmentSystem(reports[0])

  if (detected === 'taps') {
    const totals = reports.map(r => getTAPSCategoryTotals(r))
    return {
      totalScore: reports.reduce((sum, r) => sum + (r.total_score || 0), 0) / reports.length,
      schoolInputsOperations: totals.reduce((sum, t) => sum + t.school_inputs_operations, 0) / reports.length,
      leadership: totals.reduce((sum, t) => sum + t.leadership, 0) / reports.length,
      academics: totals.reduce((sum, t) => sum + t.academics, 0) / reports.length,
      teacherDevelopment: totals.reduce((sum, t) => sum + t.teacher_development, 0) / reports.length,
      healthSafety: totals.reduce((sum, t) => sum + t.health_safety, 0) / reports.length,
      schoolCulture: totals.reduce((sum, t) => sum + t.school_culture, 0) / reports.length,
    }
  }
  
  return {
    totalScore: reports.reduce((sum, r) => sum + (r.total_score || 0), 0) / reports.length,
    academic: reports.reduce((sum, r) => sum + getDemoCategoryTotals(r).academic, 0) / reports.length,
    attendance: reports.reduce((sum, r) => sum + getDemoCategoryTotals(r).attendance, 0) / reports.length,
    infrastructure: reports.reduce((sum, r) => sum + getDemoCategoryTotals(r).infrastructure, 0) / reports.length,
    teachingQuality: reports.reduce((sum, r) => sum + getDemoCategoryTotals(r).teaching_quality, 0) / reports.length,
    management: reports.reduce((sum, r) => sum + getDemoCategoryTotals(r).management, 0) / reports.length,
    studentWelfare: reports.reduce((sum, r) => sum + getDemoCategoryTotals(r).student_welfare, 0) / reports.length,
  }
}

function calculateCategoryAverages(reports: any[], system?: AssessmentSystem): Record<string, number> {
  if (!reports || reports.length === 0) return {}

  const detected = system ?? detectAssessmentSystem(reports[0])

  if (detected === 'taps') {
    const totals = reports.map(r => getTAPSCategoryTotals(r))
    return {
      school_inputs_operations: Math.round(totals.reduce((sum, t) => sum + t.school_inputs_operations, 0) / reports.length),
      leadership: Math.round(totals.reduce((sum, t) => sum + t.leadership, 0) / reports.length),
      academics: Math.round(totals.reduce((sum, t) => sum + t.academics, 0) / reports.length),
      teacher_development: Math.round(totals.reduce((sum, t) => sum + t.teacher_development, 0) / reports.length),
      health_safety: Math.round(totals.reduce((sum, t) => sum + t.health_safety, 0) / reports.length),
      school_culture: Math.round(totals.reduce((sum, t) => sum + t.school_culture, 0) / reports.length),
    }
  }

  return {
    academic: Math.round(reports.reduce((sum, r) => sum + getDemoCategoryTotals(r).academic, 0) / reports.length),
    attendance: Math.round(reports.reduce((sum, r) => sum + getDemoCategoryTotals(r).attendance, 0) / reports.length),
    infrastructure: Math.round(reports.reduce((sum, r) => sum + getDemoCategoryTotals(r).infrastructure, 0) / reports.length),
    teaching_quality: Math.round(reports.reduce((sum, r) => sum + getDemoCategoryTotals(r).teaching_quality, 0) / reports.length),
    management: Math.round(reports.reduce((sum, r) => sum + getDemoCategoryTotals(r).management, 0) / reports.length),
    student_welfare: Math.round(reports.reduce((sum, r) => sum + getDemoCategoryTotals(r).student_welfare, 0) / reports.length),
    community: Math.round(reports.reduce((sum, r) => sum + getDemoCategoryTotals(r).community, 0) / reports.length),
  }
}

function calculateTrendSlope(scores: number[]): number {
  if (scores.length < 2) return 0
  
  const n = scores.length
  const xMean = (n - 1) / 2
  const yMean = scores.reduce((a, b) => a + b, 0) / n
  
  let numerator = 0
  let denominator = 0
  
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (scores[i] - yMean)
    denominator += (i - xMean) ** 2
  }
  
  return denominator === 0 ? 0 : numerator / denominator
}

function calculateVariance(scores: number[]): number {
  if (scores.length < 2) return 0
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length
  return scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length
}

function identifyPerformanceFactors(reports: any[]): string[] {
  const factors: string[] = []
  
  if (reports.length < 2) return factors
  
  const latest = reports[reports.length - 1]
  const previous = reports[reports.length - 2]
  
  const categories = [
    { key: 'academic_scores', name: 'Academic Performance' },
    { key: 'attendance_scores', name: 'Attendance' },
    { key: 'infrastructure_scores', name: 'Infrastructure' },
    { key: 'teaching_quality_scores', name: 'Teaching Quality' },
    { key: 'management_scores', name: 'Management' },
    { key: 'student_welfare_scores', name: 'Student Welfare' },
  ]
  
  categories.forEach(cat => {
    const latestScore = latest[cat.key]?.total || 0
    const prevScore = previous[cat.key]?.total || 0
    const change = latestScore - prevScore
    
    if (change > 20) {
      factors.push(`${cat.name} improved significantly (+${change} points)`)
    } else if (change < -20) {
      factors.push(`${cat.name} declined (-${Math.abs(change)} points)`)
    }
  })
  
  return factors
}

function generateWarningRecommendation(indicators: string[], report: any): string {
  const recommendations: string[] = []
  
  indicators.forEach(indicator => {
    if (indicator.includes('academic')) {
      recommendations.push('Focus on improving academic instruction and student support programs')
    } else if (indicator.includes('attendance')) {
      recommendations.push('Implement attendance monitoring and parent engagement initiatives')
    } else if (indicator.includes('infrastructure')) {
      recommendations.push('Prioritize facility improvements and resource acquisition')
    } else if (indicator.includes('teaching quality')) {
      recommendations.push('Invest in teacher training and professional development')
    } else if (indicator.includes('management')) {
      recommendations.push('Strengthen school leadership and administrative processes')
    } else if (indicator.includes('Declining')) {
      recommendations.push('Conduct comprehensive review to identify root causes of decline')
    } else if (indicator.includes('below threshold')) {
      recommendations.push('Request additional support and resources from regional office')
    }
  })
  
  return recommendations.length > 0 
    ? recommendations.slice(0, 3).join('. ') + '.'
    : 'Schedule detailed assessment review with regional education officer.'
}

function calculateSimilarity(report1: any, report2: any): number {
  const scoreDiff = Math.abs((report1.total_score || 0) - (report2.total_score || 0))
  const maxDiff = Math.max(getMaxTotalForReport(report1), getMaxTotalForReport(report2))
  return Math.round((1 - scoreDiff / maxDiff) * 100)
}

function identifyStrengthsAndChallenges(report: any): { strengths: string[], challenges: string[] } {
  const strengths: string[] = []
  const challenges: string[] = []

  const system = detectAssessmentSystem(report)
  const categories = getCategoryDescriptors(system)

  categories.forEach(cat => {
    const score = cat.getScore(report)
    const percentage = (score / cat.max) * 100

    if (percentage >= 70) {
      strengths.push(cat.name)
    } else if (percentage < 50) {
      challenges.push(cat.name)
    }
  })
  
  return { strengths, challenges }
}

function identifyWeakCategories(
  report: any,
  system: AssessmentSystem
): { name: string, score: number, maxScore: number, percentage: number }[] {
  const categories = getCategoryDescriptors(system)

  return categories
    .map(cat => {
      const score = cat.getScore(report)
      return {
        name: cat.name,
        score,
        maxScore: cat.max,
        percentage: (score / cat.max) * 100,
      }
    })
    .filter(c => c.percentage < 60)
    .sort((a, b) => a.percentage - b.percentage)
}

function formatCategoryScores(report: any, system: AssessmentSystem): string {
  const categories = getCategoryDescriptors(system)

  return categories
    .map(cat => {
      const score = cat.getScore(report)
      const percentage = Math.round((score / cat.max) * 100)
      return `- ${cat.name}: ${score}/${cat.max} (${percentage}%)`
    })
    .join('\n')
}

function buildAssessmentPrompt(insightType: string, context: AssessmentInsightContext): string {
  const currentReport = context.schoolData?.currentReport
  const system: AssessmentSystem = currentReport ? detectAssessmentSystem(currentReport) : 'demo'
  const maxTotal = getMaxTotal(system)
  const ratingLabel = system === 'taps' ? 'Grade' : 'Rating'
  const ratingValue = system === 'taps'
    ? (currentReport?.taps_rating_grade || 'N/A')
    : (currentReport?.rating_level || 'N/A')

  const baseContext = `
School: ${context.schoolData?.name}
Region: ${context.schoolData?.regionName}
Current Score: ${currentReport?.total_score || 'N/A'}/${maxTotal}
${ratingLabel}: ${ratingValue}
`

  const formatInstructions = `

**FORMATTING REQUIREMENTS:**
- Use markdown headers (## for sections, ### for subsections)
- Present data comparisons in tables where applicable
- Use bullet points for lists
- Keep responses concise but informative
- Include specific numbers and percentages where available
`

  switch (insightType) {
    case 'improvement':
      return `Analyze this school's assessment data and provide specific, actionable improvement recommendations.
${baseContext}
Focus on:
1. Key areas needing immediate attention
2. Quick wins that could improve scores
3. Long-term strategies for sustained improvement
${formatInstructions}`
    
    case 'comparison':
      return `Compare this school's performance against regional averages and provide insights.
${baseContext}
Regional Average Score: ${context.regionData?.totalScore || 'N/A'}

Present the comparison in a table format showing:
| Category | School Score | Regional Avg | Difference |

Then provide:
1. Areas where the school exceeds regional average
2. Areas where improvement is needed
3. Specific strategies used by better-performing schools
${formatInstructions}`
    
    case 'prediction':
      return `Based on the historical performance data, provide insights on likely future performance trends.
${baseContext}
Historical Reports: ${context.schoolData?.historicalReports?.length || 0} previous assessments
Analyze:
1. Performance trajectory
2. Risk factors
3. Opportunities for improvement
${formatInstructions}`
    
    default:
      return `Provide a comprehensive analysis of this school's assessment performance.
${baseContext}
Include:
1. Overall performance summary (with key metrics in a table)
2. Key strengths (top 3)
3. Areas for improvement (top 3)
4. Recommended next steps (prioritized list)
${formatInstructions}`
  }
}

function buildRegionalPrompt(insightType: string, context: any): string {
  const maxTotal = Number.isFinite(context.maxTotal) ? context.maxTotal : 1000
  const systemLabel = context.assessmentSystem === 'taps'
    ? `TAPS (secondary, max ${maxTotal})`
    : `Demo (primary/nursery, max ${maxTotal})`

  const baseContext = `
Region: ${context.regionName}
Total Schools Assessed: ${context.totalSchools}
Assessment System: ${systemLabel}
Regional Average Score: ${Math.round(context.regionAverage)}/${maxTotal}
National Average Score: ${Math.round(context.nationalAverage)}/${maxTotal}
`

  const formatInstructions = `

**FORMATTING REQUIREMENTS:**
- Use markdown headers (## for sections, ### for subsections)
- Present school/region comparisons in tables where applicable
- Use bullet points for lists
- Keep responses concise but informative
- Include specific numbers and percentages
`

  switch (insightType) {
    case 'comparison':
      return `Compare this region's performance against national averages and other regions.
${baseContext}
Present the regional comparison in a table format.

Provide:
1. Regional position relative to national performance
2. Areas of regional strength
3. Opportunities for regional improvement
4. Recommendations for regional education initiatives
${formatInstructions}`
    
    case 'trends':
      return `Analyze performance trends within this region.
${baseContext}
Focus on:
1. Common patterns across schools
2. Emerging challenges
3. Success stories and best practices
4. Predictions for future performance
${formatInstructions}`
    
    case 'recommendations':
      return `Provide strategic recommendations for improving educational outcomes in this region.
${baseContext}
Top Schools: ${context.topSchools?.slice(0, 3).map((s: any) => s.sms_schools?.name).join(', ')}
Bottom Schools: ${context.bottomSchools?.slice(0, 3).map((s: any) => s.sms_schools?.name).join(', ')}

Present a prioritized table of recommendations with expected impact.

Recommendations should be:
1. Specific and actionable
2. Prioritized by impact
3. Resource-conscious
4. Measurable
${formatInstructions}`
    
    default:
      return `Provide a comprehensive analysis of educational performance in this region.
${baseContext}
Include:
1. Overall regional performance summary (with key metrics table)
2. School performance distribution breakdown
3. Key regional strengths and challenges
4. Priority recommendations (top 5)
${formatInstructions}`
  }
}

function buildNationalPrompt(insightType: string, context: any): string {
  const maxTotal = Number.isFinite(context.maxTotal) ? context.maxTotal : 1000
  const systemLabel = context.assessmentSystem === 'taps'
    ? `TAPS (secondary, max ${maxTotal})`
    : `Demo (primary/nursery, max ${maxTotal})`

  const baseContext = `
National Overview:
- Total Schools Assessed: ${context.totalSchools}
- Total Regions: ${context.totalRegions}
- Assessment System: ${systemLabel}
- National Average Score: ${Math.round(context.nationalAverage)}/${maxTotal}
`

  const formatInstructions = `

**FORMATTING REQUIREMENTS:**
- Use markdown headers (## for sections, ### for subsections)
- Present regional comparisons in tables
- Use bullet points for lists
- Keep responses concise but informative
- Include specific numbers and percentages
`

  switch (insightType) {
    case 'regional_comparison':
      return `Compare educational performance across all regions.
${baseContext}
Top Performing Regions:
${context.regionStats?.slice(0, 3).map((r: any) => `- ${r.regionName}: ${Math.round(r.averageScore)} avg (${r.schoolCount} schools)`).join('\n')}

Bottom Performing Regions:
${context.regionStats?.slice(-3).reverse().map((r: any) => `- ${r.regionName}: ${Math.round(r.averageScore)} avg (${r.schoolCount} schools)`).join('\n')}

Present regional data in a comparison table.

Analyze:
1. Regional disparities and their potential causes
2. What top regions are doing differently
3. Strategies to improve underperforming regions
4. Resource allocation recommendations
${formatInstructions}`
    
    case 'policy_recommendations':
      return `Based on national assessment data, provide policy recommendations for the Ministry of Education.
${baseContext}

Present recommendations in a prioritized table with expected impact.

Focus on:
1. System-wide improvements needed
2. Resource allocation priorities
3. Teacher development needs
4. Infrastructure investment priorities
5. Monitoring and accountability mechanisms
${formatInstructions}`
    
    case 'trends':
      return `Analyze national education performance trends.
${baseContext}
Identify:
1. Emerging patterns across the education system
2. Success stories and replicable practices
3. Systemic challenges requiring attention
4. Predictions for future performance
${formatInstructions}`
    
    default:
      return `Provide a comprehensive national education assessment analysis.
${baseContext}
Include:
1. Overall national performance summary (key metrics table)
2. Regional performance comparison table
3. Key national strengths and challenges
4. Strategic recommendations for improvement
5. Priority actions for the Ministry
${formatInstructions}`
  }
}

function detectAssessmentSystem(report: any): AssessmentSystem {
  const hasTAPSData = Boolean(
    report?.taps_rating_grade ||
      report?.taps_school_inputs_scores ||
      report?.taps_leadership_scores ||
      report?.taps_academics_scores ||
      report?.taps_teacher_development_scores ||
      report?.taps_health_safety_scores ||
      report?.taps_school_culture_scores
  )

  if (report?.school_type === 'secondary' || hasTAPSData) return 'taps'
  return 'demo'
}

function getMaxTotal(system: AssessmentSystem): number {
  return system === 'taps' ? TAPS_TOTAL_MAX_SCORE : TOTAL_MAX_SCORE
}

function getMaxTotalForReport(report: any): number {
  return getMaxTotal(detectAssessmentSystem(report))
}

function getTAPSCategoryTotals(report: any) {
  return {
    school_inputs_operations: calculateTAPSSchoolInputsScore(report?.taps_school_inputs_scores || {}),
    leadership: calculateTAPSLeadershipScore(report?.taps_leadership_scores || {}),
    academics: calculateTAPSAcademicsScore(report?.taps_academics_scores || {}),
    teacher_development: calculateTAPSTeacherDevelopmentScore(report?.taps_teacher_development_scores || {}),
    health_safety: calculateTAPSHealthSafetyScore(report?.taps_health_safety_scores || {}),
    school_culture: calculateTAPSSchoolCultureScore(report?.taps_school_culture_scores || {}),
  }
}

function getDemoCategoryTotals(report: any) {
  return calculateAllCategoryScores({
    academic: report?.academic_scores || {},
    attendance: report?.attendance_scores || {},
    infrastructure: report?.infrastructure_scores || {},
    teachingQuality: report?.teaching_quality_scores || {},
    management: report?.management_scores || {},
    studentWelfare: report?.student_welfare_scores || {},
    community: report?.community_scores || {},
  })
}

function getCategoryDescriptors(system: AssessmentSystem): Array<{
  name: string
  max: number
  getScore: (report: any) => number
}> {
  if (system === 'taps') {
    return [
      {
        name: 'School Inputs & Operations',
        max: TAPS_SCORING_WEIGHTS.SCHOOL_INPUTS_OPERATIONS,
        getScore: (r) => getTAPSCategoryTotals(r).school_inputs_operations,
      },
      {
        name: 'Leadership',
        max: TAPS_SCORING_WEIGHTS.LEADERSHIP,
        getScore: (r) => getTAPSCategoryTotals(r).leadership,
      },
      {
        name: 'Academics',
        max: TAPS_SCORING_WEIGHTS.ACADEMICS,
        getScore: (r) => getTAPSCategoryTotals(r).academics,
      },
      {
        name: 'Teacher Development',
        max: TAPS_SCORING_WEIGHTS.TEACHER_DEVELOPMENT,
        getScore: (r) => getTAPSCategoryTotals(r).teacher_development,
      },
      {
        name: 'Health & Safety',
        max: TAPS_SCORING_WEIGHTS.HEALTH_SAFETY,
        getScore: (r) => getTAPSCategoryTotals(r).health_safety,
      },
      {
        name: 'School Culture',
        max: TAPS_SCORING_WEIGHTS.SCHOOL_CULTURE,
        getScore: (r) => getTAPSCategoryTotals(r).school_culture,
      },
    ]
  }

  return [
    {
      name: 'Academic Performance',
      max: SCORING_WEIGHTS.ACADEMIC,
      getScore: (r) => getDemoCategoryTotals(r).academic,
    },
    {
      name: 'Attendance',
      max: SCORING_WEIGHTS.ATTENDANCE,
      getScore: (r) => getDemoCategoryTotals(r).attendance,
    },
    {
      name: 'Infrastructure',
      max: SCORING_WEIGHTS.INFRASTRUCTURE,
      getScore: (r) => getDemoCategoryTotals(r).infrastructure,
    },
    {
      name: 'Teaching Quality',
      max: SCORING_WEIGHTS.TEACHING_QUALITY,
      getScore: (r) => getDemoCategoryTotals(r).teaching_quality,
    },
    {
      name: 'Management',
      max: SCORING_WEIGHTS.MANAGEMENT,
      getScore: (r) => getDemoCategoryTotals(r).management,
    },
    {
      name: 'Student Welfare',
      max: SCORING_WEIGHTS.STUDENT_WELFARE,
      getScore: (r) => getDemoCategoryTotals(r).student_welfare,
    },
    {
      name: 'Community Engagement',
      max: SCORING_WEIGHTS.COMMUNITY,
      getScore: (r) => getDemoCategoryTotals(r).community,
    },
  ]
}

// ============================================================================
// SUGGESTED PROMPTS FOR UI
// ============================================================================

export async function getAssessmentAIPromptSuggestions() {
  return {
    school: [
      'Analyze my school\'s overall performance and provide key insights',
      'What are the main areas where my school needs improvement?',
      'How does my school compare to similar schools in the region?',
      'Provide an action plan to improve my school\'s rating',
      'What are my school\'s biggest strengths based on the assessment?'
    ],
    regional: [
      'Provide an overview of regional education performance',
      'Which schools in my region need the most support?',
      'What are the common challenges across schools in this region?',
      'Identify best practices from top-performing schools',
      'Recommend strategies to improve regional education outcomes'
    ],
    national: [
      'Provide a national education performance summary',
      'Compare regional education performance across the country',
      'What are the key policy priorities based on assessment data?',
      'Identify national education trends and patterns',
      'Recommend resource allocation strategies for underperforming regions'
    ],
    category: {
      academic: [
        'Analyze academic performance trends and provide improvement strategies',
        'How does academic performance compare to regional averages?'
      ],
      attendance: [
        'What factors are affecting attendance rates?',
        'Recommend strategies to improve student attendance'
      ],
      infrastructure: [
        'Assess infrastructure adequacy and prioritize improvements',
        'What infrastructure investments would have the highest impact?'
      ],
      teaching_quality: [
        'Analyze teaching quality indicators and recommend training priorities',
        'How can teaching effectiveness be improved?'
      ],
      management: [
        'Evaluate school management effectiveness',
        'What leadership improvements would benefit the school most?'
      ],
      student_welfare: [
        'Assess student welfare programs and their effectiveness',
        'What additional student support services are needed?'
      ]
    }
  }
}
