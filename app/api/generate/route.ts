import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    // Prepare the request to Groq API
    const enhancedPrompt = `
  Create a presentation slide about the following topic:
  
  ${prompt}
  
  Format the response as follows:
  # [Title of the slide]
  
  [Content of the slide with bullet points using • or numbered lists where appropriate]
  
  Make the content concise, informative, and visually structured. Use a pop art style tone that is energetic and bold.
  Focus on creating content for a single slide that is part of a larger presentation.
`

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Changed to OpenAI model
        messages: [
          {
            role: "system",
            content:
              "You are an expert presentation designer. Create concise, visually structured slides with clear titles and bullet points.",
          },
          {
            role: "user",
            content: enhancedPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error("OpenAI API error:", errorData) // Changed error message source
      return NextResponse.json({ error: "Failed to generate text" }, { status: response.status })
    }

    const result = await response.json()
    const generatedText = result.choices[0].message.content

    return NextResponse.json({ text: generatedText })
  } catch (error) {
    console.error("Error in generate route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
