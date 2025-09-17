import { NextRequest, NextResponse } from "next/server"
import { generateVerificationToken, generateVerificationCode } from "@/lib/verification-token"

export async function POST(request: NextRequest) {
  try {
    const { email, userData } = await request.json()

    if (!email || !userData) {
      return NextResponse.json(
        { success: false, error: "Email and user data are required" },
        { status: 400 }
      )
    }

    // Generate 6-digit verification code for display
    const verificationCode = generateVerificationCode()
    
    // Generate JWT token containing the verification code and user data
    const verificationToken = await generateVerificationToken(email, {
      ...userData,
      verificationCode
    })

    // Send verification email using SendGrid (same as report reminders)
    await sendVerificationEmail({
      to: email,
      name: userData.name || "User",
      code: verificationCode,
      role: userData.role,
      token: verificationToken
    })

    return NextResponse.json({ 
      success: true, 
      message: "Verification code sent successfully",
      token: verificationToken // Return token for frontend to use in verification
    })

  } catch (error) {
    console.error("Error sending verification code:", error)
    return NextResponse.json(
      { success: false, error: "Failed to send verification code" },
      { status: 500 }
    )
  }
}

async function sendVerificationEmail(data: {
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

  const emailTemplate = generateVerificationEmailTemplate(data)
  const roleDisplay = data.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())

  const emailData = {
    personalizations: [
      {
        to: [{ email: data.to, name: data.name }],
        subject: `Email Verification - School Headteachers' Monthly reporting portal`,
      },
    ],
    from: {
      email: process.env.SENDGRID_FROM_EMAIL || "noreply@moe.gov.gy",
      name: "Ministry of Education - Account Verification",
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

function generateVerificationEmailTemplate(data: {
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
    <title>Email Verification</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px; }
        .verification-box { background-color: #f8fafc; border: 2px solid #e2e8f0; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
        .verification-code { font-size: 32px; font-weight: bold; color: #1e40af; letter-spacing: 4px; margin: 10px 0; }
        .warning { color: #dc2626; font-size: 14px; margin-top: 15px; }
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
            <h2>Email Verification Required</h2>
            <p>Dear ${data.name},</p>
            
            <p>Thank you for registering as a <strong>${roleDisplay}</strong> with the School Headteachers' Monthly reporting portal.</p>
            
            <p>To complete your account setup, please verify your email address using the verification code below:</p>
            
            <div class="verification-box">
                <p><strong>Your Verification Code:</strong></p>
                <div class="verification-code">${data.code}</div>
                <p class="warning">⏰ This code will expire in 10 minutes</p>
            </div>
            
            <p>Enter this code in the verification form to proceed with your account creation.</p>
            
            <p>If you didn't request this verification, please ignore this email.</p>
            
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
