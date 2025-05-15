import { supabase as globalSupabaseClient } from "@/utils/supabase-client" // Renamed for clarity
import type { SupabaseClient } from "@supabase/supabase-js" // Import SupabaseClient type
import type { Tables, Insertable } from "@/types/database"
import { initializeDatabase } from "@/utils/init-database"
import { initializeDatabaseFallback } from "@/utils/init-database-fallback"

export type Presentation = Tables<"presentations">
export type Slide = Tables<"slides">
export type PracticeSession = Tables<"practice_sessions">

export type PresentationWithSlides = Presentation & {
  slides: Slide[]
}

export type PresentationWithPreviewData = Presentation & {
  first_slide_image_url?: string | null
  first_slide_content?: string | null
}

// Modified to accept supabaseClient, defaults to global for broader compatibility if needed
export async function createPresentation(
  title: string,
  supabaseClient?: SupabaseClient
): Promise<Presentation | null> {
  const client = supabaseClient || globalSupabaseClient;
  const { data: { user } } = await client.auth.getUser();
  if (!user) {
    console.error("Error creating presentation: User not authenticated.");
    // Optionally, you could throw an error or display a message to the user.
    return null;
  }

  const { data, error } = await client
    .from("presentations")
    .insert({
      title,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: user.id, 
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating presentation:", error)
    return null
  }

  return data
}

// Modified to accept supabaseClient, defaults to global
export async function getPresentation(
  id: string,
  supabaseClient?: SupabaseClient
): Promise<PresentationWithSlides | null> {
  const client = supabaseClient || globalSupabaseClient;
  try {
    // Get the presentation
    const { data: presentation, error: presentationError } = await client
      .from("presentations")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null) // Only get non-deleted presentations
      .single()

    if (presentationError) {
      // Check if this is a "relation does not exist" error
      if (
        presentationError.message &&
        presentationError.message.includes("relation") &&
        presentationError.message.includes("does not exist")
      ) {
        throw new Error(presentationError.message)
      }

      console.error("Error fetching presentation:", presentationError)
      return null
    }

    // Get the slides
    const { data: slides, error: slidesError } = await client
      .from("slides")
      .select("*")
      .eq("presentation_id", id)
      .order("order", { ascending: true })

    if (slidesError) {
      console.error("Error fetching slides:", slidesError)
      return null
    }

    return {
      ...presentation,
      slides: slides || [],
    }
  } catch (error) {
    console.error("Error in getPresentation:", error)
    throw error // Re-throw to handle in the component
  }
}

// Modified to accept supabaseClient, defaults to global
export async function getAllPresentations(
  supabaseClient?: SupabaseClient
): Promise<PresentationWithPreviewData[]> {
  const client = supabaseClient || globalSupabaseClient;
  try {
    // Try to initialize the database if tables don't exist
    try {
      await initializeDatabase()
    } catch (initError) {
      console.error("Error with primary database initialization:", initError)
      // Try fallback initialization
      await initializeDatabaseFallback()
    }

    // Check if the deleted_at column exists
    let hasDeletedAtColumn = true
    try {
      const { error: columnCheckError } = await client.from("presentations").select("deleted_at").limit(1)

      if (
        columnCheckError &&
        columnCheckError.message.includes("column") &&
        columnCheckError.message.includes("does not exist")
      ) {
        hasDeletedAtColumn = false
      }
    } catch (error) {
      console.error("Error checking for deleted_at column:", error)
      hasDeletedAtColumn = false
    }

    // Get presentations, filtering by deleted_at if the column exists
    let query = client.from("presentations").select("*")

    if (hasDeletedAtColumn) {
      query = query.is("deleted_at", null) // Only get non-deleted presentations
    }

    const { data: presentationsData, error: presentationsError } = await query.order("created_at", { ascending: false })

    if (presentationsError) {
      // Throw the error with the original message so we can check for specific errors
      throw new Error(presentationsError.message)
    }

    if (!presentationsData) {
      return []
    }

    // For each presentation, fetch its first slide's image_url and content
    const presentationsWithPreviews = await Promise.all(
      presentationsData.map(async (presentation) => {
        const { data: firstSlide, error: slideError } = await client
          .from("slides")
          .select("image_url, content")
          .eq("presentation_id", presentation.id)
          .order("order", { ascending: true })
          .limit(1)
          .maybeSingle() // Use maybeSingle to handle cases where no slide exists

        if (slideError) {
          // Log error but don't fail the whole operation if a slide isn't found or another minor error occurs
          console.error(`Error fetching first slide for presentation ${presentation.id}:`, slideError)
        }

        return {
          ...presentation,
          first_slide_image_url: firstSlide?.image_url,
          first_slide_content: firstSlide?.content,
        }
      }),
    )

    return presentationsWithPreviews
  } catch (error) {
    console.error("Error fetching presentations:", error)
    throw error // Re-throw to handle in the component
  }
}

