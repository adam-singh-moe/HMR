import {
  SCORING_WEIGHTS,
  TOTAL_MAX_SCORE,
  RATING_THRESHOLDS,
  CATEGORY_NAMES,
  TAPS_SCORING_WEIGHTS,
  TAPS_TOTAL_MAX_SCORE,
  TAPS_RATING_THRESHOLDS,
  TAPS_CATEGORY_NAMES,
  TAPS_PERCENTAGE_BANDS,
  TAPS_COUNT_BANDS,
  TAPS_RATIO_BANDS,
  type RatingLevel,
  type TAPSRatingGrade,
  type CategoryName,
  type TAPSCategoryName,
  type CategoryScoreBreakdown,
  type ScoreBreakdown,
  type AcademicScores,
  type AttendanceScores,
  type InfrastructureScores,
  type TeachingQualityScores,
  type ManagementScores,
  type StudentWelfareScores,
  type CommunityScores,
  type TAPSSchoolInputsScores,
  type TAPSLeadershipScores,
  type TAPSAcademicsScores,
  type TAPSTeacherDevelopmentScores,
  type TAPSHealthSafetyScores,
  type TAPSSchoolCultureScores,
} from "../types"
import type { SchoolType } from "@/lib/school-type"

// ============================================================================
// SCORING RUBRICS
// Each category has specific metrics with their own point allocations
// ============================================================================

/**
 * Calculate Academic Performance score (max 300 points)
 */
export function calculateAcademicScore(data: Partial<AcademicScores>): number {
  let score = 0
  
  // Grade 6 Assessment Pass Rates (max 80 points)
  // Each subject: 0-100% maps to 0-26.67 points
  if (data.grade6MathPassRate !== undefined) {
    score += (data.grade6MathPassRate / 100) * 26.67
  }
  if (data.grade6EnglishPassRate !== undefined) {
    score += (data.grade6EnglishPassRate / 100) * 26.67
  }
  if (data.grade6SciencePassRate !== undefined) {
    score += (data.grade6SciencePassRate / 100) * 26.66
  }
  
  // CSEC Results (max 80 points) - for secondary schools
  if (data.csecPassRate !== undefined) {
    score += (data.csecPassRate / 100) * 50
  }
  if (data.csecSubjectsPassed !== undefined) {
    // Assume max 6 subjects passed = 30 points
    score += Math.min(data.csecSubjectsPassed / 6, 1) * 30
  }
  
  // Internal Assessments (max 60 points)
  if (data.termlyAssessmentCompletion !== undefined) {
    score += (data.termlyAssessmentCompletion / 100) * 40
  }
  if (data.assessmentQuality !== undefined) {
    // 1-5 scale maps to 0-20 points
    score += ((data.assessmentQuality - 1) / 4) * 20
  }
  
  // Subject Diversity (max 40 points)
  if (data.coreSubjectsCovered !== undefined) {
    // Assume 8 core subjects = full 20 points
    score += Math.min(data.coreSubjectsCovered / 8, 1) * 20
  }
  if (data.electiveSubjectsOffered !== undefined) {
    // Assume 4 electives = full 20 points
    score += Math.min(data.electiveSubjectsOffered / 4, 1) * 20
  }
  
  // Literacy & Numeracy Programs (max 40 points)
  if (data.literacyProgramImplementation !== undefined) {
    score += ((data.literacyProgramImplementation - 1) / 4) * 20
  }
  if (data.numeracyProgramImplementation !== undefined) {
    score += ((data.numeracyProgramImplementation - 1) / 4) * 20
  }
  
  return Math.min(Math.round(score), SCORING_WEIGHTS.ACADEMIC)
}

/**
 * Calculate Attendance score (max 150 points)
 */
export function calculateAttendanceScore(data: Partial<AttendanceScores>): number {
  let score = 0
  
  // Student Attendance (max 70 points)
  if (data.studentAttendanceRate !== undefined) {
    score += (data.studentAttendanceRate / 100) * 50
  }
  if (data.studentAbsenteeismRate !== undefined) {
    // Lower is better - 0% absenteeism = 20 points, 100% = 0 points
    score += ((100 - data.studentAbsenteeismRate) / 100) * 20
  }
  
  // Teacher Attendance (max 50 points)
  if (data.teacherAttendanceRate !== undefined) {
    score += (data.teacherAttendanceRate / 100) * 35
  }
  if (data.teacherAbsenteeismRate !== undefined) {
    score += ((100 - data.teacherAbsenteeismRate) / 100) * 15
  }
  
  // Punctuality (max 30 points)
  if (data.studentPunctualityRate !== undefined) {
    score += (data.studentPunctualityRate / 100) * 15
  }
  if (data.teacherPunctualityRate !== undefined) {
    score += (data.teacherPunctualityRate / 100) * 15
  }
  
  return Math.min(Math.round(score), SCORING_WEIGHTS.ATTENDANCE)
}

/**
 * Calculate Infrastructure score (max 150 points)
 */
export function calculateInfrastructureScore(data: Partial<InfrastructureScores>): number {
  let score = 0
  
  // Classrooms (max 40 points)
  if (data.classroomCondition !== undefined) {
    score += ((data.classroomCondition - 1) / 4) * 15
  }
  if (data.classroomCapacityAdequacy !== undefined) {
    score += ((data.classroomCapacityAdequacy - 1) / 4) * 15
  }
  if (data.furnitureCondition !== undefined) {
    score += ((data.furnitureCondition - 1) / 4) * 10
  }
  
  // Sanitation (max 30 points)
  if (data.washroomCondition !== undefined) {
    score += ((data.washroomCondition - 1) / 4) * 12
  }
  if (data.washroomStudentRatio !== undefined) {
    // Lower ratio is better - 20:1 or less = full points
    const ratio = Math.max(data.washroomStudentRatio, 10)
    score += Math.max(0, (40 - ratio) / 30) * 10
  }
  if (data.waterSupplyAdequacy !== undefined) {
    score += ((data.waterSupplyAdequacy - 1) / 4) * 8
  }
  
  // Library (max 25 points)
  if (data.libraryExists) {
    score += 10
    if (data.libraryBookCount !== undefined) {
      // 500+ books = full 8 points
      score += Math.min(data.libraryBookCount / 500, 1) * 8
    }
    if (data.libraryCondition !== undefined) {
      score += ((data.libraryCondition - 1) / 4) * 7
    }
  }
  
  // Technology (max 30 points)
  if (data.computerLabExists) {
    score += 8
    if (data.computerCount !== undefined) {
      // 20+ computers = full 8 points
      score += Math.min(data.computerCount / 20, 1) * 8
    }
  }
  if (data.internetAccess) {
    score += 8
  }
  if (data.projectorCount !== undefined) {
    // 3+ projectors = full 6 points
    score += Math.min(data.projectorCount / 3, 1) * 6
  }
  
  // Safety (max 25 points)
  if (data.fireExtinguishers !== undefined) {
    // 4+ extinguishers = full 6 points
    score += Math.min(data.fireExtinguishers / 4, 1) * 6
  }
  if (data.firstAidKitAvailable) {
    score += 6
  }
  if (data.emergencyExitsAdequate) {
    score += 6
  }
  if (data.playgroundSafety !== undefined) {
    score += ((data.playgroundSafety - 1) / 4) * 7
  }
  
  return Math.min(Math.round(score), SCORING_WEIGHTS.INFRASTRUCTURE)
}

