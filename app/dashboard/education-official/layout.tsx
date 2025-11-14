import type { ReactNode } from "react"
import { getUserDetails } from "@/app/actions/users"
import { redirect } from "next/navigation"
import EducationOfficialNav from "./education-official-nav"

export default async function EducationOfficialLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, role, error } = await getUserDetails()

  if (error || !user || role !== "Education Official") {
    redirect("/auth")
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary-700">Education Official Dashboard</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Monitor reports and school performance across the system</p>
        </div>
      </div>

      <EducationOfficialNav />

      {children}
    </div>
  )
}
