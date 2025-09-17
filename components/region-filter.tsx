import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MapPin } from "lucide-react"

interface Region {
  id: string
  name: string
}

interface RegionFilterProps {
  regions: Region[]
  selectedRegion: string
  onRegionChange: (regionId: string) => void
  disabled?: boolean
}

export function RegionFilter({ 
  regions, 
  selectedRegion, 
  onRegionChange, 
  disabled = false 
}: RegionFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <MapPin className="w-4 h-4 text-gray-500" />
      <Select 
        value={selectedRegion} 
        onValueChange={onRegionChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-48">
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
  )
}
