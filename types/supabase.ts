export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      tickets: {
        Row: {
          id: string
          user_id: string
          event_id: string
          created_at: string
          checked_in: boolean
          checked_in_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          event_id: string
          created_at?: string
          checked_in?: boolean
          checked_in_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          event_id?: string
          created_at?: string
          checked_in?: boolean
          checked_in_at?: string | null
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
