"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Calendar, ChevronRight, Clock, Download, Play, Trash2, Eye } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PerformanceChart } from "@/components/performance-chart"
import {
  getPracticeSessions,
  type PracticeSessionWithDetails,
  deletePracticeSession,
} from "@/services/practice-service"
import { getAllPresentations, type Presentation } from "@/services/presentation-service"
import { toast } from "@/components/ui/use-toast"
import { isSupabaseConfigured } from "@/utils/supabase-client"
import { initializeDatabase } from "@/utils/init-database"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { SessionDetailsDisplay } from "@/components/SessionDetailsDisplay"

export default function HistoryPage() {
  const [sessions, setSessions] = useState<PracticeSessionWithDetails[]>([])
  const [presentations, setPresentations] = useState<Presentation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [databaseError, setDatabaseError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [selectedTab, setSelectedTab] = useState("overview") // For aggregate analytics tabs
  const [selectedSessionForDetails, setSelectedSessionForDetails] = useState<PracticeSessionWithDetails | null>(null)
  const [rightPanelView, setRightPanelView] = useState<"overview" | "sessionDetails">("overview")

  // Check if Supabase is configured
  const supabaseConfigured = isSupabaseConfigured()

  const handleSelectSessionForDetails = (session: PracticeSessionWithDetails) => {
    setSelectedSessionForDetails(session)
    setRightPanelView("sessionDetails")
  }

  const handleCloseDetailsView = () => {
    setSelectedSessionForDetails(null)
    setRightPanelView("overview")
  }

  useEffect(() => {
    async function loadData() {
      try {
        if (!supabaseConfigured) {
          setIsLoading(false)
          return
        }

        // Initialize database if needed
        await initializeDatabase()

        try {
          const [sessionsData, presentationsData] = await Promise.all([getPracticeSessions(), getAllPresentations()])
          setDatabaseError(null)
          setSessions(sessionsData)
          setPresentations(presentationsData)
        } catch (error: any) {
          console.error("Error loading data:", error)
          // Check if this is a "relation does not exist" error
          if (error.message && error.message.includes("relation") && error.message.includes("does not exist")) {
            setDatabaseError(
              "Database tables not found. Please set up the database schema from the Presentations page.",
            )
          } else {
            toast({
              title: "Error",
              description: "Failed to load history data. Please try again.",
              variant: "destructive",
            })
          }
        }
      } catch (error) {
        console.error("Error loading data:", error)
        toast({
          title: "Error",
          description: "Failed to load history data. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [supabaseConfigured])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`
  }

  const playRecording = (audioUrl: string | null) => {
    if (audioUrl) {
      const audio = new Audio(audioUrl)
      audio.play()

      toast({
        title: "Playing audio...",
        description: "Listening to your recording.",
      })
    } else {
      toast({
        title: "No audio available",
        description: "This session doesn't have a recorded audio.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    try {
      setIsDeleting(sessionId)
      const success = await deletePracticeSession(sessionId)

      if (success) {
        setSessions(sessions.filter((session) => session.id !== sessionId))
        toast({
          title: "Success",
          description: "Practice session deleted successfully.",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to delete practice session. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting session:", error)
      toast({
        title: "Error",
        description: "Failed to delete practice session. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(null)
    }
  }

  // Calculate performance metrics
  const totalPracticeTime = sessions.reduce((total, session) => total + session.duration_seconds, 0)
  const averageScore =
    sessions.length > 0
      ? Math.round(
          sessions.reduce((total, session) => total + (session.analysis?.overallScore || 0), 0) / sessions.length,
        )
      : 0

  const averagePace =
    sessions.length > 0
      ? Math.round(sessions.reduce((total, session) => total + (session.analysis?.pace.wpm || 0), 0) / sessions.length)
      : 0

  const averageClarity =
    sessions.length > 0
      ? Math.round(
          sessions.reduce((total, session) => total + (session.analysis?.clarity.score || 0), 0) / sessions.length,
        )
      : 0

  // Calculate filler word counts
  const fillerWordCounts = {
    um: sessions.reduce((total, session) => {
      const umCount = session.analysis?.fillerWords.words.find((w) => w.word === "um")?.count
      return total + (umCount || 0)
    }, 0),
    uh: sessions.reduce((total, session) => {
      const uhCount = session.analysis?.fillerWords.words.find((w) => w.word === "uh")?.count
      return total + (uhCount || 0)
    }, 0),
    like: sessions.reduce((total, session) => {
      const likeCount = session.analysis?.fillerWords.words.find((w) => w.word === "like")?.count
      return total + (likeCount || 0)
    }, 0),
    so: sessions.reduce((total, session) => {
      const soCount = session.analysis?.fillerWords.words.find((w) => w.word === "so")?.count
      return total + (soCount || 0)
    }, 0),
    youKnow: sessions.reduce((total, session) => {
      const ykCount = session.analysis?.fillerWords.words.find((w) => w.word === "you know")?.count
      return total + (ykCount || 0)
    }, 0),
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-lg font-bold">Loading history data...</p>
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
              <span className="bg-red-500 text-white px-2 py-1 mr-2 rounded-md">PRACTICE</span>
              History
            </h1>
          </div>
        </div>
      </header>

      {!supabaseConfigured && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4 container mx-auto">
          <p className="font-bold">Supabase Not Configured</p>
          <p>
            Environment variables for Supabase are missing. Sample data is being displayed. Please check your
            environment configuration.
          </p>
        </div>
      )}
      {databaseError && (
        <div className="bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-4 mb-4 container mx-auto">
          <p className="font-bold">Database Setup Required</p>
          <p>{databaseError}</p>
          <Button
            asChild
            className="mt-2 bg-orange-500 hover:bg-orange-600 text-white font-bold border-2 border-black rounded-xl"
          >
            <Link href="/presentations">Go to Presentations Page</Link>
          </Button>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Session List */}
          <div className="lg:col-span-1">
            <Card className="border-3 border-black rounded-xl overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <CardHeader className="bg-green-400 border-b-2 border-black pb-4">
                <CardTitle className="text-xl font-bangers">Practice Sessions</CardTitle>
                <CardDescription className="text-black">Your recent practice sessions</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="p-4 rounded-lg bg-white border border-gray-200">
                        <Skeleton className="h-6 w-3/4 mb-2" />
                        <div className="flex items-center">
                          <Skeleton className="h-4 w-1/4 mr-4" />
                          <Skeleton className="h-4 w-1/4" />
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <div>
                            <Skeleton className="h-4 w-full mb-1" />
                            <Skeleton className="h-2 w-full" />
                          </div>
                          <div>
                            <Skeleton className="h-4 w-full mb-1" />
                            <Skeleton className="h-2 w-full" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : sessions.length > 0 ? (
                  <div className="space-y-4">
                    {sessions.map((session) => (
                      <div
                        key={session.id}
                        className={`p-4 rounded-lg transition-all bg-white border hover:border-black cursor-pointer ${
                          selectedSessionForDetails?.id === session.id ? "border-blue-500 border-2 shadow-md" : "border-gray-200"
                        }`}
                        onClick={() => handleSelectSessionForDetails(session)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-grow">
                            <h3 className="font-bold">{session.presentation_title}</h3>
                            <div className="flex items-center text-sm text-gray-500 mt-1">
                              <Calendar className="h-3 w-3 mr-1" />
                              {formatDate(session.created_at)}
                              <Clock className="h-3 w-3 ml-3 mr-1" />
                              {formatDuration(session.duration_seconds)}
                            </div>
                          </div>
                          <div className="flex space-x-1 items-center">
                            {(session.transcription || session.analysis) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 rounded-full text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                onClick={(e) => {
                                  e.stopPropagation() // Prevent card click
                                  handleSelectSessionForDetails(session)
                                }}
                              >
                                <Eye className="h-4 w-4" />
                                <span className="sr-only">View Details</span>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 rounded-full"
                              onClick={() => playRecording(session.audio_url)}
                              disabled={!session.audio_url}
                            >
                              <Play className="h-4 w-4" />
                              <span className="sr-only">Play</span>
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 rounded-full text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">Delete</span>
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="border-2 border-black">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Practice Session</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this practice session? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="border-2 border-black">Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-red-500 hover:bg-red-600 text-white border-2 border-black"
                                    onClick={() => handleDeleteSession(session.id)}
                                    disabled={isDeleting === session.id}
                                  >
                                    {isDeleting === session.id ? "Deleting..." : "Delete"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {session.analysis && (
                            <>
                              <div>
                                <div className="text-xs font-medium mb-1 flex justify-between">
                                  <span>Pace</span>
                                  <span>{session.analysis.pace.score}%</span>
                                </div>
                                <Progress value={session.analysis.pace.score} className="h-1.5" />
                              </div>
                              <div>
                                <div className="text-xs font-medium mb-1 flex justify-between">
                                  <span>Clarity</span>
                                  <span>{session.analysis.clarity.score}%</span>
                                </div>
                                <Progress value={session.analysis.clarity.score} className="h-1.5" />
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">No practice sessions found</p>
                    <Button
                      asChild
                      className="bg-green-500 hover:bg-green-600 text-white font-bold border-2 border-black rounded-xl"
                    >
                      <Link href="/practice/select">Start Practicing</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Analytics or Session Details */}
          <div className="lg:col-span-2">
            {rightPanelView === "sessionDetails" && selectedSessionForDetails ? (
              <SessionDetailsDisplay session={selectedSessionForDetails} onClose={handleCloseDetailsView} />
            ) : (
              <Card className="border-3 border-black rounded-xl overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <CardHeader className="bg-purple-400 border-b-2 border-black pb-4">
                  <CardTitle className="text-xl font-bangers">Performance Analytics</CardTitle>
                <CardDescription className="text-black">Track your improvement over time</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <Tabs defaultValue="overview" value={selectedTab} onValueChange={setSelectedTab}>
                  <TabsList className="grid w-full grid-cols-3 mb-6 bg-blue-100 p-1 rounded-lg border-2 border-black">
                    <TabsTrigger
                      value="overview"
                      className="data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-md font-bold"
                    >
                      Overview
                    </TabsTrigger>
                    <TabsTrigger
                      value="pace"
                      className="data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-md font-bold"
                    >
                      Pace & Clarity
                    </TabsTrigger>
                    <TabsTrigger
                      value="fillers"
                      className="data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-md font-bold"
                    >
                      Filler Words
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview">
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card className="border-2 border-black">
                          <CardHeader className="p-3">
                            <CardTitle className="text-sm font-bangers">Total Sessions</CardTitle>
                          </CardHeader>
                          <CardContent className="p-3 pt-0">
                            <div className="text-3xl font-black">{sessions.length}</div>
                            <p className="text-xs text-gray-500">All time</p>
                          </CardContent>
                        </Card>
                        <Card className="border-2 border-black">
                          <CardHeader className="p-3">
                            <CardTitle className="text-sm font-bangers">Practice Time</CardTitle>
                          </CardHeader>
                          <CardContent className="p-3 pt-0">
                            <div className="text-3xl font-black">{Math.floor(totalPracticeTime / 60)}m</div>
                            <p className="text-xs text-gray-500">Total time</p>
                          </CardContent>
                        </Card>
                        <Card className="border-2 border-black">
                          <CardHeader className="p-3">
                            <CardTitle className="text-sm font-bangers">Avg. Score</CardTitle>
                          </CardHeader>
                          <CardContent className="p-3 pt-0">
                            <div className="text-3xl font-black">{averageScore}%</div>
                            <p className="text-xs text-green-500">
                              {sessions.length > 1 ? "↑ 5% improvement" : "First session completed!"}
                            </p>
                          </CardContent>
                        </Card>
                        <Card className="border-2 border-black">
                          <CardHeader className="p-3">
                            <CardTitle className="text-sm font-bangers">Presentations</CardTitle>
                          </CardHeader>
                          <CardContent className="p-3 pt-0">
                            <div className="text-3xl font-black">{presentations.length}</div>
                            <p className="text-xs text-gray-500">Active projects</p>
                          </CardContent>
                        </Card>
                      </div>

                      <Card className="border-2 border-black">
                        <CardHeader className="p-4 pb-2">
                          <CardTitle className="text-lg font-bangers">Performance Trend</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                          {sessions.length > 0 ? (
                            <div className="h-[300px]">
                              <PerformanceChart sessions={sessions} />
                            </div>
                          ) : (
                            <div className="h-[300px] flex items-center justify-center">
                              <div className="text-center">
                                <p className="text-gray-500 mb-4">
                                  Complete practice sessions to see your performance trend
                                </p>
                                <Button
                                  asChild
                                  className="bg-green-500 hover:bg-green-600 text-white font-bold border-2 border-black rounded-xl"
                                >
                                  <Link href="/practice/select">Start Practicing</Link>
                                </Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="pace">
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="border-2 border-black">
                          <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-lg font-bold">Speaking Pace</CardTitle>
                          </CardHeader>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-center h-[200px]">
                              <div className="text-center">
                                <div className="text-5xl font-black mb-2">{averagePace}</div>
                                <div className="text-sm text-gray-500">words per minute</div>
                                <div className="mt-4 text-sm">
                                  <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded-full">
                                    Optimal range: 120-150 wpm
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="border-2 border-black">
                          <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-lg font-bold">Clarity Score</CardTitle>
                          </CardHeader>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-center h-[200px]">
                              <div className="text-center">
                                <div className="text-5xl font-black mb-2">{averageClarity}%</div>
                                <div className="text-sm text-gray-500">pronunciation clarity</div>
                                <div className="mt-4 text-sm">
                                  <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                                    {averageClarity > 80 ? "Excellent clarity!" : "Improvement area: Enunciation"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <Card className="border-2 border-black">
                        <CardHeader className="p-4 pb-2">
                          <CardTitle className="text-lg font-bold">Pace Variation</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                          {sessions.length > 0 ? (
                            <div className="h-[200px]">
                              {/* Pace variation chart would go here */}
                              <div className="flex items-center justify-center h-full">
                                <p className="text-gray-500">Pace variation data is being collected</p>
                              </div>
                            </div>
                          ) : (
                            <div className="h-[200px] flex items-center justify-center">
                              <div className="text-center">
                                <p className="text-gray-500 mb-4">
                                  Complete practice sessions to see pace variation data
                                </p>
                                <Button
                                  asChild
                                  className="bg-green-500 hover:bg-green-600 text-white font-bold border-2 border-black rounded-xl"
                                >
                                  <Link href="/practice/select">Start Practicing</Link>
                                </Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="fillers">
                    <div className="space-y-6">
                      <Card className="border-2 border-black">
                        <CardHeader className="p-4 pb-2">
                          <CardTitle className="text-lg font-bold">Filler Word Usage</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                            <div className="bg-red-100 p-3 rounded-lg border border-red-200 text-center">
                              <div className="text-2xl font-bold">{fillerWordCounts.um}</div>
                              <div className="text-sm text-gray-600">"Um"</div>
                            </div>
                            <div className="bg-orange-100 p-3 rounded-lg border border-orange-200 text-center">
                              <div className="text-2xl font-bold">{fillerWordCounts.uh}</div>
                              <div className="text-sm text-gray-600">"Uh"</div>
                            </div>
                            <div className="bg-yellow-100 p-3 rounded-lg border border-yellow-200 text-center">
                              <div className="text-2xl font-bold">{fillerWordCounts.like}</div>
                              <div className="text-sm text-gray-600">"Like"</div>
                            </div>
                            <div className="bg-green-100 p-3 rounded-lg border border-green-200 text-center">
                              <div className="text-2xl font-bold">{fillerWordCounts.so}</div>
                              <div className="text-sm text-gray-600">"So"</div>
                            </div>
                            <div className="bg-blue-100 p-3 rounded-lg border border-blue-200 text-center">
                              <div className="text-2xl font-bold">{fillerWordCounts.youKnow}</div>
                              <div className="text-sm text-gray-600">"You know"</div>
                            </div>
                          </div>

                          <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                            <h4 className="font-bold mb-2">Improvement Tips:</h4>
                            <ul className="text-sm space-y-2">
                              <li className="flex items-start">
                                <span className="inline-block bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center mr-2 mt-0.5">
                                  1
                                </span>
                                Practice pausing instead of using filler words
                              </li>
                              <li className="flex items-start">
                                <span className="inline-block bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center mr-2 mt-0.5">
                                  2
                                </span>
                                Record yourself and listen for patterns
                              </li>
                              <li className="flex items-start">
                                <span className="inline-block bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center mr-2 mt-0.5">
                                  3
                                </span>
                                Slow down your overall speaking pace
                              </li>
                            </ul>
                          </div>
                        </CardContent>
                      </Card>

                      <div className="flex justify-end">
                        <Button
                          className="bg-blue-500 hover:bg-blue-600 text-white font-bold border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                          disabled={sessions.length === 0}
                        >
                          <Download className="mr-2 h-4 w-4" />
                  Download Full Report
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
            )}

            <div className="mt-6 flex justify-end">
              <Button
                asChild
                className="bg-green-500 hover:bg-green-600 text-white font-bold border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                <Link href="/practice/select">
                  New Practice Session
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
