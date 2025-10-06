"use server"

import { createServiceRoleSupabaseClient } from "@/lib/supabase"
import { getUser } from "./auth"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"

// Browser-compatible UUID generator
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export async function getUserCounts() {
  try {
    const user = await getUser()

    if (!user || (user.role !== "Super Admin" && user.role !== "Admin")) {
      return { 
        totalUsers: 0, 
        headTeachers: 0, 
        regionalOfficers: 0, 
        educationOfficials: 0, 
        error: "Unauthorized access." 
      }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Get counts for each user role
    const { data: users, error } = await supabase
      .from("hmr_users")
      .select(`
        id,
        hmr_user_roles (
          name
        )
      `)
      .is("deleted_at", null)

    if (error) {
      console.error("Error fetching user counts:", error)
      return { 
        totalUsers: 0, 
        headTeachers: 0, 
        regionalOfficers: 0, 
        educationOfficials: 0, 
        error: "Failed to fetch user counts." 
      }
    }

    const counts = {
      "Head Teacher": 0,
      "Regional Officer": 0,
      "Education Official": 0,
      Admin: 0,
    }

    users?.forEach((user) => {
      const roleName = (user.hmr_user_roles as any)?.name
      if (roleName && roleName in counts) {
        counts[roleName as keyof typeof counts]++
      }
    })

    const totalUsers = Object.values(counts).reduce((sum, count) => sum + count, 0)

    return { 
      totalUsers,
      headTeachers: counts["Head Teacher"],
      regionalOfficers: counts["Regional Officer"],
      educationOfficials: counts["Education Official"],
      error: null 
    }
  } catch (error) {
    console.error("Error in getUserCounts:", error)
    return { 
      totalUsers: 0, 
      headTeachers: 0, 
      regionalOfficers: 0, 
      educationOfficials: 0, 
      error: "An unexpected error occurred." 
    }
  }
}

export async function getPendingVerifications() {
  try {
    const user = await getUser()

    if (!user || user.role !== "Admin") {
      return { verifications: [], error: "Unauthorized access." }
    }

    const supabase = createServiceRoleSupabaseClient()

    const { data: verifications, error } = await supabase
      .from("hmr_users")
      .select(`
        id,
        name,
        email,
        created_at,
        verification_requested_at,
        hmr_user_roles (
          name
        )
      `)
      .eq("hmr_user_roles.name", "Education Official")
      .eq("is_verified", false)
      .is("deleted_at", null)
      .order("verification_requested_at", { ascending: true })

    if (error) {
      console.error("Error fetching pending verifications:", error)
      return { verifications: [], error: "Failed to fetch pending verifications." }
    }

    // Transform the data to include role name directly
    const transformedVerifications = verifications?.map(verification => ({
      id: verification.id,
      name: verification.name,
      email: verification.email,
      role: (verification.hmr_user_roles as any)?.name || 'Unknown',
      created_at: verification.created_at,
      verification_requested_at: verification.verification_requested_at
    })) || []

    return { verifications: transformedVerifications, error: null }
  } catch (error) {
    console.error("Error in getPendingVerifications:", error)
    return { verifications: [], error: "An unexpected error occurred." }
  }
}

export async function verifyUser(userId: string) {
  try {
    const user = await getUser()

    if (!user || user.role !== "Admin") {
      return { success: false, error: "Unauthorized access." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // First, check if the user is an Education Official
    const { data: userData, error: checkError } = await supabase
      .from("hmr_users")
      .select(`
        id,
        is_verified,
        hmr_user_roles (
          name
        )
      `)
      .eq("id", userId)
      .single()

    if (checkError || !userData) {
      console.error("Error checking user:", checkError)
      return { success: false, error: "User not found." }
    }

    const roleName = (userData.hmr_user_roles as any)?.name
    if (roleName !== "Education Official") {
      return { success: false, error: "Only Education Officials can be verified." }
    }

    if (userData.is_verified) {
      return { success: false, error: "User is already verified." }
    }

    const { error } = await supabase
      .from("hmr_users")
      .update({
        is_verified: true,
        verified_at: new Date().toISOString(),
        verified_by: user.id,
      })
      .eq("id", userId)

    if (error) {
      console.error("Error verifying user:", error)
      return { success: false, error: "Failed to verify user." }
    }

    revalidatePath("/dashboard/admin/verifications")
    revalidatePath("/dashboard/admin")

    return { success: true, error: null }
  } catch (error) {
    console.error("Error in verifyUser:", error)
    return { success: false, error: "An unexpected error occurred." }
  }
}

export async function rejectUser(userId: string) {
  try {
    const user = await getUser()

    if (!user || user.role !== "Admin") {
      return { success: false, error: "Unauthorized access." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // First, check if the user is an Education Official
    const { data: userData, error: checkError } = await supabase
      .from("hmr_users")
      .select(`
        id,
        is_verified,
        hmr_user_roles (
          name
        )
      `)
      .eq("id", userId)
      .single()

    if (checkError || !userData) {
      console.error("Error checking user:", checkError)
      return { success: false, error: "User not found." }
    }

    const roleName = (userData.hmr_user_roles as any)?.name
    if (roleName !== "Education Official") {
      return { success: false, error: "Only Education Officials can be rejected." }
    }

    if (userData.is_verified) {
      return { success: false, error: "Cannot reject a verified user." }
    }

    const { error } = await supabase
      .from("hmr_users")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
      })
      .eq("id", userId)

    if (error) {
      console.error("Error rejecting user:", error)
      return { success: false, error: "Failed to reject user." }
    }

    revalidatePath("/dashboard/admin/verifications")
    revalidatePath("/dashboard/admin")

    return { success: true, error: null }
  } catch (error) {
    console.error("Error in rejectUser:", error)
    return { success: false, error: "An unexpected error occurred." }
  }
}

// Server action wrappers for form handling
export async function verifyUserAction(formData: FormData) {
  const userId = formData.get('userId') as string
  if (!userId) {
    return { success: false, error: "User ID is required." }
  }
  return await verifyUser(userId)
}

export async function rejectUserAction(formData: FormData) {
  const userId = formData.get('userId') as string
  if (!userId) {
    return { success: false, error: "User ID is required." }
  }
  return await rejectUser(userId)
}

export async function getUsers(page = 1, limit = 10, search = "") {
  try {
    const user = await getUser()

    if (!user || (user.role !== "Super Admin" && user.role !== "Admin")) {
      return { users: [], total: 0, error: "Unauthorized access." }
    }

    const supabase = createServiceRoleSupabaseClient()
    const offset = (page - 1) * limit

    let query = supabase
      .from("hmr_users")
      .select(`
        *,
        hmr_user_roles (
          name
        ),
        sms_schools (
          name
        ),
        sms_regions (
          name
        )
      `, { count: "exact" })
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data: users, error, count } = await query

    if (error) {
      console.error("Error fetching users:", error)
      return { users: [], total: 0, error: "Failed to fetch users." }
    }

    // Transform the data to include role name and school/region names
    const transformedUsers = users?.map(user => ({
      ...user,
      role: (user.hmr_user_roles as any)?.name || user.role || 'Unknown',
      school_name: (user.sms_schools as any)?.name || null,
      region_name: (user.sms_regions as any)?.name || null
    })) || []

    return { users: transformedUsers, total: count || 0, error: null }
  } catch (error) {
    console.error("Error in getUsers:", error)
    return { users: [], total: 0, error: "An unexpected error occurred." }
  }
}

export async function getUserById(userId: string) {
  try {
    const user = await getUser()

    if (!user || (user.role !== "Super Admin" && user.role !== "Admin")) {
      return null
    }

    const supabase = createServiceRoleSupabaseClient()

    const { data: userData, error } = await supabase
      .from("hmr_users")
      .select(`
        *,
        hmr_user_roles (
          id,
          name
        ),
        sms_schools (
          id,
          name
        ),
        sms_regions (
          id,
          name
        )
      `)
      .eq("id", userId)
      .is("deleted_at", null)
      .single()

    if (error) {
      console.error("Error fetching user by ID:", error)
      return null
    }

    if (!userData) {
      return null
    }

    // Transform the data to include role name
    return {
      ...userData,
      role: (userData.hmr_user_roles as any)?.name || userData.role || 'Unknown',
      role_id: (userData.hmr_user_roles as any)?.id || userData.role_id,
      school_name: (userData.sms_schools as any)?.name || null,
      region_name: (userData.sms_regions as any)?.name || null
    }
  } catch (error) {
    console.error("Error in getUserById:", error)
    return null
  }
}

export async function getSchoolById(schoolId: string) {
  try {
    const user = await getUser()

    if (!user || user.role !== "Admin") {
      return null
    }

    const supabase = createServiceRoleSupabaseClient()

    const { data: school, error } = await supabase
      .from("sms_schools")
      .select(`
        *,
        sms_regions (
          id,
          name
        ),
        sms_school_levels (
          id,
          name
        )
      `)
      .eq("id", schoolId)
      .is("deleted_at", null)
      .single()

    if (error) {
      console.error("Error fetching school by ID:", error)
      return null
    }

    return school
  } catch (error) {
    console.error("Error in getSchoolById:", error)
    return null
  }
}

export async function createUser(formData: FormData) {
  try {
    const user = await getUser()

    if (!user || user.role !== "Admin") {
      return { success: false, error: "Unauthorized access." }
    }

    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const roleId = formData.get("role_id") as string
    const schoolId = formData.get("school_id") as string
    const region = formData.get("region") as string

    if (!name || !email || !password || !roleId) {
      return { success: false, error: "Name, email, password, and role are required." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Check if user already exists in hmr_users table
    const { data: existingUser, error: checkError } = await supabase
      .from("hmr_users")
      .select("email")
      .eq("email", email)
      .maybeSingle()

    if (checkError && checkError.code !== "PGRST116") {
      console.error("Error checking existing user:", checkError)
      return { success: false, error: "User creation failed. Please try again." }
    }

    if (existingUser) {
      return { success: false, error: "User with this email already exists" }
    }

    // Hash password using bcrypt (same as signup)
    const hashedPassword = await bcrypt.hash(password, 12)

    // Generate a UUID for the user
    const userId = generateUUID()
    const now = new Date().toISOString()

    // Get role name to check if it's Education Official
    const { data: roleData } = await supabase
      .from("hmr_user_roles")
      .select("name")
      .eq("id", roleId)
      .single()

    const isEducationOfficial = roleData?.name === "Education Official"

    // Prepare user data (same structure as signup)
    const userData: any = {
      id: userId,
      name,
      email,
      password: hashedPassword,
      role: roleId,
      created_at: now,
      updated_at: now,
      is_verified: !isEducationOfficial,
      verified_at: !isEducationOfficial ? now : null,
      verified_by: !isEducationOfficial ? user.id : null,
      verification_requested_at: isEducationOfficial ? now : null,
    }

    // Add region if provided
    if (region) {
      userData.region = region
    }

    // Add school_id if provided
    if (schoolId) {
      userData.school_id = schoolId
    }

    // Insert new user into hmr_users table (same as signup)
    const { data: newUser, error: userInsertError } = await supabase
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
      return { success: false, error: `Failed to create user profile: ${userInsertError.message}` }
    }

    // Create notification for admins if Education Official (same as signup)
    if (isEducationOfficial) {
      await supabase.from("notifications").insert({
        type: "user_verification_request",
        title: "New Education Official Registration",
        message: `${name} (${email}) has been created as an Education Official and requires verification.`,
        data: {
          user_id: userId,
          user_name: name,
          user_email: email,
          role: roleData?.name,
        },
      })
    }

    revalidatePath("/dashboard/admin/users")
    revalidatePath("/dashboard/admin")

    return { success: true, error: null }
  } catch (error) {
    console.error("Error in createUser:", error)
    return { success: false, error: "An unexpected error occurred." }
  }
}

export async function updateUser(userId: string, formData: FormData) {
  try {
    const user = await getUser()

    if (!user || (user.role !== "Super Admin" && user.role !== "Admin")) {
      return { success: false, error: "Unauthorized access." }
    }

    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const roleId = formData.get("role_id") as string
    const schoolId = formData.get("school_id") as string
    const region = formData.get("region") as string

    if (!name || !email || !roleId) {
      return { success: false, error: "Name, email, and role are required." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Check if another user already has this email (if email is being changed)
    const { data: currentUser } = await supabase
      .from("hmr_users")
      .select("email")
      .eq("id", userId)
      .single()

    if (currentUser && currentUser.email !== email) {
      const { data: existingUser, error: checkError } = await supabase
        .from("hmr_users")
        .select("id")
        .eq("email", email)
        .neq("id", userId)
        .maybeSingle()

      if (checkError && checkError.code !== "PGRST116") {
        console.error("Error checking existing user:", checkError)
        return { success: false, error: "User update failed. Please try again." }
      }

      if (existingUser) {
        return { success: false, error: "Another user with this email already exists" }
      }
    }

    // Prepare update data
    const updateData: any = {
      name,
      email,
      role: roleId,
      school_id: schoolId || null,
      region: region || null,
      updated_at: new Date().toISOString(),
    }

    // Update password if provided (hash it with bcrypt)
    if (password && password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(password, 12)
      updateData.password = hashedPassword
    }

    // Update user profile
    const { error } = await supabase
      .from("hmr_users")
      .update(updateData)
      .eq("id", userId)
      .is("deleted_at", null)

    if (error) {
      console.error("Error updating user profile:", error)
      return { success: false, error: `Failed to update user profile: ${error.message}` }
    }

    revalidatePath("/dashboard/admin/users")
    revalidatePath(`/dashboard/admin/users/${userId}`)

    return { success: true, error: null }
  } catch (error) {
    console.error("Error in updateUser:", error)
    return { success: false, error: "An unexpected error occurred." }
  }
}

export async function deleteUser(userId: string) {
  try {
    const user = await getUser()

    if (!user || user.role !== "Admin") {
      return { success: false, error: "Unauthorized access." }
    }

    const supabase = createServiceRoleSupabaseClient()

    const { error } = await supabase
      .from("hmr_users")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
      })
      .eq("id", userId)

    if (error) {
      console.error("Error deleting user:", error)
      return { success: false, error: "Failed to delete user." }
    }

    revalidatePath("/dashboard/admin/users")

    return { success: true, error: null }
  } catch (error) {
    console.error("Error in deleteUser:", error)
    return { success: false, error: "An unexpected error occurred." }
  }
}

export async function getRoles() {
  try {
    const user = await getUser()

    if (!user || (user.role !== "Super Admin" && user.role !== "Admin")) {
      return []
    }

    const supabase = createServiceRoleSupabaseClient()

    const { data: roles, error } = await supabase
      .from("hmr_user_roles")
      .select("*")
      .is("deleted_at", null)
      .order("name", { ascending: true })

    if (error) {
      console.error("Error fetching roles:", error)
      return []
    }

    return roles || []
  } catch (error) {
    console.error("Error in getRoles:", error)
    return []
  }
}

export async function getSchools(
  page = 1, 
  limit = 10, 
  search = "", 
  regionId = "", 
  schoolLevelId = "", 
  sortBy = "created_at", 
  sortOrder = "desc"
) {
  try {
    const user = await getUser()

    if (!user || user.role !== "Admin") {
      return { schools: [], total: 0, error: "Unauthorized access." }
    }

    const supabase = createServiceRoleSupabaseClient()
    const offset = (page - 1) * limit

    let query = supabase
      .from("sms_schools")
      .select(
        `
        *,
        sms_regions (
          id,
          name
        ),
        sms_school_levels (
          id,
          name
        )
      `,
        { count: "exact" },
      )
      .is("deleted_at", null)

    // Apply filters
    if (search) {
      query = query.ilike("name", `%${search}%`)
    }

    if (regionId) {
      query = query.eq("region_id", regionId)
    }

    if (schoolLevelId) {
      query = query.eq("school_level_id", schoolLevelId)
    }

    // Apply sorting
    const validSortColumns = ["name", "created_at", "updated_at"]
    const column = validSortColumns.includes(sortBy) ? sortBy : "created_at"
    const order = sortOrder === "asc" ? { ascending: true } : { ascending: false }
    
    query = query.order(column, order)

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: schools, error, count } = await query

    if (error) {
      console.error("Error fetching schools:", error)
      return { schools: [], total: 0, error: "Failed to fetch schools." }
    }

    return { schools: schools || [], total: count || 0, error: null }
  } catch (error) {
    console.error("Error in getSchools:", error)
    return { schools: [], total: 0, error: "An unexpected error occurred." }
  }
}

export async function getSchoolLevels() {
  try {
    const user = await getUser()

    if (!user || user.role !== "Admin") {
      return []
    }

    const supabase = createServiceRoleSupabaseClient()

    // First try with deleted_at column
    let { data: schoolLevels, error } = await supabase
      .from("sms_school_levels")
      .select("*")
      .is("deleted_at", null)
      .order("name", { ascending: true })

    // If deleted_at column doesn't exist, try without it
    if (error && error.code === '42703' && error.message?.includes('deleted_at does not exist')) {
      const result = await supabase
        .from("sms_school_levels")
        .select("*")
        .order("name", { ascending: true })
      
      schoolLevels = result.data
      error = result.error
    }

    if (error) {
      console.error("Error fetching school levels:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      // If the table doesn't exist, return default school levels
      if (error.code === 'PGRST106' || error.message?.includes('does not exist')) {
        return [
          { id: '1', name: 'Primary' },
          { id: '2', name: 'Secondary' },
          { id: '3', name: 'Nursery' },
          { id: '4', name: 'Special' },
          { id: '5', name: 'Technical' }
        ]
      }
      return []
    }

    return schoolLevels || []
  } catch (error) {
    console.error("Error in getSchoolLevels:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error: error
    })
    // Return default school levels as fallback
    return [
      { id: '1', name: 'Primary' },
      { id: '2', name: 'Secondary' },
      { id: '3', name: 'Nursery' },
      { id: '4', name: 'Special' },
      { id: '5', name: 'Technical' }
    ]
  }
}

export async function createSchool(formData: FormData) {
  try {
    const user = await getUser()

    if (!user || user.role !== "Admin") {
      return { success: false, error: "Unauthorized access." }
    }

    const name = formData.get("name") as string
    const regionId = formData.get("region_id") as string
    const schoolLevelId = formData.get("school_level_id") as string
    const code = formData.get("code") as string
    const grade = formData.get("grade") as string

    if (!name || !regionId || !schoolLevelId) {
      return { success: false, error: "Name, region, and school level are required." }
    }

    const supabase = createServiceRoleSupabaseClient()

    const { error } = await supabase.from("sms_schools").insert({
      name,
      region_id: regionId,
      school_level_id: schoolLevelId,
      code: code || null,
      grade: grade || null,
    })

    if (error) {
      console.error("Error creating school:", error)
      return { success: false, error: "Failed to create school." }
    }

    revalidatePath("/dashboard/admin/schools")

    return { success: true, error: null }
  } catch (error) {
    console.error("Error in createSchool:", error)
    return { success: false, error: "An unexpected error occurred." }
  }
}

export async function updateSchool(schoolId: string, formData: FormData) {
  try {
    const user = await getUser()

    if (!user || user.role !== "Admin") {
      return { success: false, error: "Unauthorized access." }
    }

    const name = formData.get("name") as string
    const regionId = formData.get("region_id") as string
    const schoolLevelId = formData.get("school_level_id") as string
    const code = formData.get("code") as string
    const grade = formData.get("grade") as string

    if (!name || !regionId || !schoolLevelId) {
      return { success: false, error: "Name, region, and school level are required." }
    }

    const supabase = createServiceRoleSupabaseClient()

    const { error } = await supabase
      .from("sms_schools")
      .update({
        name,
        region_id: regionId,
        school_level_id: schoolLevelId,
        code: code || null,
        grade: grade || null,
      })
      .eq("id", schoolId)
      .is("deleted_at", null)

    if (error) {
      console.error("Error updating school:", error)
      return { success: false, error: "Failed to update school." }
    }

    revalidatePath("/dashboard/admin/schools")
    revalidatePath(`/dashboard/admin/schools/${schoolId}`)

    return { success: true, error: null }
  } catch (error) {
    console.error("Error in updateSchool:", error)
    return { success: false, error: "An unexpected error occurred." }
  }
}

export async function deleteSchool(schoolId: string) {
  try {
    const user = await getUser()

    if (!user || user.role !== "Admin") {
      return { success: false, error: "Unauthorized access." }
    }

    const supabase = createServiceRoleSupabaseClient()

    const { error } = await supabase
      .from("sms_schools")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
      })
      .eq("id", schoolId)

    if (error) {
      console.error("Error deleting school:", error)
      return { success: false, error: "Failed to delete school." }
    }

    revalidatePath("/dashboard/admin/schools")

    return { success: true, error: null }
  } catch (error) {
    console.error("Error in deleteSchool:", error)
    return { success: false, error: "An unexpected error occurred." }
  }
}

