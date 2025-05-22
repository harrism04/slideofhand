import { supabase } from "@/utils/supabase-client"
import type { Tables } from "@/types/database"
import type { TranscriptionResult, AnalysisResult } from "@/services/groq-service"

export type PracticeSession = Tables<"practice_sessions"> & {
  transcription: TranscriptionResult | null // Explicitly type transcription
  analysis: AnalysisResult | null // Explicitly type analysis
}

export interface PracticeSessionWithDetails extends PracticeSession {
  presentation_title: string
}

export async function savePracticeSession(
  presentationId: string,
  durationSeconds: number,
  audioBlob: Blob | null,
  transcription: TranscriptionResult | null,
  analysis: AnalysisResult | null,
): Promise<PracticeSession | null> {
  try {
    // Attempt to get session explicitly first
    const sessionResponse = await supabase.auth.getSession();
    console.log("getSession() Response:", sessionResponse);

    if (sessionResponse.error) {
      console.error("Error from getSession():", sessionResponse.error);
    }
    if (!sessionResponse.data.session) {
      console.warn("getSession() returned no session data.");
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();

    console.log("getUser() Auth Data:", authData); // Changed log label for clarity
    console.log("getUser() Auth Error:", authError); // Changed log label for clarity

    const user = authData?.user;
    let userIdToInsert = null;
    if (user && user.id) {
      userIdToInsert = user.id;
    } else {
      console.warn("User ID is not available from supabase.auth.getUser(). Defaulting user_id to null for insert.");
    }

    let audioUrl = null; // Initialize audioUrl

    // If we have audio, upload it to Supabase Storage
    if (audioBlob) {
      console.log("Attempting to upload audio.");
      const fileName = `practice-sessions/${presentationId}/${Date.now()}.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("recordings")
        .upload(fileName, audioBlob, {
          contentType: "audio/webm",
          cacheControl: "3600",
        });

      if (uploadError) {
        console.error("Error uploading audio:", uploadError);
        // Consider how to handle this error; for now, it will proceed without an audioUrl
      } else {
        // Get the public URL for the uploaded file
        const { data: urlData } = supabase.storage.from("recordings").getPublicUrl(fileName);
        audioUrl = urlData.publicUrl;
        console.log("Audio uploaded successfully:", audioUrl);
      }
    } else {
      audioUrl = null; // Ensure audioUrl is null if no audioBlob
    }


    // Save the practice session to the database
    console.log("Attempting to save practice session (DB INSERT) with user ID:", userIdToInsert); // Log user ID
    const { data, error } = await supabase
      .from("practice_sessions")
      .insert({
        presentation_id: presentationId,
        duration_seconds: durationSeconds,
        audio_url: audioUrl,
        transcription: transcription as any,
        analysis: analysis as any,
        created_at: new Date().toISOString(),
        user_id: userIdToInsert,
      })
      .select()
      .single()

    if (error) {
      console.error("Error saving practice session:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Error in savePracticeSession:", error)
    return null
  }
}

export async function getPracticeSessions(presentationId?: string): Promise<PracticeSessionWithDetails[]> {
  try {
    let query = supabase
      .from("practice_sessions")
      .select(`
        *,
        presentations:presentation_id (title)
      `)
      .order("created_at", { ascending: false })

    if (presentationId) {
      query = query.eq("presentation_id", presentationId)
    }

    const { data, error } = await query

    if (error) {
      // Check if this is a "relation does not exist" error
      if (error.message && error.message.includes("relation") && error.message.includes("does not exist")) {
        console.error("Database tables not found:", error.message)
        return []
      }

      console.error("Error fetching practice sessions:", error)
      return []
    }

    // Transform the data to match our expected format
    return (data || []).map((session) => ({
      ...session,
      presentation_title: session.presentations?.title || "Unknown Presentation",
    }))
  } catch (error) {
    console.error("Error in getPracticeSessions:", error)
    return []
  }
}

export async function getPracticeSession(id: string): Promise<PracticeSessionWithDetails | null> {
  try {
    const { data, error } = await supabase
      .from("practice_sessions")
      .select(`
        *,
        presentations:presentation_id (title)
      `)
      .eq("id", id)
      .single()

    if (error) {
      console.error("Error fetching practice session:", error)
      return null
    }

    return {
      ...data,
      presentation_title: data.presentations?.title || "Unknown Presentation",
    }
  } catch (error) {
    console.error("Error in getPracticeSession:", error)
    return null
  }
}

export async function deletePracticeSession(id: string): Promise<boolean> {
  try {
    // First get the session to find the audio URL
    const { data: session, error: fetchError } = await supabase
      .from("practice_sessions")
      .select("audio_url")
      .eq("id", id)
      .single()

    if (fetchError) {
      console.error("Error fetching practice session for deletion:", fetchError)
      return false
    }

    // If there's an audio file, delete it from storage
    if (session?.audio_url) {
      const filePath = session.audio_url.split("/").slice(-3).join("/")
      const { error: storageError } = await supabase.storage.from("recordings").remove([filePath])

      if (storageError) {
        console.error("Error deleting audio file:", storageError)
        // Continue with deletion of the record even if file deletion fails
      }
    }

    // Delete the practice session record
    const { error } = await supabase.from("practice_sessions").delete().eq("id", id)

    if (error) {
      console.error("Error deleting practice session:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in deletePracticeSession:", error)
    return false
  }
}

// For OpenAI chat completion message params
interface ChatCompletionMessageParam {
  role: 'user' | 'assistant' | 'system';
  content: string;
  name?: string;
}


export interface InteractiveChatResponse {
  aiTextResponse: string;
  aiAudioBase64: string;
  contentType: string;
  updatedConversationHistory: ChatCompletionMessageParam[];
}

export async function getInteractiveChatResponse(
  slideTitle: string | undefined,
  slideContent: string,
  userResponse?: string,
  conversationHistory?: ChatCompletionMessageParam[]
): Promise<InteractiveChatResponse> {
  try {
    const response = await fetch("/api/interactive-chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        slideTitle,
        slideContent,
        userResponse,
        conversationHistory,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Interactive chat API error:", errorData.error || response.statusText);
      throw new Error(errorData.error || `Interactive chat failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error in getInteractiveChatResponse:", error);
    // In a real app, you might want to return a more structured error object
    // or a default response that indicates an error to the UI.
    throw error; // Re-throw to be handled by the calling UI component
  }
}
