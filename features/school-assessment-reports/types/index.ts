// Type definitions for School Assessment Reports feature
// These types mirror the database schema and provide type safety throughout the application

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Maximum points per category for PRIMARY/NURSERY (total: 1000)
 */
export const SCORING_WEIGHTS = {
  ACADEMIC: 300,
  ATTENDANCE: 150,
  INFRASTRUCTURE: 150,
  TEACHING_QUALITY: 150,
  MANAGEMENT: 100,
  STUDENT_WELFARE: 100,
  COMMUNITY: 50,
} as const

export const TOTAL_MAX_SCORE = 1000

/**
 * Rating level thresholds for PRIMARY/NURSERY
 */
export const RATING_THRESHOLDS = {
  OUTSTANDING: { min: 850, max: 1000, label: 'Outstanding', percentage: '85-100%' },
  VERY_GOOD: { min: 700, max: 849, label: 'Very Good', percentage: '70-84%' },
  GOOD: { min: 550, max: 699, label: 'Good', percentage: '55-69%' },
  SATISFACTORY: { min: 400, max: 549, label: 'Satisfactory', percentage: '40-54%' },
  NEEDS_IMPROVEMENT: { min: 0, max: 399, label: 'Needs Improvement', percentage: '<40%' },
} as const

// ============================================================================
// TAPS (SECONDARY SCHOOL) CONSTANTS
// Termly Accountability Performance for Secondary Schools
// ============================================================================

/**
 * TAPS Scoring Weights for SECONDARY schools (total: 419 points max)
 * Based on official TAPS document metrics
 */
export const TAPS_SCORING_WEIGHTS = {
  SCHOOL_INPUTS_OPERATIONS: 80,  // Metrics 1-8: Staff, ratios, attendance
  LEADERSHIP: 30,                 // Metrics 9-11: HM attendance, project planning
  ACADEMICS: 200,                 // Metrics 12-33: Grades 7-11 pass rates
  TEACHER_DEVELOPMENT: 20,        // Metrics 34-35: PD sessions, supervisory visits
  HEALTH_SAFETY: 50,              // Metrics 36-40: Incidents, safety, water
  SCHOOL_CULTURE: 70,             // Metrics 41-47: Clubs, remediation, PTA
} as const

export const TAPS_TOTAL_MAX_SCORE = 419

/**
 * TAPS Rating Thresholds (A-E grades) for SECONDARY schools
 */
export const TAPS_RATING_THRESHOLDS = {
  A: { min: 357, max: 419, label: 'Outstanding', grade: 'A', description: 'Outstanding performance across all metrics' },
  B: { min: 294, max: 356, label: 'High Achieving', grade: 'B', description: 'Strong performance with minor areas for improvement' },
  C: { min: 210, max: 293, label: 'Standard', grade: 'C', description: 'Meeting basic expectations with room for growth' },
  D: { min: 84, max: 209, label: 'Struggling', grade: 'D', description: 'Below expectations, requires focused improvement' },
  E: { min: 0, max: 83, label: 'Critical Support', grade: 'E', description: 'Requires immediate intervention and support' },
} as const

export type TAPSRatingGrade = 'A' | 'B' | 'C' | 'D' | 'E'

/**
 * TAPS Category Names for scoring
 */
export const TAPS_CATEGORY_NAMES = {
  SCHOOL_INPUTS_OPERATIONS: 'school_inputs_operations',
  LEADERSHIP: 'leadership',
  ACADEMICS: 'academics',
  TEACHER_DEVELOPMENT: 'teacher_development',
  HEALTH_SAFETY: 'health_safety',
  SCHOOL_CULTURE: 'school_culture',
} as const

export type TAPSCategoryName = typeof TAPS_CATEGORY_NAMES[keyof typeof TAPS_CATEGORY_NAMES]

/**
 * Importance levels for TAPS metrics (from * to ***)
 * Higher importance = more critical metric, displayed first
 */
export type TAPSImportanceLevel = 1 | 2 | 3

/**
 * TAPS Score Band definitions for percentage-based metrics
 */
