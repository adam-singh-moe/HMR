"use server"

import { createServiceRoleSupabaseClient } from "@/lib/supabase"
import { getUser } from "./auth"
import { revalidatePath } from "next/cache"

export async function getFeatureRequests(filters?: {
  status?: string
  category?: string
  sortBy?: 'recent' | 'popular' | 'oldest'
}) {
  try {
    const user = await getUser()
    if (!user) {
      return { requests: [], error: "Unauthorized access." }
    }

    const supabase = createServiceRoleSupabaseClient()

    let query = supabase
      .from("hmr_feature_requests")
      .select(`
        *,
        creator:created_by (
          id,
          name,
          email,
          hmr_user_roles (
            name
          )
        ),
        reviewer:reviewed_by (
          id,
          name,
          hmr_user_roles (
            name
          )
        ),
        hmr_feature_request_upvotes (
          user_id
        ),
        hmr_feature_request_comments (
          id
        )
      `)
      .eq("is_deleted", false)

    // Apply filters
    if (filters?.status) {
      query = query.eq("status", filters.status)
    }

    if (filters?.category) {
      query = query.eq("category", filters.category)
    }

    // Apply sorting
    if (filters?.sortBy === 'popular') {
      query = query.order("upvote_count", { ascending: false })
    } else if (filters?.sortBy === 'oldest') {
      query = query.order("created_at", { ascending: true })
    } else {
      query = query.order("created_at", { ascending: false })
    }

    const { data: requests, error } = await query

    if (error) {
      console.error("Error fetching feature requests:", error)
      return { requests: [], error: "Failed to fetch feature requests." }
    }

    // Transform data
    const transformedRequests = requests?.map((request) => ({
      ...request,
      creator_name: (request.creator as any)?.name || "Unknown",
      creator_role: (request.creator as any)?.hmr_user_roles?.name || "Unknown",
      reviewer_name: (request.reviewer as any)?.name || null,
      reviewer_role: (request.reviewer as any)?.hmr_user_roles?.name || null,
      has_upvoted: (request.hmr_feature_request_upvotes as any[])?.some(
        (upvote) => upvote.user_id === user.id
      ),
      comment_count: (request.hmr_feature_request_comments as any[])?.length || 0,
    })) || []

    return { requests: transformedRequests, error: null }
  } catch (error) {
    console.error("Error in getFeatureRequests:", error)
    return { requests: [], error: "An unexpected error occurred." }
  }
}

export async function createFeatureRequest(formData: FormData) {
  try {
    const user = await getUser()
    if (!user) {
      return { success: false, error: "Unauthorized access." }
    }

    // Check if user is Regional Officer or Education Official
    if (user.role !== "Regional Officer" && user.role !== "Education Official") {
      return { 
        success: false, 
        error: "Only Regional Officers and Education Officials can create feature requests." 
      }
    }

    const title = formData.get("title") as string
    const description = formData.get("description") as string
    const category = formData.get("category") as string

    if (!title || !description || !category) {
      return { success: false, error: "Title, description, and category are required." }
    }

    const supabase = createServiceRoleSupabaseClient()

    const { error } = await supabase.from("hmr_feature_requests").insert({
      title,
      description,
      category,
      created_by: user.id,
      status: "pending",
    })

    if (error) {
      console.error("Error creating feature request:", error)
      return { success: false, error: "Failed to create feature request." }
    }

    revalidatePath("/dashboard/feature-requests")
    return { success: true, error: null }
  } catch (error) {
    console.error("Error in createFeatureRequest:", error)
    return { success: false, error: "An unexpected error occurred." }
  }
}

