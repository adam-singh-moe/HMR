"use server"

import { createServiceRoleSupabaseClient } from "@/lib/supabase"
import { getUser } from "./auth"

interface ReadinessStats {
  readySchools: number
  notReadySchools: number
  noStatusSchools: number
  totalSchools: number
  readyPercentage: number
  notReadyPercentage: number
  noStatusPercentage: number
}

interface SchoolWithReadiness {
  id: string
  name: string
  region: string
  readinessStatus: 'ready' | 'not-ready' | 'no-status'
  lastUpdated: string | null
  reason: string | null
  checklist: Record<string, boolean>
}

export async function getSchoolReadinessStats() {
  try {
    const user = await getUser()

    if (!user) {
      return { data: null, error: "User not authenticated." }
    }

    if (user.role !== "Education Official") {
      return { data: null, error: "Only Education Officials can access this data." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Get all schools with their regions
    const { data: schools, error: schoolsError } = await supabase
      .from("sms_schools")
      .select(`
        id,
        name,
        sms_regions (
          id,
          name
        )
      `)
      .order("name")

    if (schoolsError) {
      console.error("Error fetching schools:", schoolsError)
      return { data: null, error: "Failed to fetch schools data." }
    }

    // Get all readiness records (only latest for each school)
    const { data: readinessRecords, error: readinessError } = await supabase
      .from("hmr_school_readiness")
      .select(`
        school_id,
        status,
        reason,
        updated_at,
        created_at
      `)
      .order("updated_at", { ascending: false })

    if (readinessError) {
      console.error("Error fetching readiness records:", readinessError)
      return { data: null, error: "Failed to fetch readiness data." }
    }

    // Create a map of latest readiness status for each school
    const latestReadinessMap = new Map()
    if (readinessRecords) {
      readinessRecords.forEach(record => {
        if (!latestReadinessMap.has(record.school_id)) {
          latestReadinessMap.set(record.school_id, record)
        }
      })
    }

    const totalSchools = schools?.length || 0
    let readySchools = 0
    let notReadySchools = 0
    let noStatusSchools = 0

    // Count schools by status
    schools?.forEach(school => {
      const readinessRecord = latestReadinessMap.get(school.id)
      if (readinessRecord) {
        if (readinessRecord.status === 'ready') {
          readySchools++
        } else if (readinessRecord.status === 'not-ready') {
          notReadySchools++
        } else {
          noStatusSchools++
        }
      } else {
        noStatusSchools++
      }
    })

    // Calculate percentages
    const readyPercentage = totalSchools > 0 ? Math.round((readySchools / totalSchools) * 10000) / 100 : 0
    const notReadyPercentage = totalSchools > 0 ? Math.round((notReadySchools / totalSchools) * 10000) / 100 : 0
    const noStatusPercentage = totalSchools > 0 ? Math.round((noStatusSchools / totalSchools) * 10000) / 100 : 0

    const stats: ReadinessStats = {
      readySchools,
      notReadySchools,
      noStatusSchools,
      totalSchools,
      readyPercentage,
      notReadyPercentage,
      noStatusPercentage
    }

    return { data: stats, error: null }
  } catch (error) {
    console.error("Error in getSchoolReadinessStats:", error)
    return { data: null, error: "An unexpected error occurred." }
  }
}

export async function getSchoolsByReadinessStatus(status: 'ready' | 'not-ready' | 'no-status') {
  try {
    const user = await getUser()

    if (!user) {
      return { schools: [], error: "User not authenticated." }
    }

    if (user.role !== "Education Official") {
      return { schools: [], error: "Only Education Officials can access this data." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Get all schools with their regions
    const { data: schools, error: schoolsError } = await supabase
      .from("sms_schools")
      .select(`
        id,
        name,
        sms_regions (
          id,
          name
        )
      `)
      .order("name")

    if (schoolsError) {
      console.error("Error fetching schools:", schoolsError)
      return { schools: [], error: "Failed to fetch schools data." }
    }

    // Get all readiness records (only latest for each school)
    const { data: readinessRecords, error: readinessError } = await supabase
      .from("hmr_school_readiness")
      .select(`
        school_id,
        status,
        reason,
        updated_at,
        checklist_items
      `)
      .order("updated_at", { ascending: false })

    if (readinessError) {
      console.error("Error fetching readiness records:", readinessError)
      return { schools: [], error: "Failed to fetch readiness data." }
    }

    // Create a map of latest readiness status for each school
    const latestReadinessMap = new Map()
    if (readinessRecords) {
      readinessRecords.forEach(record => {
        if (!latestReadinessMap.has(record.school_id)) {
          latestReadinessMap.set(record.school_id, record)
        }
      })
    }

    // Filter schools based on requested status
    const filteredSchools: SchoolWithReadiness[] = []
    
    schools?.forEach(school => {
      const readinessRecord = latestReadinessMap.get(school.id)
      const regionName = Array.isArray(school.sms_regions) 
        ? school.sms_regions[0]?.name 
        : (school.sms_regions as any)?.name

      let schoolStatus: 'ready' | 'not-ready' | 'no-status' = 'no-status'
      
      if (readinessRecord) {
        if (readinessRecord.status === 'ready') {
          schoolStatus = 'ready'
        } else if (readinessRecord.status === 'not-ready') {
          schoolStatus = 'not-ready'
        }
      }

      // Only include schools that match the requested status
      if (schoolStatus === status) {
        filteredSchools.push({
          id: school.id,
          name: school.name,
          region: regionName || "Unknown Region",
          readinessStatus: schoolStatus,
          lastUpdated: readinessRecord?.updated_at || null,
          reason: readinessRecord?.reason || null,
          checklist: readinessRecord?.checklist_items || {}
        })
      }
    })

    return { schools: filteredSchools, error: null }
  } catch (error) {
    console.error("Error in getSchoolsByReadinessStatus:", error)
    return { schools: [], error: "An unexpected error occurred." }
  }
}
