"use server"

import { createServiceRoleSupabaseClient } from "@/lib/supabase"
import { getUser } from "./auth"

export async function getCurrentMonthSchools() {
  try {
    const user = await getUser()

    if (!user || user.role !== "Regional Officer") {
      return { schools: [], error: "Only Regional Officers can access school reports." }
    }

    if (!user.region) {
      return { schools: [], error: "Regional Officer has no region assigned." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Get previous month and year (current reporting period)
    const now = new Date()
    let reportingMonth = now.getMonth() // JavaScript months are 0-indexed, so this gives us last month
    let reportingYear = now.getFullYear()
    
    // Handle year rollover for January (month 0)
    if (reportingMonth === 0) {
      reportingMonth = 12
      reportingYear = reportingYear - 1
    }

    // Calculate due date: Reports for the previous month are due at the end of the current month
    // For example: June 2025 reports are due July 31, 2025
    const dueDateMonth = now.getMonth() + 1 // Current month (1-indexed)
    const dueDateYear = now.getFullYear()
    const lastDayOfDueMonth = new Date(dueDateYear, dueDateMonth, 0).getDate()
    const dueDate = `${dueDateYear}-${dueDateMonth.toString().padStart(2, "0")}-${lastDayOfDueMonth}`

    // Fetch all schools in the regional officer's region
    const { data: schools, error: schoolsError } = await supabase
      .from("sms_schools")
      .select("id, name, region_id")
      .eq("region_id", user.region)
      .order("name")

    if (schoolsError) {
      console.error("Error fetching schools:", schoolsError)
      return { schools: [], error: "Failed to fetch schools." }
    }

    if (!schools || schools.length === 0) {
      return { schools: [], error: "No schools found in your region." }
    }

    // Get school IDs
    const schoolIds = schools.map((s) => s.id)

    // Fetch reports for the current reporting period (previous month)
    const { data: reports, error: reportsError } = await supabase
      .from("hmr_report")
      .select("id, school_id, headteacher_id, status, updated_at")
      .in("school_id", schoolIds)
      .eq("month", reportingMonth)
      .eq("year", reportingYear)
      .is("deleted_on", null)

    if (reportsError) {
      console.error("Error fetching reports:", reportsError)
      return { schools: [], error: "Failed to fetch reports." }
    }

    // Get all head teachers assigned to schools in this region (even if they haven't submitted reports)
    let allHeadTeachers: any[] = []
    try {
      const { data: headTeachersData, error: allHeadTeachersError } = await supabase
        .from("hmr_users")
        .select(`
          id, 
          name, 
          email, 
          school_id,
          hmr_user_roles!inner(name)
        `)
        .eq("hmr_user_roles.name", "Head Teacher")
        .in("school_id", schoolIds) // Filter by school IDs in this region instead of user.region
        .is("deleted_at", null)

      if (allHeadTeachersError) {
        console.error("Error fetching all head teachers with roles:", allHeadTeachersError)
        
        // Fallback: Try to get head teachers by role ID directly
        try {
          const { data: roleData } = await supabase
            .from("hmr_user_roles")
            .select("id")
            .eq("name", "Head Teacher")
            .single()

          if (roleData) {
            const { data: fallbackHeadTeachers } = await supabase
              .from("hmr_users")
              .select("id, name, email, school_id, role")
              .eq("role", roleData.id)
              .in("school_id", schoolIds)
              .is("deleted_at", null)

            allHeadTeachers = fallbackHeadTeachers || []
          }
        } catch (fallbackError) {
          console.error("Fallback head teacher lookup also failed:", fallbackError)
        }
      } else {
        allHeadTeachers = headTeachersData || []
      }
    } catch (error) {
      console.error("Error in head teacher lookup:", error)
    }

    // Get unique head teacher IDs from reports (for head teachers who have submitted reports)
    // Filter out any non-UUID values that might be role names
    const reportHeadTeacherIds = reports
      ?.filter((report) => {
        if (!report.headteacher_id) return false
        // Check if it's a valid UUID pattern (basic check)
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        const isValid = uuidPattern.test(report.headteacher_id)
        return isValid
      })
      .map((report) => report.headteacher_id) || []
    // Fetch head teacher details from reports if we have any valid head teacher IDs
    let reportHeadTeachers: any[] = []
    if (reportHeadTeacherIds.length > 0) {
      const { data: headTeachersData, error: headTeachersError } = await supabase
        .from("hmr_users")
        .select(`
          id, 
          name, 
          email,
          hmr_user_roles!inner(name)
        `)
        .in("id", reportHeadTeacherIds)
        .eq("hmr_user_roles.name", "Head Teacher")
        .is("deleted_at", null)

      if (headTeachersError) {
        console.error("Error fetching head teachers from reports:", headTeachersError)
      } else {
        reportHeadTeachers = headTeachersData || []
      }
    }

    // Create lookup maps
    const allHeadTeacherMap = new Map()
    const reportHeadTeacherMap = new Map()
    
    // Map all head teachers by school_id (for schools without reports)
    allHeadTeachers?.forEach((ht: any) => {
      if (ht.school_id) {
        allHeadTeacherMap.set(ht.school_id, {
          name: ht.name,
          email: ht.email,
          id: ht.id,
        })
      }
    })

    // Map head teachers from reports by their ID
    reportHeadTeachers.forEach((ht: any) => {
      reportHeadTeacherMap.set(ht.id, {
        name: ht.name,
        email: ht.email,
        id: ht.id,
      })
    })

    const reportMap = new Map()
    reports?.forEach((report) => {
      reportMap.set(report.school_id, {
        id: report.id,
        status: report.status,
        submittedDate: report.updated_at,
        headteacherId: report.headteacher_id,
      })
    })

    // Transform the data
    const transformedSchools = schools.map((school) => {
      const report = reportMap.get(school.id)
      let headTeacher = null
      let headTeacherEmail = ""
      let headTeacherId = null

      // Get head teacher info - prioritize school assignment over report headteacher_id
      // First try to get from school assignment (most reliable)
      headTeacher = allHeadTeacherMap.get(school.id)
      if (headTeacher) {
        headTeacherEmail = headTeacher.email
        headTeacherId = headTeacher.id
      } else if (report && report.headteacherId) {
        // Fallback: try to get from report head teacher mapping
        headTeacher = reportHeadTeacherMap.get(report.headteacherId)
        if (headTeacher) {
          headTeacherEmail = headTeacher.email
          headTeacherId = headTeacher.id
        }
      }

      let status = "not-submitted"
      let submittedDate = null
      let reportId = null

      if (report) {
        status = report.status
        submittedDate = report.submittedDate
        reportId = report.id

        // Check if overdue (past due date and not submitted)
        if (status !== "submitted" && new Date() > new Date(dueDate)) {
          status = "overdue"
        }
      } else {
        // No report exists, check if overdue
        if (new Date() > new Date(dueDate)) {
          status = "overdue"
        }
      }

      return {
        id: school.id,
        schoolName: school.name,
        headTeacher: headTeacher?.name || "",
        headTeacherEmail: headTeacherEmail,
        headTeacherId: headTeacherId,
        region: `Region ${school.region_id}`,
        dueDate,
        status,
        submittedDate,
        reportId,
      }
    })

    return { schools: transformedSchools, error: null }
  } catch (error) {
    console.error("Error in getCurrentMonthSchools:", error)
    return { schools: [], error: "An unexpected error occurred." }
  }
}
