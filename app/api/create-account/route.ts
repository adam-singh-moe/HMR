import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"
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

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, role, region, school } = await request.json()

    // Validate email domain based on role
    if (role === "head_teacher") {
      if (!email.endsWith(HEAD_TEACHER_EMAIL_DOMAIN)) {
        return NextResponse.json({
          success: false,
          error: "Head Teacher email must end with @moe.edu.gy"
        }, { status: 400 })
      }
    } else {
      if (!email.endsWith(MOE_EMAIL_DOMAIN)) {
        return NextResponse.json({
          success: false,
          error: "Email must end with @moe.gov.gy"
        }, { status: 400 })
      }
    }

    if (!name || !email || !password || !role) {
      return NextResponse.json({
        success: false,
        error: "All required fields must be filled"
      }, { status: 400 })
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
      return NextResponse.json({
        success: false,
        error: "Registration failed. Please try again."
      }, { status: 500 })
    }

    if (existingUser) {
      return NextResponse.json({
        success: false,
        error: "User with this email already exists"
      }, { status: 400 })
    }

    // Get role UUID from hmr_user_roles table
    const roleName =
      role === "head_teacher"
        ? "Head Teacher"
        : role === "regional_officer"
          ? "Regional Officer"
          : "Education Official"

    const { data: roleData, error: roleError } = await supabase
      .from("hmr_user_roles")
      .select("id")
      .eq("name", roleName)
      .single()

    if (roleError || !roleData) {
      console.error("Error fetching role:", roleError)
      return NextResponse.json({
        success: false,
        error: "Invalid role selected"
      }, { status: 500 })
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
      return NextResponse.json({
        success: false,
        error: "Registration failed. Please try again."
      }, { status: 500 })
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

    return NextResponse.json({
      success: true,
      message: "Account created successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: roleName,
        needsVerification: roleName === "Education Official"
      }
    })

  } catch (error) {
    console.error("Account creation error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to create account. Please try again."
    }, { status: 500 })
  }
}
