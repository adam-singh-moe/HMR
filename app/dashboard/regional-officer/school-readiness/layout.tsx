"use client"

import { ReactNode } from "react"

interface SchoolReadinessLayoutProps {
  children: ReactNode
}

export default function SchoolReadinessLayout({ children }: SchoolReadinessLayoutProps) {
  // The parent Regional Officer layout handles the sidebar, so just render children
  return <>{children}</>
}