export const TAPS_PERCENTAGE_BANDS = {
  // For attendance rates (100-95, 94-90, etc.)
  ATTENDANCE: {
    EXCELLENT: { min: 95, max: 100, points: 10 },
    VERY_GOOD: { min: 90, max: 94, points: 8 },
    GOOD: { min: 85, max: 89, points: 6 },
    FAIR: { min: 80, max: 84, points: 4 },
    POOR: { min: 0, max: 79, points: 2 },
  },
  // For trained teachers rate (100-95, 94-90, etc.)
  TRAINED_TEACHERS: {
    EXCELLENT: { min: 95, max: 100, points: 10 },
    VERY_GOOD: { min: 90, max: 94, points: 8 },
    GOOD: { min: 80, max: 89, points: 6 },
    FAIR: { min: 70, max: 79, points: 4 },
    POOR: { min: 0, max: 69, points: 2 },
  },
  // For pass rates (Grades 7-11)
  PASS_RATE: {
    EXCELLENT: { min: 80, max: 100, points: 10 },
    VERY_GOOD: { min: 65, max: 79, points: 8 },
    GOOD: { min: 50, max: 64, points: 6 },
    FAIR: { min: 40, max: 49, points: 4 },
    POOR: { min: 0, max: 39, points: 2 },
  },
  // For learners achieving 70%+ 
  HIGH_ACHIEVERS: {
    EXCELLENT: { min: 80, max: 100, points: 10 },
    VERY_GOOD: { min: 65, max: 79, points: 8 },
    GOOD: { min: 50, max: 64, points: 6 },
    FAIR: { min: 40, max: 49, points: 4 },
    POOR: { min: 0, max: 39, points: 2 },
  },
  // For PTA participation
  PTA_PARTICIPATION: {
    EXCELLENT: { min: 80, max: 100, points: 10 },
    VERY_GOOD: { min: 70, max: 79, points: 8 },
    GOOD: { min: 60, max: 69, points: 6 },
    FAIR: { min: 50, max: 59, points: 4 },
    POOR: { min: 0, max: 49, points: 2 },
  },
  // For incidents (lower is better)
  INCIDENTS: {
    EXCELLENT: { min: 0, max: 1, points: 10 },
    VERY_GOOD: { min: 2, max: 3, points: 8 },
    GOOD: { min: 4, max: 5, points: 6 },
    FAIR: { min: 6, max: 10, points: 4 },
    POOR: { min: 11, max: 100, points: 2 },
  },
  // For teachers late (lower is better)
  LATE_PERCENTAGE: {
    EXCELLENT: { min: 0, max: 0, points: 10 },
    VERY_GOOD: { min: 1, max: 2, points: 8 },
    GOOD: { min: 3, max: 4, points: 6 },
    FAIR: { min: 5, max: 6, points: 4 },
    POOR: { min: 7, max: 100, points: 2 },
  },
  // For attendance increase
  INCREASE: {
    EXCELLENT: { min: 20, max: 100, points: 10 },
    VERY_GOOD: { min: 10, max: 19, points: 8 },
    GOOD: { min: 5, max: 9, points: 6 },
    FAIR: { min: 2, max: 4, points: 4 },
    POOR: { min: 0, max: 1, points: 2 },
  },
  // For club participation
  CLUB_PARTICIPATION: {
    EXCELLENT: { min: 80, max: 100, points: 10 },
    VERY_GOOD: { min: 70, max: 79, points: 8 },
    GOOD: { min: 60, max: 69, points: 6 },
    FAIR: { min: 50, max: 59, points: 4 },
    POOR: { min: 0, max: 49, points: 2 },
  },
  // For report card collection
  REPORT_CARDS: {
    EXCELLENT: { min: 95, max: 100, points: 10 },
    VERY_GOOD: { min: 90, max: 94, points: 8 },
    GOOD: { min: 80, max: 89, points: 6 },
    FAIR: { min: 70, max: 79, points: 4 },
    POOR: { min: 0, max: 69, points: 2 },
  },
} as const

/**
 * TAPS Count-based bands (for number of sessions, visits, clubs, etc.)
 */
