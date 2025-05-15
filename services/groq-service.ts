import { convertBlobToBase64 } from "@/utils/audio-recorder"

export interface TranscriptionResult {
  text: string
  segments: Array<{
    id: number
    start: number
    end: number
    text: string
    confidence: number
  }>
}

export interface AnalysisResult {
  pace: {
    score: number
    feedback: string
    wpm: number
  }
  clarity: {
    score: number
    feedback: string
  }
  fillerWords: {
    score: number
    feedback: string
    words: Array<{
      word: string
      count: number
    }>
  }
  improvements: string[]
  overallScore: number
}

// Update the transcribeAudio function to handle the mock response
export async function transcribeAudio(audioBlob: Blob): Promise<TranscriptionResult> {
  try {
    const base64Audio = await convertBlobToBase64(audioBlob)

    const response = await fetch("/api/transcribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ audio: base64Audio }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error("Transcription API error:", errorData)

      // Return a fallback transcription result if the API fails
      return {
        text: "Transcription service is currently unavailable. Your practice session was recorded, but we couldn't generate a transcript.",
        segments: [
          {
            id: 0,
            start: 0,
            end: 1,
            text: "Transcription service is currently unavailable.",
            confidence: 1,
          },
        ],
      }
    }

    return await response.json()
  } catch (error) {
    console.error("Error transcribing audio:", error)
    // Return a fallback transcription result if the API fails
    return {
      text: "Transcription failed due to a technical error. Please try again later.",
      segments: [
        {
          id: 0,
          start: 0,
          end: 1,
          text: "Transcription failed due to a technical error. Please try again later.",
          confidence: 1,
        },
      ],
    }
  }
}

export async function analyzeTranscription(
  transcription: TranscriptionResult,
  durationSeconds: number,
  slideContents: string[],
): Promise<AnalysisResult> {
  try {
    console.log("Analyzing transcription:", JSON.stringify(transcription))
    console.log("Duration seconds:", durationSeconds)
    console.log("Slide contents for analysis:", JSON.stringify(slideContents))

    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transcription,
        durationSeconds,
        slideContents,
      }),
    })

    if (!response.ok) {
      console.error(`Analysis failed with status: ${response.status}`)
      throw new Error(`Analysis failed: ${response.statusText}`)
    }

    try {
      const result = await response.json()

      // Validate the result structure
      if (!result || typeof result !== "object" || !result.pace || !result.clarity) {
        console.error("Invalid analysis result structure:", result)
        throw new Error("Invalid analysis result structure")
      }

      return result
    } catch (parseError) {
      console.error("Error parsing analysis response:", parseError)
      throw new Error("Failed to parse analysis response")
    }
  } catch (error) {
    console.error("Error analyzing transcription:", error)

    // Return a fallback analysis result
    return {
      pace: {
        score: 75,
        feedback: "Unable to analyze pace due to processing error.",
        wpm: 120,
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
      improvements: [
        "Try recording in a quieter environment",
        "Speak clearly and at a consistent volume",
        "Make sure your microphone is working properly",
      ],
      overallScore: 75,
    }
  }
}

export async function generateText(prompt: string): Promise<string> {
  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    })

    if (!response.ok) {
      throw new Error(`Text generation failed: ${response.statusText}`)
    }

    const data = await response.json()
    return data.text
  } catch (error) {
    console.error("Error generating text:", error)
    throw error
  }
}
