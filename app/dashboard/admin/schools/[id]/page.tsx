import { getSchoolById, getRegions, getSchoolLevels } from "@/app/actions/admin"
import { SchoolForm } from "@/components/admin/school-form"
import { notFound } from "next/navigation"

interface EditSchoolPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditSchoolPage({ params }: EditSchoolPageProps) {
  const { id } = await params
  const [school, regionsResult, schoolLevels] = await Promise.all([
    getSchoolById(id),
    getRegions(),
    getSchoolLevels()
  ])

  if (!school) {
    notFound()
  }

  const regions = regionsResult.regions || []

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Edit School</h2>
      <SchoolForm school={school} regions={regions} schoolLevels={schoolLevels} isEditing />
    </div>
  )
}
