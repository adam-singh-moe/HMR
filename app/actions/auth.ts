"use server"

import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase"
import { cookies } from "next/headers"
import bcrypt from "bcryptjs"

const MOE_EMAIL_DOMAIN = "@moe.gov.gy"
const HEAD_TEACHER_EMAIL_DOMAIN = "@moe.edu.gy"

// Simple UUID v4 generator that works in all environments
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c == "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export async function signUp(formData: FormData) {
  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const roleString = formData.get("role") as string
  const region = formData.get("region") as string | null
  const school = formData.get("school") as string | null

  // Validate email domain based on role
  if (roleString === "head_teacher") {
    if (!email.endsWith(HEAD_TEACHER_EMAIL_DOMAIN)) {
      return { error: "Head Teacher email must end with @moe.edu.gy" }
    }
  } else {
    if (!email.endsWith(MOE_EMAIL_DOMAIN)) {
      return { error: "Email must end with @moe.gov.gy" }
    }
  }

  if (!name || !email || !password || !roleString) {
    return { error: "All required fields must be filled" }
  }

  const supabase = createServerSupabaseClient()

  // Check if user already exists in hmr_users table
  const { data: existingUser, error: checkError } = await supabase
    .from("hmr_users")
    .select("email")
    .eq("email", email)
    .maybeSingle()

  if (checkError && checkError.code !== "PGRST116") {
    console.error("Error checking existing user:", checkError)
    return { error: "Registration failed. Please try again." }
  }

  if (existingUser) {
    return { error: "User with this email already exists" }
  }

  // Get role UUID from hmr_user_roles table
  const roleName =
    roleString === "head_teacher"
      ? "Head Teacher"
      : roleString === "regional_officer"
        ? "Regional Officer"
        : "Education Official"

  const { data: roleData, error: roleError } = await supabase
    .from("hmr_user_roles")
    .select("id")
    .eq("name", roleName)
    .single()

  if (roleError || !roleData) {
    console.error("Error fetching role:", roleError)
    return { error: "Invalid role selected" }
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12)

  // Generate a UUID for the user
  const userId = generateUUID()

  // Prepare user data with role UUID
  const userData: any = {
    id: userId,
    name,
    email,
    password: hashedPassword,
    role: roleData.id,
  }

  // Education Officials need admin verification
  if (roleName === "Education Official") {
    userData.is_verified = false
    userData.verification_requested_at = new Date().toISOString()
  }

  // Add region if provided (for regional officers)
  if (region) {
    userData.region = region
  }

  // Add school_id if provided (for head teachers)
  if (school) {
    userData.school_id = school
  }

  // Insert new user into hmr_users table with role relationship
  const { data: user, error: userInsertError } = await supabase
    .from("hmr_users")
    .insert(userData)
    .select(`
      id, 
      name, 
      email, 
      region, 
      school_id,
      is_verified,
      created_at,
      hmr_user_roles (
        id,
        name
      )
    `)
    .single()

  if (userInsertError) {
    console.error("Error inserting into hmr_users:", userInsertError)
    return { error: "Registration failed. Please try again." }
  }

  // Create notification for admins if Education Official
  if (roleName === "Education Official") {
    await supabase.from("notifications").insert({
      type: "user_verification_request",
      title: "New Education Official Registration",
      message: `${name} (${email}) has registered as an Education Official and requires verification.`,
      data: {
        user_id: userId,
        user_name: name,
        user_email: email,
        role: roleName,
      },
    })
  }

  // Redirect to auth page with appropriate success message
  if (roleName === "Education Official") {
    redirect("/auth?signup=success&verification=pending")
  } else {
    redirect("/auth?signup=success")
  }
}

