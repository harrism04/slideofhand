"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { User } from "@supabase/supabase-js"
import { supabase } from "@/utils/supabase-client"
import { Button } from "@/components/ui/button"
import { LogIn, LogOut, UserCircle } from "lucide-react"

export default function AuthStatus() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function getUserSession() {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)
    }

    getUserSession()

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        if (event === "SIGNED_OUT") {
          // Optionally redirect to home or auth page after sign out
          // router.push('/');
        }
      },
    )

    return () => {
      authListener?.subscription?.unsubscribe()
    }
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/") // Redirect to home after logout
    router.refresh(); // Refresh server components
  }

  if (loading) {
    return <div className="text-sm text-black">Loading...</div>
  }

  return (
    <div className="flex items-center gap-3">
      {user ? (
        <>
          <span className="text-sm text-black hidden sm:inline">
            {user.email}
          </span>
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="bg-red-500 hover:bg-red-600 text-white font-bold border-2 border-black rounded-lg"
          >
            <LogOut className="mr-1 h-4 w-4" />
            Logout
          </Button>
        </>
      ) : (
        <Button
          asChild
          variant="outline"
          size="sm"
          className="bg-green-500 hover:bg-green-600 text-white font-bold border-2 border-black rounded-lg"
        >
          <Link href="/auth">
            <LogIn className="mr-1 h-4 w-4" />
            Login / Sign Up
          </Link>
        </Button>
      )}
    </div>
  )
}
