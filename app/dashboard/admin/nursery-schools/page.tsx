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
  GraduationCap,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  Filter
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface School {
  id: string
  name: string
  region_name: string
  has_nursery_class: boolean
}

export default function NurseryClassesPage() {
  const [nurserySchools, setNurserySchools] = useState<School[]>([])
  const [filteredNurserySchools, setFilteredNurserySchools] = useState<School[]>([])
  const [availableSchools, setAvailableSchools] = useState<School[]>([])
  const [filteredSchools, setFilteredSchools] = useState<School[]>([])
  const [selectedSchools, setSelectedSchools] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [nurserySearchTerm, setNurserySearchTerm] = useState("")
  const [nurseryRegionFilter, setNurseryRegionFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [processing, setProcessing] = useState(false)
  
  // Pagination state for nursery schools list
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  
  // Get unique regions for filter
  const uniqueRegions = Array.from(new Set(nurserySchools.map(school => school.region_name))).sort()

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    filterSchools()
  }, [searchTerm, availableSchools])

  useEffect(() => {
    filterNurserySchools()
  }, [nurserySearchTerm, nurseryRegionFilter, nurserySchools])

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
    // Reset selection when filtering
    setSelectedSchools([])
  }

  const filterNurserySchools = () => {
    let filtered = nurserySchools

    // Apply search filter
    if (nurserySearchTerm.trim()) {
      filtered = filtered.filter(school =>
        school.name.toLowerCase().includes(nurserySearchTerm.toLowerCase()) ||
        school.region_name.toLowerCase().includes(nurserySearchTerm.toLowerCase())
      )
    }

    // Apply region filter
    if (nurseryRegionFilter !== "all") {
      filtered = filtered.filter(school => school.region_name === nurseryRegionFilter)
    }

    setFilteredNurserySchools(filtered)
    setCurrentPage(1) // Reset to first page when filtering
  }

  // Get paginated data
  const getPaginatedNurserySchools = () => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredNurserySchools.slice(startIndex, endIndex)
  }

  const totalPages = Math.ceil(filteredNurserySchools.length / itemsPerPage)

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const toggleSchoolSelection = (schoolId: string) => {
    setSelectedSchools(prev => 
      prev.includes(schoolId) 
        ? prev.filter(id => id !== schoolId)
        : [...prev, schoolId]
    )
  }

  const toggleSelectAll = () => {
    if (selectedSchools.length === filteredSchools.length) {
      setSelectedSchools([])
    } else {
      setSelectedSchools(filteredSchools.map(school => school.id))
    }
  }

  const handleAddSelectedSchools = async () => {
    if (selectedSchools.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select at least one school to add",
        variant: "destructive"
      })
      return
    }

    try {
      setProcessing(true)
      const promises = selectedSchools.map(schoolId => 
        updateSchoolNurseryStatus(schoolId, true)
      )
      
      const results = await Promise.all(promises)
      const failed = results.filter(result => !result.success)
      
      if (failed.length === 0) {
        toast({
          title: "Success",
          description: `${selectedSchools.length} school(s) marked as having nursery classes`,
        })
        await loadData()
        setDialogOpen(false)
        setSearchTerm("")
        setSelectedSchools([])
      } else {
        toast({
          title: "Partial Success",
          description: `${results.length - failed.length} schools updated successfully, ${failed.length} failed`,
          variant: "destructive"
        })
        await loadData()
        setSelectedSchools([])
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
            <GraduationCap className="h-6 w-6 text-blue-600" />
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
              {/* Search and Bulk Actions */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search schools by name or region..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                {/* Bulk Actions */}
                {filteredSchools.length > 0 && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleSelectAll}
                        className="flex items-center gap-2"
                      >
                        {selectedSchools.length === filteredSchools.length ? (
                          <CheckSquare className="h-4 w-4" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                        {selectedSchools.length === filteredSchools.length ? 'Deselect All' : 'Select All'}
                      </Button>
                      {selectedSchools.length > 0 && (
                        <span className="text-sm text-gray-600">
                          {selectedSchools.length} selected
                        </span>
                      )}
                    </div>
                    
                    {selectedSchools.length > 0 && (
                      <Button
                        onClick={handleAddSelectedSchools}
                        disabled={processing}
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add Selected ({selectedSchools.length})
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Schools List */}
              <div className="max-h-96 overflow-y-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Select</TableHead>
                      <TableHead>School Name</TableHead>
                      <TableHead>Region</TableHead>
                      <TableHead className="w-24">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSchools.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                          {searchTerm ? "No schools found matching your search" : "No schools available to add"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSchools.map((school) => (
                        <TableRow key={school.id}>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleSchoolSelection(school.id)}
                              className="p-1 h-8 w-8"
                            >
                              {selectedSchools.includes(school.id) ? (
                                <CheckSquare className="h-4 w-4 text-blue-600" />
                              ) : (
                                <Square className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
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
            <GraduationCap className="h-8 w-8 text-blue-400" />
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
          
          {/* Search and Filter Controls */}
          {nurserySchools.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search schools by name or region..."
                  value={nurserySearchTerm}
                  onChange={(e) => setNurserySearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <Select value={nurseryRegionFilter} onValueChange={setNurseryRegionFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Regions</SelectItem>
                    {uniqueRegions.map((region) => (
                      <SelectItem key={region} value={region}>
                        {region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {nurserySchools.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <GraduationCap className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-lg font-medium mb-2">No nursery schools configured</p>
              <p className="text-sm">Click "Add Nursery Class" to get started</p>
            </div>
          ) : filteredNurserySchools.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Search className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-lg font-medium mb-2">No schools found</p>
              <p className="text-sm">Try adjusting your search or filter criteria</p>
            </div>
          ) : (
            <>
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
                  {getPaginatedNurserySchools().map((school) => (
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
                          <GraduationCap className="h-3 w-3 mr-1" />
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
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-500">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to{" "}
                    {Math.min(currentPage * itemsPerPage, filteredNurserySchools.length)} of{" "}
                    {filteredNurserySchools.length} schools
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNumber: number;
                        if (totalPages <= 5) {
                          pageNumber = i + 1;
                        } else if (currentPage <= 3) {
                          pageNumber = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNumber = totalPages - 4 + i;
                        } else {
                          pageNumber = currentPage - 2 + i;
                        }
                        
                        return (
                          <Button
                            key={pageNumber}
                            variant={currentPage === pageNumber ? "default" : "outline"}
                            size="sm"
                            onClick={() => goToPage(pageNumber)}
                            className="w-8 h-8 p-0"
                          >
                            {pageNumber}
                          </Button>
                        );
                      })}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-1"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
