"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"

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
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="w-full sm:w-64">
        <Select 
          value={selectedRegion || "all"} 
          onValueChange={(value) => updateFilter("region", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Filter by region" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Regions</SelectItem>
            {regions.map((region) => (
              <SelectItem key={region.id} value={region.id}>
                {region.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-full sm:w-64">
        <Select 
          value={selectedSchoolLevel || "all"} 
          onValueChange={(value) => updateFilter("schoolLevel", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Filter by school level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All School Levels</SelectItem>
            {schoolLevels.map((level) => (
              <SelectItem key={level.id} value={level.id}>
                {level.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <Button 
          variant="outline" 
          onClick={clearFilters}
          className="whitespace-nowrap"
        >
          Clear Filters
        </Button>
      )}
    </div>
  )
}
