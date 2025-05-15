export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      presentations: {
        Row: {
          id: string
          title: string
          created_at: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          title: string
          created_at?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          title?: string
          created_at?: string
          updated_at?: string
          user_id?: string | null
        }
      }
      slides: {
        Row: {
          id: string
          presentation_id: string
          title: string
          content: string
          image_url: string | null
          order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          presentation_id: string
          title: string
          content: string
          image_url?: string | null
          order: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          presentation_id?: string
          title?: string
          content?: string
          image_url?: string | null
          order?: number
          created_at?: string
          updated_at?: string
        }
      }
      practice_sessions: {
        Row: {
          id: string
          presentation_id: string
          duration_seconds: number
          audio_url: string | null
          transcription: Json | null
          analysis: Json | null
          created_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          presentation_id: string
          duration_seconds: number
          audio_url?: string | null
          transcription?: Json | null
          analysis?: Json | null
          created_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          presentation_id?: string
          duration_seconds?: number
          audio_url?: string | null
          transcription?: Json | null
          analysis?: Json | null
          created_at?: string
          user_id?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"]
export type Insertable<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"]
export type Updatable<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"]
