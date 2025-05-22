"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { User } from "@supabase/supabase-js"
import { supabase } from "@/utils/supabase-client"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogIn, LogOut, Settings, UserCircle } from "lucide-react" // Added Settings and UserCircle
import EditDisplayNameModal from "./EditDisplayNameModal"

export default function AuthStatus() {
  const [user, setUser] = useState<User | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false) // Added state for modal
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

  // Determine what to display
  const displayNameToShow = user?.user_metadata?.display_name || user?.email;

  const handleDisplayNameUpdateSuccess = (newDisplayName: string) => {
    if (user) {
      const updatedUser = {
        ...user,
        user_metadata: {
          ...user.user_metadata,
          display_name: newDisplayName,
        },
      }
      setUser(updatedUser as User) // Update local user state
    }
  }

  return (
    <div className="flex items-center gap-3">
      {user ? (
        <>
          <span className="text-sm text-black hidden sm:inline">
            {displayNameToShow}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-black hover:bg-gray-200"
                aria-label="User menu"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <DropdownMenuLabel className="font-bangers text-lg">My Account</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-300" />
              <DropdownMenuItem
                onClick={() => setIsModalOpen(true)}
                className="cursor-pointer hover:bg-yellow-100"
              >
                <UserCircle className="mr-2 h-4 w-4" />
                <span>Edit Display Name</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer text-red-600 hover:!text-red-600 hover:!bg-red-100"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
      {user && (
        <EditDisplayNameModal
          user={user}
          isOpen={isModalOpen}
          onOpenChange={setIsModalOpen}
          onSuccess={handleDisplayNameUpdateSuccess}
        />
      )}
    </div>
  )
}
