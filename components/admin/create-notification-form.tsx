"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { X, AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import { createNotification, getNotificationTargetingOptions } from "@/app/actions/notifications"
import { useEffect } from "react"

interface TargetingOptions {
  roles: string[]
  schoolLevels: string[]
  regions: string[]
}

export function CreateNotificationForm() {
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [priority, setPriority] = useState<"low" | "normal" | "high" | "urgent">("normal")
  const [type, setType] = useState<"general" | "announcement" | "deadline" | "update" | "alert">("general")
  const [targetAllUsers, setTargetAllUsers] = useState(false)
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [selectedSchoolLevels, setSelectedSchoolLevels] = useState<string[]>([])
  const [selectedRegions, setSelectedRegions] = useState<string[]>([])
  const [expiresAt, setExpiresAt] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [targetingOptions, setTargetingOptions] = useState<TargetingOptions>({
    roles: [],
    schoolLevels: [],
    regions: []
  })

  useEffect(() => {
    async function loadTargetingOptions() {
      const result = await getNotificationTargetingOptions()
      if (!result.error) {
        setTargetingOptions({
          roles: result.roles || [],
          schoolLevels: result.schoolLevels || [],
          regions: result.regions || []
        })
      } else {
        console.error('Error loading targeting options:', result.error)
      }
    }
    loadTargetingOptions()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess(false)

    if (!title.trim() || !message.trim()) {
      setError("Title and message are required")
      setIsLoading(false)
      return
    }

    if (!targetAllUsers &&
      selectedRoles.length === 0 &&
      selectedSchoolLevels.length === 0 &&
      selectedRegions.length === 0) {
      setError("At least one targeting option must be selected")
      setIsLoading(false)
      return
    }

    const result = await createNotification({
      title: title.trim(),
      message: message.trim(),
      priority,
      notification_type: type,
      target_all_users: targetAllUsers,
      target_user_roles: selectedRoles.length > 0 ? selectedRoles : undefined,
      target_school_levels: selectedSchoolLevels.length > 0 ? selectedSchoolLevels : undefined,
      target_regions: selectedRegions.length > 0 ? selectedRegions : undefined,
      expires_at: expiresAt || null
    })

    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(true)
      // Reset form
      setTitle("")
      setMessage("")
      setPriority("normal")
      setType("general")
      setTargetAllUsers(false)
      setSelectedRoles([])
      setSelectedSchoolLevels([])
      setSelectedRegions([])
      setExpiresAt("")

      // Auto-hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000)
    }

    setIsLoading(false)
  }

  const removeRole = (role: string) => {
    setSelectedRoles(prev => prev.filter(r => r !== role))
  }

  const removeSchoolLevel = (level: string) => {
    setSelectedSchoolLevels(prev => prev.filter(l => l !== level))
  }

  const removeRegion = (region: string) => {
    setSelectedRegions(prev => prev.filter(r => r !== region))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20">
          <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <p className="text-sm text-emerald-800 dark:text-emerald-300">Notification sent successfully!</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column - Message Details */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-slate-700 dark:text-slate-300">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter notification title"
              required
              className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message" className="text-slate-700 dark:text-slate-300">Message *</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter notification message"
              rows={4}
              required
              className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority" className="text-slate-700 dark:text-slate-300">Priority</Label>
              <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type" className="text-slate-700 dark:text-slate-300">Type</Label>
              <Select value={type} onValueChange={(value: any) => setType(value)}>
                <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="announcement">Announcement</SelectItem>
                  <SelectItem value="deadline">Deadline</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="alert">Alert</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expires" className="text-slate-700 dark:text-slate-300">Expires At (Optional)</Label>
            <Input
              id="expires"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            />
          </div>
        </div>

        {/* Right Column - Targeting */}
        <div className="space-y-4">
          <div>
            <Label className="text-base font-semibold text-slate-800 dark:text-white">Targeting</Label>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Choose who should receive this notification
            </p>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="targetAll"
                  checked={targetAllUsers}
                  onCheckedChange={(checked) => setTargetAllUsers(!!checked)}
                  className="border-slate-300 dark:border-slate-600"
                />
                <Label htmlFor="targetAll" className="font-medium text-slate-700 dark:text-slate-300">
                  All Users
                </Label>
              </div>

              {!targetAllUsers && (
                <>
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">User Roles</Label>
                    <Select onValueChange={(role) => {
                      if (!selectedRoles.includes(role)) {
                        setSelectedRoles([...selectedRoles, role])
                      }
                    }}>
                      <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        <SelectValue placeholder="Add roles" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        {targetingOptions.roles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedRoles.map((role) => (
                        <span
                          key={role}
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700/50"
                        >
                          {role}
                          <button
                            type="button"
                            onClick={() => removeRole(role)}
                            className="ml-1.5 text-purple-500 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-200"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">School Levels</Label>
                    <Select onValueChange={(level) => {
                      if (!selectedSchoolLevels.includes(level)) {
                        setSelectedSchoolLevels([...selectedSchoolLevels, level])
                      }
                    }}>
                      <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        <SelectValue placeholder="Add school levels" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        {targetingOptions.schoolLevels.map((level) => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedSchoolLevels.map((level) => (
                        <span
                          key={level}
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-700/50"
                        >
                          {level}
                          <button
                            type="button"
                            onClick={() => removeSchoolLevel(level)}
                            className="ml-1.5 text-cyan-500 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-200"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">Regions</Label>
                    <Select onValueChange={(region) => {
                      if (!selectedRegions.includes(region)) {
                        setSelectedRegions([...selectedRegions, region])
                      }
                    }}>
                      <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        <SelectValue placeholder="Add regions" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        {targetingOptions.regions.map((region) => (
                          <SelectItem key={region} value={region}>
                            {region}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedRegions.map((region) => (
                        <span
                          key={region}
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50"
                        >
                          {region}
                          <button
                            type="button"
                            onClick={() => removeRegion(region)}
                            className="ml-1.5 text-amber-500 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-200"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
        <Button
          type="submit"
          disabled={isLoading}
          className="flex-1 md:flex-initial bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            "Send Notification"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setTitle("")
            setMessage("")
            setPriority("normal")
            setType("general")
            setTargetAllUsers(false)
            setSelectedRoles([])
            setSelectedSchoolLevels([])
            setSelectedRegions([])
            setExpiresAt("")
            setError("")
            setSuccess(false)
          }}
          className="border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          Clear
        </Button>
      </div>
    </form>
  )
}
