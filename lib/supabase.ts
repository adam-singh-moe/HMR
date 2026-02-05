import "server-only"

import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Ensure you have a .env.local file in the project root and restart the dev server.`
    )
  }
  return value
}

// Server-side Supabase client
export async function createServerSupabaseClient() {
  const cookieStore = await cookies()
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: any) => cookieStore.set(name, value, options),
        remove: (name: string, options: any) => cookieStore.set(name, "", options),
      },
    } as any
  )
}

export function createServiceRoleSupabaseClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE environment variable.")
  }

  // Warn if using the exposed key
  if (!process.env.SUPABASE_SERVICE_ROLE && process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE) {
    console.warn("SECURITY WARNING: Using NEXT_PUBLIC_SUPABASE_SERVICE_ROLE. This key is exposed to the browser. Please rename to SUPABASE_SERVICE_ROLE.")
  }

  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
