"use server"

import { createServerSupabaseClient } from "@/lib/supabase"
import type { Notification } from "@/types"
import { getUserDetails } from "./users"

export interface CreateNotificationData {
  title: string
  message: string
  target_all_users?: boolean
  target_user_roles?: string[]
  target_school_levels?: string[]
  target_regions?: string[]
  target_user_ids?: string[]
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  notification_type?: 'general' | 'announcement' | 'deadline' | 'update' | 'alert'
  expires_at?: string | null
}

export async function createNotification(data: CreateNotificationData) {
  try {
    const { user, role, error: authError } = await getUserDetails()

    if (authError || !user || role !== "Admin") {
      return { error: "Unauthorized. Only admins can create notifications." }
    }

    const supabase = createServerSupabaseClient()

    // Validate that at least one targeting option is specified
    if (!data.target_all_users && 
        (!data.target_user_roles?.length) && 
        (!data.target_school_levels?.length) && 
        (!data.target_regions?.length) && 
        (!data.target_user_ids?.length)) {
      return { error: "At least one targeting option must be specified." }
    }

    const { data: notification, error } = await supabase
      .from("hmr_notifications")
      .insert({
        title: data.title,
        message: data.message,
        created_by: user.id,
        target_all_users: data.target_all_users || false,
        target_user_roles: data.target_user_roles || null,
        target_school_levels: data.target_school_levels || null,
        target_regions: data.target_regions || null,
        target_user_ids: data.target_user_ids || null,
        priority: data.priority || 'normal',
        notification_type: data.notification_type || 'general',
        expires_at: data.expires_at || null,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating notification:", error)
      return { error: "Failed to create notification." }
    }

    return { notification }
  } catch (error) {
    console.error("Error in createNotification:", error)
    return { error: "An unexpected error occurred." }
  }
}

export async function getUserNotifications(page: number = 1, limit: number = 20) {
  try {
    const { user, error: authError } = await getUserDetails()

    if (authError || !user) {
      return { error: "Unauthorized" }
    }

    const supabase = createServerSupabaseClient()
    const offset = (page - 1) * limit

    // Get user details for targeting
    const { data: userData, error: userError } = await supabase
      .from('hmr_users')
      .select('id, role, school_id, region')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      console.error('Error fetching user data:', userError)
      return { error: 'Failed to fetch user data' }
    }

    // Get user role name
    let userRole = null
    if (userData.role) {
      const { data: roleData } = await supabase
        .from('hmr_user_roles')
        .select('name')
        .eq('id', userData.role)
        .single()
      userRole = roleData?.name
    }

    // Get user school level/grade
    let userSchoolLevel = null
    if (userData.school_id) {
      const { data: schoolData } = await supabase
        .from('sms_schools')
        .select(`
          school_level_id,
          sms_school_levels!school_level_id(name)
        `)
        .eq('id', userData.school_id)
        .single()
      
      const schoolLevelData = schoolData?.sms_school_levels as any
      userSchoolLevel = Array.isArray(schoolLevelData) ? schoolLevelData[0]?.name : schoolLevelData?.name
    }

    // Get user region name  
    let userRegion = null
    if (userData.region) {
      const { data: regionData } = await supabase
        .from('sms_regions')
        .select('name')
        .eq('id', userData.region)
        .single()
      userRegion = regionData?.name
    }

    // Get all active notifications
    const { data: allNotifications, error } = await supabase
      .from('hmr_notifications')
      .select(`
        id,
        title,
        message,
        priority,
        notification_type,
        created_at,
        expires_at,
        target_all_users,
        target_user_roles,
        target_school_levels,
        target_regions,
        target_user_ids,
        hmr_users!hmr_notifications_created_by_fkey(
          id,
          name,
          email
        )
      `)
      .eq('is_active', true)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching notifications:', error)
      return { error: 'Failed to fetch notifications' }
    }

    // Filter notifications based on targeting rules
    const targetedNotifications = allNotifications?.filter(notification => {
      // If targeting all users
      if (notification.target_all_users) {
        return true
      }

      // If targeting specific user IDs
      if (notification.target_user_ids?.includes(user.id)) {
        return true
      }

      // For other targeting criteria, ALL specified criteria must match (AND logic)
      let matchesRole = true
      let matchesSchoolLevel = true  
      let matchesRegion = true

      // Check role targeting - if specified, user must match
      if (notification.target_user_roles && notification.target_user_roles.length > 0) {
        matchesRole = userRole ? notification.target_user_roles.includes(userRole) : false
      }

      // Check school level targeting - if specified, user must match
      if (notification.target_school_levels && notification.target_school_levels.length > 0) {
        matchesSchoolLevel = userSchoolLevel ? notification.target_school_levels.includes(userSchoolLevel) : false
      }

      // Check region targeting - if specified, user must match
      if (notification.target_regions && notification.target_regions.length > 0) {
        matchesRegion = userRegion ? notification.target_regions.includes(userRegion) : false
      }

      // User must match ALL specified criteria
      return matchesRole && matchesSchoolLevel && matchesRegion
    }) || []

    // Apply pagination to filtered results
    const paginatedNotifications = targetedNotifications.slice(offset, offset + limit)

    return { notifications: paginatedNotifications }
  } catch (error) {
    console.error("Error in getUserNotifications:", error)
    return { error: "An unexpected error occurred." }
  }
}

