"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircledIcon } from "@radix-ui/react-icons"
import { School, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import { SchoolConfirmationForm } from "./school-confirmation-form"
import { PasswordChangeForm } from "./password-change-form"
import { useRouter } from "next/navigation"

interface AccountSetupFlowProps {
  userEmail: string
  userName: string | null
  userId: string
  requiresName: boolean
  schoolId: string | null
  schoolName: string | null
  onComplete: () => void
  onBack: () => void
}

type SetupStep = "school-confirmation" | "password-setup"

export function AccountSetupFlow({
  userEmail,
  userName,
  userId,
  requiresName,
  schoolId,
  schoolName,
  onComplete,
  onBack
}: AccountSetupFlowProps) {
  const [currentStep, setCurrentStep] = useState<SetupStep>("school-confirmation")
  const [confirmedSchoolId, setConfirmedSchoolId] = useState<string | null>(schoolId)
  const router = useRouter()

  const handleSchoolConfirmationComplete = (schoolId: string) => {
    setConfirmedSchoolId(schoolId)
    setCurrentStep("password-setup")
  }

  const handlePasswordSetupComplete = () => {
    // Don't call onComplete immediately - let the PasswordChangeForm handle auto-login
    // The PasswordChangeForm will redirect to the appropriate dashboard automatically
  }

  const handleBackToSchoolConfirmation = () => {
    setCurrentStep("school-confirmation")
  }

  const steps = [
    {
      id: "school-confirmation" as const,
      title: "School Confirmation",
      icon: School,
      completed: currentStep === "password-setup",
      active: currentStep === "school-confirmation"
    },
    {
      id: "password-setup" as const,
      title: "Password Setup",
      icon: Lock,
      completed: false,
      active: currentStep === "password-setup"
    }
  ]

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-primary-800">Set up your account</h1>
          <p className="text-muted-foreground">Complete these steps to access your dashboard</p>
        </div>

        {/* Progress Tabs */}
        <Card className="shadow-lg border-0">
          <CardContent className="p-8">
            <div className="relative flex items-center justify-center">
              {/* Background connecting line */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div 
                  className={cn(
                    "w-full max-w-xs h-1 rounded-full transition-all duration-300",
                    currentStep === "password-setup" ? "bg-green-400" : "bg-gray-200"
                  )}
                ></div>
              </div>
              
              {/* Steps */}
              <div className="relative flex items-center justify-between w-full max-w-md">
                {steps.map((step, index) => {
                  const Icon = step.icon
                  
                  return (
                    <div key={step.id} className="flex flex-col items-center space-y-3">
                      {/* Step Circle */}
                      <div
                        className={cn(
                          "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg",
                          step.completed 
                            ? "bg-green-500 text-white" 
                            : step.active 
                              ? "bg-blue-500 text-white"
                              : "bg-gray-100 text-gray-400"
                        )}
                      >
                        {step.completed ? (
                          <CheckCircledIcon className="w-7 h-7" />
                        ) : (
                          <Icon className="w-7 h-7" />
                        )}
                      </div>
                      
                      {/* Step Title */}
                      <div className="text-center">
                        <p 
                          className={cn(
                            "text-sm font-semibold",
                            step.completed || step.active 
                              ? "text-primary-700" 
                              : "text-gray-500"
                          )}
                        >
                          {step.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Step {index + 1} of {steps.length}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step Content */}
        <div className="space-y-6">
          {currentStep === "school-confirmation" && (
            <SchoolConfirmationForm
              userEmail={userEmail}
              userId={userId}
              currentSchoolId={schoolId}
              currentSchoolName={schoolName}
              onConfirm={handleSchoolConfirmationComplete}
              onBack={onBack}
            />
          )}

          {currentStep === "password-setup" && (
            <PasswordChangeForm
              userEmail={userEmail}
              userName={userName}
              userId={userId}
              requiresName={requiresName}
              onBack={handleBackToSchoolConfirmation}
              // Don't provide onComplete - let PasswordChangeForm handle auto-login redirect
            />
          )}
        </div>
      </div>
    </div>
  )
}