import { getRegions, getSchoolLevels } from "@/app/actions/admin"
import { SchoolForm } from "@/components/admin/school-form"
import { School } from "lucide-react"
import { checkPermission } from "@/lib/permissions"
import { redirect } from "next/navigation"

export default async function NewSchoolPage() {
  // Check create permission first
  const canCreate = await checkPermission("permissions.create")

  if (!canCreate) {
    redirect("/dashboard/admin/schools")
  }

  const [regionsResult, schoolLevels] = await Promise.all([
    getRegions(1, 50),
    getSchoolLevels()
  ])

  const regions = regionsResult.regions || []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl lg:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <School className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          Create New School
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Add a new school to the system
        </p>
      </div>
      <div className="bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700/50 p-6 shadow-sm">
        <SchoolForm regions={regions} schoolLevels={schoolLevels} />
      </div>
    </div>
  )
}
