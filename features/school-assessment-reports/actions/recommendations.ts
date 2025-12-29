"use server"

import { createServiceRoleSupabaseClient } from "@/lib/supabase"
import { GeminiService } from "@/lib/gemini-service"
import { 
  calculateAllCategoryScores, 
  identifyWeakCategories,
  getScoreBreakdown,
  getRatingLabel,
  calculateAllTAPSCategoryScores,
  calculateTAPSTotalScore,
  assignTAPSRatingGrade,
} from "./scoring"
import type { 
  ReportRecommendation, 
  CategoryName, 
  RecommendationPriority,
  SchoolAssessmentReport,
  TAPSCategoryName,
} from "../types"
import { TAPS_RATING_THRESHOLDS, TAPS_TOTAL_MAX_SCORE } from "../types"

// ============================================================================
// CONSTANTS
// ============================================================================

const CATEGORY_LABELS: Record<CategoryName | TAPSCategoryName | 'general', string> = {
  academic: 'Academic Performance',
  attendance: 'Attendance',
  infrastructure: 'Infrastructure',
  teaching_quality: 'Teaching Quality',
  management: 'Management',
  student_welfare: 'Student Welfare',
  community: 'Community Engagement',
  school_inputs_operations: 'School Inputs & Operations',
  leadership: 'Leadership',
  academics: 'Academics',
  teacher_development: 'Teacher Development',
  health_safety: 'Health & Safety',
  school_culture: 'School Culture',
  general: 'General',
}

