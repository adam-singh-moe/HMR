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
import { Loader2, User } from "lucide-react"
import { addTeacher, updateTeacher, Teacher, getTeacherStatuses, TeacherStatus } from "@/app/actions/teachers"

interface AddTeacherModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teacher?: Teacher | null
  onSuccess: () => void
}

export function AddTeacherModal({ open, onOpenChange, teacher, onSuccess }: AddTeacherModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const [statuses, setStatuses] = useState<TeacherStatus[]>([])
  const [loadingStatuses, setLoadingStatuses] = useState(true)
  
  // Form state
  const [firstName, setFirstName] = useState(teacher?.first_name || "")
  const [middleName, setMiddleName] = useState(teacher?.middle_name || "")
  const [lastName, setLastName] = useState(teacher?.last_name || "")
  const [statusId, setStatusId] = useState(teacher?.status_id || "")
  const [dateOfBirth, setDateOfBirth] = useState(teacher?.date_of_birth || "")
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
    setStatusId("")
    setDateOfBirth("")
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
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const formData = new FormData()
    formData.append("first_name", firstName)
    formData.append("middle_name", middleName)
    formData.append("last_name", lastName)
    formData.append("status_id", statusId)
    formData.append("date_of_birth", dateOfBirth)
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
        setIsSubmitting(false)
        return
      }
      if (!hasMoeEmail && emailAddress.endsWith("@moe.edu.gy")) {
        setError("Non-MOE email cannot end with @moe.edu.gy")
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
          // Keep modal open and reset form for another entry
          resetForm()
          // Scroll to top of form
          formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        } else {
          // Close modal
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
      setStatusId(teacher.status_id || "")
      setDateOfBirth(teacher.date_of_birth || "")
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {isEditing ? "Edit Teacher" : "Add New Teacher"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Update the teacher's information below." 
              : "Enter the teacher's information below to add them to your school."}
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 border-b pb-2">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="middle_name">Middle Name</Label>
                <Input
                  id="middle_name"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  placeholder="Middle name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={statusId} onValueChange={setStatusId}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingStatuses ? "Loading..." : "Select a status"} />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((status) => (
                      <SelectItem key={status.id} value={status.id}>
                        {status.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* CPCE Education */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 border-b pb-2">CPCE Education</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cpce_major">Major at CPCE</Label>
                <Input
                  id="cpce_major"
                  value={cpceMajor}
                  onChange={(e) => setCpceMajor(e.target.value)}
                  placeholder="e.g., Primary Education"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpce_minor">Minor at CPCE</Label>
                <Input
                  id="cpce_minor"
                  value={cpceMinor}
                  onChange={(e) => setCpceMinor(e.target.value)}
                  placeholder="e.g., Mathematics"
                />
              </div>
            </div>
          </div>

          {/* University of Guyana Education */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 border-b pb-2">University of Guyana Education</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ug_major">Major at UG</Label>
                <Input
                  id="ug_major"
                  value={ugMajor}
                  onChange={(e) => setUgMajor(e.target.value)}
                  placeholder="e.g., Education"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ug_minor">Minor at UG</Label>
                <Input
                  id="ug_minor"
                  value={ugMinor}
                  onChange={(e) => setUgMinor(e.target.value)}
                  placeholder="e.g., English"
                />
              </div>
            </div>
          </div>

          {/* Appointment Dates */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 border-b pb-2">Appointment Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="current_appt_date">Date of Current Appointment</Label>
                <Input
                  id="current_appt_date"
                  type="date"
                  value={currentApptDate}
                  onChange={(e) => setCurrentApptDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_appt_date">Date of Last Appointment</Label>
                <Input
                  id="last_appt_date"
                  type="date"
                  value={lastApptDate}
                  onChange={(e) => setLastApptDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Advanced Degrees */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 border-b pb-2">Advanced Degrees</h3>
            
            {/* Masters Degree */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Do you have a Master's Degree?</Label>
                <RadioGroup
                  value={hasMastersDegree ? "yes" : "no"}
                  onValueChange={(value) => setHasMastersDegree(value === "yes")}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="masters_yes" />
                    <Label htmlFor="masters_yes" className="font-normal cursor-pointer">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="masters_no" />
                    <Label htmlFor="masters_no" className="font-normal cursor-pointer">No</Label>
                  </div>
                </RadioGroup>
              </div>
              {hasMastersDegree && (
                <div className="ml-10 space-y-2">
                  <Label htmlFor="masters_degree">Area of Master's Degree</Label>
                  <Input
                    id="masters_degree"
                    value={mastersDegree}
                    onChange={(e) => setMastersDegree(e.target.value)}
                    placeholder="e.g., Educational Administration"
                  />
                </div>
              )}
            </div>

            {/* PhD */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Do you have a PhD?</Label>
                <RadioGroup
                  value={hasPhd ? "yes" : "no"}
                  onValueChange={(value) => setHasPhd(value === "yes")}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="phd_yes" />
                    <Label htmlFor="phd_yes" className="font-normal cursor-pointer">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="phd_no" />
                    <Label htmlFor="phd_no" className="font-normal cursor-pointer">No</Label>
                  </div>
                </RadioGroup>
              </div>
              {hasPhd && (
                <div className="ml-10 space-y-2">
                  <Label htmlFor="phd">Area of PhD</Label>
                  <Input
                    id="phd"
                    value={phd}
                    onChange={(e) => setPhd(e.target.value)}
                    placeholder="e.g., Curriculum Development"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 border-b pb-2">Contact Information</h3>
            
            {/* MOE Email */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Does the teacher have an MOE email address?</Label>
                <RadioGroup
                  value={hasMoeEmail ? "yes" : "no"}
                  onValueChange={(value) => {
                    setHasMoeEmail(value === "yes")
                    setEmailAddress("") // Clear email when switching
                  }}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="moe_email_yes" />
                    <Label htmlFor="moe_email_yes" className="font-normal cursor-pointer">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="moe_email_no" />
                    <Label htmlFor="moe_email_no" className="font-normal cursor-pointer">No</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email_address">
                  {hasMoeEmail ? "MOE Email Address" : "Email Address"}
                </Label>
                <Input
                  id="email_address"
                  type="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  placeholder={hasMoeEmail ? "teacher@moe.edu.gy" : "teacher@email.com"}
                />
                <p className="text-xs text-gray-500">
                  {hasMoeEmail 
                    ? "Email must end with @moe.edu.gy" 
                    : "Enter a personal or alternative email (not @moe.edu.gy)"
                  }
                </p>
              </div>
            </div>

            {/* Contact Number */}
            <div className="space-y-2">
              <Label htmlFor="contact_number">Contact Number (Cellular)</Label>
              <Input
                id="contact_number"
                type="tel"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                placeholder="e.g., 592-XXX-XXXX"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            {!isEditing && (
              <Button
                type="submit"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => setSaveAction('another')}
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
              disabled={isSubmitting}
              onClick={() => setSaveAction('close')}
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
        </form>
      </DialogContent>
    </Dialog>
  )
}