export async function addSlide(
  supabaseClient: SupabaseClient, // Add supabaseClient parameter
  slide: Omit<Insertable<"slides">, "created_at" | "updated_at">
): Promise<Slide | null> {
  // Ensure supabaseClient is provided for this function as it's critical for context
  if (!supabaseClient) {
    console.error("Error adding slide: Supabase client not provided.");
    return null;
  }
  const { data, error } = await supabaseClient
    .from("slides")
    .insert({
      ...slide,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error("Error adding slide:", error)
    return null
  }

  return data
}

export async function updateSlide(
  // supabaseClient parameter is now optional
  id: string,
  slide: Partial<Omit<Slide, "id" | "created_at">>,
  supabaseClient?: SupabaseClient
): Promise<Slide | null> {
  const client = supabaseClient || globalSupabaseClient; // Use passed client or fallback to global
  const { data, error } = await client
    .from("slides")
    .update({
      ...slide,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Error updating slide:", error)
    return null
  }

  return data
}

// Modified to accept supabaseClient, defaults to global
export async function deleteSlide(
  id: string,
  supabaseClient?: SupabaseClient
): Promise<boolean> {
  const client = supabaseClient || globalSupabaseClient;
  const { error } = await client.from("slides").delete().eq("id", id)

  if (error) {
    console.error("Error deleting slide:", error)
    return false
  }

  return true
}

// Note: The original softDeletePresentation was here and has been removed due to duplication.
// The corrected version is at the end of the file.

export type SlideImportData = {
  order: number;
  title: string | null;
  content: string;
};

// This function is critical for API routes and MUST use the passed supabaseClient
export async function createPresentationFromFile(
  supabaseClient: SupabaseClient, // Expect the request-specific client
  userId: string,
  fileName: string,
  slidesData: SlideImportData[]
): Promise<string | null> {
  // Create the main presentation record
  const presentationTitle = `Imported: ${fileName.substring(0, fileName.lastIndexOf('.')) || fileName}`;
  const { data: presentation, error: presentationError } = await supabaseClient
    .from("presentations")
    .insert({
      title: presentationTitle,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: userId,
    })
    .select("id")
    .single();

  if (presentationError || !presentation) {
    console.error("Error creating presentation from file (presentation record):", presentationError);
    return null;
  }

  const presentationId = presentation.id;

  // Create slide records
  const slidesToInsert = slidesData.map(slide => ({
    presentation_id: presentationId,
    title: slide.title,
    content: slide.content,
    order: slide.order,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  if (slidesToInsert.length > 0) {
    const { error: slidesError } = await supabaseClient.from("slides").insert(slidesToInsert);

    if (slidesError) {
      console.error("Error creating slides from file:", slidesError);
      // Optionally, delete the created presentation record if slides fail
      await supabaseClient.from("presentations").delete().eq("id", presentationId);
      return null;
    }
  }

  return presentationId;
}

// Modified to accept supabaseClient, defaults to global
export async function softDeletePresentation(
  id: string,
  supabaseClient?: SupabaseClient
): Promise<boolean> {
  const client = supabaseClient || globalSupabaseClient;
  try {
    // Check if the deleted_at column exists
    let hasDeletedAtColumn = true
    try {
      const { error: columnCheckError } = await client.from("presentations").select("deleted_at").limit(1)

      if (
        columnCheckError &&
        columnCheckError.message.includes("column") &&
        columnCheckError.message.includes("does not exist")
      ) {
        hasDeletedAtColumn = false
      }
    } catch (error) {
      console.error("Error checking for deleted_at column:", error)
      hasDeletedAtColumn = false
    }

    if (hasDeletedAtColumn) {
      // Soft delete by setting deleted_at timestamp
      const { error } = await client
        .from("presentations")
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)

      if (error) {
        console.error("Error soft deleting presentation:", error)
        return false
      }
    } else {
      // Fallback to hard delete if the column doesn't exist
      const { error } = await client.from("presentations").delete().eq("id", id)

      if (error) {
        console.error("Error hard deleting presentation:", error)
        return false
      }
    }

    return true
  } catch (error) {
    console.error("Error in softDeletePresentation:", error)
    return false
  }
}
