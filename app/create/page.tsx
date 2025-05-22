"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, ChevronRight, Globe, Plus, Save, Trash, Wand2 } from "lucide-react"
import { ThinkingProgress, type ProgressStep } from "@/components/ui/thinking-progress" // Added import
import { FileUpload } from "@/components/file-upload"; // Import FileUpload
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Added import for Select

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { SlidePreview } from "@/components/slide-preview"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { generatePresentation, summarizeUrl, generateImageForSlide, type GeneratedSlide } from "@/services/openai-service"
import {
  getPresentation,
  addSlide,
  updateSlide,
  deleteSlide,
  type PresentationWithSlides,
  type Slide,
} from "@/services/presentation-service"
import { isSupabaseConfigured, supabase } from "@/utils/supabase-client" // Import supabase

export default function CreatePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const presentationId = searchParams.get("id")

  const [presentation, setPresentation] = useState<PresentationWithSlides | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [editingSlide, setEditingSlide] = useState<Slide | null>(null)
  const [slideTitle, setSlideTitle] = useState("")
  const [slideContent, setSlideContent] = useState("")
  const [slideImageUrl, setSlideImageUrl] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [databaseError, setDatabaseError] = useState<string | null>(null)
  const [showThinkingOverlay, setShowThinkingOverlay] = useState(false); // Added state

  // Presentation Mode states
  const [isPresentationModeOpen, setIsPresentationModeOpen] = useState(false)
  const [presentationMode, setPresentationMode] = useState<"topic" | "bullets" | "content" | "summary">("topic")
  const [presentationInput, setPresentationInput] = useState("")
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [showImportDialog, setShowImportDialog] = useState(false); // State for import dialog
  const [presentationAudience, setPresentationAudience] = useState<string>("C-Level Executives");
  const [presentationGoal, setPresentationGoal] = useState<string>("");

  // Check if Supabase is configured
  const supabaseConfigured = isSupabaseConfigured()

  // Define steps for ThinkingProgress - these IDs must align with backend stream stepIds
  const presentationCreationSteps: ProgressStep[] = [
    { id: "init", label: "Initializing...", details: "Getting things started." },
    { id: "prompt_setup", label: "Configuring Prompts...", details: "Preparing AI instructions." },
    { id: "url_crawl", label: "Fetching URL Content", details: "Scanning website if provided." },
    { id: "llm_content", label: "Generating Slide Content...", details: "AI is drafting your slides." },
    { id: "save_initial_slides", label: "Saving Slide Structure...", details: "Storing the generated content." },
    { id: "image_generation_overall", label: "Generating Slide Images...", details: "Creating visuals for your slides." },
    { id: "finalize", label: "Finalizing Presentation...", details: "Almost there!" },
  ];

  // State for stream-driven progress
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [stepMessages, setStepMessages] = useState<Record<string, string | null>>({});
  const [stepStatuses, setStepStatuses] = useState<Record<string, "pending" | "in_progress" | "completed" | "error">>({});
  const [currentOverallProgress, setCurrentOverallProgress] = useState(0);
  const [streamError, setStreamError] = useState<string | null>(null);
  // const [finalPresentationDataFromStream, setFinalPresentationDataFromStream] = useState<any>(null); // If needed to store final data

  useEffect(() => {
    async function loadPresentation() {
      if (!presentationId) {
        setIsLoading(false)
        return
      }

      try {
        const data = await getPresentation(presentationId)
        if (data) {
          setPresentation(data)
          setDatabaseError(null)

          // If there are slides, set the first one as current
          if (data.slides.length > 0) {
            setCurrentSlideIndex(0)
            const firstSlide = data.slides[0]
            setEditingSlide(firstSlide)
            setSlideTitle(firstSlide.title)
            setSlideContent(firstSlide.content)
            setSlideImageUrl(firstSlide.image_url || "")
          } else {
            // No slides yet, set up for creating a new one
            setEditingSlide(null)
            setSlideTitle("")
            setSlideContent("")
            setSlideImageUrl("")
          }
        } else {
          toast({
            title: "Error",
            description: "Failed to load presentation. Please try again.",
            variant: "destructive",
          })
          router.push("/presentations")
        }
      } catch (error: any) {
        // Check if this is a "relation does not exist" error
        if (error.message && error.message.includes("relation") && error.message.includes("does not exist")) {
          setDatabaseError("Database tables not found. Please set up the database schema.")
        } else {
          toast({
            title: "Error",
            description: "Failed to load presentation. Please try again.",
            variant: "destructive",
          })
          router.push("/presentations")
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadPresentation()
  }, [presentationId, router])

  const handleSlideSelect = (index: number) => {
    if (index < 0 || !presentation || index >= presentation.slides.length) return

    setCurrentSlideIndex(index)
    const selectedSlide = presentation.slides[index]
    setEditingSlide(selectedSlide)
    setSlideTitle(selectedSlide.title)
    setSlideContent(selectedSlide.content)
    setSlideImageUrl(selectedSlide.image_url || "")
  }

  const handleSaveSlide = async () => {
    if (!presentationId || !supabaseConfigured) {
      toast({
        title: "Error",
        description: "Cannot save slide. Please check your configuration.",
        variant: "destructive",
      })
      return
    }

    if (!slideTitle.trim()) {
      toast({
        title: "Error",
        description: "Slide title is required.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)

    try {
      if (editingSlide) {
        // Update existing slide
        const updatedSlide = await updateSlide(editingSlide.id, {
          title: slideTitle,
          content: slideContent,
          image_url: slideImageUrl || null,
        })

        if (updatedSlide) {
          // Update the presentation state
          const updatedSlides = [...(presentation?.slides || [])]
          updatedSlides[currentSlideIndex] = updatedSlide
          setPresentation({
            ...(presentation as PresentationWithSlides),
            slides: updatedSlides,
          })

          toast({
            title: "Success",
            description: "Slide updated successfully.",
          })
        } else {
          throw new Error("Failed to update slide")
        }
      } else {
        // Create new slide
        const newSlide = await addSlide(supabase, { // Pass supabase client
          presentation_id: presentationId,
          title: slideTitle,
          content: slideContent,
          image_url: slideImageUrl || null,
          order: presentation?.slides.length || 0,
        })

        if (newSlide) {
          // Update the presentation state
          const updatedSlides = [...(presentation?.slides || []), newSlide]
          setPresentation({
            ...(presentation as PresentationWithSlides),
            slides: updatedSlides,
          })
          setCurrentSlideIndex(updatedSlides.length - 1)
          setEditingSlide(newSlide)

          toast({
            title: "Success",
            description: "New slide created successfully.",
          })
        } else {
          throw new Error("Failed to create slide")
        }
      }
    } catch (error) {
      console.error("Error saving slide:", error)
      toast({
        title: "Error",
        description: "Failed to save slide. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteSlide = async () => {
    if (!editingSlide || !presentation) return

    try {
      const success = await deleteSlide(editingSlide.id)

      if (success) {
        // Update the presentation state
        const updatedSlides = presentation.slides.filter((slide) => slide.id !== editingSlide.id)
        setPresentation({
          ...presentation,
          slides: updatedSlides,
        })

        // Select a new current slide
        if (updatedSlides.length > 0) {
          const newIndex = Math.min(currentSlideIndex, updatedSlides.length - 1)
          setCurrentSlideIndex(newIndex)
          const newCurrentSlide = updatedSlides[newIndex]
          setEditingSlide(newCurrentSlide)
          setSlideTitle(newCurrentSlide.title)
          setSlideContent(newCurrentSlide.content)
          setSlideImageUrl(newCurrentSlide.image_url || "")
        } else {
          // No slides left
          setEditingSlide(null)
          setSlideTitle("")
          setSlideContent("")
          setSlideImageUrl("")
        }

        toast({
          title: "Success",
          description: "Slide deleted successfully.",
        })
      } else {
        throw new Error("Failed to delete slide")
      }
    } catch (error) {
      console.error("Error deleting slide:", error)
      toast({
        title: "Error",
        description: "Failed to delete slide. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleNewSlide = () => {
    setEditingSlide(null)
    setSlideTitle("")
    setSlideContent("")
    setSlideImageUrl("")
  }

  const handleGeneratePresentation = async () => {
    if (!presentationId || !supabaseConfigured) {
      toast({
        title: "Error",
        description: "Cannot generate presentation. Please check your configuration.",
        variant: "destructive",
      })
      return
    }

    // Validate input based on mode
    if (presentationMode !== "summary" && !presentationInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter the required input for this mode.",
        variant: "destructive",
      })
      return
    }

    if (presentationMode === "summary" && !websiteUrl.trim() && !presentationInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter either a website URL or text to summarize.",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true);
    setIsPresentationModeOpen(false);
    setShowThinkingOverlay(true);
    setStreamError(null);
    // Reset statuses for new generation
    const initialStatuses: Record<string, "pending" | "in_progress" | "completed" | "error"> = {};
    presentationCreationSteps.forEach(step => initialStatuses[step.id] = "pending");
    setStepStatuses(initialStatuses);
    setStepMessages({});
    setCurrentOverallProgress(0);

    try {
      const response = await fetch("/api/generate-presentation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: presentationMode,
          input: presentationMode === "summary" && websiteUrl.trim() ? websiteUrl : presentationInput, // Send URL if summary mode and URL is present
          presentationId,
          title: presentation?.title,
          audience: presentationAudience,
          goal: presentationGoal,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      if (!response.body) {
        throw new Error("Response body is null");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let accumulatedJson = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        const chunk = decoder.decode(value, { stream: !done });
        
        // Process Server-Sent Events (SSE)
        const lines = (accumulatedJson + chunk).split("\n\n");
        accumulatedJson = lines.pop() || ""; // Keep incomplete line for next chunk

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.substring(6);
            try {
              const streamData = JSON.parse(jsonStr);

              if (streamData.type === "step_update" && streamData.stepId) {
                setActiveStepId(streamData.stepId);
                setStepStatuses(prev => ({ ...prev, [streamData.stepId!]: streamData.status || "in_progress" }));
                if (streamData.message) {
                  setStepMessages(prev => ({ ...prev, [streamData.stepId!]: streamData.message }));
                }
                // Calculate progress based on completed steps
                const completedCount = Object.values(stepStatuses).filter(s => s === "completed").length;
                const totalSteps = presentationCreationSteps.length;
                setCurrentOverallProgress(totalSteps > 0 ? (completedCount / totalSteps) * 100 : 0);

              } else if (streamData.type === "final_data" && streamData.data?.slides) {
                toast({ title: "Success!", description: streamData.message || "Presentation generated successfully." });
                // Update presentation state with new slides
                const newSlides = streamData.data.slides as Slide[];
                setPresentation(prev => ({
                  ...(prev as PresentationWithSlides),
                  slides: newSlides,
                }));
                if (newSlides.length > 0) {
                  setCurrentSlideIndex(0);
                  const firstSlide = newSlides[0];
                  setEditingSlide(firstSlide);
                  setSlideTitle(firstSlide.title);
                  setSlideContent(firstSlide.content);
                  setSlideImageUrl(firstSlide.image_url || "");
                }
                // Ensure final step is marked completed for progress bar
                setStepStatuses(prev => ({ ...prev, finalize: "completed" }));
                setCurrentOverallProgress(100);
                // setFinalPresentationDataFromStream(streamData.data); // If needed
              
              } else if (streamData.type === "error") {
                console.error("Stream error:", streamData.message);
                setStreamError(streamData.message || "An unknown error occurred during generation.");
                if (streamData.stepId) {
                  setStepStatuses(prev => ({ ...prev, [streamData.stepId!]: "error" }));
                }
                toast({ title: "Error", description: streamData.message, variant: "destructive" });
                done = true; // Stop processing on error
              }
            } catch (e) {
              console.error("Error parsing stream JSON:", e, "Chunk:", jsonStr);
            }
          }
        }
      }
      if (accumulatedJson.startsWith("data: ")) { // Process any remaining part
          const jsonStr = accumulatedJson.substring(6);
            try {
              const streamData = JSON.parse(jsonStr);
               if (streamData.type === "final_data" && streamData.data?.slides) {
                 // (Duplicate logic for safety, ideally stream ends cleanly)
                toast({ title: "Success!", description: streamData.message || "Presentation generated successfully." });
                const newSlides = streamData.data.slides as Slide[];
                setPresentation(prev => ({
                  ...(prev as PresentationWithSlides),
                  slides: newSlides,
                }));
                 if (newSlides.length > 0) {
                  setCurrentSlideIndex(0);
                  const firstSlide = newSlides[0];
                  setEditingSlide(firstSlide);
                  setSlideTitle(firstSlide.title);
                  setSlideContent(firstSlide.content);
                  setSlideImageUrl(firstSlide.image_url || "");
                }
                setStepStatuses(prev => ({ ...prev, finalize: "completed" }));
                setCurrentOverallProgress(100);
               }
             } catch(e) { /* ignore trailing parse error */ }
      }

      // After stream processing is done, and if no stream error:
      if (!streamError && presentationId) {
        try {
          toast({ title: "Refreshing Data", description: "Fetching latest presentation details..." });
          const freshPresentationData = await getPresentation(presentationId);
          if (freshPresentationData) {
            setPresentation(freshPresentationData);
            if (freshPresentationData.slides.length > 0) {
              setCurrentSlideIndex(0);
              const firstSlide = freshPresentationData.slides[0];
              setEditingSlide(firstSlide);
              setSlideTitle(firstSlide.title);
              setSlideContent(firstSlide.content);
              setSlideImageUrl(firstSlide.image_url || "");
              toast({ title: "Ready!", description: "Presentation loaded for editing." });
            } else {
              // Handle case where generation resulted in no slides
              setPresentation(prev => ({ ...(prev as PresentationWithSlides), slides: [] })); // Ensure presentation object exists but slides are empty
              setCurrentSlideIndex(0);
              setEditingSlide(null);
              setSlideTitle("");
              setSlideContent("");
              setSlideImageUrl("");
              toast({ title: "Notice", description: "Presentation generated with no slides." });
            }
          } else {
            toast({ title: "Refresh Error", description: "Could not refresh presentation data after generation.", variant: "destructive" });
          }
        } catch (refreshError: any) {
          console.error("Error refreshing presentation data post-generation:", refreshError);
          toast({ title: "Refresh Error", description: `Failed to load final presentation: ${refreshError.message}`, variant: "destructive" });
        }
      }

    } catch (error: any) {
      console.error("Error generating presentation via stream:", error);
      toast({
        title: "Generation Error",
        description: error.message || "Failed to generate presentation. Please try again.",
        variant: "destructive",
      });
      setStreamError(error.message || "Failed to generate presentation.");
    } finally {
      setIsGenerating(false);
      setShowThinkingOverlay(false);
      setActiveStepId(null); // Reset active step
    }
  };

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

  if (!presentationId) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-bold mb-4">No presentation selected</p>
          <Button
            asChild
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold border-2 border-black rounded-xl"
          >
            <Link href="/presentations">Go to Presentations</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-blue-50">
      {showThinkingOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <ThinkingProgress
            steps={presentationCreationSteps}
            title="Crafting Your Presentation..."
            activeStepId={activeStepId}
            stepMessages={stepMessages}
            stepStatuses={stepStatuses}
            overallProgress={currentOverallProgress}
            isGlobalError={!!streamError}
            globalErrorMessage={streamError || undefined}
          />
        </div>
      )}
      {/* Header */}
      <header className="bg-yellow-400 py-4 border-b-4 border-black">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <Link href="/presentations" className="flex items-center text-black font-bold hover:underline">
              <ArrowLeft className="mr-2 h-5 w-5" />
              Back to Presentations
            </Link>
            <h1 className="text-2xl font-bangers text-black">
              <span className="bg-red-500 text-white px-2 py-1 mr-2 rounded-md">EDIT</span>
              Presentation
            </h1>
          </div>
        </div>
      </header>

      {!supabaseConfigured && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4 container mx-auto">
          <p className="font-bold">Supabase Not Configured</p>
          <p>
            Environment variables for Supabase are missing. You won't be able to save your changes. Please check your
            environment configuration.
          </p>
        </div>
      )}

      {databaseError && (
        <div className="bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-4 mb-4 container mx-auto">
          <p className="font-bold">Database Setup Required</p>
          <p>{databaseError}</p>
          <p className="mt-2">Please go to the Presentations page to set up your database.</p>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Slides List */}
          <div className="lg:col-span-1">
            <Card className="border-3 border-black rounded-xl overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <CardHeader className="bg-blue-400 border-b-2 border-black pb-4">
                <CardTitle className="text-xl font-bangers">Slides</CardTitle>
                <CardDescription className="text-black">{presentation?.title || "Presentation Slides"}</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  {presentation?.slides.map((slide, index) => (
                    <div
                      key={slide.id}
                      className={`p-3 rounded-lg cursor-pointer transition-all ${
                        currentSlideIndex === index
                          ? "bg-yellow-200 border-2 border-black"
                          : "bg-white border border-gray-200 hover:border-black"
                      }`}
                      onClick={() => handleSlideSelect(index)}
                    >
                      <h3 className="font-bold truncate">{slide.title}</h3>
                      <p className="text-xs text-gray-500">Slide {index + 1}</p>
                    </div>
                  ))}

                  <Button
                    onClick={handleNewSlide}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-bold border-2 border-black rounded-xl"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    New Slide
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* AI Generation */}
            <Card className="border-3 border-black rounded-xl overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mt-6">
              <CardHeader className="bg-purple-400 border-b-2 border-black pb-4">
                <CardTitle className="text-xl font-bangers">Content Tools</CardTitle>
                <CardDescription className="text-black">Generate or import presentation content</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  {/* 
                  // Import Dialog - Temporarily Disabled
                  {/* 
                  // Import Dialog - PDF Only
                  <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]">
                        Import from PDF
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="border-2 border-black">
                      <DialogHeader>
                        <DialogTitle className="text-xl font-bangers">Import Presentation from PDF</DialogTitle>
                        <DialogDescription>
                          Select a PDF file. Its content will be added as new slides to the current presentation.
                          Note: This will replace existing slides if any. Consider creating a new presentation for import if you want to keep current slides.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <FileUpload
                          onUploadSuccess={(importedPresentationId) => {
                            // When import is successful, we want to load this new presentation
                            // The FileUpload component by default navigates to /practice/[id]
                            // We need to override this to navigate to /create?id=[newId]
                            setShowImportDialog(false);
                            toast({ title: "Import Successful", description: "Redirecting to the imported presentation..."});
                            router.push(`/create?id=${importedPresentationId}`);
                          }}
                          buttonText="Import Selected File"
                        />
                      </div>
                    </DialogContent>
                  </Dialog> 
                  */}

                  {/* AI Presentation Mode Dialog */}
                  <Dialog open={isPresentationModeOpen} onOpenChange={setIsPresentationModeOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold border-2 border-black rounded-xl">
                        <Wand2 className="mr-2 h-4 w-4" />
                        Generate with AI
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="border-2 border-black max-w-3xl">
                      <DialogHeader>
                        <DialogTitle className="text-xl font-bangers">Generate Presentation</DialogTitle>
                        <DialogDescription>
                          Let our AI create a presentation based on your input. Choose an option below.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="py-4">
                        <h3 className="text-lg font-bold mb-3">What content do you have so far?</h3>

                        <RadioGroup
                          value={presentationMode}
                          onValueChange={(value) => setPresentationMode(value as any)}
                          className="space-y-3"
                        >
                          <div className="flex items-start space-x-2 border-2 border-gray-200 p-3 rounded-lg hover:border-black">
                            <RadioGroupItem value="topic" id="topic" className="mt-1" />
                            <div className="grid gap-1.5">
                              <Label htmlFor="topic" className="font-bold">
                                I only have the topic
                              </Label>
                              <p className="text-sm text-gray-500">
                                The AI will generate a complete presentation (up to 5 slides) based on your topic.
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start space-x-2 border-2 border-gray-200 p-3 rounded-lg hover:border-black">
                            <RadioGroupItem value="bullets" id="bullets" className="mt-1" />
                            <div className="grid gap-1.5">
                              <Label htmlFor="bullets" className="font-bold">
                                I have some bullet points
                              </Label>
                              <p className="text-sm text-gray-500">
                                The AI will expand your bullet points into a comprehensive presentation.
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start space-x-2 border-2 border-gray-200 p-3 rounded-lg hover:border-black">
                            <RadioGroupItem value="content" id="content" className="mt-1" />
                            <div className="grid gap-1.5">
                              <Label htmlFor="content" className="font-bold">
                                I have all the points, I just need help creating the slides
                              </Label>
                              <p className="text-sm text-gray-500">
                                The AI will format your content into well-designed slides.
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start space-x-2 border-2 border-gray-200 p-3 rounded-lg hover:border-black">
                            <RadioGroupItem value="summary" id="summary" className="mt-1" />
                            <div className="grid gap-1.5">
                              <Label htmlFor="summary" className="font-bold">
                                Summarize a large text or from a website
                              </Label>
                              <p className="text-sm text-gray-500">
                                The AI will summarize your text or website content into a presentation.
                              </p>
                            </div>
                          </div>
                        </RadioGroup>

                        {/* New Inputs for Audience and Goal */}
                        <div className="mt-4 space-y-2">
                          <Label htmlFor="presentation-audience">Target Audience</Label>
                          <Select value={presentationAudience} onValueChange={setPresentationAudience}>
                            <SelectTrigger id="presentation-audience" className="border-2 border-black">
                              <SelectValue placeholder="Select target audience" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="C-Level Executives">C-Level Executives</SelectItem>
                              <SelectItem value="Technical Decision Makers">Technical Decision Makers</SelectItem>
                              <SelectItem value="Procurement/Finance Teams">Procurement/Finance Teams</SelectItem>
                              <SelectItem value="End Users/Department Heads">End Users/Department Heads</SelectItem>
                              <SelectItem value="Potential Investors">Potential Investors</SelectItem>
                              <SelectItem value="General">General Audience</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="mt-4 space-y-2">
                          <Label htmlFor="presentation-goal">Presentation Goal</Label>
                          <Input
                            id="presentation-goal"
                            value={presentationGoal}
                            onChange={(e) => setPresentationGoal(e.target.value)}
                            placeholder="e.g., Secure a pilot project, Introduce new features"
                            className="border-2 border-black"
                          />
                        </div>
                        {/* End of New Inputs */}

                        <div className="mt-6">
                          {presentationMode === "summary" ? (
                            <Tabs defaultValue="url" className="w-full">
                              <TabsList className="grid w-full grid-cols-2 mb-4">
                                <TabsTrigger value="url">Website URL</TabsTrigger>
                                <TabsTrigger value="text">Text Input</TabsTrigger>
                              </TabsList>
                              <TabsContent value="url">
                                <div className="space-y-2">
                                  <Label htmlFor="website-url">Enter website URL</Label>
                                  <div className="flex items-center space-x-2">
                                    <Globe className="h-5 w-5 text-gray-400" />
                                    <Input
                                      id="website-url"
                                      value={websiteUrl}
                                      onChange={(e) => setWebsiteUrl(e.target.value)}
                                      placeholder="https://example.com"
                                      className="border-2 border-black flex-1"
                                    />
                                  </div>
                                </div>
                              </TabsContent>
                              <TabsContent value="text">
                                <div className="space-y-2">
                                  <Label htmlFor="summary-text">Enter text to summarize</Label>
                                  <Textarea
                                    id="summary-text"
                                    value={presentationInput}
                                    onChange={(e) => setPresentationInput(e.target.value)}
                                    placeholder="Paste your text here..."
                                    className="border-2 border-black min-h-[200px]"
                                  />
                                </div>
                              </TabsContent>
                            </Tabs>
                          ) : (
                            <div className="space-y-2">
                              <Label htmlFor="presentation-input">
                                {presentationMode === "topic"
                                  ? "Enter your presentation topic"
                                  : presentationMode === "bullets"
                                    ? "Enter your bullet points (one per line)"
                                    : "Enter your presentation content"}
                              </Label>
                              <Textarea
                                id="presentation-input"
                                value={presentationInput}
                                onChange={(e) => setPresentationInput(e.target.value)}
                                placeholder={
                                  presentationMode === "topic"
                                    ? "E.g., The Future of Artificial Intelligence"
                                    : presentationMode === "bullets"
                                      ? "• Introduction to AI\n• Machine Learning Basics\n• Applications in Business"
                                      : "Enter your complete presentation content here..."
                                }
                                className="border-2 border-black min-h-[200px]"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <DialogFooter>
                        <Button
                          onClick={handleGeneratePresentation}
                          disabled={isGenerating}
                          className="bg-blue-500 hover:bg-blue-600 text-white font-bold border-2 border-black rounded-xl"
                        >
                          {isGenerating ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Generating...
                            </>
                          ) : (
                            <>
                              <Wand2 className="mr-2 h-4 w-4" />
                              Generate Presentation
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <div className="p-4 bg-yellow-100 border-2 border-yellow-300 rounded-lg">
                    <h4 className="font-bold mb-2">Tips:</h4>
                    <ul className="text-sm space-y-2">
                      <li className="flex items-start">
                        <span className="inline-block bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center mr-2 mt-0.5">
                          1
                        </span>
                        Be specific about your presentation goals
                      </li>
                      <li className="flex items-start">
                        <span className="inline-block bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center mr-2 mt-0.5">
                          2
                        </span>
                        Mention your target audience
                      </li>
                      <li className="flex items-start">
                        <span className="inline-block bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center mr-2 mt-0.5">
                          3
                        </span>
                        For website summaries, use specific pages rather than home pages
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Slide Editor and Preview */}
          <div className="lg:col-span-2">
            <Card className="border-3 border-black rounded-xl overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <CardHeader className="bg-green-400 border-b-2 border-black pb-4">
                <CardTitle className="text-xl font-bangers">Slide Editor</CardTitle>
                <CardDescription className="text-black">
                  {editingSlide ? `Editing Slide ${currentSlideIndex + 1}` : "Create New Slide"}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title" className="text-base font-medium mb-2 block">
                      Slide Title
                    </Label>
                    <Input
                      id="title"
                      value={slideTitle}
                      onChange={(e) => setSlideTitle(e.target.value)}
                      placeholder="Enter slide title"
                      className="border-2 border-black"
                    />
                  </div>

                  <div>
                    <Label htmlFor="content" className="text-base font-medium mb-2 block">
                      Slide Content
                    </Label>
                    <Textarea
                      id="content"
                      value={slideContent}
                      onChange={(e) => setSlideContent(e.target.value)}
                      placeholder="Enter slide content. Use bullet points with • or numbered lists (1., 2., etc.)"
                      className="border-2 border-black min-h-[200px]"
                    />
                  </div>

                  <div>
                    <Label htmlFor="imageUrl" className="text-base font-medium mb-2 block">
                      Image URL (optional)
                    </Label>
                    <Input
                      id="imageUrl"
                      value={slideImageUrl}
                      onChange={(e) => setSlideImageUrl(e.target.value)}
                      placeholder="Enter image URL"
                      className="border-2 border-black"
                    />
                  </div>

                  <div className="flex justify-between pt-4">
                    <Button
                      variant="outline"
                      onClick={handleDeleteSlide}
                      disabled={!editingSlide || isSaving}
                      className="border-2 border-black bg-white text-black hover:bg-red-100"
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      Delete Slide
                    </Button>
                    <Button
                      onClick={handleSaveSlide}
                      disabled={isSaving || !slideTitle.trim()}
                      className="bg-green-500 hover:bg-green-600 text-white font-bold border-2 border-black rounded-xl"
                    >
                      {isSaving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Slide
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Slide Preview */}
            <Card className="border-3 border-black rounded-xl overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mt-6">
              <CardHeader className="bg-red-400 border-b-2 border-black pb-4">
                <CardTitle className="text-xl font-bangers">Slide Preview</CardTitle>
                <CardDescription className="text-black">See how your slide will look</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="aspect-[16/9] bg-white rounded-xl border-2 border-black overflow-hidden shadow-md">
                  <SlidePreview
                    title={slideTitle || "Your Slide Title"}
                    content={slideContent || "Your slide content will appear here."}
                    imageUrl={slideImageUrl || undefined}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="mt-6 flex justify-between">
              <Button
                onClick={() => setIsPresentationModeOpen(true)}
                className="bg-purple-500 hover:bg-purple-600 text-white font-bold border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                <Wand2 className="mr-2 h-4 w-4" />
                AI Presentation Generator
              </Button>

              <Button
                asChild
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                <Link href={`/practice?id=${presentationId}`}>
                  Practice Presentation
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
