"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { MapPin, GraduationCap, X } from "lucide-react"

interface SchoolFiltersProps {
  regions: any[]
  schoolLevels: any[]
  selectedRegion: string
  selectedSchoolLevel: string
  baseUrl: string
}

export function SchoolFilters({
  regions,
  schoolLevels,
  selectedRegion,
  selectedSchoolLevel,
  baseUrl
}: SchoolFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams)
    params.set("page", "1") // Reset to first page when filtering

    if (value && value !== "all") {
      params.set(key, value)
    } else {
      params.delete(key)
    }

    router.push(`${baseUrl}?${params.toString()}`)
  }

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams)
    params.delete("region")
    params.delete("schoolLevel")
    params.delete("search")
    params.set("page", "1")

    router.push(`${baseUrl}?${params.toString()}`)
  }

  const hasActiveFilters = selectedRegion || selectedSchoolLevel || searchParams.get("search")

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Region Filter */}
      <Select
        value={selectedRegion || "all"}
        onValueChange={(value) => updateFilter("region", value)}
      >
        <SelectTrigger className="w-[160px] h-9 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-slate-400" />
            <SelectValue placeholder="All Regions" />
          </div>
        </SelectTrigger>
        <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <SelectItem value="all">All Regions</SelectItem>
          {regions.map((region) => (
            <SelectItem key={region.id} value={region.id}>
              {region.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* School Level Filter */}
      <Select
        value={selectedSchoolLevel || "all"}
        onValueChange={(value) => updateFilter("schoolLevel", value)}
      >
        <SelectTrigger className="w-[180px] h-9 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-sm">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-3.5 w-3.5 text-slate-400" />
            <SelectValue placeholder="All School Levels" />
          </div>
        </SelectTrigger>
        <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <SelectItem value="all">All School Levels</SelectItem>
          {schoolLevels.map((level) => (
            <SelectItem key={level.id} value={level.id}>
              {level.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="h-9 px-3 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="h-3.5 w-3.5 mr-1" />
          Clear
        </Button>
      )}
    </div>
  )
}
