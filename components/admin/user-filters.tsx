"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { X, Check, ChevronsUpDown, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"

interface UserFiltersProps {
  schools: { id: string; name: string }[]
  currentSchool: string
}

export function UserFilters({ schools, currentSchool }: UserFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [schoolOpen, setSchoolOpen] = useState(false)

  const selectedSchool = schools.find((school) => school.id === currentSchool)

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())

    if (value && value !== "all") {
      params.set(key, value)
    } else {
      params.delete(key)
    }

    // Reset to page 1 when filters change
    params.set("page", "1")

    router.push(`/dashboard/admin/users?${params.toString()}`)
  }

  const clearFilter = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("school")
    params.set("page", "1")
    router.push(`/dashboard/admin/users?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* School Filter - Searchable Combobox */}
      <Popover open={schoolOpen} onOpenChange={setSchoolOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={schoolOpen}
            className="w-[220px] h-9 justify-between bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-sm font-normal hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <div className="flex items-center gap-2 truncate">
              <Building2 className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
              <span className="truncate">
                {selectedSchool ? selectedSchool.name : "All Schools"}
              </span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700" align="start">
          <Command className="bg-transparent">
            <CommandInput
              placeholder="Search schools..."
              className="h-9 border-slate-200 dark:border-slate-700"
            />
            <CommandList>
              <CommandEmpty className="py-4 text-sm text-slate-500 dark:text-slate-400">
                No school found.
              </CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="all"
                  onSelect={() => {
                    updateFilter("school", "all")
                    setSchoolOpen(false)
                  }}
                  className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      !currentSchool ? "opacity-100" : "opacity-0"
                    )}
                  />
                  All Schools
                </CommandItem>
                {schools.map((school) => (
                  <CommandItem
                    key={school.id}
                    value={school.name}
                    onSelect={() => {
                      updateFilter("school", school.id)
                      setSchoolOpen(false)
                    }}
                    className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        currentSchool === school.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{school.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Clear Filter Button */}
      {currentSchool && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilter}
          className="h-9 px-3 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="h-3.5 w-3.5 mr-1" />
          Clear
        </Button>
      )}
    </div>
  )
}
