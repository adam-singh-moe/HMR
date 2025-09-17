"use server"

import { cookies } from "next/headers"
import { createServerSupabaseClient } from "@/lib/supabase"
import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"

export async function getUserDetails() {
  const cookieStore = await cookies()
  const userSession = cookieStore.get("user_session")

  if (!userSession) {
    return { user: null, role: null, error: "User not authenticated" }
  }

  try {
    const user = JSON.parse(userSession.value)
    return { user, role: user.role, error: null }
  } catch {
    return { user: null, role: null, error: "Invalid session data" }
  }
}

export async function updateUserProfile(formData: FormData) {
  const cookieStore = await cookies()
  const userSession = cookieStore.get("user_session")

  if (!userSession) {
    return { error: "User not authenticated" }
  }

  try {
    const user = JSON.parse(userSession.value)
    const newName = formData.get("name") as string

    if (!newName || newName.trim().length === 0) {
      return { error: "Name is required" }
    }

    const supabase = createServerSupabaseClient()

    // Update the user's name in the database
    const { error } = await supabase
      .from("hmr_users")
      .update({
        name: newName.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)

    if (error) {
      console.error("Error updating user profile:", error)
      return { error: "Failed to update profile. Please try again." }
    }

    // Update the session cookie with the new name
    const updatedUser = { ...user, name: newName.trim() }
    cookieStore.set("user_session", JSON.stringify(updatedUser), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    revalidatePath("/dashboard/settings")
    return { success: true }
  } catch (error) {
    console.error("Error updating profile:", error)
    return { error: "Failed to update profile. Please try again." }
  }
}

export async function updateUserPassword(formData: FormData) {
  const cookieStore = await cookies()
  const userSession = cookieStore.get("user_session")

  if (!userSession) {
    return { error: "User not authenticated" }
  }

  try {
    const user = JSON.parse(userSession.value)
    const currentPassword = formData.get("current_password") as string
    const newPassword = formData.get("new_password") as string
    const confirmPassword = formData.get("confirm_password") as string

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      return { error: "All password fields are required" }
    }

    if (newPassword.length < 6) {
      return { error: "New password must be at least 6 characters long" }
    }

    if (newPassword !== confirmPassword) {
      return { error: "New passwords do not match" }
    }

    const supabase = createServerSupabaseClient()

    // Get the current user data to verify the current password
    const { data: userData, error: fetchError } = await supabase
      .from("hmr_users")
      .select("password")
      .eq("id", user.id)
      .single()

    if (fetchError || !userData) {
      console.error("Error fetching user data:", fetchError)
      return { error: "Failed to verify current password" }
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, userData.password)
    if (!isCurrentPasswordValid) {
      return { error: "Current password is incorrect" }
    }

    // Hash the new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12)

    // Update the password in the database
    const { error: updateError } = await supabase
      .from("hmr_users")
      .update({
        password: hashedNewPassword,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)

    if (updateError) {
      console.error("Error updating password:", updateError)
      return { error: "Failed to update password. Please try again." }
    }

    return { success: true }
  } catch (error) {
    console.error("Error updating password:", error)
    return { error: "Failed to update password. Please try again." }
  }
}
