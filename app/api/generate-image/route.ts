import { type NextRequest, NextResponse } from "next/server"
import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { cookies } from "next/headers"
import OpenAI from "openai"
import { v4 as uuidv4 } from "uuid"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  const supabaseServerClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          const cookieStore = await cookies(); // Use await here as in the other file
          return cookieStore.get(name)?.value;
        },
        async set(name: string, value: string, options: CookieOptions) {
          const cookieStore = await cookies(); // Use await here
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
        async remove(name: string, options: CookieOptions) {
          const cookieStore = await cookies(); // Use await here
          try {
            cookieStore.delete({ name, ...options });
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  );

  try {
    const { image_prompt: imagePrompt } = await request.json()

    if (!imagePrompt) {
      return NextResponse.json({ error: "Image prompt is required" }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not set")
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 })
    }

    console.log(`[API /generate-image] Generating image for prompt: "${imagePrompt}"`)

    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: imagePrompt,
      n: 1,
      size: "1024x1024", // Changed to a DALL-E 3 supported size
      quality: "hd",
      response_format: "b64_json",
    })

    if (!imageResponse.data || imageResponse.data.length === 0) {
      console.error("OpenAI API did not return image data")
      return NextResponse.json({ error: "Failed to get image data from OpenAI" }, { status: 500 })
    }

    const b64Json = imageResponse.data[0]?.b64_json
    if (!b64Json) {
      console.error("OpenAI API did not return b64_json data in the first element")
      return NextResponse.json({ error: "Failed to get b64_json from OpenAI response" }, { status: 500 })
    }

    const imageBuffer = Buffer.from(b64Json, "base64")
    const fileName = `generated_image_${uuidv4()}.png`
    const filePath = `public/${fileName}` // Store in a public folder within the 'slideimages' bucket

    console.log(`[API /generate-image] Uploading image to Supabase Storage: ${filePath}`)

    const { data: uploadData, error: uploadError } = await supabaseServerClient.storage
      .from("slideimages") // Assuming 'slideimages' bucket exists
      .upload(filePath, imageBuffer, {
        contentType: "image/png",
        upsert: true, // Overwrite if file with same name exists (though uuid should make it unique)
      })

    if (uploadError) {
      console.error("Supabase Storage upload error:", uploadError)
      return NextResponse.json({ error: `Supabase Storage upload error: ${uploadError.message}` }, { status: 500 })
    }

    if (!uploadData || !uploadData.path) {
        console.error("Supabase Storage upload did not return path.")
        return NextResponse.json({ error: "Supabase Storage upload failed to return path." }, { status: 500 })
    }
    
    const { data: publicUrlData } = supabaseServerClient.storage
      .from("slideimages")
      .getPublicUrl(uploadData.path)

    if (!publicUrlData || !publicUrlData.publicUrl) {
      console.error("Failed to get public URL from Supabase Storage")
      return NextResponse.json({ error: "Failed to get public URL for image" }, { status: 500 })
    }

    console.log(`[API /generate-image] Image uploaded successfully. Public URL: ${publicUrlData.publicUrl}`)

    return NextResponse.json({ imageUrl: publicUrlData.publicUrl })
  } catch (error: any) {
    console.error("Error in generate-image route:", error)
    // Check if it's an OpenAI specific error
    if (error.response && error.response.data && error.response.data.error) {
        console.error("OpenAI API Error details:", error.response.data.error);
        return NextResponse.json({ error: `OpenAI API Error: ${error.response.data.error.message}` }, { status: error.response.status || 500 });
    }
    return NextResponse.json({ error: `Internal server error: ${error.message}` }, { status: 500 })
  }
}
