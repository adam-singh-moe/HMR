"use client"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Check, Search, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { searchAvailableSchools } from "@/app/actions/available-schools"

interface AvailableSchool {
  id: string
  name: string
  region_id: string
  region_name?: string
  sms_regions?: {
    id: string
    name: string
  }
}

interface AvailableSchoolSearchProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  maxResults?: number
  debounceMs?: number
  showRegion?: boolean
  allowClear?: boolean
  required?: boolean
}

export function AvailableSchoolSearch({
  value,
  onChange,
  disabled = false,
  placeholder = "Search available schools...",
  maxResults = 2000,
  debounceMs = 300,
  showRegion = true,
  allowClear = true,
  required = false,
}: AvailableSchoolSearchProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  const [searchQuery, setSearchQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [schools, setSchools] = useState<AvailableSchool[]>([])
  const [selectedSchool, setSelectedSchool] = useState<AvailableSchool | null>(null)
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null)

  // Handle search with debouncing
  const performSearch = async (query: string) => {
    setIsLoading(true)
    try {
      const result = await searchAvailableSchools(query, maxResults)
      if (result.error) {
        console.error("Error searching schools:", result.error)
        setSchools([])
      } else {
        setSchools(result.schools)
      }
    } catch (error) {
      console.error("Error in school search:", error)
      setSchools([])
    } finally {
      setIsLoading(false)
    }
  }

  // Debounced search effect
  useEffect(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    if (searchQuery.trim() || !selectedSchool) {
      const timer = setTimeout(() => {
        performSearch(searchQuery)
      }, debounceMs)
      
      setDebounceTimer(timer)
    }

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
    }
  }, [searchQuery])

  // Initialize with selected school
  useEffect(() => {
    if (value && !selectedSchool) {
      // Find school by ID from the current schools list
      const school = schools.find(s => s.id === value)
      if (school) {
        setSelectedSchool(school)
        setSearchQuery(school.name)
      }
    }
  }, [value, schools])

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    
    if (!query.trim()) {
      setSelectedSchool(null)
      onChange("")
    }
    
    if (!isOpen) setIsOpen(true)
  }

  const handleSelectSchool = (school: AvailableSchool) => {
    setSelectedSchool(school)
    setSearchQuery(school.name)
    onChange(school.id)
    setIsOpen(false)
  }

  const handleClear = () => {
    setSelectedSchool(null)
    setSearchQuery("")
    onChange("")
    setIsOpen(false)
    inputRef.current?.focus()
  }

  const handleInputFocus = () => {
    setIsOpen(true)
    if (!searchQuery.trim() && schools.length === 0) {
      performSearch("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={cn(
            "pl-10 pr-10",
            selectedSchool && "text-foreground font-medium"
          )}
        />
        {searchQuery && allowClear && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted"
            onClick={handleClear}
            disabled={disabled}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-[300px] overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">Searching schools...</span>
            </div>
          ) : schools.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-muted-foreground">
                {searchQuery.trim() ? "No available schools found" : "No schools available"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Schools with assigned head teachers are not shown
              </p>
            </div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto">
              {schools.map((school) => (
                <button
                  key={school.id}
                  type="button"
                  className={cn(
                    "w-full text-left px-4 py-3 hover:bg-accent hover:text-accent-foreground transition-colors",
                    "flex items-center justify-between",
                    selectedSchool?.id === school.id && "bg-accent text-accent-foreground"
                  )}
                  onClick={() => handleSelectSchool(school)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {school.name}
                    </div>
                    {showRegion && school.region_name && (
                      <div className="text-xs text-muted-foreground truncate">
                        {school.region_name}
                      </div>
                    )}
                  </div>
                  {selectedSchool?.id === school.id && (
                    <Check className="h-4 w-4 text-primary ml-2 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
