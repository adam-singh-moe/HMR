"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { CheckCircle2, XCircle, Loader2, Activity, Sparkles, FileText } from "lucide-react"
import { getSchoolReadiness, updateSchoolReadiness } from "@/app/actions/school-readiness"

interface ChecklistItem {
  id: string
  description: string
  completed: boolean
}

interface SchoolReadinessModalProps {
  isOpen: boolean
  onClose: () => void
  onStatusChange: (newStatus: "ready" | "not_ready", reason?: string) => void
  currentStatus?: "ready" | "not_ready"
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

export function SchoolReadinessModal({
  isOpen,
  onClose,
  onStatusChange,
  currentStatus
}: SchoolReadinessModalProps) {
  const [checklist, setChecklist] = useState<ChecklistItem[]>(defaultChecklist)
  const [notReadyReason, setNotReadyReason] = useState("")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Calculate progress
  const completedItems = checklist.filter(item => item.completed).length
  const totalItems = checklist.length
  const progressPercentage = Math.round((completedItems / totalItems) * 100)
  const allCompleted = completedItems === totalItems

  // Load existing data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadSchoolReadiness()
    }
  }, [isOpen])

  const loadSchoolReadiness = async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await getSchoolReadiness()

      if (result.success && result.data) {
        const updatedChecklist = checklist.map(item => ({
          ...item,
          completed: result.data.checklist?.[item.id] || false
        }))
        setChecklist(updatedChecklist)
        setNotReadyReason(result.data.not_ready_reason || "")
      }
    } catch (err) {
      setError("Failed to load school readiness data")
      console.error("Error loading school readiness:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleChecklistChange = (itemId: string, completed: boolean) => {
    setChecklist(prev => prev.map(item =>
      item.id === itemId ? { ...item, completed } : item
    ))
  }

  const handleSave = async (status: "ready" | "not_ready") => {
    setSaving(true)
    setError(null)

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
        not_ready_reason: status === "not_ready" ? notReadyReason : null
      })

      if (result.success) {
        onStatusChange(status, status === "not_ready" ? notReadyReason : undefined)
        onClose()
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/50 shadow-2xl">
        {/* Header */}
        <DialogHeader className="pb-3 border-b border-slate-200 dark:border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                School Readiness Status
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm">
                Complete the checklist to update your school's readiness
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400">Loading readiness data...</p>
            </div>
          </div>
        ) : (
          <div className="py-3">
            {/* Progress Bar - Compact */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Progress</span>
              </div>
              <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    allCompleted
                      ? 'bg-gradient-to-r from-emerald-500 to-green-500'
                      : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                  }`}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <span className={`text-sm font-bold ${
                allCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'
              }`}>
                {completedItems}/{totalItems}
              </span>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {/* Left: Checklist (3 columns) - Two column grid for items */}
              <div className="lg:col-span-3">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Readiness Checklist</h3>
                <div className="grid grid-cols-2 gap-2">
                  {checklist.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleChecklistChange(item.id, !item.completed)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 text-left ${
                        item.completed
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700/50'
                          : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50 hover:border-blue-300 dark:hover:border-blue-600/50 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        item.completed
                          ? 'bg-emerald-500 border-emerald-500'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}>
                        {item.completed && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      <span className={`text-xs flex-1 ${
                        item.completed
                          ? 'text-emerald-700 dark:text-emerald-300 font-medium'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}>
                        {item.description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Right: Notes Section (2 columns) */}
              <div className="lg:col-span-2">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Additional Notes</h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  Required if marking as not ready. Optional otherwise.
                </p>
                <Textarea
                  id="reason"
                  value={notReadyReason}
                  onChange={(e) => setNotReadyReason(e.target.value)}
                  placeholder="Enter any notes or reasons..."
                  rows={6}
                  className="resize-none bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-blue-500/20 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />

                {/* Error Message */}
                {error && (
                  <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      <p className="text-red-700 dark:text-red-400 text-xs">{error}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!loading && (
          <div className="flex gap-3 pt-3 border-t border-slate-200 dark:border-slate-700/50">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="flex-1 h-10 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => handleSave("not_ready")}
              disabled={saving}
              className="flex-1 h-10 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg shadow-red-500/25 border-0 rounded-lg"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Not Ready
                </>
              )}
            </Button>
            <Button
              type="button"
              onClick={() => handleSave("ready")}
              disabled={saving}
              className="flex-1 h-10 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg shadow-emerald-500/25 border-0 rounded-lg"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Mark Ready
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
