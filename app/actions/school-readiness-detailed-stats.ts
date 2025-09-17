"use server"

import { createServiceRoleSupabaseClient } from "@/lib/supabase"
import { getUser } from "./auth"

export async function getSchoolReadinessDetailedStats() {
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

    // Get all readiness records to determine latest status per school
    const { data: readinessRecords, error: readinessError } = await supabase
      .from("hmr_school_readiness")
      .select(`
        school_id,
        status,
        created_at
      `)
      .order("created_at", { ascending: false })

    if (readinessError) {
      console.error("Error getting school readiness data:", readinessError)
      return { error: "Failed to get school readiness data." }
    }

    // Process the data to get only the latest record per school
    const latestReadinessPerSchool = new Map<string, { status: string; created_at: string }>()
    
    if (readinessRecords) {
      readinessRecords.forEach((record) => {
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

    // Count schools by status
    let readyCount = 0
    let notReadyCount = 0
    let noStatusCount = 0

    const totalSchoolsCount = totalSchools || 0
    const schoolsWithStatus = latestReadinessPerSchool.size

    // Count schools with status
    Array.from(latestReadinessPerSchool.values()).forEach(record => {
      if (record.status === 'ready') {
        readyCount++
      } else if (record.status === 'not_ready') {
        notReadyCount++
      }
    })

    // Schools without any status update
    noStatusCount = totalSchoolsCount - schoolsWithStatus

    return {
      success: true,
      data: {
        totalSchools: totalSchoolsCount,
        readyToReopen: readyCount,
        notReady: notReadyCount,
        noStatusUpdate: noStatusCount,
        // Calculate percentages
        readyPercentage: totalSchoolsCount > 0 ? Math.round((readyCount / totalSchoolsCount) * 10000) / 100 : 0,
        notReadyPercentage: totalSchoolsCount > 0 ? Math.round((notReadyCount / totalSchoolsCount) * 10000) / 100 : 0,
        noStatusPercentage: totalSchoolsCount > 0 ? Math.round((noStatusCount / totalSchoolsCount) * 10000) / 100 : 0
      }
    }
  } catch (error) {
    console.error("Error in getSchoolReadinessDetailedStats:", error)
    return { error: "An unexpected error occurred." }
  }
}

export async function getSchoolsByReadinessStatus(
  status: 'ready' | 'not_ready' | 'no_status',
  page: number = 1,
  pageSize: number = 20,
  regionId?: string
) {
  try {
    const user = await getUser()
    if (!user) {
      return { schools: [], totalCount: 0, totalPages: 0, error: "User not authenticated." }
    }

    if (user.role !== "Education Official") {
      return { schools: [], totalCount: 0, totalPages: 0, error: "Only Education Officials can access school readiness statistics." }
    }

    const supabase = createServiceRoleSupabaseClient()
    const offset = (page - 1) * pageSize

    // Debug: First let's see what's actually in the database
    const { data: allReadinessRecords, error: debugError } = await supabase
      .from("hmr_school_readiness")
      .select("*")

    if (status === 'no_status') {
      // Get schools that don't have any readiness status
      const { data: schoolsWithStatus, error: statusError } = await supabase
        .from("hmr_school_readiness")
        .select("school_id")

      if (statusError) {
        console.error("Error getting schools with status:", statusError)
        return { schools: [], totalCount: 0, totalPages: 0, error: "Failed to get schools with status." }
      }

      const schoolIdsWithStatus = [...new Set(schoolsWithStatus?.map(s => s.school_id) || [])]

      // Build the count query
      const countQuery = supabase
        .from("sms_schools")
        .select("id", { count: "exact", head: true })

      if (schoolIdsWithStatus.length > 0) {
        countQuery.not("id", "in", `(${schoolIdsWithStatus.join(',')})`)
      }

      if (regionId) {
        countQuery.eq("region_id", regionId)
      }

      const { count: totalCount, error: countError } = await countQuery

      if (countError) {
        console.error("Error getting count of schools without status:", countError)
        return { schools: [], totalCount: 0, totalPages: 0, error: "Failed to get count." }
      }

      const totalPages = Math.ceil((totalCount || 0) / pageSize)

      // Build the main query
      const query = supabase
        .from("sms_schools")
        .select(`
          id,
          name,
          region_id,
          sms_regions!inner (
            id,
            name
          )
        `)
        .order("name")
        .range(offset, offset + pageSize - 1)

      if (schoolIdsWithStatus.length > 0) {
        query.not("id", "in", `(${schoolIdsWithStatus.join(',')})`)
      }

      if (regionId) {
        query.eq("region_id", regionId)
      }

      const { data: schools, error: schoolsError } = await query

      if (schoolsError) {
        console.error("Error getting schools without status:", schoolsError)
        return { schools: [], totalCount: 0, totalPages: 0, error: "Failed to get schools without status." }
      }

      return { schools: schools || [], totalCount: totalCount || 0, totalPages, error: null }
    } else {
      // Get schools with specific readiness status (ready or not_ready)
      // First get the latest readiness record per school
      const { data: readinessRecords, error: readinessError } = await supabase
        .from("hmr_school_readiness")
        .select(`
          school_id,
          status,
          created_at,
          reason,
          checklist_items
        `)
        .order("created_at", { ascending: false })

      if (readinessError) {
        console.error("Error getting readiness records:", readinessError)
        return { schools: [], totalCount: 0, totalPages: 0, error: "Failed to get readiness records." }
      }

      // Get latest record per school
      const latestReadinessPerSchool = new Map<string, any>()
      
      if (readinessRecords) {
        readinessRecords.forEach((record) => {
          const schoolId = record.school_id
          const existing = latestReadinessPerSchool.get(schoolId)
          
          if (!existing || new Date(record.created_at) > new Date(existing.created_at)) {
            latestReadinessPerSchool.set(schoolId, record)
          }
        })
      }

      // Filter schools by the requested status
      const schoolsWithRequestedStatus = Array.from(latestReadinessPerSchool.values())
        .filter(record => record.status === status)

      if (schoolsWithRequestedStatus.length === 0) {
        return { schools: [], totalCount: 0, totalPages: 0, error: null }
      }

      // Get school details for the filtered schools
      const schoolIds = schoolsWithRequestedStatus.map(s => s.school_id)
      
      const schoolQuery = supabase
        .from("sms_schools")
        .select(`
          id,
          name,
          region_id,
          sms_regions!inner (
            id,
            name
          )
        `)
        .in("id", schoolIds)
        .order("name")

      if (regionId) {
        schoolQuery.eq("region_id", regionId)
      }

      const { data: schools, error: schoolsError } = await schoolQuery

      if (schoolsError) {
        console.error("Error getting schools with status:", schoolsError)
        return { schools: [], totalCount: 0, totalPages: 0, error: "Failed to get schools with status." }
      }

      // Filter readiness data to match the region filter if applied
      const filteredSchoolIds = new Set(schools?.map(s => s.id) || [])
      const filteredReadinessData = schoolsWithRequestedStatus.filter(r => 
        filteredSchoolIds.has(r.school_id)
      )

      const totalCount = schools?.length || 0
      const totalPages = Math.ceil(totalCount / pageSize)

      // Apply pagination to the filtered results
      const paginatedSchools = schools?.slice(offset, offset + pageSize) || []
      const paginatedSchoolIds = new Set(paginatedSchools.map(s => s.id))
      const paginatedReadinessData = filteredReadinessData.filter(r => 
        paginatedSchoolIds.has(r.school_id)
      )

      // Combine school data with readiness data
      const schoolsWithReadinessData = paginatedSchools.map(school => {
        const readinessData = paginatedReadinessData.find(r => r.school_id === school.id)
        return {
          ...school,
          readiness_status: readinessData?.status,
          readiness_reason: readinessData?.reason,
          readiness_checklist: readinessData?.checklist_items,
          readiness_updated_at: readinessData?.created_at
        }
      })

      return { schools: schoolsWithReadinessData, totalCount, totalPages, error: null }
    }
  } catch (error) {
    console.error("Error in getSchoolsByReadinessStatus:", error)
    return { schools: [], totalCount: 0, totalPages: 0, error: "An unexpected error occurred." }
  }
}

export async function getRegionsForFilter() {
  try {
    const user = await getUser()
    if (!user) {
      return { regions: [], error: "User not authenticated." }
    }

    if (user.role !== "Education Official") {
      return { regions: [], error: "Only Education Officials can access this data." }
    }

    const supabase = createServiceRoleSupabaseClient()

    const { data: regions, error: regionsError } = await supabase
      .from("sms_regions")
      .select("id, name")
      .order("name")

    if (regionsError) {
      console.error("Error getting regions:", regionsError)
      return { regions: [], error: "Failed to get regions." }
    }

    return { regions: regions || [], error: null }
  } catch (error) {
    console.error("Error in getRegionsForFilter:", error)
    return { regions: [], error: "An unexpected error occurred." }
  }
}
