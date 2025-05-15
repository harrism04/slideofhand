import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    // Fetch the content from the URL
    let content = ""
    try {
      const response = await fetch(url)
      if (!response.ok) {
        return NextResponse.json({ error: "Failed to fetch URL content" }, { status: 400 })
      }
      content = await response.text()
    } catch (error) {
      console.error("Error fetching URL:", error)
      return NextResponse.json({ error: "Failed to fetch URL content" }, { status: 400 })
    }

    // Extract text content from HTML (basic extraction)
    const textContent = content
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()

    // Truncate if too long (OpenAI has token limits)
    const truncatedContent = textContent.substring(0, 10000) + (textContent.length > 10000 ? "..." : "")

    // Call OpenAI API to summarize
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert at summarizing content. Provide a concise summary of the given text.",
          },
          {
            role: "user",
            content: `Summarize the following content from ${url}:\n\n${truncatedContent}`,
          },
        ],
        temperature: 0.5,
        max_tokens: 1000,
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error("OpenAI API error:", errorData)
      return NextResponse.json({ error: "Failed to summarize content" }, { status: response.status })
    }

    const result = await response.json()
    const summary = result.choices[0].message.content

    return NextResponse.json({ summary })
  } catch (error) {
    console.error("Error in summarize-url route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