const TAPS_CATEGORY_MAX: Record<TAPSCategoryName, number> = {
  school_inputs_operations: 80,
  leadership: 30,
  academics: 200,
  teacher_development: 20,
  health_safety: 50,
  school_culture: 70,
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Maps database row to ReportRecommendation type
 */
function mapDbRowToRecommendation(row: any): ReportRecommendation {
  return {
    id: row.id,
    reportId: row.report_id,
    category: row.category,
    priority: row.priority as RecommendationPriority,
    recommendationText: row.recommendation_text,
    focusAreas: row.focus_areas || [],
    generatedAt: row.generated_at,
    createdAt: row.created_at,
  }
}

/**
 * Builds a detailed prompt for the Gemini AI to generate recommendations
 */
function buildRecommendationPrompt(
  schoolName: string,
  regionName: string,
  academicYear: string,
  termName: string,
  scoreBreakdown: ReturnType<typeof getScoreBreakdown>,
  weakCategories: ReturnType<typeof identifyWeakCategories>
): string {
  const categoryDetails = scoreBreakdown.categories
    .map(c => `- ${c.label}: ${c.earned}/${c.max} points (${c.percentage}%)`)
    .join('\n')
  
  const weakCategoryList = weakCategories
    .map(w => `- ${CATEGORY_LABELS[w.category]}: ${w.percentage}% (Priority: ${w.priority.toUpperCase()})`)
    .join('\n')
  
  return `
You are an educational consultant for the Ministry of Education in Guyana. You are analyzing a school assessment report and need to provide actionable recommendations for improvement.

SCHOOL ASSESSMENT SUMMARY:
School: ${schoolName}
Region: ${regionName}
Academic Year: ${academicYear}
Term: ${termName}
Overall Score: ${scoreBreakdown.totalEarned}/${scoreBreakdown.totalMax} points (${scoreBreakdown.totalPercentage}%)
Overall Rating: ${scoreBreakdown.ratingLabel}

CATEGORY SCORES:
${categoryDetails}

AREAS REQUIRING IMPROVEMENT:
${weakCategoryList || 'All categories are performing above 60%'}

INSTRUCTIONS:
1. Analyze the weak categories and provide specific, actionable recommendations
2. Consider the Guyanese educational context and available resources
3. Prioritize recommendations based on impact and feasibility
4. For each recommendation, identify specific focus areas
5. Provide practical steps that can be implemented within one academic term

Please provide recommendations in the following JSON format (return ONLY valid JSON, no markdown):
{
  "recommendations": [
    {
      "category": "category_name",
      "priority": "high|medium|low",
      "recommendation": "Detailed recommendation text",
      "focusAreas": ["area1", "area2", "area3"]
    }
  ]
}

Focus on the most impactful improvements. Provide 3-5 recommendations total, prioritizing HIGH priority categories first.
`
}

function buildTAPSRecommendationPrompt(args: {
  schoolName: string
  regionName: string
  academicYear: string
  termName: string
  totalScore: number
  gradeLabel: string
  categories: { category: TAPSCategoryName; earned: number; max: number; percentage: number }[]
  weakCategories: { category: TAPSCategoryName; percentage: number; priority: RecommendationPriority }[]
}): string {
  const categoryDetails = args.categories
    .map((c) => `- ${CATEGORY_LABELS[c.category]}: ${c.earned}/${c.max} points (${c.percentage}%)`)
    .join('\n')

  const weakCategoryList = args.weakCategories
    .map((w) => `- ${CATEGORY_LABELS[w.category]}: ${w.percentage}% (Priority: ${w.priority.toUpperCase()})`)
    .join('\n')

  return `
You are an educational consultant for the Ministry of Education in Guyana. You are analyzing a SECONDARY school assessment report scored using the official TAPS system and need to provide actionable recommendations for improvement.

SCHOOL ASSESSMENT SUMMARY:
School: ${args.schoolName}
Region: ${args.regionName}
Academic Year: ${args.academicYear}
Term: ${args.termName}
Overall Score: ${args.totalScore}/${TAPS_TOTAL_MAX_SCORE} points
Overall Rating: ${args.gradeLabel}

TAPS CATEGORY SCORES:
${categoryDetails}

AREAS REQUIRING IMPROVEMENT:
${weakCategoryList || 'All categories are performing above 60%'}

INSTRUCTIONS:
1. Provide specific, actionable recommendations that would improve next-term TAPS scores.
2. Prioritize recommendations based on impact and feasibility in one academic term.
3. Keep suggestions practical for Guyana's school context.
4. IMPORTANT: The database only supports category values from the demo system; set "category" to "general" for every recommendation.

Please provide recommendations in the following JSON format (return ONLY valid JSON, no markdown):
{
  "recommendations": [
    {
      "category": "general",
      "priority": "high|medium|low",
      "recommendation": "Detailed recommendation text",
      "focusAreas": ["area1", "area2", "area3"]
    }
  ]
}

Provide 3-5 recommendations total, prioritizing HIGH priority areas first.
`
}

/**
 * Parses the AI response to extract recommendations
 */
function parseAIResponse(response: string): {
  category: CategoryName | TAPSCategoryName | 'general'
  priority: RecommendationPriority
  recommendation: string
  focusAreas: string[]
}[] {
  try {
    // Try to extract JSON from the response
    let jsonStr = response
    
    // Handle case where AI includes markdown code blocks
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1]
    }
    
    // Parse JSON
    const parsed = JSON.parse(jsonStr.trim())
    
    if (parsed.recommendations && Array.isArray(parsed.recommendations)) {
      return parsed.recommendations.map((rec: any) => ({
        category: validateCategory(rec.category),
        priority: validatePriority(rec.priority),
        recommendation: rec.recommendation || rec.text || '',
        focusAreas: Array.isArray(rec.focusAreas) ? rec.focusAreas : [],
      }))
    }
    
    return []
  } catch (error) {
    console.error('Error parsing AI response:', error)
    return []
  }
}

/**
 * Validates and normalizes category name
 */
function validateCategory(category: string): CategoryName | TAPSCategoryName | 'general' {
  const normalized = category?.toLowerCase().replace(/\s+/g, '_')
  const validCategories: (CategoryName | TAPSCategoryName | 'general')[] = [
    'academic', 'attendance', 'infrastructure', 'teaching_quality',
    'management', 'student_welfare', 'community', 'general'
  ]

  const validTAPSCategories: TAPSCategoryName[] = [
    'school_inputs_operations',
    'leadership',
    'academics',
    'teacher_development',
    'health_safety',
    'school_culture',
  ]
  
  // Handle variations
  const mappings: Record<string, CategoryName | TAPSCategoryName | 'general'> = {
    'academic_performance': 'academic',
    'student_attendance': 'attendance',
    'teacher_attendance': 'attendance',
    'facilities': 'infrastructure',
    'teaching': 'teaching_quality',
    'teachers': 'teaching_quality',
    'school_management': 'management',
    'administration': 'management',
    'welfare': 'student_welfare',
    'students': 'student_welfare',
    'community_engagement': 'community',
    'partnerships': 'community',

    // Common TAPS variations
    'school_inputs': 'school_inputs_operations',
    'school_inputs_&_operations': 'school_inputs_operations',
    'inputs_operations': 'school_inputs_operations',
    'teacher_development_and_support': 'teacher_development',
    'health_and_safety': 'health_safety',
  }
  
  if (validCategories.includes(normalized as CategoryName | TAPSCategoryName | 'general')) {
    return normalized as CategoryName | TAPSCategoryName | 'general'
  }

  if (validTAPSCategories.includes(normalized as TAPSCategoryName)) {
    return normalized as TAPSCategoryName
  }
  
  if (mappings[normalized]) {
    return mappings[normalized]
  }
  
  return 'general'
}

