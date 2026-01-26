"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, User, GraduationCap, Building2, Calendar, Award, Mail, Phone, ChevronLeft, ChevronRight, Check } from "lucide-react"
import { addTeacher, updateTeacher, Teacher, getTeacherStatuses, TeacherStatus } from "@/app/actions/teachers"

interface AddTeacherModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teacher?: Teacher | null
  onSuccess: () => void
}

const TABS = [
  { id: "personal", label: "Personal", icon: User },
  { id: "cpce", label: "CPCE", icon: GraduationCap },
  { id: "ug", label: "UG", icon: Building2 },
  { id: "appointment", label: "Appointment", icon: Calendar },
  { id: "degrees", label: "Degrees", icon: Award },
  { id: "contact", label: "Contact", icon: Mail },
]

export function AddTeacherModal({ open, onOpenChange, teacher, onSuccess }: AddTeacherModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const [statuses, setStatuses] = useState<TeacherStatus[]>([])
  const [loadingStatuses, setLoadingStatuses] = useState(true)
  const [activeTab, setActiveTab] = useState("personal")

  // Form state
  const [firstName, setFirstName] = useState(teacher?.first_name || "")
  const [middleName, setMiddleName] = useState(teacher?.middle_name || "")
  const [lastName, setLastName] = useState(teacher?.last_name || "")
  const [gender, setGender] = useState(teacher?.gender || "")
  const [statusId, setStatusId] = useState(teacher?.status_id || "")
  const [dateOfBirth, setDateOfBirth] = useState(teacher?.date_of_birth || "")
  const [currentlyAtCpce, setCurrentlyAtCpce] = useState(teacher?.currently_at_cpce || false)
  const [cpceExpectedGraduationDate, setCpceExpectedGraduationDate] = useState(teacher?.cpce_expected_graduation_date || "")
  const [cpceMajor, setCpceMajor] = useState(teacher?.cpce_major || "")
  const [cpceMinor, setCpceMinor] = useState(teacher?.cpce_minor || "")
  const [ugMajor, setUgMajor] = useState(teacher?.ug_major || "")
  const [ugMinor, setUgMinor] = useState(teacher?.ug_minor || "")
  const [currentApptDate, setCurrentApptDate] = useState(teacher?.current_appt_date || "")
  const [lastApptDate, setLastApptDate] = useState(teacher?.last_appt_date || "")
  const [hasMastersDegree, setHasMastersDegree] = useState(teacher?.has_masters_degree || false)
  const [mastersDegree, setMastersDegree] = useState(teacher?.masters_degree || "")
  const [hasPhd, setHasPhd] = useState(teacher?.has_phd === "true" || teacher?.has_phd === "yes" || false)
  const [phd, setPhd] = useState(teacher?.phd || "")
  const [hasMoeEmail, setHasMoeEmail] = useState(teacher?.has_moe_email || false)
  const [emailAddress, setEmailAddress] = useState(teacher?.email_address || "")
  const [contactNumber, setContactNumber] = useState(teacher?.contact_number || "")
  const [saveAction, setSaveAction] = useState<'close' | 'another'>('close')

  const isEditing = !!teacher

  // Fetch statuses on mount
  useEffect(() => {
    async function fetchStatuses() {
      setLoadingStatuses(true)
      const result = await getTeacherStatuses()
      if (result.statuses) {
        setStatuses(result.statuses)
      }
      setLoadingStatuses(false)
    }
    fetchStatuses()
  }, [])

  const resetForm = () => {
    setFirstName("")
    setMiddleName("")
    setLastName("")
    setGender("")
    setStatusId("")
    setDateOfBirth("")
    setCurrentlyAtCpce(false)
    setCpceExpectedGraduationDate("")
    setCpceMajor("")
    setCpceMinor("")
    setUgMajor("")
    setUgMinor("")
    setCurrentApptDate("")
    setLastApptDate("")
    setHasMastersDegree(false)
    setMastersDegree("")
    setHasPhd(false)
    setPhd("")
    setHasMoeEmail(false)
    setEmailAddress("")
    setContactNumber("")
    setError(null)
    setActiveTab("personal")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const formData = new FormData()
    formData.append("first_name", firstName)
    formData.append("middle_name", middleName)
    formData.append("last_name", lastName)
    formData.append("gender", gender)
    formData.append("status_id", statusId)
    formData.append("date_of_birth", dateOfBirth)
    formData.append("currently_at_cpce", currentlyAtCpce.toString())
    formData.append("cpce_expected_graduation_date", cpceExpectedGraduationDate)
    formData.append("cpce_major", cpceMajor)
    formData.append("cpce_minor", cpceMinor)
    formData.append("ug_major", ugMajor)
    formData.append("ug_minor", ugMinor)
    formData.append("current_appt_date", currentApptDate)
    formData.append("last_appt_date", lastApptDate)
    formData.append("has_masters_degree", hasMastersDegree.toString())
    formData.append("masters_degree", mastersDegree)
    formData.append("has_phd", hasPhd ? "yes" : "no")
    formData.append("phd", phd)
    formData.append("has_moe_email", hasMoeEmail.toString())
    formData.append("email_address", emailAddress)
    formData.append("contact_number", contactNumber)

    // Validate email based on MOE email selection
    if (emailAddress) {
      if (hasMoeEmail && !emailAddress.endsWith("@moe.edu.gy")) {
        setError("MOE email must end with @moe.edu.gy")
        setActiveTab("contact")
        setIsSubmitting(false)
        return
      }
      if (!hasMoeEmail && emailAddress.endsWith("@moe.edu.gy")) {
        setError("Non-MOE email cannot end with @moe.edu.gy")
        setActiveTab("contact")
        setIsSubmitting(false)
        return
      }
    }

    try {
      let result
      if (isEditing && teacher) {
        result = await updateTeacher(teacher.id, formData)
      } else {
        result = await addTeacher(formData)
      }

      if (result.success) {
        onSuccess()
        if (saveAction === 'another' && !isEditing) {
          resetForm()
        } else {
          resetForm()
          onOpenChange(false)
        }
      } else {
        setError(result.error || "An error occurred")
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm()
    }
    onOpenChange(newOpen)
  }

  // Populate form when teacher prop changes
  useEffect(() => {
    if (teacher) {
      setFirstName(teacher.first_name || "")
      setMiddleName(teacher.middle_name || "")
      setLastName(teacher.last_name || "")
      setGender(teacher.gender || "")
      setStatusId(teacher.status_id || "")
      setDateOfBirth(teacher.date_of_birth || "")
      setCurrentlyAtCpce(teacher.currently_at_cpce || false)
      setCpceExpectedGraduationDate(teacher.cpce_expected_graduation_date || "")
      setCpceMajor(teacher.cpce_major || "")
      setCpceMinor(teacher.cpce_minor || "")
      setUgMajor(teacher.ug_major || "")
      setUgMinor(teacher.ug_minor || "")
      setCurrentApptDate(teacher.current_appt_date || "")
      setLastApptDate(teacher.last_appt_date || "")
      setHasMastersDegree(teacher.has_masters_degree || false)
      setMastersDegree(teacher.masters_degree || "")
      setHasPhd(teacher.has_phd === "true" || teacher.has_phd === "yes" || false)
      setPhd(teacher.phd || "")
      setHasMoeEmail(teacher.has_moe_email || false)
      setEmailAddress(teacher.email_address || "")
      setContactNumber(teacher.contact_number || "")
    } else {
      resetForm()
    }
  }, [teacher])

  // Navigation helpers
  const currentTabIndex = TABS.findIndex(t => t.id === activeTab)
  const isFirstTab = currentTabIndex === 0
  const isLastTab = currentTabIndex === TABS.length - 1

  const goToNextTab = () => {
    if (!isLastTab) {
      setActiveTab(TABS[currentTabIndex + 1].id)
    }
  }

  const goToPrevTab = () => {
    if (!isFirstTab) {
      setActiveTab(TABS[currentTabIndex - 1].id)
    }
  }

  // Check if a tab has data filled
  const getTabStatus = (tabId: string): 'empty' | 'partial' | 'complete' => {
    switch (tabId) {
      case 'personal':
        if (firstName && lastName) return 'complete'
        if (firstName || middleName || lastName || gender || dateOfBirth || statusId) return 'partial'
        return 'empty'
      case 'cpce':
        if (cpceMajor || cpceMinor || currentlyAtCpce) return 'partial'
        return 'empty'
      case 'ug':
        if (ugMajor || ugMinor) return 'partial'
        return 'empty'
      case 'appointment':
        if (currentApptDate || lastApptDate) return 'partial'
        return 'empty'
      case 'degrees':
        if (hasMastersDegree || hasPhd) return 'partial'
        return 'empty'
      case 'contact':
        if (emailAddress || contactNumber) return 'partial'
        return 'empty'
      default:
        return 'empty'
    }
  }

  // Input class for consistent styling
  const inputClass = "h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
  const selectTriggerClass = "h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
  const selectContentClass = "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
  const labelClass = "text-sm font-medium text-slate-700 dark:text-slate-300"

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl h-[600px] flex flex-col bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <DialogTitle className="flex items-center gap-3 text-xl text-slate-900 dark:text-white">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <User className="h-5 w-5 text-white" />
            </div>
            {isEditing ? "Edit Teacher" : "Add New Teacher"}
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400 mt-1.5">
            {isEditing
              ? "Update the teacher's information below."
              : "Enter the teacher's information below to add them to your school."}
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {error && (
            <div className="mx-6 mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400 p-3 rounded-xl text-sm flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-red-600 dark:text-red-400 text-xs font-bold">!</span>
              </div>
              <span>{error}</span>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 overflow-hidden">
            {/* Tab List */}
            <div className="px-6 pt-4 flex-shrink-0">
              <TabsList className="w-full h-auto p-1 bg-slate-100 dark:bg-slate-800 rounded-xl grid grid-cols-6 gap-1">
                {TABS.map((tab) => {
                  const Icon = tab.icon
                  const status = getTabStatus(tab.id)
                  return (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="relative flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-xs font-medium data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm transition-all"
                    >
                      <div className="relative">
                        <Icon className="w-4 h-4" />
                        {status === 'complete' && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 flex items-center justify-center">
                            <Check className="w-2 h-2 text-white" />
                          </div>
                        )}
                        {status === 'partial' && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-500" />
                        )}
                      </div>
                      <span className="hidden sm:inline">{tab.label}</span>
                    </TabsTrigger>
                  )
                })}
              </TabsList>
            </div>

            {/* Tab Content - Fixed height */}
            <div className="h-[320px] overflow-y-auto px-6 py-4">
              {/* Personal Information */}
              <TabsContent value="personal" className="mt-0 space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600">
                    <User className="w-[18px] h-[18px] text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-800 dark:text-white">Personal Information</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Basic details about the teacher</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name" className={labelClass}>First Name *</Label>
                    <Input
                      id="first_name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First name"
                      required
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="middle_name" className={labelClass}>Middle Name</Label>
                    <Input
                      id="middle_name"
                      value={middleName}
                      onChange={(e) => setMiddleName(e.target.value)}
                      placeholder="Middle name"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="last_name" className={labelClass}>Last Name *</Label>
                    <Input
                      id="last_name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last name"
                      required
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender" className={labelClass}>Gender</Label>
                    <Select value={gender} onValueChange={setGender}>
                      <SelectTrigger className={selectTriggerClass}>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent className={selectContentClass}>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date_of_birth" className={labelClass}>Date of Birth</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status" className={labelClass}>Status</Label>
                    <Select value={statusId} onValueChange={setStatusId}>
                      <SelectTrigger className={selectTriggerClass}>
                        <SelectValue placeholder={loadingStatuses ? "Loading..." : "Select a status"} />
                      </SelectTrigger>
                      <SelectContent className={selectContentClass}>
                        {statuses.map((status) => (
                          <SelectItem key={status.id} value={status.id}>
                            {status.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              {/* CPCE Education */}
              <TabsContent value="cpce" className="mt-0 space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600">
                    <GraduationCap className="w-[18px] h-[18px] text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-800 dark:text-white">CPCE Education</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Cyril Potter College of Education details</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50">
                  <Label className={`${labelClass} mb-3 block`}>Is the teacher currently attending CPCE?</Label>
                  <RadioGroup
                    value={currentlyAtCpce ? "yes" : "no"}
                    onValueChange={(value) => {
                      setCurrentlyAtCpce(value === "yes")
                      if (value === "no") {
                        setCpceExpectedGraduationDate("")
                      }
                    }}
                    className="flex gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="currently_at_cpce_yes" className="border-slate-300 dark:border-slate-600" />
                      <Label htmlFor="currently_at_cpce_yes" className="font-normal cursor-pointer text-slate-700 dark:text-slate-300">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="currently_at_cpce_no" className="border-slate-300 dark:border-slate-600" />
                      <Label htmlFor="currently_at_cpce_no" className="font-normal cursor-pointer text-slate-700 dark:text-slate-300">No</Label>
                    </div>
                  </RadioGroup>
                </div>

                {currentlyAtCpce && (
                  <div className="space-y-2">
                    <Label htmlFor="cpce_expected_graduation_date" className={labelClass}>Expected Graduation Date</Label>
                    <Input
                      id="cpce_expected_graduation_date"
                      type="date"
                      value={cpceExpectedGraduationDate}
                      onChange={(e) => setCpceExpectedGraduationDate(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cpce_major" className={labelClass}>Major at CPCE</Label>
                    <Input
                      id="cpce_major"
                      value={cpceMajor}
                      onChange={(e) => setCpceMajor(e.target.value)}
                      placeholder="e.g., Primary Education"
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cpce_minor" className={labelClass}>Minor at CPCE</Label>
                    <Input
                      id="cpce_minor"
                      value={cpceMinor}
                      onChange={(e) => setCpceMinor(e.target.value)}
                      placeholder="e.g., Mathematics"
                      className={inputClass}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* University of Guyana Education */}
              <TabsContent value="ug" className="mt-0 space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br from-violet-500 to-purple-600">
                    <Building2 className="w-[18px] h-[18px] text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-800 dark:text-white">University of Guyana</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">UG education details</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ug_major" className={labelClass}>Major at UG</Label>
                    <Input
                      id="ug_major"
                      value={ugMajor}
                      onChange={(e) => setUgMajor(e.target.value)}
                      placeholder="e.g., Education"
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ug_minor" className={labelClass}>Minor at UG</Label>
                    <Input
                      id="ug_minor"
                      value={ugMinor}
                      onChange={(e) => setUgMinor(e.target.value)}
                      placeholder="e.g., English"
                      className={inputClass}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Appointment Information */}
              <TabsContent value="appointment" className="mt-0 space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-600">
                    <Calendar className="w-[18px] h-[18px] text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-800 dark:text-white">Appointment Information</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Employment appointment dates</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="current_appt_date" className={labelClass}>Date of Current Appointment</Label>
                    <Input
                      id="current_appt_date"
                      type="date"
                      value={currentApptDate}
                      onChange={(e) => setCurrentApptDate(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_appt_date" className={labelClass}>Date of Last Appointment</Label>
                    <Input
                      id="last_appt_date"
                      type="date"
                      value={lastApptDate}
                      onChange={(e) => setLastApptDate(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Advanced Degrees */}
              <TabsContent value="degrees" className="mt-0 space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br from-rose-500 to-pink-600">
                    <Award className="w-[18px] h-[18px] text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-800 dark:text-white">Advanced Degrees</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Master's and PhD information</p>
                  </div>
                </div>

                {/* Masters Degree */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50">
                  <Label className={`${labelClass} mb-3 block`}>Do you have a Master's Degree?</Label>
                  <RadioGroup
                    value={hasMastersDegree ? "yes" : "no"}
                    onValueChange={(value) => setHasMastersDegree(value === "yes")}
                    className="flex gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="masters_yes" className="border-slate-300 dark:border-slate-600" />
                      <Label htmlFor="masters_yes" className="font-normal cursor-pointer text-slate-700 dark:text-slate-300">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="masters_no" className="border-slate-300 dark:border-slate-600" />
                      <Label htmlFor="masters_no" className="font-normal cursor-pointer text-slate-700 dark:text-slate-300">No</Label>
                    </div>
                  </RadioGroup>
                  {hasMastersDegree && (
                    <div className="mt-4 space-y-2">
                      <Label htmlFor="masters_degree" className={labelClass}>Area of Master's Degree</Label>
                      <Input
                        id="masters_degree"
                        value={mastersDegree}
                        onChange={(e) => setMastersDegree(e.target.value)}
                        placeholder="e.g., Educational Administration"
                        className={inputClass}
                      />
                    </div>
                  )}
                </div>

                {/* PhD */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50">
                  <Label className={`${labelClass} mb-3 block`}>Do you have a PhD?</Label>
                  <RadioGroup
                    value={hasPhd ? "yes" : "no"}
                    onValueChange={(value) => setHasPhd(value === "yes")}
                    className="flex gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="phd_yes" className="border-slate-300 dark:border-slate-600" />
                      <Label htmlFor="phd_yes" className="font-normal cursor-pointer text-slate-700 dark:text-slate-300">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="phd_no" className="border-slate-300 dark:border-slate-600" />
                      <Label htmlFor="phd_no" className="font-normal cursor-pointer text-slate-700 dark:text-slate-300">No</Label>
                    </div>
                  </RadioGroup>
                  {hasPhd && (
                    <div className="mt-4 space-y-2">
                      <Label htmlFor="phd" className={labelClass}>Area of PhD</Label>
                      <Input
                        id="phd"
                        value={phd}
                        onChange={(e) => setPhd(e.target.value)}
                        placeholder="e.g., Curriculum Development"
                        className={inputClass}
                      />
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Contact Information */}
              <TabsContent value="contact" className="mt-0 space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br from-cyan-500 to-blue-600">
                    <Mail className="w-[18px] h-[18px] text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-800 dark:text-white">Contact Information</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Email and phone details</p>
                  </div>
                </div>

                {/* MOE Email */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50">
                  <Label className={`${labelClass} mb-3 block`}>Does the teacher have an MOE email address?</Label>
                  <RadioGroup
                    value={hasMoeEmail ? "yes" : "no"}
                    onValueChange={(value) => {
                      setHasMoeEmail(value === "yes")
                      setEmailAddress("")
                    }}
                    className="flex gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="moe_email_yes" className="border-slate-300 dark:border-slate-600" />
                      <Label htmlFor="moe_email_yes" className="font-normal cursor-pointer text-slate-700 dark:text-slate-300">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="moe_email_no" className="border-slate-300 dark:border-slate-600" />
                      <Label htmlFor="moe_email_no" className="font-normal cursor-pointer text-slate-700 dark:text-slate-300">No</Label>
                    </div>
                  </RadioGroup>
                  <div className="mt-4 space-y-2">
                    <Label htmlFor="email_address" className={labelClass}>
                      {hasMoeEmail ? "MOE Email Address" : "Email Address"}
                    </Label>
                    <Input
                      id="email_address"
                      type="email"
                      value={emailAddress}
                      onChange={(e) => setEmailAddress(e.target.value)}
                      placeholder={hasMoeEmail ? "teacher@moe.edu.gy" : "teacher@email.com"}
                      className={inputClass}
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {hasMoeEmail
                        ? "Email must end with @moe.edu.gy"
                        : "Enter a personal or alternative email (not @moe.edu.gy)"
                      }
                    </p>
                  </div>
                </div>

                {/* Contact Number */}
                <div className="space-y-2">
                  <Label htmlFor="contact_number" className={labelClass}>
                    <span className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      Contact Number (Cellular)
                    </span>
                  </Label>
                  <Input
                    id="contact_number"
                    type="tel"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    placeholder="e.g., 592XXXXXXX"
                    className={inputClass}
                  />
                </div>
              </TabsContent>
            </div>
          </Tabs>

          {/* Footer with Navigation and Submit */}
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex-shrink-0">
            <div className="flex items-center justify-between">
              {/* Navigation Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={goToPrevTab}
                  disabled={isFirstTab}
                  className="h-9 px-3 rounded-lg border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={goToNextTab}
                  disabled={isLastTab}
                  className="h-9 px-3 rounded-lg border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenChange(false)}
                  disabled={isSubmitting}
                  className="h-9 px-4 rounded-lg border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </Button>
                {!isEditing && (
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    disabled={isSubmitting}
                    onClick={() => setSaveAction('another')}
                    className="h-9 px-4 rounded-lg border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                  >
                    {isSubmitting && saveAction === 'another' ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save & Add Another"
                    )}
                  </Button>
                )}
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={() => setSaveAction('close')}
                  className="h-9 px-4 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/25"
                >
                  {isSubmitting && saveAction === 'close' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {isEditing ? "Updating..." : "Saving..."}
                    </>
                  ) : (
                    isEditing ? "Update Teacher" : "Save & Close"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
