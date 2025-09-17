import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userSession = cookieStore.get("user_session")

    if (!userSession) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const userData = JSON.parse(userSession.value)
    return NextResponse.json(userData)
  } catch (error) {
    console.error("Error getting user:", error)
    return NextResponse.json({ error: "Failed to get user data" }, { status: 500 })
  }
}
