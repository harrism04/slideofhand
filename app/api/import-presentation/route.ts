import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { Database } from '@/types/database'; // Import Database type for createServerClient
import { cookies } from 'next/headers'; // cookies() is not used directly in this version

// Placeholder for actual parsing libraries
import pdfParse from 'pdf-parse';
// import { extract } from '@saltcorn/docling'; // PPTX import disabled

export async function POST(request: NextRequest) {
  // const cookieStore = cookies(); // This was removed as request.cookies is used directly

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          // Using request.cookies.get() similar to the middleware pattern
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // In a Route Handler, you need to set cookies on the response
          // This function will be called by Supabase client when it needs to update a cookie
          // We will need to ensure that the response object has these cookies set.
          // For now, we'll store them to be applied to the response later.
          // This is a common pattern for Route Handlers.
          // Note: This approach might need refinement if multiple cookies are set.
          // A more robust way is to pass the `response` object around or use a helper.
          // However, `createServerClient` itself doesn't take `NextResponse`.
          // The middleware pattern is more direct as it has `response` in scope.
          // For Route handlers, this is often managed by returning cookies in the response headers.
          // Supabase's `getSession` and `getUser` typically don't *set* cookies in Route Handlers,
          // they rely on the middleware to have done so.
          // If an operation *does* need to set a cookie (e.g. sign-in/sign-up, which won't happen here),
          // the response itself must be modified.
          console.log(`Route Handler: Supabase client trying to SET cookie: ${name}`);
          // This is a placeholder. Actual cookie setting must happen on the NextResponse.
          // We'll rely on middleware for session refresh for now.
        },
        remove(name: string, options: CookieOptions) {
          console.log(`Route Handler: Supabase client trying to REMOVE cookie: ${name}`);
          // This is a placeholder. Actual cookie removal must happen on the NextResponse.
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileName = file.name;
    const fileType = file.type;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    console.log(`Importing file: ${fileName}, type: ${fileType}, size: ${file.size}`);

    // TODO: Add file size validation (e.g., max 10-20MB)
    const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `File size exceeds limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB` }, { status: 413 });
    }

    let slidesData: Array<{ order: number; title: string | null; content: string }> = [];

    if (fileType === 'application/pdf') {
      try {
        const pdfData = await pdfParse(fileBuffer);
        // Attempt to split by form feed character, common page separator
        const pagesText = pdfData.text.split(/\f/g); 
        
        slidesData = pagesText.map((pageText, index) => {
          const trimmedText = pageText.trim();
          // Basic title extraction: first non-empty line, up to a certain length
          const firstNewLineIndex = trimmedText.indexOf('\n');
          let title = `Page ${index + 1}`;
          if (firstNewLineIndex > 0 && firstNewLineIndex < 100) { // Heuristic for title length
            title = trimmedText.substring(0, firstNewLineIndex).trim();
          } else if (trimmedText.length > 0 && trimmedText.length < 100) {
            title = trimmedText.substring(0, trimmedText.indexOf('\n', 100) > -1 ? trimmedText.indexOf('\n', 100) : 100 ).trim() || `Page ${index + 1}`;
          }


          return {
            order: index + 1,
            title: title,
            content: trimmedText,
          };
        });
        console.log(`Successfully parsed PDF: ${fileName}, found ${slidesData.length} pages/slides.`);
      } catch (parseError) {
        console.error(`Error parsing PDF ${fileName}:`, parseError);
        return NextResponse.json({ error: 'Failed to parse PDF file.' }, { status: 500 });
      }
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
      // PPTX IMPORT DISABLED
      return NextResponse.json({ error: 'PPTX import is temporarily disabled.' }, { status: 503 });
    } else {
      return NextResponse.json({ error: 'Unsupported file type. Please upload a PDF file.' }, { status: 415 });
    }

    // If slidesData is empty after attempting parsing, it means no content was extracted or an issue occurred.
    if (slidesData.length === 0 && (fileType === 'application/pdf' || fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation')) {
        // This condition will be hit if PDF parsing resulted in no slides, or if PPTX is not yet implemented.
        // For PDF, if no slides are extracted, it's an issue.
        if (fileType === 'application/pdf') {
             console.warn(`No slides extracted from PDF: ${fileName}. The file might be empty or image-based.`);
             return NextResponse.json({ error: `No text content found in the PDF. It might be an image-based PDF or empty.` }, { status: 400 });
        }
        // For PPTX, this is expected for now until implemented.
    }


    // TODO: Call presentation-service to create presentation and slides
    // This part will be uncommented once both parsers are in place and working.
    const presentationService = await import('@/services/presentation-service');
    const presentationId = await presentationService.createPresentationFromFile(supabase, userId, fileName, slidesData);

    return NextResponse.json({ message: 'File imported successfully', presentationId }, { status: 201 });
    
  } catch (error) {
    console.error('Error importing file:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to import file: ' + error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Failed to import file: An unknown error occurred' }, { status: 500 });
  }
}