function isTAPSReportRow(report: any): boolean {
  return Boolean(
    report?.school_type === 'secondary' ||
      report?.taps_rating_grade ||
      report?.taps_school_inputs_scores ||
      report?.taps_leadership_scores ||
      report?.taps_academics_scores ||
      report?.taps_teacher_development_scores ||
      report?.taps_health_safety_scores ||
      report?.taps_school_culture_scores
  )
}

function identifyWeakTAPSCategories(categoryScores: Record<TAPSCategoryName, number>, thresholdPercentage: number = 60) {
  const weak: { category: TAPSCategoryName; percentage: number; priority: RecommendationPriority }[] = []

  for (const [category, earned] of Object.entries(categoryScores) as [TAPSCategoryName, number][]) {
    const max = TAPS_CATEGORY_MAX[category]
    const percentage = max > 0 ? (earned / max) * 100 : 0

    if (percentage < thresholdPercentage) {
      const priority: RecommendationPriority = percentage < 40 ? 'high' : percentage < 60 ? 'medium' : 'low'
      weak.push({ category, percentage: Math.round(percentage), priority })
    }
  }

  return weak.sort((a, b) => a.percentage - b.percentage)
}

/**
 * Validates and normalizes priority
 */
function validatePriority(priority: string): RecommendationPriority {
  const normalized = priority?.toLowerCase()
  if (['high', 'medium', 'low'].includes(normalized)) {
    return normalized as RecommendationPriority
  }
  return 'medium'
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Generates AI-powered recommendations for a submitted report
 */
export async function generateRecommendations(reportId: string) {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    // Get the report with school and period details
    const { data: report, error: reportError } = await supabase
      .from('hmr_school_assessment_reports')
      .select(`
        *,
        sms_schools(name, sms_regions(name)),
        hmr_school_assessment_periods(academic_year, term_name)
      `)
      .eq('id', reportId)
      .single()
    
    if (reportError || !report) {
      console.error('Error fetching report for recommendations:', reportError)
      return { recommendations: [], error: 'Report not found.' }
    }
    
    const isTAPS = isTAPSReportRow(report)

    // Extract school and period info
    const schoolName = report.sms_schools?.name || 'Unknown School'
    const regionName = report.sms_schools?.sms_regions?.name || 'Unknown Region'
    const academicYear = report.hmr_school_assessment_periods?.academic_year || ''
    const termName = report.hmr_school_assessment_periods?.term_name || ''

    // Build prompt (Demo vs TAPS)
    let prompt: string

    if (isTAPS) {
      const tapsCategoryScores = calculateAllTAPSCategoryScores({
        schoolInputs: report.taps_school_inputs_scores || {},
        leadership: report.taps_leadership_scores || {},
        academics: report.taps_academics_scores || {},
        teacherDevelopment: report.taps_teacher_development_scores || {},
        healthSafety: report.taps_health_safety_scores || {},
        schoolCulture: report.taps_school_culture_scores || {},
      })

      const totalScore = calculateTAPSTotalScore(tapsCategoryScores)
      const grade = assignTAPSRatingGrade(totalScore)
      const gradeLabel = `Grade ${grade} (${TAPS_RATING_THRESHOLDS[grade].label})`

      const categories = (Object.entries(tapsCategoryScores) as [TAPSCategoryName, number][]).map(([category, earned]) => {
        const max = TAPS_CATEGORY_MAX[category]
        const percentage = max > 0 ? Math.round((earned / max) * 100) : 0
        return { category, earned, max, percentage }
      })

      const weak = identifyWeakTAPSCategories(tapsCategoryScores)

      prompt = buildTAPSRecommendationPrompt({
        schoolName,
        regionName,
        academicYear,
        termName,
        totalScore,
        gradeLabel,
        categories,
        weakCategories: weak,
      })
    } else {
      // Calculate demo scores
      const categoryScores = calculateAllCategoryScores({
        academic: report.academic_scores || {},
        attendance: report.attendance_scores || {},
        infrastructure: report.infrastructure_scores || {},
        teachingQuality: report.teaching_quality_scores || {},
        management: report.management_scores || {},
        studentWelfare: report.student_welfare_scores || {},
        community: report.community_scores || {},
      })

      const scoreBreakdown = getScoreBreakdown(categoryScores)
      const weakCategories = identifyWeakCategories(categoryScores)

      prompt = buildRecommendationPrompt(
        schoolName,
        regionName,
        academicYear,
        termName,
        scoreBreakdown,
        weakCategories
      )
    }
    
    // Call Gemini AI
    let aiRecommendations: {
      category: CategoryName | TAPSCategoryName | 'general'
      priority: RecommendationPriority
      recommendation: string
      focusAreas: string[]
    }[] = []
    
    try {
      const gemini = new GeminiService()
      const response = await gemini.generateInsight(prompt, [])
      aiRecommendations = parseAIResponse(response)
    } catch (aiError) {
      console.error('Error calling Gemini AI:', aiError)
      // Generate fallback recommendations
      aiRecommendations = isTAPS
        ? [{
            category: 'general',
            priority: 'medium',
            recommendation: 'Focus on strengthening weaker TAPS categories through targeted, term-length improvement actions, coaching support, and consistent monitoring of key indicators (attendance, academics, safety, and school culture).',
            focusAreas: ['Targeted interventions', 'Staff coaching', 'Monitoring and follow-up'],
          }]
        : generateFallbackRecommendations(identifyWeakCategories(calculateAllCategoryScores({
            academic: report.academic_scores || {},
            attendance: report.attendance_scores || {},
            infrastructure: report.infrastructure_scores || {},
            teachingQuality: report.teaching_quality_scores || {},
            management: report.management_scores || {},
            studentWelfare: report.student_welfare_scores || {},
            community: report.community_scores || {},
          })))
    }
    
    // If no recommendations generated, use fallback
    if (aiRecommendations.length === 0) {
      aiRecommendations = [{
        category: 'general',
        priority: 'medium',
        recommendation: 'Develop a focused improvement plan for the next term, prioritizing the lowest-performing areas and setting measurable targets with weekly tracking.',
        focusAreas: ['Improvement planning', 'Measurable targets', 'Weekly tracking'],
      }]
    }

    // IMPORTANT: DB constraint currently only allows demo categories.
    // Store TAPS recommendations as category='general' so they display on TAPS report details.
    if (isTAPS) {
      aiRecommendations = aiRecommendations.map((r) => ({ ...r, category: 'general' }))
    }
    
    // Save recommendations to database
    const savedRecommendations = await saveRecommendations(reportId, aiRecommendations as any)
    
    return { recommendations: savedRecommendations, error: null }
  } catch (error) {
    console.error('Error in generateRecommendations:', error)
    return { recommendations: [], error: 'Failed to generate recommendations.' }
  }
}

