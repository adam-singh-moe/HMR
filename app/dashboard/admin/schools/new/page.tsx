import { getRegions, getSchoolLevels } from "@/app/actions/admin"
import { SchoolForm } from "@/components/admin/school-form"

export default async function NewSchoolPage() {
  const [regionsResult, schoolLevels] = await Promise.all([
    getRegions(),
    getSchoolLevels()
  ])

  const regions = regionsResult.regions || []

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Create New School</h2>
      <SchoolForm regions={regions} schoolLevels={schoolLevels} />
    </div>
  )
}
