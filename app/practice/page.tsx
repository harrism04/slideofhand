"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, ChevronRight, Mic, MicOff, Save, Volume2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"
import { SlidePreview } from "@/components/slide-preview"
import { FeedbackPanel } from "@/components/feedback-panel"
import { AudioRecorder } from "@/utils/audio-recorder"
import {
  transcribeAudio,
  analyzeTranscription,
  type TranscriptionResult,
  type AnalysisResult,
} from "@/services/groq-service"
import { getPresentation, type PresentationWithSlides } from "@/services/presentation-service"
import { savePracticeSession } from "@/services/practice-service"
import { isSupabaseConfigured } from "@/utils/supabase-client"

export default function PracticePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const presentationId = searchParams.get("id")

  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [showFeedback, setShowFeedback] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [transcription, setTranscription] = useState<TranscriptionResult | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [presentation, setPresentation] = useState<PresentationWithSlides | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [databaseError, setDatabaseError] = useState<string | null>(null)

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioRecorderRef = useRef<AudioRecorder | null>(null)

  // Redirect to selection page if no presentation ID is provided
  useEffect(() => {
    if (!presentationId) {
      router.push("/practice/select")
    }
  }, [presentationId, router])

  // Fetch presentation data
  useEffect(() => {
    async function loadPresentation() {
      if (presentationId) {
        try {
          const data = await getPresentation(presentationId)
          if (data) {
            setPresentation(data)
            setDatabaseError(null)
          } else {
            toast({
              title: "Error",
              description: "Failed to load presentation. Please try again.",
              variant: "destructive",
            })
          }
        } catch (error: any) {
          // Check if this is a "relation does not exist" error
          if (error.message && error.message.includes("relation") && error.message.includes("does not exist")) {
            setDatabaseError(
              "Database tables not found. Please set up the database schema from the Presentations page.",
            )
          } else {
            toast({
              title: "Error",
              description: "Failed to load presentation. Please try again.",
              variant: "destructive",
            })
          }
        }
      }
      setIsLoading(false)
    }

    loadPresentation()
  }, [presentationId])

  useEffect(() => {
    // Initialize the audio recorder
    audioRecorderRef.current = new AudioRecorder()

    // Cleanup on unmount
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
    }
  }, [])

  // Check if Supabase is configured
  const supabaseConfigured = isSupabaseConfigured()

  const slides = presentation?.slides.length
    ? presentation.slides.map((slide) => ({
        title: slide.title,
        content: slide.content,
        imageUrl: slide.image_url || "/placeholder.svg?height=300&width=500",
      }))
    : [
        {
          title: "The Future of AI in Business",
          content:
            "Artificial Intelligence is transforming how businesses operate. Key impacts include:\n\n• Automation of routine tasks\n• Enhanced customer experiences\n• Data-driven decision making\n• New product innovation\n\nCompanies that embrace AI now will lead their industries tomorrow.",
          imageUrl: "/placeholder.svg?height=300&width=500",
        },
        {
          title: "Key AI Technologies",
          content:
            "• Machine Learning\n• Natural Language Processing\n• Computer Vision\n• Predictive Analytics\n• Robotic Process Automation",
          imageUrl: "/placeholder.svg?height=300&width=500",
        },
        {
          title: "Implementation Strategy",
          content:
            "1. Assess business needs\n2. Start with pilot projects\n3. Build internal capabilities\n4. Scale successful initiatives\n5. Monitor and optimize",
          imageUrl: "/placeholder.svg?height=300&width=500",
        },
      ]

  // Update the toggleRecording function to handle the mock transcription better
  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false)
      setIsProcessing(true)

      // Clear the timer interval
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }

      // Define local variables for auto-save to ensure fresh data is used
      let audioBlobForAutoSave: Blob | null = null
      let transcriptionForAutoSave: TranscriptionResult | null = null
      let analysisForAutoSave: AnalysisResult | null = null

      try {
        // Stop the audio recording and get the audio blob
        if (audioRecorderRef.current) {
          const blob = await audioRecorderRef.current.stopRecording()
          setAudioBlob(blob)
          audioBlobForAutoSave = blob // Capture for auto-save

          toast({
            title: "Processing recording...",
            description: "Analyzing your presentation.",
          })

          try {
            // Transcribe the audio
            const transcriptionResult = await transcribeAudio(blob)
            setTranscription(transcriptionResult)
            transcriptionForAutoSave = transcriptionResult // Capture for auto-save

            // Check if this is a mock or error transcription
            const isMockOrError =
              transcriptionResult.text.includes("mock") ||
              transcriptionResult.text.includes("unavailable") ||
              transcriptionResult.text.includes("failed")

            if (isMockOrError) {
              // For mock or error transcriptions, provide a basic analysis
              const fallbackAnalysisData = {
                pace: {
                  score: 75,
                  feedback: "We couldn't analyze your pace due to transcription limitations.",
                  wpm: Math.round(elapsedTime > 0 ? 100 : 0), // Estimate based on average
                },
                clarity: {
                  score: 70,
                  feedback: "Speech clarity analysis is unavailable due to transcription limitations.",
                },
                fillerWords: {
                  score: 80,
                  feedback: "Filler word detection is unavailable due to transcription limitations.",
                  words: [],
                },
                // engagement: { // REMOVED
                //   score: 75,
                //   feedback: "Engagement analysis is unavailable due to transcription limitations.",
                // },
                improvements: [ // Default improvements if analysis fails at this stage
                  "Transcription was limited; try speaking more clearly.",
                  "Ensure your microphone is close and unobstructed.",
                  "Attempt recording in a quieter environment.",
                ],
                overallScore: 75, // Overall score can be a general estimate
              };
              setAnalysis(fallbackAnalysisData);
              analysisForAutoSave = fallbackAnalysisData; // Capture for auto-save

              toast({
                title: "Limited Analysis Available",
                description:
                  "We've provided basic feedback based on your recording. Detailed transcription is currently unavailable.",
              })
            } else {
              // For successful transcriptions, perform full analysis
              try {
                // Make sure we're passing the correct data types
                const currentSlideContents = presentation?.slides.map(
                  (slide) => `${slide.title || ""} ${slide.content || ""}`,
                ) || []
                const analysisResult = await analyzeTranscription(
                  transcriptionResult,
                  elapsedTime,
                  currentSlideContents,
                )
                setAnalysis(analysisResult)
                analysisForAutoSave = analysisResult; // Capture for auto-save

                toast({
                  title: "Analysis complete",
                  description: "Your practice session has been analyzed.",
                })
              } catch (analysisError) {
                console.error("Error in analysis:", analysisError)
                // Set fallback analysis
                const fallbackAnalysisData = {
                  pace: {
                    score: 75,
                    feedback: "Unable to analyze pace due to processing error.",
                    wpm: Math.round(elapsedTime > 0 ? 100 : 0),
                  },
                  clarity: {
                    score: 75,
                    feedback: "Unable to analyze clarity due to processing error.",
                  },
                  fillerWords: {
                    score: 75,
                    feedback: "Unable to analyze filler words due to processing error.",
                    words: [],
                  },
                  // engagement: { // REMOVED
                  //   score: 75,
                  //   feedback: "Unable to analyze engagement due to processing error.",
                  // },
                  improvements: [ // Default improvements if analysis fails at this stage
                        "Analysis processing failed; please try recording again.",
                        "Ensure your internet connection is stable.",
                        "If the issue persists, the analysis service might be temporarily down.",
                   ],
                  overallScore: 75,
                };
                setAnalysis(fallbackAnalysisData);
                analysisForAutoSave = fallbackAnalysisData; // Capture for auto-save

                toast({
                  title: "Analysis Error",
                  description: "There was an error analyzing your presentation. Basic feedback provided.",
                  variant: "destructive",
                })
              }
            }
          } catch (transcriptionError) {
            console.error("Error in transcription:", transcriptionError)
            // Set fallback analysis
            // Note: transcriptionForAutoSave would have been set by transcribeAudio's own fallback if it returned one.
            // If transcribeAudio threw before returning, transcriptionForAutoSave might be null or hold a previous value.
            // However, the current implementation of transcribeAudio catches its errors and returns a fallback object.
            const fallbackAnalysisData = {
              pace: {
                score: 75,
                feedback: "Unable to analyze pace due to transcription error.",
                wpm: 0,
              },
              clarity: {
                score: 75,
                feedback: "Unable to analyze clarity due to transcription error.",
              },
              fillerWords: {
                    score: 75,
                    feedback: "Unable to analyze filler words due to transcription error.",
                    words: [],
                  },
                  // engagement: { // REMOVED
                  //   score: 75,
                  //   feedback: "Unable to analyze engagement due to transcription error.",
                  // },
                  improvements: [ // Default improvements if analysis fails at this stage
                        "Transcription failed; please check microphone settings.",
                        "Ensure you've granted microphone permissions to the browser.",
                        "Try a short test recording to verify microphone input.",
                  ],
              overallScore: 75,
            };
            setAnalysis(fallbackAnalysisData);
            analysisForAutoSave = fallbackAnalysisData; // Capture for auto-save

            toast({
              title: "Transcription error",
              description: "There was an error transcribing your presentation. Basic feedback provided.",
              variant: "destructive",
            })
          }

          setShowFeedback(true)
          setIsProcessing(false)

          // Auto-save the session
          if (presentationId && supabaseConfigured) {
            setIsSaving(true); // Indicate saving process for UI consistency
            try {
              const result = await savePracticeSession(
                presentationId,
                elapsedTime,
                audioBlobForAutoSave, // Use the captured blob
                transcriptionForAutoSave,
                analysisForAutoSave,
              );

              if (result) {
                toast({
                  title: "Session auto-saved!",
                  description: "Your practice session has been automatically saved.",
                });
              } else {
                // This case might indicate an issue within savePracticeSession not throwing an error but returning null
                throw new Error("Failed to auto-save session (returned null)");
              }
            } catch (error) {
              console.error("Error auto-saving session:", error);
              toast({
                title: "Error auto-saving session",
                description: "There was an error automatically saving your session. You can try saving manually.",
                variant: "destructive",
              });
            } finally {
              setIsSaving(false);
            }
          }
        }
      } catch (error) {
        console.error("Error processing recording:", error)
        setIsProcessing(false)

        toast({
          title: "Error processing recording",
          description: "There was an error processing your recording. Please try again.",
          variant: "destructive",
        })
      }
    } else {
      // Start recording
      try {
        if (audioRecorderRef.current) {
          await audioRecorderRef.current.startRecording()

          setIsRecording(true)
          setElapsedTime(0)
          setShowFeedback(false)
          setTranscription(null)
          setAnalysis(null)
          setAudioBlob(null)

          // Simulate timer
          const timer = setInterval(() => {
            setElapsedTime((prev) => {
              if (prev >= 120) {
                clearInterval(timer)
                toggleRecording() // Auto-stop at 2 minutes
                return prev
              }
              return prev + 1
            })
          }, 1000)

          // Store the timer reference
          timerIntervalRef.current = timer

          toast({
            title: "Recording started",
            description: "Speak clearly and at a natural pace.",
          })
        }
      } catch (error) {
        console.error("Error starting recording:", error)

        toast({
          title: "Error starting recording",
          description: "Could not access microphone. Please check permissions and try again.",
          variant: "destructive",
        })
      }
    }
  }

  const saveSession = async () => {
    if (!presentationId) {
      toast({
        title: "Error",
        description: "No presentation selected. Please select a presentation first.",
        variant: "destructive",
      })
      return
    }

    if (!supabaseConfigured) {
      toast({
        title: "Supabase not configured",
        description: "Cannot save session. Supabase environment variables are missing.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)

    try {
      const result = await savePracticeSession(presentationId, elapsedTime, audioBlob, transcription, analysis)

      if (result) {
        toast({
          title: "Session saved!",
          description: "Your practice session has been saved.",
        })
      } else {
        throw new Error("Failed to save session")
      }
    } catch (error) {
      console.error("Error saving session:", error)
      toast({
        title: "Error saving session",
        description: "There was an error saving your practice session. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const playRecording = () => {
    if (audioBlob) {
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)
      audio.play()

      toast({
        title: "Playing audio...",
        description: "Listening to your recording.",
      })
    }
  }

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1)
    }
  }

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-lg font-bold">Loading presentation...</p>
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
              Mode
            </h1>
          </div>
        </div>
      </header>

      {!supabaseConfigured && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4 container mx-auto">
          <p className="font-bold">Supabase Not Configured</p>
          <p>
            Environment variables for Supabase are missing. Some features like saving sessions and loading presentations
            will not work. Please check your environment configuration.
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
          {/* Left Column - Slides Navigation */}
          <div className="lg:col-span-1">
            <Card className="border-3 border-black rounded-xl overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <CardHeader className="bg-blue-400 border-b-2 border-black pb-4">
                <CardTitle className="text-xl font-bangers">Presentation Slides</CardTitle>
                <CardDescription className="text-black">
                  {presentation?.title || "Navigate through your slides"}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  {slides.map((slide, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg cursor-pointer transition-all ${
                        currentSlide === index
                          ? "bg-yellow-200 border-2 border-black"
                          : "bg-white border border-gray-200 hover:border-black"
                      }`}
                      onClick={() => setCurrentSlide(index)}
                    >
                      <h3 className="font-bold truncate">{slide.title}</h3>
                      <p className="text-xs text-gray-500">Slide {index + 1}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recording Controls */}
            <Card className="border-3 border-black rounded-xl overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mt-6">
              <CardHeader className="bg-red-400 border-b-2 border-black pb-4">
                <CardTitle className="text-xl font-bangers">Recording Controls</CardTitle>
                <CardDescription className="text-black">Practice your presentation</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="text-lg font-bangers text-2xl">{formatTime(elapsedTime)}</div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          isRecording
                            ? "bg-red-500 animate-pulse"
                            : isProcessing
                              ? "bg-yellow-500 animate-pulse"
                              : "bg-gray-300"
                        }`}
                      ></div>
                      <span className="text-sm">
                        {isRecording ? "Recording" : isProcessing ? "Processing" : "Ready"}
                      </span>
                    </div>
                  </div>

                  <Progress value={(elapsedTime / 120) * 100} className="h-2" />

                  <div className="flex justify-center gap-4">
                    <Button
                      onClick={toggleRecording}
                      disabled={isProcessing || isSaving}
                      className={`${
                        isRecording ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"
                      } text-white font-bold border-2 border-black rounded-xl w-full disabled:opacity-50`}
                    >
                      {isRecording ? (
                        <>
                          <MicOff className="mr-2 h-4 w-4" />
                          Stop Recording
                        </>
                      ) : (
                        <>
                          <Mic className="mr-2 h-4 w-4" />
                          Start Recording
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={prevSlide}
                      disabled={currentSlide === 0 || isRecording}
                      className="border-2 border-black rounded-xl bg-white text-black font-bold disabled:opacity-50"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      onClick={nextSlide}
                      disabled={currentSlide === slides.length - 1 || isRecording}
                      className="border-2 border-black rounded-xl bg-white text-black font-bold disabled:opacity-50"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Middle Column - Current Slide */}
          <div className="lg:col-span-2">
            <Card className="border-3 border-black rounded-xl overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <CardHeader className="bg-purple-400 border-b-2 border-black pb-4">
                <CardTitle className="text-xl font-bangers">Current Slide</CardTitle>
                <CardDescription className="text-black">
                  Slide {currentSlide + 1} of {slides.length}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="aspect-[16/9] bg-white rounded-xl border-2 border-black overflow-hidden shadow-md">
                  <SlidePreview
                    title={slides[currentSlide].title}
                    content={slides[currentSlide].content}
                    imageUrl={slides[currentSlide].imageUrl}
                  />
                </div>

                {showFeedback && (
                  <div className="mt-6">
                    <Tabs defaultValue="feedback">
                      <TabsList className="grid w-full grid-cols-2 mb-4 bg-blue-100 p-1 rounded-lg border-2 border-black">
                        <TabsTrigger
                          value="feedback"
                          className="data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-md font-bold"
                        >
                          Real-time Feedback
                        </TabsTrigger>
                        <TabsTrigger
                          value="transcript"
                          className="data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-md font-bold"
                        >
                          Transcript
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="feedback">
                        <FeedbackPanel 
                          feedbackData={analysis} 
                          audioBlob={audioBlob} 
                          recordingDuration={elapsedTime} 
                        />
                      </TabsContent>
                      <TabsContent value="transcript">
                        <Card className="border-2 border-black">
                          <CardContent className="p-4">
                            <div className="max-h-[300px] overflow-y-auto space-y-4 p-2">
                              {transcription ? (
                                <div className="space-y-2">
                                  {transcription.segments.map((segment) => (
                                    <div key={segment.id} className="flex items-start gap-2">
                                      <div className="font-bold whitespace-nowrap">
                                        {formatTime(Math.floor(segment.start))}
                                      </div>
                                      <p className={segment.confidence < 0.7 ? "text-red-500" : ""}>"{segment.text}"</p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-center text-gray-500">
                                  No transcript available. Record your presentation to see the transcript.
                                </p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
              </CardContent>
            </Card>

            {showFeedback && (
              <div className="mt-6 flex gap-4">
                <Button
                  className="bg-green-500 hover:bg-green-600 text-white font-bold border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  onClick={saveSession}
                  disabled={isSaving || !presentationId}
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Session
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="bg-white text-black font-bold border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  onClick={playRecording}
                  disabled={!audioBlob}
                >
                  <Volume2 className="mr-2 h-4 w-4" />
                  Play Recording
                </Button>
                <Button
                  asChild
                  className="ml-auto bg-blue-500 hover:bg-blue-600 text-white font-bold border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                >
                  <Link href="/history">
                    View History
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