export const TAPS_COUNT_BANDS = {
  // For PD/Training sessions and Supervisory visits
  SESSIONS: {
    EXCELLENT: { min: 7, max: Infinity, points: 10 },
    VERY_GOOD: { min: 5, max: 6, points: 8 },
    GOOD: { min: 3, max: 4, points: 6 },
    FAIR: { min: 1, max: 2, points: 4 },
    POOR: { min: 0, max: 0, points: 2 },
  },
  // For extracurricular clubs
  CLUBS: {
    EXCELLENT: { min: 6, max: Infinity, points: 10 },
    VERY_GOOD: { min: 4, max: 5, points: 8 },
    GOOD: { min: 2, max: 3, points: 6 },
    FAIR: { min: 1, max: 1, points: 4 },
    POOR: { min: 0, max: 0, points: 2 },
  },
  // For PTA activities
  PTA_ACTIVITIES: {
    EXCELLENT: { min: 7, max: Infinity, points: 10 },
    VERY_GOOD: { min: 5, max: 6, points: 8 },
    GOOD: { min: 4, max: 4, points: 6 },
    FAIR: { min: 2, max: 3, points: 4 },
    POOR: { min: 0, max: 1, points: 2 },
  },
  // For PTA meetings
  PTA_MEETINGS: {
    EXCELLENT: { min: 6, max: Infinity, points: 10 },
    VERY_GOOD: { min: 4, max: 5, points: 8 },
    GOOD: { min: 3, max: 3, points: 6 },
    FAIR: { min: 2, max: 2, points: 4 },
    POOR: { min: 0, max: 1, points: 2 },
  },
} as const

/**
 * Teacher/Learner Ratio bands
 */
export const TAPS_RATIO_BANDS = {
  EXCELLENT: { min: 0, max: 15, points: 10 },     // Below 1:15
  VERY_GOOD: { min: 16, max: 20, points: 8 },     // 1:16 – 1:20
  GOOD: { min: 21, max: 25, points: 6 },          // 1:21 – 1:25
  FAIR: { min: 26, max: 33, points: 4 },          // 1:26 – 1:33
  POOR: { min: 34, max: Infinity, points: 2 },    // Above 1:34
} as const

/**
 * Number of previous terms required for auto-calculation of improvement metrics
 */
export const TAPS_AUTO_CALC_REQUIRED_TERMS = 2

/**
 * Term names - Simple naming convention
 */
export const TERM_NAMES = {
  TERM_1: 'First Term',
  TERM_2: 'Second Term',
  TERM_3: 'Third Term',
} as const

export type TermName = typeof TERM_NAMES[keyof typeof TERM_NAMES]

/**
 * Term period descriptions (for display purposes)
 */
export const TERM_PERIODS = {
  1: { months: 'September - December', description: 'First term of the academic year' },
  2: { months: 'January - March', description: 'Second term of the academic year' },
  3: { months: 'April - July', description: 'Third term of the academic year' },
} as const

/**
 * Category names for scoring
 */
export const CATEGORY_NAMES = {
  ACADEMIC: 'academic',
  ATTENDANCE: 'attendance',
  INFRASTRUCTURE: 'infrastructure',
  TEACHING_QUALITY: 'teaching_quality',
  MANAGEMENT: 'management',
  STUDENT_WELFARE: 'student_welfare',
  COMMUNITY: 'community',
} as const

export type CategoryName = typeof CATEGORY_NAMES[keyof typeof CATEGORY_NAMES]

// ============================================================================
// ENUMS / UNION TYPES
// ============================================================================

export type ReportStatus = 'draft' | 'submitted' | 'expired_draft'

export type RatingLevel = 'outstanding' | 'very_good' | 'good' | 'satisfactory' | 'needs_improvement'

export type RecommendationPriority = 'high' | 'medium' | 'low'

export type AuditAction = 'edit' | 'status_change' | 'score_recalculation'

// ============================================================================
// TERM SUBMISSION CONFIGURATION (NEW - Recurring)
// ============================================================================

/**
 * Term submission configuration for recurring annual windows
 */
export interface TermSubmissionConfig {
  id: string
  termNumber: 1 | 2 | 3
  termName: TermName
  startMonth: number // 1-12
  startDay: number // 1-31
  endMonth: number // 1-12
  endDay: number // 1-31
  isEnabled: boolean
  createdAt: string
  updatedAt: string
  updatedBy: string | null
}

/**
 * Calculated submission window for current academic year
 */
export interface CurrentTermWindow {
  termNumber: 1 | 2 | 3
  termName: TermName
  submissionStart: string // Date string
  submissionEnd: string // Date string
  isOpen: boolean
  academicYear: string
  daysRemaining?: number
}

// ============================================================================
// ASSESSMENT PERIOD (Legacy - for historical data)
// ============================================================================

