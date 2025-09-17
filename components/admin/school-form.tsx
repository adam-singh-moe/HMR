"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createSchool, updateSchool } from "@/app/actions/admin"
import { toast } from "@/components/ui/use-toast"

interface SchoolFormProps {
  school?: any
  regions: any[]
  schoolLevels?: any[]
  isEditing?: boolean
}

export function SchoolForm({ school, regions, schoolLevels = [], isEditing = false }: SchoolFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)

    const formData = new FormData(event.currentTarget)

    try {
      const result = isEditing ? await updateSchool(school.id, formData) : await createSchool(formData)

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
        title: isEditing ? "School updated" : "School created",
        description: isEditing
          ? "The school has been updated successfully."
          : "The school has been created successfully.",
      })

      router.push("/dashboard/admin/schools")
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">School Name</Label>
            <Input id="name" name="name" defaultValue={school?.name || ""} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">School Code</Label>
            <Input 
              id="code" 
              name="code" 
              defaultValue={school?.code || ""} 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="region">Region</Label>
            <Select name="region_id" defaultValue={school?.region_id || ""} required>
              <SelectTrigger>
                <SelectValue placeholder="Select region" />
              </SelectTrigger>
              <SelectContent>
                {regions.map((region) => (
                  <SelectItem key={region.id} value={region.id}>
                    {region.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="school_level">School Level</Label>
            <Select name="school_level_id" defaultValue={school?.school_level_id || ""} required>
              <SelectTrigger>
                <SelectValue placeholder="Select school level" />
              </SelectTrigger>
              <SelectContent>
                {schoolLevels.map((level) => (
                  <SelectItem key={level.id} value={level.id}>
                    {level.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="grade">Grade</Label>
            <Select name="grade" defaultValue={school?.grade || ""}>
              <SelectTrigger>
                <SelectValue placeholder="Select grade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">A</SelectItem>
                <SelectItem value="B">B</SelectItem>
                <SelectItem value="C">C</SelectItem>
                <SelectItem value="D">D</SelectItem>
                <SelectItem value="E">E</SelectItem>
                <SelectItem value="O">O</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/dashboard/admin/schools")}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : isEditing ? "Update School" : "Create School"}
        </Button>
      </div>
    </form>
  )
}
