import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/types/database"

// Check if environment variables are available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Missing Supabase environment variables. Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.",
  )
}

// Log the actual values being used
console.log("Supabase Client Initializing with URL:", supabaseUrl || "FALLBACK_URL_USED");
console.log("Supabase Client Initializing with Anon Key:", supabaseAnonKey ? "ANON_KEY_PROVIDED" : "FALLBACK_ANON_KEY_USED"); // Avoid logging the key itself

// Create the Supabase client using createBrowserClient for SSR/cookie-based auth
export const supabase = createBrowserClient<Database>(
  supabaseUrl || "https://your-project-url.supabase.co", // Fallback should ideally not be used in production
  supabaseAnonKey || "your-anon-key", // Fallback should ideally not be used in production
)

// Helper function to check if Supabase is properly configured
export function isSupabaseConfigured(): boolean {
  return !!supabaseUrl && !!supabaseAnonKey
}
