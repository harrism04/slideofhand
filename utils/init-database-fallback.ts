import { supabase } from "./supabase-client"

export async function initializeDatabaseFallback() {
  try {
    // Check if presentations table exists
    const { error: checkError } = await supabase.from("presentations").select("id").limit(1)

    if (checkError && checkError.message.includes("relation") && checkError.message.includes("does not exist")) {
      console.log("Database tables don't exist. Please create them manually in the Supabase dashboard.")

      // Return false to indicate that tables need to be created manually
      return false
    } else if (checkError) {
      // Some other error occurred
      console.error("Error checking for presentations table:", checkError)
      return false
    } else {
      // Table exists, check if we can add the deleted_at column
      try {
        // First check if the column already exists
        const { data, error: columnCheckError } = await supabase.from("presentations").select("deleted_at").limit(1)

        if (
          columnCheckError &&
          columnCheckError.message.includes("column") &&
          columnCheckError.message.includes("does not exist")
        ) {
          console.log("The deleted_at column doesn't exist. Please add it manually in the Supabase dashboard.")
          return false
        }
      } catch (error) {
        console.error("Error checking for deleted_at column:", error)
      }
    }

    // If we reach here, tables exist and have the necessary columns
    return true
  } catch (error) {
    console.error("Error in initializeDatabaseFallback:", error)
    return false
  }
}