export interface AssessmentPeriod {
  id: string
  academicYear: string // Format: "2024-2025"
  termName: TermName
  startDate: string // ISO timestamp
  endDate: string // ISO timestamp
  sequenceOrder: 1 | 2 | 3
  isActive: boolean
  createdAt: string
  updatedAt: string
  createdBy: string | null
}

export interface AssessmentPeriodWithStatus extends AssessmentPeriod {
  isSubmissionOpen: boolean
  daysRemaining: number | null
  submittedCount: number
  totalSchools: number
}

// ============================================================================
// CATEGORY SCORES
// ============================================================================

/**
 * Academic Performance (max 300 points)
 * Metrics: pass_rates, internal_assessments, subject_diversity, grade_6_results, csec_results
 */
export interface AcademicScores {
  // Grade 6 Assessment Pass Rates (max 80 points)
  grade6MathPassRate: number // 0-100 percentage
  grade6EnglishPassRate: number // 0-100 percentage
  grade6SciencePassRate: number // 0-100 percentage
  
  // CSEC Results - for secondary schools (max 80 points)
  csecPassRate: number // 0-100 percentage
  csecSubjectsPassed: number // Average subjects passed per student
  
  // Internal Assessments (max 60 points)
  termlyAssessmentCompletion: number // 0-100 percentage
  assessmentQuality: number // 1-5 scale
  
  // Subject Diversity (max 40 points)
  coreSubjectsCovered: number // Number of core subjects taught
  electiveSubjectsOffered: number // Number of elective subjects
  
  // Literacy & Numeracy Programs (max 40 points)
  literacyProgramImplementation: number // 1-5 scale
  numeracyProgramImplementation: number // 1-5 scale
  
  // Calculated total for this category
  total: number
}

/**
 * Attendance (max 150 points)
 * Metrics: student_attendance_rate, teacher_attendance_rate, punctuality
 */
export interface AttendanceScores {
  // Student Attendance (max 70 points)
  studentAttendanceRate: number // 0-100 percentage
  studentAbsenteeismRate: number // 0-100 percentage (lower is better)
  
  // Teacher Attendance (max 50 points)
  teacherAttendanceRate: number // 0-100 percentage
  teacherAbsenteeismRate: number // 0-100 percentage (lower is better)
  
  // Punctuality (max 30 points)
  studentPunctualityRate: number // 0-100 percentage
  teacherPunctualityRate: number // 0-100 percentage
  
  // Calculated total for this category
  total: number
}

/**
 * Infrastructure (max 150 points)
 * Metrics: classrooms, sanitation, library, technology, safety
 */
export interface InfrastructureScores {
  // Classrooms (max 40 points)
  classroomCondition: number // 1-5 scale
  classroomCapacityAdequacy: number // 1-5 scale
  furnitureCondition: number // 1-5 scale
  
  // Sanitation (max 30 points)
  washroomCondition: number // 1-5 scale
  washroomStudentRatio: number // Number of students per washroom
  waterSupplyAdequacy: number // 1-5 scale
  
  // Library (max 25 points)
  libraryExists: boolean
  libraryBookCount: number
  libraryCondition: number // 1-5 scale
  
  // Technology (max 30 points)
  computerLabExists: boolean
  computerCount: number
  internetAccess: boolean
  projectorCount: number
  
  // Safety (max 25 points)
  fireExtinguishers: number
  firstAidKitAvailable: boolean
  emergencyExitsAdequate: boolean
  playgroundSafety: number // 1-5 scale
  
  // Calculated total for this category
  total: number
}

/**
 * Teaching Quality (max 150 points)
 * Metrics: qualified_teachers, professional_development, lesson_planning, teaching_methods
 */
export interface TeachingQualityScores {
  // Qualified Teachers (max 50 points)
  percentageQualifiedTeachers: number // 0-100 percentage
  percentageTrainedTeachers: number // 0-100 percentage
  teacherStudentRatio: number // e.g., 25 means 1:25
  
  // Professional Development (max 40 points)
  pdSessionsAttended: number // Number per term
  pdHoursCompleted: number // Total hours
  inHouseTrainingSessions: number // Number conducted
  
  // Lesson Planning (max 30 points)
  lessonPlansSubmitted: number // 0-100 percentage
  lessonPlanQuality: number // 1-5 scale
  schemeOfWorkCompletion: number // 0-100 percentage
  
