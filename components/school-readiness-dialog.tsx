'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Sparkles,
  Calendar
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
  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'ready':
        return (
          <Badge className="bg-emerald-500/20 text-emerald-300 border-0">
            <CheckCircle className="h-3 w-3 mr-1.5" />
            Ready
          </Badge>
        )
      case 'not_ready':
        return (
          <Badge className="bg-red-500/20 text-red-300 border-0">
            <XCircle className="h-3 w-3 mr-1.5" />
            Not Ready
          </Badge>
        )
      default:
        return (
          <Badge className="bg-slate-600/50 text-slate-400 border-0">
            <AlertCircle className="h-3 w-3 mr-1.5" />
            Pending
          </Badge>
        )
    }
  }

  if (!school) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-slate-800 border-slate-700">
        <DialogHeader className="pb-4 border-b border-slate-700">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-8">
              <DialogTitle className="text-xl font-semibold text-white">
                {school.name}
              </DialogTitle>
              <div className="flex items-center gap-3 mt-2">
                {getStatusBadge(school.readiness_status)}
                {school.readiness_updated_at && (
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(school.readiness_updated_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>
        
        <div className="py-4">
          <h4 className="font-medium text-white mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-400" />
            Readiness Checklist
          </h4>
          
          <div className="grid grid-cols-2 gap-2">
            {school.readiness_checklist_items ? (
              typeof school.readiness_checklist_items === 'object' && !Array.isArray(school.readiness_checklist_items) ? (
                Object.entries(school.readiness_checklist_items).map(([key, value], index: number) => (
                  <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-slate-700/50">
                    {value ? (
                      <div className="p-1.5 bg-emerald-500/20 rounded-full flex-shrink-0">
                        <CheckCircle className="h-4 w-4 text-emerald-400" />
                      </div>
                    ) : (
                      <div className="p-1.5 bg-red-500/20 rounded-full flex-shrink-0">
                        <XCircle className="h-4 w-4 text-red-400" />
                      </div>
                    )}
                    <span className={`text-sm font-medium ${value ? "text-slate-200" : "text-slate-400"}`}>
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </div>
                ))
              ) : Array.isArray(school.readiness_checklist_items) ? (
                school.readiness_checklist_items.map((item: any, index: number) => (
                  <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-slate-700/50">
                    {item.completed ? (
                      <div className="p-1.5 bg-emerald-500/20 rounded-full flex-shrink-0">
                        <CheckCircle className="h-4 w-4 text-emerald-400" />
                      </div>
                    ) : (
                      <div className="p-1.5 bg-red-500/20 rounded-full flex-shrink-0">
                        <XCircle className="h-4 w-4 text-red-400" />
                      </div>
                    )}
                    <span className="text-sm font-medium text-slate-200">
                      {item.item || item.name || item.description}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400 col-span-2">Checklist data available</p>
              )
            ) : (
              <div className="text-center py-8 col-span-2">
                <AlertCircle className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-400">No detailed checklist available</p>
              </div>
            )}
          </div>
          
          {school.readiness_reason && (
            <div className="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
              <p className="text-xs font-medium text-blue-300 mb-1">Reason</p>
              <p className="text-sm text-blue-400">{school.readiness_reason}</p>
            </div>
          )}
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

// Also export the status badge function for use elsewhere
export function getReadinessStatusBadge(status: string | null) {
  switch (status) {
    case 'ready':
      return (
        <Badge className="bg-emerald-500/20 text-emerald-300 border-0">
          <CheckCircle className="h-3 w-3 mr-1.5" />
          Ready
        </Badge>
      )
    case 'not_ready':
      return (
        <Badge className="bg-red-500/20 text-red-300 border-0">
          <XCircle className="h-3 w-3 mr-1.5" />
          Not Ready
        </Badge>
      )
    default:
      return (
        <Badge className="bg-slate-600/50 text-slate-400 border-0">
          <AlertCircle className="h-3 w-3 mr-1.5" />
          Pending
        </Badge>
      )
  }
}
