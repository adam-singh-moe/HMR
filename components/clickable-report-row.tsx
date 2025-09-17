"use client"

import { TableRow } from "@/components/ui/table"
import { useRouter, usePathname, useSearchParams } from "next/navigation"

interface ClickableReportRowProps {
  report: any
  children: React.ReactNode
}

export function ClickableReportRow({ report, children }: ClickableReportRowProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  // Determine the back URL based on current path and preserve URL parameters
  let backUrl = '/dashboard/education-official/reports' // Default for EO
  if (pathname.includes('/regional-officer')) {
    const params = searchParams.toString()
    backUrl = `/dashboard/regional-officer${params ? `?${params}` : ''}`
  }
  
  const reportLink = `/dashboard/reports/view/${report.sms_schools?.id || report.school_id}/${report.month}-${report.year}?back=${encodeURIComponent(backUrl)}`
  
  const handleRowClick = (e: React.MouseEvent) => {
    // Don't navigate if the click was on a button or link
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('a')) {
      return
    }
    router.push(reportLink)
  }
  
  return (
    <TableRow 
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={handleRowClick}
    >
      {children}
    </TableRow>
  )
}
