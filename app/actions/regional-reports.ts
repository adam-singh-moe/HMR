"use server"

import { createServiceRoleSupabaseClient } from "@/lib/supabase"
import { getUser } from "./auth"

export async function getHistoricalReports() {
  try {
    const user = await getUser()

    if (!user || user.role !== "Regional Officer") {
      return { reports: [], error: "Only Regional Officers can access historical reports." }
    }

    if (!user.region) {
      return { reports: [], error: "Regional Officer has no region assigned." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Fetch reports by joining with schools to filter by region
    const { data: reports, error } = await supabase
      .from("hmr_report")
      .select(`
        *,
        sms_schools!inner(id, name, region_id)
      `)
      .eq("sms_schools.region_id", user.region)
      .eq("status", "submitted")
      .is("deleted_on", null)
      .order("updated_at", { ascending: false })

    if (error) {
      console.error("Error fetching historical reports:", error)
      return { reports: [], error: "Failed to fetch historical reports." }
    }

    if (!reports || reports.length === 0) {
      return { reports: [], error: null }
    }

    // Get unique headteacher IDs (we already have school info from the join)
    // Filter out any non-UUID values that might be role names
    const headteacherIds = [...new Set(reports
      .map((r) => r.headteacher_id)
      .filter(Boolean)
      .filter((id) => {
        // Check if it's a valid UUID pattern (basic check)
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        const isValid = uuidPattern.test(id)
        return isValid
      })
    )]
    // Fetch headteacher names with proper role join
    const { data: headteachers, error: headteachersError } = await supabase
      .from("hmr_users")
      .select(`
        id, 
        name, 
        email,
        hmr_user_roles!inner(name)
      `)
      .in("id", headteacherIds)
      .eq("hmr_user_roles.name", "Head Teacher")
      .is("deleted_at", null)

    if (headteachersError) {
      console.error("Error fetching headteachers for historical reports:", headteachersError)
    } else {
    }

    // Create lookup map for headteachers
    const headteacherMap = new Map(headteachers?.map((h) => [h.id, h.name]) || [])

    // Transform the data for display
    const transformedReports = reports.map((report) => ({
      id: report.id,
      schoolId: report.school_id, // Include school_id for navigation
      schoolName: report.sms_schools?.name || "Unknown School",
      headTeacherName: headteacherMap.get(report.headteacher_id) || "Head Teacher",
      month: report.month,
      year: report.year,
      monthYear: `${getMonthName(report.month)} ${report.year}`,
      submittedDate: report.updated_at ? new Date(report.updated_at).toLocaleDateString() : "Unknown",
      submittedDateTime: report.updated_at,
    }))

    return { reports: transformedReports, error: null }
  } catch (error) {
    console.error("Error in getHistoricalReports:", error)
    return { reports: [], error: "An unexpected error occurred." }
  }
}

function getMonthName(monthNumber: number): string {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]
  return months[monthNumber - 1] || "Unknown"
}
