export type Permission = {
  id: string
  permission_key: string
  name: string
  description: string
  category: string
  is_active: boolean
  is_locked: boolean
  is_system: boolean
}

export type UserPermissions = {
  permissions: string[]  // Array of permission_keys
  role_id: string
  role_name: string
}
