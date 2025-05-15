-- This SQL can be run in the Supabase SQL Editor to ensure all necessary tables exist

-- Check if practice_sessions table exists and create it if not
CREATE TABLE IF NOT EXISTS practice_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  presentation_id UUID NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
  duration_seconds INTEGER NOT NULL,
  audio_url TEXT,
  transcription JSONB,
  analysis JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_practice_sessions_presentation_id ON practice_sessions(presentation_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_created_at ON practice_sessions(created_at);

-- Ensure we have the exec_sql function for database management
CREATE OR REPLACE FUNCTION exec_sql(sql_string text)
RETURNS void AS $$
BEGIN
  EXECUTE sql_string;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
