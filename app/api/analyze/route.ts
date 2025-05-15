import { type NextRequest, NextResponse } from "next/server"
import type { TranscriptionResult, AnalysisResult } from "@/services/groq-service"

// Common filler words to detect
const FILLER_WORDS = [
  "um",
  "uh",
  "like",
  "you know",
  "so",
  "actually",
  "basically",
  "literally",
  "right",
  "okay",
  "well",
  "I mean",
  "kind of",
  "sort of",
]

export async function POST(request: NextRequest) {
  try {
    const { transcription, durationSeconds, slideContents } = await request.json()

    if (!transcription || !durationSeconds || !slideContents) {
      return NextResponse.json(
        { error: "Transcription, duration, and slideContents are required" },
        { status: 400 },
      )
    }

    // Log the received data to help debug
    console.log("Received transcription:", JSON.stringify(transcription))
    console.log("Received durationSeconds:", durationSeconds)
    console.log("Received slideContents:", JSON.stringify(slideContents))

    // Perform speech analysis using local logic
    const analysis = await performBasicAnalysis(transcription, durationSeconds, slideContents) // Added await

    return NextResponse.json(analysis)
  } catch (error) {
    console.error("Error in analyze route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Function to validate the analysis structure
function validateAnalysisStructure(analysis: any): analysis is AnalysisResult {
  return (
    analysis &&
    typeof analysis === "object" &&
    analysis.pace &&
    typeof analysis.pace === "object" &&
    typeof analysis.pace.score === "number" &&
    typeof analysis.pace.feedback === "string" &&
    typeof analysis.pace.wpm === "number" &&
    analysis.clarity &&
    typeof analysis.clarity === "object" &&
    typeof analysis.clarity.score === "number" &&
    typeof analysis.clarity.feedback === "string" &&
    analysis.fillerWords &&
    typeof analysis.fillerWords === "object" &&
    typeof analysis.fillerWords.score === "number" &&
    typeof analysis.fillerWords.feedback === "string" &&
    Array.isArray(analysis.fillerWords.words) &&
    // analysis.engagement && // Removed engagement check
    // typeof analysis.engagement === "object" && // Removed engagement check
    Array.isArray(analysis.improvements) &&
    typeof analysis.overallScore === "number"
  )
}

// Fallback function for basic analysis if the AI response fails
async function performBasicAnalysis( // Made async
  transcription: TranscriptionResult,
  durationSeconds: number,
  slideContents: string[],
): Promise<AnalysisResult> { // Added Promise wrapper
  const text = transcription.text || ""
  const words = text.split(/\s+/).length
  const wpm = Math.round((words / durationSeconds) * 60)

  // Count filler words
  const fillerWordCounts: Record<string, number> = {}
  const lowerText = text.toLowerCase()

  FILLER_WORDS.forEach((word) => {
    const regex = new RegExp(`\\b${word}\\b`, "gi")
    const matches = lowerText.match(regex)
    if (matches) {
      fillerWordCounts[word] = matches.length
    }
  })

  const fillerWordsArray = Object.entries(fillerWordCounts)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    // .slice(0, 5) // Removed slice to include all filler words

  const totalFillerWords = fillerWordsArray.reduce((sum, item) => sum + item.count, 0)
  const fillerWordsPerMinute = (totalFillerWords / durationSeconds) * 60

  // Calculate scores
  const paceScore = calculatePaceScore(wpm)
  const fillerScore = calculateFillerScore(fillerWordsPerMinute)
  // New clarity calculation using OpenAI
  const { score: clarityScore, feedback: clarityFeedback, improvements: clarityImprovements } =
    await getClarityFromOpenAI(text, slideContents)
  // const engagementScore = 80 // REMOVED

  const improvements = [...clarityImprovements]
  if (paceScore < 80) {
    improvements.push(getPaceFeedback(wpm)) // Re-use feedback as improvement
  }
  if (fillerScore < 80) {
    improvements.push(getFillerFeedback(fillerWordsPerMinute)) // Re-use feedback as improvement
  }
  // Add more specific improvement suggestions based on scores
  if (clarityScore < 75) {
    improvements.push("Focus on enunciating each word clearly, especially technical terms found in your slides.");
  }
  if (wpm > 160) {
    improvements.push("Your speaking pace is quite fast. Try to consciously slow down, especially during complex parts.");
  } else if (wpm < 110 && wpm > 0) {
    improvements.push("Your speaking pace is a bit slow. Try to inject more energy and vary your pace to keep the audience engaged.");
  }
  if (fillerWordsPerMinute > 5) {
    improvements.push("Be mindful of filler words like 'um' or 'like'. Practice pausing to gather your thoughts instead.");
  }


  return {
    pace: {
      score: paceScore,
      feedback: getPaceFeedback(wpm),
      wpm,
    },
    clarity: {
      score: clarityScore,
      feedback: clarityFeedback,
    },
    fillerWords: {
      score: fillerScore,
      feedback: getFillerFeedback(fillerWordsPerMinute),
      words: fillerWordsArray,
    },
    // engagement: { // REMOVED
    //   score: engagementScore,
    //   feedback: "You maintained good energy throughout your presentation.",
    // },
    improvements: improvements.length > 0 ? [...new Set(improvements)] : ["Great job! No specific areas for improvement identified from this analysis."], // Ensure unique suggestions
    overallScore: Math.round((paceScore + clarityScore + fillerScore) / 3), // Adjusted overall score
  }
}

async function getClarityFromOpenAI(
  transcribedText: string,
  slideContents: string[],
): Promise<{ score: number; feedback: string; improvements: string[] }> {
  const systemPrompt = `You are an expert presentation evaluator. Given the following slide contents and a transcript of a spoken presentation, analyze the delivery for CLARITY ONLY:
- Did the speaker cover the key terms from the slides, and were they pronounced clearly?
- Return a JSON object with:
  - "score": (0-100, higher is better for clarity)
  - "feedback": (a short, actionable sentence regarding clarity)
  - "improvements": (an array of 1-2 short, actionable improvement suggestions related to clarity, e.g., "Enunciate technical terms more clearly.")
IMPORTANT: Respond ONLY with the JSON object. Do not include any other text or markdown formatting.`

  const userPrompt = `Slide Contents:\n${slideContents.join("\n---\n")}\n\nTranscript:\n${transcribedText}`

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 150,
        response_format: { type: "json_object" },
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error("OpenAI API error for clarity:", errorData)
      return {
        score: 70, // Fallback score
        feedback: "Clarity analysis via AI failed. Please ensure your pronunciation is clear.",
        improvements: ["Try to enunciate words more distinctly.", "Ensure your microphone is positioned correctly."],
      }
    }

    const result = await response.json()
    const clarityData = JSON.parse(result.choices[0].message.content)

    if (
      typeof clarityData.score === "number" &&
      typeof clarityData.feedback === "string" &&
      Array.isArray(clarityData.improvements) &&
      clarityData.improvements.every((item: any) => typeof item === "string")
    ) {
      return { score: clarityData.score, feedback: clarityData.feedback, improvements: clarityData.improvements }
    } else {
      console.error("Invalid format from OpenAI for clarity:", clarityData)
      return {
        score: 70, // Fallback score
        feedback: "Received an unexpected format from AI for clarity analysis.",
        improvements: ["Review your recording for clear speech.", "Ensure slide keywords are spoken clearly."],
      }
    }
  } catch (error) {
    console.error("Error calling OpenAI for clarity:", error)
    return {
      score: 70, // Fallback score
      feedback: "An error occurred during AI clarity analysis. Please try again.",
      improvements: ["Check your internet connection and try recording again.", "Speak directly into the microphone."],
    }
  }
}

function calculatePaceScore(wpm: number): number {
  // Ideal range is 120-150 wpm
  if (wpm >= 120 && wpm <= 150) {
    return 95
  } else if (wpm > 150 && wpm <= 170) {
    return 85
  } else if (wpm >= 100 && wpm < 120) {
    return 85
  } else if (wpm > 170) {
    return 70
  } else if (wpm < 100) {
    return 70
  }
  return 80 // Default
}

function getPaceFeedback(wpm: number): string {
  if (wpm >= 120 && wpm <= 150) {
    return "Excellent pace. You're speaking at an ideal rate for audience comprehension."
  } else if (wpm > 150) {
    return "Your pace is slightly fast. Consider slowing down to improve audience comprehension."
  } else {
    return "Your pace is slightly slow. Try to speak a bit faster to maintain audience engagement."
  }
}

function calculateFillerScore(fillerWordsPerMinute: number): number {
  if (fillerWordsPerMinute <= 1) {
    return 95
  } else if (fillerWordsPerMinute <= 3) {
    return 85
  } else if (fillerWordsPerMinute <= 5) {
    return 75
  } else if (fillerWordsPerMinute <= 8) {
    return 65
  } else {
    return 55
  }
}

function getFillerFeedback(fillerWordsPerMinute: number): string {
  if (fillerWordsPerMinute <= 1) {
    return "Excellent! You used very few filler words."
  } else if (fillerWordsPerMinute <= 3) {
    return "Good job. You used some filler words, but not excessively."
  } else if (fillerWordsPerMinute <= 5) {
    return "You used a moderate number of filler words. Try to replace them with pauses."
  } else {
    return "You used filler words frequently. Practice pausing instead of using filler words."
  }
}
