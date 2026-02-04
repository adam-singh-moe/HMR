import { type NextRequest, NextResponse } from "next/server"
import { getUserPermissions } from "@/app/actions/permissions"

export async function GET(request: NextRequest) {
  try {
    const userPermissions = await getUserPermissions()

    if (!userPermissions) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Debug logging for permissions
    console.log("[API/permissions] Returning permissions count:", userPermissions.permissions.length)
    console.log("[API/permissions] All permissions:", userPermissions.permissions)
    // Find any permission containing "nursery" to debug the exact key
    const nurseryPerms = userPermissions.permissions.filter((p: string) => p.toLowerCase().includes("nursery"))
    console.log("[API/permissions] All nursery-related permissions:", nurseryPerms)
    console.log("[API/permissions] Has nursery_class.view (lowercase):", userPermissions.permissions.includes("nursery_class.view"))
    console.log("[API/permissions] Has nursery_class.View (uppercase):", userPermissions.permissions.includes("nursery_class.View"))
    console.log("[API/permissions] Has nursery_class.create:", userPermissions.permissions.includes("nursery_class.create"))
    console.log("[API/permissions] Has nursery_class.delete:", userPermissions.permissions.includes("nursery_class.delete"))

    return NextResponse.json(userPermissions)
  } catch (error) {
    console.error("Error getting user permissions:", error)
    return NextResponse.json({ error: "Failed to get permissions" }, { status: 500 })
  }
}
