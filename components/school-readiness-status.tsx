"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, Settings, Loader2 } from "lucide-react"
import { SchoolReadinessModal } from "./school-readiness-modal"
import { getSchoolReadiness } from "@/app/actions/school-readiness"

interface SchoolReadinessStatusProps {
  className?: string
}

export function SchoolReadinessStatus({ className }: SchoolReadinessStatusProps) {
  const [status, setStatus] = useState<"ready" | "not_ready" | "no_status">("no_status")
  const [reason, setReason] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  // Load status on component mount
  useEffect(() => {
    loadStatus()
  }, [])

  const loadStatus = async () => {
    setLoading(true)
    
    try {
      const result = await getSchoolReadiness()
      
      if (result.success && result.data) {
        setStatus(result.data.status)
        setReason(result.data.not_ready_reason || "")
      } else {
        // No status submitted yet - keep default "no_status"
        setStatus("no_status")
        setReason("")
      }
    } catch (error) {
      console.error("Error loading school readiness status:", error)
      // On error, also default to no_status
      setStatus("no_status")
      setReason("")
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = (newStatus: "ready" | "not_ready", newReason?: string) => {
    setStatus(newStatus)
    if (newReason !== undefined) {
      setReason(newReason)
    } else {
      setReason("")
    }
  }

  const getStatusBadge = () => {
    if (loading) {
      return (
        <Badge variant="secondary" className="cursor-pointer hover:bg-gray-200 px-4 py-2 text-sm">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Loading Status...
        </Badge>
      )
    }

    if (status === "ready") {
      return (
        <Badge 
          className="bg-green-500 text-white hover:bg-green-600 cursor-pointer px-4 py-2 text-sm font-semibold shadow-lg"
          onClick={() => setModalOpen(true)}
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Ready to Open
        </Badge>
      )
    } else if (status === "not_ready") {
      return (
        <Badge 
          className="bg-red-500 text-white hover:bg-red-600 cursor-pointer px-4 py-2 text-sm font-semibold shadow-lg"
          onClick={() => setModalOpen(true)}
        >
          <XCircle className="h-4 w-4 mr-2" />
          Not Ready
        </Badge>
      )
    } else {
      // no_status
      return (
        <Badge 
          className="bg-yellow-500 text-white hover:bg-yellow-600 cursor-pointer px-4 py-2 text-sm font-semibold shadow-lg animate-pulse"
          onClick={() => setModalOpen(true)}
        >
          <Settings className="h-4 w-4 mr-2" />
          No Status Submitted - Click to Update
        </Badge>
      )
    }
  }

  const getStatusButton = () => {
    if (loading) {
      return (
        <Button variant="ghost" size="sm" disabled className="h-auto p-2">
          <Loader2 className="h-4 w-4 animate-spin" />
        </Button>
      )
    }

    return (
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => setModalOpen(true)}
        className="h-auto p-2 hover:bg-white/20"
        title="Update school readiness status"
      >
        <Settings className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Status Badge */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-blue-100 hidden sm:inline font-medium">School Status:</span>
        {getStatusBadge()}
      </div>

      {/* Settings Button */}
      {getStatusButton()}

      {/* Not Ready Reason Tooltip */}
      {status === "not_ready" && reason && (
        <div className="hidden lg:block max-w-xs">
          <p className="text-xs text-blue-100 truncate" title={reason}>
            Reason: {reason}
          </p>
        </div>
      )}

      {/* Modal */}
      <SchoolReadinessModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onStatusChange={handleStatusChange}
        currentStatus={status === "no_status" ? undefined : status}
      />
    </div>
  )
}
