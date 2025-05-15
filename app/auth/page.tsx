"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Auth } from "@supabase/auth-ui-react"
import { ThemeSupa } from "@supabase/auth-ui-shared"
import { supabase } from "@/utils/supabase-client"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function AuthPage() {
  const router = useRouter()

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN") {
          // Redirect to home or a dashboard page after sign-in
          router.push("/")
        }
      },
    )

    // Check if user is already signed in
    async function getUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push("/") // Redirect if already logged in
      }
    }
    getUser();


    return () => {
      authListener?.subscription?.unsubscribe()
    }
  }, [router])

  return (
    <div className="min-h-screen bg-blue-50 flex flex-col items-center justify-center p-4">
      <div className="absolute top-4 left-4">
        <Link
          href="/"
          className="flex items-center text-black font-bold hover:underline bg-yellow-400 border-2 border-black px-4 py-2 rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all"
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Back to Home
        </Link>
      </div>
      <div className="w-full max-w-md p-8 bg-white border-3 border-black rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <h1 className="text-3xl font-bangers text-center text-black mb-6">
          <span className="bg-red-500 text-white px-2 py-1 mr-2 rounded-md">
            JOIN
          </span>
          Slides On Hand AI
        </h1>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={["google", "github"]} // Example providers, can be customized
          redirectTo={typeof window !== 'undefined' ? window.location.origin : undefined}
          localization={{
            variables: {
              sign_in: {
                email_label: "Email address",
                password_label: "Password",
                button_label: "Sign In",
                social_provider_text: "Sign in with {{provider}}",
                link_text: "Already have an account? Sign In",
              },
              sign_up: {
                email_label: "Email address",
                password_label: "Password",
                button_label: "Sign Up",
                social_provider_text: "Sign up with {{provider}}",
                link_text: "Don't have an account? Sign Up",
              },
              forgotten_password: {
                email_label: "Email address",
                button_label: "Send reset instructions",
                link_text: "Forgot your password?",
              },
            },
          }}
        />
      </div>
    </div>
  )
}
