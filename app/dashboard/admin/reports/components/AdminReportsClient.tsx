"use client"

import { useState, useTransition } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Eye, Download, Search, Filter, FileText, Inbox } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

interface Report {
  id: string
  school_id: string
  school_name: string
  region: string
  month: string
  year: number
  head_teacher_name: string
  submitted_at: string
  status: 'submitted' | 'pending' | 'reviewed'
}

interface Region {
  id: string
  name: string
}

interface AdminReportsClientProps {
  reports?: Report[]
  totalPages?: number
  currentPage?: number
  regions?: Region[]
}

export function AdminReportsClient({ reports = [], totalPages = 0, currentPage = 1, regions = [] }: AdminReportsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [selectedRegion, setSelectedRegion] = useState(searchParams.get('region') || 'all')
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get('status') || 'all')

  const handleSearch = () => {
    startTransition(() => {
      const params = new URLSearchParams()
      if (searchTerm) params.set('search', searchTerm)
      if (selectedRegion !== 'all') params.set('region', selectedRegion)
      if (selectedStatus !== 'all') params.set('status', selectedStatus)
      params.set('page', '1')

      router.push(`/dashboard/admin/reports?${params.toString()}`)
    })
  }

  const handlePageChange = (page: number) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('page', page.toString())
      router.push(`/dashboard/admin/reports?${params.toString()}`)
    })
  }

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      submitted: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30",
      pending: "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30",
      reviewed: "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30"
    }

    return (
      <Badge className={`border ${statusStyles[status] || statusStyles.pending}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      {/* All Reports Card with Filters */}
      <div className="rounded-xl bg-white dark:bg-[hsl(222,47%,9%)] border border-slate-200/80 dark:border-slate-700/50 overflow-hidden">
        {/* Card Header */}
        <div className="px-6 py-4 border-b border-slate-200/80 dark:border-slate-700/50">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
            <FileText className="h-5 w-5 text-slate-500 dark:text-slate-400" />
            All Reports
          </h2>
        </div>

        {/* Filters Section */}
        <div className="px-6 py-4 border-b border-slate-200/80 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Filters</span>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by school name or head teacher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white dark:bg-[hsl(222,47%,11%)] border-slate-200 dark:border-slate-700"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </div>

            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger className="w-[180px] bg-white dark:bg-[hsl(222,47%,11%)] border-slate-200 dark:border-slate-700">
                <SelectValue placeholder="Select Region" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[hsl(222,47%,11%)] border-slate-200 dark:border-slate-700">
                <SelectItem value="all">All Regions</SelectItem>
                {regions.map((region) => (
                  <SelectItem key={region.id} value={region.id}>
                    {region.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[150px] bg-white dark:bg-[hsl(222,47%,11%)] border-slate-200 dark:border-slate-700">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[hsl(222,47%,11%)] border-slate-200 dark:border-slate-700">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={handleSearch} disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isPending ? "Searching..." : "Search"}
            </Button>
          </div>
        </div>

        {/* Table Section */}
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              All Reports ({reports.length})
            </h3>
          </div>

          {reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400">
              <Inbox className="h-12 w-12 mb-3 opacity-50" />
              <p>No reports found matching your criteria.</p>
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-slate-200/80 dark:border-slate-700/50 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-700/50">
                      <TableHead className="text-slate-600 dark:text-slate-400 font-medium">School</TableHead>
                      <TableHead className="text-slate-600 dark:text-slate-400 font-medium">Region</TableHead>
                      <TableHead className="text-slate-600 dark:text-slate-400 font-medium">Head Teacher</TableHead>
                      <TableHead className="text-slate-600 dark:text-slate-400 font-medium">Period</TableHead>
                      <TableHead className="text-slate-600 dark:text-slate-400 font-medium">Status</TableHead>
                      <TableHead className="text-slate-600 dark:text-slate-400 font-medium">Submitted</TableHead>
                      <TableHead className="text-slate-600 dark:text-slate-400 font-medium">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow key={report.id} className="border-b border-slate-200/80 dark:border-slate-700/50 hover:bg-slate-100/50 dark:hover:bg-white/[0.02]">
                        <TableCell className="font-medium text-slate-900 dark:text-white">
                          {report.school_name}
                        </TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-400">{report.region}</TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-400">{report.head_teacher_name}</TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-400">
                          {report.month} {report.year}
                        </TableCell>
                        <TableCell>{getStatusBadge(report.status)}</TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-400">{formatDate(report.submitted_at)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button asChild size="sm" variant="outline" className="h-8 w-8 p-0 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800">
                              <Link href={`/dashboard/reports/view/${report.school_id}/${report.month}-${report.year}?back=${encodeURIComponent('/dashboard/admin/reports')}`}>
                                <Eye className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                              </Link>
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800">
                              <Download className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1 || isPending}
                      className="border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages || isPending}
                      className="border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