  // Teaching Methods (max 30 points)
  differentiatedInstruction: number // 1-5 scale
  technologyIntegration: number // 1-5 scale
  assessmentForLearning: number // 1-5 scale
  
  // Calculated total for this category
  total: number
}

/**
 * Management (max 100 points)
 * Metrics: sba_meetings, parent_engagement, budget_management, record_keeping
 */
export interface ManagementScores {
  // SBA Meetings (max 25 points)
  sbaMeetingsHeld: number // Number per term
  sbaMeetingMinutesRecorded: boolean
  sbaDecisionsImplemented: number // 0-100 percentage
  
  // Parent Engagement (max 25 points)
  ptaMeetingsHeld: number // Number per term
  parentAttendanceRate: number // 0-100 percentage
  parentVolunteerPrograms: boolean
  
  // Budget Management (max 25 points)
  budgetUtilizationRate: number // 0-100 percentage
  financialRecordsUpToDate: boolean
  auditCompliance: boolean
  
  // Record Keeping (max 25 points)
  studentRecordsComplete: number // 0-100 percentage
  staffRecordsComplete: number // 0-100 percentage
  inventoryRecordsComplete: number // 0-100 percentage
  
  // Calculated total for this category
  total: number
}

/**
 * Student Welfare (max 100 points)
 * Metrics: guidance_services, extracurricular, discipline, special_needs_support
 */
export interface StudentWelfareScores {
  // Guidance Services (max 30 points)
  guidanceCounselorAvailable: boolean
  counselingSessionsProvided: number // Number per term
  careerGuidancePrograms: boolean
  
  // Extracurricular (max 25 points)
  clubsAndSocieties: number // Number active
  sportsTeams: number // Number active
  culturalActivities: number // Number per term
  studentParticipationRate: number // 0-100 percentage
  
  // Discipline (max 25 points)
  disciplinaryIncidents: number // Number per term (lower is better)
  disciplinePolicyImplemented: boolean
  positiveReinforcementPrograms: boolean
  
  // Special Needs Support (max 20 points)
  specialNeedsStudentsEnrolled: number
  specialNeedsSupportProvided: boolean
  inclusiveEducationPractices: number // 1-5 scale
  
  // Calculated total for this category
  total: number
}

/**
 * Community (max 50 points)
 * Metrics: community_involvement, external_partnerships
 */
export interface CommunityScores {
  // Community Involvement (max 30 points)
  communityEventsHosted: number // Number per term
  communityVolunteers: number // Number of community members
  communityProjectsCompleted: number // Number per term
  
  // External Partnerships (max 20 points)
  businessPartnerships: number // Number of partnerships
  ngoPartnerships: number // Number of partnerships
  governmentProgramsParticipation: number // Number of programs
  
  // Calculated total for this category
  total: number
}

/**
 * Combined category scores with all 7 categories
 */
export interface AllCategoryScores {
  academic: AcademicScores
  attendance: AttendanceScores
  infrastructure: InfrastructureScores
  teachingQuality: TeachingQualityScores
  management: ManagementScores
  studentWelfare: StudentWelfareScores
  community: CommunityScores
}

// ============================================================================
// TAPS (SECONDARY SCHOOL) CATEGORY SCORES
// Based on Termly Accountability Performance for Secondary Schools document
// ============================================================================

/**
 * School Inputs & Operations (max 80 points) - TAPS Metrics 1-8
 * Includes: Trained teachers, ratios, attendance rates, punctuality
 */
export interface TAPSSchoolInputsScores {
  // Metric 1: Trained Teachers' Rate (*** importance)
  trainedTeachersRate: number // 0-100 percentage
  
  // Metric 2: Teacher/Learner Ratio (** importance)
  teacherLearnerRatio: number // e.g., 25 means 1:25
  
  // Metric 3: Teacher Attendance Rate (*** importance)
  teacherAttendanceRate: number // 0-100 percentage
  
  // Metric 4: Increase in Teacher Attendance (** importance)
  teacherAttendanceIncrease: number // percentage increase from previous term
  teacherAttendanceIncreaseAutoCalculated?: boolean // Whether auto-calculated from history
  
  // Metric 5: Teachers Late (** importance)
  teachersLatePercentage: number // 0-100 percentage (lower is better)
  
