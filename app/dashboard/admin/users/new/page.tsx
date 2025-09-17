import { getRoles, getRegions, getSchools } from "@/app/actions/admin"
import { UserForm } from "@/components/admin/user-form"

export default async function NewUserPage() {
  const [roles, regionsResult, schoolsResult] = await Promise.all([
    getRoles(), 
    getRegions(), 
    getSchools(1, 1000) // Get up to 1000 schools for the dropdown
  ])

  const regions = regionsResult.regions || []
  const schools = schoolsResult.schools || []

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Create New User</h2>
      <UserForm roles={roles} regions={regions} schools={schools} />
    </div>
  )
}