export async function upvoteFeatureRequest(requestId: string) {
  try {
    const user = await getUser()
    if (!user) {
      return { success: false, error: "Unauthorized access." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Check if already upvoted
    const { data: existingUpvote } = await supabase
      .from("hmr_feature_request_upvotes")
      .select("id")
      .eq("feature_request_id", requestId)
      .eq("user_id", user.id)
      .single()

    if (existingUpvote) {
      // Remove upvote
      const { error } = await supabase
        .from("hmr_feature_request_upvotes")
        .delete()
        .eq("feature_request_id", requestId)
        .eq("user_id", user.id)

      if (error) {
        console.error("Error removing upvote:", error)
        return { success: false, error: "Failed to remove upvote." }
      }

      revalidatePath("/dashboard/feature-requests")
      return { success: true, upvoted: false }
    } else {
      // Add upvote
      const { error } = await supabase
        .from("hmr_feature_request_upvotes")
        .insert({
          feature_request_id: requestId,
          user_id: user.id,
        })

      if (error) {
        console.error("Error adding upvote:", error)
        return { success: false, error: "Failed to add upvote." }
      }

      revalidatePath("/dashboard/feature-requests")
      return { success: true, upvoted: true }
    }
  } catch (error) {
    console.error("Error in upvoteFeatureRequest:", error)
    return { success: false, error: "An unexpected error occurred." }
  }
}

export async function addFeatureRequestComment(requestId: string, comment: string) {
  try {
    const user = await getUser()
    if (!user) {
      return { success: false, error: "Unauthorized access." }
    }

    if (!comment || comment.trim() === "") {
      return { success: false, error: "Comment cannot be empty." }
    }

    const supabase = createServiceRoleSupabaseClient()

    const { error } = await supabase
      .from("hmr_feature_request_comments")
      .insert({
        feature_request_id: requestId,
        user_id: user.id,
        comment: comment.trim(),
      })

    if (error) {
      console.error("Error adding comment:", error)
      return { success: false, error: "Failed to add comment." }
    }

    revalidatePath("/dashboard/feature-requests")
    return { success: true, error: null }
  } catch (error) {
    console.error("Error in addFeatureRequestComment:", error)
    return { success: false, error: "An unexpected error occurred." }
  }
}

export async function getFeatureRequestComments(requestId: string) {
  try {
    const user = await getUser()
    if (!user) {
      return { comments: [], error: "Unauthorized access." }
    }

    const supabase = createServiceRoleSupabaseClient()

    const { data: comments, error } = await supabase
      .from("hmr_feature_request_comments")
      .select(`
        *,
        user:user_id (
          id,
          name,
          hmr_user_roles (
            name
          )
        )
      `)
      .eq("feature_request_id", requestId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching comments:", error)
      return { comments: [], error: "Failed to fetch comments." }
    }

    const transformedComments = comments?.map((comment) => ({
      ...comment,
      user_name: (comment.user as any)?.name || "Unknown",
      user_role: (comment.user as any)?.hmr_user_roles?.name || "Unknown",
    })) || []

    return { comments: transformedComments, error: null }
  } catch (error) {
    console.error("Error in getFeatureRequestComments:", error)
    return { comments: [], error: "An unexpected error occurred." }
  }
}

export async function updateFeatureRequestStatus(
  requestId: string,
  status: string,
  adminComment?: string
) {
  try {
    const user = await getUser()
    if (!user) {
      return { success: false, error: "Unauthorized access." }
    }

    // Check if user is Admin
    if (user.role !== "Admin" && user.role !== "Super Admin") {
      return { success: false, error: "Only admins can update request status." }
    }

    const supabase = createServiceRoleSupabaseClient()

    const updateData: any = {
      status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    }

    // Always update admin_comment, even if it's empty
    if (adminComment !== undefined) {
      updateData.admin_comment = adminComment
    }

    console.log('Updating feature request:', requestId, 'with data:', updateData)

    const { error } = await supabase
      .from("hmr_feature_requests")
      .update(updateData)
      .eq("id", requestId)

    if (error) {
      console.error("Error updating feature request status:", error)
      return { success: false, error: "Failed to update request status." }
    }

    console.log('Feature request updated successfully')

    revalidatePath("/dashboard/feature-requests")
    revalidatePath("/dashboard/admin/feature-requests")
    return { success: true, error: null }
  } catch (error) {
    console.error("Error in updateFeatureRequestStatus:", error)
    return { success: false, error: "An unexpected error occurred." }
  }
}

export async function deleteFeatureRequest(requestId: string) {
  try {
    const user = await getUser()
    if (!user) {
      return { success: false, error: "Unauthorized access." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Check if user is the creator or an admin
    const { data: request } = await supabase
      .from("hmr_feature_requests")
      .select("created_by")
      .eq("id", requestId)
      .single()

    if (!request) {
      return { success: false, error: "Feature request not found." }
    }

    const isCreator = request.created_by === user.id
    const isAdmin = user.role === "Admin" || user.role === "Super Admin"

    if (!isCreator && !isAdmin) {
      return { 
        success: false, 
        error: "You can only delete your own feature requests." 
      }
    }

    const { error } = await supabase
      .from("hmr_feature_requests")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
      })
      .eq("id", requestId)

    if (error) {
      console.error("Error deleting feature request:", error)
      return { success: false, error: "Failed to delete feature request." }
    }

    revalidatePath("/dashboard/feature-requests")
    return { success: true, error: null }
  } catch (error) {
    console.error("Error in deleteFeatureRequest:", error)
    return { success: false, error: "An unexpected error occurred." }
  }
}

export async function getFeatureRequestById(requestId: string) {
  try {
    const user = await getUser()
    if (!user) {
      return { request: null, error: "Unauthorized access." }
    }

    const supabase = createServiceRoleSupabaseClient()

    const { data: request, error } = await supabase
      .from("hmr_feature_requests")
      .select(`
        *,
        creator:created_by (
          id,
          name,
          email,
          hmr_user_roles (
            name
          )
        ),
        reviewer:reviewed_by (
          id,
          name,
          hmr_user_roles (
            name
          )
        ),
        hmr_feature_request_upvotes (
          user_id
        )
      `)
      .eq("id", requestId)
      .eq("is_deleted", false)
      .single()

    if (error) {
      console.error("Error fetching feature request:", error)
      return { request: null, error: "Failed to fetch feature request." }
    }

    const transformedRequest = {
      ...request,
      creator_name: (request.creator as any)?.name || "Unknown",
      creator_role: (request.creator as any)?.hmr_user_roles?.name || "Unknown",
      reviewer_name: (request.reviewer as any)?.name || null,
      reviewer_role: (request.reviewer as any)?.hmr_user_roles?.name || null,
      has_upvoted: (request.hmr_feature_request_upvotes as any[])?.some(
        (upvote) => upvote.user_id === user.id
      ),
    }

    return { request: transformedRequest, error: null }
  } catch (error) {
    console.error("Error in getFeatureRequestById:", error)
    return { request: null, error: "An unexpected error occurred." }
  }
}

export async function getPendingFeatureRequestsCount() {
  try {
    const user = await getUser()
    if (!user) {
      return { count: 0, error: "Unauthorized access." }
    }

    const supabase = createServiceRoleSupabaseClient()

    const { count, error } = await supabase
      .from("hmr_feature_requests")
      .select("*", { count: "exact", head: true })
      .eq("is_deleted", false)
      .eq("status", "pending")

    if (error) {
      console.error("Error fetching pending count:", error)
      return { count: 0, error: "Failed to fetch count." }
    }

    return { count: count || 0, error: null }
  } catch (error) {
    console.error("Error in getPendingFeatureRequestsCount:", error)
    return { count: 0, error: "An unexpected error occurred." }
  }
}
