import { getUserById, getRoles, getRegions, getSchools } from "@/app/actions/admin"
import { UserForm } from "@/components/admin/user-form"
import { notFound } from "next/navigation"
import { UserCog } from "lucide-react"

interface EditUserPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditUserPage({ params }: EditUserPageProps) {
  const { id } = await params
  const [user, roles, regionsResult, schoolsResult] = await Promise.all([
    getUserById(id),
    getRoles(),
    getRegions(1, 50),
    getSchools(1, 2000), // Get up to 2000 schools for the dropdown
  ])

  if (!user) {
    notFound()
  }

  const regions = regionsResult.regions || []
  const schools = schoolsResult.schools || []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl lg:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <UserCog className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          Edit User
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Update user information and permissions
        </p>
      </div>
      <div className="bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700/50 p-6 shadow-sm">
        <UserForm user={user} roles={roles} regions={regions} schools={schools} isEditing />
      </div>
    </div>
  )
}
