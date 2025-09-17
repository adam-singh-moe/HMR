import { getUser } from "@/app/actions/auth"
import { redirect } from "next/navigation"

export default async function DashboardRootPage() {
  const user = await getUser()
  
  if (!user) {
    redirect("/auth")
    return null
  }

  // Immediately redirect users to their role-specific dashboard
  if (user.role === "Head Teacher") {
    redirect("/dashboard/head-teacher")
  } else if (user.role === "Regional Officer") {
    redirect("/dashboard/regional-officer")
  } else if (user.role === "Admin") {
    redirect("/dashboard/admin")
  } else if (user.role === "Education Official") {
    redirect("/dashboard/education-official")
  }

  // Fallback redirect for unknown roles
  redirect("/auth")
}