export async function getRegions(page = 1, limit = 10, search = "") {
  try {
    const user = await getUser()

    if (!user || (user.role !== "Super Admin" && user.role !== "Admin")) {
      return { regions: [], total: 0, error: "Unauthorized access." }
    }

    const supabase = createServiceRoleSupabaseClient()
    const offset = (page - 1) * limit

    let query = supabase
      .from("sms_regions")
      .select("*", { count: "exact" })
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (search) {
      query = query.ilike("name", `%${search}%`)
    }

    const { data: regions, error, count } = await query

    if (error) {
      console.error("Error fetching regions:", error)
      return { regions: [], total: 0, error: "Failed to fetch regions." }
    }

    return { regions: regions || [], total: count || 0, error: null }
  } catch (error) {
    console.error("Error in getRegions:", error)
    return { regions: [], total: 0, error: "An unexpected error occurred." }
  }
}

export async function getSchoolCount() {
  try {
    const user = await getUser()

    if (!user || user.role !== "Admin") {
      return 0
    }

    const supabase = createServiceRoleSupabaseClient()

    const { count, error } = await supabase
      .from("sms_schools")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)

    if (error) {
      console.error("Error fetching school count:", error)
      return 0
    }

    return count || 0
  } catch (error) {
    console.error("Error in getSchoolCount:", error)
    return 0
  }
}

