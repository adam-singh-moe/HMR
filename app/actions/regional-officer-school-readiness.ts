"use server"

import { createServiceRoleSupabaseClient } from "@/lib/supabase"

// Lightweight function to get just the readiness percentage for dashboard display
export async function getSchoolReadinessPercentage(regionName: string): Promise<{
  success: boolean
  ready_percentage?: number
  error?: string
}> {
  try {
    const supabase = createServiceRoleSupabaseClient()

    // First, get the region ID from the region name
    const { data: region, error: regionError } = await supabase
      .from('sms_regions')
      .select('id')
      .eq('name', regionName)
      .single()

    if (regionError || !region) {
      return { success: false, error: 'Region not found' }
    }

    // Get all schools in the region
    const { data: allSchools, error: schoolsError } = await supabase
      .from('sms_schools')
      .select('id')
      .eq('region_id', region.id)

    if (schoolsError) {
      return { success: false, error: schoolsError.message }
    }

    const totalSchools = allSchools?.length || 0

    if (totalSchools === 0) {
      return { success: true, ready_percentage: 0 }
    }

    // Get readiness records for schools in the region
    const schoolIds = allSchools.map(s => s.id)
    const { data: readinessRecords, error: readinessError } = await supabase
      .from('hmr_school_readiness')
      .select('school_id, status, created_at')
      .in('school_id', schoolIds)
      .order('created_at', { ascending: false })

    if (readinessError) {
      return { success: false, error: readinessError.message }
    }

    // Get latest readiness status per school
    const latestReadinessPerSchool = new Map<string, string>()
    if (readinessRecords) {
      const processedSchools = new Set<string>()
      readinessRecords.forEach(record => {
        if (!processedSchools.has(record.school_id)) {
          latestReadinessPerSchool.set(record.school_id, record.status)
          processedSchools.add(record.school_id)
        }
      })
    }

    // Count ready schools
    let readySchools = 0
    allSchools.forEach(school => {
      const status = latestReadinessPerSchool.get(school.id)
      if (status === 'ready') {
        readySchools++
      }
    })

    const ready_percentage = totalSchools > 0 ? Math.round((readySchools / totalSchools) * 100) : 0

    return { 
      success: true, 
      ready_percentage 
    }
  } catch (error) {
    console.error('Error getting school readiness percentage:', error)
    return { success: false, error: 'Failed to get readiness percentage' }
  }
}

interface SchoolReadinessData {
  id: string
  name: string
  readiness_status: string | null
  readiness_updated_at: string | null
  readiness_reason: string | null
  readiness_checklist_items: any | null
  latest_report_date?: string | null
}

interface RegionalSchoolReadinessStats {
  summary: {
    total_schools: number
    ready: number
    not_ready: number
    no_status: number
    ready_percentage: number
    not_ready_percentage: number
    no_status_percentage: number
  }
  schools: SchoolReadinessData[]
}

export async function getRegionalSchoolReadinessData(regionName: string): Promise<{
  success: boolean
  data?: RegionalSchoolReadinessStats
  error?: string
}> {
  try {
    const supabase = createServiceRoleSupabaseClient()

    // First, get the region ID from the region name
    const { data: region, error: regionError } = await supabase
      .from('sms_regions')
      .select('id, name')
      .eq('name', regionName)
      .single()

    if (regionError || !region) {
      return { success: false, error: 'Region not found' }
    }

    // Get all schools in the region
    const { data: schools, error: schoolsError } = await supabase
      .from('sms_schools')
      .select('id, name')
      .eq('region_id', region.id)
      .order('name')

    if (schoolsError) {
      return { success: false, error: 'Failed to fetch schools in region' }
    }

    if (!schools || schools.length === 0) {
      return {
        success: true,
        data: {
          summary: {
            total_schools: 0,
            ready_schools: 0,
            not_ready_schools: 0,
            no_status_schools: 0,
            ready_percentage: 0,
            not_ready_percentage: 0,
            no_status_percentage: 0
          },
          schools: []
        }
      }
    }

    // Get readiness records for all schools in the region
    const schoolIds = schools.map(s => s.id)
    const { data: readinessRecords, error: readinessError } = await supabase
      .from('hmr_school_readiness')
      .select('school_id, status, reason, checklist_items, created_at')
      .in('school_id', schoolIds)
      .order('created_at', { ascending: false })

    if (readinessError) {
      return { success: false, error: 'Failed to fetch readiness records' }
    }

    // Get latest HMR report dates for context
    const { data: latestReports, error: reportsError } = await supabase
      .from('hmr_reports')
      .select('school_id, created_at')
      .in('school_id', schoolIds)
      .order('created_at', { ascending: false })

    // Create a map of latest readiness status per school
    const latestReadinessPerSchool = new Map<string, { status: string; reason: string | null; checklist_items: any; created_at: string }>()
    if (readinessRecords) {
      const processedSchools = new Set<string>()
      readinessRecords.forEach(record => {
        if (!processedSchools.has(record.school_id)) {
          latestReadinessPerSchool.set(record.school_id, {
            status: record.status,
            reason: record.reason,
            checklist_items: record.checklist_items,
            created_at: record.created_at
          })
          processedSchools.add(record.school_id)
        }
      })
    }

    // Create a map of latest report dates per school
    const latestReportPerSchool = new Map<string, string>()
    if (latestReports) {
      const processedReports = new Set<string>()
      latestReports.forEach(report => {
        if (!processedReports.has(report.school_id)) {
          latestReportPerSchool.set(report.school_id, report.created_at)
          processedReports.add(report.school_id)
        }
      })
    }

    // Process schools and count statistics
    let readySchools = 0
    let notReadySchools = 0
    let noStatusSchools = 0

    const processedSchools: SchoolReadinessData[] = schools.map(school => {
      const readinessData = latestReadinessPerSchool.get(school.id)
      const latestReportDate = latestReportPerSchool.get(school.id)
      
      const status = readinessData?.status || null
      
      // Count for statistics
      if (status === 'ready') {
        readySchools++
      } else if (status === 'not_ready') {
        notReadySchools++
      } else {
        noStatusSchools++
      }

      return {
        id: school.id,
        name: school.name,
        readiness_status: status,
        readiness_reason: readinessData?.reason || null,
        readiness_checklist_items: readinessData?.checklist_items || null,
        readiness_updated_at: readinessData?.created_at || null,
        latest_report_date: latestReportDate || null
      }
    })

    const totalSchools = schools.length
    const readyPercentage = totalSchools > 0 ? Math.round((readySchools / totalSchools) * 100) : 0
    const notReadyPercentage = totalSchools > 0 ? Math.round((notReadySchools / totalSchools) * 100) : 0
    const noStatusPercentage = totalSchools > 0 ? Math.round((noStatusSchools / totalSchools) * 100) : 0

    return {
      success: true,
      data: {
        summary: {
          total_schools: totalSchools,
          ready_schools: readySchools,
          not_ready_schools: notReadySchools,
          no_status_schools: noStatusSchools,
          ready_percentage: readyPercentage,
          not_ready_percentage: notReadyPercentage,
          no_status_percentage: noStatusPercentage
        },
        schools: processedSchools
      }
    }

  } catch (error) {
    return { success: false, error: 'An unexpected error occurred while fetching regional school readiness data' }
  }
}
