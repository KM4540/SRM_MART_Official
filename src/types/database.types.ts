export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Add type definition for price offer status before the Database interface
type PriceOfferStatus = 'pending' | 'accepted' | 'rejected' | 'countered' | 'completed';

export interface Database {
  public: {
    Tables: {
      pickup_schedules: {
        Row: {
          id: string
          offer_id: string
          pickup_location_id: string
          pickup_time: string
          item_received: boolean
          item_delivered: boolean
          transaction_id: string | null
          created_at: string
          updated_at: string
          buyer_pickup_time: string | null
          seller_no_show: boolean
          buyer_no_show: boolean
        }
        Insert: {
          id?: string
          offer_id: string
          pickup_location_id: string
          pickup_time: string
          item_received?: boolean
          item_delivered?: boolean
          transaction_id?: string | null
          created_at?: string
          updated_at?: string
          buyer_pickup_time?: string | null
          seller_no_show?: boolean
          buyer_no_show?: boolean
        }
        Update: {
          id?: string
          offer_id?: string
          pickup_location_id?: string
          pickup_time?: string
          item_received?: boolean
          item_delivered?: boolean
          transaction_id?: string | null
          created_at?: string
          updated_at?: string
          buyer_pickup_time?: string | null
          seller_no_show?: boolean
          buyer_no_show?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "pickup_schedules_offer_id_fkey"
            columns: ["offer_id"]
            referencedRelation: "price_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pickup_schedules_pickup_location_id_fkey"
            columns: ["pickup_location_id"]
            referencedRelation: "pickup_locations"
            referencedColumns: ["id"]
          }
        ]
      }
      price_offers: {
        Row: {
          id: string
          offer_id: string
          pickup_location_id: string
          pickup_time: string
          item_received: boolean
          item_delivered: boolean
          transaction_id: string | null
          created_at: string
          updated_at: string
          status: string
        }
        Insert: {
          id?: string
          offer_id: string
          pickup_location_id: string
          pickup_time: string
          item_received?: boolean
          item_delivered?: boolean
          transaction_id?: string | null
          created_at?: string
          updated_at?: string
          status: string
        }
        Update: {
          id?: string
          offer_id?: string
          pickup_location_id?: string
          pickup_time?: string
          item_received?: boolean
          item_delivered?: boolean
          transaction_id?: string | null
          created_at?: string
          updated_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_offers_pickup_location_id_fkey"
            columns: ["pickup_location_id"]
            referencedRelation: "pickup_locations"
            referencedColumns: ["id"]
          }
        ]
      }
      // ... other tables
    }
    Functions: {
      get_pending_schedules: {
        Args: {
          user_id: string
        }
        Returns: {
          id: string
          offer_id: string
          pickup_location_id: string
          pickup_time: string
          is_seller: boolean
          item_received: boolean
          item_delivered: boolean
          transaction_id: string | null
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
} 