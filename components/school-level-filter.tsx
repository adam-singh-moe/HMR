"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"

interface SchoolLevelFilterProps {
  selectedLevel: string
  onLevelChange: (level: string) => void
  disabled?: boolean
}

const SCHOOL_LEVELS = [
  { value: "all", label: "All Levels" },
  { value: "Primary", label: "Primary" },
  { value: "Secondary", label: "Secondary" },
  { value: "Nursery", label: "Nursery" },
  { value: "Post Secondary", label: "Post Secondary" },
  { value: "Practical Instruction Centre", label: "Practical Instruction Centre" },
  { value: "Technical Institutes", label: "Technical Institutes" },
  { value: "Special Education Needs", label: "Special Education Needs" }
]

export function SchoolLevelFilter({ selectedLevel, onLevelChange, disabled }: SchoolLevelFilterProps) {
  const selectedLevelLabel = SCHOOL_LEVELS.find(level => level.value === selectedLevel)?.label

  const handleLevelChange = (value: string) => {
    // Convert "all" back to empty string for the parent component
    onLevelChange(value === "all" ? "" : value)
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedLevel || "all"} onValueChange={handleLevelChange} disabled={disabled}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Filter by school level" />
        </SelectTrigger>
        <SelectContent>
          {SCHOOL_LEVELS.map((level) => (
            <SelectItem key={level.value} value={level.value}>
              {level.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
