"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react" // Added useRef
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, ChevronRight, Edit, Plus, Trash, Mic, MessageSquareText, FileDown, Loader2 } from "lucide-react" // Added FileDown, Loader2
import { isSupabaseConfigured, supabase as supabaseClient } from "@/utils/supabase-client" // Added supabaseClient
import html2canvas from "html2canvas" // Added html2canvas

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { SlidePreview } from "@/components/slide-preview" // Corrected import
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { FileUpload } from "@/components/file-upload"; // Import FileUpload
import {
  getAllPresentations,
  createPresentation,
  softDeletePresentation,
  getPresentation as getFullPresentation, // Renamed to avoid conflict
  type PresentationWithPreviewData,
  type PresentationWithSlides, // Added PresentationWithSlides
  type Slide, // Added Slide
} from "@/services/presentation-service"

export default function PresentationsPage() {
  const router = useRouter()
  const offScreenContainerRef = useRef<HTMLDivElement | null>(null) // For rendering slides off-screen
  const [presentations, setPresentations] = useState<PresentationWithPreviewData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newPresentationTitle, setNewPresentationTitle] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [presentationToDelete, setPresentationToDelete] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [databaseError, setDatabaseError] = useState<string | null>(null)
  // const [showImportDialog, setShowImportDialog] = useState(false); // State for import dialog - currently commented out

  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [currentExportingId, setCurrentExportingId] = useState<string | null>(null)
  const [slideForOffScreenRender, setSlideForOffScreenRender] = useState<Slide | null>(null)


  // Check if Supabase is configured
  const supabaseConfigured = isSupabaseConfigured()

  useEffect(() => {
    async function loadPresentations() {
      console.log("loadPresentations called"); // New console log
      try {
        if (!supabaseConfigured) {
          console.log("Supabase not configured, returning."); // New console log
          // If Supabase is not configured, use empty data
          setIsLoading(false)
          return
        }

        const data = await getAllPresentations()
        console.log("Data from getAllPresentations (length):", data.length); // Updated console log
        console.log("Data from getAllPresentations (content):", JSON.stringify(data, null, 2)); // New console log for content

        // If we get here, we have data or an empty array (no error)
        setDatabaseError(null)
        setPresentations(data)
        console.log("Presentations state after setPresentations (length):", data.length); // Updated console log
        console.log("Presentations state after setPresentations (content):", JSON.stringify(data, null, 2)); // New console log for content
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
  }, [supabaseConfigured]) // Removed loadPresentations from dependency array as it's defined in scope

  const refreshPresentations = async () => {
    setIsLoading(true);
    try {
      if (!supabaseConfigured) {
        setIsLoading(false);
        return;
      }
      const data = await getAllPresentations();
      setPresentations(data);
      setDatabaseError(null);
    } catch (error: any) {
      console.error("Error reloading presentations:", error);
      if (error.message && error.message.includes("relation") && error.message.includes("does not exist")) {
        setDatabaseError("Database tables not found. You need to set up the database schema.");
      } else {
        toast({
          title: "Error",
          description: "Failed to reload presentations. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePresentation = async () => {
    if (!newPresentationTitle.trim()) {  
      toast({
        title: "Error",
        description: "Please enter a presentation title.",
        variant: "destructive",
      })
      return
    }

    if (!supabaseConfigured) {
      toast({
        title: "Supabase not configured",
        description: "Cannot create presentation. Supabase environment variables are missing.",
        variant: "destructive",
      })
      return
    }

    setIsCreating(true)

    try {
      const newPresentation = await createPresentation(newPresentationTitle)

      if (newPresentation) {
        setPresentations([newPresentation, ...presentations])
        setNewPresentationTitle("")
        setIsDialogOpen(false)

        toast({
          title: "Success",
          description: "Presentation created successfully.",
        })

        // Navigate to the create page with the new presentation ID
        router.push(`/create?id=${newPresentation.id}`)
      } else {
        throw new Error("Failed to create presentation")
      }
    } catch (error) {
      console.error("Error creating presentation:", error)
      toast({
        title: "Error",
        description: "Failed to create presentation. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeletePresentation = async () => {
    if (!presentationToDelete || !supabaseConfigured) {
      return
    }

    setIsDeleting(true)

    try {
      const success = await softDeletePresentation(presentationToDelete)

      if (success) {
        // Remove the deleted presentation from the state
        setPresentations(presentations.filter((p) => p.id !== presentationToDelete))

        toast({
          title: "Success",
          description: "Presentation deleted successfully.",
        })
      } else {
        throw new Error("Failed to delete presentation")
      }
    } catch (error) {
      console.error("Error deleting presentation:", error)
      toast({
        title: "Error",
        description: "Failed to delete presentation. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setPresentationToDelete(null)
      setIsDeleteDialogOpen(false)
    }
  }

  const openDeleteDialog = (id: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent navigation to edit page
    setPresentationToDelete(id)
    setIsDeleteDialogOpen(true)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  const handleExportPdf = async (presentationId: string, presentationTitle: string) => {
    if (!supabaseConfigured || !supabaseClient) {
      toast({
        title: "Error",
        description: "Supabase client not available. Cannot export PDF.",
        variant: "destructive",
      })
      return
    }

    setCurrentExportingId(presentationId)
    setIsExportingPdf(true)
    toast({
      title: "Exporting PDF...",
      description: `Preparing "${presentationTitle}" for export. This may take a moment.`,
    })

    try {
      const fullPresentationData = await getFullPresentation(presentationId, supabaseClient)

      if (!fullPresentationData || !fullPresentationData.slides || fullPresentationData.slides.length === 0) {
        toast({
          title: "Error",
          description: "No slides found for this presentation.",
          variant: "destructive",
        })
        throw new Error("No slides found")
      }

      const offScreenContainer = offScreenContainerRef.current
      if (!offScreenContainer) {
        // Create the off-screen container if it doesn't exist (should be in JSX)
        // This is a fallback, ideally it's always there from initial render.
        console.error("Off-screen container not found.")
        toast({ title: "Error", description: "PDF export setup failed.", variant: "destructive"})
        throw new Error("Off-screen container ref is null")
      }
      
      // Ensure it's styled to be off-screen but renderable
      offScreenContainer.style.position = "fixed"
      offScreenContainer.style.left = "-9999px" // Position off-screen
      offScreenContainer.style.top = "-9999px"
      // Define a fixed size for rendering, e.g., 1280x720 for a 16:9 aspect ratio
      // This size should match what SlidePreview expects or is designed for.
      const renderWidth = 1280 
      const renderHeight = 720
      // Ensure offScreenContainer is styled correctly for rendering
      // These styles are also set on the div itself, but good to ensure here too.
      offScreenContainer.style.width = `${renderWidth}px`
      offScreenContainer.style.height = `${renderHeight}px`
      offScreenContainer.style.position = "fixed"
      offScreenContainer.style.left = "-9999px"
      offScreenContainer.style.top = "-9999px"
      offScreenContainer.style.zIndex = "-1" // Ensure it's not visible but renderable
      offScreenContainer.style.backgroundColor = "white" // Important for html2canvas

      const imagesBase64: string[] = []

      // Helper function to capture a single slide
      const captureSlideAsImage = (slide: Slide): Promise<string> => {
        return new Promise((resolve, reject) => {
          setSlideForOffScreenRender(slide)
          
          // Wait for React to render the slide and for images to load
          // setTimeout is a common way to wait for the next render cycle.
          // A more robust solution might involve MutationObserver or image load events.
          setTimeout(async () => {
            if (offScreenContainerRef.current) {
              try {
                // Ensure all images within the slide preview are loaded
                const images = offScreenContainerRef.current.getElementsByTagName('img');
                const imageLoadPromises: Promise<void>[] = [];
                for (let i = 0; i < images.length; i++) {
                  if (!images[i].complete) {
                    imageLoadPromises.push(new Promise(imgResolve => {
                      images[i].onload = () => imgResolve();
                      images[i].onerror = () => imgResolve(); // Resolve on error too to not block
                    }));
                  }
                }
                await Promise.all(imageLoadPromises);

                // Additional small delay for any final rendering tweaks
                await new Promise(r => setTimeout(r, 100));


                const canvas = await html2canvas(offScreenContainerRef.current, {
                  useCORS: true,
                  allowTaint: true, // Important for external images if useCORS is not enough
                  width: renderWidth,
                  height: renderHeight,
                  scale: 1, // Use 1 for actual size. Increase for higher res, but impacts performance.
                  backgroundColor: null, // Use the div's background color
                  logging: false, // Disable html2canvas logging for cleaner console
                })
                resolve(canvas.toDataURL("image/png"))
              } catch (error) {
                console.error("Error capturing slide with html2canvas:", error)
                reject(error)
              }
            } else {
              reject(new Error("Off-screen container not available for capture."))
            }
          }, 200) // Increased timeout slightly for rendering and image loads
        })
      }

      for (const slide of fullPresentationData.slides) {
        try {
          const imageDataUrl = await captureSlideAsImage(slide)
          imagesBase64.push(imageDataUrl)
        } catch (error) {
          console.error(`Failed to capture slide "${slide.title || 'Untitled'}":`, error)
          // Optionally, push a placeholder or skip this slide
          toast({
            title: "Capture Error",
            description: `Could not capture slide: ${slide.title || 'Untitled'}. It will be skipped.`,
            variant: "destructive"
          })
        }
      }
      
      setSlideForOffScreenRender(null) // Clear the off-screen renderer

      if (imagesBase64.length === 0) {
        toast({
          title: "Export Error",
          description: "No slides could be captured for the PDF.",
          variant: "destructive",
        })
        throw new Error("No slides captured for PDF.")
      }

      const response = await fetch(`/api/export-pdf/${presentationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: imagesBase64 }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to export PDF: ${response.statusText}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${presentationTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast({
        title: "Success!",
        description: `"${presentationTitle}" has been exported as a PDF.`,
      })
    } catch (error: any) {
      console.error("Error exporting PDF:", error)
      toast({
        title: "Export Failed",
        description: error.message || "Could not export the presentation as PDF.",
        variant: "destructive",
      })
    } finally {
      setIsExportingPdf(false)
      setCurrentExportingId(null)
      // Ensure offScreenContainer is hidden if it was made visible or styled
      if (offScreenContainerRef.current) {
        offScreenContainerRef.current.style.left = "-9999px";
        offScreenContainerRef.current.style.top = "-9999px";
      }
    }
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
            <h1 className="text-xl sm:text-2xl font-bangers text-black">
              <span className="bg-red-500 text-white px-2 py-1 mr-2 rounded-md">MY</span>
              Presentations
            </h1>
          </div>
        </div>
      </header>

      {!supabaseConfigured && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4 container mx-auto">
          <p className="font-bold">Supabase Not Configured</p>
          <p>
            Environment variables for Supabase are missing. You won't be able to create or manage presentations. Please
            check your environment configuration.
          </p>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <h2 className="text-xl sm:text-2xl font-bold">Your Presentations</h2>
          <div className="flex gap-2 w-full sm:w-auto">
            {/* <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]">
                  Import Presentation
                </Button>
              </DialogTrigger>
              <DialogContent className="border-2 border-black">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bangers">Import Presentation</DialogTitle>
                  <DialogDescription>
                    Select a PDF or PPTX file to import as a new presentation.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <FileUpload
                    onUploadSuccess={() => {
                      setShowImportDialog(false);
                      refreshPresentations(); // Refresh the list after successful import
                    }}
                    buttonText="Import Selected File"
                  />
                </div>
              </DialogContent>
            </Dialog> */}
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white font-bold border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <Plus className="mr-2 h-4 w-4" />
                  New Presentation
                </Button>
              </DialogTrigger>
              <DialogContent className="border-2 border-black w-[90%] sm:w-full rounded-lg">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl font-bangers">Create New Presentation</DialogTitle>
                <DialogDescription>
                  Enter a title for your new presentation. You can add slides and content later.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="title" className="text-base font-medium mb-2 block">
                  Presentation Title
                </Label>
                <Input
                  id="title"
                  value={newPresentationTitle}
                  onChange={(e) => setNewPresentationTitle(e.target.value)}
                  placeholder="Enter presentation title"
                  className="border-2 border-black"
                />
              </div>
              <DialogFooter>
                <Button
                  onClick={handleCreatePresentation}
                  disabled={isCreating || !newPresentationTitle.trim()}
                  className="bg-green-500 hover:bg-green-600 text-white font-bold border-2 border-black rounded-xl"
                >
                  {isCreating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    "Create Presentation"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent className="border-2 border-black w-[90%] sm:w-full rounded-lg">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-lg sm:text-xl font-bangers">Delete Presentation</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this presentation? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-2 border-black">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeletePresentation}
                disabled={isDeleting}
                className="bg-red-500 hover:bg-red-600 text-white font-bold border-2 border-black"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {presentations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {presentations.map((presentation) => (
              <Card
                key={presentation.id}
                className="border-3 border-black rounded-xl overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
              >
                <CardHeader className="bg-blue-400 border-b-2 border-black pb-4">
                  <CardTitle className="text-lg sm:text-xl truncate">{presentation.title}</CardTitle>
                  <CardDescription className="text-black">
                    Created on {formatDate(presentation.created_at)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
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
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="48"
                          height="48"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="mx-auto mb-2 text-gray-300"
                        >
                          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                          <path d="M13 2v7h7" />
                        </svg>
                        <p className="text-gray-500">No preview available</p>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-0 flex flex-col gap-2 items-center"> 
                  {/* Removed sm:flex-row to stack controls vertically first, then let inner groups handle row behavior */}
                  <div className="flex flex-row space-x-2 w-full justify-center sm:justify-start sm:w-auto sm:mr-auto mb-2 sm:mb-0">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 border-2 border-black"
                      onClick={() => router.push(`/create?id=${presentation.id}`)}
                    >
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 border-2 border-black"
                      onClick={(e) => openDeleteDialog(presentation.id, e)}
                    >
                      <Trash className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 border-2 border-black"
                      onClick={() => handleExportPdf(presentation.id, presentation.title)}
                      disabled={isExportingPdf && currentExportingId === presentation.id}
                    >
                      {isExportingPdf && currentExportingId === presentation.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileDown className="h-4 w-4" />
                      )}
                      <span className="sr-only">Export PDF</span>
                    </Button>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button
                      asChild
                      className="w-full sm:flex-1 bg-green-500 hover:bg-green-600 text-white font-bold border-2 border-black rounded-xl"
                    >
                      <Link href={`/practice?id=${presentation.id}`}>
                        <Mic className="mr-2 h-4 w-4" />
                        Standard
                      </Link>
                    </Button>
                    <Button
                      asChild
                      className="w-full sm:flex-1 bg-purple-500 hover:bg-purple-600 text-white font-bold border-2 border-black rounded-xl"
                    >
                      <Link href={`/practice/interactive/${presentation.id}`}>
                        <MessageSquareText className="mr-2 h-4 w-4" />
                        Interactive
                      </Link>
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-xl border-2 border-black">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mx-auto mb-4 text-gray-300"
            >
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
              <path d="M13 2v7h7" />
            </svg>
            <h3 className="text-xl font-bold mb-2">No presentations yet</h3>
            <p className="text-gray-500 mb-6">Create your first presentation to get started</p>
            <Button
              onClick={() => setIsDialogOpen(true)}
              className="bg-green-500 hover:bg-green-600 text-white font-bold border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Presentation
            </Button>
          </div>
        )}
      </div>
      {/* Off-screen container for rendering slides for html2canvas */}
      <div ref={offScreenContainerRef} style={{ position: 'fixed', left: '-9999px', top: '-9999px', width: '1280px', height: '720px', zIndex: -1, backgroundColor: 'white' }}>
        {slideForOffScreenRender && offScreenContainerRef.current && (
          <SlidePreview
            title={slideForOffScreenRender.title || ""}
            content={slideForOffScreenRender.content || ""}
            imageUrl={slideForOffScreenRender.image_url || undefined}
            isFullscreen={false} // Or a specific prop for PDF rendering if needed
          />
        )}
      </div>
    </div>
  )
}