/**
 * Calculate Teaching Quality score (max 150 points)
 */
export function calculateTeachingQualityScore(data: Partial<TeachingQualityScores>): number {
  let score = 0
  
  // Qualified Teachers (max 50 points)
  if (data.percentageQualifiedTeachers !== undefined) {
    score += (data.percentageQualifiedTeachers / 100) * 25
  }
  if (data.percentageTrainedTeachers !== undefined) {
    score += (data.percentageTrainedTeachers / 100) * 15
  }
  if (data.teacherStudentRatio !== undefined) {
    // Lower ratio is better - 20:1 or less = full points
    const ratio = Math.max(data.teacherStudentRatio, 15)
    score += Math.max(0, (35 - ratio) / 20) * 10
  }
  
  // Professional Development (max 40 points)
  if (data.pdSessionsAttended !== undefined) {
    // 5+ sessions = full 15 points
    score += Math.min(data.pdSessionsAttended / 5, 1) * 15
  }
  if (data.pdHoursCompleted !== undefined) {
    // 20+ hours = full 15 points
    score += Math.min(data.pdHoursCompleted / 20, 1) * 15
  }
  if (data.inHouseTrainingSessions !== undefined) {
    // 3+ sessions = full 10 points
    score += Math.min(data.inHouseTrainingSessions / 3, 1) * 10
  }
  
  // Lesson Planning (max 30 points)
  if (data.lessonPlansSubmitted !== undefined) {
    score += (data.lessonPlansSubmitted / 100) * 12
  }
  if (data.lessonPlanQuality !== undefined) {
    score += ((data.lessonPlanQuality - 1) / 4) * 10
  }
  if (data.schemeOfWorkCompletion !== undefined) {
    score += (data.schemeOfWorkCompletion / 100) * 8
  }
  
  // Teaching Methods (max 30 points)
  if (data.differentiatedInstruction !== undefined) {
    score += ((data.differentiatedInstruction - 1) / 4) * 10
  }
  if (data.technologyIntegration !== undefined) {
    score += ((data.technologyIntegration - 1) / 4) * 10
  }
  if (data.assessmentForLearning !== undefined) {
    score += ((data.assessmentForLearning - 1) / 4) * 10
  }
  
  return Math.min(Math.round(score), SCORING_WEIGHTS.TEACHING_QUALITY)
}

/**
 * Calculate Management score (max 100 points)
 */
export function calculateManagementScore(data: Partial<ManagementScores>): number {
  let score = 0
  
  // SBA Meetings (max 25 points)
  if (data.sbaMeetingsHeld !== undefined) {
    // 3+ meetings = full 10 points
    score += Math.min(data.sbaMeetingsHeld / 3, 1) * 10
  }
  if (data.sbaMeetingMinutesRecorded) {
    score += 7
  }
  if (data.sbaDecisionsImplemented !== undefined) {
    score += (data.sbaDecisionsImplemented / 100) * 8
  }
  
  // Parent Engagement (max 25 points)
  if (data.ptaMeetingsHeld !== undefined) {
    // 2+ meetings = full 8 points
    score += Math.min(data.ptaMeetingsHeld / 2, 1) * 8
  }
  if (data.parentAttendanceRate !== undefined) {
    score += (data.parentAttendanceRate / 100) * 10
  }
  if (data.parentVolunteerPrograms) {
    score += 7
  }
  
  // Budget Management (max 25 points)
  if (data.budgetUtilizationRate !== undefined) {
    score += (data.budgetUtilizationRate / 100) * 10
  }
  if (data.financialRecordsUpToDate) {
    score += 8
  }
  if (data.auditCompliance) {
    score += 7
  }
  
  // Record Keeping (max 25 points)
  if (data.studentRecordsComplete !== undefined) {
    score += (data.studentRecordsComplete / 100) * 10
  }
  if (data.staffRecordsComplete !== undefined) {
    score += (data.staffRecordsComplete / 100) * 8
  }
  if (data.inventoryRecordsComplete !== undefined) {
    score += (data.inventoryRecordsComplete / 100) * 7
  }
  
  return Math.min(Math.round(score), SCORING_WEIGHTS.MANAGEMENT)
}

/**
 * Calculate Student Welfare score (max 100 points)
 */
export function calculateStudentWelfareScore(data: Partial<StudentWelfareScores>): number {
  let score = 0
  
  // Guidance Services (max 30 points)
  if (data.guidanceCounselorAvailable) {
    score += 12
  }
  if (data.counselingSessionsProvided !== undefined) {
    // 10+ sessions = full 10 points
    score += Math.min(data.counselingSessionsProvided / 10, 1) * 10
  }
  if (data.careerGuidancePrograms) {
    score += 8
  }
  
  // Extracurricular (max 25 points)
  if (data.clubsAndSocieties !== undefined) {
    // 5+ clubs = full 7 points
    score += Math.min(data.clubsAndSocieties / 5, 1) * 7
  }
  if (data.sportsTeams !== undefined) {
    // 4+ teams = full 6 points
    score += Math.min(data.sportsTeams / 4, 1) * 6
  }
  if (data.culturalActivities !== undefined) {
    // 4+ activities = full 6 points
    score += Math.min(data.culturalActivities / 4, 1) * 6
  }
  if (data.studentParticipationRate !== undefined) {
    score += (data.studentParticipationRate / 100) * 6
  }
  
  // Discipline (max 25 points)
  if (data.disciplinaryIncidents !== undefined) {
    // 0 incidents = 10 points, 20+ incidents = 0 points
    score += Math.max(0, (20 - data.disciplinaryIncidents) / 20) * 10
  }
  if (data.disciplinePolicyImplemented) {
    score += 8
  }
  if (data.positiveReinforcementPrograms) {
    score += 7
  }
  
  // Special Needs Support (max 20 points)
  if (data.specialNeedsStudentsEnrolled !== undefined && data.specialNeedsStudentsEnrolled > 0) {
    if (data.specialNeedsSupportProvided) {
      score += 12
    }
  } else {
    // If no special needs students, award partial points for having systems in place
    score += 6
  }
  if (data.inclusiveEducationPractices !== undefined) {
    score += ((data.inclusiveEducationPractices - 1) / 4) * 8
  }
  
  return Math.min(Math.round(score), SCORING_WEIGHTS.STUDENT_WELFARE)
}

