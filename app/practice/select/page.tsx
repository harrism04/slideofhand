"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, ChevronRight, Mic, MessageSquareText, Plus } from "lucide-react"
import { isSupabaseConfigured } from "@/utils/supabase-client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { getAllPresentations, type PresentationWithPreviewData } from "@/services/presentation-service"

export default function PracticeSelectPage() {
  const router = useRouter()
  const [presentations, setPresentations] = useState<PresentationWithPreviewData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [databaseError, setDatabaseError] = useState<string | null>(null)

  // Check if Supabase is configured
  const supabaseConfigured = isSupabaseConfigured()

  useEffect(() => {
    async function loadPresentations() {
      try {
        if (!supabaseConfigured) {
          // If Supabase is not configured, use empty data
          setIsLoading(false)
          return
        }

        const data = await getAllPresentations()

        // If we get here, we have data or an empty array (no error)
        setDatabaseError(null)
        setPresentations(data)
      } catch (error: any) {
        console.error("Error loading presentations:", error)

        // Check if this is a "relation does not exist" error
        if (error.message && error.message.includes("relation") && error.message.includes("does not exist")) {
          setDatabaseError("Database tables not found. You need to set up the database schema.")
        } else {
          toast({
            title: "Error",
            description: "Failed to load presentations. Please try again.",
            variant: "destructive",
          })
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadPresentations()
  }, [supabaseConfigured])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-lg font-bold">Loading presentations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-blue-50">
      {/* Header */}
      <header className="bg-yellow-400 py-4 border-b-4 border-black">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center text-black font-bold hover:underline">
              <ArrowLeft className="mr-2 h-5 w-5" />
              Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bangers text-black">
              <span className="bg-red-500 text-white px-2 py-1 mr-2 rounded-md">SELECT</span>
              Presentation
            </h1>
          </div>
        </div>
      </header>

      {!supabaseConfigured && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4 container mx-auto">
          <p className="font-bold">Supabase Not Configured</p>
          <p>
            Environment variables for Supabase are missing. You won't be able to load presentations. Please check your
            environment configuration.
          </p>
        </div>
      )}

      {databaseError && (
        <div className="bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-4 mb-4 container mx-auto">
          <p className="font-bold">Database Setup Required</p>
          <p className="mb-2">{databaseError}</p>
          <p className="mb-2">Please set up the database schema from the Presentations page.</p>
          <Button
            asChild
            className="mt-2 bg-orange-500 hover:bg-orange-600 text-white font-bold border-2 border-black rounded-xl"
          >
            <Link href="/presentations">Go to Presentations Page</Link>
          </Button>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bangers mb-4">Choose a Presentation to Practice</h2>
          <p className="text-lg max-w-2xl mx-auto">
            Select one of your presentations below to start practicing. You'll be able to record yourself and get AI
            feedback on your delivery.
          </p>
        </div>

        {presentations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {presentations.map((presentation) => (
              <Card
                key={presentation.id}
                className="border-3 border-black rounded-xl overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-4px] transition-transform"
              >
                <CardHeader className="bg-blue-400 border-b-2 border-black pb-4">
                  <CardTitle className="text-xl font-inter truncate">{presentation.title}</CardTitle>
                  <CardDescription className="text-black">
                    Created on {formatDate(presentation.created_at)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="aspect-video bg-white rounded-lg border-2 border-black flex items-center justify-center overflow-hidden">
                    {presentation.first_slide_image_url ? (
                      <img
                        src={presentation.first_slide_image_url}
                        alt={presentation.title || "Presentation preview"}
                        className="w-full h-full object-contain"
                      />
                    ) : presentation.first_slide_content ? (
                      <div className="text-center p-4 overflow-hidden">
                        <p className="text-gray-700 text-sm break-words line-clamp-6">
                          {presentation.first_slide_content}
                        </p>
                      </div>
                    ) : (
                      <div className="text-center p-4">
                        <Mic className="mx-auto mb-2 h-12 w-12 text-gray-300" />
                        <p className="text-gray-500">Practice this presentation</p>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-0 flex flex-col sm:flex-row gap-2">
                  <Button
                    asChild
                    className="w-full sm:w-1/2 bg-green-500 hover:bg-green-600 text-white font-bold border-2 border-black rounded-xl"
                  >
                    <Link href={`/practice?id=${presentation.id}`}>
                      <Mic className="mr-2 h-4 w-4" />
                      Standard
                    </Link>
                  </Button>
                  <Button
                    asChild
                    className="w-full sm:w-1/2 bg-purple-500 hover:bg-purple-600 text-white font-bold border-2 border-black rounded-xl"
                  >
                    <Link href={`/practice/interactive/${presentation.id}`}>
                      <MessageSquareText className="mr-2 h-4 w-4" />
                      Interactive
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-xl border-2 border-black">
            <Mic className="mx-auto mb-4 h-16 w-16 text-gray-300" />
            <h3 className="text-xl font-bold mb-2">No presentations yet</h3>
            <p className="text-gray-500 mb-6">Create your first presentation to start practicing</p>
            <Button
              asChild
              className="bg-green-500 hover:bg-green-600 text-white font-bold border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              <Link href="/presentations">
                <Plus className="mr-2 h-4 w-4" />
                Create Presentation
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
