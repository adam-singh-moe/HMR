import { NextRequest, NextResponse } from "next/server"
import { verifyVerificationToken } from "@/lib/verification-token"

export async function POST(request: NextRequest) {
  try {
    const { token, code } = await request.json()

    if (!token || !code) {
      return NextResponse.json(
        { success: false, error: "Token and verification code are required" },
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

    // Code is valid, return user data for account creation
    const { verificationCode, ...userData } = tokenData.userData

    return NextResponse.json({ 
      success: true, 
      message: "Email verified successfully",
      userData 
    })

  } catch (error) {
    console.error("Error verifying code:", error)
    return NextResponse.json(
      { success: false, error: "Failed to verify code" },
      { status: 500 }
    )
  }
}
