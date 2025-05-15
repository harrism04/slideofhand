"use client"

import { ThinkingProgress, type ProgressStep } from "@/components/ui/thinking-progress"
import { useEffect, useState } from "react"

const presentationCreationSteps: ProgressStep[] = [
  { id: "init", label: "Warming up the AI...", duration: 1500 },
  { id: "prompt", label: "Crafting the perfect prompt...", duration: 2500 },
  { id: "connect", label: "Connecting to the creative core...", details: "This might take a moment.", duration: 3000 },
  { id: "generate", label: "Generating slide ideas...", details: "Unleashing pop art power!", duration: 5000 },
  { id: "images", label: "Conjuring pop art visuals...", details: "DALL-E 3 at work!", duration: 7000 }, // Added image generation step
  { id: "structure", label: "Structuring your masterpiece...", duration: 2500 },
  { id: "finalize", label: "Adding final touches...", duration: 2000 },
]

export default function Loading() {
  const [showLoader, setShowLoader] = useState(false)

  // Delay showing the loader slightly to avoid flicker on fast loads
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoader(true)
    }, 200) // 200ms delay
    return () => clearTimeout(timer)
  }, [])

  if (!showLoader) {
    return null // Or a very minimal, non-intrusive loader like a tiny spinner
  }

  return (
    <ThinkingProgress
      steps={presentationCreationSteps}
      title="Crafting Your Presentation..."
      // onComplete={() => console.log("Presentation creation loader complete!")} // Optional: for debugging or further actions
    />
  )
}
