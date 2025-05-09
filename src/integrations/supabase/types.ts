export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      cart_items: {
        Row: {
          id: string
          user_id: string
          product_id: string
          quantity: number
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          product_id: string
          quantity: number
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          product_id?: string
          quantity?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      orders: {
        Row: {
          buyer_phone: string
          created_at: string | null
          id: string
          product_id: string
          quantity: number
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          buyer_phone: string
          created_at?: string | null
          id?: string
          product_id: string
          quantity?: number
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          buyer_phone?: string
          created_at?: string | null
          id?: string
          product_id?: string
          quantity?: number
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          image: string | null
          price: number
          seller_id: string | null
          title: string
          updated_at: string | null
          condition: string | null
          is_approved: boolean
          pickup_location_id: string | null
          status: 'available' | 'sold' | 'reserved'
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image?: string | null
          price: number
          seller_id?: string | null
          title: string
          updated_at?: string | null
          condition?: string | null
          is_approved?: boolean
          pickup_location_id?: string | null
          status?: 'available' | 'sold' | 'reserved'
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image?: string | null
          price?: number
          seller_id?: string | null
          title?: string
          updated_at?: string | null
          condition?: string | null
          is_approved?: boolean
          pickup_location_id?: string | null
          status?: 'available' | 'sold' | 'reserved'
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          is_phone_verified: boolean | null
          phone: string | null
          updated_at: string | null
          username: string | null
          is_admin: boolean
          payment_qr_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          is_phone_verified?: boolean | null
          phone?: string | null
          updated_at?: string | null
          username?: string | null
          is_admin?: boolean
          payment_qr_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          is_phone_verified?: boolean | null
          phone?: string | null
          updated_at?: string | null
          username?: string | null
          is_admin?: boolean
          payment_qr_url?: string | null
        }
        Relationships: []
      }
      seller_contacts: {
        Row: {
          id: string
          product_id: string
          name: string
          email: string
          phone: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          product_id: string
          name: string
          email: string
          phone?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          product_id?: string
          name?: string
          email?: string
          phone?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_contacts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      wishlist_items: {
        Row: {
          id: string
          user_id: string
          product_id: string
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          product_id: string
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          product_id?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      pickup_locations: {
        Row: {
          id: string
          name: string
          address: string
          description: string | null
          created_at: string | null
          is_active: boolean
        }
        Insert: {
          id?: string
          name: string
          address: string
          description?: string | null
          created_at?: string | null
          is_active?: boolean
        }
        Update: {
          id?: string
          name?: string
          address?: string
          description?: string | null
          created_at?: string | null
          is_active?: boolean
        }
        Relationships: []
      }
      pending_products: {
        Row: {
          id: string
          title: string
          description: string | null
          price: number
          category: string | null
          condition: string | null
          image: string | null
          seller_id: string
          created_at: string | null
          status: string
          admin_notes: string | null
          pickup_location_id: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          price: number
          category?: string | null
          condition?: string | null
          image?: string | null
          seller_id: string
          created_at?: string | null
          status?: string
          admin_notes?: string | null
          pickup_location_id?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          price?: number
          category?: string | null
          condition?: string | null
          image?: string | null
          seller_id?: string
          created_at?: string | null
          status?: string
          admin_notes?: string | null
          pickup_location_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_products_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_products_pickup_location_id_fkey"
            columns: ["pickup_location_id"]
            isOneToOne: false
            referencedRelation: "pickup_locations"
            referencedColumns: ["id"]
          }
        ]
      }
      price_offers: {
        Row: {
          id: string
          product_id: string
          buyer_id: string
          offered_price: number
          seller_id: string
          status: string
          seller_counter_price: number | null
          buyer_message: string | null
          seller_message: string | null
          created_at: string | null
          updated_at: string | null
          is_read: boolean
        }
        Insert: {
          id?: string
          product_id: string
          buyer_id: string
          offered_price: number
          seller_id: string
          status?: string
          seller_counter_price?: number | null
          buyer_message?: string | null
          seller_message?: string | null
          created_at?: string | null
          updated_at?: string | null
          is_read?: boolean
        }
        Update: {
          id?: string
          product_id?: string
          buyer_id?: string
          offered_price?: number
          seller_id?: string
          status?: string
          seller_counter_price?: number | null
          buyer_message?: string | null
          seller_message?: string | null
          created_at?: string | null
          updated_at?: string | null
          is_read?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "price_offers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_offers_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_offers_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
