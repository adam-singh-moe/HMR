"use client"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Check, Search, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useOptimizedSchoolSearch } from "@/hooks/use-optimized-school-search"

interface School {
  id: string
  name: string
  region_id?: string
  region_name?: string
  sms_regions?: {
    id: string
    name: string
  } | {
    id: string
    name: string
  }[]
}

interface Report {
  id: string
  school_id: string
  sms_schools?: {
    id: string
    name: string
    region_id: string
    sms_regions?: {
      id: string
      name: string
    } | {
      id: string
      name: string
    }[]
  }
  [key: string]: any
}

interface OptimizedSchoolSearchProps {
  schools?: School[]
  reports?: Report[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  maxResults?: number
  debounceMs?: number
  showRegion?: boolean
  allowClear?: boolean
}

export function SchoolSearch({
  schools = [],
  reports = [],
  value,
  onChange,
  disabled = false,
  placeholder = "Search schools...",
  maxResults = 20,
  debounceMs = 300,
  showRegion = true,
  allowClear = true,
}: OptimizedSchoolSearchProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [hasUserInput, setHasUserInput] = useState(false)

  const {
    searchQuery,
    setSearchQuery,
    selectedValue,
    setSelectedValue,
    showDropdown,
    setShowDropdown,
    filteredResults,
    handleSelect,
    handleClear,
    getSelectedItem,
    isSearching,
    hasResults,
  } = useOptimizedSchoolSearch({
    schools,
    reports,
    maxResults,
    debounceMs,
    enableFirstLetterSearch: true,
  })

  // Sync with external value
  useEffect(() => {
    if (value !== selectedValue) {
      setSelectedValue(value)
      const selected = [...schools, ...reports.map(r => ({
        id: r.school_id,
        name: r.sms_schools?.name || '',
        region_name: (() => {
          const regions = r.sms_schools?.sms_regions
          if (Array.isArray(regions)) {
            return regions[0]?.name || ""
          } else {
            return regions?.name || ""
          }
        })()
      }))].find(item => item.id === value)
      
      // Only update search query if user hasn't started typing
      if (!hasUserInput && !isFocused) {
        if (selected) {
          setSearchQuery(selected.name)
        } else if (!value) {
          setSearchQuery("")
        }
      }
    }
  }, [value, selectedValue, schools, reports, setSelectedValue, setSearchQuery, hasUserInput, isFocused])

  // Handle selection
  const handleSelectItem = (id: string) => {
    handleSelect(id)
    onChange(id)
    setHasUserInput(false)
    setShowDropdown(false)
    
    // Update search query with selected item name
    const selected = [...schools, ...reports.map(r => ({
      id: r.school_id,
      name: r.sms_schools?.name || '',
      region_name: (() => {
        const regions = r.sms_schools?.sms_regions
        if (Array.isArray(regions)) {
          return regions[0]?.name || ""
        } else {
          return regions?.name || ""
        }
      })()
    }))].find(item => item.id === id)
    
    if (selected) {
      setSearchQuery(selected.name)
    }
  }

  // Handle clear
  const handleClearSelection = () => {
    handleClear()
    onChange("")
    setHasUserInput(false)
    setSearchQuery("")
  }

  // Handle input focus
  const handleInputFocus = () => {
    setIsFocused(true)
    setShowDropdown(true)
    
    // Clear the input when focused to allow typing
    if (selectedValue && !hasUserInput) {
      setSearchQuery("")
    }
  }

  // Handle input blur
  const handleInputBlur = () => {
    setIsFocused(false)
    
    // If no selection was made and user didn't type anything meaningful,
    // restore the selected item name
    setTimeout(() => {
      if (!showDropdown && selectedValue && !hasUserInput) {
        const selected = [...schools, ...reports.map(r => ({
          id: r.school_id,
          name: r.sms_schools?.name || '',
          region_name: (() => {
            const regions = r.sms_schools?.sms_regions
            if (Array.isArray(regions)) {
              return regions[0]?.name || ""
            } else {
              return regions?.name || ""
            }
          })()
        }))].find(item => item.id === selectedValue)
        
        if (selected) {
          setSearchQuery(selected.name)
        }
      }
    }, 150) // Small delay to allow for clicks
  }

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setSearchQuery(newValue)
    setHasUserInput(true)
    setShowDropdown(true)
    
    // Clear selection if input is cleared
    if (newValue === "" && selectedValue) {
      onChange("")
    }
  }

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
        setHasUserInput(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [setShowDropdown])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowDropdown(false)
      setHasUserInput(false)
      inputRef.current?.blur()
    }
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </div>
        
        <Input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "pl-10",
            allowClear && searchQuery && "pr-10",
            "border-primary-200 focus:border-primary-500 transition-colors"
          )}
        />
        
        {allowClear && searchQuery && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearSelection}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Hidden input to store the actual value for forms */}
      <input type="hidden" name="school" value={selectedValue} />

      {/* Dropdown Results */}
      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-hidden">
          {isSearching ? (
            <div className="px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </div>
          ) : hasResults ? (
            <div className="overflow-y-auto max-h-60">
              <ul className="py-1">
                {filteredResults.map((item) => (
                  <li
                    key={item.id}
                    onClick={() => handleSelectItem(item.id)}
                    className={cn(
                      "px-3 py-2 text-sm cursor-pointer flex items-center justify-between",
                      "hover:bg-primary-50 transition-colors",
                      item.id === selectedValue ? "bg-primary-50 text-primary-700" : "text-gray-900"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{item.name}</div>
                      {showRegion && item.regionName && (
                        <div className="text-xs text-muted-foreground truncate">
                          {item.regionName}
                        </div>
                      )}
                    </div>
                    {item.id === selectedValue && (
                      <Check className="h-4 w-4 text-primary-600 flex-shrink-0 ml-2" />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : searchQuery ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No schools found matching "{searchQuery}"
            </div>
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Start typing to search schools...
            </div>
          )}
        </div>
      )}
    </div>
  )
}