/**
 * Calculate Community score (max 50 points)
 */
export function calculateCommunityScore(data: Partial<CommunityScores>): number {
  let score = 0
  
  // Community Involvement (max 30 points)
  if (data.communityEventsHosted !== undefined) {
    // 3+ events = full 12 points
    score += Math.min(data.communityEventsHosted / 3, 1) * 12
  }
  if (data.communityVolunteers !== undefined) {
    // 10+ volunteers = full 10 points
    score += Math.min(data.communityVolunteers / 10, 1) * 10
  }
  if (data.communityProjectsCompleted !== undefined) {
    // 2+ projects = full 8 points
    score += Math.min(data.communityProjectsCompleted / 2, 1) * 8
  }
  
  // External Partnerships (max 20 points)
  if (data.businessPartnerships !== undefined) {
    // 2+ partnerships = full 7 points
    score += Math.min(data.businessPartnerships / 2, 1) * 7
  }
  if (data.ngoPartnerships !== undefined) {
    // 2+ partnerships = full 7 points
    score += Math.min(data.ngoPartnerships / 2, 1) * 7
  }
  if (data.governmentProgramsParticipation !== undefined) {
    // 2+ programs = full 6 points
    score += Math.min(data.governmentProgramsParticipation / 2, 1) * 6
  }
  
  return Math.min(Math.round(score), SCORING_WEIGHTS.COMMUNITY)
}

// ============================================================================
// AGGREGATE SCORING FUNCTIONS
// ============================================================================

/**
 * Calculate scores for all categories
 */
export function calculateAllCategoryScores(data: {
  academic: Partial<AcademicScores>
  attendance: Partial<AttendanceScores>
  infrastructure: Partial<InfrastructureScores>
  teachingQuality: Partial<TeachingQualityScores>
  management: Partial<ManagementScores>
  studentWelfare: Partial<StudentWelfareScores>
  community: Partial<CommunityScores>
}): Record<CategoryName, number> {
  return {
    academic: calculateAcademicScore(data.academic || {}),
    attendance: calculateAttendanceScore(data.attendance || {}),
    infrastructure: calculateInfrastructureScore(data.infrastructure || {}),
    teaching_quality: calculateTeachingQualityScore(data.teachingQuality || {}),
    management: calculateManagementScore(data.management || {}),
    student_welfare: calculateStudentWelfareScore(data.studentWelfare || {}),
    community: calculateCommunityScore(data.community || {}),
  }
}

/**
 * Calculate total score from category scores
 */
export function calculateTotalScore(categoryScores: Record<CategoryName, number>): number {
  return Object.values(categoryScores).reduce((sum, score) => sum + score, 0)
}

/**
 * Assign rating level based on total score
 */
export function assignRatingLevel(totalScore: number): RatingLevel {
  if (totalScore >= RATING_THRESHOLDS.OUTSTANDING.min) {
    return 'outstanding'
  } else if (totalScore >= RATING_THRESHOLDS.VERY_GOOD.min) {
    return 'very_good'
  } else if (totalScore >= RATING_THRESHOLDS.GOOD.min) {
    return 'good'
  } else if (totalScore >= RATING_THRESHOLDS.SATISFACTORY.min) {
    return 'satisfactory'
  } else {
    return 'needs_improvement'
  }
}

/**
 * Get human-readable label for rating level
 */
export function getRatingLabel(ratingLevel: RatingLevel): string {
  const labels: Record<RatingLevel, string> = {
    outstanding: 'Outstanding',
    very_good: 'Very Good',
    good: 'Good',
    satisfactory: 'Satisfactory',
    needs_improvement: 'Needs Improvement',
  }
  return labels[ratingLevel]
}

/**
 * Get color class for rating level (for UI)
 */
export function getRatingColor(ratingLevel: RatingLevel): string {
  const colors: Record<RatingLevel, string> = {
    outstanding: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    very_good: 'text-green-600 bg-green-50 border-green-200',
    good: 'text-blue-600 bg-blue-50 border-blue-200',
    satisfactory: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    needs_improvement: 'text-red-600 bg-red-50 border-red-200',
  }
  return colors[ratingLevel]
}

/**
 * Get detailed score breakdown for display
 */
export function getScoreBreakdown(categoryScores: Record<CategoryName, number>): ScoreBreakdown {
  const categoryLabels: Record<CategoryName, string> = {
    academic: 'Academic Performance',
    attendance: 'Attendance',
    infrastructure: 'Infrastructure',
    teaching_quality: 'Teaching Quality',
    management: 'Management',
    student_welfare: 'Student Welfare',
    community: 'Community',
  }
  
  const categoryMaxScores: Record<CategoryName, number> = {
    academic: SCORING_WEIGHTS.ACADEMIC,
    attendance: SCORING_WEIGHTS.ATTENDANCE,
    infrastructure: SCORING_WEIGHTS.INFRASTRUCTURE,
    teaching_quality: SCORING_WEIGHTS.TEACHING_QUALITY,
    management: SCORING_WEIGHTS.MANAGEMENT,
    student_welfare: SCORING_WEIGHTS.STUDENT_WELFARE,
    community: SCORING_WEIGHTS.COMMUNITY,
  }
  
  const categories: CategoryScoreBreakdown[] = Object.entries(categoryScores).map(([category, earned]) => ({
    category: category as CategoryName,
    label: categoryLabels[category as CategoryName],
    earned,
    max: categoryMaxScores[category as CategoryName],
    percentage: Math.round((earned / categoryMaxScores[category as CategoryName]) * 100),
  }))
  
  const totalEarned = calculateTotalScore(categoryScores)
  const totalPercentage = Math.round((totalEarned / TOTAL_MAX_SCORE) * 100)
  const ratingLevel = assignRatingLevel(totalEarned)
  
  return {
    categories,
    totalEarned,
    totalMax: TOTAL_MAX_SCORE,
    totalPercentage,
    ratingLevel,
    ratingLabel: getRatingLabel(ratingLevel),
  }
}

