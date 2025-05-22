import type { Slide } from "./presentation-service" // Assuming Slide type is exported from presentation-service

export interface GenerationOptions {
  mode: "topic" | "bullets" | "content" | "summary"
  input: string
  presentationId: string
  title?: string
  audience?: string // Added
  goal?: string     // Added
}

// Define a more specific type for the slide object returned by generate-presentation
export interface GeneratedSlide extends Slide {
  image_prompt: string
}

export interface GeneratePresentationResponse {
  slides: GeneratedSlide[]
}

export async function generatePresentation(options: GenerationOptions): Promise<GeneratePresentationResponse> {
  try {
    const response = await fetch("/api/generate-presentation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && {
          "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        }),
      },
      body: JSON.stringify(options),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error("Generation API error:", errorData)
      throw new Error(`Generation failed: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error generating presentation:", error)
    throw error
  }
}

export async function summarizeUrl(url: string): Promise<string> {
  try {
    const response = await fetch("/api/summarize-url", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error("Summarization API error:", errorData)
      throw new Error(`Summarization failed: ${response.statusText}`)
    }

    const data = await response.json()
    return data.summary
  } catch (error) {
    console.error("Error summarizing URL:", error)
    throw error
  }
}

export async function generateImageForSlide(imagePrompt: string): Promise<{ imageUrl: string } | null> {
  try {
    const response = await fetch("/api/generate-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && {
          "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        }),
      },
      body: JSON.stringify({ image_prompt: imagePrompt }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error("Image Generation API error:", errorData)
      // Consider not throwing here, but returning null so one failed image doesn't stop all
      // throw new Error(`Image generation failed: ${response.statusText}`)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error("Error generating image for slide:", error)
    // throw error; // Or return null
    return null
  }
}

// SERVER-SIDE function to generate and upload an image
// This function is intended to be called from backend API routes
import OpenAI from "openai";
import { v4 as uuidv4 } from "uuid";
import { SupabaseClient } from "@supabase/supabase-js"; // Import SupabaseClient for typing

const openaiServerInstance = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateAndUploadImageServerSide(
  imagePrompt: string,
  supabaseClient: SupabaseClient // Expect a Supabase client instance (e.g., server client from API route)
): Promise<{ imageUrl: string }> {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not set for server-side image generation");
    throw new Error("OpenAI API key not configured on server");
  }

  console.log(`[Service/generateAndUploadImageServerSide] Generating image for prompt: "${imagePrompt}"`);

  const imageResponse = await openaiServerInstance.images.generate({
    model: "dall-e-3",
    prompt: imagePrompt,
    n: 1,
    size: "1024x1024",
    quality: "hd",
    response_format: "b64_json",
  });

  if (!imageResponse.data || imageResponse.data.length === 0) {
    console.error("[Service/generateAndUploadImageServerSide] OpenAI API did not return image data");
    throw new Error("Failed to get image data from OpenAI");
  }

  const b64Json = imageResponse.data[0]?.b64_json;
  if (!b64Json) {
    console.error("[Service/generateAndUploadImageServerSide] OpenAI API did not return b64_json");
    throw new Error("Failed to get b64_json from OpenAI response");
  }

  const imageBuffer = Buffer.from(b64Json, "base64");
  const fileName = `generated_image_${uuidv4()}.png`;
  const filePath = `public/${fileName}`; // Path within the bucket

  console.log(`[Service/generateAndUploadImageServerSide] Uploading image to Supabase Storage: ${filePath}`);

  const { data: uploadData, error: uploadError } = await supabaseClient.storage
    .from("slideimages") // Bucket name
    .upload(filePath, imageBuffer, {
      contentType: "image/png",
      upsert: true,
    });

  if (uploadError) {
    console.error("[Service/generateAndUploadImageServerSide] Supabase Storage upload error:", uploadError);
    throw new Error(`Supabase Storage upload error: ${uploadError.message}`);
  }

  if (!uploadData || !uploadData.path) {
    console.error("[Service/generateAndUploadImageServerSide] Supabase Storage upload did not return path.");
    throw new Error("Supabase Storage upload failed to return path.");
  }
  
  const { data: publicUrlData } = supabaseClient.storage
    .from("slideimages")
    .getPublicUrl(uploadData.path);

  if (!publicUrlData || !publicUrlData.publicUrl) {
    console.error("[Service/generateAndUploadImageServerSide] Failed to get public URL from Supabase Storage");
    throw new Error("Failed to get public URL for image");
  }

  console.log(`[Service/generateAndUploadImageServerSide] Image uploaded successfully. Public URL: ${publicUrlData.publicUrl}`);
  return { imageUrl: publicUrlData.publicUrl };
}

export async function generateChatResponseOpenAI(
  systemPrompt: string,
  userPrompt: string,
  conversationHistory: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = []
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not set for server-side chat generation");
    throw new Error("OpenAI API key not configured on server");
  }

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...conversationHistory,
    { role: "user", content: userPrompt },
  ];

  try {
    const chatCompletion = await openaiServerInstance.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
      temperature: 0.7, // Adjust for creativity vs. predictability
      max_tokens: 250,  // Adjust based on expected response length
    });

    const responseContent = chatCompletion.choices[0]?.message?.content;
    if (!responseContent) {
      console.error("[Service/generateChatResponseOpenAI] OpenAI API did not return content.");
      throw new Error("Failed to get response content from OpenAI");
    }
    return responseContent;
  } catch (error) {
    console.error("[Service/generateChatResponseOpenAI] Error calling OpenAI chat completion:", error);
    throw error; // Re-throw to be handled by the API route
  }
}
