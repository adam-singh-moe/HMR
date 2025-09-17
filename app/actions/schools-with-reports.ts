"use server"

import { createServiceRoleSupabaseClient } from "@/lib/supabase"
import { getUser } from "./auth"

export async function getSchoolsWithSubmittedReports() {
  try {
    const user = await getUser()

    if (!user) {
      return { schools: [], hasReports: false, error: "User not authenticated." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Get all unique school IDs from SUBMITTED reports (matching Education Official logic)
    const { data: reportsData, error: reportsError } = await supabase
      .from("hmr_report")
      .select("school_id")
      .eq("status", "submitted")
      .is("deleted_on", null)

    if (reportsError) {
      console.error("❌ Reports fetch error:", reportsError)
      return { schools: [], hasReports: false, error: "Failed to fetch reports." }
    }

    // Get unique school IDs
    const uniqueSchoolIds = [...new Set(reportsData?.map(report => report.school_id) || [])]

    if (uniqueSchoolIds.length === 0) {
      return { schools: [], hasReports: false, error: null }
    }

    // Now fetch school details for these IDs with error handling
    let schoolsData: any[] = []
    try {
      const result = await supabase
        .from("sms_schools")
        .select(`
          id,
          name,
          region_id,
          sms_regions!sms_schools_region_id_fkey (
            id,
            name
          )
        `)
        .in("id", uniqueSchoolIds)

      if (result.error) {
        console.error("❌ Schools fetch error:", {
          message: result.error.message,
          details: result.error.details,
          hint: result.error.hint,
          code: result.error.code
        })
        
        // Return a minimal response to avoid breaking the UI
        return { 
          schools: [], 
          hasReports: true, 
          error: null // Don't propagate the error to avoid UI breaks
        }
      }
      
      schoolsData = result.data || []
    } catch (fetchError) {
      console.error("❌ Network/Fetch error when getting schools:", fetchError)
      // Return a minimal response to avoid breaking the UI
      return { 
        schools: [], 
        hasReports: true, 
        error: null // Don't propagate the error to avoid UI breaks
      }
    }

    // Format the school data
    const formattedSchools = schoolsData?.map(school => {
      const regions = school.sms_regions
      let regionName = 'Unknown Region'
      
      if (Array.isArray(regions) && regions.length > 0) {
        regionName = regions[0]?.name || 'Unknown Region'
      } else if (regions && typeof regions === 'object' && 'name' in regions) {
        regionName = (regions as any).name || 'Unknown Region'
      }

      return {
        id: school.id,
        name: school.name,
        region_id: school.region_id,
        region_name: regionName
      }
    }) || []

    // Apply role-based filtering
    let filteredSchools = formattedSchools

    if (user.role === "Regional Officer" && user.region) {
      // RO can only see schools in their region
      filteredSchools = formattedSchools.filter(school => school.region_id === user.region)
    } else if (user.role === "Head Teacher" && user.school_id) {
      // Head Teacher can only see their own school
      filteredSchools = formattedSchools.filter(school => school.id === user.school_id)
    }
    // Education Officials and Admins can see all schools

    return { schools: filteredSchools, hasReports: true, error: null }
  } catch (error) {
    console.error("Error in getSchoolsWithSubmittedReports:", error)
    return { schools: [], hasReports: false, error: "An unexpected error occurred." }
  }
}
