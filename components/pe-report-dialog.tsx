'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  School,
  Calendar,
  Users,
  Activity,
  AlertTriangle
} from "lucide-react"

interface PEReport {
  id: any
  school_id?: any
  month?: any
  year?: any
  status?: any
  school_name?: string
  region_name?: string
  period?: string
  total_students?: number
  activities?: string
  challenges?: string
}

interface PEReportDialogProps {
  report: PEReport | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PEReportDialog({ report, open, onOpenChange }: PEReportDialogProps) {
  if (!report) return null

  const period = report.period || 
    (report.month && report.year 
      ? `${new Date(report.year, report.month - 1).toLocaleString("default", { month: "long" })} ${report.year}`
      : 'Unknown Period')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-slate-800 border-slate-700">
        <DialogHeader className="pb-4 border-b border-slate-700">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/20">
              <School className="h-5 w-5 text-blue-400" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl font-semibold text-white">
                {report.school_name || 'Unknown School'}
              </DialogTitle>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <Badge className="bg-blue-500/20 text-blue-300 border-0">
                  <Calendar className="h-3 w-3 mr-1.5" />
                  {period}
                </Badge>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-0">
                  <Users className="h-3 w-3 mr-1.5" />
                  {report.total_students || 0} Students
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>
        
        <div className="py-4 space-y-5">
          {/* Activities Section */}
          <div>
            <h4 className="font-medium text-white mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-400" />
              Activities
            </h4>
            <div className="p-4 rounded-xl bg-slate-700/50 border border-slate-600">
              {report.activities ? (
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {report.activities}
                </p>
              ) : (
                <p className="text-sm text-slate-400 italic">
                  No activities listed for this report.
                </p>
              )}
            </div>
          </div>

          {/* Challenges Section */}
          <div>
            <h4 className="font-medium text-white mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              Challenges
            </h4>
            <div className="p-4 rounded-xl bg-slate-700/50 border border-slate-600">
              {report.challenges ? (
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {report.challenges}
                </p>
              ) : (
                <p className="text-sm text-slate-400 italic">
                  No challenges listed for this report.
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="pt-4 border-t border-slate-700">
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full bg-transparent border border-blue-500 text-blue-400 hover:bg-blue-500/10"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
