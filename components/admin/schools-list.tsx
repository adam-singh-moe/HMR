import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { School, MapPin, Phone, Mail } from "lucide-react"
import { SchoolWithRegion } from "@/types"

interface SchoolsListProps {
  schools: SchoolWithRegion[]
  error: string | null
}

export function SchoolsList({ schools, error }: SchoolsListProps) {
  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-800 flex items-center gap-2">
            <School className="h-5 w-5" />
            Schools List
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-700">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (schools.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <School className="h-5 w-5" />
            Schools List
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No schools found.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <School className="h-5 w-5" />
          Schools List ({schools.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {schools.map((school) => (
            <div
              key={school.id}
              className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div>
                    <h4 className="font-semibold text-sm">{school.name}</h4>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>{school.region_name}</span>
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    <span>Created: {new Date(school.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
