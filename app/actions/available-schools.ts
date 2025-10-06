"use server"

import { createServerSupabaseClient } from "@/lib/supabase"

interface AvailableSchool {
  id: string
  name: string
  region_id: string
  region_name?: string
  sms_regions?: {
    id: string
    name: string
  }
}

export async function getAvailableSchools(): Promise<{
  schools: AvailableSchool[]
  error?: string
}> {
  try {
    const supabase = createServerSupabaseClient()

    // First, get all school IDs that have active head teachers
    const { data: assignedSchools, error: assignedError } = await supabase
      .from("hmr_users")
      .select("school_id")
      .not("school_id", "is", null)
      .is("deleted_at", null)

    if (assignedError) {
      console.error("Error fetching assigned schools:", assignedError)
      return { schools: [], error: "Failed to fetch assigned schools" }
    }

    const assignedSchoolIds = assignedSchools?.map(user => user.school_id).filter(Boolean) || []

    // Then fetch all schools excluding the assigned ones
    let query = supabase
      .from("sms_schools")
      .select(`
        id,
        name,
        region_id,
        sms_regions (
          id,
          name
        )
      `)
      .order("name")

    // Only add the not filter if there are assigned schools
    if (assignedSchoolIds.length > 0) {
      query = query.not("id", "in", `(${assignedSchoolIds.map(id => `'${id}'`).join(',')})`)
    }

    const { data: schools, error } = await query

    if (error) {
      console.error("Error fetching available schools:", error)
      return { schools: [], error: "Failed to fetch available schools" }
    }

    // Transform the data to include region_name
    const transformedSchools: AvailableSchool[] = (schools || []).map((school: any) => {
      const regionData = school.sms_regions
      const regionName = Array.isArray(regionData) 
        ? regionData[0]?.name 
        : regionData?.name
      const regionObj = Array.isArray(regionData) 
        ? regionData[0] 
        : regionData

      return {
        id: school.id,
        name: school.name,
        region_id: school.region_id,
        region_name: regionName,
        sms_regions: regionObj
      }
    })

    return { schools: transformedSchools }
  } catch (error) {
    console.error("Error in getAvailableSchools:", error)
    return { schools: [], error: "An unexpected error occurred" }
  }
}

export async function searchAvailableSchools(searchQuery: string, limit?: number): Promise<{
  schools: AvailableSchool[]
  error?: string
}> {
  try {
    const supabase = createServerSupabaseClient()

    if (!searchQuery.trim()) {
      // If no search query, return all available schools
      const result = await getAvailableSchools()
      return {
        schools: result.schools,
        error: result.error
      }
    }

    // First, get all school IDs that have active head teachers
    const { data: assignedSchools, error: assignedError } = await supabase
      .from("hmr_users")
      .select("school_id")
      .not("school_id", "is", null)
      .is("deleted_at", null)

    if (assignedError) {
      console.error("Error fetching assigned schools:", assignedError)
      return { schools: [], error: "Failed to fetch assigned schools" }
    }

    const assignedSchoolIds = assignedSchools?.map(user => user.school_id).filter(Boolean) || []

    // Search schools by name and exclude those with active head teachers
    let query = supabase
      .from("sms_schools")
      .select(`
        id,
        name,
        region_id,
        sms_regions (
          id,
          name
        )
      `)
      .ilike("name", `%${searchQuery}%`)
      .order("name")

    // Only add the not filter if there are assigned schools
    if (assignedSchoolIds.length > 0) {
      query = query.not("id", "in", `(${assignedSchoolIds.map(id => `'${id}'`).join(',')})`)
    }

    const { data: schools, error } = await query

    if (error) {
      console.error("Error searching available schools:", error)
      return { schools: [], error: "Failed to search schools" }
    }

    // Transform the data to include region_name
    const transformedSchools: AvailableSchool[] = (schools || []).map((school: any) => {
      const regionData = school.sms_regions
      const regionName = Array.isArray(regionData) 
        ? regionData[0]?.name 
        : regionData?.name
      const regionObj = Array.isArray(regionData) 
        ? regionData[0] 
        : regionData

      return {
        id: school.id,
        name: school.name,
        region_id: school.region_id,
        region_name: regionName,
        sms_regions: regionObj
      }
    })

    // Apply limit if provided, otherwise return all results
    const finalSchools = limit ? transformedSchools.slice(0, limit) : transformedSchools

    return { schools: finalSchools }
  } catch (error) {
    console.error("Error in searchAvailableSchools:", error)
    return { schools: [], error: "An unexpected error occurred" }
  }
}
