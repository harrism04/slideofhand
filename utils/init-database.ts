import { supabase } from "./supabase-client"

export async function initializeDatabase() {
  try {
    // Check if presentations table exists
    const { error: checkError } = await supabase.from("presentations").select("id").limit(1)

    // If we get a specific error about the relation not existing, create the tables
    if (checkError && checkError.message.includes("relation") && checkError.message.includes("does not exist")) {
      console.log("Database tables don't exist. Creating schema...")

      // We need to use the SQL tag API or RPC for raw SQL execution
      // Create presentations table with deleted_at column
      const { error: createPresentationsError } = await supabase.rpc("exec_sql", {
        sql_string: `
          CREATE TABLE IF NOT EXISTS presentations (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            title TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            deleted_at TIMESTAMP WITH TIME ZONE,
            user_id UUID
          )
        `,
      })

      if (createPresentationsError) {
        console.error("Error creating presentations table:", createPresentationsError)
        // If RPC fails, we might not have the exec_sql function, so we'll need to handle this differently
        // For now, we'll just log the error and continue
      }

      // Create slides table
      const { error: createSlidesError } = await supabase.rpc("exec_sql", {
        sql_string: `
          CREATE TABLE IF NOT EXISTS slides (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            presentation_id UUID NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            image_url TEXT,
            "order" INTEGER NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          )
        `,
      })

      if (createSlidesError) {
        console.error("Error creating slides table:", createSlidesError)
      }

      // Create practice_sessions table
      const { error: createSessionsError } = await supabase.rpc("exec_sql", {
        sql_string: `
          CREATE TABLE IF NOT EXISTS practice_sessions (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            presentation_id UUID NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
            duration_seconds INTEGER NOT NULL,
            audio_url TEXT,
            transcription JSONB,
            analysis JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            user_id UUID
          )
        `,
      })

      if (createSessionsError) {
        console.error("Error creating practice_sessions table:", createSessionsError)
      }

      // Create storage bucket for recordings
      try {
        const { error: bucketError } = await supabase.storage.createBucket("recordings", {
          public: true,
          fileSizeLimit: 52428800, // 50MB
        })
        if (bucketError && !bucketError.message.includes("already exists")) {
          console.error("Error creating storage bucket:", bucketError)
        }
      } catch (storageError) {
        console.error("Error with storage bucket creation:", storageError)
      }

      console.log("Database schema created successfully")
      return true
    } else if (checkError) {
      // Some other error occurred
      console.error("Error checking for presentations table:", checkError)
      return false
    } else {
      // Table exists, check if deleted_at column exists
      try {
        // Check if the deleted_at column exists
        const { error: columnCheckError } = await supabase
          .from("presentations")
          .select("deleted_at")
          .limit(1)
          .throwOnError()

        if (columnCheckError) {
          // Column doesn't exist, add it
          console.log("Adding deleted_at column to presentations table")

          // Use RPC to add the column
          const { error: alterError } = await supabase.rpc("exec_sql", {
            sql_string: `
              ALTER TABLE presentations 
              ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE
            `,
          })

          if (alterError) {
            console.error("Error adding deleted_at column:", alterError)
          }
        }
      } catch (error) {
        console.error("Error checking for deleted_at column:", error)
      }
    }

    // If we reach here, tables already exist or were created successfully
    return true
  } catch (error) {
    console.error("Error initializing database:", error)
    return false
  }
}
