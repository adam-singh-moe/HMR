'use server'

import { getUser } from './auth'
import { createServiceRoleSupabaseClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export interface AccessToken {
  id: string
  user_id: string
  token: string
  created_by: string
  created_at: string
  expires_at: string
  is_used: boolean
  used_at?: string
}

// Generate access token for admin to impersonate user
export async function generateAccessToken(targetUserId: string) {
  try {
    const adminUser = await getUser()

    if (!adminUser || adminUser.role !== "Admin") {
      return { success: false, error: "Unauthorized access." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Check if target user exists
    const { data: targetUser, error: userError } = await supabase
      .from('hmr_users')
      .select('id, name, email')
      .eq('id', targetUserId)
      .single()

    if (userError || !targetUser) {
      return { success: false, error: "Target user not found." }
    }

    // Generate a unique token (32 characters)
    const token = generateSecureToken()
    
    // Set expiration to 24 hours from now
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    // Create access token record
    const { data: accessToken, error: tokenError } = await supabase
      .from('access_tokens')
      .insert({
        user_id: targetUserId,
        token: token,
        created_by: adminUser.id,
        expires_at: expiresAt.toISOString(),
        is_used: false
      })
      .select('*')
      .single()

    if (tokenError) {
      console.error('Error creating access token:', tokenError)
      return { success: false, error: "Failed to generate access token." }
    }

    return { 
      success: true, 
      token: accessToken.token,
      expiresAt: accessToken.expires_at,
      targetUser: {
        name: targetUser.name,
        email: targetUser.email
      }
    }
  } catch (error) {
    console.error('Error in generateAccessToken:', error)
    return { success: false, error: "An unexpected error occurred." }
  }
}

// Authenticate using access token
export async function authenticateWithToken(token: string) {
  try {
    const supabase = createServiceRoleSupabaseClient()

    // Find the token
    const { data: accessToken, error: tokenError } = await supabase
      .from('access_tokens')
      .select(`
        *,
        hmr_users (
          id,
          name,
          email,
          role_id,
          hmr_user_roles (
            name
          )
        )
      `)
      .eq('token', token)
      .eq('is_used', false)
      .single()

    if (tokenError || !accessToken) {
      return { success: false, error: "Invalid or expired access token." }
    }

    // Check if token has expired
    const now = new Date()
    const expiresAt = new Date(accessToken.expires_at)
    
    if (now > expiresAt) {
      return { success: false, error: "Access token has expired." }
    }

    // Mark token as used
    await supabase
      .from('access_tokens')
      .update({
        is_used: true,
        used_at: new Date().toISOString()
      })
      .eq('id', accessToken.id)

    const user = accessToken.hmr_users as any
    
    return { 
      success: true, 
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.hmr_user_roles?.name || 'Unknown'
      }
    }
  } catch (error) {
    console.error('Error in authenticateWithToken:', error)
    return { success: false, error: "An unexpected error occurred." }
  }
}

// Get all access tokens (for admin management)
export async function getAllAccessTokens() {
  try {
    const adminUser = await getUser()

    if (!adminUser || adminUser.role !== "Admin") {
      return { tokens: [], error: "Unauthorized access." }
    }

    const supabase = createServiceRoleSupabaseClient()

    const { data: tokens, error } = await supabase
      .from('access_tokens')
      .select(`
        *,
        hmr_users!access_tokens_user_id_fkey (
          name,
          email
        ),
        created_by_user:hmr_users!access_tokens_created_by_fkey (
          name
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching access tokens:', error)
      return { tokens: [], error: "Failed to fetch access tokens." }
    }

    return { tokens: tokens || [], error: null }
  } catch (error) {
    console.error('Error in getAllAccessTokens:', error)
    return { tokens: [], error: "An unexpected error occurred." }
  }
}

// Login with access token (redirects to appropriate dashboard)
export async function loginWithAccessToken(formData: FormData) {
  const token = formData.get('token') as string

  if (!token) {
    redirect('/auth?error=missing_token')
  }

  const result = await authenticateWithToken(token)

  if (!result.success || !result.user) {
    redirect(`/auth?error=${encodeURIComponent(result.error || 'Authentication failed')}`)
  }

  // TODO: Set session for the impersonated user
  // This would need to be implemented based on your authentication system
  // For now, we'll redirect to a success page
  
  // Determine the appropriate dashboard based on user role
  const dashboardUrl = getDashboardUrlForRole(result.user.role)
  
  redirect(`${dashboardUrl}?impersonated=true&original_user=${encodeURIComponent(result.user.name)}`)
}

// Helper function to generate secure token
function generateSecureToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Helper function to get dashboard URL based on role
function getDashboardUrlForRole(role: string): string {
  switch (role) {
    case 'Head Teacher':
      return '/dashboard/head-teacher'
    case 'Regional Officer':
      return '/dashboard/regional-officer'
    case 'Education Official':
      return '/dashboard/education-official'
    case 'Admin':
      return '/dashboard/admin'
    default:
      return '/dashboard/admin'
  }
}