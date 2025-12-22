import { getUserById, getRoles, getRegions, getSchools } from "@/app/actions/admin"
import { UserForm } from "@/components/admin/user-form"
import { notFound } from "next/navigation"

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
    getRegions(),
    getSchools(1, 1000), // Get up to 1000 schools for the dropdown
  ])

  if (!user) {
    notFound()
  }

  const regions = regionsResult.regions || []
  const schools = schoolsResult.schools || []

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Edit User</h2>
      <UserForm user={user} roles={roles} regions={regions} schools={schools} isEditing />
    </div>
  )
}
