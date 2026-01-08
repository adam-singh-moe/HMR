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
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        {configs.map((config) => (
          <div 
            key={config.id} 
            className="flex items-center justify-between p-4 border rounded-lg bg-card shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className={`p-2 rounded-full ${config.isEnabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                <School className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Label htmlFor={`toggle-${config.schoolType}`} className="text-base font-semibold capitalize cursor-pointer">
                    {config.schoolType} Schools
                  </Label>
                  {config.isEnabled ? (
                    <Badge variant="outline" className="text-[10px] uppercase bg-green-50 text-green-700 border-green-200">
                      Enabled
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] uppercase bg-red-50 text-red-700 border-red-200">
                      Disabled
                    </Badge>
                  ) }
                </div>
                <p className="text-sm text-muted-foreground">
                  {config.isEnabled 
                    ? `Head teachers of ${config.schoolType} schools can access and submit assessment reports.`
                    : `Access to assessment reports is currently restricted for ${config.schoolType} schools.`
                  }
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {updatingType === config.schoolType && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
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
        <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200 flex gap-3 text-yellow-800">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">Warning: All School Types Disabled</p>
            <p>The entire School Assessment module is currently inaccessible to all head teachers.</p>
          </div>
        </div>
      )}
      
      {configs.every(c => c.isEnabled) && (
        <div className="p-4 rounded-lg bg-green-50 border border-green-200 flex gap-3 text-green-800">
          <ShieldCheck className="h-5 w-5 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">Full Access Enabled</p>
            <p>All school types have full access to the School Assessment module.</p>
          </div>
        </div>
      )}
    </div>
  )
}
