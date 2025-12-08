"use server"

import { createServiceRoleSupabaseClient } from "@/lib/supabase"
import { sign, verify } from "jsonwebtoken"
import { cookies } from "next/headers"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production"

// Generate access token for a user (30 minutes expiration)
export async function generateUserAccessToken(userId: string, adminId: string) {
  try {
    console.log('Server: Generating token for userId:', userId, 'adminId:', adminId)
    const supabase = createServiceRoleSupabaseClient()
    
    // Verify the user exists
    const { data: user, error: userError } = await supabase
      .from('hmr_users')
      .select('id, email, name, role')
      .eq('id', userId)
      .single()
    
    console.log('Server: User query result:', { user, userError })
    
    if (userError || !user) {
      console.error('Server: User not found:', userError)
      return { token: null, error: "User not found" }
    }
    
    // Create JWT payload
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      adminId: adminId,
      type: 'admin_access_token',
      exp: Math.floor(Date.now() / 1000) + (30 * 60) // 30 minutes from now
    }
    
    // Generate JWT token
    const token = sign(payload, JWT_SECRET)
    
    const result = { 
      token, 
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      user: { id: user.id, email: user.email, name: user.name },
      error: null
    }
    
    console.log('Server: Token generation successful:', { tokenExists: !!token, expiresAt: result.expiresAt })
    
    return result
  } catch (err) {
    console.error('Error generating access token:', err)
    return { token: null, error: "Failed to generate token", details: err }
    return { token: null, error: "Failed to generate access token" }
  }
}

// Verify access token
export async function verifyAccessToken(token: string) {
  try {
    const decoded = verify(token, JWT_SECRET) as any
    
    if (decoded.type !== 'admin_access_token') {
      return { valid: false, error: "Invalid token type" }
    }
    
    // Check if token is expired (though JWT will handle this automatically)
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false, error: "Token expired" }
    }
    
    const supabase = createServiceRoleSupabaseClient()
    
    // Verify the user still exists
    const { data: user, error: userError } = await supabase
      .from('hmr_users')
      .select(`
        id, 
        email, 
        name, 
        role, 
        school_id,
        region,
        hmr_user_roles!role (
          id,
          name
        )
      `)
      .eq('id', decoded.userId)
      .single()
    
    if (userError || !user) {
      return { valid: false, error: "User not found" }
    }
    
    // Extract role name from the join
    const roleName = user.hmr_user_roles?.name || 'Unknown Role'

    return { 
      valid: true, 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role, // Keep the UUID for internal use
        roleName: roleName, // Add the readable role name
        school_id: user.school_id,
        region: user.region
      },
      adminId: decoded.adminId,
      error: null 
    }
  } catch (err) {
    console.error('Error verifying access token:', err)
    return { valid: false, error: "Invalid or expired token" }
  }
}

// Authenticate using access token (sets session)
export async function authenticateWithToken(token: string) {
  try {
    const verification = await verifyAccessToken(token)
    
    if (!verification.valid || !verification.user) {
      return { success: false, error: verification.error }
    }

    // The role name is already fetched in verifyAccessToken
    const roleName = verification.user.roleName
    
    // Create user session data in the format your middleware expects
    const userSessionData = {
      id: verification.user.id,
      email: verification.user.email,
      name: verification.user.name,
      role: roleName, // Use the fetched role name
      school_id: verification.user.school_id,
      region: verification.user.region, // Add region for Regional Officers
      adminAccess: true,
      adminId: verification.adminId
    }
    
    // Set the user_session cookie that your middleware recognizes
    const cookieStore = await cookies()
    cookieStore.set('user_session', JSON.stringify(userSessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 60 // 30 minutes
    })
    
    // Determine redirect URL based on role
    let redirectUrl = '/dashboard'
    if (roleName === 'Head Teacher') {
      redirectUrl = '/dashboard/head-teacher'
    } else if (roleName === 'Regional Officer') {
      redirectUrl = '/dashboard/regional-officer'
    } else if (roleName === 'Admin') {
      redirectUrl = '/dashboard/admin'
    } else if (roleName === 'Education Official') {
      redirectUrl = '/dashboard/education-official'
    }

    return { 
      success: true, 
      user: verification.user,
      redirectUrl,
      error: null 
    }
  } catch (err) {
    console.error('Error authenticating with token:', err)
    return { success: false, error: "Authentication failed" }
  }
}

// Get current admin session info
export async function getAdminSessionInfo() {
  try {
    const cookieStore = cookies()
    const sessionToken = cookieStore.get('admin_session_token')?.value
    
    if (!sessionToken) {
      return { valid: false, error: "No admin session found" }
    }
    
    const decoded = verify(sessionToken, JWT_SECRET) as any
    
    if (decoded.type !== 'admin_session' || !decoded.adminAccess) {
      return { valid: false, error: "Invalid session" }
    }
    
    return {
      valid: true,
      user: {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        school_id: decoded.school_id
      },
      adminId: decoded.adminId,
      isAdminSession: true,
      error: null
    }
  } catch (err) {
    return { valid: false, error: "Invalid session" }
  }
}

// End admin session
export async function endAdminSession() {
  try {
    const cookieStore = cookies()
    cookieStore.delete('admin_session_token')
    
    return { success: true, error: null }
  } catch (err) {
    console.error('Error ending admin session:', err)
    return { success: false, error: "Failed to end session" }
  }
}