/**
 * Identify weak categories (for recommendations)
 * Returns categories scoring below a threshold percentage
 */
export function identifyWeakCategories(
  categoryScores: Record<CategoryName, number>,
  thresholdPercentage: number = 60
): { category: CategoryName; percentage: number; priority: 'high' | 'medium' | 'low' }[] {
  const categoryMaxScores: Record<CategoryName, number> = {
    academic: SCORING_WEIGHTS.ACADEMIC,
    attendance: SCORING_WEIGHTS.ATTENDANCE,
    infrastructure: SCORING_WEIGHTS.INFRASTRUCTURE,
    teaching_quality: SCORING_WEIGHTS.TEACHING_QUALITY,
    management: SCORING_WEIGHTS.MANAGEMENT,
    student_welfare: SCORING_WEIGHTS.STUDENT_WELFARE,
    community: SCORING_WEIGHTS.COMMUNITY,
  }
  
  const weakCategories: { category: CategoryName; percentage: number; priority: 'high' | 'medium' | 'low' }[] = []
  
  for (const [category, earned] of Object.entries(categoryScores)) {
    const max = categoryMaxScores[category as CategoryName]
    const percentage = (earned / max) * 100
    
    if (percentage < thresholdPercentage) {
      let priority: 'high' | 'medium' | 'low'
      if (percentage < 40) {
        priority = 'high'
      } else if (percentage < 60) {
        priority = 'medium'
      } else {
        priority = 'low'
      }
      
      weakCategories.push({
        category: category as CategoryName,
        percentage: Math.round(percentage),
        priority,
      })
    }
  }
  
  // Sort by percentage (lowest first)
  return weakCategories.sort((a, b) => a.percentage - b.percentage)
}

// ============================================================================
// TAPS SCORING FUNCTIONS (SECONDARY SCHOOLS)
// Based on Termly Accountability Performance for Secondary Schools document
// ============================================================================

/**
 * Helper: Get points based on percentage bands
 */
function getPointsFromPercentageBand(
  value: number,
  bandType: keyof typeof TAPS_PERCENTAGE_BANDS,
  maxPoints: number = 10
): number {
  const bands = TAPS_PERCENTAGE_BANDS[bandType]
  
  // For "lower is better" metrics (incidents, late percentage)
  if (bandType === 'INCIDENTS' || bandType === 'LATE_PERCENTAGE') {
    if (value <= bands.EXCELLENT.max) return maxPoints
    if (value <= bands.VERY_GOOD.max) return maxPoints * 0.8
    if (value <= bands.GOOD.max) return maxPoints * 0.6
    if (value <= bands.FAIR.max) return maxPoints * 0.4
    return maxPoints * 0.2
  }
  
  // For "higher is better" metrics
  if (value >= bands.EXCELLENT.min) return maxPoints
  if (value >= bands.VERY_GOOD.min) return maxPoints * 0.8
  if (value >= bands.GOOD.min) return maxPoints * 0.6
  if (value >= bands.FAIR.min) return maxPoints * 0.4
  return maxPoints * 0.2
}

/**
 * Helper: Get points based on count bands
 */
function getPointsFromCountBand(
  value: number,
  bandType: keyof typeof TAPS_COUNT_BANDS,
  maxPoints: number = 10
): number {
  const bands = TAPS_COUNT_BANDS[bandType]
  
  if (value >= bands.EXCELLENT.min) return maxPoints
  if (value >= bands.VERY_GOOD.min) return maxPoints * 0.8
  if (value >= bands.GOOD.min) return maxPoints * 0.6
  if (value >= bands.FAIR.min) return maxPoints * 0.4
  return maxPoints * 0.2
}

/**
 * Helper: Get points based on teacher/learner ratio
 */
function getPointsFromRatio(ratio: number, maxPoints: number = 10): number {
  if (ratio <= TAPS_RATIO_BANDS.EXCELLENT.max) return maxPoints
  if (ratio <= TAPS_RATIO_BANDS.VERY_GOOD.max) return maxPoints * 0.8
  if (ratio <= TAPS_RATIO_BANDS.GOOD.max) return maxPoints * 0.6
  if (ratio <= TAPS_RATIO_BANDS.FAIR.max) return maxPoints * 0.4
  return maxPoints * 0.2
}

/**
 * Helper: Get points for select-type fields with predefined options
 */
function getPointsFromSelectValue(
  value: string | undefined,
  maxPoints: number = 10
): number {
  if (!value) return 0
  
  switch (value) {
    case 'excellent':
    case 'weekly':
    case 'each_classroom':
    case 'all_grades_4plus_hrs':
      return maxPoints
    case 'very_good':
    case '2_3_per_month':
    case 'every_two_classrooms':
    case '50_99_grades_4plus_hrs':
      return maxPoints * 0.8
    case 'good':
    case 'monthly':
    case 'hallway':
    case 'all_grades_2_3_hrs':
      return maxPoints * 0.6
    case 'fair':
    case 'every_2_months':
    case 'single_bottle':
    case 'some_grades_2_3_hrs':
      return maxPoints * 0.4
    case 'poor':
    case 'none':
    case 'less_than_2_hrs':
      return maxPoints * 0.2
    default:
      return 0
  }
}

/**
 * Calculate TAPS School Inputs & Operations score (max 80 points)
 * Metrics 1-8
 */
