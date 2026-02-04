"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { AuthWrapper, useAuth } from "@/components/auth-wrapper"
import { getSchoolReadiness, updateSchoolReadiness } from "@/app/actions/school-readiness"
import { getUserSchoolInfo } from "@/app/actions/auth"
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Activity,
  Sparkles,
  FileText,
  ArrowLeft,
  School,
} from "lucide-react"

interface ChecklistItem {
  id: string
  description: string
  completed: boolean
}

const defaultChecklist: ChecklistItem[] = [
  { id: "yard_weeded", description: "Yard is weeded and clean", completed: false },
  { id: "classrooms_cleaned", description: "Classrooms cleaned and organized", completed: false },
  { id: "toilets_functional", description: "All toilets are functional", completed: false },
  { id: "water_supply", description: "Water supply working properly", completed: false },
  { id: "electrical_system", description: "Electrical system is safe", completed: false },
  { id: "safety_equipment", description: "Safety equipment in place", completed: false },
  { id: "teaching_materials", description: "Teaching materials ready", completed: false },
  { id: "furniture_repaired", description: "Furniture repaired and arranged", completed: false },
  { id: "compound_secured", description: "School compound secured", completed: false },
  { id: "staff_briefed", description: "Staff briefed and ready", completed: false },
]

function SchoolReadinessContent() {
  const router = useRouter()
  const { user } = useAuth()
  const [checklist, setChecklist] = useState<ChecklistItem[]>(defaultChecklist)
  const [notReadyReason, setNotReadyReason] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [currentStatus, setCurrentStatus] = useState<"ready" | "not_ready" | "no_status">("no_status")
  const [schoolInfo, setSchoolInfo] = useState<{ id: string; name: string; level: string } | null>(null)

  // Calculate progress
  const completedItems = checklist.filter((item) => item.completed).length
  const totalItems = checklist.length
  const progressPercentage = Math.round((completedItems / totalItems) * 100)
  const allCompleted = completedItems === totalItems

  // Load existing data
  useEffect(() => {
    loadSchoolReadiness()
    loadSchoolInfo()
  }, [])

  const loadSchoolInfo = async () => {
    try {
      const result = await getUserSchoolInfo()
      if (result.school) {
        setSchoolInfo(result.school)
      }
    } catch (error) {
      console.error("Error loading school info:", error)
    }
  }

  const loadSchoolReadiness = async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await getSchoolReadiness()

      if (result.success && result.data) {
        const updatedChecklist = checklist.map((item) => ({
          ...item,
          completed: result.data.checklist?.[item.id] || false,
        }))
        setChecklist(updatedChecklist)
        setNotReadyReason(result.data.not_ready_reason || "")
        setCurrentStatus(result.data.status || "no_status")
      }
    } catch (err) {
      setError("Failed to load school readiness data")
      console.error("Error loading school readiness:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleChecklistChange = (itemId: string, completed: boolean) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, completed } : item))
    )
  }

  const handleSave = async (status: "ready" | "not_ready") => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    if (status === "not_ready" && !notReadyReason.trim()) {
      setError("Please provide a reason for why the school is not ready")
      setSaving(false)
      return
    }

    try {
      const checklistData = checklist.reduce((acc, item) => {
        acc[item.id] = item.completed
        return acc
      }, {} as Record<string, boolean>)

      const result = await updateSchoolReadiness({
        status: status,
        checklist: checklistData,
        not_ready_reason: status === "not_ready" ? notReadyReason : null,
      })

      if (result.success) {
        setCurrentStatus(status)
        setSuccess(
          status === "ready"
            ? "School marked as Ready!"
            : "School marked as Not Ready"
        )
      } else {
        setError(result.error || "Failed to update school readiness")
      }
    } catch (err) {
      setError("An unexpected error occurred")
      console.error("Error saving school readiness:", err)
    } finally {
      setSaving(false)
    }
  }

  const getStatusBadge = () => {
    switch (currentStatus) {
      case "ready":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" />
            Ready
          </span>
        )
      case "not_ready":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm font-medium">
            <XCircle className="w-4 h-4" />
            Not Ready
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-sm font-medium">
            <Activity className="w-4 h-4" />
            Not Set
          </span>
        )
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Loading readiness data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/dashboard/head-teacher")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              School Readiness
            </h1>
            {schoolInfo && (
              <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1">
                <School className="w-4 h-4" />
                {schoolInfo.name}
              </p>
            )}
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <p className="text-emerald-700 dark:text-emerald-300 font-medium">{success}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <Card className="border-slate-200 dark:border-slate-700/50 bg-white dark:bg-[hsl(222,47%,9%)]">
        <CardHeader className="pb-4 border-b border-slate-200 dark:border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                Readiness Checklist
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                Complete the checklist to update your school's readiness status
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {/* Progress Bar */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Progress
              </span>
            </div>
            <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  allCompleted
                    ? "bg-gradient-to-r from-emerald-500 to-green-500"
                    : "bg-gradient-to-r from-blue-500 to-indigo-500"
                }`}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <span
              className={`text-sm font-bold ${
                allCompleted
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-blue-600 dark:text-blue-400"
              }`}
            >
              {completedItems}/{totalItems}
            </span>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left: Checklist (3 columns) */}
            <div className="lg:col-span-3">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                Readiness Checklist
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {checklist.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleChecklistChange(item.id, !item.completed)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 text-left ${
                      item.completed
                        ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700/50"
                        : "bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50 hover:border-blue-300 dark:hover:border-blue-600/50 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        item.completed
                          ? "bg-emerald-500 border-emerald-500"
                          : "border-slate-300 dark:border-slate-600"
                      }`}
                    >
                      {item.completed && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </div>
                    <span
                      className={`text-sm flex-1 ${
                        item.completed
                          ? "text-emerald-700 dark:text-emerald-300 font-medium"
                          : "text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {item.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Notes Section (2 columns) */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-blue-500" />
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Additional Notes
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Required if marking as not ready. Optional otherwise.
              </p>
              <Textarea
                id="reason"
                value={notReadyReason}
                onChange={(e) => setNotReadyReason(e.target.value)}
                placeholder="Enter any notes or reasons..."
                rows={8}
                className="resize-none bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-blue-500/20 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-6 mt-6 border-t border-slate-200 dark:border-slate-700/50">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard/head-teacher")}
              disabled={saving}
              className="flex-1 h-12 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => handleSave("not_ready")}
              disabled={saving}
              className="flex-1 h-12 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg shadow-red-500/25 border-0 rounded-xl"
            >
              {saving ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <XCircle className="h-5 w-5 mr-2" />
                  Not Ready
                </>
              )}
            </Button>
            <Button
              type="button"
              onClick={() => handleSave("ready")}
              disabled={saving}
              className="flex-1 h-12 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg shadow-emerald-500/25 border-0 rounded-xl"
            >
              {saving ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Mark Ready
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function HeadTeacherSchoolReadinessPage() {
  return (
    <AuthWrapper requiredRole="Head Teacher">
      <SchoolReadinessContent />
    </AuthWrapper>
  )
}
