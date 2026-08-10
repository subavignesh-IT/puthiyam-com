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
      bill_deliveries: {
        Row: {
          attempts: number
          channel: string
          created_at: string
          customer_phone: string | null
          error: string | null
          id: string
          order_id: string | null
          order_number: string | null
          seller_id: string
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          channel?: string
          created_at?: string
          customer_phone?: string | null
          error?: string | null
          id?: string
          order_id?: string | null
          order_number?: string | null
          seller_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          channel?: string
          created_at?: string
          customer_phone?: string | null
          error?: string | null
          id?: string
          order_id?: string | null
          order_number?: string | null
          seller_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_designs: {
        Row: {
          accent_color: string
          business_address: string | null
          business_name: string | null
          business_phone: string | null
          created_at: string
          font_family: string
          font_size: number
          footer_note: string | null
          header_color: string
          id: string
          is_default: boolean
          logo_url: string | null
          name: string
          seller_id: string
          show_batch: boolean
          show_delivery: boolean
          show_gstin: boolean
          show_hsn: boolean
          show_loyalty: boolean
          show_mfd_exp: boolean
          show_signature: boolean
          show_upi_qr: boolean
          table_header_color: string
          template: string
          terms: string | null
          totals_color: string
          updated_at: string
          upi_id: string | null
        }
        Insert: {
          accent_color?: string
          business_address?: string | null
          business_name?: string | null
          business_phone?: string | null
          created_at?: string
          font_family?: string
          font_size?: number
          footer_note?: string | null
          header_color?: string
          id?: string
          is_default?: boolean
          logo_url?: string | null
          name?: string
          seller_id: string
          show_batch?: boolean
          show_delivery?: boolean
          show_gstin?: boolean
          show_hsn?: boolean
          show_loyalty?: boolean
          show_mfd_exp?: boolean
          show_signature?: boolean
          show_upi_qr?: boolean
          table_header_color?: string
          template?: string
          terms?: string | null
          totals_color?: string
          updated_at?: string
          upi_id?: string | null
        }
        Update: {
          accent_color?: string
          business_address?: string | null
          business_name?: string | null
          business_phone?: string | null
          created_at?: string
          font_family?: string
          font_size?: number
          footer_note?: string | null
          header_color?: string
          id?: string
          is_default?: boolean
          logo_url?: string | null
          name?: string
          seller_id?: string
          show_batch?: boolean
          show_delivery?: boolean
          show_gstin?: boolean
          show_hsn?: boolean
          show_loyalty?: boolean
          show_mfd_exp?: boolean
          show_signature?: boolean
          show_upi_qr?: boolean
          table_header_color?: string
          template?: string
          terms?: string | null
          totals_color?: string
          updated_at?: string
          upi_id?: string | null
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
      gst_settings: {
        Row: {
          created_at: string
          default_rate: number
          gstin: string | null
          id: string
          legal_name: string | null
          place_of_supply: string | null
          prices_include_gst: boolean
          seller_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_rate?: number
          gstin?: string | null
          id?: string
          legal_name?: string | null
          place_of_supply?: string | null
          prices_include_gst?: boolean
          seller_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_rate?: number
          gstin?: string | null
          id?: string
          legal_name?: string | null
          place_of_supply?: string | null
          prices_include_gst?: boolean
          seller_id?: string
          updated_at?: string
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
          amount_received: number
          courier_name: string | null
          courier_notes: string | null
          courier_tracking: string | null
          created_at: string
          customer_address: string | null
          customer_name: string
          customer_phone: string
          delivery_type: string
          gst_amount: number | null
          gst_rate: number | null
          id: string
          items: Json
          loyalty_coupon_code: string | null
          order_number: string | null
          order_status: string
          payment_method: string
          payment_state: string
          payment_status: string
          sale_channel: string
          seller_gstin: string | null
          shipping_cost: number
          subtotal: number
          taxable_value: number | null
          total: number
          user_id: string
        }
        Insert: {
          amount_received?: number
          courier_name?: string | null
          courier_notes?: string | null
          courier_tracking?: string | null
          created_at?: string
          customer_address?: string | null
          customer_name: string
          customer_phone: string
          delivery_type: string
          gst_amount?: number | null
          gst_rate?: number | null
          id?: string
          items: Json
          loyalty_coupon_code?: string | null
          order_number?: string | null
          order_status?: string
          payment_method: string
          payment_state?: string
          payment_status: string
          sale_channel?: string
          seller_gstin?: string | null
          shipping_cost?: number
          subtotal: number
          taxable_value?: number | null
          total: number
          user_id: string
        }
        Update: {
          amount_received?: number
          courier_name?: string | null
          courier_notes?: string | null
          courier_tracking?: string | null
          created_at?: string
          customer_address?: string | null
          customer_name?: string
          customer_phone?: string
          delivery_type?: string
          gst_amount?: number | null
          gst_rate?: number | null
          id?: string
          items?: Json
          loyalty_coupon_code?: string | null
          order_number?: string | null
          order_status?: string
          payment_method?: string
          payment_state?: string
          payment_status?: string
          sale_channel?: string
          seller_gstin?: string | null
          shipping_cost?: number
          subtotal?: number
          taxable_value?: number | null
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
      product_batches: {
        Row: {
          barcode: string | null
          barcode_status: string
          batch_no: string
          created_at: string
          exp_date: string | null
          id: string
          mfd_date: string | null
          notes: string | null
          product_id: string
          purchase_price: number | null
          quantity: number
          seller_id: string
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          barcode?: string | null
          barcode_status?: string
          batch_no: string
          created_at?: string
          exp_date?: string | null
          id?: string
          mfd_date?: string | null
          notes?: string | null
          product_id: string
          purchase_price?: number | null
          quantity?: number
          seller_id: string
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          barcode?: string | null
          barcode_status?: string
          batch_no?: string
          created_at?: string
          exp_date?: string | null
          id?: string
          mfd_date?: string | null
          notes?: string | null
          product_id?: string
          purchase_price?: number | null
          quantity?: number
          seller_id?: string
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_batches_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
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
      product_purchases: {
        Row: {
          batch_id: string | null
          created_at: string
          id: string
          invoice_no: string | null
          notes: string | null
          product_id: string
          purchase_date: string
          purchase_price: number
          quantity: number
          seller_id: string
          supplier: string | null
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          id?: string
          invoice_no?: string | null
          notes?: string | null
          product_id: string
          purchase_date?: string
          purchase_price?: number
          quantity?: number
          seller_id: string
          supplier?: string | null
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          id?: string
          invoice_no?: string | null
          notes?: string | null
          product_id?: string
          purchase_date?: string
          purchase_price?: number
          quantity?: number
          seller_id?: string
          supplier?: string | null
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_purchases_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "product_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_purchases_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          barcode: string | null
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
          barcode?: string | null
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
          barcode?: string | null
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
          gst_rate: number | null
          hsn_code: string | null
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
          gst_rate?: number | null
          hsn_code?: string | null
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
          gst_rate?: number | null
          hsn_code?: string | null
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
          aadhaar_number: string | null
          address: string | null
          bank_account_number: string | null
          bank_ifsc: string | null
          business_address: string | null
          city: string | null
          company_name: string | null
          created_at: string
          full_name: string | null
          gstin: string | null
          id: string
          is_blocked: boolean
          loyalty_enabled: boolean
          pan_number: string | null
          phone: string | null
          pincode: string | null
          theme: string | null
          updated_at: string
          upi_id: string | null
          user_id: string
        }
        Insert: {
          aadhaar_number?: string | null
          address?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          business_address?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          gstin?: string | null
          id?: string
          is_blocked?: boolean
          loyalty_enabled?: boolean
          pan_number?: string | null
          phone?: string | null
          pincode?: string | null
          theme?: string | null
          updated_at?: string
          upi_id?: string | null
          user_id: string
        }
        Update: {
          aadhaar_number?: string | null
          address?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          business_address?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          gstin?: string | null
          id?: string
          is_blocked?: boolean
          loyalty_enabled?: boolean
          pan_number?: string | null
          phone?: string | null
          pincode?: string | null
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
          aadhaar_number: string | null
          admin_note: string | null
          bank_account_number: string | null
          bank_ifsc: string | null
          business_address: string | null
          city: string | null
          company_name: string | null
          created_at: string
          email: string
          full_name: string
          gstin: string | null
          id: string
          pan_number: string | null
          phone: string | null
          pincode: string | null
          shop_name: string | null
          status: string
          updated_at: string
          upi_id: string | null
          user_id: string
        }
        Insert: {
          aadhaar_number?: string | null
          admin_note?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          business_address?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          email: string
          full_name: string
          gstin?: string | null
          id?: string
          pan_number?: string | null
          phone?: string | null
          pincode?: string | null
          shop_name?: string | null
          status?: string
          updated_at?: string
          upi_id?: string | null
          user_id: string
        }
        Update: {
          aadhaar_number?: string | null
          admin_note?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          business_address?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          email?: string
          full_name?: string
          gstin?: string | null
          id?: string
          pan_number?: string | null
          phone?: string | null
          pincode?: string | null
          shop_name?: string | null
          status?: string
          updated_at?: string
          upi_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      stock_audit_log: {
        Row: {
          change_qty: number
          created_at: string
          created_by: string | null
          id: string
          order_id: string | null
          order_number: string | null
          product_id: string | null
          product_name: string | null
          reason: string
          sale_channel: string | null
          seller_id: string | null
          stock_after: number | null
          stock_before: number | null
          variant_id: string | null
          variant_label: string | null
        }
        Insert: {
          change_qty: number
          created_at?: string
          created_by?: string | null
          id?: string
          order_id?: string | null
          order_number?: string | null
          product_id?: string | null
          product_name?: string | null
          reason?: string
          sale_channel?: string | null
          seller_id?: string | null
          stock_after?: number | null
          stock_before?: number | null
          variant_id?: string | null
          variant_label?: string | null
        }
        Update: {
          change_qty?: number
          created_at?: string
          created_by?: string | null
          id?: string
          order_id?: string | null
          order_number?: string | null
          product_id?: string | null
          product_name?: string | null
          reason?: string
          sale_channel?: string | null
          seller_id?: string | null
          stock_after?: number | null
          stock_before?: number | null
          variant_id?: string | null
          variant_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_audit_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_audit_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_audit_log_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
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
      consume_variant_batches: {
        Args: { _qty: number; _variant_id: string }
        Returns: Json
      }
      decrement_variant_stock:
        | { Args: { _qty: number; _variant_id: string }; Returns: undefined }
        | {
            Args: {
              _order_id?: string
              _qty: number
              _reason?: string
              _sale_channel?: string
              _variant_id: string
            }
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
