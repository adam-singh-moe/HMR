// types/index.d.ts
export type ReportData = {
  title: string
  attendance: number
  notes: string
  // Add other dummy fields here
}

export type HmrUser = {
  id: string
  name: string
  email: string
  role_id: string
  school: string | null
  region: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  hmr_user_roles?: { name: string } // Joined role name
}

export type Report = {
  id: string
  teacher_id: string
  report_data: ReportData
  created_at: string
  updated_at: string
  hmr_users?: HmrUser // Joined user details
}

export type HmrReport = {
  id: string
  school_id: string
  headteacher_id: string
  month: number
  year: number
  education_district: string
  created_on: string
  updated_on: string
  deleted_on: string | null
  // Joined data
  sms_schools?: { id: string; name: string }
  sms_regions?: { id: string; name: string }
  hmr_users?: HmrUser
}

export type School = {
  id: string
  name: string
  region_id: string
}

export type SchoolWithRegion = {
  id: string
  name: string
  address: string | null
  phone: string | null
  email: string | null
  created_at: string
  region_name: string
}

export type Region = {
  id: string
  name: string
}

export type Notification = {
  id: string
  title: string
  message: string
  created_by: string
  created_at: string
  target_all_users: boolean
  target_user_roles: string[] | null
  target_school_levels: string[] | null
  target_regions: string[] | null
  target_user_ids: string[] | null
  priority: 'low' | 'normal' | 'high' | 'urgent'
  notification_type: 'general' | 'announcement' | 'deadline' | 'update' | 'alert'
  expires_at: string | null
  is_active: boolean
  // Joined data
  hmr_users?: HmrUser
}
