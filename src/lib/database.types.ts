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
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      branches: {
        Row: {
          address: string | null
          city: string
          created_at: string
          currency: string
          hero_image: string | null
          id: string
          name: string
          phone: string | null
          slug: string
          updated_at: string
          vat_rate: number
        }
        Insert: {
          address?: string | null
          city: string
          created_at?: string
          currency?: string
          hero_image?: string | null
          id?: string
          name: string
          phone?: string | null
          slug: string
          updated_at?: string
          vat_rate?: number
        }
        Update: {
          address?: string | null
          city?: string
          created_at?: string
          currency?: string
          hero_image?: string | null
          id?: string
          name?: string
          phone?: string | null
          slug?: string
          updated_at?: string
          vat_rate?: number
        }
        Relationships: []
      }
      folio_items: {
        Row: {
          amount_kobo: number
          branch_id: string
          business_date: string
          description: string
          folio_id: string
          id: string
          kind: Database["public"]["Enums"]["folio_item_kind"]
          posted_at: string
          posted_by: string | null
          qty: number
          unit_kobo: number
        }
        Insert: {
          amount_kobo: number
          branch_id: string
          business_date?: string
          description: string
          folio_id: string
          id?: string
          kind: Database["public"]["Enums"]["folio_item_kind"]
          posted_at?: string
          posted_by?: string | null
          qty?: number
          unit_kobo: number
        }
        Update: {
          amount_kobo?: number
          branch_id?: string
          business_date?: string
          description?: string
          folio_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["folio_item_kind"]
          posted_at?: string
          posted_by?: string | null
          qty?: number
          unit_kobo?: number
        }
        Relationships: [
          {
            foreignKeyName: "folio_items_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folio_items_folio_id_fkey"
            columns: ["folio_id"]
            isOneToOne: false
            referencedRelation: "folios"
            referencedColumns: ["id"]
          },
        ]
      }
      folios: {
        Row: {
          branch_id: string
          closed_at: string | null
          created_at: string
          currency: string
          id: string
          reservation_id: string
          status: string
        }
        Insert: {
          branch_id: string
          closed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          reservation_id: string
          status?: string
        }
        Update: {
          branch_id?: string
          closed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          reservation_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "folios_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folios_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: true
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      guests: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          id_number: string | null
          id_type: string | null
          phone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          id_number?: string | null
          id_type?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          id_number?: string | null
          id_type?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      maintenance_tickets: {
        Row: {
          assigned_to: string | null
          blocks_room: boolean
          branch_id: string
          closed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          room_id: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          blocks_room?: boolean
          branch_id: string
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          room_id?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          blocks_room?: boolean
          branch_id?: string
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          room_id?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_tickets_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      night_audits: {
        Row: {
          branch_id: string
          business_date: string
          closed_at: string
          closed_by: string | null
          id: string
          status: Database["public"]["Enums"]["audit_status"]
          summary: Json
        }
        Insert: {
          branch_id: string
          business_date: string
          closed_at?: string
          closed_by?: string | null
          id?: string
          status?: Database["public"]["Enums"]["audit_status"]
          summary?: Json
        }
        Update: {
          branch_id?: string
          business_date?: string
          closed_at?: string
          closed_by?: string | null
          id?: string
          status?: Database["public"]["Enums"]["audit_status"]
          summary?: Json
        }
        Relationships: [
          {
            foreignKeyName: "night_audits_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_kobo: number
          branch_id: string
          business_date: string
          folio_id: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          paid_at: string
          received_by: string | null
          reference: string | null
          status: Database["public"]["Enums"]["payment_status"]
        }
        Insert: {
          amount_kobo: number
          branch_id: string
          business_date?: string
          folio_id: string
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          paid_at?: string
          received_by?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Update: {
          amount_kobo?: number
          branch_id?: string
          business_date?: string
          folio_id?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          paid_at?: string
          received_by?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_folio_id_fkey"
            columns: ["folio_id"]
            isOneToOne: false
            referencedRelation: "folios"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          branch_id: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_request_items: {
        Row: {
          branch_id: string
          description: string
          id: string
          qty: number
          request_id: string
          unit_kobo: number
        }
        Insert: {
          branch_id: string
          description: string
          id?: string
          qty?: number
          request_id: string
          unit_kobo?: number
        }
        Update: {
          branch_id?: string
          description?: string
          id?: string
          qty?: number
          request_id?: string
          unit_kobo?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_request_items_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_requests: {
        Row: {
          branch_id: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          id: string
          notes: string | null
          requested_by: string | null
          status: Database["public"]["Enums"]["pr_status"]
          title: string
          total_kobo: number
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          id?: string
          notes?: string | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["pr_status"]
          title: string
          total_kobo?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          id?: string
          notes?: string | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["pr_status"]
          title?: string
          total_kobo?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_requests_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          adults: number
          branch_id: string
          check_in: string
          check_out: string
          checked_in_at: string | null
          checked_out_at: string | null
          children: number
          confirmation_code: string
          created_at: string
          created_by: string | null
          currency: string
          guest_id: string
          id: string
          id_photo_path: string | null
          nightly_rate_kobo: number
          notes: string | null
          room_id: string | null
          room_type_id: string
          source: Database["public"]["Enums"]["reservation_source"]
          status: Database["public"]["Enums"]["reservation_status"]
          total_kobo: number
          updated_at: string
        }
        Insert: {
          adults?: number
          branch_id: string
          check_in: string
          check_out: string
          checked_in_at?: string | null
          checked_out_at?: string | null
          children?: number
          confirmation_code?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          guest_id: string
          id?: string
          id_photo_path?: string | null
          nightly_rate_kobo: number
          notes?: string | null
          room_id?: string | null
          room_type_id: string
          source?: Database["public"]["Enums"]["reservation_source"]
          status?: Database["public"]["Enums"]["reservation_status"]
          total_kobo: number
          updated_at?: string
        }
        Update: {
          adults?: number
          branch_id?: string
          check_in?: string
          check_out?: string
          checked_in_at?: string | null
          checked_out_at?: string | null
          children?: number
          confirmation_code?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          guest_id?: string
          id?: string
          id_photo_path?: string | null
          nightly_rate_kobo?: number
          notes?: string | null
          room_id?: string | null
          room_type_id?: string
          source?: Database["public"]["Enums"]["reservation_source"]
          status?: Database["public"]["Enums"]["reservation_status"]
          total_kobo?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
        ]
      }
      room_types: {
        Row: {
          base_rate_kobo: number
          branch_id: string
          created_at: string
          description: string | null
          id: string
          max_guests: number
          name: string
          photo_url: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          base_rate_kobo: number
          branch_id: string
          created_at?: string
          description?: string | null
          id?: string
          max_guests?: number
          name: string
          photo_url?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          base_rate_kobo?: number
          branch_id?: string
          created_at?: string
          description?: string | null
          id?: string
          max_guests?: number
          name?: string
          photo_url?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_types_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          branch_id: string
          created_at: string
          floor: string | null
          id: string
          number: string
          room_type_id: string
          status: Database["public"]["Enums"]["room_status"]
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          floor?: string | null
          id?: string
          number: string
          room_type_id: string
          status?: Database["public"]["Enums"]["room_status"]
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          floor?: string | null
          id?: string
          number?: string
          room_type_id?: string
          status?: Database["public"]["Enums"]["room_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
        ]
      }
      service_requests: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          note: string | null
          reservation_id: string
          status: Database["public"]["Enums"]["request_status"]
          type: Database["public"]["Enums"]["request_type"]
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          note?: string | null
          reservation_id: string
          status?: Database["public"]["Enums"]["request_status"]
          type: Database["public"]["Enums"]["request_type"]
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          note?: string | null
          reservation_id?: string
          status?: Database["public"]["Enums"]["request_status"]
          type?: Database["public"]["Enums"]["request_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      app_branch_id: { Args: never; Returns: string }
      app_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      available_room_types: {
        Args: { p_branch: string; p_check_in: string; p_check_out: string }
        Returns: {
          available_rooms: number
          base_rate_kobo: number
          description: string
          max_guests: number
          name: string
          photo_url: string
          room_type_id: string
          total_rooms: number
        }[]
      }
      branch_report: {
        Args: { p_from: string; p_to: string }
        Returns: {
          branch_id: string
          branch_name: string
          occupancy_pct: number
          other_revenue_kobo: number
          payments_kobo: number
          room_nights_available: number
          room_nights_sold: number
          room_revenue_kobo: number
          rooms: number
        }[]
      }
      can_access_branch: { Args: { p_branch: string }; Returns: boolean }
      check_in: {
        Args: {
          p_id_number: string
          p_id_photo_path: string
          p_id_type: string
          p_reservation: string
          p_room: string
        }
        Returns: undefined
      }
      check_out: { Args: { p_reservation: string }; Returns: undefined }
      close_business_day: {
        Args: { p_branch: string; p_date: string }
        Returns: Json
      }
      confirm_online_payment: {
        Args: {
          p_amount_kobo: number
          p_reference: string
          p_reservation: string
        }
        Returns: undefined
      }
      create_desk_booking: {
        Args: {
          p_adults: number
          p_branch: string
          p_check_in: string
          p_check_out: string
          p_email: string
          p_full_name: string
          p_phone: string
          p_room_type: string
          p_source: Database["public"]["Enums"]["reservation_source"]
        }
        Returns: string
      }
      create_online_booking: {
        Args: {
          p_adults: number
          p_branch: string
          p_check_in: string
          p_check_out: string
          p_children: number
          p_email: string
          p_full_name: string
          p_phone: string
          p_room_type: string
        }
        Returns: {
          confirmation_code: string
          reservation_id: string
          total_kobo: number
        }[]
      }
      decide_purchase_request: {
        Args: { p_approve: boolean; p_note: string; p_request: string }
        Returns: undefined
      }
      folio_balance_kobo: { Args: { p_folio: string }; Returns: number }
      is_hq: { Args: never; Returns: boolean }
      is_manager: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      my_guest_id: { Args: never; Returns: string }
      post_charge: {
        Args: {
          p_description: string
          p_kind: Database["public"]["Enums"]["folio_item_kind"]
          p_qty: number
          p_reservation: string
          p_unit_kobo: number
        }
        Returns: string
      }
      record_payment: {
        Args: {
          p_amount_kobo: number
          p_method: Database["public"]["Enums"]["payment_method"]
          p_reference: string
          p_reservation: string
        }
        Returns: string
      }
      reset_demo_data: { Args: never; Returns: undefined }
    }
    Enums: {
      audit_status: "open" | "closed"
      folio_item_kind:
        | "room"
        | "food"
        | "laundry"
        | "minibar"
        | "other"
        | "tax"
        | "discount"
      payment_method: "cash" | "pos" | "transfer" | "paystack"
      payment_status: "pending" | "succeeded" | "failed" | "refunded"
      pr_status: "draft" | "submitted" | "approved" | "rejected"
      request_status: "open" | "in_progress" | "done" | "cancelled"
      request_type: "housekeeping" | "laundry" | "room_service" | "repair"
      reservation_source: "online" | "walk_in" | "phone"
      reservation_status:
        | "pending_payment"
        | "confirmed"
        | "checked_in"
        | "checked_out"
        | "cancelled"
        | "no_show"
      room_status: "vacant_clean" | "vacant_dirty" | "occupied" | "out_of_order"
      ticket_priority: "low" | "medium" | "high"
      ticket_status: "open" | "assigned" | "in_progress" | "closed"
      user_role:
        | "hq_admin"
        | "branch_admin"
        | "front_desk"
        | "procurement"
        | "maintenance"
        | "guest"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      audit_status: ["open", "closed"],
      folio_item_kind: [
        "room",
        "food",
        "laundry",
        "minibar",
        "other",
        "tax",
        "discount",
      ],
      payment_method: ["cash", "pos", "transfer", "paystack"],
      payment_status: ["pending", "succeeded", "failed", "refunded"],
      pr_status: ["draft", "submitted", "approved", "rejected"],
      request_status: ["open", "in_progress", "done", "cancelled"],
      request_type: ["housekeeping", "laundry", "room_service", "repair"],
      reservation_source: ["online", "walk_in", "phone"],
      reservation_status: [
        "pending_payment",
        "confirmed",
        "checked_in",
        "checked_out",
        "cancelled",
        "no_show",
      ],
      room_status: ["vacant_clean", "vacant_dirty", "occupied", "out_of_order"],
      ticket_priority: ["low", "medium", "high"],
      ticket_status: ["open", "assigned", "in_progress", "closed"],
      user_role: [
        "hq_admin",
        "branch_admin",
        "front_desk",
        "procurement",
        "maintenance",
        "guest",
      ],
    },
  },
} as const
