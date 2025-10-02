import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"
import { generateVerificationToken, generateVerificationCode } from "@/lib/verification-token"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Check if user exists in hmr_users table
    const { data: user, error: userError } = await supabase
      .from("hmr_users")
      .select(`
        id, 
        name, 
        email,
        hmr_user_roles (
          name
        )
      `)
      .eq("email", email)
      .maybeSingle()

    if (userError && userError.code !== "PGRST116") {
      console.error("Error checking user:", userError)
      return NextResponse.json(
        { success: false, error: "Failed to process request" },
        { status: 500 }
      )
    }

    if (!user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json({ 
        success: true, 
        message: "If an account with this email exists, you will receive a password reset code."
      })
    }

    // Generate 6-digit verification code for display
    const verificationCode = generateVerificationCode()
    
    const roleName = (user.hmr_user_roles as any)?.name || "Unknown"
    
    // Generate JWT token containing the verification code and user info for password reset
    const verificationToken = await generateVerificationToken(email, {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: roleName,
      verificationCode,
      type: "password_reset"
    })

    // Send password reset email
    await sendPasswordResetEmail({
      to: email,
      name: user.name || "User",
      code: verificationCode,
      role: roleName,
      token: verificationToken
    })

    return NextResponse.json({ 
      success: true, 
      message: "If an account with this email exists, you will receive a password reset code.",
      token: verificationToken
    })

  } catch (error) {
    console.error("Error processing password reset request:", error)
    return NextResponse.json(
      { success: false, error: "Failed to process password reset request" },
      { status: 500 }
    )
  }
}

async function sendPasswordResetEmail(data: {
  to: string
  name: string
  code: string
  role: string
  token: string
}) {
  const sendGridApiKey = process.env.SENDGRID_API_KEY

  if (!sendGridApiKey) {
    throw new Error("SendGrid API key not configured")
  }

  const emailTemplate = generatePasswordResetEmailTemplate(data)
  const roleDisplay = data.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())

  const emailData = {
    personalizations: [
      {
        to: [{ email: data.to, name: data.name }],
        subject: `Password Reset Request - School Headteachers' Monthly reporting portal`,
      },
    ],
    from: {
      email: process.env.SENDGRID_FROM_EMAIL || "noreply@moe.gov.gy",
      name: "Ministry of Education - Password Reset",
    },
    content: [
      {
        type: "text/html",
        value: emailTemplate,
      },
    ],
  }

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sendGridApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(emailData),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`SendGrid API error: ${response.status} - ${errorText}`)
  }

  return { success: true, email: data.to }
}

function generatePasswordResetEmailTemplate(data: {
  name: string
  code: string
  role: string
}) {
  const roleDisplay = data.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset Request</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px; }
        .verification-box { background-color: #fef2f2; border: 2px solid #fecaca; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
        .verification-code { font-size: 32px; font-weight: bold; color: #dc2626; letter-spacing: 4px; margin: 10px 0; }
        .warning { color: #dc2626; font-size: 14px; margin-top: 15px; }
        .security-notice { background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 20px 0; color: #856404; }
        .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
        .logo { width: 60px; height: 60px; margin: 0 auto 15px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🏛️</div>
            <h1>Ministry of Education</h1>
            <p>Republic of Guyana</p>
        </div>
        
        <div class="content">
            <h2>🔐 Password Reset Request</h2>
            <p>Dear ${data.name},</p>
            
            <p>We received a request to reset your password for your <strong>${roleDisplay}</strong> account in the School Headteachers' Monthly reporting portal.</p>
            
            <p>To proceed with resetting your password, please verify your identity using the verification code below:</p>
            
            <div class="verification-box">
                <p><strong>Your Verification Code:</strong></p>
                <div class="verification-code">${data.code}</div>
                <p class="warning">⏰ This code will expire in 10 minutes</p>
            </div>
            
            <div class="security-notice">
                <p><strong>🛡️ Security Notice:</strong></p>
                <p>If you did not request this password reset, please ignore this email. Your account will remain secure and no changes will be made.</p>
                <p>For security reasons, this link will expire in 10 minutes.</p>
            </div>
            
            <p>Enter this code in the password reset form to proceed with creating a new password.</p>
            
            <p>Best regards,<br>
            <strong>Ministry of Education</strong><br>
            Republic of Guyana</p>
        </div>
        
        <div class="footer">
            <p>This is an automated message from the School Headteachers' Monthly reporting portal. Please do not reply to this email.</p>
            <p>For support, contact your regional office or system administrator.</p>
        </div>
    </div>
</body>
</html>
  `
}