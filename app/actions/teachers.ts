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
  status_id?: string
  status?: string
  date_of_birth?: string
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
    const statusId = formData.get("status_id") as string
    const dateOfBirth = formData.get("date_of_birth") as string
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
        status_id: statusId || null,
        date_of_birth: dateOfBirth || null,
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
    const statusId = formData.get("status_id") as string
    const dateOfBirth = formData.get("date_of_birth") as string
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
        status_id: statusId || null,
        status_id: statusId || null,
        date_of_birth: dateOfBirth || null,
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
