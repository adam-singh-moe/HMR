import type { ReactNode } from "react"
import { getUserDetails } from "@/app/actions/users"
import { redirect } from "next/navigation"
import { EducationOfficialLayoutClient } from "./layout-client"

export default async function EducationOfficialLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, role, error } = await getUserDetails()

  // Allow both Education Officials and Regional Officers to access this area
  if (error || !user || (role !== "Education Official" && role !== "Regional Officer")) {
    redirect("/auth")
  }

  // If Regional Officer, redirect to their dashboard
  if (role === "Regional Officer") {
    redirect("/dashboard/regional-officer")
  }

  return <EducationOfficialLayoutClient>{children}</EducationOfficialLayoutClient>
}