/**
 * Gets recommendations for a report, generating them if missing.
 * This ensures recommendations show up on report details for both Demo and TAPS.
 */
export async function getOrGenerateRecommendations(reportId: string) {
  const existing = await getRecommendations(reportId)
  if (existing.recommendations && existing.recommendations.length > 0) {
    return existing
  }

  const generated = await generateRecommendations(reportId)
  if (generated.recommendations && generated.recommendations.length > 0) {
    return generated
  }

  return getRecommendations(reportId)
}

/**
 * Generates fallback recommendations when AI is unavailable
 */
function generateFallbackRecommendations(
  weakCategories: ReturnType<typeof identifyWeakCategories>
): {
  category: CategoryName | 'general'
  priority: RecommendationPriority
  recommendation: string
  focusAreas: string[]
}[] {
  const fallbackTemplates: Record<CategoryName, {
    recommendation: string
    focusAreas: string[]
  }> = {
    academic: {
      recommendation: 'Focus on improving academic outcomes by implementing targeted intervention programs for struggling students, enhancing assessment practices, and diversifying the curriculum to engage all learners.',
      focusAreas: ['Student intervention programs', 'Assessment quality', 'Curriculum enrichment'],
    },
    attendance: {
      recommendation: 'Address attendance issues by establishing robust tracking systems, engaging parents in attendance improvement initiatives, and creating incentive programs for consistent attendance.',
      focusAreas: ['Attendance tracking', 'Parent engagement', 'Incentive programs'],
    },
    infrastructure: {
      recommendation: 'Prioritize infrastructure improvements by conducting a facility needs assessment, seeking funding for critical repairs, and ensuring safety standards are met across all school buildings.',
      focusAreas: ['Facility assessment', 'Maintenance planning', 'Safety compliance'],
    },
    teaching_quality: {
      recommendation: 'Enhance teaching quality through regular professional development sessions, peer observation and feedback programs, and implementation of modern teaching methodologies.',
      focusAreas: ['Professional development', 'Peer learning', 'Teaching innovation'],
    },
    management: {
      recommendation: 'Strengthen school management by improving record-keeping systems, enhancing parent-school communication, and ensuring regular SBA meetings with documented outcomes.',
      focusAreas: ['Record management', 'Stakeholder communication', 'Governance'],
    },
    student_welfare: {
      recommendation: 'Improve student welfare by establishing or strengthening guidance services, expanding extracurricular offerings, and implementing positive discipline approaches.',
      focusAreas: ['Counseling services', 'Extracurricular activities', 'Discipline policy'],
    },
    community: {
      recommendation: 'Increase community engagement by organizing regular community events, establishing partnerships with local businesses and NGOs, and participating in government education programs.',
      focusAreas: ['Community events', 'Local partnerships', 'Program participation'],
    },
  }
  
  if (weakCategories.length === 0) {
    return [{
      category: 'general',
      priority: 'low',
      recommendation: 'Continue maintaining high standards across all categories. Consider setting stretch goals and sharing best practices with other schools in your region.',
      focusAreas: ['Best practice sharing', 'Continuous improvement', 'Regional leadership'],
    }]
  }
  
  return weakCategories.slice(0, 5).map(weak => ({
    category: weak.category,
    priority: weak.priority,
    recommendation: fallbackTemplates[weak.category].recommendation,
    focusAreas: fallbackTemplates[weak.category].focusAreas,
  }))
}

