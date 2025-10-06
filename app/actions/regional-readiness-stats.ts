"use server"

import { getUser } from "@/app/actions/auth"
import { createServiceRoleSupabaseClient } from "@/lib/supabase"

interface RegionalReadinessStats {
  regionId: string
  regionName: string
  totalSchools: number
  readySchools: number
  notReadySchools: number
  noStatusSchools: number
  readyPercentage: number
  notReadyPercentage: number
  noStatusPercentage: number
}

export async function getRegionalReadinessStats() {
  try {
    const user = await getUser()
    if (!user) {
      return { error: "User not authenticated." }
    }

    if (user.role !== "Education Official") {
      return { error: "Only Education Officials can access school readiness statistics." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Get all schools with their region information and latest readiness status
    const { data: schoolsWithRegions, error: schoolsError } = await supabase
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
      .order('name')

    if (schoolsError) {
      console.error("Error getting schools:", schoolsError)
      return { error: "Failed to load schools." }
    }

    if (schoolsWithRegions && schoolsWithRegions.length > 0) {
      // Schools data loaded successfully
    }

    // Get the latest readiness record for each school
    const { data: allReadinessRecords, error: readinessError } = await supabase
      .from("hmr_school_readiness")
      .select(`
        school_id,
        status,
        created_at
      `)
      .order("created_at", { ascending: false })

    if (readinessError) {
      console.error("Error getting readiness records:", readinessError)
      return { error: "Failed to load readiness records." }
    }

    // Create a map of latest status per school
    const latestStatusPerSchool = new Map<string, string>()
    if (allReadinessRecords) {
      // Process records to get the truly latest record per school
      const latestRecordPerSchool = new Map<string, { status: string; created_at: string }>()
      
      allReadinessRecords.forEach((record, index) => {
        const schoolId = record.school_id
        const existing = latestRecordPerSchool.get(schoolId)
        
        // Only keep the record if it's newer than what we already have
        if (!existing || new Date(record.created_at) > new Date(existing.created_at)) {
          latestRecordPerSchool.set(schoolId, {
            status: record.status?.trim() || '',
            created_at: record.created_at
          })
        }
      })
      
      // Convert to simple status map
      latestRecordPerSchool.forEach((record, schoolId) => {
        latestStatusPerSchool.set(schoolId, record.status)
      })
    }

    // Group schools by region and calculate statistics
    const regionStatsMap = new Map<string, {
      regionId: string
      regionName: string
      totalSchools: number
      readySchools: number
      notReadySchools: number
      noStatusSchools: number
    }>()
    
    // Process each school
    schoolsWithRegions?.forEach((school, index) => {
      const regionId = school.region_id
      const regionName = (school.sms_regions as any)?.name || 'Unknown Region'
      
      // Initialize region if not exists
      if (!regionStatsMap.has(regionId)) {
        regionStatsMap.set(regionId, {
          regionId,
          regionName,
          totalSchools: 0,
          readySchools: 0,
          notReadySchools: 0,
          noStatusSchools: 0
        })
      }

      const regionStats = regionStatsMap.get(regionId)!
      regionStats.totalSchools++

      // Get the latest status for this school
      const status = latestStatusPerSchool.get(school.id)
      
      // Count based on status
      if (status === 'ready') {
        regionStats.readySchools++
      } else if (status === 'not_ready') {
        regionStats.notReadySchools++
      } else {
        // No status means the school hasn't submitted a readiness report yet
        regionStats.noStatusSchools++
      }
    })

    // Convert to final format with percentages
    const regionalStats: RegionalReadinessStats[] = Array.from(regionStatsMap.values()).map(regionData => {
      const totalSchools = regionData.totalSchools
      return {
        regionId: regionData.regionId,
        regionName: regionData.regionName,
        totalSchools,
        readySchools: regionData.readySchools,
        notReadySchools: regionData.notReadySchools,
        noStatusSchools: regionData.noStatusSchools,
        readyPercentage: totalSchools > 0 ? Math.round((regionData.readySchools / totalSchools) * 10000) / 100 : 0,
        notReadyPercentage: totalSchools > 0 ? Math.round((regionData.notReadySchools / totalSchools) * 10000) / 100 : 0,
        noStatusPercentage: totalSchools > 0 ? Math.round((regionData.noStatusSchools / totalSchools) * 10000) / 100 : 0
      }
    }).sort((a, b) => a.regionName.localeCompare(b.regionName))

    return {
      success: true,
      data: regionalStats
    }
  } catch (error) {
    console.error("Error in getRegionalReadinessStats:", error)
    return { error: "An unexpected error occurred." }
  }
}
