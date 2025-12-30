import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

// Server-side Supabase client
export async function createServerSupabaseClient() {
  const cookieStore = await cookies()
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: any) => cookieStore.set(name, value, options),
        remove: (name: string, options: any) => cookieStore.set(name, "", options),
      },
    } as any
  )
}

// Server-side Supabase client with service role (bypasses RLS)
export function createServiceRoleSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                      process.env.SUPABASE_URL || 
                      process.env.NEXT_APP_SUPABASE_URL;
                      
  const serviceRoleKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE || 
                         process.env.SUPABASE_SERVICE_ROLE_KEY || 
                         process.env.SUPABASE_SERVICE_KEY ||
                         process.env.SUPABASE_SERVICE_ROLE;
                         
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Supabase Service Role Client: Missing environment variables.', {
      hasUrl: !!supabaseUrl,
      hasKey: !!serviceRoleKey
    });
  }

  return createClient(
    supabaseUrl!,
    serviceRoleKey!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// Client-side Supabase client (singleton pattern)
let clientSupabase: ReturnType<typeof createClient> | null = null

export function createClientSupabaseClient() {
  if (!clientSupabase) {
    clientSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  }
  return clientSupabase
}