export function calculateTAPSSchoolInputsScore(data: Partial<TAPSSchoolInputsScores>): number {
  let score = 0
  
  // Metric 1: Trained Teachers' Rate (*** - 10 points)
  if (data.trainedTeachersRate !== undefined) {
    score += getPointsFromPercentageBand(data.trainedTeachersRate, 'TRAINED_TEACHERS', 10)
  }
  
  // Metric 2: Teacher/Learner Ratio (** - 10 points)
  if (data.teacherLearnerRatio !== undefined) {
    score += getPointsFromRatio(data.teacherLearnerRatio, 10)
  }
  
  // Metric 3: Teacher Attendance Rate (*** - 10 points)
  if (data.teacherAttendanceRate !== undefined) {
    score += getPointsFromPercentageBand(data.teacherAttendanceRate, 'ATTENDANCE', 10)
  }
  
  // Metric 4: Increase in Teacher Attendance (** - 10 points)
  if (data.teacherAttendanceIncrease !== undefined) {
    score += getPointsFromPercentageBand(data.teacherAttendanceIncrease, 'INCREASE', 10)
  }
  
  // Metric 5: Teachers Late (** - 10 points)
  if (data.teachersLatePercentage !== undefined) {
    score += getPointsFromPercentageBand(data.teachersLatePercentage, 'LATE_PERCENTAGE', 10)
  }
  
  // Metric 6: Sweeper/Cleaner Attendance (* - 10 points)
  if (data.sweeperCleanerAttendance !== undefined) {
    score += getPointsFromPercentageBand(data.sweeperCleanerAttendance, 'ATTENDANCE', 10)
  }
  
  // Metric 7: Learners' Attendance Rate (*** - 10 points)
  if (data.learnersAttendanceRate !== undefined) {
    score += getPointsFromPercentageBand(data.learnersAttendanceRate, 'ATTENDANCE', 10)
  }
  
  // Metric 8: Increase in Learners' Attendance (** - 10 points)
  if (data.learnersAttendanceIncrease !== undefined) {
    score += getPointsFromPercentageBand(data.learnersAttendanceIncrease, 'INCREASE', 10)
  }
  
  return Math.min(Math.round(score), TAPS_SCORING_WEIGHTS.SCHOOL_INPUTS_OPERATIONS)
}

/**
 * Calculate TAPS Leadership score (max 30 points)
 * Metrics 9-11
 */
export function calculateTAPSLeadershipScore(data: Partial<TAPSLeadershipScores>): number {
  let score = 0
  
  // Metric 9: Quarterly Project Plan Progress (** - 10 points)
  if (data.projectPlanProgress) {
    score += getPointsFromSelectValue(data.projectPlanProgress, 10)
  }
  
  // Metric 10: HM Attendance Rate (*** - 10 points)
  if (data.hmAttendanceRate !== undefined) {
    score += getPointsFromPercentageBand(data.hmAttendanceRate, 'ATTENDANCE', 10)
  }
  
  // Metric 11: Leadership Team Attendance (** - 10 points)
  if (data.leadershipTeamAttendance !== undefined) {
    score += getPointsFromPercentageBand(data.leadershipTeamAttendance, 'ATTENDANCE', 10)
  }
  
  return Math.min(Math.round(score), TAPS_SCORING_WEIGHTS.LEADERSHIP)
}

/**
 * Calculate TAPS Academics score (max 200 points)
 * Metrics 12-33: Grades 7-11 pass rates
 * Each grade has 5 metrics worth 8 points each = 40 points per grade × 5 grades = 200 points
 */
export function calculateTAPSAcademicsScore(data: Partial<TAPSAcademicsScores>): number {
  // NOTE: The Academics section is represented as a *flat* map of field ids in the
  // client form state (e.g. `grade7OverallPassRate`). However, the canonical TAPS
  // type is nested per-grade (e.g. `grade7.overallPassRate`). To keep persistence
  // backward/forward compatible, we normalize here.
  const normalized = normalizeTAPSAcademicsScores(data)

  let score = 0
  const pointsPerMetric = 8
  
  // Grade 7 (40 points max)
  if (normalized.grade7) {
    if (normalized.grade7.overallPassRate !== undefined) {
      score += getPointsFromPercentageBand(normalized.grade7.overallPassRate, 'PASS_RATE', pointsPerMetric)
    }
    if (normalized.grade7.englishPassRate !== undefined) {
      score += getPointsFromPercentageBand(normalized.grade7.englishPassRate, 'PASS_RATE', pointsPerMetric)
    }
    if (normalized.grade7.mathPassRate !== undefined) {
      score += getPointsFromPercentageBand(normalized.grade7.mathPassRate, 'PASS_RATE', pointsPerMetric)
    }
    if (normalized.grade7.stemPassRate !== undefined) {
      score += getPointsFromPercentageBand(normalized.grade7.stemPassRate, 'PASS_RATE', pointsPerMetric)
    }
    if (normalized.grade7.learnersAbove70Percent !== undefined) {
      score += getPointsFromPercentageBand(normalized.grade7.learnersAbove70Percent, 'HIGH_ACHIEVERS', pointsPerMetric)
    }
  }
  
  // Grade 8 (40 points max)
  if (normalized.grade8) {
    if (normalized.grade8.overallPassRate !== undefined) {
      score += getPointsFromPercentageBand(normalized.grade8.overallPassRate, 'PASS_RATE', pointsPerMetric)
    }
    if (normalized.grade8.englishPassRate !== undefined) {
      score += getPointsFromPercentageBand(normalized.grade8.englishPassRate, 'PASS_RATE', pointsPerMetric)
    }
    if (normalized.grade8.mathPassRate !== undefined) {
      score += getPointsFromPercentageBand(normalized.grade8.mathPassRate, 'PASS_RATE', pointsPerMetric)
    }
    if (normalized.grade8.stemPassRate !== undefined) {
      score += getPointsFromPercentageBand(normalized.grade8.stemPassRate, 'PASS_RATE', pointsPerMetric)
    }
    if (normalized.grade8.learnersAbove70Percent !== undefined) {
      score += getPointsFromPercentageBand(normalized.grade8.learnersAbove70Percent, 'HIGH_ACHIEVERS', pointsPerMetric)
    }
  }
  
  // Grade 9 (40 points max)
  if (normalized.grade9) {
    if (normalized.grade9.overallPassRate !== undefined) {
      score += getPointsFromPercentageBand(normalized.grade9.overallPassRate, 'PASS_RATE', pointsPerMetric)
    }
    if (normalized.grade9.englishPassRate !== undefined) {
      score += getPointsFromPercentageBand(normalized.grade9.englishPassRate, 'PASS_RATE', pointsPerMetric)
    }
    if (normalized.grade9.mathPassRate !== undefined) {
      score += getPointsFromPercentageBand(normalized.grade9.mathPassRate, 'PASS_RATE', pointsPerMetric)
    }
    if (normalized.grade9.stemPassRate !== undefined) {
      score += getPointsFromPercentageBand(normalized.grade9.stemPassRate, 'PASS_RATE', pointsPerMetric)
    }
    if (normalized.grade9.learnersAbove70Percent !== undefined) {
      score += getPointsFromPercentageBand(normalized.grade9.learnersAbove70Percent, 'HIGH_ACHIEVERS', pointsPerMetric)
    }
  }
  
  // Grade 10 (40 points max)
  if (normalized.grade10) {
    if (normalized.grade10.overallPassRate !== undefined) {
      score += getPointsFromPercentageBand(normalized.grade10.overallPassRate, 'PASS_RATE', pointsPerMetric)
    }
    if (normalized.grade10.englishPassRate !== undefined) {
      score += getPointsFromPercentageBand(normalized.grade10.englishPassRate, 'PASS_RATE', pointsPerMetric)
    }
    if (normalized.grade10.mathPassRate !== undefined) {
      score += getPointsFromPercentageBand(normalized.grade10.mathPassRate, 'PASS_RATE', pointsPerMetric)
    }
    if (normalized.grade10.stemPassRate !== undefined) {
      score += getPointsFromPercentageBand(normalized.grade10.stemPassRate, 'PASS_RATE', pointsPerMetric)
    }
    if (normalized.grade10.learnersAbove70Percent !== undefined) {
      score += getPointsFromPercentageBand(normalized.grade10.learnersAbove70Percent, 'HIGH_ACHIEVERS', pointsPerMetric)
    }
  }
  
  // Grade 11 (40 points max)
  if (normalized.grade11) {
    if (normalized.grade11.overallPassRate !== undefined) {
      score += getPointsFromPercentageBand(normalized.grade11.overallPassRate, 'PASS_RATE', pointsPerMetric)
    }
    if (normalized.grade11.englishPassRate !== undefined) {
      score += getPointsFromPercentageBand(normalized.grade11.englishPassRate, 'PASS_RATE', pointsPerMetric)
    }
    if (normalized.grade11.mathPassRate !== undefined) {
      score += getPointsFromPercentageBand(normalized.grade11.mathPassRate, 'PASS_RATE', pointsPerMetric)
    }
    if (normalized.grade11.stemPassRate !== undefined) {
      score += getPointsFromPercentageBand(normalized.grade11.stemPassRate, 'PASS_RATE', pointsPerMetric)
    }
    if (normalized.grade11.learnersAbove70Percent !== undefined) {
      score += getPointsFromPercentageBand(normalized.grade11.learnersAbove70Percent, 'HIGH_ACHIEVERS', pointsPerMetric)
    }
  }
  
  return Math.min(Math.round(score), TAPS_SCORING_WEIGHTS.ACADEMICS)
}

