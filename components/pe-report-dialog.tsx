'use client'

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {
  School,
  Calendar,
  Users,
  Activity,
  AlertTriangle,
  MapPin
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
      <DialogContent className="sm:max-w-xl bg-white dark:bg-[hsl(222,47%,11%)] border-slate-200/80 dark:border-slate-700/50 rounded-2xl shadow-2xl p-0 gap-0 overflow-hidden">
        {/* Hero Header with Gradient */}
        <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 p-6 pb-8">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm">
                <School className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white leading-tight">
                  {report.school_name || 'Unknown School'}
                </h2>
                {report.region_name && (
                  <p className="text-blue-100 text-sm flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" />
                    {report.region_name}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-white/20 backdrop-blur-sm text-white border-0 rounded-full px-3 py-1 text-xs font-medium">
                <Calendar className="h-3 w-3 mr-1.5" />
                {period}
              </Badge>
              <Badge className="bg-emerald-500/90 text-white border-0 rounded-full px-3 py-1 text-xs font-medium">
                <Users className="h-3 w-3 mr-1.5" />
                {report.total_students || 0} Students
              </Badge>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[50vh] overflow-y-auto">
          {/* Activities Section */}
          <div className="group">
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-500/15 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-500/25 transition-colors">
                <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h4 className="font-semibold text-slate-900 dark:text-white text-sm">
                Activities
              </h4>
            </div>
            <div className="ml-[42px]">
              {report.activities ? (
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {report.activities}
                </p>
              ) : (
                <p className="text-sm text-slate-400 dark:text-slate-500 italic">
                  No activities listed for this report.
                </p>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-200/80 dark:border-slate-700/50" />

          {/* Challenges Section */}
          <div className="group">
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-500/15 group-hover:bg-amber-200 dark:group-hover:bg-amber-500/25 transition-colors">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <h4 className="font-semibold text-slate-900 dark:text-white text-sm">
                Challenges
              </h4>
            </div>
            <div className="ml-[42px]">
              {report.challenges ? (
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {report.challenges}
                </p>
              ) : (
                <p className="text-sm text-slate-400 dark:text-slate-500 italic">
                  No challenges listed for this report.
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
