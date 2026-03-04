import { NextResponse } from "next/server"

import { createServiceRoleSupabaseClient } from "@/lib/supabase"
import { getUser } from "@/app/actions/auth"

export const runtime = "nodejs"

export async function GET() {
  try {
    const user = await getUser()

    if (!user) {
      return NextResponse.json({ levels: [], error: "You must be logged in." }, { status: 401 })
    }

    const allowedRoles = new Set(["Regional Officer", "Education Official", "Admin"])
    if (!allowedRoles.has(user.role)) {
      return NextResponse.json({ levels: [], error: "You do not have permission to view school levels." }, { status: 403 })
    }

    const supabase = createServiceRoleSupabaseClient()
    const { data, error } = await supabase
      .from("sms_school_levels")
      .select("id, name")
      .order("name", { ascending: true })

    if (error) {
      return NextResponse.json({ levels: [], error: "Failed to fetch school levels." }, { status: 500 })
    }

    return NextResponse.json({ levels: data || [], error: null })
  } catch (error) {
    console.error("Error in GET /api/school-assessment/education-official/school-levels:", error)
    return NextResponse.json(
      { levels: [], error: "Failed to load school levels." },
      { status: 500 }
    )
  }
}