export async function getRegionCount() {
  try {
    const user = await getUser()

    if (!user || user.role !== "Admin") {
      return 0
    }

    const supabase = createServiceRoleSupabaseClient()

    const { count, error } = await supabase
      .from("sms_regions")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)

    if (error) {
      console.error("Error fetching region count:", error)
      return 0
    }

    return count || 0
  } catch (error) {
    console.error("Error in getRegionCount:", error)
    return 0
  }
}

export async function getSchoolsWithRegions() {
  try {
    const user = await getUser()

    if (!user || user.role !== "Admin") {
      return { schools: [], error: "Unauthorized access." }
    }

    const supabase = createServiceRoleSupabaseClient()

    const { data: schools, error } = await supabase
      .from("sms_schools")
      .select(`
        id,
        name,
        region_id,
        created_at,
        sms_regions (
          id,
          name
        )
      `)
      .is("deleted_at", null)
      .order("name")

    if (error) {
      console.error("Error fetching schools with regions:", error)
      return { schools: [], error: "Failed to fetch schools." }
    }

    console.log(`getSchoolsWithRegions: Fetched ${schools?.length || 0} schools from database`)

    // Transform the data to flatten the region information
    const transformedSchools = schools?.map(school => ({
      id: school.id,
      name: school.name,
      created_at: school.created_at,
      region_name: (school.sms_regions as any)?.name || 'No Region'
    })) || []

    console.log(`getSchoolsWithRegions: Returning ${transformedSchools.length} transformed schools`)
    
    return { schools: transformedSchools, error: null }
  } catch (error) {
    console.error("Error in getSchoolsWithRegions:", error)
    return { schools: [], error: "An unexpected error occurred." }
  }
}

