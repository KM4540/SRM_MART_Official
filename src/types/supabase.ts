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
      profiles: {
        Row: {
          id: string
          full_name: string
          avatar_url?: string
          payment_qr_url?: string
          is_admin?: boolean
          is_seller?: boolean
          created_at?: string
          updated_at?: string
        }
        Insert: {
          id: string
          full_name: string
          avatar_url?: string
          payment_qr_url?: string
          is_admin?: boolean
          is_seller?: boolean
        }
        Update: {
          id?: string
          full_name?: string
          avatar_url?: string
          payment_qr_url?: string
          is_admin?: boolean
          is_seller?: boolean
        }
      }
    }
  }
} 