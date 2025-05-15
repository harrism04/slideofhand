"use client"

import { ThinkingProgress, type ProgressStep } from "@/components/ui/thinking-progress"
import { useEffect, useState } from "react"

const practiceAnalysisSteps: ProgressStep[] = [
  { id: "init", label: "Preparing your recording...", duration: 1500 },
  { id: "transcribe", label: "Transcribing your speech...", details: "Listening closely to every word.", duration: 4000 },
  { id: "pace", label: "Analyzing your speaking pace...", duration: 2500 },
  { id: "clarity", label: "Evaluating speech clarity with AI...", details: "This involves advanced AI processing.", duration: 5000 },
  { id: "fillers", label: "Detecting filler words...", duration: 2000 },
  { id: "feedback", label: "Compiling your performance feedback...", duration: 3000 },
  { id: "finalize", label: "Finalizing your analysis report...", duration: 1500 },
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
    return null
  }

  return (
    <ThinkingProgress
      steps={practiceAnalysisSteps}
      title="Analyzing Your Practice Session..."
      // onComplete={() => console.log("Practice analysis loader complete!")} // Optional
    />
  )
}
