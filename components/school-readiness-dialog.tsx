'use client'

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  School,
  Calendar,
  ClipboardCheck,
  TrendingUp
} from "lucide-react"

interface SchoolData {
  id: string
  name: string
  readiness_status: string | null
  readiness_reason: string | null
  readiness_checklist_items: any | null
  readiness_updated_at: string | null
}

interface SchoolReadinessDialogProps {
  school: SchoolData | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SchoolReadinessDialog({ school, open, onOpenChange }: SchoolReadinessDialogProps) {
  if (!school) return null

  // Calculate completion stats
  let completedCount = 0
  let totalCount = 0

  if (school.readiness_checklist_items) {
    if (typeof school.readiness_checklist_items === 'object' && !Array.isArray(school.readiness_checklist_items)) {
      const entries = Object.entries(school.readiness_checklist_items)
      totalCount = entries.length
      completedCount = entries.filter(([_, value]) => value).length
    } else if (Array.isArray(school.readiness_checklist_items)) {
      totalCount = school.readiness_checklist_items.length
      completedCount = school.readiness_checklist_items.filter((item: any) => item.completed).length
    }
  }

  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const isReady = school.readiness_status === 'ready'
  const isNotReady = school.readiness_status === 'not_ready'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl bg-white dark:bg-[hsl(222,47%,11%)] border-slate-200/80 dark:border-slate-700/50 rounded-2xl p-0 gap-0 overflow-hidden">
        {/* Hero Header - Subtle glossy style */}
        <div className={`relative p-5 border-b ${
          isReady
            ? 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-200/50 dark:border-emerald-500/20'
            : isNotReady
            ? 'bg-red-50 dark:bg-red-500/5 border-red-200/50 dark:border-red-500/20'
            : 'bg-amber-50 dark:bg-amber-500/5 border-amber-200/50 dark:border-amber-500/20'
        }`}>
          <div className="flex items-start gap-4">
            <div className={`p-2.5 rounded-xl ${
              isReady
                ? 'bg-emerald-100 dark:bg-emerald-500/15'
                : isNotReady
                ? 'bg-red-100 dark:bg-red-500/15'
                : 'bg-amber-100 dark:bg-amber-500/15'
            }`}>
              <School className={`h-6 w-6 ${
                isReady
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : isNotReady
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{school.name}</h2>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge className={`border rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  isReady
                    ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                    : isNotReady
                    ? 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30'
                    : 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30'
                }`}>
                  {isReady ? (
                    <><CheckCircle className="h-3 w-3 mr-1" /> Ready</>
                  ) : isNotReady ? (
                    <><XCircle className="h-3 w-3 mr-1" /> Not Ready</>
                  ) : (
                    <><AlertCircle className="h-3 w-3 mr-1" /> Pending</>
                  )}
                </Badge>
                {school.readiness_updated_at && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(school.readiness_updated_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            {/* Completion Circle */}
            {totalCount > 0 && (
              <div className={`relative w-14 h-14 flex-shrink-0 p-1 rounded-xl ${
                isReady
                  ? 'bg-emerald-100 dark:bg-emerald-500/15'
                  : isNotReady
                  ? 'bg-red-100 dark:bg-red-500/15'
                  : 'bg-amber-100 dark:bg-amber-500/15'
              }`}>
                <svg className="w-12 h-12 transform -rotate-90">
                  <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="3" fill="none" className={
                    isReady
                      ? 'text-emerald-200 dark:text-emerald-900/50'
                      : isNotReady
                      ? 'text-red-200 dark:text-red-900/50'
                      : 'text-amber-200 dark:text-amber-900/50'
                  } />
                  <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray={`${completionPercentage * 1.257} 125.7`} className={
                    isReady
                      ? 'text-emerald-500 dark:text-emerald-400'
                      : isNotReady
                      ? 'text-red-500 dark:text-red-400'
                      : 'text-amber-500 dark:text-amber-400'
                  } />
                </svg>
                <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${
                  isReady
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : isNotReady
                    ? 'text-red-700 dark:text-red-400'
                    : 'text-amber-700 dark:text-amber-400'
                }`}>
                  {completionPercentage}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Stats Bar */}
        {totalCount > 0 && (
          <div className="px-5 py-3 bg-slate-50 dark:bg-[hsl(222,47%,9%)] border-b border-slate-200/80 dark:border-slate-700/50 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <ClipboardCheck className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              <span className="text-slate-600 dark:text-slate-400">Checklist Progress</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                {completedCount} Complete
              </span>
              <span className="text-xs px-2 py-1 rounded-full bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-medium">
                {totalCount - completedCount} Incomplete
              </span>
            </div>
          </div>
        )}

        {/* Checklist Content */}
        <div className="p-5 max-h-[50vh] overflow-y-auto">
          {school.readiness_checklist_items ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {typeof school.readiness_checklist_items === 'object' && !Array.isArray(school.readiness_checklist_items) ? (
                Object.entries(school.readiness_checklist_items).map(([key, value], index: number) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                      value
                        ? 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-200/50 dark:border-emerald-500/20'
                        : 'bg-red-50 dark:bg-red-500/5 border-red-200/50 dark:border-red-500/20'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg flex-shrink-0 ${
                      value
                        ? 'bg-emerald-100 dark:bg-emerald-500/15'
                        : 'bg-red-100 dark:bg-red-500/15'
                    }`}>
                      {value ? (
                        <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                    <span className={`text-sm font-medium ${
                      value
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : 'text-red-700 dark:text-red-300'
                    }`}>
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </div>
                ))
              ) : Array.isArray(school.readiness_checklist_items) ? (
                school.readiness_checklist_items.map((item: any, index: number) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                      item.completed
                        ? 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-200/50 dark:border-emerald-500/20'
                        : 'bg-red-50 dark:bg-red-500/5 border-red-200/50 dark:border-red-500/20'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg flex-shrink-0 ${
                      item.completed
                        ? 'bg-emerald-100 dark:bg-emerald-500/15'
                        : 'bg-red-100 dark:bg-red-500/15'
                    }`}>
                      {item.completed ? (
                        <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                    <span className={`text-sm font-medium ${
                      item.completed
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : 'text-red-700 dark:text-red-300'
                    }`}>
                      {item.item || item.name || item.description}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400 col-span-2 text-center py-4">Checklist data available</p>
              )}
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full w-fit mx-auto mb-3">
                <AlertCircle className="h-8 w-8 text-slate-400 dark:text-slate-500" />
              </div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No checklist available</p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">This school hasn't submitted readiness data yet</p>
            </div>
          )}

          {/* Reason Section */}
          {school.readiness_reason && (
            <div className="mt-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200/50 dark:border-blue-500/20">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Notes</p>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300">{school.readiness_reason}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-slate-50 dark:bg-[hsl(222,47%,8%)] border-t border-slate-200/80 dark:border-slate-700/50">
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full h-10 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-0 rounded-xl font-medium transition-colors"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Also export the status badge function for use elsewhere
export function getReadinessStatusBadge(status: string | null) {
  switch (status) {
    case 'ready':
      return (
        <Badge className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 text-xs font-medium">
          <CheckCircle className="h-3 w-3 mr-1" />
          Ready
        </Badge>
      )
    case 'not_ready':
      return (
        <Badge className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 text-xs font-medium">
          <XCircle className="h-3 w-3 mr-1" />
          Not Ready
        </Badge>
      )
    default:
      return (
        <Badge className="bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 text-xs font-medium">
          <AlertCircle className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      )
  }
}
