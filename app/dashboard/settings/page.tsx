import { getUserDetails } from "@/app/actions/users"
import { redirect } from "next/navigation"
import { AccountSettings } from "@/components/account-settings"
import { checkPermission } from "@/lib/permissions"

export default async function SettingsPage() {
  const { user, error } = await getUserDetails()

  if (error || !user) {
    redirect("/auth")
  }

  // Check profile-related permissions
  const [canViewOwn, canEditName, canUpdatePassword] = await Promise.all([
    checkPermission("users.view_own"),
    checkPermission("users.edit_name"),
    checkPermission("users.update_password"),
  ])

  // If user can't view their own profile, redirect to dashboard
  if (!canViewOwn) {
    redirect("/dashboard")
  }

  const permissions = {
    canEditName,
    canUpdatePassword,
  }

  return <AccountSettings user={user} permissions={permissions} />
}
