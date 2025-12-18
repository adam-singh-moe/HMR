"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { 
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Save,
  RotateCcw,
  Info,
} from "lucide-react"
import { 
  getTermConfigs,
  updateTermConfig,
  toggleTermEnabled,
  getCurrentTermWindows,
  getActiveTermWindow,
} from "../actions/assessment-periods"
import type { TermSubmissionConfig, CurrentTermWindow } from "../types"

// ============================================================================
// CONSTANTS
// ============================================================================

const TERM_PERIODS = {
  1: { months: 'September - December', description: 'First term of the academic year' },
  2: { months: 'January - March', description: 'Second term of the academic year' },
  3: { months: 'April - July', description: 'Third term of the academic year' },
} as const

const MONTHS = [
  { value: 1, label: "Jan" },
  { value: 2, label: "Feb" },
  { value: 3, label: "Mar" },
  { value: 4, label: "Apr" },
  { value: 5, label: "May" },
  { value: 6, label: "Jun" },
  { value: 7, label: "Jul" },
  { value: 8, label: "Aug" },
  { value: 9, label: "Sep" },
  { value: 10, label: "Oct" },
  { value: 11, label: "Nov" },
  { value: 12, label: "Dec" },
]

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

const TERM_COLORS = {
  1: { bg: "bg-blue-500", light: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" },
  2: { bg: "bg-emerald-500", light: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" },
  3: { bg: "bg-violet-500", light: "bg-violet-50", border: "border-violet-200", text: "text-violet-700" },
} as const

// ============================================================================
// TERM ROW COMPONENT
// ============================================================================

interface TermRowProps {
  config: TermSubmissionConfig
  currentWindow?: CurrentTermWindow
  onUpdate: (termNumber: 1 | 2 | 3, startMonth: number, startDay: number, endMonth: number, endDay: number) => Promise<void>
  onToggleEnabled: (termNumber: 1 | 2 | 3, enabled: boolean) => Promise<void>
  isUpdating: boolean
}

function TermRow({ config, currentWindow, onUpdate, onToggleEnabled, isUpdating }: TermRowProps) {
  const [startMonth, setStartMonth] = useState(config.startMonth)
  const [startDay, setStartDay] = useState(config.startDay)
  const [endMonth, setEndMonth] = useState(config.endMonth)
  const [endDay, setEndDay] = useState(config.endDay)
  const [hasChanges, setHasChanges] = useState(false)

  const colors = TERM_COLORS[config.termNumber as 1 | 2 | 3]
  const termInfo = TERM_PERIODS[config.termNumber as 1 | 2 | 3]

  useEffect(() => {
    const changed = 
      startMonth !== config.startMonth ||
      startDay !== config.startDay ||
      endMonth !== config.endMonth ||
      endDay !== config.endDay
    setHasChanges(changed)
  }, [startMonth, startDay, endMonth, endDay, config])

  const handleSave = async () => {
    await onUpdate(config.termNumber, startMonth, startDay, endMonth, endDay)
  }

  const handleReset = () => {
    setStartMonth(config.startMonth)
    setStartDay(config.startDay)
    setEndMonth(config.endMonth)
    setEndDay(config.endDay)
  }

  const getMonthLabel = (month: number) => MONTHS.find(m => m.value === month)?.label || ''

  const isCurrentlyOpen = currentWindow?.isOpen

  return (
    <div className={`rounded-lg border ${colors.border} ${colors.light} p-4 transition-opacity ${!config.isEnabled ? 'opacity-50' : ''}`}>
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Term Info */}
        <div className="flex items-center gap-3 lg:w-48 flex-shrink-0">
          <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center text-white font-bold`}>
            {config.termNumber}
          </div>
          <div>
            <div className="font-semibold text-gray-900">
              {config.termNumber === 1 ? 'First' : config.termNumber === 2 ? 'Second' : 'Third'} Term
            </div>
            <div className="text-xs text-gray-500">{termInfo.months}</div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="lg:w-36 flex-shrink-0">
          {isCurrentlyOpen ? (
            <Badge className="bg-green-100 text-green-800 border border-green-300 gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Open
              {currentWindow?.daysRemaining !== undefined && (
                <span className="ml-1">• {currentWindow.daysRemaining}d left</span>
              )}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-gray-500 gap-1">
              <Clock className="h-3 w-3" />
              Closed
            </Badge>
          )}
        </div>

        {/* Date Selectors */}
        <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Opens */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-12">Opens:</span>
            <Select 
              value={String(startMonth)} 
              onValueChange={(v) => setStartMonth(Number(v))}
              disabled={!config.isEnabled || isUpdating}
            >
              <SelectTrigger className="w-20 h-8 text-sm bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select 
              value={String(startDay)} 
              onValueChange={(v) => setStartDay(Number(v))}
              disabled={!config.isEnabled || isUpdating}
            >
              <SelectTrigger className="w-16 h-8 text-sm bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAYS.map((d) => (
                  <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Closes */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-12">Closes:</span>
            <Select 
              value={String(endMonth)} 
              onValueChange={(v) => setEndMonth(Number(v))}
              disabled={!config.isEnabled || isUpdating}
            >
              <SelectTrigger className="w-20 h-8 text-sm bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select 
              value={String(endDay)} 
              onValueChange={(v) => setEndDay(Number(v))}
              disabled={!config.isEnabled || isUpdating}
            >
              <SelectTrigger className="w-16 h-8 text-sm bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAYS.map((d) => (
                  <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 lg:w-40 flex-shrink-0 justify-end">
          {hasChanges && (
            <div className="flex gap-1">
              <Button 
                size="sm" 
                variant="ghost"
                className="h-8 px-2"
                onClick={handleReset}
                disabled={isUpdating}
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
              <Button 
                size="sm" 
                className="h-8 px-3"
                onClick={handleSave}
                disabled={isUpdating}
              >
                {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                Save
              </Button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Label htmlFor={`term-${config.termNumber}-enabled`} className="text-xs text-gray-500">
              {config.isEnabled ? 'On' : 'Off'}
            </Label>
            <Switch
              id={`term-${config.termNumber}-enabled`}
              checked={config.isEnabled}
              onCheckedChange={(checked: boolean) => onToggleEnabled(config.termNumber, checked)}
              disabled={isUpdating}
            />
          </div>
        </div>
      </div>

      {/* Current Year Window Info */}
      {currentWindow && config.isEnabled && (
        <div className="mt-3 pt-3 border-t border-gray-200/50 flex items-center gap-2 text-xs text-gray-500">
          <Calendar className="h-3 w-3" />
          <span>
            {currentWindow.academicYear}: {' '}
            {new Date(currentWindow.submissionStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} 
            {' → '}
            {new Date(currentWindow.submissionEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PeriodManagement() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [termConfigs, setTermConfigs] = useState<TermSubmissionConfig[]>([])
  const [currentWindows, setCurrentWindows] = useState<CurrentTermWindow[]>([])
  const [activeWindow, setActiveWindow] = useState<CurrentTermWindow | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [configsResult, windowsResult, activeResult] = await Promise.all([
        getTermConfigs(),
        getCurrentTermWindows(),
        getActiveTermWindow(),
      ])

      if (configsResult.error) {
        toast({ title: 'Error', description: configsResult.error, variant: 'destructive' })
      } else {
        setTermConfigs(configsResult.configs)
      }

      if (!windowsResult.error) {
        setCurrentWindows(windowsResult.windows)
      }

      if (!activeResult.error) {
        setActiveWindow(activeResult.window)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast({ title: 'Error', description: 'Failed to load term configurations.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleUpdateTermConfig = async (
    termNumber: 1 | 2 | 3,
    startMonth: number,
    startDay: number,
    endMonth: number,
    endDay: number
  ) => {
    setIsUpdating(true)
    try {
      const result = await updateTermConfig(termNumber, startMonth, startDay, endMonth, endDay)
      
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Saved', description: 'Term configuration updated successfully.' })
        loadData()
      }
    } catch (error) {
      console.error('Error updating term config:', error)
      toast({ title: 'Error', description: 'Failed to update term configuration.', variant: 'destructive' })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleToggleEnabled = async (termNumber: 1 | 2 | 3, enabled: boolean) => {
    setIsUpdating(true)
    try {
      const result = await toggleTermEnabled(termNumber, enabled)
      
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        toast({ 
          title: enabled ? 'Enabled' : 'Disabled', 
          description: `Term ${termNumber} has been ${enabled ? 'enabled' : 'disabled'}.` 
        })
        loadData()
      }
    } catch (error) {
      console.error('Error toggling term:', error)
      toast({ title: 'Error', description: 'Failed to update term.', variant: 'destructive' })
    } finally {
      setIsUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  const getWindowForTerm = (termNumber: 1 | 2 | 3) => {
    return currentWindows.find(w => w.termNumber === termNumber)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Submission Windows</h2>
          <p className="text-sm text-gray-500 mt-1">
            Configure when schools can submit assessment reports for each term
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Active Status Banner */}
      {activeWindow ? (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 ml-2">
            <span className="font-medium">Submissions are open</span> for{' '}
            <span className="font-semibold">
              {activeWindow.termNumber === 1 ? 'First' : activeWindow.termNumber === 2 ? 'Second' : 'Third'} Term
            </span>
            {' '}({activeWindow.academicYear})
            {activeWindow.daysRemaining !== undefined && (
              <span className="ml-1">— {activeWindow.daysRemaining} days remaining</span>
            )}
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="bg-gray-50 border-gray-200">
          <Clock className="h-4 w-4 text-gray-500" />
          <AlertDescription className="text-gray-600 ml-2">
            <span className="font-medium">Submissions are currently closed.</span>
            {' '}The next window will open automatically based on the dates configured below.
          </AlertDescription>
        </Alert>
      )}

      {/* Term Configuration Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            Term Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {termConfigs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No term configurations found.</p>
              <p className="text-sm mt-1">Run the database migration to set up default configurations.</p>
            </div>
          ) : (
            termConfigs.map((config) => (
              <TermRow
                key={config.id}
                config={config}
                currentWindow={getWindowForTerm(config.termNumber)}
                onUpdate={handleUpdateTermConfig}
                onToggleEnabled={handleToggleEnabled}
                isUpdating={isUpdating}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* Info Note */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 border border-blue-100">
        <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">How it works</p>
          <p className="mt-1 text-blue-700">
            These dates repeat automatically every academic year. When you change a date, 
            it will take effect on the next occurrence of that term's window.
          </p>
        </div>
      </div>
    </div>
  )
}