function normalizeTAPSAcademicsScores(
  data: Partial<TAPSAcademicsScores> | Record<string, unknown> | undefined | null
): Partial<TAPSAcademicsScores> {
  if (!data) return {}

  // If already nested, return as-is.
  const maybeNested = data as Partial<TAPSAcademicsScores>
  if (
    typeof maybeNested === 'object' &&
    (maybeNested.grade7 || maybeNested.grade8 || maybeNested.grade9 || maybeNested.grade10 || maybeNested.grade11)
  ) {
    return maybeNested
  }

  const flat = data as Record<string, unknown>
  const out: Partial<TAPSAcademicsScores> = {}

  const set = (
    gradeKey: 'grade7' | 'grade8' | 'grade9' | 'grade10' | 'grade11',
    metricKey: keyof NonNullable<TAPSAcademicsScores['grade7']>,
    value: unknown
  ) => {
    const n = coerceNumber(value)
    if (n === undefined) return
    out[gradeKey] = { ...(out[gradeKey] as any), [metricKey]: n } as any
  }

  // Flat form ids: `grade7OverallPassRate`, `grade7EnglishPassRate`, etc.
  for (const [key, value] of Object.entries(flat)) {
    const match = key.match(/^(grade(7|8|9|10|11))(OverallPassRate|EnglishPassRate|MathPassRate|StemPassRate|Above70Percent)$/)
    if (!match) continue

    const gradeKey = match[1] as 'grade7' | 'grade8' | 'grade9' | 'grade10' | 'grade11'
    const suffix = match[3]
    switch (suffix) {
      case 'OverallPassRate':
        set(gradeKey, 'overallPassRate', value)
        break
      case 'EnglishPassRate':
        set(gradeKey, 'englishPassRate', value)
        break
      case 'MathPassRate':
        set(gradeKey, 'mathPassRate', value)
        break
      case 'StemPassRate':
        set(gradeKey, 'stemPassRate', value)
        break
      case 'Above70Percent':
        set(gradeKey, 'learnersAbove70Percent', value)
        break
    }
  }

  return out
}

function coerceNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return undefined
  return n
}

/**
 * Calculate TAPS Teacher Development score (max 20 points)
 * Metrics 34-35
 */
export function calculateTAPSTeacherDevelopmentScore(data: Partial<TAPSTeacherDevelopmentScores>): number {
  let score = 0
  
  // Metric 34: PD/Training Sessions (** - 10 points)
  if (data.pdTrainingSessions !== undefined) {
    score += getPointsFromCountBand(data.pdTrainingSessions, 'SESSIONS', 10)
  }
  
  // Metric 35: Classroom Supervisory Visits (** - 10 points)
  if (data.classroomSupervisoryVisits !== undefined) {
    score += getPointsFromCountBand(data.classroomSupervisoryVisits, 'SESSIONS', 10)
  }
  
  return Math.min(Math.round(score), TAPS_SCORING_WEIGHTS.TEACHER_DEVELOPMENT)
}

/**
 * Calculate TAPS Health & Safety score (max 50 points)
 * Metrics 36-40
 */