// Get user registration data by month for line chart
export async function getUserRegistrationData() {
  try {
    const user = await getUser()

    if (!user || user.role !== "Admin") {
      return { data: [], error: "Unauthorized access." }
    }

    const supabase = createServiceRoleSupabaseClient()

    const { data: users, error } = await supabase
      .from("hmr_users")
      .select(`
        created_at,
        hmr_user_roles (
          name
        )
      `)
      .is("deleted_at", null)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching user registration data:", error)
      return { data: [], error: "Failed to fetch registration data." }
    }

    // Group by month and role
    const monthlyData: Record<string, Record<string, number>> = {}
    
    users?.forEach((user) => {
      const date = new Date(user.created_at)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const roleName = (user.hmr_user_roles as any)?.name || 'Unknown'
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          'Head Teacher': 0,
          'Regional Officer': 0,
          'Education Official': 0,
          'Admin': 0
        }
      }
      
      if (monthlyData[monthKey][roleName] !== undefined) {
        monthlyData[monthKey][roleName]++
      }
    })

    // Convert to array format for charts
    const chartData = Object.entries(monthlyData).map(([month, roles]) => ({
      month,
      ...roles,
      total: Object.values(roles).reduce((sum, count) => sum + count, 0)
    }))

    return { data: chartData, error: null }
  } catch (error) {
    console.error("Error in getUserRegistrationData:", error)
    return { data: [], error: "An unexpected error occurred." }
  }
}

