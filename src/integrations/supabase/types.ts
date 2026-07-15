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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          opportunity_id: string
          status: Database["public"]["Enums"]["app_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          opportunity_id: string
          status?: Database["public"]["Enums"]["app_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          opportunity_id?: string
          status?: Database["public"]["Enums"]["app_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_history: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      data_sources: {
        Row: {
          config: Json
          created_at: string
          default_category: string | null
          enabled: boolean
          id: string
          kind: string
          last_error: string | null
          last_run_at: string | null
          last_status: string | null
          name: string
          next_retry_at: string | null
          updated_at: string
          url: string
        }
        Insert: {
          config?: Json
          created_at?: string
          default_category?: string | null
          enabled?: boolean
          id?: string
          kind: string
          last_error?: string | null
          last_run_at?: string | null
          last_status?: string | null
          name: string
          next_retry_at?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          config?: Json
          created_at?: string
          default_category?: string | null
          enabled?: boolean
          id?: string
          kind?: string
          last_error?: string | null
          last_run_at?: string | null
          last_status?: string | null
          name?: string
          next_retry_at?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      followed_categories: {
        Row: {
          category: string
          created_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      followed_orgs: {
        Row: {
          created_at: string
          organization_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          organization_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "followed_orgs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      import_runs: {
        Row: {
          archived: number
          error: string | null
          fetched: number
          finished_at: string | null
          id: string
          inserted: number
          skipped: number
          source_id: string | null
          started_at: string
          status: string
          updated: number
        }
        Insert: {
          archived?: number
          error?: string | null
          fetched?: number
          finished_at?: string | null
          id?: string
          inserted?: number
          skipped?: number
          source_id?: string | null
          started_at?: string
          status?: string
          updated?: number
        }
        Update: {
          archived?: number
          error?: string | null
          fetched?: number
          finished_at?: string | null
          id?: string
          inserted?: number
          skipped?: number
          source_id?: string | null
          started_at?: string
          status?: string
          updated?: number
        }
        Relationships: [
          {
            foreignKeyName: "import_runs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications_log: {
        Row: {
          channel: string
          error: string | null
          id: string
          offset_days: number
          opportunity_id: string
          sent_at: string
          status: string
          user_id: string
        }
        Insert: {
          channel: string
          error?: string | null
          id?: string
          offset_days: number
          opportunity_id: string
          sent_at?: string
          status?: string
          user_id: string
        }
        Update: {
          channel?: string
          error?: string | null
          id?: string
          offset_days?: number
          opportunity_id?: string
          sent_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_log_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          ai_processed_at: string | null
          apply_link: string
          benefits: string | null
          category: Database["public"]["Enums"]["opp_category"]
          content_hash: string | null
          created_at: string
          deadline: string
          description: string
          eligibility: string | null
          external_id: string | null
          id: string
          imported_at: string | null
          is_archived: boolean
          is_featured: boolean
          location: string | null
          organization: string
          organization_id: string | null
          popularity_score: number
          prize: string | null
          remote_ok: boolean | null
          skills_required: string[] | null
          slug: string | null
          source_id: string | null
          stipend: string | null
          summary: string | null
          tags: string[] | null
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          ai_processed_at?: string | null
          apply_link: string
          benefits?: string | null
          category: Database["public"]["Enums"]["opp_category"]
          content_hash?: string | null
          created_at?: string
          deadline: string
          description: string
          eligibility?: string | null
          external_id?: string | null
          id?: string
          imported_at?: string | null
          is_archived?: boolean
          is_featured?: boolean
          location?: string | null
          organization: string
          organization_id?: string | null
          popularity_score?: number
          prize?: string | null
          remote_ok?: boolean | null
          skills_required?: string[] | null
          slug?: string | null
          source_id?: string | null
          stipend?: string | null
          summary?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          ai_processed_at?: string | null
          apply_link?: string
          benefits?: string | null
          category?: Database["public"]["Enums"]["opp_category"]
          content_hash?: string | null
          created_at?: string
          deadline?: string
          description?: string
          eligibility?: string | null
          external_id?: string | null
          id?: string
          imported_at?: string | null
          is_archived?: boolean
          is_featured?: boolean
          location?: string | null
          organization?: string
          organization_id?: string | null
          popularity_score?: number
          prize?: string | null
          remote_ok?: boolean | null
          skills_required?: string[] | null
          slug?: string | null
          source_id?: string | null
          stipend?: string | null
          summary?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          logo_url: string | null
          name: string
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          branch: string | null
          certifications: string[] | null
          cgpa: string | null
          college: string | null
          country: string | null
          created_at: string
          current_year: string | null
          degree: string | null
          email: string | null
          full_name: string | null
          github_url: string | null
          id: string
          interests: string[] | null
          languages: string[] | null
          linkedin_url: string | null
          phone: string | null
          projects: string | null
          resume_path: string | null
          resume_text: string | null
          skills: string[] | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          branch?: string | null
          certifications?: string[] | null
          cgpa?: string | null
          college?: string | null
          country?: string | null
          created_at?: string
          current_year?: string | null
          degree?: string | null
          email?: string | null
          full_name?: string | null
          github_url?: string | null
          id: string
          interests?: string[] | null
          languages?: string[] | null
          linkedin_url?: string | null
          phone?: string | null
          projects?: string | null
          resume_path?: string | null
          resume_text?: string | null
          skills?: string[] | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          branch?: string | null
          certifications?: string[] | null
          cgpa?: string | null
          college?: string | null
          country?: string | null
          created_at?: string
          current_year?: string | null
          degree?: string | null
          email?: string | null
          full_name?: string | null
          github_url?: string | null
          id?: string
          interests?: string[] | null
          languages?: string[] | null
          linkedin_url?: string | null
          phone?: string | null
          projects?: string | null
          resume_path?: string | null
          resume_text?: string | null
          skills?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          channels: string[]
          created_at: string
          id: string
          offsets: number[]
          opportunity_id: string
          user_id: string
        }
        Insert: {
          channels?: string[]
          created_at?: string
          id?: string
          offsets?: number[]
          opportunity_id: string
          user_id: string
        }
        Update: {
          channels?: string[]
          created_at?: string
          id?: string
          offsets?: number[]
          opportunity_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_opportunities: {
        Row: {
          created_at: string
          opportunity_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          opportunity_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          opportunity_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_opportunities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          interests: string[] | null
          notify_email: boolean
          notify_push: boolean
          notify_whatsapp: boolean
          preferred_categories: string[] | null
          preferred_countries: string[] | null
          reminder_offsets: number[]
          updated_at: string
          user_id: string
        }
        Insert: {
          interests?: string[] | null
          notify_email?: boolean
          notify_push?: boolean
          notify_whatsapp?: boolean
          preferred_categories?: string[] | null
          preferred_countries?: string[] | null
          reminder_offsets?: number[]
          updated_at?: string
          user_id: string
        }
        Update: {
          interests?: string[] | null
          notify_email?: boolean
          notify_push?: boolean
          notify_whatsapp?: boolean
          preferred_categories?: string[] | null
          preferred_countries?: string[] | null
          reminder_offsets?: number[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      archive_expired_opportunities: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "student"
      app_status: "saved" | "applied" | "interview" | "selected" | "rejected"
      opp_category:
        | "scholarship"
        | "internship"
        | "hackathon"
        | "certification"
        | "course"
        | "fellowship"
        | "competition"
        | "workshop"
        | "webinar"
        | "bootcamp"
        | "conference"
        | "grant"
        | "research"
        | "open_source"
        | "startup"
        | "government"
        | "international"
        | "job"
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
      app_role: ["admin", "student"],
      app_status: ["saved", "applied", "interview", "selected", "rejected"],
      opp_category: [
        "scholarship",
        "internship",
        "hackathon",
        "certification",
        "course",
        "fellowship",
        "competition",
        "workshop",
        "webinar",
        "bootcamp",
        "conference",
        "grant",
        "research",
        "open_source",
        "startup",
        "government",
        "international",
        "job",
      ],
    },
  },
} as const