  // Metric 6: Sweeper/Cleaner Attendance (* importance)
  sweeperCleanerAttendance: number // 0-100 percentage
  
  // Metric 7: Learners' Attendance Rate (*** importance)
  learnersAttendanceRate: number // 0-100 percentage
  
  // Metric 8: Increase in Learners' Attendance (** importance)
  learnersAttendanceIncrease: number // percentage increase from previous term
  learnersAttendanceIncreaseAutoCalculated?: boolean // Whether auto-calculated from history
  
  // Calculated total for this category
  total: number
}

/**
 * Leadership (max 30 points) - TAPS Metrics 9-11
 */
export interface TAPSLeadershipScores {
  // Metric 9: Quarterly Project Plan Progress (** importance)
  projectPlanProgress: 'excellent' | 'very_good' | 'good' | 'fair' | 'poor'
  
  // Metric 10: HM (Head Master) Attendance Rate (*** importance)
  hmAttendanceRate: number // 0-100 percentage
  
  // Metric 11: Leadership Team Attendance (** importance)
  leadershipTeamAttendance: number // 0-100 percentage
  
  // Calculated total for this category
  total: number
}

/**
 * Grade-level academic pass rate entry for matrix display
 */
export interface TAPSGradePassRates {
  overallPassRate: number // 0-100 percentage
  englishPassRate: number // 0-100 percentage
  mathPassRate: number // 0-100 percentage
  stemPassRate: number // 0-100 percentage
  learnersAbove70Percent: number // 0-100 percentage of learners achieving 70%+
}

/**
 * Academics (max 200 points) - TAPS Metrics 12-33
 * Grades 7-11 pass rates organized as a matrix
 */
export interface TAPSAcademicsScores {
  // Grade 7 pass rates
  grade7: TAPSGradePassRates
  
  // Grade 8 pass rates
  grade8: TAPSGradePassRates
  
  // Grade 9 pass rates
  grade9: TAPSGradePassRates
  
  // Grade 10 pass rates
  grade10: TAPSGradePassRates
  
  // Grade 11 pass rates
  grade11: TAPSGradePassRates
  
  // Calculated total for this category
  total: number
}

/**
 * Teacher Development / Accountability (max 20 points) - TAPS Metrics 34-35
 */
export interface TAPSTeacherDevelopmentScores {
  // Metric 34: PD / Training Sessions (** importance)
  pdTrainingSessions: number // Number of sessions
  
  // Metric 35: Classroom Supervisory Visits (** importance)
  classroomSupervisoryVisits: number // Number of visits
  
  // Calculated total for this category
  total: number
}

/**
 * Health & Safety (max 50 points) - TAPS Metrics 36-40
 */
export interface TAPSHealthSafetyScores {
  // Metric 36: Student Incidences (*** importance)
  studentIncidenceRate: number // 0-100 percentage (lower is better)
  
  // Metric 37: Teacher Disciplinary Entries (** importance)
  teacherDisciplinaryRate: number // 0-100 percentage (lower is better)
  
  // Metric 38: Fire & Sand Buckets (** importance)
  fireSafetyLevel: 'excellent' | 'very_good' | 'good' | 'fair' | 'poor'
  
  // Metric 39: Emergency / Evacuation Drills (* importance)
  evacuationDrillFrequency: 'weekly' | '2_3_per_month' | 'monthly' | 'every_2_months' | 'none'
  
  // Metric 40: Access to Potable Water (* importance)
  potableWaterAccess: 'each_classroom' | 'every_two_classrooms' | 'hallway' | 'single_bottle' | 'none'
  
  // Calculated total for this category
  total: number
}

/**
 * School Culture / Environment (max 70 points) - TAPS Metrics 41-47
 */
export interface TAPSSchoolCultureScores {
  // Metric 41: Extracurricular Clubs (* importance)
  extracurricularClubs: number // Number of clubs
  
  // Metric 42: Learners in Clubs (* importance)
  learnersInClubsPercentage: number // 0-100 percentage
  
  // Metric 43: Remediation Sessions (*** importance)
  remediationLevel: 'all_grades_4plus_hrs' | '50_99_grades_4plus_hrs' | 'all_grades_2_3_hrs' | 'some_grades_2_3_hrs' | 'less_than_2_hrs'
  