export function calculateTAPSHealthSafetyScore(data: Partial<TAPSHealthSafetyScores>): number {
  let score = 0
  
  // Metric 36: Student Incidences (*** - 10 points)
  if (data.studentIncidenceRate !== undefined) {
    score += getPointsFromPercentageBand(data.studentIncidenceRate, 'INCIDENTS', 10)
  }
  
  // Metric 37: Teacher Disciplinary Entries (** - 10 points)
  if (data.teacherDisciplinaryRate !== undefined) {
    score += getPointsFromPercentageBand(data.teacherDisciplinaryRate, 'INCIDENTS', 10)
  }
  
  // Metric 38: Fire & Sand Buckets (** - 10 points)
  if (data.fireSafetyLevel) {
    score += getPointsFromSelectValue(data.fireSafetyLevel, 10)
  }
  
  // Metric 39: Emergency/Evacuation Drills (* - 10 points)
  if (data.evacuationDrillFrequency) {
    score += getPointsFromSelectValue(data.evacuationDrillFrequency, 10)
  }
  
  // Metric 40: Access to Potable Water (* - 10 points)
  if (data.potableWaterAccess) {
    score += getPointsFromSelectValue(data.potableWaterAccess, 10)
  }
  
  return Math.min(Math.round(score), TAPS_SCORING_WEIGHTS.HEALTH_SAFETY)
}

/**
 * Calculate TAPS School Culture score (max 70 points)
 * Metrics 41-47
 */
export function calculateTAPSSchoolCultureScore(data: Partial<TAPSSchoolCultureScores>): number {
  let score = 0
  
  // Metric 41: Extracurricular Clubs (* - 10 points)
  if (data.extracurricularClubs !== undefined) {
    score += getPointsFromCountBand(data.extracurricularClubs, 'CLUBS', 10)
  }
  
  // Metric 42: Learners in Clubs (* - 10 points)
  if (data.learnersInClubsPercentage !== undefined) {
    score += getPointsFromPercentageBand(data.learnersInClubsPercentage, 'CLUB_PARTICIPATION', 10)
  }
  
  // Metric 43: Remediation Sessions (*** - 10 points)
  if (data.remediationLevel) {
    score += getPointsFromSelectValue(data.remediationLevel, 10)
  }
  
  // Metric 44: Parent Participation (PTA) (** - 10 points)
  if (data.ptaParticipationRate !== undefined) {
    score += getPointsFromPercentageBand(data.ptaParticipationRate, 'PTA_PARTICIPATION', 10)
  }
  
  // Metric 45: PTA-Initiated Activities (* - 10 points)
  if (data.ptaInitiatedActivities !== undefined) {
    score += getPointsFromCountBand(data.ptaInitiatedActivities, 'PTA_ACTIVITIES', 10)
  }
  
  // Metric 46: PTA General Meetings (* - 10 points)
  if (data.ptaGeneralMeetings !== undefined) {
    score += getPointsFromCountBand(data.ptaGeneralMeetings, 'PTA_MEETINGS', 10)
  }
  
  // Metric 47: Parents Collecting Report Cards (** - 10 points)
  if (data.parentsCollectingReportCards !== undefined) {
    score += getPointsFromPercentageBand(data.parentsCollectingReportCards, 'REPORT_CARDS', 10)
  }
  
  return Math.min(Math.round(score), TAPS_SCORING_WEIGHTS.SCHOOL_CULTURE)
}

/**
 * Calculate all TAPS category scores for secondary schools
 */
export function calculateAllTAPSCategoryScores(data: {
  schoolInputs: Partial<TAPSSchoolInputsScores>
  leadership: Partial<TAPSLeadershipScores>
  academics: Partial<TAPSAcademicsScores>
  teacherDevelopment: Partial<TAPSTeacherDevelopmentScores>
  healthSafety: Partial<TAPSHealthSafetyScores>
  schoolCulture: Partial<TAPSSchoolCultureScores>
}): Record<TAPSCategoryName, number> {
  return {
    school_inputs_operations: calculateTAPSSchoolInputsScore(data.schoolInputs || {}),
    leadership: calculateTAPSLeadershipScore(data.leadership || {}),
    academics: calculateTAPSAcademicsScore(data.academics || {}),
    teacher_development: calculateTAPSTeacherDevelopmentScore(data.teacherDevelopment || {}),
    health_safety: calculateTAPSHealthSafetyScore(data.healthSafety || {}),
    school_culture: calculateTAPSSchoolCultureScore(data.schoolCulture || {}),
  }
}

/**
 * Calculate total TAPS score from category scores (max 419 points)
 */
export function calculateTAPSTotalScore(categoryScores: Record<TAPSCategoryName, number>): number {
  return Object.values(categoryScores).reduce((sum, score) => sum + score, 0)
}

/**
 * Assign TAPS rating grade (A-E) based on total score
 */
export function assignTAPSRatingGrade(totalScore: number): TAPSRatingGrade {
  if (totalScore >= TAPS_RATING_THRESHOLDS.A.min) {
    return 'A'
  } else if (totalScore >= TAPS_RATING_THRESHOLDS.B.min) {
    return 'B'
  } else if (totalScore >= TAPS_RATING_THRESHOLDS.C.min) {
    return 'C'
  } else if (totalScore >= TAPS_RATING_THRESHOLDS.D.min) {
    return 'D'
  } else {
    return 'E'
  }
}

/**
 * Get human-readable label for TAPS rating grade
 */
export function getTAPSRatingLabel(grade: TAPSRatingGrade): string {
  return TAPS_RATING_THRESHOLDS[grade].label
}

/**
 * Get description for TAPS rating grade
 */
export function getTAPSRatingDescription(grade: TAPSRatingGrade): string {
  return TAPS_RATING_THRESHOLDS[grade].description
}

/**
 * Get color class for TAPS rating grade (for UI)
 */
export function getTAPSRatingColor(grade: TAPSRatingGrade): string {
  const colors: Record<TAPSRatingGrade, string> = {
    A: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    B: 'text-green-600 bg-green-50 border-green-200',
    C: 'text-blue-600 bg-blue-50 border-blue-200',
    D: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    E: 'text-red-600 bg-red-50 border-red-200',
  }
  return colors[grade]
}

/**
 * TAPS Category Score Breakdown for display
 */
export interface TAPSCategoryScoreBreakdown {
  category: TAPSCategoryName
  label: string
  earned: number
  max: number
  percentage: number
}

/**
 * TAPS Score Breakdown for display
 */
export interface TAPSScoreBreakdown {
  categories: TAPSCategoryScoreBreakdown[]
  totalEarned: number
  totalMax: number
  totalPercentage: number
  ratingGrade: TAPSRatingGrade
  ratingLabel: string
  ratingDescription: string
}

/**
 * Get detailed TAPS score breakdown for display
 */
