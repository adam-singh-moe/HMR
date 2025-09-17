import { getUserDetails } from "@/app/actions/users"
import { redirect } from "next/navigation"
import { AccountSettings } from "@/components/account-settings"

export default async function SettingsPage() {
  const { user, error } = await getUserDetails()

  if (error || !user) {
    redirect("/auth")
  }

  return <AccountSettings user={user} />
}
