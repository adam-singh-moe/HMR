import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"
import { verifyVerificationToken } from "@/lib/verification-token"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const { token, code, newPassword } = await request.json()

    // console.log("Reset password request received:", { 
    //   hasToken: !!token, 
    //   hasCode: !!code, 
    //   hasPassword: !!newPassword,
    //   tokenLength: token?.length,
    //   codeValue: code,
    //   passwordLength: newPassword?.length
    // })

    if (!token || !code || !newPassword) {
      return NextResponse.json(
        { success: false, error: "Token, verification code, and new password are required" },
        { status: 400 }
      )
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters long" },
        { status: 400 }
      )
    }

    // Verify the JWT token
    const tokenData = await verifyVerificationToken(token)

    if (!tokenData) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired verification token. Please request a new code." },
        { status: 400 }
      )
    }

    // Check if this is a password reset token
    if (tokenData.userData.type !== "password_reset") {
      return NextResponse.json(
        { success: false, error: "Invalid token type for password reset" },
        { status: 400 }
      )
    }

    // Check if the provided code matches the one in the token
    if (tokenData.userData.verificationCode !== code.toString()) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Invalid verification code. Please check your email and try again."
        },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    // Update user password in database
    const { error: updateError } = await supabase
      .from("hmr_users")
      .update({ 
        password: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq("id", tokenData.userData.userId)

    if (updateError) {
      console.error("Error updating password:", updateError)
      return NextResponse.json(
        { success: false, error: "Failed to update password. Please try again." },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: "Password updated successfully. You can now log in with your new password."
    })

  } catch (error) {
    console.error("Error resetting password:", error)
    return NextResponse.json(
      { success: false, error: "Failed to reset password" },
      { status: 500 }
    )
  }
}