  // Metric 44: Parent Participation (PTA) (** importance)
  ptaParticipationRate: number // 0-100 percentage
  
  // Metric 45: PTA-Initiated Activities (* importance)
  ptaInitiatedActivities: number // Number of activities per year
  
  // Metric 46: PTA General Meetings (* importance)
  ptaGeneralMeetings: number // Number of meetings
  
  // Metric 47: Parents Collecting Report Cards (** importance)
  parentsCollectingReportCards: number // 0-100 percentage
  
  // Calculated total for this category
  total: number
}

/**
 * Combined TAPS category scores for secondary schools
 */
export interface TAPSAllCategoryScores {
  schoolInputs: TAPSSchoolInputsScores
  leadership: TAPSLeadershipScores
  academics: TAPSAcademicsScores
  teacherDevelopment: TAPSTeacherDevelopmentScores
  healthSafety: TAPSHealthSafetyScores
  schoolCulture: TAPSSchoolCultureScores
}

// ============================================================================
// SCHOOL ASSESSMENT REPORT
// ============================================================================

export interface SchoolAssessmentReport {
  id: string
  schoolId: string
  headteacherId: string
  periodId: string
  status: ReportStatus
  submittedAt: string | null
  lockedAt: string | null
  
  // Category scores for PRIMARY/NURSERY (JSONB in database)
  academicScores: Partial<AcademicScores>
  attendanceScores: Partial<AttendanceScores>
  infrastructureScores: Partial<InfrastructureScores>
  teachingQualityScores: Partial<TeachingQualityScores>
  managementScores: Partial<ManagementScores>
  studentWelfareScores: Partial<StudentWelfareScores>
  communityScores: Partial<CommunityScores>
  
  // TAPS Category scores for SECONDARY schools (JSONB in database)
  tapsSchoolInputsScores?: Partial<TAPSSchoolInputsScores>
  tapsLeadershipScores?: Partial<TAPSLeadershipScores>
  tapsAcademicsScores?: Partial<TAPSAcademicsScores>
  tapsTeacherDevelopmentScores?: Partial<TAPSTeacherDevelopmentScores>
  tapsHealthSafetyScores?: Partial<TAPSHealthSafetyScores>
  tapsSchoolCultureScores?: Partial<TAPSSchoolCultureScores>
  
  // TAPS Category totals for display
  tapsCategoryScores?: {
    school_inputs_operations: number
    leadership: number
    academics: number
    teacher_development: number
    health_safety: number
    school_culture: number
  } | null

  // Calculated fields
  totalScore: number | null
  ratingLevel: RatingLevel | null
  tapsRatingGrade?: TAPSRatingGrade | null // For secondary schools
  
  // Timestamps
  createdAt: string
  updatedAt: string
}

/**
 * Report with joined relations
 */
export interface SchoolAssessmentReportWithDetails extends SchoolAssessmentReport {
  school: {
    id: string
    name: string
    regionId: string
    regionName?: string
  }
  headteacher: {
    id: string
    name: string
    email: string
  }
  period: AssessmentPeriod
  recommendations?: ReportRecommendation[]
}

/**
 * Report summary for list views
 */
export interface ReportSummary {
  id: string
  schoolId: string
  schoolName: string
  regionName: string
  periodId: string
  academicYear: string
  termName: string
  status: ReportStatus
  totalScore: number | null
  ratingLevel: RatingLevel | null
  submittedAt: string | null
  // TAPS fields for secondary schools
  isTAPS?: boolean
  tapsRatingGrade?: TAPSRatingGrade | null
  tapsCategoryScores?: {
    school_inputs: number
    leadership: number
    academics: number
    teacher_development: number
    health_safety: number
    school_culture: number
  } | null
  // Category scores (demo system for primary)
  categoryScores?: {
    academic: number
    attendance: number
    infrastructure: number
    teaching_quality: number
    management: number
    student_welfare: number
    community: number
  } | null
}

// ============================================================================
// RECOMMENDATIONS
// ============================================================================

export interface ReportRecommendation {
  id: string
  reportId: string
  category: CategoryName | TAPSCategoryName | 'general'
  priority: RecommendationPriority
  recommendationText: string
  focusAreas: string[]
  generatedAt: string
  createdAt: string
}

// ============================================================================
// AUDIT LOG
// ============================================================================

