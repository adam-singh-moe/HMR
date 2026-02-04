"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import { generateReportsPDF } from "@/app/actions/export-reports"
import { toast } from "sonner"

export function ExportAllButton() {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    console.log("[ExportAllButton] Starting export...")
    setIsExporting(true)

    try {
      console.log("[ExportAllButton] Calling generateReportsPDF...")
      const result = await generateReportsPDF()
      console.log("[ExportAllButton] Result:", result)

      if (!result.success) {
        console.error("[ExportAllButton] Export failed:", result.error)
        toast.error(result.error || "Failed to generate export")
        return
      }

      if (result.htmlContent) {
        console.log("[ExportAllButton] Opening print window with", result.reportCount, "reports")

        // Open in new window for printing/saving as PDF
        const printWindow = window.open("", "_blank")
        if (printWindow) {
          printWindow.document.write(result.htmlContent)
          printWindow.document.close()

          // Wait for content to load then trigger print
          setTimeout(() => {
            printWindow.print()
          }, 500)

          toast.success(`Export ready with ${result.reportCount} reports`)
        } else {
          toast.error("Pop-up blocked. Please allow pop-ups for this site.")
        }
      } else {
        console.error("[ExportAllButton] No HTML content returned")
        toast.error("No data to export")
      }
    } catch (error) {
      console.error("[ExportAllButton] Export error:", error)
      toast.error("An error occurred while exporting")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isExporting}
      className="text-xs border-amber-300 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20"
    >
      {isExporting ? (
        <>
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Exporting...
        </>
      ) : (
        <>
          <Download className="h-3 w-3 mr-1" />
          Export All
        </>
      )}
    </Button>
  )
}
