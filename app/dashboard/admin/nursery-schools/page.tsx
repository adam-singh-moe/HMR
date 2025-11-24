"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import { 
  getNurserySchools, 
  getSchoolsForNurseryAssignment, 
  updateSchoolNurseryStatus 
} from "@/app/actions/admin"
import { 
  Search, 
  Plus, 
  School, 
  MapPin, 
  X,
  Check,
  Baby
} from "lucide-react"

interface School {
  id: string
  name: string
  region_name: string
  has_nursery_class: boolean
}

export default function NurseryClassesPage() {
  const [nurserySchools, setNurserySchools] = useState<School[]>([])
  const [availableSchools, setAvailableSchools] = useState<School[]>([])
  const [filteredSchools, setFilteredSchools] = useState<School[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    filterSchools()
  }, [searchTerm, availableSchools])

  const loadData = async () => {
    try {
      setLoading(true)
      const [nurseryResult, availableResult] = await Promise.all([
        getNurserySchools(),
        getSchoolsForNurseryAssignment()
      ])

      if (nurseryResult.success) {
        setNurserySchools(nurseryResult.schools)
      }

      if (availableResult.success) {
        setAvailableSchools(availableResult.schools)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load schools data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const filterSchools = () => {
    if (!searchTerm.trim()) {
      setFilteredSchools(availableSchools)
    } else {
      const filtered = availableSchools.filter(school =>
        school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        school.region_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredSchools(filtered)
    }
  }

  const handleAddNurseryClass = async (schoolId: string) => {
    try {
      setProcessing(true)
      const result = await updateSchoolNurseryStatus(schoolId, true)
      
      if (result.success) {
        toast({
          title: "Success",
          description: "School marked as having nursery class",
        })
        await loadData()
        setDialogOpen(false)
        setSearchTerm("")
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update school",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleRemoveNurseryClass = async (schoolId: string) => {
    try {
      setProcessing(true)
      const result = await updateSchoolNurseryStatus(schoolId, false)
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Nursery class removed from school",
        })
        await loadData()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update school",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      })
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Nursery Classes Management</h1>
        </div>
        <div className="text-center py-8">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Baby className="h-6 w-6 text-pink-600" />
            Nursery Classes Management
          </h1>
          <p className="text-gray-600 mt-1">
            Manage which schools have nursery classes
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Nursery Class
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Add School with Nursery Class</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search schools by name or region..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Schools List */}
              <div className="max-h-96 overflow-y-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>School Name</TableHead>
                      <TableHead>Region</TableHead>
                      <TableHead className="w-24">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSchools.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                          {searchTerm ? "No schools found matching your search" : "No schools available to add"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSchools.map((school) => (
                        <TableRow key={school.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <School className="h-4 w-4 text-blue-600" />
                              {school.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-gray-400" />
                              {school.region_name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => handleAddNurseryClass(school.id)}
                              disabled={processing}
                              className="flex items-center gap-1"
                            >
                              <Plus className="h-3 w-3" />
                              Add
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Nursery Schools</p>
              <p className="text-3xl font-bold text-pink-600">{nurserySchools.length}</p>
            </div>
            <Baby className="h-8 w-8 text-pink-400" />
          </div>
        </CardContent>
      </Card>

      {/* Nursery Schools List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <School className="h-5 w-5" />
            Schools with Nursery Classes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {nurserySchools.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Baby className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-lg font-medium mb-2">No nursery schools configured</p>
              <p className="text-sm">Click "Add Nursery School" to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>School Name</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nurserySchools.map((school) => (
                  <TableRow key={school.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <School className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">{school.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-gray-400" />
                        {school.region_name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-pink-100 text-pink-800">
                        <Baby className="h-3 w-3 mr-1" />
                        Has Nursery
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRemoveNurseryClass(school.id)}
                        disabled={processing}
                        className="flex items-center gap-1"
                      >
                        <X className="h-3 w-3" />
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}