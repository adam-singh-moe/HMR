/**
 * Assessment Form Field Configuration
 * 
 * Defines which form fields are applicable to each school type (nursery, primary, secondary).
 * This allows the form to dynamically show/hide fields based on the Head Teacher's school type.
 * 
 * For SECONDARY schools: Uses TAPS (Termly Accountability Performance for Secondary Schools) metrics
 * For PRIMARY/NURSERY schools: Uses demo metrics (pending official documentation)
 */

import type { SchoolType } from "@/lib/school-type"
import type { TAPSImportanceLevel } from "../types"

// ============================================================================
// TYPES
// ============================================================================

export type FieldApplicability = SchoolType[] | 'all'

export interface FormFieldConfig {
  id: string
  label: string
  description: string
  appliesTo: FieldApplicability
  type: 'number' | 'rating' | 'boolean' | 'select' | 'grade_matrix'
  suffix?: string
  min?: number
  max?: number
  /** 
   * Importance level for TAPS metrics (1-3, maps to * / ** / ***)
   * Higher importance = displayed first in category, highlighted with colored dot
   * 3 = Critical (red), 2 = Important (amber), 1 = Standard (yellow)
   */
  importance?: TAPSImportanceLevel
  /** Options for select type fields */
  options?: { value: string; label: string }[]
  /** Whether this field can be auto-calculated from historical data */
  autoCalculable?: boolean
  /** Number of previous terms required for auto-calculation */
  autoCalcRequiredTerms?: number
}

