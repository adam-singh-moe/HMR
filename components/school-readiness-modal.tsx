"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react"
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
  { id: "yard_weeded", description: "Is the yard weeded?", completed: false },
  { id: "classrooms_cleaned", description: "Are all classrooms cleaned and organized?", completed: false },
  { id: "toilets_functional", description: "Are all student and teacher toilets functional?", completed: false },
  { id: "water_supply", description: "Is the water supply working properly?", completed: false },
  { id: "electrical_system", description: "Is the electrical system safe and functional?", completed: false },
  { id: "safety_equipment", description: "Are fire extinguishers and safety equipment in place?", completed: false },
  { id: "teaching_materials", description: "Are teaching materials and resources ready?", completed: false },
  { id: "furniture_repaired", description: "Are desks and chairs repaired and arranged?", completed: false },
  { id: "compound_secured", description: "Is the school compound properly secured?", completed: false },
  { id: "staff_briefed", description: "Have all staff been briefed and are ready?", completed: false },
]

export function SchoolReadinessModal({ 
  isOpen, 
  onClose, 
  onStatusChange, 
  currentStatus 
}: SchoolReadinessModalProps) {
  const [checklist, setChecklist] = useState<ChecklistItem[]>(defaultChecklist)
  const [notReadyReason, setNotReadyReason] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<"ready" | "not_ready" | null>(null)
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
        // Update checklist with saved data
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

    // Validate: if not ready, reason is required
    if (status === "not_ready" && !notReadyReason.trim()) {
      setError("Please provide a reason for why the school is not ready")
      setSaving(false)
      return
    }

    try {
      // Prepare checklist data
      const checklistData = checklist.reduce((acc, item) => {
        acc[item.id] = item.completed
        return acc
      }, {} as Record<string, boolean>)

      // Save to database
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
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-primary-600" />
            School Readiness Status
          </DialogTitle>
          <DialogDescription>
            Complete the checklist below to update your school's readiness status for reopening.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading readiness data...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current Status */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900">Readiness Checklist</h3>
                <p className="text-sm text-gray-600">
                  {completedItems} of {totalItems} requirements completed ({progressPercentage}%)
                </p>
              </div>
              <Badge className="bg-blue-100 text-blue-800">
                <AlertCircle className="h-3 w-3 mr-1" />
                Assessment
              </Badge>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{progressPercentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    allCompleted ? 'bg-green-500' : 'bg-primary-500'
                  }`}
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>

            {/* Checklist */}
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">Readiness Checklist</h3>
              <div className="space-y-3">
                {checklist.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <Checkbox
                      id={item.id}
                      checked={item.completed}
                      onCheckedChange={(checked) => 
                        handleChecklistChange(item.id, checked as boolean)
                      }
                      className="mt-0.5"
                    />
                    <Label 
                      htmlFor={item.id} 
                      className={`text-sm cursor-pointer flex-1 ${
                        item.completed ? 'text-green-700 line-through' : 'text-gray-700'
                      }`}
                    >
                      {item.description}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Not Ready Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason" className="text-sm font-medium">
                Additional Notes / Reason if Not Ready:
              </Label>
              <Textarea
                id="reason"
                value={notReadyReason}
                onChange={(e) => setNotReadyReason(e.target.value)}
                placeholder="Enter reason if school is not ready, or additional notes..."
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={saving}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => handleSave("not_ready")}
                disabled={saving}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Mark Not Ready
                  </>
                )}
              </Button>
              <Button
                type="button"
                onClick={() => handleSave("ready")}
                disabled={saving}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark Ready
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
