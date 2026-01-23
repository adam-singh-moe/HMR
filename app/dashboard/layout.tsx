import type { ReactNode } from "react"
import { getUserDetails } from "@/app/actions/users"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/dashboard-shell"

// Dashboards are authenticated and depend on cookies/session.
// Force dynamic rendering to avoid build-time prerender attempts.
export const dynamic = 'force-dynamic'

// Helper function to capitalize first and last names
function capitalizeName(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

// Helper function to format role with region for Regional Officers and school for Head Teachers
function formatRoleWithRegion(role: string, regionName: string | null, schoolName: string | null): string {
  const formattedRole = role.replace("_", " ")
  if (role === "Regional Officer" && regionName) {
    return `${formattedRole} - ${regionName}`
  }
  if (role === "Head Teacher" && schoolName) {
    return `${formattedRole} - ${schoolName}`
  }
  return formattedRole
}

// Helper function to get the correct dashboard URL based on user role
function getDashboardUrl(role: string): string {
  if (role === "Head Teacher") {
    return "/dashboard/head-teacher"
  } else if (role === "Regional Officer") {
    return "/dashboard/regional-officer"
  } else if (role === "Admin") {
    return "/dashboard/admin"
  } else if (role === "Education Official") {
    return "/dashboard/education-official"
  }
  // For unknown roles, default to admin dashboard
  return "/dashboard/admin"
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, role, error } = await getUserDetails()

  if (error || !user || !role) {
    redirect("/auth")
  }

  // Regional Officers have their own layout with sidebar, so skip DashboardShell
  if (role === "Regional Officer") {
    return <>{children}</>
  }

  // Capitalize the user's name and format role with region/school
  const capitalizedName = capitalizeName(user.name || "")
  const formattedRole = formatRoleWithRegion(role, user.region_name || null, user.school_name || null)
  const dashboardUrl = getDashboardUrl(role)

  return (
    <DashboardShell
      capitalizedName={capitalizedName}
      formattedRole={formattedRole}
      dashboardUrl={dashboardUrl}
      role={role}
    >
      {children}
    </DashboardShell>
  )
}
