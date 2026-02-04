"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Loader2, ShieldCheck, ShieldAlert, School } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { getAssessmentModuleConfigs, updateAssessmentModuleStatus } from "../actions/module-config"
import type { AssessmentModuleConfig } from "../types"

export function ModuleAccessSettings() {
  const [configs, setConfigs] = useState<AssessmentModuleConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [updatingType, setUpdatingType] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchConfigs()
  }, [])

  async function fetchConfigs() {
    setIsLoading(true)
    const { configs: data, error } = await getAssessmentModuleConfigs()
    if (error) {
      toast({
        title: "Error fetching settings",
        description: error,
        variant: "destructive",
      })
    } else {
      setConfigs(data)
    }
    setIsLoading(false)
  }

  async function handleToggle(schoolType: 'nursery' | 'primary' | 'secondary', currentStatus: boolean) {
    setUpdatingType(schoolType)
    const newStatus = !currentStatus
    
    const { success, error } = await updateAssessmentModuleStatus(schoolType, newStatus)
    
    if (success) {
      setConfigs(prev => prev.map(c => 
        c.schoolType === schoolType ? { ...c, isEnabled: newStatus } : c
      ))
      toast({
        title: "Setting updated",
        description: `School Assessment module ${newStatus ? 'enabled' : 'disabled'} for ${schoolType} schools.`,
      })
    } else {
      toast({
        title: "Failed to update setting",
        description: error,
        variant: "destructive",
      })
    }
    setUpdatingType(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="p-4 rounded-full bg-blue-50 dark:bg-blue-500/10">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        {configs.map((config) => (
          <div
            key={config.id}
            className="flex items-center justify-between p-4 border rounded-xl bg-white dark:bg-[hsl(222,47%,11%)] border-slate-200/80 dark:border-slate-700/50 shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className={`p-2 rounded-full ${config.isEnabled ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                <School className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Label htmlFor={`toggle-${config.schoolType}`} className="text-base font-semibold capitalize cursor-pointer text-slate-900 dark:text-white">
                    {config.schoolType} Schools
                  </Label>
                  {config.isEnabled ? (
                    <Badge variant="outline" className="text-[10px] uppercase bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30">
                      Enabled
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] uppercase bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30">
                      Disabled
                    </Badge>
                  ) }
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {config.isEnabled
                    ? `Head teachers of ${config.schoolType} schools can access and submit assessment reports.`
                    : `Access to assessment reports is currently restricted for ${config.schoolType} schools.`
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {updatingType === config.schoolType && (
                <Loader2 className="h-4 w-4 animate-spin text-slate-500 dark:text-slate-400" />
              )}
              <Switch
                id={`toggle-${config.schoolType}`}
                checked={config.isEnabled}
                onCheckedChange={() => handleToggle(config.schoolType, config.isEnabled)}
                disabled={updatingType !== null}
              />
            </div>
          </div>
        ))}
      </div>

      {!configs.some(c => c.isEnabled) && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/20 flex gap-3">
          <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="text-sm">
            <p className="font-semibold text-amber-700 dark:text-amber-400">Warning: All School Types Disabled</p>
            <p className="text-amber-600/80 dark:text-amber-400/70">The entire School Assessment module is currently inaccessible to all head teachers.</p>
          </div>
        </div>
      )}

      {configs.every(c => c.isEnabled) && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/20 flex gap-3">
          <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div className="text-sm">
            <p className="font-semibold text-emerald-700 dark:text-emerald-400">Full Access Enabled</p>
            <p className="text-emerald-600/80 dark:text-emerald-400/70">All school types have full access to the School Assessment module.</p>
          </div>
        </div>
      )}
    </div>
  )
}
