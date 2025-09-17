import { getRegions } from "@/app/actions/admin"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default async function RegionsPage() {
  const { regions, error } = await getRegions(1, 100) // Get all regions without pagination

  if (error) {
    return (
      <div className="space-y-4 lg:space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h2 className="text-xl lg:text-2xl font-bold">Regions</h2>
        </div>
        <div className="text-center py-8 text-red-600">
          Error loading regions: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-xl lg:text-2xl font-bold">Regions</h2>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Code</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {regions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                    No regions found
                  </TableCell>
                </TableRow>
              ) : (
                regions.map((region) => (
                  <TableRow key={region.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div>{region.name}</div>
                        <div className="text-xs text-muted-foreground sm:hidden">
                          Code: {region.code || "N/A"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{region.code || "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