/**
 * Saves recommendations to the database
 */
export async function saveRecommendations(
  reportId: string,
  recommendations: {
    category: CategoryName | 'general'
    priority: RecommendationPriority
    recommendation: string
    focusAreas: string[]
  }[]
) {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    // Delete existing recommendations for this report
    await supabase
      .from('hmr_school_assessment_recommendations')
      .delete()
      .eq('report_id', reportId)
    
    // Insert new recommendations
    const recommendationsToInsert = recommendations.map(rec => ({
      report_id: reportId,
      category: rec.category,
      priority: rec.priority,
      recommendation_text: rec.recommendation,
      focus_areas: rec.focusAreas,
      generated_at: new Date().toISOString(),
    }))
    
    const { data, error } = await supabase
      .from('hmr_school_assessment_recommendations')
      .insert(recommendationsToInsert)
      .select()
    
    if (error) {
      console.error('Error saving recommendations:', error)
      return []
    }
    
    return data.map(mapDbRowToRecommendation)
  } catch (error) {
    console.error('Error in saveRecommendations:', error)
    return []
  }
}

/**
 * Gets recommendations for a specific report
 */
export async function getRecommendations(reportId: string) {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    const { data, error } = await supabase
      .from('hmr_school_assessment_recommendations')
      .select('*')
      .eq('report_id', reportId)
      .order('priority', { ascending: true }) // high, low, medium alphabetically but we'll sort properly
    
    if (error) {
      console.error('Error fetching recommendations:', error)
      return { recommendations: [], error: 'Failed to fetch recommendations.' }
    }
    
    // Sort by priority: high, medium, low
    const priorityOrder: Record<RecommendationPriority, number> = {
      high: 1,
      medium: 2,
      low: 3,
    }
    
    const sorted = data.sort((a, b) => 
      priorityOrder[a.priority as RecommendationPriority] - priorityOrder[b.priority as RecommendationPriority]
    )
    
    return { 
      recommendations: sorted.map(mapDbRowToRecommendation), 
      error: null 
    }
  } catch (error) {
    console.error('Error in getRecommendations:', error)
    return { recommendations: [], error: 'An unexpected error occurred.' }
  }
}

/**
 * Regenerates recommendations for a report (admin function)
 */
export async function regenerateRecommendations(reportId: string) {
  return generateRecommendations(reportId)
}
