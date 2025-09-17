"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createUser, updateUser } from "@/app/actions/admin"
import { toast } from "@/components/ui/use-toast"
import { SchoolSearch } from "@/components/school-search"

interface UserFormProps {
  user?: any
  roles: any[]
  regions: any[]
  schools: any[]
  isEditing?: boolean
}

export function UserForm({ user, roles, regions, schools, isEditing = false }: UserFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedRole, setSelectedRole] = useState(user?.role_id || "")
  const [selectedSchoolId, setSelectedSchoolId] = useState(user?.school_id || "")

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)

    const formData = new FormData(event.currentTarget)
    
    // Add the selected school ID to form data if Head Teacher role is selected
    if (isHeadTeacher && selectedSchoolId) {
      formData.append('school_id', selectedSchoolId)
    }

    try {
      const result = isEditing ? await updateUser(user.id, formData) : await createUser(formData)

      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      toast({
        title: isEditing ? "User updated" : "User created",
        description: isEditing ? "The user has been updated successfully." : "The user has been created successfully.",
      })

      router.push("/dashboard/admin/users")
    } catch (error) {
      console.error("Error submitting form:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }

  const isHeadTeacher = selectedRole === roles.find((r) => r.name === "Head Teacher")?.id
  const isRegionalOfficer = selectedRole === roles.find((r) => r.name === "Regional Officer")?.id

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" name="name" defaultValue={user?.name || ""} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" name="email" type="email" defaultValue={user?.email || ""} required />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select name="role_id" defaultValue={user?.role_id || ""} onValueChange={setSelectedRole} required>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{isEditing ? "Password (leave blank to keep current)" : "Password"}</Label>
            <Input id="password" name="password" type="password" required={!isEditing} />
          </div>
        </div>

        {isHeadTeacher && (
          <div className="space-y-2">
            <Label htmlFor="school">School</Label>
            <SchoolSearch
              schools={schools}
              value={selectedSchoolId}
              onChange={setSelectedSchoolId}
              placeholder="Search for a school..."
              showRegion={true}
              maxResults={20}
            />
          </div>
        )}

        {isRegionalOfficer && (
          <div className="space-y-2">
            <Label htmlFor="region">Region</Label>
            <Select name="region" defaultValue={user?.region || ""} required>
              <SelectTrigger>
                <SelectValue placeholder="Select region" />
              </SelectTrigger>
              <SelectContent>
                {regions.map((region) => (
                  <SelectItem key={region.id} value={region.name}>
                    {region.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/dashboard/admin/users")}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : isEditing ? "Update User" : "Create User"}
        </Button>
      </div>
    </form>
  )
}
