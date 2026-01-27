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
            <Label htmlFor="name" className="text-slate-700 dark:text-slate-300">Full Name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={user?.name || ""}
              required
              className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">Email Address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={user?.email || ""}
              required
              className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="role" className="text-slate-700 dark:text-slate-300">Role</Label>
            <Select name="role_id" defaultValue={user?.role_id || ""} onValueChange={setSelectedRole} required>
              <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-700 dark:text-slate-300">
              {isEditing ? "Password (leave blank to keep current)" : "Password"}
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              required={!isEditing}
              className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            />
          </div>
        </div>

        {isHeadTeacher && (
          <div className="space-y-2">
            <Label htmlFor="school" className="text-slate-700 dark:text-slate-300">School</Label>
            <SchoolSearch
              schools={schools}
              value={selectedSchoolId}
              onChange={setSelectedSchoolId}
              placeholder="Search for a school..."
              showRegion={true}
              maxResults={2000}
            />
          </div>
        )}

        {isRegionalOfficer && (
          <div className="space-y-2">
            <Label htmlFor="region" className="text-slate-700 dark:text-slate-300">Region</Label>
            <Select name="region" defaultValue={user?.region || ""} required>
              <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <SelectValue placeholder="Select region" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                {regions.map((region) => (
                  <SelectItem key={region.id} value={region.id}>
                    {region.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/dashboard/admin/users")}
          disabled={isLoading}
          className="border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25"
        >
          {isLoading ? "Saving..." : isEditing ? "Update User" : "Create User"}
        </Button>
      </div>
    </form>
  )
}
