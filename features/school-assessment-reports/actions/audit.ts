"use server"

import { createServiceRoleSupabaseClient } from "@/lib/supabase"
import type { AuditLogEntry, AuditLogEntryWithAdmin, AuditAction } from "../types"

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Maps database row to AuditLogEntry type
 */
function mapDbRowToAuditEntry(row: any): AuditLogEntry {
  return {
    id: row.id,
    reportId: row.report_id,
    adminId: row.admin_id,
    action: row.action as AuditAction,
    fieldChanged: row.field_changed,
    oldValue: row.old_value,
    newValue: row.new_value,
    reason: row.reason,
    createdAt: row.created_at,
  }
}

/**
 * Maps database row to AuditLogEntryWithAdmin type
 */
function mapDbRowToAuditEntryWithAdmin(row: any): AuditLogEntryWithAdmin {
  return {
    ...mapDbRowToAuditEntry(row),
    admin: {
      id: row.hmr_users?.id || row.admin_id,
      name: row.hmr_users?.name || '',
      email: row.hmr_users?.email || '',
    },
  }
}

// ============================================================================
// AUDIT LOG ACTIONS
// ============================================================================

/**
 * Creates a new audit log entry
 * This is called internally when admins make changes to reports
 */
export async function createAuditEntry(
  reportId: string,
  adminId: string,
  action: AuditAction,
  fieldChanged: string,
  oldValue: unknown,
  newValue: unknown,
  reason: string
) {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    const { data, error } = await supabase
      .from('hmr_school_assessment_audit_log')
      .insert({
        report_id: reportId,
        admin_id: adminId,
        action,
        field_changed: fieldChanged,
        old_value: oldValue,
        new_value: newValue,
        reason,
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating audit entry:', error)
      return { entry: null, error: 'Failed to create audit entry.' }
    }
    
    return { entry: mapDbRowToAuditEntry(data), error: null }
  } catch (error) {
    console.error('Error in createAuditEntry:', error)
    return { entry: null, error: 'An unexpected error occurred.' }
  }
}

/**
 * Gets all audit log entries for a specific report
 */
export async function getReportAuditHistory(reportId: string) {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    const { data, error } = await supabase
      .from('hmr_school_assessment_audit_log')
      .select(`
        *,
        hmr_users(id, name, email)
      `)
      .eq('report_id', reportId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching audit history:', error)
      return { entries: [], error: 'Failed to fetch audit history.' }
    }
    
    return { 
      entries: data.map(mapDbRowToAuditEntryWithAdmin), 
      error: null 
    }
  } catch (error) {
    console.error('Error in getReportAuditHistory:', error)
    return { entries: [], error: 'An unexpected error occurred.' }
  }
}

/**
 * Gets all audit log entries made by a specific admin
 */
export async function getAdminAuditHistory(adminId: string) {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    const { data, error } = await supabase
      .from('hmr_school_assessment_audit_log')
      .select(`
        *,
        hmr_users(id, name, email),
        hmr_school_assessment_reports(
          id,
          sms_schools(name)
        )
      `)
      .eq('admin_id', adminId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching admin audit history:', error)
      return { entries: [], error: 'Failed to fetch audit history.' }
    }
    
    const entriesWithSchool = data.map(row => ({
      ...mapDbRowToAuditEntryWithAdmin(row),
      schoolName: (row as any).hmr_school_assessment_reports?.sms_schools?.name || '',
    }))
    
    return { entries: entriesWithSchool, error: null }
  } catch (error) {
    console.error('Error in getAdminAuditHistory:', error)
    return { entries: [], error: 'An unexpected error occurred.' }
  }
}

/**
 * Gets recent audit log entries (for admin dashboard overview)
 */
export async function getRecentAuditEntries(limit: number = 20) {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    const { data, error } = await supabase
      .from('hmr_school_assessment_audit_log')
      .select(`
        *,
        hmr_users(id, name, email),
        hmr_school_assessment_reports(
          id,
          sms_schools(name)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) {
      console.error('Error fetching recent audit entries:', error)
      return { entries: [], error: 'Failed to fetch audit entries.' }
    }
    
    const entriesWithSchool = data.map(row => ({
      ...mapDbRowToAuditEntryWithAdmin(row),
      schoolName: (row as any).hmr_school_assessment_reports?.sms_schools?.name || '',
    }))
    
    return { entries: entriesWithSchool, error: null }
  } catch (error) {
    console.error('Error in getRecentAuditEntries:', error)
    return { entries: [], error: 'An unexpected error occurred.' }
  }
}

/**
 * Gets audit statistics for a time period
 */
export async function getAuditStats(startDate?: string, endDate?: string) {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    let query = supabase
      .from('hmr_school_assessment_audit_log')
      .select('action, admin_id, created_at')
    
    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    if (endDate) {
      query = query.lte('created_at', endDate)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching audit stats:', error)
      return { stats: null, error: 'Failed to fetch audit stats.' }
    }
    
    // Calculate statistics
    const totalEntries = data.length
    const editCount = data.filter(e => e.action === 'edit').length
    const statusChangeCount = data.filter(e => e.action === 'status_change').length
    const scoreRecalcCount = data.filter(e => e.action === 'score_recalculation').length
    
    // Count unique admins
    const uniqueAdmins = new Set(data.map(e => e.admin_id)).size
    
    // Group by date for trend
    const byDate: Record<string, number> = {}
    data.forEach(entry => {
      const date = entry.created_at.split('T')[0]
      byDate[date] = (byDate[date] || 0) + 1
    })
    
    const stats = {
      totalEntries,
      editCount,
      statusChangeCount,
      scoreRecalcCount,
      uniqueAdmins,
      byDate,
    }
    
    return { stats, error: null }
  } catch (error) {
    console.error('Error in getAuditStats:', error)
    return { stats: null, error: 'An unexpected error occurred.' }
  }
}