// Admin-only actions
export async function getAllNotifications(page: number = 1, limit: number = 20) {
  try {
    const { user, role, error: authError } = await getUserDetails()

    if (authError || !user || role !== "Admin") {
      return { error: "Unauthorized. Only admins can view all notifications." }
    }

    const supabase = createServerSupabaseClient()
    const offset = (page - 1) * limit

    const { data: notifications, error } = await supabase
      .from("hmr_notifications")
      .select(`
        *,
        hmr_users!hmr_notifications_created_by_fkey(
          id,
          name,
          email
        )
      `)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error("Error fetching all notifications:", error)
      return { error: "Failed to fetch notifications." }
    }

    return { notifications }
  } catch (error) {
    console.error("Error in getAllNotifications:", error)
    return { error: "An unexpected error occurred." }
  }
}

export async function deleteNotification(notificationId: string) {
  try {
    const { user, role, error: authError } = await getUserDetails()

    if (authError || !user || role !== "Admin") {
      return { error: "Unauthorized. Only admins can delete notifications." }
    }

    const supabase = createServerSupabaseClient()

    const { error } = await supabase
      .from("hmr_notifications")
      .update({ is_active: false })
      .eq("id", notificationId)

    if (error) {
      console.error("Error deleting notification:", error)
      return { error: "Failed to delete notification." }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in deleteNotification:", error)
    return { error: "An unexpected error occurred." }
  }
}

// Helper function to get available targeting options
export async function getNotificationTargetingOptions() {
  try {
    const { user, role, error: authError } = await getUserDetails()

    if (authError || !user || role !== "Admin") {
      return { error: "Unauthorized. Only admins can access targeting options." }
    }

    const supabase = createServerSupabaseClient()

    // Get user roles
    const { data: roles, error: rolesError } = await supabase
      .from("hmr_user_roles")
      .select("name")
      .order("name")

    // Get school levels
    const { data: schoolLevels, error: schoolLevelsError } = await supabase
      .from("sms_school_levels")
      .select("name")
      .order("name")

    // Get regions
    const { data: regions, error: regionsError } = await supabase
      .from("sms_regions")
      .select("name")
      .order("name")

    if (rolesError || schoolLevelsError || regionsError) {
      console.error("Error fetching targeting options:", { rolesError, schoolLevelsError, regionsError })
      return { error: "Failed to fetch targeting options." }
    }

    const result = {
      roles: roles?.map(r => r.name).filter(Boolean) || [],
      schoolLevels: schoolLevels?.map(s => s.name).filter(Boolean) || [],
      regions: regions?.map(r => r.name).filter(Boolean) || []
    }

    // Add some fallback data if tables are empty (for testing)
    if (result.roles.length === 0) {
      result.roles = ["Admin", "Head Teacher", "Regional Officer", "Education Official"]
    }
    if (result.schoolLevels.length === 0) {
      result.schoolLevels = ["Primary", "Secondary", "Nursery"]
    }
    if (result.regions.length === 0) {
      result.regions = ["Central Region", "Northern Region", "Eastern Region", "Western Region"]
    }

    return result
  } catch (error) {
    console.error("Error in getNotificationTargetingOptions:", error)
    return { error: "An unexpected error occurred." }
  }
}

export async function restoreNotification(notificationId: string) {
  try {
    const { user, role, error: authError } = await getUserDetails()

    if (authError || !user || role !== "Admin") {
      return { error: "Unauthorized. Only admins can restore notifications." }
    }

    const supabase = createServerSupabaseClient()

    const { error } = await supabase
      .from("hmr_notifications")
      .update({ 
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq("id", notificationId)

    if (error) {
      console.error("Database error restoring notification:", error)
      return { error: "Failed to restore notification." }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in restoreNotification:", error)
    return { error: "An unexpected error occurred." }
  }
}

export async function permanentDeleteNotification(notificationId: string) {
  try {
    const { user, role, error: authError } = await getUserDetails()

    if (authError || !user || role !== "Admin") {
      return { error: "Unauthorized. Only admins can permanently delete notifications." }
    }

    const supabase = createServerSupabaseClient()

    const { error } = await supabase
      .from("hmr_notifications")
      .delete()
      .eq("id", notificationId)

    if (error) {
      console.error("Database error permanently deleting notification:", error)
      return { error: "Failed to permanently delete notification." }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in permanentDeleteNotification:", error)
    return { error: "An unexpected error occurred." }
  }
}