import { type NextRequest, NextResponse } from "next/server"
import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { cookies } from "next/headers"
import { addSlide, updateSlide } from "@/services/presentation-service" // Added updateSlide
import { generateAndUploadImageServerSide } from "@/services/openai-service" // Added server-side image gen
import FirecrawlApp from "@mendable/firecrawl-js"

interface StreamMessage {
  type: "step_update" | "final_data" | "error";
  stepId?: string;
  status?: "in_progress" | "completed" | "error";
  message?: string;
  slideTitle?: string;
  imageUrl?: string;
  slideId?: string;
  data?: any;
}

function createStreamResponse(readableStream: ReadableStream) {
  return new Response(readableStream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8", // Or application/x-ndjson
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

export async function POST(httpRequest: NextRequest) { // Renamed request to httpRequest
  const cookieStore = cookies(); // Defined at the top of POST

  const encoder = new TextEncoder();
  let streamController: ReadableStreamDefaultController<Uint8Array>;

  const readableStream = new ReadableStream({
    async start(controller) { // Make start async
      streamController = controller;

      // Helper to send messages to the client, now defined inside start
      // to ensure streamController is in scope and assigned.
      const sendStreamMessage = (message: StreamMessage) => {
        if (streamController) { // Check controller again, though it should be set
          try {
            const jsonMessage = JSON.stringify(message);
            streamController.enqueue(encoder.encode(`data: ${jsonMessage}\n\n`));
          } catch (e) {
            console.error("[API /generate-presentation] Error encoding/queueing stream message:", e);
          }
        }
      };

      // Parse JSON body *inside* start, after controller is assigned
      const requestBody = await httpRequest.json();

      // Main processing logic moved inside the start method of the stream
      try {
        sendStreamMessage({ type: "step_update", stepId: "init", status: "in_progress", message: "Initializing presentation generation..." });
        
        const { data: { session: apiRouteSessionInitial }, error: sessionError } = await supabaseServerClient.auth.getSession();
        if (sessionError || !apiRouteSessionInitial?.user?.id) {
          console.error("[API /generate-presentation] Error getting session or user not authenticated:", sessionError?.message);
          sendStreamMessage({ type: "error", message: "User authentication failed.", stepId: "init" });
          streamController.close();
          return;
        }
        console.log("[API /generate-presentation] Initial auth session:", apiRouteSessionInitial);
        sendStreamMessage({ type: "step_update", stepId: "init", status: "completed", message: "Initialization complete." });

        const { mode, input, presentationId, title: presentationTitle } = requestBody; // Use requestBody

        if (!input || !presentationId) {
          sendStreamMessage({ type: "error", message: "Input and presentationId are required" });
          streamController.close();
          return;
        }

        let systemPrompt = "";
        let userPrompt = "";
        let processedInput = input;

        sendStreamMessage({ type: "step_update", stepId: "prompt_setup", status: "in_progress", message: "Setting up generation prompts..." });
        // Configure prompts based on mode (same switch logic as before)
        switch (mode) {
          case "topic":
            systemPrompt = `You are an expert presentation designer. Create a complete presentation with 5 slides (including a cover slide) on the given topic. Format your response as a JSON array of slide objects. Each slide object must have 'title' (string), 'content' (string), and 'image_prompt' (string, a detailed and creative prompt suitable for generating an image with DALL-E 3 that visually represents the slide's content in a pop art style) properties. Use a pop art style that is energetic and bold for the slide content. For bullet points, use • or numbered lists where appropriate. IMPORTANT: Return ONLY the JSON array without any markdown formatting, explanation, or code blocks.`
            userPrompt = `Create a 5-slide presentation on the topic: "${processedInput}". The first slide should be a cover slide with a catchy title.`
            break
          case "bullets":
            systemPrompt = `You are an expert presentation designer. Expand the given bullet points into a complete presentation. Format your response as a JSON array of slide objects. Each slide object must have 'title' (string), 'content' (string), and 'image_prompt' (string, a detailed and creative prompt suitable for generating an image with DALL-E 3 that visually represents the slide's content in a pop art style) properties. Use a pop art style that is energetic and bold for the slide content. For bullet points, use • or numbered lists where appropriate. IMPORTANT: Return ONLY the JSON array without any markdown formatting, explanation, or code blocks.`
            userPrompt = `Expand these bullet points into a complete presentation:\n\n${processedInput}`
            break
          case "content":
            systemPrompt = `You are an expert presentation designer. Format the given content into well-designed slides. Format your response as a JSON array of slide objects. Each slide object must have 'title' (string), 'content' (string), and 'image_prompt' (string, a detailed and creative prompt suitable for generating an image with DALL-E 3 that visually represents the slide's content in a pop art style) properties. Use a pop art style that is energetic and bold for the slide content. For bullet points, use • or numbered lists where appropriate. IMPORTANT: Return ONLY JSON array without any markdown formatting, explanation, or code blocks.`
            userPrompt = `Format this content into well-designed slides:\n\n${processedInput}`
            break
          case "summary":
            systemPrompt = `You are an expert presentation designer. Your task is to summarize the provided text, which has been extracted from a website, into a concise and informative presentation.
Focus ONLY on the core products, services, key features, or main informational content.
AVOID creating slides from generic website sections such as navigation menus, headers, footers, sidebars, 'Contact Us' pages, social media links, or general marketing statements unless they are absolutely central to the main subject matter.
Also, disregard any text that seems to be analyzing the website's own structure, SEO, or technical implementation details; focus on the subject matter the website is about.
The presentation should be factual and directly based on the provided text. Do not add information not present in the text.
Format your response as a JSON array of slide objects. Each slide object must have 'title' (string), 'content' (string), and 'image_prompt' (string, a detailed and creative prompt suitable for generating an image with DALL-E 3 that visually represents the slide's content in a pop art style) properties.
The 'content' field for each slide should be a single string containing human-readable text, formatted with bullet points (e.g., '• Point 1\n• Point 2') or numbered lists where appropriate. The 'content' field itself should NOT be a JSON string or a JSON array of strings.
Use a pop art style that is energetic and bold in your language and tone for the slide content.
IMPORTANT: Return ONLY the JSON array without any markdown formatting, explanation, or code blocks.`
            sendStreamMessage({ type: "step_update", stepId: "url_crawl", status: "in_progress", message: "Checking for URL and fetching content if needed..." });
            try {
              const url = new URL(input)
              if (url.protocol === "http:" || url.protocol === "https:") {
                if (!process.env.FIRECRAWL_API_KEY) {
                  throw new Error("Firecrawl API key not configured");
                }
                const firecrawlApp = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });
                const crawlResult = await firecrawlApp.crawlUrl(input, { limit: 3, crawlerOptions: { maxDepth: 1 }, scrapeOptions: { formats: ["markdown"], onlyMainContent: true } });
                if (crawlResult && crawlResult.success && crawlResult.data && crawlResult.data.length > 0) {
                  let combinedMarkdown = "";
                  for (const page of crawlResult.data) { if (page.markdown) combinedMarkdown += page.markdown + "\n\n"; if (combinedMarkdown.length > 15000) break; }
                  processedInput = combinedMarkdown.trim();
                  if (!processedInput) throw new Error("Failed to extract content from URL using Firecrawl");
                  sendStreamMessage({ type: "step_update", stepId: "url_crawl", status: "completed", message: "URL content fetched." });
                } else {
                  throw new Error("Firecrawl did not return any data for the URL");
                }
              }
            } catch (e: any) {
              // Not a URL or Firecrawl failed, proceed with input as text
              sendStreamMessage({ type: "step_update", stepId: "url_crawl", status: "completed", message: "Proceeding with input as text." });
              console.log("Input is not a URL or Firecrawl failed, treating as text:", e.message);
            }
            userPrompt = `Based on the system instructions, create a presentation from the following text:\n\n${processedInput}`
            break
          default:
            sendStreamMessage({ type: "error", message: "Invalid mode selected" });
            streamController.close();
            return;
        }
        sendStreamMessage({ type: "step_update", stepId: "prompt_setup", status: "completed", message: "Prompts configured." });

        sendStreamMessage({ type: "step_update", stepId: "llm_content", status: "in_progress", message: "Generating slide content with AI..." });
        const llmResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
          body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }], temperature: 0.5, max_tokens: 2000, response_format: { type: "json_object" } }),
        });

        if (!llmResponse.ok) {
          const errorData = await llmResponse.text();
          console.error("OpenAI API error:", errorData);
          sendStreamMessage({ type: "error", message: `Failed to generate presentation content: ${llmResponse.statusText}`, stepId: "llm_content" });
          streamController.close();
          return;
        }
        sendStreamMessage({ type: "step_update", stepId: "llm_content", status: "completed", message: "Slide content generated." });

        const result = await llmResponse.json();
        const generatedContent = result.choices[0].message.content;
        let llmSlides = [];
        try {
          const parsedContent = JSON.parse(generatedContent);
          if (Array.isArray(parsedContent)) llmSlides = parsedContent;
          else if (parsedContent.slides && Array.isArray(parsedContent.slides)) llmSlides = parsedContent.slides;
          else { const arrayProps = Object.keys(parsedContent).filter((key) => Array.isArray(parsedContent[key])); if (arrayProps.length > 0) llmSlides = parsedContent[arrayProps[0]]; else throw new Error("Could not find slides array in response");}
        } catch (parseError: any) {
          console.error("Error parsing LLM JSON:", parseError.message, "Raw:", generatedContent);
          sendStreamMessage({ type: "error", message: "Failed to parse AI-generated content.", stepId: "llm_content" });
          streamController.close();
          return;
        }

        if (!Array.isArray(llmSlides) || llmSlides.length === 0) {
          sendStreamMessage({ type: "error", message: "AI did not generate valid slide data.", stepId: "llm_content" });
          streamController.close();
          return;
        }
        
        sendStreamMessage({ type: "step_update", stepId: "save_initial_slides", status: "in_progress", message: "Saving slide structure..." });
        const dbSlidesWithPrompts: Array<{ id: string; title: string; image_prompt: string; order: number }> = [];
        for (let i = 0; i < llmSlides.length; i++) {
          const llmSlide = llmSlides[i];
          if (!llmSlide.title || !llmSlide.content || !llmSlide.image_prompt) {
            console.warn("Skipping invalid slide from LLM:", llmSlide);
            continue;
          }
          const dbSlide = await addSlide(supabaseServerClient, { presentation_id: presentationId, title: llmSlide.title, content: llmSlide.content, image_url: null, order: i });
          if (dbSlide) {
            dbSlidesWithPrompts.push({ id: dbSlide.id, title: dbSlide.title, image_prompt: llmSlide.image_prompt, order: i });
          }
        }
        if (dbSlidesWithPrompts.length === 0) {
          sendStreamMessage({ type: "error", message: "No valid slides could be saved.", stepId: "save_initial_slides" });
          streamController.close();
          return;
        }
        sendStreamMessage({ type: "step_update", stepId: "save_initial_slides", status: "completed", message: "Slide structure saved." });

        sendStreamMessage({ type: "step_update", stepId: "image_generation_overall", status: "in_progress", message: `Starting image generation for ${dbSlidesWithPrompts.length} slides...` });
        const finalSlidesData = []; // To store slides with their final image URLs

        for (let i = 0; i < dbSlidesWithPrompts.length; i++) {
          const slideToProcess = dbSlidesWithPrompts[i];
          sendStreamMessage({
            type: "step_update",
            stepId: `image_gen_slide_${slideToProcess.id}`,
            status: "in_progress",
            message: `Generating image ${i + 1}/${dbSlidesWithPrompts.length} for slide: "${slideToProcess.title}"...`,
            slideId: slideToProcess.id,
            slideTitle: slideToProcess.title
          });
          try {
            const { imageUrl } = await generateAndUploadImageServerSide(slideToProcess.image_prompt, supabaseServerClient);
            await updateSlide(slideToProcess.id, { image_url: imageUrl }, supabaseServerClient); // Pass supabaseServerClient
            sendStreamMessage({
              type: "step_update",
              stepId: `image_gen_slide_${slideToProcess.id}`,
              status: "completed",
              message: `Image for "${slideToProcess.title}" ready.`,
              imageUrl: imageUrl,
              slideId: slideToProcess.id
            });
            finalSlidesData.push({ ...slideToProcess, image_url: imageUrl }); // Add to final data
          } catch (imgError: any) {
            console.error(`Error generating image for slide ${slideToProcess.id}:`, imgError.message);
            sendStreamMessage({
              type: "step_update", // Could also be a specific 'warning' type
              stepId: `image_gen_slide_${slideToProcess.id}`,
              status: "error", // Or 'warning'
              message: `Failed to generate image for "${slideToProcess.title}". Skipping.`,
              slideId: slideToProcess.id
            });
            finalSlidesData.push({ ...slideToProcess, image_url: null }); // Add with null image_url
          }
        }
        sendStreamMessage({ type: "step_update", stepId: "image_generation_overall", status: "completed", message: "Image generation process finished." });
        
        sendStreamMessage({ type: "step_update", stepId: "finalize", status: "in_progress", message: "Finalizing presentation..." });
        // At this point, finalSlidesData contains all slides with their image URLs (or null if failed)
        // We might want to fetch the full presentation again if other fields were updated, or just use this.
        // For simplicity, we'll send what we've gathered.
        sendStreamMessage({ type: "final_data", data: { slides: finalSlidesData }, message: "Presentation generated successfully!" });
        sendStreamMessage({ type: "step_update", stepId: "finalize", status: "completed", message: "Presentation ready!" });

      } catch (error: any) {
        console.error("Error in generate-presentation stream processing:", error);
        sendStreamMessage({ type: "error", message: error.message || "An internal server error occurred during presentation generation." });
      } finally {
        if (streamController) {
          try {
            streamController.close();
          } catch (e) {
            console.error("[API /generate-presentation] Error closing stream controller:", e);
          }
        }
      }
    },
    cancel() {
      console.log("[API /generate-presentation] Stream cancelled by client.");
      // Additional cleanup if necessary
    },
  });
  
  // Helper to send messages to the client
  // This is now defined inside start(), so this outer one is not used by the main logic.
  // It's kept here to avoid breaking the structure if it was referenced elsewhere,
  // but ideally, it should be removed if truly unused.
  const sendStreamMessage = (message: StreamMessage) => {
    // This outer sendStreamMessage is effectively shadowed by the one inside start()
    // and ideally should be removed if not used by any logic outside start().
    // For now, keeping it to ensure no structural breaks if it was hypothetically used.
    if (streamController) { // Check controller again
      try {
        const jsonMessage = JSON.stringify(message);
        streamController.enqueue(encoder.encode(`data: ${jsonMessage}\n\n`));
      } catch (e) {
        console.error("[API /generate-presentation] Error encoding/queueing stream message (outer scope):", e);
      }
    }
  };
  
  const supabaseServerClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) { // Restored async
          const store = await cookieStore; // Use await
          return store.get(name)?.value;
        },
        async set(name: string, value: string, options: CookieOptions) { // Restored async
          const store = await cookieStore; // Use await
          try {
            store.set({ name, value, ...options });
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
        async remove(name: string, options: CookieOptions) { // Restored async
          const store = await cookieStore; // Use await
          try {
            store.delete({ name, ...options });
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  )

  return createStreamResponse(readableStream);
}
