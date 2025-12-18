/**
 * School Type Detection Utility
 * 
 * Detects school type (nursery, primary, secondary) from Head Teacher email addresses.
 * Email format: hm.{type}{code}@moe.edu.gy
 * 
 * Types:
 * - nu = Nursery School
 * - pr = Primary School  
 * - se = Secondary School
 * 
 * Example emails:
 * - hm.pr12345@moe.edu.gy → Primary School
 * - hm.se67890@moe.edu.gy → Secondary School
 * - hm.nu11111@moe.edu.gy → Nursery School
 */

// ============================================================================
// TYPES
// ============================================================================

export type SchoolType = 'nursery' | 'primary' | 'secondary'

export interface SchoolTypeInfo {
  type: SchoolType
  code: string
  label: string
  shortCode: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const SCHOOL_TYPE_CODES = {
  nu: 'nursery',
  pr: 'primary',
  se: 'secondary',
} as const

export const SCHOOL_TYPE_LABELS: Record<SchoolType, string> = {
  nursery: 'Nursery School',
  primary: 'Primary School',
  secondary: 'Secondary School',
}

export const SCHOOL_TYPE_SHORT_CODES: Record<SchoolType, string> = {
  nursery: 'nu',
  primary: 'pr',
  secondary: 'se',
}

// Email pattern: hm.{type}{code}@moe.edu.gy
const HM_EMAIL_PATTERN = /^hm\.([a-z]{2})(\d+)@moe\.edu\.gy$/i

// ============================================================================
// FUNCTIONS
// ============================================================================

/**
 * Extracts school type information from a Head Teacher email address
 * 
 * @param email - The email address to parse
 * @returns SchoolTypeInfo object or null if email doesn't match expected format
 * 
 * @example
 * getSchoolTypeFromEmail('hm.pr12345@moe.edu.gy')
 * // Returns: { type: 'primary', code: '12345', label: 'Primary School', shortCode: 'pr' }
 */
export function getSchoolTypeFromEmail(email: string | null | undefined): SchoolTypeInfo | null {
  if (!email) return null
  
  const match = email.toLowerCase().match(HM_EMAIL_PATTERN)
  if (!match) return null
  
  const [, typeCode, schoolCode] = match
  const schoolType = SCHOOL_TYPE_CODES[typeCode as keyof typeof SCHOOL_TYPE_CODES]
  
  if (!schoolType) return null
  
  return {
    type: schoolType,
    code: schoolCode,
    label: SCHOOL_TYPE_LABELS[schoolType],
    shortCode: typeCode,
  }
}

/**
 * Checks if an email belongs to a specific school type
 * 
 * @param email - The email address to check
 * @param schoolType - The school type to check for
 * @returns boolean indicating if the email matches the school type
 */
export function isSchoolType(email: string | null | undefined, schoolType: SchoolType): boolean {
  const info = getSchoolTypeFromEmail(email)
  return info?.type === schoolType
}

/**
 * Checks if the email belongs to a nursery school
 */
export function isNurserySchool(email: string | null | undefined): boolean {
  return isSchoolType(email, 'nursery')
}

/**
 * Checks if the email belongs to a primary school
 */
export function isPrimarySchool(email: string | null | undefined): boolean {
  return isSchoolType(email, 'primary')
}

/**
 * Checks if the email belongs to a secondary school
 */
export function isSecondarySchool(email: string | null | undefined): boolean {
  return isSchoolType(email, 'secondary')
}

/**
 * Gets the school type or returns a default
 * 
 * @param email - The email address to check
 * @param defaultType - Default school type if email doesn't match (defaults to 'primary')
 * @returns The detected school type or the default
 */
export function getSchoolTypeOrDefault(
  email: string | null | undefined, 
  defaultType: SchoolType = 'primary'
): SchoolType {
  const info = getSchoolTypeFromEmail(email)
  return info?.type || defaultType
}

/**
 * Checks if an email is a valid Head Teacher email format
 * 
 * @param email - The email address to validate
 * @returns boolean indicating if the email matches the HM format
 */
export function isHeadTeacherEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return HM_EMAIL_PATTERN.test(email.toLowerCase())
}

/**
 * Gets all available school types
 * 
 * @returns Array of all school types with their info
 */
export function getAllSchoolTypes(): Array<{ type: SchoolType; label: string; shortCode: string }> {
  return Object.entries(SCHOOL_TYPE_LABELS).map(([type, label]) => ({
    type: type as SchoolType,
    label,
    shortCode: SCHOOL_TYPE_SHORT_CODES[type as SchoolType],
  }))
}

/**
 * Maps a school "level" string (stored in the DB) to a SchoolType.
 *
 * This is preferred over email parsing because test/admin accounts may not
 * follow the Head Teacher email convention.
 */
export function getSchoolTypeFromSchoolLevel(level: string | null | undefined): SchoolType | null {
  if (!level) return null

  const normalized = String(level).trim().toLowerCase()
  if (!normalized) return null

  // Common canonical values
  if (normalized === 'secondary') return 'secondary'
  if (normalized === 'primary') return 'primary'
  if (normalized === 'nursery') return 'nursery'

  // Common variants
  if (normalized.startsWith('sec') || normalized.includes('secondary') || normalized.includes('high')) return 'secondary'
  if (normalized.startsWith('pri') || normalized.includes('primary')) return 'primary'
  if (normalized.startsWith('nur') || normalized.includes('nursery') || normalized.includes('early childhood') || normalized.includes('ece')) return 'nursery'

  return null
}