// Get schools by region for pie chart
export async function getSchoolsByRegion() {
  try {
    const user = await getUser()

    if (!user || user.role !== "Admin") {
      return { data: [], error: "Unauthorized access." }
    }

    const supabase = createServiceRoleSupabaseClient()

    const { data: regions, error } = await supabase
      .from("sms_regions")
      .select(`
        id,
        name,
        sms_schools!inner (
          id
        )
      `)
      .is("deleted_at", null)

    if (error) {
      console.error("Error fetching schools by region:", error)
      return { data: [], error: "Failed to fetch schools by region." }
    }

    // Transform data for pie chart
    const chartData = regions?.map(region => ({
      region: region.name,
      count: (region.sms_schools as any[])?.length || 0,
      fill: `hsl(${Math.random() * 360}, 70%, 60%)`
    })) || []

    return { data: chartData, error: null }
  } catch (error) {
    console.error("Error in getSchoolsByRegion:", error)
    return { data: [], error: "An unexpected error occurred." }
  }
}

// Get monthly report submissions for area chart
export async function getMonthlyReportData(year = new Date().getFullYear()) {
  try {
    const user = await getUser()

    if (!user || user.role !== "Admin") {
      return { data: [], error: "Unauthorized access." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Filter reports by year using the year column
    const { data: reports, error } = await supabase
      .from("hmr_report")
      .select(`
        created_at,
        status,
        year
      `)
      .eq("year", year)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching report data:", error)
      return { data: [], error: "Failed to fetch report data." }
    }

    // Initialize all 12 months with zero counts
    const monthlyData: Record<string, number> = {}
    for (let month = 1; month <= 12; month++) {
      const monthKey = `${year}-${String(month).padStart(2, '0')}`
      monthlyData[monthKey] = 0
    }

    // Count reports per month
    reports?.forEach((report) => {
      const date = new Date(report.created_at)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      if (monthlyData[monthKey] !== undefined) {
        monthlyData[monthKey]++
      }
    })

    // Convert to array format for charts with month names
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ]

    const chartData = Object.entries(monthlyData).map(([monthKey, count]) => {
      const monthIndex = parseInt(monthKey.split('-')[1]) - 1
      return {
        month: monthNames[monthIndex],
        monthKey,
        reports: count,
        year
      }
    })

    return { data: chartData, year, error: null }
  } catch (error) {
    console.error("Error in getMonthlyReportData:", error)
    return { data: [], error: "An unexpected error occurred." }
  }
}

