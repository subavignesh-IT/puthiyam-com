export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      loyalty_claims: {
        Row: {
          claimed_at: string
          coupon_code: string
          created_at: string
          customer_name: string
          customer_phone: string
          id: string
          is_redeemed: boolean
          order_id: string | null
          stamps_completed: number
          user_id: string
        }
        Insert: {
          claimed_at?: string
          coupon_code: string
          created_at?: string
          customer_name: string
          customer_phone: string
          id?: string
          is_redeemed?: boolean
          order_id?: string | null
          stamps_completed?: number
          user_id: string
        }
        Update: {
          claimed_at?: string
          coupon_code?: string
          created_at?: string
          customer_name?: string
          customer_phone?: string
          id?: string
          is_redeemed?: boolean
          order_id?: string | null
          stamps_completed?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_claims_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          courier_name: string | null
          courier_notes: string | null
          courier_tracking: string | null
          created_at: string
          customer_address: string | null
          customer_name: string
          customer_phone: string
          delivery_type: string
          id: string
          items: Json
          loyalty_coupon_code: string | null
          order_number: string | null
          order_status: string
          payment_method: string
          payment_state: string
          payment_status: string
          sale_channel: string
          shipping_cost: number
          subtotal: number
          total: number
          user_id: string
        }
        Insert: {
          courier_name?: string | null
          courier_notes?: string | null
          courier_tracking?: string | null
          created_at?: string
          customer_address?: string | null
          customer_name: string
          customer_phone: string
          delivery_type: string
          id?: string
          items: Json
          loyalty_coupon_code?: string | null
          order_number?: string | null
          order_status?: string
          payment_method: string
          payment_state?: string
          payment_status: string
          sale_channel?: string
          shipping_cost?: number
          subtotal: number
          total: number
          user_id: string
        }
        Update: {
          courier_name?: string | null
          courier_notes?: string | null
          courier_tracking?: string | null
          created_at?: string
          customer_address?: string | null
          customer_name?: string
          customer_phone?: string
          delivery_type?: string
          id?: string
          items?: Json
          loyalty_coupon_code?: string | null
          order_number?: string | null
          order_status?: string
          payment_method?: string
          payment_state?: string
          payment_status?: string
          sale_channel?: string
          shipping_cost?: number
          subtotal?: number
          total?: number
          user_id?: string
        }
        Relationships: []
      }
      packing_types: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      pos_customers: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          phone: string
          seller_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          phone: string
          seller_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          phone?: string
          seller_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      pos_feedback: {
        Row: {
          comment: string | null
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          id: string
          order_id: string | null
          product_id: string | null
          rating: number
          seller_id: string
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          order_id?: string | null
          product_id?: string | null
          rating: number
          seller_id: string
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          order_id?: string | null
          product_id?: string | null
          rating?: number
          seller_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_feedback_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          image_url: string
          is_primary: boolean | null
          product_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          image_url: string
          is_primary?: boolean | null
          product_id: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          image_url?: string
          is_primary?: boolean | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string
          id: string
          is_default: boolean | null
          price: number
          product_id: string
          quantity: number
          stock_quantity: number
          wholesale_price: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          price: number
          product_id: string
          quantity: number
          stock_quantity?: number
          wholesale_price?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          price?: number
          product_id?: string
          quantity?: number
          stock_quantity?: number
          wholesale_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_wholesale_tiers: {
        Row: {
          created_at: string
          id: string
          min_quantity: number
          price: number
          product_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          min_quantity: number
          price: number
          product_id: string
        }
        Update: {
          created_at?: string
          id?: string
          min_quantity?: number
          price?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_wholesale_tiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          base_price: number
          category: string
          created_at: string
          delivery_charge: number
          description: string | null
          discount_amount: number
          discount_type: string | null
          free_delivery_quantity: number
          id: string
          is_active: boolean
          is_in_stock: boolean
          is_on_sale: boolean
          measurement_unit: string
          name: string
          packing_type: string | null
          purchase_price: number | null
          sale_end_time: string | null
          seller_id: string
          unlimited_stock: boolean
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          base_price: number
          category: string
          created_at?: string
          delivery_charge?: number
          description?: string | null
          discount_amount?: number
          discount_type?: string | null
          free_delivery_quantity?: number
          id?: string
          is_active?: boolean
          is_in_stock?: boolean
          is_on_sale?: boolean
          measurement_unit?: string
          name: string
          packing_type?: string | null
          purchase_price?: number | null
          sale_end_time?: string | null
          seller_id: string
          unlimited_stock?: boolean
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          base_price?: number
          category?: string
          created_at?: string
          delivery_charge?: number
          description?: string | null
          discount_amount?: number
          discount_type?: string | null
          free_delivery_quantity?: number
          id?: string
          is_active?: boolean
          is_in_stock?: boolean
          is_on_sale?: boolean
          measurement_unit?: string
          name?: string
          packing_type?: string | null
          purchase_price?: number | null
          sale_end_time?: string | null
          seller_id?: string
          unlimited_stock?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          created_at: string
          full_name: string | null
          id: string
          is_blocked: boolean
          loyalty_enabled: boolean
          phone: string | null
          theme: string | null
          updated_at: string
          upi_id: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_blocked?: boolean
          loyalty_enabled?: boolean
          phone?: string | null
          theme?: string | null
          updated_at?: string
          upi_id?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_blocked?: boolean
          loyalty_enabled?: boolean
          phone?: string | null
          theme?: string | null
          updated_at?: string
          upi_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      requested_products: {
        Row: {
          created_at: string
          customer_address: string | null
          customer_name: string
          customer_phone: string
          id: string
          notes: string | null
          product_id: string
          status: string
          user_id: string
          variant_price: number | null
          variant_quantity: number | null
        }
        Insert: {
          created_at?: string
          customer_address?: string | null
          customer_name: string
          customer_phone: string
          id?: string
          notes?: string | null
          product_id: string
          status?: string
          user_id: string
          variant_price?: number | null
          variant_quantity?: number | null
        }
        Update: {
          created_at?: string
          customer_address?: string | null
          customer_name?: string
          customer_phone?: string
          id?: string
          notes?: string | null
          product_id?: string
          status?: string
          user_id?: string
          variant_price?: number | null
          variant_quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "requested_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          image_url: string | null
          product_id: string
          rating: number
          user_id: string
          user_name: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          product_id: string
          rating: number
          user_id: string
          user_name: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          product_id?: string
          rating?: number
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      seller_loyalty_settings: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          min_order_value: number
          reward_amount: number
          seller_id: string
          stamps_required: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          min_order_value?: number
          reward_amount?: number
          seller_id: string
          stamps_required?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          min_order_value?: number
          reward_amount?: number
          seller_id?: string
          stamps_required?: number
          updated_at?: string
        }
        Relationships: []
      }
      seller_requests: {
        Row: {
          admin_note: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          shop_name: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          phone?: string | null
          shop_name?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          shop_name?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      reviews_public: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string | null
          image_url: string | null
          product_id: string | null
          rating: number | null
          user_name: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string | null
          image_url?: string | null
          product_id?: string | null
          rating?: number | null
          user_name?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string | null
          image_url?: string | null
          product_id?: string | null
          rating?: number | null
          user_name?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      decrement_variant_stock: {
        Args: { _qty: number; _variant_id: string }
        Returns: undefined
      }
      get_order_for_rating: { Args: { _order_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      submit_pos_feedback: {
        Args: {
          _comment?: string
          _customer_name?: string
          _customer_phone?: string
          _order_id: string
          _product_id: string
          _rating: number
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user" | "seller"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "seller"],
    },
  },
} as const