export interface CategoryFieldConfig {
  categoryId: string
  categoryLabel: string
  fields: FormFieldConfig[]
  /** Maximum points for this category (TAPS-specific) */
  maxPoints?: number
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Checks if a field applies to a specific school type
 */
export function fieldAppliesToSchoolType(field: FormFieldConfig, schoolType: SchoolType): boolean {
  if (field.appliesTo === 'all') return true
  return field.appliesTo.includes(schoolType)
}

/**
 * Filters fields by school type and sorts by importance (highest first)
 */
export function getFieldsForSchoolType(fields: FormFieldConfig[], schoolType: SchoolType): FormFieldConfig[] {
  return fields
    .filter(field => fieldAppliesToSchoolType(field, schoolType))
    .sort((a, b) => {
      // Sort by importance (3 > 2 > 1 > undefined)
      const importanceA = a.importance ?? 0
      const importanceB = b.importance ?? 0
      return importanceB - importanceA
    })
}

/**
 * Gets category config with fields filtered by school type
 */
export function getCategoryForSchoolType(
  category: CategoryFieldConfig, 
  schoolType: SchoolType
): CategoryFieldConfig {
  return {
    ...category,
    fields: getFieldsForSchoolType(category.fields, schoolType),
  }
}

/**
 * Gets the CSS class for importance indicator dot
 */
export function getImportanceIndicatorClass(importance?: TAPSImportanceLevel): string {
  switch (importance) {
    case 3:
      return 'bg-red-500' // Critical
    case 2:
      return 'bg-amber-500' // Important
    case 1:
      return 'bg-yellow-400' // Standard
    default:
      return '' // No indicator for non-TAPS fields
  }
}

/**
 * Gets the tooltip text for importance level
 */
export function getImportanceTooltip(importance?: TAPSImportanceLevel): string {
  switch (importance) {
    case 3:
      return 'Critical metric (***)'
    case 2:
      return 'Important metric (**)'
    case 1:
      return 'Standard metric (*)'
    default:
      return ''
  }
}

// ============================================================================
// FIELD CONFIGURATIONS BY CATEGORY
// ============================================================================

export const ACADEMIC_FIELDS: FormFieldConfig[] = [
  {
    id: 'ngsePassRate',
    label: 'NGSE Pass Rate',
    description: 'Percentage of students who passed the National Grade Six Exam',
    appliesTo: ['primary'],
    type: 'number',
    suffix: '%',
    min: 0,
    max: 100,
  },
  {
    id: 'csecPassRate',
    label: 'CSEC Pass Rate',
    description: 'Percentage of students who passed CSEC subjects',
    appliesTo: ['secondary'],
    type: 'number',
    suffix: '%',
    min: 0,
    max: 100,
  },
  {
    id: 'termlyAssessmentCompletion',
    label: 'Termly Assessment Completion',
    description: 'Percentage of termly assessments completed',
    appliesTo: ['primary', 'secondary'],
    type: 'number',
    suffix: '%',
    min: 0,
    max: 100,
  },
  {
    id: 'assessmentQuality',
    label: 'Assessment Quality',
    description: 'Quality of assessments administered',
    appliesTo: ['primary', 'secondary'],
    type: 'rating',
  },
  {
    id: 'literacyProgramImplementation',
    label: 'Literacy Program Implementation',
    description: 'How well literacy programs are implemented',
    appliesTo: 'all',
    type: 'rating',
  },
  {
    id: 'numeracyProgramImplementation',
    label: 'Numeracy Program Implementation',
    description: 'How well numeracy programs are implemented',
    appliesTo: 'all',
    type: 'rating',
  },
  // Nursery-specific fields
  {
    id: 'earlyLiteracyProgress',
    label: 'Early Literacy Progress',
    description: 'Progress in early literacy development (letter recognition, phonics)',
    appliesTo: ['nursery'],
    type: 'rating',
  },
  {
    id: 'earlyNumeracyProgress',
    label: 'Early Numeracy Progress',
    description: 'Progress in early numeracy (counting, number recognition)',
    appliesTo: ['nursery'],
    type: 'rating',
  },
  {
    id: 'socialEmotionalDevelopment',
    label: 'Social-Emotional Development',
    description: 'Progress in social and emotional skills development',
    appliesTo: ['nursery'],
    type: 'rating',
  },
  {
    id: 'motorSkillsDevelopment',
    label: 'Motor Skills Development',
    description: 'Progress in fine and gross motor skills',
    appliesTo: ['nursery'],
    type: 'rating',
  },
  {
    id: 'schoolReadinessAssessment',
    label: 'School Readiness Assessment',
    description: 'Percentage of children assessed for school readiness',
    appliesTo: ['nursery'],
    type: 'number',
    suffix: '%',
    min: 0,
    max: 100,
  },
]

export const ATTENDANCE_FIELDS: FormFieldConfig[] = [
  {
    id: 'studentAttendanceRate',
    label: 'Student Attendance Rate',
    description: 'Average daily student attendance percentage for the term',
    appliesTo: 'all',
    type: 'number',
    suffix: '%',
    min: 0,
    max: 100,
  },
  {
    id: 'teacherAttendanceRate',
    label: 'Teacher Attendance Rate',
    description: 'Average daily teacher attendance percentage for the term',
    appliesTo: 'all',
    type: 'number',
    suffix: '%',
    min: 0,
    max: 100,
  },
  {
    id: 'studentPunctualityRate',
    label: 'Student Punctuality Rate',
    description: 'Percentage of students arriving on time',
    appliesTo: 'all',
    type: 'number',
    suffix: '%',
    min: 0,
    max: 100,
  },
  {
    id: 'teacherPunctualityRate',
    label: 'Teacher Punctuality Rate',
    description: 'Percentage of teachers arriving on time',
    appliesTo: 'all',
    type: 'number',
    suffix: '%',
    min: 0,
    max: 100,
  },
]

export const INFRASTRUCTURE_FIELDS: FormFieldConfig[] = [
  {
    id: 'classroomCondition',
    label: 'Classroom Condition',
    description: 'Overall condition of classrooms and furniture',
    appliesTo: 'all',
    type: 'rating',
  },
  {
    id: 'washroomCondition',
    label: 'Washroom Condition',
    description: 'Quality and cleanliness of sanitation facilities',
    appliesTo: 'all',
    type: 'rating',
  },
  {
    id: 'waterSupplyAdequacy',
    label: 'Water Supply Adequacy',
    description: 'Availability of clean water for drinking and sanitation',
    appliesTo: 'all',
    type: 'rating',
  },
  {
    id: 'libraryCondition',
    label: 'Library Condition',
    description: 'Quality and resources of the school library',
    appliesTo: ['primary', 'secondary'],
    type: 'rating',
  },
  {
    id: 'fireExtinguishers',
    label: 'Fire Extinguishers',
    description: 'Number of functioning fire extinguishers',
    appliesTo: 'all',
    type: 'number',
    suffix: 'units',
    min: 0,
    max: 50,
  },
  // Secondary-specific
  {
    id: 'computerLabCondition',
    label: 'Computer Lab Condition',
    description: 'Quality and equipment of the computer laboratory',
    appliesTo: ['secondary'],
    type: 'rating',
  },
  {
    id: 'scienceLabCondition',
    label: 'Science Lab Condition',
    description: 'Quality and equipment of science laboratories',
    appliesTo: ['secondary'],
    type: 'rating',
  },
  // Nursery-specific
  {
    id: 'playAreaCondition',
    label: 'Play Area Condition',
    description: 'Quality and safety of indoor/outdoor play areas',
    appliesTo: ['nursery'],
    type: 'rating',
  },
  {
    id: 'napAreaAvailable',
    label: 'Rest/Nap Area Available',
    description: 'Availability and condition of rest areas for young children',
    appliesTo: ['nursery'],
    type: 'rating',
  },
  {
    id: 'ageAppropriateFurniture',
    label: 'Age-Appropriate Furniture',
    description: 'Furniture sized appropriately for young children',
    appliesTo: ['nursery'],
    type: 'rating',
  },
]

export const TEACHING_QUALITY_FIELDS: FormFieldConfig[] = [
  {
    id: 'percentageQualifiedTeachers',
    label: 'Percentage Qualified Teachers',
    description: 'Percentage of teachers with required qualifications',
    appliesTo: 'all',
    type: 'number',
    suffix: '%',
    min: 0,
    max: 100,
  },
  {
    id: 'pdSessionsAttended',
    label: 'Professional Development Sessions',
    description: 'Number of PD sessions attended per teacher this term',
    appliesTo: 'all',
    type: 'number',
    suffix: 'sessions',
    min: 0,
    max: 20,
  },
  {
    id: 'lessonPlanQuality',
    label: 'Lesson Plan Quality',
    description: 'Quality and consistency of teacher lesson preparation',
    appliesTo: 'all',
    type: 'rating',
  },
  {
    id: 'differentiatedInstruction',
    label: 'Differentiated Instruction',
    description: 'Accommodation of different learning styles and needs',
    appliesTo: 'all',
    type: 'rating',
  },
  {
    id: 'technologyIntegration',
    label: 'Technology Integration',
    description: 'Use of technology in teaching and learning',
    appliesTo: ['primary', 'secondary'],
    type: 'rating',
  },
  // Nursery-specific
  {
    id: 'playBasedLearning',
    label: 'Play-Based Learning Implementation',
    description: 'Implementation of play-based learning activities',
    appliesTo: ['nursery'],
    type: 'rating',
  },
  {
    id: 'childCenteredApproach',
    label: 'Child-Centered Approach',
    description: 'Use of child-centered teaching methods',
    appliesTo: ['nursery'],
    type: 'rating',
  },
  // Secondary-specific
  {
    id: 'subjectSpecialization',
    label: 'Subject Specialization',
    description: 'Teachers teaching in their specialized subject areas',
    appliesTo: ['secondary'],
    type: 'rating',
  },
  {
    id: 'examPreparationQuality',
    label: 'Exam Preparation Quality',
    description: 'Quality of CSEC/CAPE exam preparation',
    appliesTo: ['secondary'],
    type: 'rating',
  },
]

export const MANAGEMENT_FIELDS: FormFieldConfig[] = [
  {
    id: 'sbaMeetingsHeld',
    label: 'SBA Meetings Held',
    description: 'Number of School Board Authority meetings held this term',
    appliesTo: ['primary', 'secondary'],
    type: 'number',
    suffix: 'meetings',
    min: 0,
    max: 10,
  },
  {
    id: 'ptaMeetingsHeld',
    label: 'PTA Meetings Held',
    description: 'Number of Parent-Teacher Association meetings held this term',
    appliesTo: 'all',
    type: 'number',
    suffix: 'meetings',
    min: 0,
    max: 10,
  },
  {
    id: 'parentAttendanceRate',
    label: 'Parent Attendance Rate',
    description: 'Average attendance rate at parent meetings',
    appliesTo: 'all',
    type: 'number',
    suffix: '%',
    min: 0,
    max: 100,
  },
  {
    id: 'budgetUtilizationRate',
    label: 'Budget Utilization Rate',
    description: 'Percentage of allocated budget properly utilized',
    appliesTo: 'all',
    type: 'number',
    suffix: '%',
    min: 0,
    max: 100,
  },
  {
    id: 'studentRecordsComplete',
    label: 'Student Records Complete',
    description: 'Percentage of student records that are complete and up-to-date',
    appliesTo: 'all',
    type: 'number',
    suffix: '%',
    min: 0,
    max: 100,
  },
  // Nursery-specific
  {
    id: 'parentCommunicationFrequency',
    label: 'Parent Communication Frequency',
    description: 'Regular communication with parents about child progress',
    appliesTo: ['nursery'],
    type: 'rating',
  },
]

export const STUDENT_WELFARE_FIELDS: FormFieldConfig[] = [
  {
    id: 'counselingSessionsProvided',
    label: 'Counseling Sessions Provided',
    description: 'Number of counseling sessions provided this term',
    appliesTo: ['primary', 'secondary'],
    type: 'number',
    suffix: 'sessions',
    min: 0,
    max: 100,
  },
  {
    id: 'clubsAndSocieties',
    label: 'Clubs and Societies',
    description: 'Number of active clubs and societies',
    appliesTo: ['primary', 'secondary'],
    type: 'number',
    suffix: 'clubs',
    min: 0,
    max: 30,
  },
  {
    id: 'sportsTeams',
    label: 'Sports Teams',
    description: 'Number of active sports teams',
    appliesTo: ['primary', 'secondary'],
    type: 'number',
    suffix: 'teams',
    min: 0,
    max: 20,
  },
  // Nursery-specific
  {
    id: 'healthCheckupsCompleted',
    label: 'Health Checkups Completed',
    description: 'Percentage of children who completed health checkups',
    appliesTo: ['nursery'],
    type: 'number',
    suffix: '%',
    min: 0,
    max: 100,
  },
  {
    id: 'nutritionProgramImplementation',
    label: 'Nutrition Program Implementation',
    description: 'Implementation of school feeding/nutrition program',
    appliesTo: ['nursery', 'primary'],
    type: 'rating',
  },
  {
    id: 'safeguardingTrainingComplete',
    label: 'Safeguarding Training Complete',
    description: 'Percentage of staff with current safeguarding training',
    appliesTo: 'all',
    type: 'number',
    suffix: '%',
    min: 0,
    max: 100,
  },
  // Secondary-specific
  {
    id: 'careerGuidanceSessions',
    label: 'Career Guidance Sessions',
    description: 'Number of career guidance sessions conducted',
    appliesTo: ['secondary'],
    type: 'number',
    suffix: 'sessions',
    min: 0,
    max: 50,
  },
]

export const COMMUNITY_FIELDS: FormFieldConfig[] = [
  {
    id: 'communityEventsHosted',
    label: 'Community Events Hosted',
    description: 'Number of community events hosted this term',
    appliesTo: 'all',
    type: 'number',
    suffix: 'events',
    min: 0,
    max: 20,
  },
  {
    id: 'communityVolunteers',
    label: 'Community Volunteers',
    description: 'Number of community volunteers engaged',
    appliesTo: 'all',
    type: 'number',
    suffix: 'volunteers',
    min: 0,
    max: 100,
  },
  {
    id: 'businessPartnerships',
    label: 'Business Partnerships',
    description: 'Number of active business partnerships',
    appliesTo: ['primary', 'secondary'],
    type: 'number',
    suffix: 'partnerships',
    min: 0,
    max: 20,
  },
  {
    id: 'governmentProgramsParticipation',
    label: 'Government Programs Participation',
    description: 'Number of government programs participating in',
    appliesTo: 'all',
    type: 'number',
    suffix: 'programs',
    min: 0,
    max: 10,
  },
]

// ============================================================================
// COMPLETE CATEGORY CONFIGURATIONS (PRIMARY/NURSERY - Demo Metrics)
// ============================================================================

export const ALL_CATEGORY_CONFIGS: CategoryFieldConfig[] = [
  {
    categoryId: 'academic',
    categoryLabel: 'Academic Performance',
    fields: ACADEMIC_FIELDS,
  },
  {
    categoryId: 'attendance',
    categoryLabel: 'Attendance',
    fields: ATTENDANCE_FIELDS,
  },
  {
    categoryId: 'infrastructure',
    categoryLabel: 'Infrastructure',
    fields: INFRASTRUCTURE_FIELDS,
  },
  {
    categoryId: 'teaching_quality',
    categoryLabel: 'Teaching Quality',
    fields: TEACHING_QUALITY_FIELDS,
  },
  {
    categoryId: 'management',
    categoryLabel: 'Management',
    fields: MANAGEMENT_FIELDS,
  },
  {
    categoryId: 'student_welfare',
    categoryLabel: 'Student Welfare',
    fields: STUDENT_WELFARE_FIELDS,
  },
  {
    categoryId: 'community',
    categoryLabel: 'Community Engagement',
    fields: COMMUNITY_FIELDS,
  },
]

// ============================================================================
// TAPS FIELD CONFIGURATIONS (SECONDARY SCHOOLS ONLY)
// Based on Termly Accountability Performance for Secondary Schools document
// ============================================================================

/**
 * TAPS School Inputs & Operations - Metrics 1-8
 * Max: 80 points
 */
export const TAPS_SCHOOL_INPUTS_FIELDS: FormFieldConfig[] = [
  // *** Critical importance (sorted first)
  {
    id: 'trainedTeachersRate',
    label: 'Trained Teachers\' Rate',
    description: 'Percentage of teachers who are fully trained/qualified',
    appliesTo: ['secondary'],
    type: 'number',
    suffix: '%',
    min: 0,
    max: 100,
    importance: 3,
  },
  {
    id: 'teacherAttendanceRate',
    label: 'Teacher Attendance Rate',
    description: 'Average daily teacher attendance percentage for the term',
    appliesTo: ['secondary'],
    type: 'number',
    suffix: '%',
    min: 0,
    max: 100,
    importance: 3,
  },
  {
    id: 'learnersAttendanceRate',
    label: 'Learners\' Attendance Rate',
    description: 'Average daily student attendance percentage for the term',
    appliesTo: ['secondary'],
    type: 'number',
    suffix: '%',
    min: 0,
    max: 100,
    importance: 3,
  },
  // ** Important (sorted second)
  {
    id: 'teacherLearnerRatio',
    label: 'Teacher / Learner Ratio',
    description: 'Number of students per teacher (e.g., enter 25 for 1:25 ratio)',
    appliesTo: ['secondary'],
    type: 'number',
    suffix: ':1',
    min: 1,
    max: 100,
    importance: 2,
  },
  {
    id: 'teacherAttendanceIncrease',
    label: 'Increase in Teacher Attendance',
    description: 'Percentage increase in teacher attendance compared to previous terms',
    appliesTo: ['secondary'],
    type: 'number',
    suffix: '%',
    min: -100,
    max: 100,
    importance: 2,
    autoCalculable: true,
    autoCalcRequiredTerms: 2,
  },
  {
    id: 'teachersLatePercentage',
    label: 'Teachers Late',
    description: 'Percentage of teachers arriving late (lower is better)',
    appliesTo: ['secondary'],
    type: 'number',
    suffix: '%',
    min: 0,
    max: 100,
    importance: 2,
  },
  {
    id: 'learnersAttendanceIncrease',
    label: 'Increase in Learners\' Attendance',
    description: 'Percentage increase in student attendance compared to previous terms',
    appliesTo: ['secondary'],
    type: 'number',
    suffix: '%',
    min: -100,
    max: 100,
    importance: 2,
    autoCalculable: true,
    autoCalcRequiredTerms: 2,
  },
  // * Standard (sorted last)
  {
    id: 'sweeperCleanerAttendance',
    label: 'Sweeper / Cleaner Attendance',
    description: 'Average attendance percentage of cleaning staff',
    appliesTo: ['secondary'],
    type: 'number',
    suffix: '%',
    min: 0,
    max: 100,
    importance: 1,
  },
]

/**
 * TAPS Leadership - Metrics 9-11
 * Max: 30 points
 */
export const TAPS_LEADERSHIP_FIELDS: FormFieldConfig[] = [
  // *** Critical importance
  {
    id: 'hmAttendanceRate',
    label: 'HM Attendance Rate',
    description: 'Head Master/Mistress attendance rate for the term',
    appliesTo: ['secondary'],
    type: 'number',
    suffix: '%',
    min: 0,
    max: 100,
    importance: 3,
  },
  // ** Important
  {
    id: 'projectPlanProgress',
    label: 'Quarterly Project Plan Progress',
    description: 'Progress on quarterly project plan implementation',
    appliesTo: ['secondary'],
    type: 'select',
    importance: 2,
    options: [
      { value: 'excellent', label: 'Excellent - More than 2 items ahead, none behind' },
      { value: 'very_good', label: 'Very Good - As planned plus 2 items ahead' },
      { value: 'good', label: 'Good - As planned' },
      { value: 'fair', label: 'Fair - 1-2 items behind' },
      { value: 'poor', label: 'Poor - No items on time' },
    ],
  },
  {
    id: 'leadershipTeamAttendance',
    label: 'Leadership Team Attendance',
    description: 'Average attendance rate of the school leadership team',
    appliesTo: ['secondary'],
    type: 'number',
    suffix: '%',
    min: 0,
    max: 100,
    importance: 2,
  },
]

/**
 * TAPS Academics - Metrics 12-33
 * Grade matrix for Grades 7-11 with Overall, English, Mathematics, STEM pass rates
 * Plus learners achieving 70% or more
 * Max: 200 points
 */
export const TAPS_ACADEMICS_FIELDS: FormFieldConfig[] = [
  // Grade 7
  {
    id: 'grade7OverallPassRate',
    label: 'Grade 7 - Overall Pass Rate',
    description: 'End of term overall pass rate for Grade 7 students',
    appliesTo: ['secondary'],
    type: 'number',
    suffix: '%',
    min: 0,
    max: 100,
    importance: 2,
  },
  {
    id: 'grade7EnglishPassRate',
    label: 'Grade 7 - English A Pass Rate',
    description: 'End of term English A pass rate for Grade 7 students',
    appliesTo: ['secondary'],
    type: 'number',
    suffix: '%',
    min: 0,
    max: 100,
    importance: 2,
  },
  {
    id: 'grade7MathPassRate',
    label: 'Grade 7 - Mathematics Pass Rate',
    description: 'End of term Mathematics pass rate for Grade 7 students',
    appliesTo: ['secondary'],
    type: 'number',
    suffix: '%',
    min: 0,
    max: 100,
    importance: 2,
  },
  {
    id: 'grade7StemPassRate',
    label: 'Grade 7 - STEM Pass Rate',
    description: 'End of term STEM subjects pass rate for Grade 7 students',
    appliesTo: ['secondary'],
    type: 'number',
    suffix: '%',
    min: 0,
    max: 100,
    importance: 2,
  },
  {
    id: 'grade7Above70Percent',
    label: 'Grade 7 - Learners Achieving 70%+',
    description: 'Percentage of Grade 7 learners achieving 70% or more overall',
    appliesTo: ['secondary'],
    type: 'number',
    suffix: '%',
    min: 0,
    max: 100,
    importance: 2,
  },
  // Grade 8
  {
    id: 'grade8OverallPassRate',
    label: 'Grade 8 - Overall Pass Rate',
    description: 'End of term overall pass rate for Grade 8 students',
    appliesTo: ['secondary'],
    type: 'number',
    suffix: '%',
    min: 0,
    max: 100,
    importance: 2,
  },
  {
    id: 'grade8EnglishPassRate',
    label: 'Grade 8 - English A Pass Rate',
    description: 'End of term English A pass rate for Grade 8 students',
    appliesTo: ['secondary'],
    type: 'number',
    suffix: '%',
    min: 0,
    max: 100,
    importance: 2,
  },
  {
    id: 'grade8MathPassRate',
    label: 'Grade 8 - Mathematics Pass Rate',
    description: 'End of term Mathematics pass rate for Grade 8 students',
    appliesTo: ['secondary'],
    type: 'number',
    suffix: '%',
    min: 0,
    max: 100,
    importance: 2,
  },
  {
    id: 'grade8StemPassRate',
    label: 'Grade 8 - STEM Pass Rate',
    description: 'End of term STEM subjects pass rate for Grade 8 students',
    appliesTo: ['secondary'],
    type: 'number',
    suffix: '%',
    min: 0,
    max: 100,
    importance: 2,
  },
  {
    id: 'grade8Above70Percent',
    label: 'Grade 8 - Learners Achieving 70%+',
    description: 'Percentage of Grade 8 learners achieving 70% or more overall',
    appliesTo: ['secondary'],
    type: 'number',
    suffix: '%',
    min: 0,
    max: 100,
    importance: 2,
  },
  // Grade 9
  {
    id: 'grade9OverallPassRate',
    label: 'Grade 9 - Overall Pass Rate',
    description: 'End of term overall pass rate for Grade 9 students',
    appliesTo: ['secondary'],
    type: 'number',
    suffix: '%',
    min: 0,
    max: 100,
    importance: 2,
  },
  {
    id: 'grade9EnglishPassRate',
    label: 'Grade 9 - English A Pass Rate',
    description: 'End of term English A pass rate for Grade 9 students',
    appliesTo: ['secondary'],
    type: 'number',
    suffix: '%',
    min: 0,
    max: 100,
    importance: 2,
  },
  {
    id: 'grade9MathPassRate',
    label: 'Grade 9 - Mathematics Pass Rate',
    description: 'End of term Mathematics pass rate for Grade 9 students',
    appliesTo: ['secondary'],
    type: 'number',
    suffix: '%',
    min: 0,
    max: 100,
    importance: 2,
  },
  {
    id: 'grade9StemPassRate',
    label: 'Grade 9 - STEM Pass Rate',
    description: 'End of term STEM subjects pass rate for Grade 9 students',
    appliesTo: ['secondary'],
    type: 'number',
    suffix: '%',
    min: 0,
    max: 100,
    importance: 2,
  },
  {
    id: 'grade9Above70Percent',
    label: 'Grade 9 - Learners Achieving 70%+',
    description: 'Percentage of Grade 9 learners achieving 70% or more overall',
    appliesTo: ['secondary'],
    type: 'number',
    suffix: '%',
    min: 0,
    max: 100,
    importance: 2,
  },
  // Grade 10
  {
    id: 'grade10OverallPassRate',
    label: 'Grade 10 - Overall Pass Rate',
    description: 'End of term overall pass rate for Grade 10 students',
    appliesTo: ['secondary'],
    type: 'number',
    suffix: '%',
    min: 0,
    max: 100,
    importance: 2,
  },
  {
    id: 'grade10EnglishPassRate',
    label: 'Grade 10 - English A Pass Rate',
    description: 'End of term English A pass rate for Grade 10 students',
    appliesTo: ['secondary'],
    type: 'number',
    suffix: '%',
    min: 0,
    max: 100,
    importance: 2,
  },
  {
    id: 'grade10MathPassRate',
    label: 'Grade 10 - Mathematics Pass Rate',
    description: 'End of term Mathematics pass rate for Grade 10 students',
    appliesTo: ['secondary'],
    type: 'number',
    suffix: '%',
    min: 0,
    max: 100,
    importance: 2,
  },
  {
    id: 'grade10StemPassRate',
    label: 'Grade 10 - STEM Pass Rate',
    description: 'End of term STEM subjects pass rate for Grade 10 students',
    appliesTo: ['secondary'],
    type: 'number',
    suffix: '%',
    min: 0,
    max: 100,
    importance: 2,
  },
  {
    id: 'grade10Above70Percent',
    label: 'Grade 10 - Learners Achieving 70%+',
    description: 'Percentage of Grade 10 learners achieving 70% or more overall',
    appliesTo: ['secondary'],
    type: 'number',
    suffix: '%',
    min: 0,
    max: 100,
    importance: 2,
  },
  // Grade 11
  {
    id: 'grade11OverallPassRate',
    label: 'Grade 11 - Overall Pass Rate',
    description: 'End of term overall pass rate for Grade 11 students',
    appliesTo: ['secondary'],
    type: 'number',
    suffix: '%',
    min: 0,
    max: 100,
    importance: 2,
  },
  {
    id: 'grade11EnglishPassRate',
    label: 'Grade 11 - English A Pass Rate',
    description: 'End of term English A pass rate for Grade 11 students',
    appliesTo: ['secondary'],
    type: 'number',
    suffix: '%',
    min: 0,
    max: 100,
    importance: 2,
  },
  {
    id: 'grade11MathPassRate',
    label: 'Grade 11 - Mathematics Pass Rate',
    description: 'End of term Mathematics pass rate for Grade 11 students',
    appliesTo: ['secondary'],
    type: 'number',
    suffix: '%',
    min: 0,
    max: 100,
    importance: 2,
  },
  {
    id: 'grade11StemPassRate',
    label: 'Grade 11 - STEM Pass Rate',
    description: 'End of term STEM subjects pass rate for Grade 11 students',
    appliesTo: ['secondary'],
    type: 'number',
    suffix: '%',
    min: 0,
    max: 100,
    importance: 2,
  },
  {
    id: 'grade11Above70Percent',
    label: 'Grade 11 - Learners Achieving 70%+',
    description: 'Percentage of Grade 11 learners achieving 70% or more overall',
    appliesTo: ['secondary'],
    type: 'number',
    suffix: '%',
    min: 0,
    max: 100,
    importance: 2,
  },
]

/**
 * TAPS Teacher Development / Accountability - Metrics 34-35
 * Max: 20 points
 */
export const TAPS_TEACHER_DEVELOPMENT_FIELDS: FormFieldConfig[] = [
  {
    id: 'pdTrainingSessions',
    label: 'PD / Training Sessions',
    description: 'Number of Professional Development or Training sessions held this term',
    appliesTo: ['secondary'],
    type: 'number',
    suffix: 'sessions',
    min: 0,
    max: 20,
    importance: 2,
  },
  {
    id: 'classroomSupervisoryVisits',
    label: 'Classroom Supervisory Visits',
    description: 'Number of classroom supervisory visits conducted by leadership',
    appliesTo: ['secondary'],
    type: 'number',
    suffix: 'visits',
    min: 0,
    max: 20,
    importance: 2,
  },
]

/**
 * TAPS Health & Safety - Metrics 36-40
 * Max: 50 points
 */
export const TAPS_HEALTH_SAFETY_FIELDS: FormFieldConfig[] = [
  // *** Critical importance
  {
    id: 'studentIncidenceRate',
    label: 'Student Incidences',
    description: 'Percentage of students involved in incidences (lower is better)',
    appliesTo: ['secondary'],
    type: 'number',
    suffix: '%',
    min: 0,
    max: 100,
    importance: 3,
  },
  // ** Important
  {
    id: 'teacherDisciplinaryRate',
    label: 'Teacher Disciplinary Entries',
    description: 'Percentage of teachers with disciplinary entries (lower is better)',
    appliesTo: ['secondary'],
    type: 'number',
    suffix: '%',
    min: 0,
    max: 100,
    importance: 2,
  },
  {
    id: 'fireSafetyLevel',
    label: 'Fire & Sand Buckets',
    description: 'Level of fire safety equipment availability',
    appliesTo: ['secondary'],
    type: 'select',
    importance: 2,
    options: [
      { value: 'excellent', label: 'Excellent - Fire extinguisher per classroom' },
      { value: 'very_good', label: 'Very Good - 2-3 sand buckets & extinguishers per level' },
      { value: 'good', label: 'Good - 1 sand bucket per class + extinguisher per level' },
      { value: 'fair', label: 'Fair - 1 bucket per 2 classrooms' },
      { value: 'poor', label: 'Poor - Less than minimum' },
    ],
  },
  // * Standard importance
  {
    id: 'evacuationDrillFrequency',
    label: 'Emergency / Evacuation Drills',
    description: 'Frequency of emergency/evacuation drills conducted',
    appliesTo: ['secondary'],
    type: 'select',
    importance: 1,
    options: [
      { value: 'weekly', label: 'Excellent - Weekly' },
      { value: '2_3_per_month', label: 'Very Good - 2-3 per month' },
      { value: 'monthly', label: 'Good - Monthly' },
      { value: 'every_2_months', label: 'Fair - Once every 2 months' },
      { value: 'none', label: 'Poor - None' },
    ],
  },
  {
    id: 'potableWaterAccess',
    label: 'Access to Potable Water',
    description: 'Level of access to clean drinking water',
    appliesTo: ['secondary'],
    type: 'select',
    importance: 1,
    options: [
      { value: 'each_classroom', label: 'Excellent - Each classroom' },
      { value: 'every_two_classrooms', label: 'Very Good - Every two classrooms' },
      { value: 'hallway', label: 'Good - Hallway' },
      { value: 'single_bottle', label: 'Fair - Single bottle' },
      { value: 'none', label: 'Poor - None' },
    ],
  },
]

/**
 * TAPS School Culture / Environment - Metrics 41-47
 * Max: 70 points
 */
export const TAPS_SCHOOL_CULTURE_FIELDS: FormFieldConfig[] = [
  // *** Critical importance
  {
    id: 'remediationLevel',
    label: 'Remediation Sessions',
    description: 'Level of remediation sessions provided to struggling students',
    appliesTo: ['secondary'],
    type: 'select',
    importance: 3,
    options: [
      { value: 'all_grades_4plus_hrs', label: 'Excellent - All grades ≥4 hrs/week' },
      { value: '50_99_grades_4plus_hrs', label: 'Very Good - 50-99% grades ≥4 hrs/week' },
      { value: 'all_grades_2_3_hrs', label: 'Good - All grades 2-3 hrs/week' },
      { value: 'some_grades_2_3_hrs', label: 'Fair - Some grades 2-3 hrs/week' },
      { value: 'less_than_2_hrs', label: 'Poor - Less than 2 hrs/week or none' },
    ],
  },
  // ** Important
  {
    id: 'ptaParticipationRate',
    label: 'Parent Participation (PTA)',
    description: 'Percentage of parents actively participating in PTA',
    appliesTo: ['secondary'],
    type: 'number',
    suffix: '%',
    min: 0,
    max: 100,
    importance: 2,
  },
  {
    id: 'parentsCollectingReportCards',
    label: 'Parents Collecting Report Cards',
    description: 'Percentage of parents who collect their children\'s report cards',
    appliesTo: ['secondary'],
    type: 'number',
    suffix: '%',
    min: 0,
    max: 100,
    importance: 2,
  },
  // * Standard importance
  {
    id: 'extracurricularClubs',
    label: 'Extracurricular Clubs',
    description: 'Number of active extracurricular clubs',
    appliesTo: ['secondary'],
    type: 'number',
    suffix: 'clubs',
    min: 0,
    max: 30,
    importance: 1,
  },
  {
    id: 'learnersInClubsPercentage',
    label: 'Learners in Clubs',
    description: 'Percentage of students participating in at least one club',
    appliesTo: ['secondary'],
    type: 'number',
    suffix: '%',
    min: 0,
    max: 100,
    importance: 1,
  },
  {
    id: 'ptaInitiatedActivities',
    label: 'PTA-Initiated Activities',
    description: 'Number of activities initiated by the PTA per year',
    appliesTo: ['secondary'],
    type: 'number',
    suffix: 'activities',
    min: 0,
    max: 20,
    importance: 1,
  },
  {
    id: 'ptaGeneralMeetings',
    label: 'PTA General Meetings',
    description: 'Number of PTA general meetings held',
    appliesTo: ['secondary'],
    type: 'number',
    suffix: 'meetings',
    min: 0,
    max: 12,
    importance: 1,
  },
]

/**
 * TAPS Category configurations for Secondary Schools
 * Based on Termly Accountability Performance for Secondary Schools document
 */
export const TAPS_CATEGORY_CONFIGS: CategoryFieldConfig[] = [
  {
    categoryId: 'school_inputs_operations',
    categoryLabel: 'School Inputs & Operations',
    fields: TAPS_SCHOOL_INPUTS_FIELDS,
    maxPoints: 80,
  },
  {
    categoryId: 'leadership',
    categoryLabel: 'Leadership',
    fields: TAPS_LEADERSHIP_FIELDS,
    maxPoints: 30,
  },
  {
    categoryId: 'academics',
    categoryLabel: 'Academics - End of Term Pass Rates',
    fields: TAPS_ACADEMICS_FIELDS,
    maxPoints: 200,
  },
  {
    categoryId: 'teacher_development',
    categoryLabel: 'Teacher Development / Accountability',
    fields: TAPS_TEACHER_DEVELOPMENT_FIELDS,
    maxPoints: 20,
  },
  {
    categoryId: 'health_safety',
    categoryLabel: 'Health & Safety',
    fields: TAPS_HEALTH_SAFETY_FIELDS,
    maxPoints: 50,
  },
  {
    categoryId: 'school_culture',
    categoryLabel: 'School Culture / Environment',
    fields: TAPS_SCHOOL_CULTURE_FIELDS,
    maxPoints: 70,
  },
]

// ============================================================================
// UNIFIED ACCESS FUNCTIONS
// ============================================================================

/**
 * Gets all category configurations filtered by school type
 * Returns TAPS categories for secondary, demo categories for primary/nursery
 */
export function getAllCategoriesForSchoolType(schoolType: SchoolType): CategoryFieldConfig[] {
  if (schoolType === 'secondary') {
    return TAPS_CATEGORY_CONFIGS.map(category => getCategoryForSchoolType(category, schoolType))
  }
  return ALL_CATEGORY_CONFIGS.map(category => getCategoryForSchoolType(category, schoolType))
}

/**
 * Gets field configuration by ID (searches both TAPS and demo fields)
 */
export function getFieldById(fieldId: string): FormFieldConfig | undefined {
  // Search TAPS categories first
  for (const category of TAPS_CATEGORY_CONFIGS) {
    const field = category.fields.find(f => f.id === fieldId)
    if (field) return field
  }
  // Then search demo categories
  for (const category of ALL_CATEGORY_CONFIGS) {
    const field = category.fields.find(f => f.id === fieldId)
    if (field) return field
  }
  return undefined
}

/**
 * Gets all field IDs applicable to a school type
 */
export function getFieldIdsForSchoolType(schoolType: SchoolType): string[] {
  const fieldIds: string[] = []
  const categories = schoolType === 'secondary' ? TAPS_CATEGORY_CONFIGS : ALL_CATEGORY_CONFIGS
  
  for (const category of categories) {
    for (const field of category.fields) {
      if (fieldAppliesToSchoolType(field, schoolType)) {
        fieldIds.push(field.id)
      }
    }
  }
  return fieldIds
}

/**
 * Checks if a school type uses TAPS metrics
 */
export function usesTAPSMetrics(schoolType: SchoolType): boolean {
  return schoolType === 'secondary'
}

/**
 * Gets fields that can be auto-calculated from historical data
 */
export function getAutoCalculableFields(schoolType: SchoolType): FormFieldConfig[] {
  const categories = getAllCategoriesForSchoolType(schoolType)
  const autoCalcFields: FormFieldConfig[] = []
  
  for (const category of categories) {
    for (const field of category.fields) {
      if (field.autoCalculable) {
        autoCalcFields.push(field)
      }
    }
  }
  return autoCalcFields
}

/**
 * Structure for grade matrix display in the form
 */
export interface GradeMatrixConfig {
  grades: Array<{
    grade: number
    label: string
    fields: {
      overall: string
      english: string
      math: string
      stem: string
      above70: string
    }
  }>
}

/**
 * Gets the grade matrix configuration for academics section
 */
export function getGradeMatrixConfig(): GradeMatrixConfig {
  return {
    grades: [
      {
        grade: 7,
        label: 'Grade 7',
        fields: {
          overall: 'grade7OverallPassRate',
          english: 'grade7EnglishPassRate',
          math: 'grade7MathPassRate',
          stem: 'grade7StemPassRate',
          above70: 'grade7Above70Percent',
        },
      },
      {
        grade: 8,
        label: 'Grade 8',
        fields: {
          overall: 'grade8OverallPassRate',
          english: 'grade8EnglishPassRate',
          math: 'grade8MathPassRate',
          stem: 'grade8StemPassRate',
          above70: 'grade8Above70Percent',
        },
      },
      {
        grade: 9,
        label: 'Grade 9',
        fields: {
          overall: 'grade9OverallPassRate',
          english: 'grade9EnglishPassRate',
          math: 'grade9MathPassRate',
          stem: 'grade9StemPassRate',
          above70: 'grade9Above70Percent',
        },
      },
      {
        grade: 10,
        label: 'Grade 10',
        fields: {
          overall: 'grade10OverallPassRate',
          english: 'grade10EnglishPassRate',
          math: 'grade10MathPassRate',
          stem: 'grade10StemPassRate',
          above70: 'grade10Above70Percent',
        },
      },
      {
        grade: 11,
        label: 'Grade 11',
        fields: {
          overall: 'grade11OverallPassRate',
          english: 'grade11EnglishPassRate',
          math: 'grade11MathPassRate',
          stem: 'grade11StemPassRate',
          above70: 'grade11Above70Percent',
        },
      },
    ],
  }
}
