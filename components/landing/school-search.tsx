"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { searchPublicSchools } from "@/app/actions/public-reports"
import { Search, Loader2, X } from "lucide-react"

interface SearchResult {
  schoolId: string
  schoolName: string
  regionName: string
  reportId: string
  totalScore: number
  ratingLevel: string
  academicYear: string
  termName: string
  submittedAt: string
}

interface SchoolSearchProps {
  onSearchResults?: (results: SearchResult[]) => void
  onSearchClear?: () => void
}

export function SchoolSearch({ onSearchResults, onSearchClear }: SchoolSearchProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [hasResults, setHasResults] = useState(false)

  // Debounced search
  const performSearch = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      setIsSearching(false)
      setHasResults(false)
      onSearchClear?.()
      return
    }

    setIsSearching(true)
    try {
      const result = await searchPublicSchools(query)
      // Limit to top 3 results for carousel display
      const topThree = (result.schools || []).slice(0, 3)
      setHasResults(topThree.length > 0)
      onSearchResults?.(topThree)
    } catch (error) {
      console.error('Search error:', error)
      setHasResults(false)
      onSearchClear?.()
    } finally {
      setIsSearching(false)
    }
  }, [onSearchResults, onSearchClear])

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, performSearch])

  const handleClear = () => {
    setSearchQuery("")
    setHasResults(false)
    onSearchClear?.()
  }

  const handleCollapse = () => {
    setIsExpanded(false)
    setSearchQuery("")
    setHasResults(false)
    onSearchClear?.()
  }

  if (!isExpanded) {
    return (
      <div className="flex justify-center">
        <Button
          size="lg"
          onClick={() => setIsExpanded(true)}
          className="group px-8 py-6 text-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-300"
        >
          <Search className="mr-2 h-5 w-5" />
          Search School Scores
        </Button>
      </div>
    )
  }

  // Compact view when results are showing
  if (hasResults) {
    return (
      <div className="w-full max-w-3xl mx-auto">
        <div className="relative">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/5 border border-purple-500/20">
            <Search className="h-4 w-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
            <Input
              type="text"
              placeholder="Refine search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 h-8 text-sm border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-2"
            />
            {searchQuery && (
              <button
                onClick={handleClear}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCollapse}
              className="h-8 px-3 text-xs flex-shrink-0"
            >
              Cancel
            </Button>
          </div>
          
          {isSearching && (
            <div className="absolute left-0 right-0 top-full mt-1 flex justify-center">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                Updating...
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Full search bar when no results yet
  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Search Bar */}
      <div className="relative">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search for a school... (results will appear above)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-12 h-14 text-lg border-2 border-slate-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 rounded-xl shadow-sm bg-white dark:bg-slate-900"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={handleClear}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          <Button
            variant="outline"
            size="lg"
            onClick={handleCollapse}
            className="h-14 px-6 border-2"
          >
            Cancel
          </Button>
        </div>

        {/* Loading Indicator */}
        {isSearching && (
          <div className="absolute left-0 right-0 top-full mt-2 flex justify-center">
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