export interface AuditLogEntry {
  id: string
  reportId: string
  adminId: string
  action: AuditAction
  fieldChanged: string
  oldValue: unknown
  newValue: unknown
  reason: string
  createdAt: string
}

export interface AuditLogEntryWithAdmin extends AuditLogEntry {
  admin: {
    id: string
    name: string
    email: string
  }
}

// ============================================================================
// ANALYTICS / AGGREGATES
// ============================================================================

export interface RegionalStats {
  regionId: string
  regionName: string
  periodId: string
  academicYear: string
  termName: string
  totalSchools: number
  submittedCount: number
  draftCount: number
  expiredDraftCount: number
  submissionRate: number
  avgScore: number | null
  minScore: number | null
  maxScore: number | null
  ratingDistribution: {
    outstanding: number
    very_good: number
    good: number
    satisfactory: number
    needs_improvement: number
  }
  avgAcademicScore: number | null
  avgAttendanceScore: number | null
  avgInfrastructureScore: number | null
  avgTeachingQualityScore: number | null
  avgManagementScore: number | null
  avgStudentWelfareScore: number | null
  avgCommunityScore: number | null
  refreshedAt: string
}

export interface NationalStats {
  periodId: string
  academicYear: string
  termName: string
  totalSchools: number
  submittedCount: number
  submissionRate: number
  avgScore: number | null
  minScore: number | null
  maxScore: number | null
  medianScore: number | null
  ratingDistribution: {
    outstanding: number
    very_good: number
    good: number
    satisfactory: number
    needs_improvement: number
  }
  lowPerformersCount: number
  topPerformersCount: number
  totalRegions: number
  refreshedAt: string
}

export interface SchoolProgressPoint {
  periodId: string
  academicYear: string
  termName: string
  totalScore: number
  ratingLevel: RatingLevel
  submittedAt: string
}

export interface RegionalRanking {
  regionId: string
  regionName: string
  avgScore: number
  submissionRate: number
  rank: number
  previousRank: number | null
  rankChange: number | null
}

// ============================================================================
// SCORE BREAKDOWN FOR DISPLAY
// ============================================================================

export interface CategoryScoreBreakdown {
  category: CategoryName
  label: string
  earned: number
  max: number
  percentage: number
}

export interface ScoreBreakdown {
  categories: CategoryScoreBreakdown[]
  totalEarned: number
  totalMax: number
  totalPercentage: number
  ratingLevel: RatingLevel
  ratingLabel: string
}

// ============================================================================
// FORM DATA TYPES
// ============================================================================

export interface AssessmentFormData {
  // Section 1: Academic Performance
  academic: Partial<Omit<AcademicScores, 'total'>>
  
  // Section 2: Attendance
  attendance: Partial<Omit<AttendanceScores, 'total'>>
  
  // Section 3: Infrastructure
  infrastructure: Partial<Omit<InfrastructureScores, 'total'>>
  
  // Section 4: Teaching Quality
  teachingQuality: Partial<Omit<TeachingQualityScores, 'total'>>
  
  // Section 5: Management
  management: Partial<Omit<ManagementScores, 'total'>>
  
  // Section 6: Student Welfare
  studentWelfare: Partial<Omit<StudentWelfareScores, 'total'>>
  
  // Section 7: Community
  community: Partial<Omit<CommunityScores, 'total'>>
}

export interface SaveSectionResult {
  success: boolean
  error?: string
  sectionScore?: number
  runningTotal?: number
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ============================================================================
// FILTER / QUERY TYPES
// ============================================================================

export interface ReportFilters {
  regionId?: string
  periodId?: string
  status?: ReportStatus
  ratingLevel?: RatingLevel
  searchQuery?: string
  minScore?: number
  maxScore?: number
}

export interface SchoolFilters {
  regionId?: string
  periodId?: string
  submissionStatus?: 'submitted' | 'not_submitted' | 'all'
}

// ============================================================================
// USER PREFERENCES & ANALYTICS
// ============================================================================

export interface UserPreferences {
  user_id: string
  default_comparison_school_id: string | null
  export_settings: {
    include_ai_insights: boolean
    include_comparison: boolean
    include_trends: boolean
  }
  created_at: string
  updated_at: string
}

export interface RegionalTopPerformerCache {
  region: string
  period_id: string
  school_id: string
  highest_average_score: number
  calculated_at: string
}