export async function signIn(formData: FormData) {
  const supabase = createServerSupabaseClient()

  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!email || !password) {
    return { error: "Email and password are required" }
  }

  // Get user from hmr_users table with role relationship
  const { data: user, error } = await supabase
    .from("hmr_users")
    .select(`
      *,
      hmr_user_roles (
        id,
        name
      )
    `)
    .eq("email", email)
    .maybeSingle()

  if (error) {
    console.error("Database error:", error)
    return { error: "Invalid email or password" }
  }

  if (!user) {
    console.error("User not found for email:", email)
    return { error: "Invalid email or password" }
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.password)

  if (!isValidPassword) {
    return { error: "Invalid email or password" }
  }

  // Check if user is using default password
  if (password === "hnCf4MN") {
    return { 
      requirePasswordChange: true, 
      userEmail: email,
      userName: user.name,
      userId: user.id
    }
  }

  // Check if Education Official is verified
  if (user.hmr_user_roles?.name === "Education Official" && !user.is_verified) {
    return { error: "Your account is pending admin verification. Please contact an administrator." }
  }

  // Get additional user data separately to avoid join issues
  let regionName = null
  let schoolName = null

  if (user.region) {
    const { data: regionData } = await supabase.from("sms_regions").select("name").eq("id", user.region).single()
    regionName = regionData?.name || null
  }

  if (user.school_id) {
    const { data: schoolData } = await supabase.from("sms_schools").select("name").eq("id", user.school_id).single()
    schoolName = schoolData?.name || null
  }

  // Set user session in cookies (exclude password)
  const userSession = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.hmr_user_roles?.name || "Unknown",
    region: user.region,
    region_name: regionName,
    school_id: user.school_id,
    school_name: schoolName,
    is_verified: user.is_verified,
    created_at: user.created_at,
  }

  const cookieStore = await cookies()
  cookieStore.set("user_session", JSON.stringify(userSession), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })

  // Redirect directly to the appropriate dashboard based on role
  if (user.hmr_user_roles?.name === "Head Teacher") {
    redirect("/dashboard/head-teacher")
  } else if (user.hmr_user_roles?.name === "Regional Officer") {
    redirect("/dashboard/regional-officer")
  } else if (user.hmr_user_roles?.name === "Admin") {
    redirect("/dashboard/admin")
  } else if (user.hmr_user_roles?.name === "Education Official") {
    redirect("/dashboard/education-official")
  } else {
    redirect("/dashboard")
  }
}

export async function signOut() {
  const cookieStore = await cookies()
  cookieStore.delete("user_session")
  redirect("/auth")
}

export async function changeDefaultPassword(formData: FormData) {
  const userId = formData.get("userId") as string
  const newPassword = formData.get("newPassword") as string
  const confirmPassword = formData.get("confirmPassword") as string

  if (!userId || !newPassword || !confirmPassword) {
    return { error: "All fields are required" }
  }

  if (newPassword !== confirmPassword) {
    return { error: "Passwords do not match" }
  }

  if (newPassword.length < 8) {
    return { error: "Password must be at least 8 characters long" }
  }

  if (newPassword === "hnCf4MN") {
    return { error: "You cannot use the default password. Please choose a different password." }
  }

  const supabase = createServerSupabaseClient()

  // Hash the new password
  const hashedPassword = await bcrypt.hash(newPassword, 12)

  // Update the user's password
  const { error: updateError } = await supabase
    .from("hmr_users")
    .update({ password: hashedPassword })
    .eq("id", userId)

  if (updateError) {
    console.error("Password update error:", updateError)
    return { error: "Failed to update password. Please try again." }
  }

  // After successful password change, log the user in automatically
  const { data: user, error: fetchError } = await supabase
    .from("hmr_users")
    .select(`
      *,
      hmr_user_roles (
        id,
        name
      )
    `)
    .eq("id", userId)
    .single()

  if (fetchError || !user) {
    console.error("Failed to fetch user after password change:", fetchError)
    return { success: true } // Password was changed but couldn't auto-login
  }

  // Get additional user data
  let regionName = null
  let schoolName = null

  if (user.region) {
    const { data: regionData } = await supabase.from("sms_regions").select("name").eq("id", user.region).single()
    regionName = regionData?.name || null
  }

  if (user.school_id) {
    const { data: schoolData } = await supabase.from("sms_schools").select("name").eq("id", user.school_id).single()
    schoolName = schoolData?.name || null
  }

  // Set user session in cookies
  const userSession = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.hmr_user_roles?.name || "Unknown",
    region: user.region,
    region_name: regionName,
    school_id: user.school_id,
    school_name: schoolName,
    is_verified: user.is_verified,
    created_at: user.created_at,
  }

  const cookieStore = await cookies()
  cookieStore.set("user_session", JSON.stringify(userSession), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })

  return { 
    success: true, 
    autoLogin: true, 
    redirectTo: user.hmr_user_roles?.name === "Head Teacher" 
      ? "/dashboard/head-teacher"
      : user.hmr_user_roles?.name === "Regional Officer"
      ? "/dashboard/regional-officer" 
      : user.hmr_user_roles?.name === "Admin"
      ? "/dashboard/admin"
      : user.hmr_user_roles?.name === "Education Official"
      ? "/dashboard/education-official"
      : "/dashboard"
  }
}

export async function getUser() {
  const cookieStore = await cookies()
  const userSession = cookieStore.get("user_session")

  if (!userSession) {
    return null
  }

  try {
    return JSON.parse(userSession.value)
  } catch {
    return null
  }
}
