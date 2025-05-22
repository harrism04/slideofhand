"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ChevronLeft, ChevronRight, Mic, Send, Volume2, Square, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card" // Added CardDescription
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "@/components/ui/use-toast"
import { SlidePreview } from "@/components/slide-preview" // Added SlidePreview
import { getPresentation, type PresentationWithSlides } from "@/services/presentation-service" // Changed getPresentationById to getPresentation
import { getInteractiveChatResponse, type InteractiveChatResponse } from "@/services/practice-service"
import { transcribeAudio, type TranscriptionResult } from "@/services/groq-service"
import { AudioRecorder, convertBlobToBase64 } from "@/utils/audio-recorder" // Assuming AudioRecorder is updated or suitable

// Define ChatCompletionMessageParam to match the one expected by getInteractiveChatResponse
interface ApiChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  name?: string;
}

// Define message type for conversation history
interface ChatMessage {
  id: string
  sender: "user" | "ai"
  text: string
  audioBase64?: string
  contentType?: string
}

export default function InteractivePracticePage() {
  const router = useRouter()
  const params = useParams()
  const presentationId = params.presentationId as string

  const [presentation, setPresentation] = useState<PresentationWithSlides | null>(null)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([])
  const [userInput, setUserInput] = useState("")
  const [isLoading, setIsLoading] = useState(false) // For AI responses
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [inputMode, setInputMode] = useState<"text" | "voice">("text") // "text" or "voice"
  const [initialAudio, setInitialAudio] = useState<{ audioBase64: string; contentType: string } | null>(null);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  const audioRecorderRef = useRef<AudioRecorder | null>(null)
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  const currentSlide = presentation?.slides?.[currentSlideIndex]

  // Initialize AudioRecorder
  useEffect(() => {
    audioRecorderRef.current = new AudioRecorder()
    audioPlayerRef.current = new Audio()
    return () => {
      if (audioRecorderRef.current && audioRecorderRef.current.isRecording()) {
        audioRecorderRef.current.stopRecording().catch(error => {
          console.warn("Error stopping recording on unmount:", error);
        });
      }
      // Clean up audio player
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.src = ""; // Release object URL / audio source
      }
    }
  }, [])

  // Fetch presentation data
  useEffect(() => {
    if (presentationId) {
      const fetchPresentation = async () => {
        try {
          setIsLoading(true)
          const data = await getPresentation(presentationId) // Changed getPresentationById to getPresentation
          if (data) {
            setPresentation(data)
            if (data.slides && data.slides.length > 0) {
              fetchInitialAIQuestion(data.slides[0].title, data.slides[0].content || "")
            }
          } else {
            toast({ title: "Error", description: "Presentation not found.", variant: "destructive" })
            router.push("/practice/select")
          }
        } catch (error) {
          console.error("Error fetching presentation:", error)
          toast({ title: "Error", description: "Failed to load presentation.", variant: "destructive" })
        } finally {
          setIsLoading(false)
        }
      }
      fetchPresentation()
    }
  }, [presentationId, router])

  // Scroll to bottom of chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [conversationHistory])

  // Wrapped fetchInitialAIQuestion in useCallback and added dependencies
  const fetchInitialAIQuestion = useCallback(async (slideTitle: string | null, slideContent: string) => {
    setIsLoading(true)
    try {
      const response = await getInteractiveChatResponse(slideTitle || undefined, slideContent, undefined, [])
      setConversationHistory([{
        id: crypto.randomUUID(),
        sender: "ai",
        text: response.aiTextResponse,
        audioBase64: response.aiAudioBase64,
        contentType: response.contentType,
      }])
      if (response.aiAudioBase64 && audioPlayerRef.current) {
        // Don't play immediately, store for user interaction
        setInitialAudio({ audioBase64: response.aiAudioBase64, contentType: response.contentType });
      }
    } catch (error) {
      console.error("Error fetching initial AI question:", error)
      toast({ title: "Error", description: "Failed to get initial AI question.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }, [setIsLoading, setConversationHistory, toast]) // Added dependencies

  const handlePlayInitialAudio = () => {
    if (initialAudio && audioPlayerRef.current) {
      audioPlayerRef.current.src = `data:${initialAudio.contentType};base64,${initialAudio.audioBase64}`;
      audioPlayerRef.current.play().catch(e => console.error("Error playing initial AI audio:", e));
      setInitialAudio(null); // Clear it after playing
      setHasUserInteracted(true);
    }
  };

  const handleSendMessage = async (messageText?: string) => {
    if (!hasUserInteracted) setHasUserInteracted(true);
    const textToSend = messageText || userInput
    if (!textToSend.trim() || !currentSlide) return

    // Snapshot of history *before* adding the current user's message for the API call
    const currentHistoryForAPI: ApiChatMessage[] = conversationHistory.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text
    }));

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      sender: "user",
      text: textToSend,
    }
    // Add user message to local UI state immediately
    setConversationHistory(prev => [...prev, userMessage])
    setUserInput("")
    setIsLoading(true)

    try {
      const response = await getInteractiveChatResponse(
        currentSlide.title,
        currentSlide.content || "",
        textToSend, // Current user's response text
        currentHistoryForAPI // History *before* the current user's response
      )

      const aiMessage: ChatMessage = {
        id: crypto.randomUUID(),
        sender: "ai",
        text: response.aiTextResponse,
        audioBase64: response.aiAudioBase64,
        contentType: response.contentType,
      }
      setConversationHistory(prev => [...prev, aiMessage])

      if (response.aiAudioBase64 && audioPlayerRef.current) {
        audioPlayerRef.current.src = `data:${response.contentType};base64,${response.aiAudioBase64}`
        audioPlayerRef.current.play().catch(e => console.error("Error playing AI audio:", e));
      }
    } catch (error) {
      console.error("Error sending message:", error)
      toast({ title: "Error", description: "Failed to get AI response.", variant: "destructive" })
      // Optionally add an error message to chat
      setConversationHistory(prev => [...prev, {
        id: crypto.randomUUID(),
        sender: "ai",
        text: "Sorry, I encountered an error. Please try again."
      }]);
    } finally {
      setIsLoading(false)
    }
  }

  const toggleRecording = async () => {
    if (!hasUserInteracted) setHasUserInteracted(true);
    if (!audioRecorderRef.current) return;

    if (isRecording) {
      setIsRecording(false)
      setIsTranscribing(true)
      try {
        const audioBlob = await audioRecorderRef.current.stopRecording()
        if (audioBlob) {
          const transcriptionResult = await transcribeAudio(audioBlob)
          if (transcriptionResult && transcriptionResult.text) {
            handleSendMessage(transcriptionResult.text)
          } else {
            toast({ title: "Transcription Error", description: "Could not transcribe audio.", variant: "destructive" })
          }
        }
      } catch (error) {
        console.error("Error during transcription:", error)
        toast({ title: "Error", description: "Failed to process audio.", variant: "destructive" })
      } finally {
        setIsTranscribing(false)
      }
    } else {
      try {
        await audioRecorderRef.current.startRecording()
        setIsRecording(true)
      } catch (error) {
        console.error("Error starting recording:", error)
        toast({ title: "Recording Error", description: "Could not start recording. Check microphone permissions.", variant: "destructive" })
      }
    }
  }

  const handleNextSlide = () => {
    if (presentation && currentSlideIndex < presentation.slides.length - 1) {
      const nextIndex = currentSlideIndex + 1
      setCurrentSlideIndex(nextIndex)
      setConversationHistory([]) // Reset conversation for new slide
      fetchInitialAIQuestion(presentation.slides[nextIndex].title, presentation.slides[nextIndex].content || "")
    }
  }

  const handlePrevSlide = () => {
    if (currentSlideIndex > 0 && presentation) {
      const prevIndex = currentSlideIndex - 1
      setCurrentSlideIndex(prevIndex)
      setConversationHistory([]) // Reset conversation for new slide
      fetchInitialAIQuestion(presentation.slides[prevIndex].title, presentation.slides[prevIndex].content || "")
    }
  }
  
  const playAudio = (audioBase64?: string, contentType?: string) => {
    if (audioBase64 && contentType && audioPlayerRef.current) {
      audioPlayerRef.current.src = `data:${contentType};base64,${audioBase64}`;
      audioPlayerRef.current.play().catch(e => console.error("Error playing audio:", e));
    }
  };


  if (!presentation && !isLoading) { // Initial loading for presentation
    return (
      <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center">
        <p>Loading presentation...</p>
      </div>
    )
  }
   if (!presentation && isLoading) { // Still loading presentation
    return (
      <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
        <p className="text-lg font-bold">Loading presentation...</p>
      </div>
    );
  }


  if (!currentSlide && presentation && presentation.slides.length > 0) {
     // This case should ideally be handled by initial AI question fetch or if slides are empty
    return (
      <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center">
        <p>No slides in this presentation or error loading current slide.</p>
         <Button onClick={() => router.push("/practice/select")}>Back to Select</Button>
      </div>
    );
  }
  
  if (presentation && presentation.slides.length === 0) {
    return (
      <div className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-4 text-gray-900">No Slides</h1>
        <p className="mb-4 text-center text-gray-700">This presentation has no slides. Interactive Q&A requires slide content.</p>
        <Button onClick={() => router.push("/practice/select")} className="bg-blue-500 hover:bg-blue-600 text-white">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Select Presentation
        </Button>
      </div>
    );
  }


  return (
    <div className="flex flex-col h-screen bg-blue-50 text-black">
      {/* Header */}
      <header className="bg-yellow-400 text-black p-4 shadow-lg border-b-4 border-black">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/practice/select" className="flex items-center hover:underline font-bold">
            <ArrowLeft className="mr-2 h-5 w-5" />
            Back to Select
          </Link>
          <h1 className="text-2xl font-bangers tracking-wider">
            <span className="bg-red-500 text-white px-2 py-1 mr-2 rounded-md">INTERACTIVE</span> Q&A Practice
          </h1>
          <div className="w-20"> {/* Placeholder for right alignment */}</div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row container mx-auto p-4 gap-8 overflow-hidden">
        {/* Slide Display Area */}
        <div className="md:w-1/2 lg:w-2/3 flex flex-col bg-gray-50 rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-3 border-black p-4">
          <CardHeader className="bg-purple-400 border-b-2 border-black pb-4">
            <CardTitle className="text-xl font-bangers text-black">
              Current Slide
            </CardTitle>
            <CardDescription className="text-black">
              Slide {currentSlideIndex + 1} of {presentation?.slides?.length || 0}
            </CardDescription>
          </CardHeader>
          <div className="flex-1 my-4 overflow-hidden"> {/* This container maintains flex behavior and vertical margins, now with overflow-hidden */}
            <div className="relative aspect-[16/9] bg-white rounded-xl border-2 border-black overflow-hidden shadow-md h-full">
              <SlidePreview
                title={currentSlide?.title || "Untitled Slide"}
                content={currentSlide?.content || ""}
                imageUrl={currentSlide?.image_url || undefined}
              />
            </div>
          </div>
          <div className="flex justify-between items-center p-2">
            <Button
              onClick={handlePrevSlide}
              disabled={currentSlideIndex === 0}
              className="border-2 border-black rounded-xl bg-white text-black font-bold disabled:opacity-50 hover:bg-gray-100 px-6 py-3 text-lg"
            >
              <ChevronLeft className="mr-2 h-6 w-6" /> Prev
            </Button>
            <Button
              onClick={handleNextSlide}
              disabled={!presentation || currentSlideIndex === presentation.slides.length - 1}
              className="border-2 border-black rounded-xl bg-white text-black font-bold disabled:opacity-50 hover:bg-gray-100 px-6 py-3 text-lg"
            >
              Next <ChevronRight className="ml-2 h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Chat Area */}
        <div className="md:w-1/2 lg:w-1/3 flex flex-col bg-gray-50 rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-3 border-black">
          <CardHeader className="bg-blue-400 border-b-2 border-black py-4">
            <CardTitle className="text-xl font-bangers text-black text-center">Conversation</CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1 p-4" ref={chatContainerRef}>
            <div className="space-y-4">
              {initialAudio && !hasUserInteracted && conversationHistory.length > 0 && conversationHistory[0].sender === 'ai' && (
                <div className="flex justify-center my-4">
                  <Button onClick={handlePlayInitialAudio} className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg shadow-md border-2 border-black">
                    <Volume2 className="mr-2 h-5 w-5" /> Play Introduction
                  </Button>
                </div>
              )}
              {conversationHistory.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`p-3 rounded-xl max-w-[85%] shadow-md text-sm ${
                      msg.sender === "user"
                        ? "bg-blue-500 text-white rounded-br-none"
                        : "bg-yellow-200 text-black rounded-bl-none border-2 border-black"
                    }`}
                  >
                    <p>{msg.text}</p>
                    {msg.sender === "ai" && msg.audioBase64 && (
                       <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => playAudio(msg.audioBase64, msg.contentType)}
                        className="mt-2 text-red-500 hover:text-red-600 p-1 h-auto flex items-center"
                        aria-label="Play AI response audio"
                      >
                        <Volume2 className="h-4 w-4 mr-1" /> Listen
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && conversationHistory.length > 0 && conversationHistory[conversationHistory.length -1].sender === 'user' && (
                <div className="flex justify-start">
                  <div className="p-3 rounded-lg max-w-[85%] bg-yellow-200 text-black rounded-bl-none animate-pulse border-2 border-black">
                    <p className="text-sm">AI is thinking...</p>
                  </div>
                </div>
              )}
               {isTranscribing && (
                <div className="flex justify-end">
                  <div className="p-3 rounded-lg max-w-[85%] bg-blue-500 text-white rounded-br-none animate-pulse">
                    <p className="text-sm">Transcribing your audio...</p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="p-4 border-t-2 border-gray-200">
            {inputMode === "text" ? (
              <div className="flex items-center gap-3">
                <Textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Type your response..."
                  className="flex-1 bg-white border-2 border-black focus:ring-yellow-400 focus:border-yellow-400 text-black placeholder-gray-600 rounded-lg p-3"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                />
                <Button
                  onClick={() => handleSendMessage()}
                  disabled={isLoading || isTranscribing || !userInput.trim()}
                  className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold border-2 border-black rounded-lg px-5 py-3"
                  aria-label="Send message"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <Button
                  onClick={toggleRecording}
                  disabled={isTranscribing || isLoading}
                  className={`p-4 h-16 w-16 rounded-full font-bold border-2 border-black shadow-lg
                    ${isRecording ? "bg-red-500 hover:bg-red-600 animate-pulse" : "bg-green-500 hover:bg-green-600"}
                  `}
                  aria-label={isRecording ? "Stop recording" : "Start recording"}
                >
                  {isRecording ? <Square className="h-8 w-8 text-white" /> : <Mic className="h-8 w-8 text-white" />}
                </Button>
              </div>
            )}
            <div className="mt-3 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setInputMode(prev => prev === "text" ? "voice" : "text")}
                className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-md px-3 py-2"
                aria-label={inputMode === "text" ? "Switch to voice input" : "Switch to text input"}
              >
                {inputMode === "text" ? <Mic className="h-4 w-4 mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" /> } 
                Switch to {inputMode === "text" ? "Voice" : "Text"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
