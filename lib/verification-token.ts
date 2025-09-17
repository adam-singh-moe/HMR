import { SignJWT, jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-key-for-development'
)

interface VerificationPayload {
  email: string
  userData: any
  exp: number
}

export async function generateVerificationToken(email: string, userData: any): Promise<string> {
  // Token expires in 10 minutes
  const expiresAt = Math.floor(Date.now() / 1000) + (10 * 60)
  
  const token = await new SignJWT({
    email: email.toLowerCase(),
    userData,
    exp: expiresAt
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(expiresAt)
    .sign(JWT_SECRET)

  return token
}

export async function verifyVerificationToken(token: string): Promise<VerificationPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    
    return {
      email: payload.email as string,
      userData: payload.userData,
      exp: payload.exp as number
    }
  } catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}
