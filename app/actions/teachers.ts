"use server"

import { createServiceRoleSupabaseClient } from "@/lib/supabase"
import { getUser, getUserSchoolInfo } from "./auth"
import { revalidatePath } from "next/cache"

export type Teacher = {
  id: string
  school_id: string
  first_name: string
  middle_name?: string
  last_name: string
  gender?: string
  status_id?: string
  status?: string
  date_of_birth?: string
  currently_at_cpce?: boolean
  cpce_expected_graduation_date?: string
  cpce_major?: string
  cpce_minor?: string
  ug_major?: string
  ug_minor?: string
  current_appt_date?: string
  last_appt_date?: string
  has_masters_degree: boolean
  masters_degree?: string
  has_phd?: string
  phd?: string
  has_moe_email: boolean
  email_address?: string
  contact_number?: string
  created_at: string
  created_by: string
  deleted_at?: string
  deleted_by?: string
}

export async function getTeachers() {
  try {
    const user = await getUser()
    if (!user) {
      return { teachers: [], error: "Unauthorized access." }
    }

    const schoolInfo = await getUserSchoolInfo()
    if (!schoolInfo.school?.id) {
      return { teachers: [], error: "No school associated with this user." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Fetch teachers
    const { data: teachers, error } = await supabase
      .from("hmr_teacher_details")
      .select("*")
      .eq("school_id", schoolInfo.school.id)
      .is("deleted_at", null)
      .order("last_name", { ascending: true })

    if (error) {
      console.error("Error fetching teachers:", error)
      return { teachers: [], error: "Failed to fetch teachers." }
    }

    // Fetch all statuses to map status_id to status name
    const { data: statuses } = await supabase
      .from("hmr_status")
      .select("id, name")

    const statusMap = new Map((statuses || []).map((s: any) => [s.id, s.name]))

    // Map the teachers to include status name
    const mappedTeachers = (teachers || []).map((teacher: any) => ({
      ...teacher,
      status: teacher.status_id ? statusMap.get(teacher.status_id) || null : null,
    }))

    return { teachers: mappedTeachers, error: null }
  } catch (error) {
    console.error("Error in getTeachers:", error)
    return { teachers: [], error: "An unexpected error occurred." }
  }
}

export async function addTeacher(formData: FormData) {
  try {
    const user = await getUser()
    if (!user) {
      return { success: false, error: "Unauthorized access." }
    }

    const schoolInfo = await getUserSchoolInfo()
    if (!schoolInfo.school?.id) {
      return { success: false, error: "No school associated with this user." }
    }

    const supabase = createServiceRoleSupabaseClient()

    const firstName = formData.get("first_name") as string
    const middleName = formData.get("middle_name") as string
    const lastName = formData.get("last_name") as string
    const gender = formData.get("gender") as string
    const statusId = formData.get("status_id") as string
    const dateOfBirth = formData.get("date_of_birth") as string
    const currentlyAtCpce = formData.get("currently_at_cpce") === "true"
    const cpceExpectedGraduationDate = formData.get("cpce_expected_graduation_date") as string
    const cpceMajor = formData.get("cpce_major") as string
    const cpceMinor = formData.get("cpce_minor") as string
    const ugMajor = formData.get("ug_major") as string
    const ugMinor = formData.get("ug_minor") as string
    const currentApptDate = formData.get("current_appt_date") as string
    const lastApptDate = formData.get("last_appt_date") as string
    const hasMastersDegree = formData.get("has_masters_degree") === "true"
    const mastersDegree = formData.get("masters_degree") as string
    const hasPhd = formData.get("has_phd") as string
    const phd = formData.get("phd") as string
    const hasMoeEmail = formData.get("has_moe_email") === "true"
    const emailAddress = formData.get("email_address") as string
    const contactNumber = formData.get("contact_number") as string

    if (!firstName || !lastName) {
      return { success: false, error: "First name and last name are required." }
    }

    const { data, error } = await supabase
      .from("hmr_teacher_details")
      .insert({
        school_id: schoolInfo.school.id,
        first_name: firstName,
        middle_name: middleName || null,
        last_name: lastName,
        gender: gender || null,
        status_id: statusId || null,
        date_of_birth: dateOfBirth || null,
        currently_at_cpce: currentlyAtCpce,
        cpce_expected_graduation_date: cpceExpectedGraduationDate || null,
        cpce_major: cpceMajor || null,
        cpce_minor: cpceMinor || null,
        ug_major: ugMajor || null,
        ug_minor: ugMinor || null,
        current_appt_date: currentApptDate || null,
        last_appt_date: lastApptDate || null,
        has_masters_degree: hasMastersDegree,
        masters_degree: mastersDegree || null,
        has_phd: hasPhd || null,
        phd: phd || null,
        has_moe_email: hasMoeEmail,
        email_address: emailAddress || null,
        contact_number: contactNumber || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error("Error adding teacher:", error)
      return { success: false, error: "Failed to add teacher." }
    }

    revalidatePath("/dashboard/head-teacher")
    return { success: true, teacher: data, error: null }
  } catch (error) {
    console.error("Error in addTeacher:", error)
    return { success: false, error: "An unexpected error occurred." }
  }
}

export async function updateTeacher(teacherId: string, formData: FormData) {
  try {
    const user = await getUser()
    if (!user) {
      return { success: false, error: "Unauthorized access." }
    }

    const supabase = createServiceRoleSupabaseClient()

    const firstName = formData.get("first_name") as string
    const middleName = formData.get("middle_name") as string
    const lastName = formData.get("last_name") as string
    const gender = formData.get("gender") as string
    const statusId = formData.get("status_id") as string
    const dateOfBirth = formData.get("date_of_birth") as string
    const currentlyAtCpce = formData.get("currently_at_cpce") === "true"
    const cpceExpectedGraduationDate = formData.get("cpce_expected_graduation_date") as string
    const cpceMajor = formData.get("cpce_major") as string
    const cpceMinor = formData.get("cpce_minor") as string
    const ugMajor = formData.get("ug_major") as string
    const ugMinor = formData.get("ug_minor") as string
    const currentApptDate = formData.get("current_appt_date") as string
    const lastApptDate = formData.get("last_appt_date") as string
    const hasMastersDegree = formData.get("has_masters_degree") === "true"
    const mastersDegree = formData.get("masters_degree") as string
    const hasPhd = formData.get("has_phd") as string
    const phd = formData.get("phd") as string
    const hasMoeEmail = formData.get("has_moe_email") === "true"
    const emailAddress = formData.get("email_address") as string
    const contactNumber = formData.get("contact_number") as string

    if (!firstName || !lastName) {
      return { success: false, error: "First name and last name are required." }
    }

    const { error } = await supabase
      .from("hmr_teacher_details")
      .update({
        first_name: firstName,
        middle_name: middleName || null,
        last_name: lastName,
        gender: gender || null,
        status_id: statusId || null,
        date_of_birth: dateOfBirth || null,
        currently_at_cpce: currentlyAtCpce,
        cpce_expected_graduation_date: cpceExpectedGraduationDate || null,
        cpce_major: cpceMajor || null,
        cpce_minor: cpceMinor || null,
        ug_major: ugMajor || null,
        ug_minor: ugMinor || null,
        current_appt_date: currentApptDate || null,
        last_appt_date: lastApptDate || null,
        has_masters_degree: hasMastersDegree,
        masters_degree: mastersDegree || null,
        has_phd: hasPhd || null,
        phd: phd || null,
        has_moe_email: hasMoeEmail,
        email_address: emailAddress || null,
        contact_number: contactNumber || null,
      })
      .eq("id", teacherId)

    if (error) {
      console.error("Error updating teacher:", error)
      return { success: false, error: "Failed to update teacher." }
    }

    revalidatePath("/dashboard/head-teacher")
    return { success: true, error: null }
  } catch (error) {
    console.error("Error in updateTeacher:", error)
    return { success: false, error: "An unexpected error occurred." }
  }
}

export async function deleteTeacher(teacherId: string) {
  try {
    const user = await getUser()
    if (!user) {
      return { success: false, error: "Unauthorized access." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Soft delete
    const { error } = await supabase
      .from("hmr_teacher_details")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
      })
      .eq("id", teacherId)

    if (error) {
      console.error("Error deleting teacher:", error)
      return { success: false, error: "Failed to delete teacher." }
    }

    revalidatePath("/dashboard/head-teacher")
    return { success: true, error: null }
  } catch (error) {
    console.error("Error in deleteTeacher:", error)
    return { success: false, error: "An unexpected error occurred." }
  }
}

export type TeacherStatus = {
  id: string
  name: string
}

export async function getTeacherStatuses() {
  try {
    const user = await getUser()
    if (!user) {
      return { statuses: [], error: "Unauthorized access." }
    }

    const supabase = createServiceRoleSupabaseClient()

    const { data: statuses, error } = await supabase
      .from("hmr_status")
      .select("id, name")
      .order("name")

    if (error) {
      console.error("Error fetching statuses:", error)
      return { statuses: [], error: "Failed to load status options." }
    }

    return { statuses: statuses as TeacherStatus[], error: null }
  } catch (error) {
    console.error("Error in getTeacherStatuses:", error)
    return { statuses: [], error: "An unexpected error occurred." }
  }
}

export async function getDeletedTeachers() {
  try {
    const user = await getUser()
    if (!user) {
      return { teachers: [], error: "Unauthorized access." }
    }

    const schoolInfo = await getUserSchoolInfo()
    if (!schoolInfo.school?.id) {
      return { teachers: [], error: "No school associated with this user." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Fetch deleted teachers
    const { data: teachers, error } = await supabase
      .from("hmr_teacher_details")
      .select("*")
      .eq("school_id", schoolInfo.school.id)
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false })

    if (error) {
      console.error("Error fetching deleted teachers:", error)
      return { teachers: [], error: "Failed to fetch deleted teachers." }
    }

    // Fetch all statuses to map status_id to status name
    const { data: statuses } = await supabase
      .from("hmr_status")
      .select("id, name")

    const statusMap = new Map((statuses || []).map((s: any) => [s.id, s.name]))

    // Map the teachers to include status name
    const mappedTeachers = (teachers || []).map((teacher: any) => ({
      ...teacher,
      status: teacher.status_id ? statusMap.get(teacher.status_id) || null : null,
    }))

    return { teachers: mappedTeachers, error: null }
  } catch (error) {
    console.error("Error in getDeletedTeachers:", error)
    return { teachers: [], error: "An unexpected error occurred." }
  }
}

export async function restoreTeacher(teacherId: string) {
  try {
    const user = await getUser()
    if (!user) {
      return { success: false, error: "Unauthorized access." }
    }

    const supabase = createServiceRoleSupabaseClient()

    const { error } = await supabase
      .from("hmr_teacher_details")
      .update({
        deleted_at: null,
        deleted_by: null,
      })
      .eq("id", teacherId)

    if (error) {
      console.error("Error restoring teacher:", error)
      return { success: false, error: "Failed to restore teacher." }
    }

    revalidatePath("/dashboard/head-teacher")
    return { success: true, error: null }
  } catch (error) {
    console.error("Error in restoreTeacher:", error)
    return { success: false, error: "An unexpected error occurred." }
  }
}

export async function permanentlyDeleteTeacher(teacherId: string) {
  try {
    const user = await getUser()
    if (!user) {
      return { success: false, error: "Unauthorized access." }
    }

    const supabase = createServiceRoleSupabaseClient()

    const { error } = await supabase
      .from("hmr_teacher_details")
      .delete()
      .eq("id", teacherId)

    if (error) {
      console.error("Error permanently deleting teacher:", error)
      return { success: false, error: "Failed to permanently delete teacher." }
    }

    revalidatePath("/dashboard/head-teacher")
    return { success: true, error: null }
  } catch (error) {
    console.error("Error in permanentlyDeleteTeacher:", error)
    return { success: false, error: "An unexpected error occurred." }
  }
}

// Education Official functions - view teachers across schools
export async function getTeachersForEducationOfficial(schoolId?: string) {
  try {
    const user = await getUser()
    if (!user) {
      return { teachers: [], schools: [], error: "Unauthorized access." }
    }

    // Check if user is an education official or admin
    if (user.role !== "Education Official" && user.role !== "Admin") {
      return { teachers: [], schools: [], error: "Access denied. Education officials only." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Fetch all schools for the dropdown
    const { data: schoolsData, error: schoolsError } = await supabase
      .from("sms_schools")
      .select("id, name, region_id")
      .order("name", { ascending: true })

    if (schoolsError) {
      console.error("Error fetching schools:", schoolsError)
    }
    
    const schools = schoolsData || []

    // Fetch teachers - all or by school
    let teachersQuery = supabase
      .from("hmr_teacher_details")
      .select("*")
      .is("deleted_at", null)
      .order("last_name", { ascending: true })

    if (schoolId) {
      teachersQuery = teachersQuery.eq("school_id", schoolId)
    }

    const { data: teachers, error } = await teachersQuery

    if (error) {
      console.error("Error fetching teachers:", error)
      return { teachers: [], schools, error: "Failed to fetch teachers." }
    }

    // Fetch all statuses to map status_id to status name
    const { data: statuses } = await supabase
      .from("hmr_status")
      .select("id, name")

    const statusMap = new Map((statuses || []).map((s: any) => [s.id, s.name]))

    // Create a school lookup map (convert IDs to strings for consistent comparison)
    const schoolMap = new Map((schools || []).map((s: any) => [String(s.id), s]))

    // Map the teachers to include status name and school info
    const mappedTeachers = (teachers || []).map((teacher: any) => {
      const school = teacher.school_id ? schoolMap.get(String(teacher.school_id)) : null
      return {
        ...teacher,
        status: teacher.status_id ? statusMap.get(teacher.status_id) || null : null,
        school_name: school?.name || null,
        school_region: school?.region || null,
      }
    })

    return { teachers: mappedTeachers, schools, error: null }
  } catch (error) {
    console.error("Error in getTeachersForEducationOfficial:", error)
    return { teachers: [], schools: [], error: "An unexpected error occurred." }
  }
}

export async function getSchoolsWithTeacherCount() {
  try {
    const user = await getUser()
    if (!user) {
      return { schools: [], error: "Unauthorized access." }
    }

    // Check if user is an education official or admin
    if (user.role !== "Education Official" && user.role !== "Admin") {
      return { schools: [], error: "Access denied. Education officials only." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Fetch all schools
    const { data: schoolsData } = await supabase
      .from("sms_schools")
      .select("id, name, region_id")
      .order("name", { ascending: true })

    if (!schoolsData) {
      return { schools: [], error: null }
    }

    // Fetch teacher counts per school
    const { data: teacherCounts } = await supabase
      .from("hmr_teacher_details")
      .select("school_id")
      .is("deleted_at", null)

    // Count teachers per school
    const countMap = new Map<string, number>()
    ;(teacherCounts || []).forEach((t: any) => {
      const count = countMap.get(t.school_id) || 0
      countMap.set(t.school_id, count + 1)
    })

    // Map schools with teacher count
    const schools = schoolsData.map((school: any) => ({
      ...school,
      teacher_count: countMap.get(school.id) || 0,
    }))

    return { schools, error: null }
  } catch (error) {
    console.error("Error in getSchoolsWithTeacherCount:", error)
    return { schools: [], error: "An unexpected error occurred." }
  }
}

export type TeacherStats = {
  total: number
  trained: number
  untrained: number
  withMasters: number
  withPhd: number
  attendingCpce: number
  notAttendingCpce: number
  byGender: { male: number; female: number; other: number }
  bySchoolLevel: { nursery: number; primary: number; secondary: number }
  byRegion: Record<string, number>
}

export async function getTeacherStatistics(filters?: {
  schoolId?: string
  gender?: string
  schoolLevel?: string
  regionId?: string
}) {
  try {
    const user = await getUser()
    if (!user) {
      return { stats: null, error: "Unauthorized access." }
    }

    if (user.role !== "Education Official" && user.role !== "Admin") {
      return { stats: null, error: "Access denied. Education officials only." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Fetch schools first to get level and region info
    const { data: schools, error: schoolsError } = await supabase
      .from("sms_schools")
      .select("id, school_level_id, region_id")

    if (schoolsError) {
      console.error("Error fetching schools:", schoolsError)
      return { stats: null, error: "Failed to fetch schools data." }
    }

    // Create school lookup map
    const schoolMap = new Map((schools || []).map((s: any) => [String(s.id), s]))

    // Build query with filters
    let query = supabase
      .from("hmr_teacher_details")
      .select("*")
      .is("deleted_at", null)

    if (filters?.schoolId) {
      query = query.eq("school_id", filters.schoolId)
    }

    const { data: allTeachers, error } = await query

    if (error) {
      console.error("Error fetching teacher statistics:", error)
      return { stats: null, error: "Failed to fetch statistics." }
    }

    // Fetch statuses to map status_id to status name
    const { data: statuses } = await supabase
      .from("hmr_status")
      .select("id, name")

    const statusMap = new Map((statuses || []).map((s: any) => [s.id, s.name]))

    // Define trained and untrained positions
    const trainedPositions = [
      'Assistant Master or Mistress',
      'Non Graduate Senior Assistant Master or Mistress',
      'Non Graduate Headmaster or Headmistress',
      'Non Graduate Head of Department',
      'Non Graduate Senior Master or Mistress',
      'Non Graduate Deputy Headmaster or Headmistress',
      'Trained Graduate',
      'Graduate Senior Assistant  Master or Mistress',
      'Graduate Senior Master or Mistress',
      'Graduate Head of Department',
      'Graduate Headmaster or Headmistress',
      'Graduate Deputy Headmaster or Headmistress',
      'Graduate Sixth Form  Headmaster or Headmistress'
    ]

    const untrainedPositions = [
      'Junior Teacher',
      'Teacher Aide',
      'Acting Teacher',
      'Pupil Teacher I',
      'Pupil Teacher II',
      'Temporary Unqualified Assistant',
      'Temporary Qualified Master or Mistress 111',
      'Temporary Qualified Master or Mistress  II',
      'Temp. Qualified Master or Mistress',
      'Untrained Graduate'
    ]

    // Apply additional filters manually
    let teachers = allTeachers || []
    
    if (filters?.schoolLevel || filters?.regionId) {
      teachers = teachers.filter((teacher: any) => {
        const school = schoolMap.get(String(teacher.school_id))
        if (!school) return false
        
        if (filters.schoolLevel && String(school.school_level_id) !== filters.schoolLevel) {
          return false
        }
        if (filters.regionId && String(school.region_id) !== filters.regionId) {
          return false
        }
        return true
      })
    }

    if (filters?.gender) {
      teachers = teachers.filter((teacher: any) => 
        teacher.gender?.toLowerCase() === filters.gender?.toLowerCase()
      )
    }

    // Calculate statistics
    const stats: TeacherStats = {
      total: teachers.length,
      trained: 0,
      untrained: 0,
      withMasters: 0,
      withPhd: 0,
      attendingCpce: 0,
      notAttendingCpce: 0,
      byGender: { male: 0, female: 0, other: 0 },
      bySchoolLevel: { nursery: 0, primary: 0, secondary: 0 },
      byRegion: {}
    }

    teachers.forEach((teacher: any) => {
      // Count trained/untrained based on status/position
      const statusName = teacher.status_id ? statusMap.get(teacher.status_id) : null
      if (statusName) {
        if (trainedPositions.includes(statusName)) {
          stats.trained++
        } else if (untrainedPositions.includes(statusName)) {
          stats.untrained++
        }
      }

      // Count masters and PhD
      if (teacher.has_masters_degree) {
        stats.withMasters++
      }
      if (teacher.has_phd === "yes" || teacher.has_phd === "true") {
        stats.withPhd++
      }

      // Count CPCE attendance
      if (teacher.currently_at_cpce) {
        stats.attendingCpce++
      } else {
        stats.notAttendingCpce++
      }

      // Count by gender
      const gender = teacher.gender?.toLowerCase()
      if (gender === "male") stats.byGender.male++
      else if (gender === "female") stats.byGender.female++
      else if (gender) stats.byGender.other++

      // Count by school level using schoolMap
      const school = schoolMap.get(String(teacher.school_id))
      if (school) {
        const schoolLevel = school.school_level_id
        if (schoolLevel === 1) stats.bySchoolLevel.nursery++
        else if (schoolLevel === 2) stats.bySchoolLevel.primary++
        else if (schoolLevel === 3) stats.bySchoolLevel.secondary++

        // Count by region
        const regionId = school.region_id
        if (regionId) {
          stats.byRegion[regionId] = (stats.byRegion[regionId] || 0) + 1
        }
      }
    })

    return { stats, error: null }
  } catch (error) {
    console.error("Error in getTeacherStatistics:", error)
    return { stats: null, error: "An unexpected error occurred." }
  }
}
