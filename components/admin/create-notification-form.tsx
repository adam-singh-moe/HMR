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
import { Badge } from "@/components/ui/badge"
import { X, Plus } from "lucide-react"
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
      console.log('Targeting options result:', result)
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
        <div className="text-red-600 bg-red-50 p-3 rounded border">
          {error}
        </div>
      )}

      {success && (
        <div className="text-green-600 bg-green-50 p-3 rounded border">
          Notification sent successfully!
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter notification title"
              required
            />
          </div>

          <div>
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter notification message"
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="type">Type</Label>
              <Select value={type} onValueChange={(value: any) => setType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="announcement">Announcement</SelectItem>
                  <SelectItem value="deadline">Deadline</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="alert">Alert</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="expires">Expires At (Optional)</Label>
            <Input
              id="expires"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-base font-semibold">Targeting</Label>
            <p className="text-sm text-muted-foreground mb-4">
              Choose who should receive this notification
            </p>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="targetAll"
                  checked={targetAllUsers}
                  onCheckedChange={(checked) => setTargetAllUsers(!!checked)}
                />
                <Label htmlFor="targetAll" className="font-medium">
                  All Users
                </Label>
              </div>

              {!targetAllUsers && (
                <>
                  <div>
                    <Label>User Roles</Label>
                    <Select onValueChange={(role) => {
                      if (!selectedRoles.includes(role)) {
                        setSelectedRoles([...selectedRoles, role])
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Add roles" />
                      </SelectTrigger>
                      <SelectContent>
                        {targetingOptions.roles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedRoles.map((role) => (
                        <Badge key={role} variant="secondary">
                          {role}
                          <button
                            type="button"
                            onClick={() => removeRole(role)}
                            className="ml-2 text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>School Levels</Label>
                    <Select onValueChange={(level) => {
                      if (!selectedSchoolLevels.includes(level)) {
                        setSelectedSchoolLevels([...selectedSchoolLevels, level])
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Add school levels" />
                      </SelectTrigger>
                      <SelectContent>
                        {targetingOptions.schoolLevels.map((level) => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedSchoolLevels.map((level) => (
                        <Badge key={level} variant="secondary">
                          {level}
                          <button
                            type="button"
                            onClick={() => removeSchoolLevel(level)}
                            className="ml-2 text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Regions</Label>
                    <Select onValueChange={(region) => {
                      if (!selectedRegions.includes(region)) {
                        setSelectedRegions([...selectedRegions, region])
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Add regions" />
                      </SelectTrigger>
                      <SelectContent>
                        {targetingOptions.regions.map((region) => (
                          <SelectItem key={region} value={region}>
                            {region}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedRegions.map((region) => (
                        <Badge key={region} variant="secondary">
                          {region}
                          <button
                            type="button"
                            onClick={() => removeRegion(region)}
                            className="ml-2 text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={isLoading} className="flex-1 md:flex-initial">
          {isLoading ? "Sending..." : "Send Notification"}
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
        >
          Clear
        </Button>
      </div>
    </form>
  )
}