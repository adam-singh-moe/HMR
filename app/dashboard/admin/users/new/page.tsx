import { getRoles, getRegions, getSchools } from "@/app/actions/admin"
import { UserForm } from "@/components/admin/user-form"
import { UserPlus } from "lucide-react"
import { checkPermission } from "@/lib/permissions"
import { redirect } from "next/navigation"

export default async function NewUserPage() {
  // Check create permission first
  const canCreate = await checkPermission("users.create")

  if (!canCreate) {
    redirect("/dashboard/admin/users")
  }

  const [roles, regionsResult, schoolsResult] = await Promise.all([
    getRoles(),
    getRegions(1, 50),
    getSchools(1, 2500) // Get up to 2500 schools for the dropdown to accommodate all schools
  ])

  const regions = regionsResult.regions || []
  const schools = schoolsResult.schools || []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl lg:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <UserPlus className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          Create New User
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Add a new user to the system
        </p>
      </div>
      <div className="bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700/50 p-6 shadow-sm">
        <UserForm roles={roles} regions={regions} schools={schools} />
      </div>
    </div>
  )
}