export function getTAPSScoreBreakdown(categoryScores: Record<TAPSCategoryName, number>): TAPSScoreBreakdown {
  const categoryLabels: Record<TAPSCategoryName, string> = {
    school_inputs_operations: 'School Inputs & Operations',
    leadership: 'Leadership',
    academics: 'Academics',
    teacher_development: 'Teacher Development / Accountability',
    health_safety: 'Health & Safety',
    school_culture: 'School Culture / Environment',
  }
  
  const categoryMaxScores: Record<TAPSCategoryName, number> = {
    school_inputs_operations: TAPS_SCORING_WEIGHTS.SCHOOL_INPUTS_OPERATIONS,
    leadership: TAPS_SCORING_WEIGHTS.LEADERSHIP,
    academics: TAPS_SCORING_WEIGHTS.ACADEMICS,
    teacher_development: TAPS_SCORING_WEIGHTS.TEACHER_DEVELOPMENT,
    health_safety: TAPS_SCORING_WEIGHTS.HEALTH_SAFETY,
    school_culture: TAPS_SCORING_WEIGHTS.SCHOOL_CULTURE,
  }
  
  const categories: TAPSCategoryScoreBreakdown[] = Object.entries(categoryScores).map(([category, earned]) => ({
    category: category as TAPSCategoryName,
    label: categoryLabels[category as TAPSCategoryName],
    earned,
    max: categoryMaxScores[category as TAPSCategoryName],
    percentage: Math.round((earned / categoryMaxScores[category as TAPSCategoryName]) * 100),
  }))
  
  const totalEarned = calculateTAPSTotalScore(categoryScores)
  const totalPercentage = Math.round((totalEarned / TAPS_TOTAL_MAX_SCORE) * 100)
  const ratingGrade = assignTAPSRatingGrade(totalEarned)
  
  return {
    categories,
    totalEarned,
    totalMax: TAPS_TOTAL_MAX_SCORE,
    totalPercentage,
    ratingGrade,
    ratingLabel: getTAPSRatingLabel(ratingGrade),
    ratingDescription: getTAPSRatingDescription(ratingGrade),
  }
}

/**
 * Identify weak TAPS categories (for recommendations)
 * Returns categories scoring below a threshold percentage
 */
export function identifyWeakTAPSCategories(
  categoryScores: Record<TAPSCategoryName, number>,
  thresholdPercentage: number = 60
): { category: TAPSCategoryName; percentage: number; priority: 'high' | 'medium' | 'low' }[] {
  const categoryMaxScores: Record<TAPSCategoryName, number> = {
    school_inputs_operations: TAPS_SCORING_WEIGHTS.SCHOOL_INPUTS_OPERATIONS,
    leadership: TAPS_SCORING_WEIGHTS.LEADERSHIP,
    academics: TAPS_SCORING_WEIGHTS.ACADEMICS,
    teacher_development: TAPS_SCORING_WEIGHTS.TEACHER_DEVELOPMENT,
    health_safety: TAPS_SCORING_WEIGHTS.HEALTH_SAFETY,
    school_culture: TAPS_SCORING_WEIGHTS.SCHOOL_CULTURE,
  }
  
  const weakCategories: { category: TAPSCategoryName; percentage: number; priority: 'high' | 'medium' | 'low' }[] = []
  
  for (const [category, earned] of Object.entries(categoryScores)) {
    const max = categoryMaxScores[category as TAPSCategoryName]
    const percentage = (earned / max) * 100
    
    if (percentage < thresholdPercentage) {
      let priority: 'high' | 'medium' | 'low'
      if (percentage < 40) {
        priority = 'high'
      } else if (percentage < 60) {
        priority = 'medium'
      } else {
        priority = 'low'
      }
      
      weakCategories.push({
        category: category as TAPSCategoryName,
        percentage: Math.round(percentage),
        priority,
      })
    }
  }
  
  // Sort by percentage (lowest first)
  return weakCategories.sort((a, b) => a.percentage - b.percentage)
}

// ============================================================================
// UNIFIED SCORING FUNCTIONS (School Type Aware)
// ============================================================================

/**
 * Unified score calculation that handles both school types
 */
export function calculateScoresForSchoolType(
  schoolType: SchoolType,
  data: {
    // Primary/Nursery data
    academic?: Partial<AcademicScores>
    attendance?: Partial<AttendanceScores>
    infrastructure?: Partial<InfrastructureScores>
    teachingQuality?: Partial<TeachingQualityScores>
    management?: Partial<ManagementScores>
    studentWelfare?: Partial<StudentWelfareScores>
    community?: Partial<CommunityScores>
    // TAPS data (Secondary)
    schoolInputs?: Partial<TAPSSchoolInputsScores>
    leadership?: Partial<TAPSLeadershipScores>
    academics?: Partial<TAPSAcademicsScores>
    teacherDevelopment?: Partial<TAPSTeacherDevelopmentScores>
    healthSafety?: Partial<TAPSHealthSafetyScores>
    schoolCulture?: Partial<TAPSSchoolCultureScores>
  }
): {
  categoryScores: Record<string, number>
  totalScore: number
  ratingLevel?: RatingLevel
  tapsRatingGrade?: TAPSRatingGrade
  maxScore: number
} {
  if (schoolType === 'secondary') {
    const categoryScores = calculateAllTAPSCategoryScores({
      schoolInputs: data.schoolInputs || {},
      leadership: data.leadership || {},
      academics: data.academics || {},
      teacherDevelopment: data.teacherDevelopment || {},
      healthSafety: data.healthSafety || {},
      schoolCulture: data.schoolCulture || {},
    })
    const totalScore = calculateTAPSTotalScore(categoryScores)
    return {
      categoryScores,
      totalScore,
      tapsRatingGrade: assignTAPSRatingGrade(totalScore),
      maxScore: TAPS_TOTAL_MAX_SCORE,
    }
  } else {
    const categoryScores = calculateAllCategoryScores({
      academic: data.academic || {},
      attendance: data.attendance || {},
      infrastructure: data.infrastructure || {},
      teachingQuality: data.teachingQuality || {},
      management: data.management || {},
      studentWelfare: data.studentWelfare || {},
      community: data.community || {},
    })
    const totalScore = calculateTotalScore(categoryScores)
    return {
      categoryScores,
      totalScore,
      ratingLevel: assignRatingLevel(totalScore),
      maxScore: TOTAL_MAX_SCORE,
    }
  }
}
