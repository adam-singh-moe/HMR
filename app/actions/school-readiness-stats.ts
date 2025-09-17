"use server"

import { createServiceRoleSupabaseClient } from "@/lib/supabase"
import { getUser } from "./auth"

export async function getSchoolReadinessPercentage() {
  try {
    const user = await getUser()
    if (!user) {
      return { error: "User not authenticated." }
    }

    if (user.role !== "Education Official") {
      return { error: "Only Education Officials can access school readiness statistics." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Get total number of schools
    const { count: totalSchools, error: schoolCountError } = await supabase
      .from("sms_schools")
      .select("*", { count: "exact", head: true })

    if (schoolCountError) {
      console.error("Error getting total schools:", schoolCountError)
      return { error: "Failed to get total schools count." }
    }

    // Get count of schools that are ready (with latest readiness status)
    // This query gets the latest readiness record for each school and counts how many are 'ready'
    const { data: readySchools, error: readinessError } = await supabase
      .from("hmr_school_readiness")
      .select(`
        school_id,
        status,
        created_at,
        sms_schools!inner(id)
      `)
      .order("created_at", { ascending: false })

    if (readinessError) {
      console.error("Error getting school readiness data:", readinessError)
      return { error: "Failed to get school readiness data." }
    }

    // Process the data to get only the latest record per school
    const latestReadinessPerSchool = new Map<string, { status: string; created_at: string }>()
    
    if (readySchools) {
      readySchools.forEach((record) => {
        const schoolId = record.school_id
        const existing = latestReadinessPerSchool.get(schoolId)
        
        if (!existing || new Date(record.created_at) > new Date(existing.created_at)) {
          latestReadinessPerSchool.set(schoolId, {
            status: record.status,
            created_at: record.created_at
          })
        }
      })
    }

    // Count how many schools are ready
    const readySchoolsCount = Array.from(latestReadinessPerSchool.values())
      .filter(record => record.status === 'ready')
      .length

    // Calculate percentage with 2 decimal places
    const totalSchoolsCount = totalSchools || 0
    const percentage = totalSchoolsCount > 0 ? Math.round((readySchoolsCount / totalSchoolsCount) * 10000) / 100 : 0

    return {
      success: true,
      data: {
        totalSchools: totalSchoolsCount,
        readySchools: readySchoolsCount,
        percentage
      }
    }
  } catch (error) {
    console.error("Error in getSchoolReadinessPercentage:", error)
    return { error: "An unexpected error occurred." }
  }
}
