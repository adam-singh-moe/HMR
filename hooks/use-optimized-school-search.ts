import { useState, useMemo } from "react";
import { useDebounceValue } from "./use-debounced-search";

interface School {
  id: string;
  name: string;
  region_id?: string;
  region_name?: string;
  sms_regions?: {
    id: string;
    name: string;
  } | {
    id: string;
    name: string;
  }[];
}

interface Report {
  id: string;
  school_id: string;
  sms_schools?: {
    id: string;
    name: string;
    region_id: string;
    sms_regions?: {
      id: string;
      name: string;
    } | {
      id: string;
      name: string;
    }[];
  };
  [key: string]: any;
}

interface UseOptimizedSchoolSearchOptions {
  schools?: School[];
  reports?: Report[];
  maxResults?: number;
  searchFields?: ("name" | "region")[];
  debounceMs?: number;
  enableFirstLetterSearch?: boolean;
}

export function useOptimizedSchoolSearch({
  schools = [],
  reports = [],
  maxResults = 2000,
  searchFields = ["name", "region"],
  debounceMs = 300,
  enableFirstLetterSearch = true,
}: UseOptimizedSchoolSearchOptions = {}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedValue, setSelectedValue] = useState("");

  const debouncedSearchQuery = useDebounceValue(searchQuery, debounceMs);

  // Helper function to get region name from different structures
  const getRegionName = (item: School | Report): string => {
    if ('region_name' in item && item.region_name) {
      return item.region_name;
    }
    
    if ('sms_regions' in item && item.sms_regions) {
      // Handle both single object and array cases
      if (Array.isArray(item.sms_regions)) {
        return item.sms_regions[0]?.name || "";
      } else {
        return item.sms_regions.name || "";
      }
    }

    // For reports, check nested sms_schools
    if ('sms_schools' in item && item.sms_schools?.sms_regions) {
      const regions = item.sms_schools.sms_regions;
      if (Array.isArray(regions)) {
        return regions[0]?.name || "";
      } else {
        return regions.name || "";
      }
    }

    return "";
  };

  // Helper function to get school name
  const getSchoolName = (item: School | Report): string => {
    if ('name' in item) {
      return item.name;
    }
    
    if ('sms_schools' in item && item.sms_schools?.name) {
      return item.sms_schools.name;
    }

    return "";
  };

  // Helper function to get school ID
  const getSchoolId = (item: School | Report): string => {
    if ('id' in item && !('school_id' in item)) {
      return item.id; // This is a School
    }
    
    if ('school_id' in item) {
      return item.school_id; // This is a Report
    }

    return "";
  };

  // Combine and normalize data from both schools and reports
  const normalizedData = useMemo(() => {
    const schoolsData = schools.map(school => ({
      id: school.id,
      name: school.name,
      regionName: getRegionName(school),
      type: 'school' as const
    }));

    const reportsData = reports.map(report => ({
      id: getSchoolId(report),
      name: getSchoolName(report),
      regionName: getRegionName(report),
      type: 'report' as const,
      report
    }));

    // Combine and deduplicate by school ID
    const combined = [...schoolsData, ...reportsData];
    const unique = combined.filter((item, index, self) => 
      index === self.findIndex(other => other.id === item.id)
    );

    return unique;
  }, [schools, reports]);

  // Optimized filtering with first-letter prioritization
  const filteredResults = useMemo(() => {
    if (!debouncedSearchQuery.trim()) {
      return normalizedData.slice(0, maxResults);
    }

    const query = debouncedSearchQuery.toLowerCase().trim();
    const matches: Array<{ item: typeof normalizedData[0], score: number }> = [];

    normalizedData.forEach(item => {
      let score = 0;
      let hasMatch = false;

      if (searchFields.includes("name")) {
        const schoolName = item.name.toLowerCase();
        
        if (enableFirstLetterSearch && schoolName.startsWith(query)) {
          // Highest priority: starts with query
          score += 100;
          hasMatch = true;
        } else if (schoolName.includes(query)) {
          // Lower priority: contains query
          score += 50;
          hasMatch = true;
        }
        
        // Bonus for exact word matches
        const words = schoolName.split(' ');
        if (words.some(word => word.startsWith(query))) {
          score += 25;
        }
      }

      if (searchFields.includes("region")) {
        const regionName = item.regionName.toLowerCase();
        
        if (enableFirstLetterSearch && regionName.startsWith(query)) {
          score += 75;
          hasMatch = true;
        } else if (regionName.includes(query)) {
          score += 25;
          hasMatch = true;
        }
      }

      if (hasMatch) {
        matches.push({ item, score });
      }
    });

    // Sort by score (highest first) and limit results
    return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map(match => match.item);
  }, [debouncedSearchQuery, normalizedData, maxResults, searchFields, enableFirstLetterSearch]);

  const handleSelect = (id: string) => {
    const selected = normalizedData.find(item => item.id === id);
    if (selected) {
      setSelectedValue(id);
      setSearchQuery(selected.name);
      setShowDropdown(false);
    }
  };

  const handleClear = () => {
    setSearchQuery("");
    setSelectedValue("");
    setShowDropdown(false);
  };

  const getSelectedItem = () => {
    return normalizedData.find(item => item.id === selectedValue);
  };

  return {
    // Input management
    searchQuery,
    setSearchQuery,
    selectedValue,
    setSelectedValue,
    
    // Dropdown management
    showDropdown,
    setShowDropdown,
    
    // Results
    filteredResults,
    
    // Actions
    handleSelect,
    handleClear,
    getSelectedItem,
    
    // State indicators
    isSearching: searchQuery !== debouncedSearchQuery,
    hasResults: filteredResults.length > 0,
    
    // Utilities
    normalizedData,
  };
}
