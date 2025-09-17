"use server"

import { cookies } from "next/headers"
import { createServerSupabaseClient, createServiceRoleSupabaseClient } from "@/lib/supabase"
import { getUser } from "./auth"

interface SchoolReadinessData {
  status: "ready" | "not_ready"
  checklist: Record<string, boolean>
  not_ready_reason?: string | null
}

export async function getSchoolReadiness() {
  try {
    const user = await getUser()
    if (!user) {
      return { error: "User not authenticated." }
    }

    if (user.role !== "Head Teacher") {
      return { error: "Only Head Teachers can access school readiness data." }
    }

    if (!user.school_id) {
      return { error: "No school associated with user." }
    }

    const supabase = createServiceRoleSupabaseClient()

    const { data: readiness, error } = await supabase
      .from("hmr_school_readiness")
      .select("*")
      .eq("school_id", user.school_id)
      .single()

    if (error && error.code !== "PGRST116") {
      return { error: "Failed to load school readiness data." }
    }

    if (!readiness) {
      // Return null when no data exists - let component handle default state
      return {
        success: false,
        data: null,
        error: "No status submitted yet"
      }
    }

    return {
      success: true,
      data: {
        status: readiness.status,
        checklist: readiness.checklist_items || {},
        not_ready_reason: readiness.reason,
      },
    }
  } catch (error) {
    return { error: "An unexpected error occurred." }
  }
}

export async function updateSchoolReadiness(data: SchoolReadinessData) {
  try {
    const user = await getUser()
    if (!user) {
      return { error: "User not authenticated." }
    }

    if (user.role !== "Head Teacher") {
      return { error: "Only Head Teachers can update school readiness data." }
    }

    if (!user.school_id) {
      return { error: "No school associated with user." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Check if record already exists
    const { data: existingRecord, error: selectError } = await supabase
      .from("hmr_school_readiness")
      .select("id")
      .eq("school_id", user.school_id)
      .single()

    let error
    if (existingRecord) {
      // Update existing record
      const updateData = {
        status: data.status,
        checklist_items: data.checklist,
        reason: data.not_ready_reason,
        updated_at: new Date().toISOString(),
      }
      
      const result = await supabase
        .from("hmr_school_readiness")
        .update(updateData)
        .eq("school_id", user.school_id)
        
      error = result.error
    } else {
      // Insert new record
      const insertData = {
        school_id: user.school_id,
        status: data.status,
        checklist_items: data.checklist,
        reason: data.not_ready_reason,
      }
      
      const result = await supabase
        .from("hmr_school_readiness")
        .insert(insertData)
        
      error = result.error
    }

    if (error) {
      return { error: "Failed to update school readiness data." }
    }

    return { success: true }
  } catch (error) {
    return { error: "An unexpected error occurred." }
  }
}
