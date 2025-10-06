"use server"

import { createServiceRoleSupabaseClient } from "@/lib/supabase"

interface School {
  id: string
  name: string
  region_id: string
  readiness_status?: 'ready' | 'not_ready' | null
  readiness_reason?: string
  readiness_updated_at?: string
  sms_regions?: {
    id: string
    name: string
  }
}

interface Region {
  id: string
  name: string
}

export async function getSchoolsByRegion(regionId: string): Promise<{
  schools?: School[]
  error?: string
}> {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    // Get schools in the region (without readiness data first)
    const { data: schools, error } = await supabase
      .from('sms_schools')
      .select(`
        id,
        name,
        region_id,
        sms_regions(id, name)
      `)
      .eq('region_id', regionId)
      .order('name')

    if (error) {
      console.error('Error fetching schools by region:', error)
      return { error: 'Failed to fetch schools for this region' }
    }

    if (!schools || schools.length === 0) {
      return { schools: [] }
    }
    
    // Get school IDs for this region
    const schoolIds = schools.map((s: any) => s.id)
    
    // Get ALL readiness records for schools in this region
    const { data: readinessRecords, error: readinessError } = await supabase
      .from('hmr_school_readiness')
      .select(`
        school_id,
        status,
        reason,
        created_at
      `)
      .in('school_id', schoolIds)
      .order('created_at', { ascending: false })

    if (readinessError) {
      console.error('Error fetching readiness records:', readinessError)
      // Don't fail completely, just proceed without readiness data
    }

    // Create a map of latest readiness status per school (same logic as regional stats)
    const latestStatusPerSchool = new Map<string, any>()
    if (readinessRecords) {
      const latestRecordPerSchool = new Map<string, any>()
      
      readinessRecords.forEach((record) => {
        const schoolId = record.school_id
        const existing = latestRecordPerSchool.get(schoolId)
        
        if (!existing || new Date(record.created_at) > new Date(existing.created_at)) {
          latestRecordPerSchool.set(schoolId, record)
        }
      })
      
      latestRecordPerSchool.forEach((record, schoolId) => {
        latestStatusPerSchool.set(schoolId, record)
      })
    }

    // Process the schools to get the latest readiness status
    const processedSchools: School[] = schools.map((school: any) => {
      // Get the latest readiness record from our map
      const latestReadiness = latestStatusPerSchool.get(school.id)

      return {
        id: school.id,
        name: school.name,
        region_id: school.region_id,
        readiness_status: latestReadiness?.status || null,
        readiness_reason: latestReadiness?.reason || null,
        readiness_updated_at: latestReadiness?.created_at || null,
        sms_regions: school.sms_regions
      }
    })
    
    return { schools: processedSchools }
  } catch (error) {
    console.error('Unexpected error in getSchoolsByRegion:', error)
    return { error: 'An unexpected error occurred while fetching regional schools' }
  }
}

export async function getRegionById(regionId: string): Promise<{
  region?: Region
  error?: string
}> {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    const { data: region, error } = await supabase
      .from('sms_regions')
      .select('id, name')
      .eq('id', regionId)
      .single()

    if (error) {
      console.error('Error fetching region:', error)
      return { error: 'Failed to fetch region details' }
    }

    if (!region) {
      return { error: 'Region not found' }
    }
    
    return { region }
  } catch (error) {
    console.error('Unexpected error in getRegionById:', error)
    return { error: 'An unexpected error occurred while fetching region details' }
  }
}
