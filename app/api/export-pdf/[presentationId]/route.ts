import { NextRequest, NextResponse } from "next/server"
import { PDFDocument, rgb } from "pdf-lib"
import { getPresentation } from "@/services/presentation-service"
import { createServerClient, type CookieOptions } from '@supabase/ssr' // For server-side Supabase access
import { cookies } from 'next/headers' // To access cookies in Route Handlers

export async function POST(
  request: NextRequest,
  { params }: { params: { presentationId: string } },
) {
  const { presentationId } = params
  const cookieStore = cookies() // Initialize cookieStore at the top

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) { // Add async
          const store = await cookieStore; // Add await, mirroring generate-presentation
          return store.get(name)?.value;
        },
        async set(name: string, value: string, options: CookieOptions) { // Add async
          try {
            const store = await cookieStore; // Add await
            // Route Handlers typically don't set cookies directly.
            // This is often handled by middleware.
            // If you need to set cookies from a Route Handler, ensure it's appropriate.
            // For this read-heavy operation, set might not be used.
            // cookieStore.set({ name, value, ...options }); // Example if needed
          } catch (error) {
            // Handle error if setting cookies from Route Handler is problematic
          }
        },
        async remove(name: string, options: CookieOptions) { // Add async
          try {
            const store = await cookieStore; // Add await
            // Similar to set, Route Handlers usually don't remove cookies directly.
            // cookieStore.delete({ name, ...options }); // Example if needed
          } catch (error) {
            // Handle error
          }
        },
      },
    }
  )

  if (!presentationId) {
    return NextResponse.json({ error: "Presentation ID is required" }, { status: 400 })
  }

  try {
    const { images: base64Images } = (await request.json()) as { images: string[] }

    if (!base64Images || !Array.isArray(base64Images) || base64Images.length === 0) {
      return NextResponse.json({ error: "No images provided for PDF generation" }, { status: 400 })
    }

    // Fetch presentation details to get the title for the filename
    const presentationData = await getPresentation(presentationId, supabase)
    const presentationTitle = presentationData?.title || "presentation"
    const sanitizedTitle = presentationTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()

    const pdfDoc = await PDFDocument.create()

    for (const base64Image of base64Images) {
      // Remove the 'data:image/png;base64,' prefix if it exists
      const actualBase64 = base64Image.startsWith('data:image/png;base64,')
        ? base64Image.substring('data:image/png;base64,'.length)
        : base64Image

      const pngImageBytes = Buffer.from(actualBase64, "base64")
      const pngImage = await pdfDoc.embedPng(pngImageBytes)
      
      // Assume slides are 16:9 aspect ratio for page setup
      // You might want to get dimensions from pngImage and set page size accordingly
      // For simplicity, let's use a common 16:9 size like 1280x720 points
      const page = pdfDoc.addPage([pngImage.width, pngImage.height])
      page.drawImage(pngImage, {
        x: 0,
        y: 0,
        width: pngImage.width,
        height: pngImage.height,
      })
    }

    const pdfBytes = await pdfDoc.save()

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${sanitizedTitle}.pdf"`,
      },
    })
  } catch (error) {
    console.error("Error generating PDF:", error)
    let errorMessage = "Failed to generate PDF."
    if (error instanceof Error) {
        errorMessage = error.message
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
