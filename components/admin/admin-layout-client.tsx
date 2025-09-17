"use client"

import type React from "react"
import { useRef } from "react"
import { AdminSidebarClient, AdminSidebarRef } from "./admin-sidebar-client"
import { AdminHeader } from "./admin-header"

interface AdminLayoutClientProps {
  children: React.ReactNode
  pendingCount: number
}

export function AdminLayoutClient({ children, pendingCount }: AdminLayoutClientProps) {
  const sidebarRef = useRef<AdminSidebarRef>(null)

  const handleMobileMenuToggle = () => {
    sidebarRef.current?.toggleMobileMenu()
  }

  return (
    <>
      {/* CSS to hide main header on mobile for admin routes */}
      <style jsx global>{`
        .admin-hide-on-mobile {
          display: none;
        }
        @media (min-width: 1024px) {
          .admin-hide-on-mobile {
            display: block;
          }
        }
      `}</style>
      
      <div className="flex h-screen bg-gray-50">
        {/* Container with no top margin to eliminate white space */}
        <div className="flex w-full ml-0 mr-4 lg:mr-8 mb-4 bg-white rounded-r-lg shadow-sm overflow-hidden">
          <AdminSidebarClient ref={sidebarRef} pendingCount={pendingCount} />
          <div className="flex-1 flex flex-col">
            <AdminHeader 
              pendingCount={pendingCount} 
              onMobileMenuToggle={handleMobileMenuToggle}
            />
            <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
              {children}
            </main>
          </div>
        </div>
      </div>
    </>
  )
}