// Get available years from reports for the year filter
export async function getAvailableReportYears() {
  try {
    const user = await getUser()

    if (!user || user.role !== "Admin") {
      return { years: [], error: "Unauthorized access." }
    }

    const supabase = createServiceRoleSupabaseClient()

    const { data: reports, error } = await supabase
      .from("hmr_report")
      .select("year")
      .order("year", { ascending: false })

    if (error) {
      console.error("Error fetching report years:", error)
      return { years: [], error: "Failed to fetch report years." }
    }

    // Extract unique years from reports
    const yearSet = new Set<number>()
    reports?.forEach((report) => {
      if (report.year) {
        yearSet.add(parseInt(report.year.toString()))
      }
    })

    // Convert to sorted array (newest first)
    const years = Array.from(yearSet).sort((a, b) => b - a)

    // If no years found, include current year (2025) as default
    if (years.length === 0) {
      years.push(2025)
    }

    return { years, error: null }
  } catch (error) {
    console.error("Error in getAvailableReportYears:", error)
    return { years: [2025], error: "An unexpected error occurred." }
  }
}

// Get missing months for a specific school
export async function getMissingMonthsForSchool(schoolId: string) {
  try {
    const user = await getUser()

    if (!user || user.role !== "Admin") {
      return { missingMonths: [], error: "Unauthorized access." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Get all reports submitted by this school in the current year
    const currentYear = new Date().getFullYear()
    const { data: reports, error } = await supabase
      .from("hmr_report")
      .select(`
        month,
        year,
        status
      `)
      .eq("school_id", schoolId)
      .eq("year", currentYear.toString()) // Convert year to string since it's stored as text
      .is("deleted_on", null) // Filter out soft-deleted reports
      .eq("status", "submitted") // Only count submitted reports as complete

    if (error) {
      console.error("Error fetching school reports:", error)
      return { missingMonths: [], error: "Failed to fetch school reports." }
    }

    // Debug logging
    console.log(`School ${schoolId} has ${reports?.length || 0} reports in ${currentYear}`)
    console.log('Reports found:', reports)

    // Get submitted months - convert text months to numbers
    const submittedMonths = new Set(reports?.map(report => parseInt(report.month)) || [])
    console.log('Submitted months:', Array.from(submittedMonths))

    // Generate list of missing months (from January to current month - 1)
    // Since it's October 1st, we should check Jan-Sep for missing reports
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth() + 1 // getMonth() returns 0-11, we want 1-12
    const missingMonths = []

    // Check from January to previous month (not including current month)
    const monthsToCheck = currentMonth - 1

    for (let month = 1; month <= monthsToCheck; month++) {
      if (!submittedMonths.has(month)) {
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ]
        
        missingMonths.push({
          month: month,
          year: currentYear,
          displayName: `${monthNames[month - 1]} ${currentYear}`
        })
      }
    }

    console.log('Missing months:', missingMonths)
    return { missingMonths, error: null }
  } catch (error) {
    console.error("Error in getMissingMonthsForSchool:", error)
    return { missingMonths: [], error: "An unexpected error occurred." }
  }
}

// Get complete school details with joined data for auto-filling admin form
export async function getSchoolDetails(schoolId: string) {
  try {
    const supabase = createServiceRoleSupabaseClient()
    const { data: school, error } = await supabase
      .from("sms_schools")
      .select(`
        id,
        name,
        grade,
        code,
        region_id,
        school_level_id,
        sms_regions!inner(name),
        sms_school_levels!inner(name)
      `)
      .eq("id", schoolId)
      .single()

    if (error) {
      console.error("Error fetching school details:", error)
      return null
    }

    return {
      id: school.id,
      name: school.name,
      grade: school.grade || "",
      code: school.code,
      educationDistrict: (school.sms_regions as any).name,
      schoolLevel: (school.sms_school_levels as any).name,
    }
  } catch (error) {
    console.error("Error fetching school details:", error)
    return null
  }
}

// Create admin HMR report (exact copy of head teacher createHmrReport)
export async function createAdminHmrReport(formData: FormData) {
  try {
    const user = await getUser()
    if (!user) {
      return { error: "Authentication required. Please log in." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Extract form data (exact same as head teacher)
    const schoolName = formData.get("schoolName") as string
    const educationDistrict = formData.get("educationDistrict") as string
    const schoolLevel = formData.get("schoolLevel") as string
    const schoolGrade = formData.get("schoolGrade") as string
    const month = formData.get("month") as string
    const year = formData.get("year") as string

    if (!schoolName || !educationDistrict || !schoolLevel || !schoolGrade || !month || !year) {
      return { error: "Please fill in all required fields." }
    }

    // Get school ID from school name (exact same as head teacher)
    const { data: school, error: schoolError } = await supabase
      .from("sms_schools")
      .select("id")
      .eq("name", schoolName)
      .single()

    if (schoolError || !school) {
      return { error: "School not found. Please select a valid school." }
    }

    // Get region ID from region name (exact same as head teacher)
    const { data: region, error: regionError } = await supabase
      .from("sms_regions")
      .select("id")
      .eq("name", educationDistrict)
      .single()

    if (regionError || !region) {
      return { error: "Education district not found. Please select a valid district." }
    }

    // Check if report already exists for this month/year/school (exact same as head teacher)
    const { data: existingReport } = await supabase
      .from("hmr_report")
      .select("id, status")
      .eq("school_id", school.id)
      .eq("month", Number.parseInt(month))
      .eq("year", Number.parseInt(year))
      .is("deleted_on", null)
      .single()

    if (existingReport) {
      if (existingReport.status === "submitted") {
        // Report already submitted for this month
        return {
          error:
            "A report has already been submitted for this month. You cannot create or edit reports for months that have already been submitted.",
          isSubmitted: true,
        }
      }
      // Return the existing draft report ID to continue editing
      return { success: true, reportId: existingReport.id, isExistingReport: true, status: existingReport.status }
    }

    // Create the report (exact same as head teacher)
    const { data: newReport, error: insertError } = await supabase
      .from("hmr_report")
      .insert({
        school_id: school.id,
        headteacher_id: user.id,
        month: Number.parseInt(month),
        year: Number.parseInt(year),
        region_id: region.id,
        school_level: schoolLevel,
        school_grade: schoolGrade,
        status: "draft",
      })
      .select()
      .single()

    if (insertError) {
      console.error("Insert error:", insertError)
      return { error: "Failed to create report. Please try again." }
    }

    revalidatePath("/dashboard/admin")
    return { success: true, reportId: newReport.id }
  } catch (error) {
    console.error("Error creating HMR report:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

// Admin-specific save functions (without role restrictions)
export async function saveAdminStudentEnrollment(formData: FormData) {
  try {
    const user = await getUser()
    if (!user) {
      return { error: "Authentication required." }
    }

    const supabase = createServiceRoleSupabaseClient()

    const reportId = formData.get("reportId") as string
    const totalStudents = formData.get("totalStudents") as string
    const totalTransferredIn = formData.get("totalTransferredIn") as string
    const totalTransferredOut = formData.get("totalTransferredOut") as string

    if (!reportId) {
      return { error: "Report ID is required. Please start from the Basic Information section." }
    }

    // Insert or update enrollment data
    const { error } = await supabase
      .from("hmr_student_enrollment")
      .upsert({
        hmr_report_id: reportId,
        total_students_enrolled: totalStudents ? parseInt(totalStudents) : 0,
        students_transferred_in: totalTransferredIn ? parseInt(totalTransferredIn) : 0,
        students_transferred_out: totalTransferredOut ? parseInt(totalTransferredOut) : 0,
      })

    if (error) {
      console.error("Error saving student enrollment:", error)
      return { error: "Failed to save student enrollment data." }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in saveAdminStudentEnrollment:", error)
    return { error: "An unexpected error occurred." }
  }
}

export async function saveAdminAttendance(formData: FormData) {
  try {
    const user = await getUser()
    if (!user) {
      return { error: "Authentication required." }
    }

    const supabase = createServiceRoleSupabaseClient()

    const reportId = formData.get("reportId") as string
    const studentAttendanceRate = formData.get("studentAttendanceRate") as string
    const studentPunctualityRate = formData.get("studentPunctualityRate") as string
    const teacherAttendanceRate = formData.get("teacherAttendanceRate") as string
    const teacherPunctualityRate = formData.get("teacherPunctualityRate") as string

    if (!reportId) {
      return { error: "Report ID is required." }
    }

    const { error } = await supabase
      .from("hmr_attendance")
      .upsert({
        hmr_report_id: reportId,
        student_attendance_rate: studentAttendanceRate ? parseFloat(studentAttendanceRate) : null,
        student_punctuality_rate: studentPunctualityRate ? parseFloat(studentPunctualityRate) : null,
        teacher_attendance_rate: teacherAttendanceRate ? parseFloat(teacherAttendanceRate) : null,
        teacher_punctuality_rate: teacherPunctualityRate ? parseFloat(teacherPunctualityRate) : null,
      })

    if (error) {
      console.error("Error saving attendance:", error)
      return { error: "Failed to save attendance data." }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in saveAdminAttendance:", error)
    return { error: "An unexpected error occurred." }
  }
}

export async function saveAdminStaffing(formData: FormData) {
  try {
    const user = await getUser()
    if (!user) {
      return { error: "Authentication required." }
    }

    const supabase = createServiceRoleSupabaseClient()

    const reportId = formData.get("reportId") as string
    const totalStaffEntitlement = formData.get("totalStaffEntitlement") as string
    const currentTeachersOnStaff = formData.get("currentTeachersOnStaff") as string
    const underStaffedBy = formData.get("underStaffedBy") as string
    const overStaffedBy = formData.get("overStaffedBy") as string
    const secondmentCertificatesPrepared = formData.get("secondmentCertificatesPrepared") as string

    if (!reportId) {
      return { error: "Report ID is required." }
    }

    const { error } = await supabase
      .from("hmr_staffing")
      .upsert({
        hmr_report_id: reportId,
        total_staff_entitlement: totalStaffEntitlement ? parseInt(totalStaffEntitlement) : null,
        current_teachers_on_staff: currentTeachersOnStaff ? parseInt(currentTeachersOnStaff) : null,
        under_staffed_by: underStaffedBy ? parseInt(underStaffedBy) : null,
        over_staffed_by: overStaffedBy ? parseInt(overStaffedBy) : null,
        secondment_certificates_prepared: secondmentCertificatesPrepared === 'true',
      })

    if (error) {
      console.error("Error saving staffing:", error)
      return { error: "Failed to save staffing data." }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in saveAdminStaffing:", error)
    return { error: "An unexpected error occurred." }
  }
}

// Submit admin report to database
export async function submitAdminReport(reportData: any) {
  try {
    const supabase = createServiceRoleSupabaseClient()
    const user = await getUser()

    if (!user) {
      return { error: "Authentication required. Please log in." }
    }

    // Parse month and year from monthYear (e.g., "June 2025")
    const [monthName, yearStr] = reportData.monthYear.split(' ')
    const monthMap: Record<string, number> = {
      'January': 1, 'February': 2, 'March': 3, 'April': 4,
      'May': 5, 'June': 6, 'July': 7, 'August': 8,
      'September': 9, 'October': 10, 'November': 11, 'December': 12
    }
    const month = monthMap[monthName]
    const year = parseInt(yearStr)

    if (!month || !year) {
      return { error: "Invalid month/year format." }
    }

    // Get school details
    const { data: school, error: schoolError } = await supabase
      .from("sms_schools")
      .select("id, region_id")
      .eq("id", reportData.schoolId)
      .single()

    if (schoolError || !school) {
      return { error: "School not found." }
    }

    // Check if report already exists
    const { data: existingReport } = await supabase
      .from("hmr_report")
      .select("id, status")
      .eq("school_id", reportData.schoolId)
      .eq("month", month.toString())
      .eq("year", year.toString())
      .single()

    if (existingReport) {
      return { error: "A report for this school and month already exists." }
    }

    // Create the main report entry (metadata only)
    const { data: newReport, error: insertError } = await supabase
      .from("hmr_report")
      .insert({
        school_id: reportData.schoolId,
        headteacher_id: user.id, // Admin submitting on behalf
        month: month,
        year: year,
        region_id: school.region_id,
        school_level: reportData.schoolLevel,
        school_grade: reportData.schoolGrade,
        status: "draft",
      })
      .select()
      .single()

    if (insertError) {
      console.error("Insert error:", insertError)
      return { error: "Failed to create report. Please try again." }
    }

    const reportId = newReport.id

    // Now save each section directly to the database tables
    try {
      // Section 1: Student Enrollment
      if (reportData.totalStudentsEnrolled || reportData.studentsTransferredIn || reportData.studentsTransferredOut) {
        const { error: enrollmentError } = await supabase
          .from("hmr_student_enrollment")
          .insert({
            hmr_report_id: reportId,
            total_students_enrolled: reportData.totalStudentsEnrolled ? parseInt(reportData.totalStudentsEnrolled) : 0,
            students_transferred_in: reportData.studentsTransferredIn ? parseInt(reportData.studentsTransferredIn) : 0,
            students_transferred_out: reportData.studentsTransferredOut ? parseInt(reportData.studentsTransferredOut) : 0,
          })

        if (enrollmentError) {
          console.error("Error saving student enrollment:", enrollmentError)
        }
      }

      // Section 2: Attendance
      if (reportData.studentAttendanceRate || reportData.teacherAttendanceRate) {
        const { error: attendanceError } = await supabase
          .from("hmr_attendance")
          .insert({
            hmr_report_id: reportId,
            student_attendance_rate: reportData.studentAttendanceRate ? parseFloat(reportData.studentAttendanceRate) : null,
            student_punctuality_rate: reportData.studentPunctualityRate ? parseFloat(reportData.studentPunctualityRate) : null,
            teacher_attendance_rate: reportData.teacherAttendanceRate ? parseFloat(reportData.teacherAttendanceRate) : null,
            teacher_punctuality_rate: reportData.teacherPunctualityRate ? parseFloat(reportData.teacherPunctualityRate) : null,
          })

        if (attendanceError) {
          console.error("Error saving attendance:", attendanceError)
        }
      }

      // Section 3: Staffing
      if (reportData.totalStaffEntitlement || reportData.currentTeachersOnStaff) {
        const { error: staffingError } = await supabase
          .from("hmr_staffing")
          .insert({
            hmr_report_id: reportId,
            total_staff_entitlement: reportData.totalStaffEntitlement ? parseInt(reportData.totalStaffEntitlement) : null,
            current_teachers_on_staff: reportData.currentTeachersOnStaff ? parseInt(reportData.currentTeachersOnStaff) : null,
            under_staffed_by: reportData.underStaffedBy ? parseInt(reportData.underStaffedBy) : null,
            over_staffed_by: reportData.overStaffedBy ? parseInt(reportData.overStaffedBy) : null,
            secondment_certificates_prepared: reportData.secondmentCertificatesPrepared === 'true' || reportData.secondmentCertificatesPrepared === true,
          })

        if (staffingError) {
          console.error("Error saving staffing:", staffingError)
        }
      }

      // Section 4: Teacher Status Updates (if any teachers data exists)
      if (reportData.teachersWhoLeft && reportData.teachersWhoLeft.length > 0) {
        const teacherStatusRecords = reportData.teachersWhoLeft
          .filter((teacher: any) => teacher.name && teacher.name.trim())
          .map((teacher: any) => ({
            hmr_report_id: reportId,
            teacher_name: teacher.name,
            teacher_status: teacher.status,
            reason: teacher.reason,
            status_type: "left"
          }))

        if (teacherStatusRecords.length > 0) {
          const { error: teacherStatusError } = await supabase
            .from("hmr_teacher_status_updates")
            .insert(teacherStatusRecords)

          if (teacherStatusError) {
            console.error("Error saving teacher status updates:", teacherStatusError)
          }
        }
      }

      // Update report status to submitted
      const { error: updateError } = await supabase
        .from("hmr_report")
        .update({ 
          status: "submitted",
          submitted_at: new Date().toISOString()
        })
        .eq("id", reportId)

      if (updateError) {
        console.error("Error updating report status:", updateError)
        return { error: "Report saved but failed to update status." }
      }

      revalidatePath("/dashboard/admin")
      return { success: true, reportId: newReport.id }

    } catch (sectionError) {
      console.error("Error saving report sections:", sectionError)
      
      // If there's an error saving sections, we should probably delete the main report
      await supabase.from("hmr_report").delete().eq("id", reportId)
      
      return { error: "Failed to save report sections. Please try again." }
    }

  } catch (error) {
    console.error("Error submitting admin report:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

// Simple function to mark an admin report as submitted
export async function submitAdminReportById(reportId: string) {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    // Update the report status to submitted
    const { error } = await supabase
      .from("hmr_report")
      .update({ 
        status: "submitted",
        submitted_at: new Date().toISOString()
      })
      .eq("id", reportId)

    if (error) {
      console.error("Error updating report status:", error)
      return { error: "Failed to submit report. Please try again." }
    }

    return { success: true }
  } catch (error) {
    console.error("Error submitting admin report:", error)
    return { error: "Failed to submit report. Please try again." }
  }
}
