import { type NextRequest, NextResponse } from "next/server"
import { FormData } from "formdata-node"

export async function POST(request: NextRequest) {
  try {
    const { audio } = await request.json()

    if (!audio) {
      return NextResponse.json({ error: "Audio data is required" }, { status: 400 })
    }

    // Convert base64 to binary
    const binaryData = Buffer.from(audio, "base64")

    // Create a blob from the binary data
    const audioBlob = new Blob([binaryData], { type: "audio/webm" })

    // Create FormData and append the audio file
    const formData = new FormData()
    formData.append("file", audioBlob, "recording.webm")
    formData.append("model", "whisper-large-v3")
    formData.append("response_format", "verbose_json")
    formData.append("prompt", "Transcribe naturally, including disfluencies like um, uh, so.")

    // Send request to Groq API using multipart/form-data
    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        // Don't set Content-Type header - it will be set automatically with the boundary
      },
      body: formData as any,
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error("Groq API error:", errorData)

      // Return a fallback transcription if the API fails
      return NextResponse.json({
        text: "Transcription service encountered an issue. Your practice session was recorded, but we couldn't generate a complete transcript.",
        segments: [
          {
            id: 0,
            start: 0,
            end: 1,
            text: "Transcription service encountered an issue.",
            confidence: 1,
          },
        ],
      })
    }

    const transcriptionResult = await response.json()
    return NextResponse.json(transcriptionResult)
  } catch (error) {
    console.error("Error in transcribe route:", error)

    // Return a fallback transcription if there's an error
    return NextResponse.json({
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
    })
  }
}
