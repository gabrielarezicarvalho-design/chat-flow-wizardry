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
      agents: {
        Row: {
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          model: string | null
          name: string
          status: string | null
          system_prompt: string | null
          temperature: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          model?: string | null
          name: string
          status?: string | null
          system_prompt?: string | null
          temperature?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          model?: string | null
          name?: string
          status?: string | null
          system_prompt?: string | null
          temperature?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          created_at: string
          environment: string | null
          id: number
          meta_api_version: string | null
          updated_at: string
          whatsapp_verify_token: string | null
          whatsapp_webhook_callback_url: string | null
        }
        Insert: {
          created_at?: string
          environment?: string | null
          id?: number
          meta_api_version?: string | null
          updated_at?: string
          whatsapp_verify_token?: string | null
          whatsapp_webhook_callback_url?: string | null
        }
        Update: {
          created_at?: string
          environment?: string | null
          id?: number
          meta_api_version?: string | null
          updated_at?: string
          whatsapp_verify_token?: string | null
          whatsapp_webhook_callback_url?: string | null
        }
        Relationships: []
      }
      birthday_campaigns: {
        Row: {
          buttons: Json | null
          connection_id: string | null
          created_at: string
          days_before: number | null
          id: string
          interactive_type: string | null
          is_active: boolean | null
          media_url: string | null
          message_content: string | null
          message_type: string | null
          name: string
          send_time: string | null
          user_id: string | null
        }
        Insert: {
          buttons?: Json | null
          connection_id?: string | null
          created_at?: string
          days_before?: number | null
          id?: string
          interactive_type?: string | null
          is_active?: boolean | null
          media_url?: string | null
          message_content?: string | null
          message_type?: string | null
          name: string
          send_time?: string | null
          user_id?: string | null
        }
        Update: {
          buttons?: Json | null
          connection_id?: string | null
          created_at?: string
          days_before?: number | null
          id?: string
          interactive_type?: string | null
          is_active?: boolean | null
          media_url?: string | null
          message_content?: string | null
          message_type?: string | null
          name?: string
          send_time?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      birthday_contacts: {
        Row: {
          birth_date: string
          campaign_id: string | null
          created_at: string
          id: string
          last_sent_year: number | null
          name: string
          phone: string
          user_id: string | null
        }
        Insert: {
          birth_date: string
          campaign_id?: string | null
          created_at?: string
          id?: string
          last_sent_year?: number | null
          name: string
          phone: string
          user_id?: string | null
        }
        Update: {
          birth_date?: string
          campaign_id?: string | null
          created_at?: string
          id?: string
          last_sent_year?: number | null
          name?: string
          phone?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "birthday_contacts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "birthday_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_contacts: {
        Row: {
          campaign_id: string
          created_at: string
          error_message: string | null
          id: string
          phone: string
          sent_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          phone: string
          sent_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          phone?: string
          sent_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_contacts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_responses: {
        Row: {
          campaign_id: string | null
          contact_name: string | null
          contact_phone: string
          created_at: string
          id: string
          responded_at: string | null
          response_text: string | null
          response_type: string | null
          response_value: string | null
          user_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          contact_name?: string | null
          contact_phone: string
          created_at?: string
          id?: string
          responded_at?: string | null
          response_text?: string | null
          response_type?: string | null
          response_value?: string | null
          user_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          contact_name?: string | null
          contact_phone?: string
          created_at?: string
          id?: string
          responded_at?: string | null
          response_text?: string | null
          response_type?: string | null
          response_value?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_responses_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_templates: {
        Row: {
          buttons: Json | null
          carousel_cards: Json | null
          connection_id: string | null
          contact_source: string | null
          created_at: string
          id: string
          interactive_type: string | null
          list_items: Json | null
          media_url: string | null
          message_content: string | null
          message_type: string | null
          name: string
          selected_tags: string[] | null
          user_id: string | null
        }
        Insert: {
          buttons?: Json | null
          carousel_cards?: Json | null
          connection_id?: string | null
          contact_source?: string | null
          created_at?: string
          id?: string
          interactive_type?: string | null
          list_items?: Json | null
          media_url?: string | null
          message_content?: string | null
          message_type?: string | null
          name: string
          selected_tags?: string[] | null
          user_id?: string | null
        }
        Update: {
          buttons?: Json | null
          carousel_cards?: Json | null
          connection_id?: string | null
          contact_source?: string | null
          created_at?: string
          id?: string
          interactive_type?: string | null
          list_items?: Json | null
          media_url?: string | null
          message_content?: string | null
          message_type?: string | null
          name?: string
          selected_tags?: string[] | null
          user_id?: string | null
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          company_id: string | null
          completed_at: string | null
          created_at: string
          failed_count: number | null
          folder_id: string | null
          id: string
          media_url: string | null
          message_content: string | null
          message_type: string | null
          name: string
          scheduled_at: string | null
          sent_count: number | null
          status: string | null
          total_contacts: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          failed_count?: number | null
          folder_id?: string | null
          id?: string
          media_url?: string | null
          message_content?: string | null
          message_type?: string | null
          name: string
          scheduled_at?: string | null
          sent_count?: number | null
          status?: string | null
          total_contacts?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          failed_count?: number | null
          folder_id?: string | null
          id?: string
          media_url?: string | null
          message_content?: string | null
          message_type?: string | null
          name?: string
          scheduled_at?: string | null
          sent_count?: number | null
          status?: string | null
          total_contacts?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string | null
          custom_domain: string | null
          features: string[] | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          max_connections: number | null
          max_users: number | null
          name: string
          plan: string | null
          primary_color: string | null
          secondary_color: string | null
          slug: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          custom_domain?: string | null
          features?: string[] | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          max_connections?: number | null
          max_users?: number | null
          name: string
          plan?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          slug?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          custom_domain?: string | null
          features?: string[] | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          max_connections?: number | null
          max_users?: number | null
          name?: string
          plan?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          slug?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      connections: {
        Row: {
          base_url: string | null
          company_id: string | null
          created_at: string | null
          credentials: Json | null
          environment: string | null
          id: string
          instance_id: string | null
          instance_name: string | null
          is_active: boolean | null
          last_test: string | null
          name: string | null
          phone_number: string | null
          platform: string | null
          qr_code: string | null
          status: string | null
          token: string | null
          updated_at: string | null
          user_id: string | null
          webhook_url: string | null
        }
        Insert: {
          base_url?: string | null
          company_id?: string | null
          created_at?: string | null
          credentials?: Json | null
          environment?: string | null
          id?: string
          instance_id?: string | null
          instance_name?: string | null
          is_active?: boolean | null
          last_test?: string | null
          name?: string | null
          phone_number?: string | null
          platform?: string | null
          qr_code?: string | null
          status?: string | null
          token?: string | null
          updated_at?: string | null
          user_id?: string | null
          webhook_url?: string | null
        }
        Update: {
          base_url?: string | null
          company_id?: string | null
          created_at?: string | null
          credentials?: Json | null
          environment?: string | null
          id?: string
          instance_id?: string | null
          instance_name?: string | null
          is_active?: boolean | null
          last_test?: string | null
          name?: string | null
          phone_number?: string | null
          platform?: string | null
          qr_code?: string | null
          status?: string | null
          token?: string | null
          updated_at?: string | null
          user_id?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "connections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          assigned_to: string | null
          company_id: string | null
          connection_id: string | null
          contact_avatar: string | null
          contact_name: string | null
          contact_phone: string
          created_at: string
          department_id: string | null
          id: string
          last_message: string | null
          last_message_at: string | null
          protocol: string | null
          status: string | null
          tags: string[] | null
          unread_count: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          company_id?: string | null
          connection_id?: string | null
          contact_avatar?: string | null
          contact_name?: string | null
          contact_phone: string
          created_at?: string
          department_id?: string | null
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          protocol?: string | null
          status?: string | null
          tags?: string[] | null
          unread_count?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          company_id?: string | null
          connection_id?: string | null
          contact_avatar?: string | null
          contact_name?: string | null
          contact_phone?: string
          created_at?: string
          department_id?: string | null
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          protocol?: string | null
          status?: string | null
          tags?: string[] | null
          unread_count?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      department_members: {
        Row: {
          created_at: string | null
          department_id: string | null
          id: string
          is_supervisor: boolean | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          id?: string
          is_supervisor?: boolean | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          id?: string
          is_supervisor?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "department_members_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          color: string | null
          company_id: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      external_api_keys: {
        Row: {
          api_key: string
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          last_used_at: string | null
          name: string
          permissions: string[]
          updated_at: string
          webhook_events: string[] | null
          webhook_url: string | null
        }
        Insert: {
          api_key?: string
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name: string
          permissions?: string[]
          updated_at?: string
          webhook_events?: string[] | null
          webhook_url?: string | null
        }
        Update: {
          api_key?: string
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name?: string
          permissions?: string[]
          updated_at?: string
          webhook_events?: string[] | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_api_keys_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      external_api_logs: {
        Row: {
          api_key_id: string | null
          company_id: string
          created_at: string
          endpoint: string
          id: string
          ip_address: string | null
          method: string
          request_body: Json | null
          response_body: Json | null
          status_code: number | null
        }
        Insert: {
          api_key_id?: string | null
          company_id: string
          created_at?: string
          endpoint: string
          id?: string
          ip_address?: string | null
          method: string
          request_body?: Json | null
          response_body?: Json | null
          status_code?: number | null
        }
        Update: {
          api_key_id?: string | null
          company_id?: string
          created_at?: string
          endpoint?: string
          id?: string
          ip_address?: string | null
          method?: string
          request_body?: Json | null
          response_body?: Json | null
          status_code?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "external_api_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "external_api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_api_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      flows: {
        Row: {
          company_id: string | null
          created_at: string
          description: string | null
          flow_data: Json | null
          id: string
          is_active: boolean | null
          name: string
          trigger_type: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          flow_data?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          trigger_type?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          flow_data?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          trigger_type?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flows_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          company_id: string | null
          created_at: string
          custom_fields: Json | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          source: string | null
          status: string | null
          tags: string[] | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          custom_fields?: Json | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          custom_fields?: Json | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string | null
          conversation_id: string | null
          created_at: string
          external_id: string | null
          id: string
          media_url: string | null
          message_type: string | null
          metadata: Json | null
          sender_id: string | null
          sender_type: string
          status: string | null
        }
        Insert: {
          content?: string | null
          conversation_id?: string | null
          created_at?: string
          external_id?: string | null
          id?: string
          media_url?: string | null
          message_type?: string | null
          metadata?: Json | null
          sender_id?: string | null
          sender_type: string
          status?: string | null
        }
        Update: {
          content?: string | null
          conversation_id?: string | null
          created_at?: string
          external_id?: string | null
          id?: string
          media_url?: string | null
          message_type?: string | null
          metadata?: Json | null
          sender_id?: string | null
          sender_type?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string | null
          full_name: string | null
          id: string
          is_company_admin: boolean | null
          is_online: boolean | null
          last_seen_at: string | null
          phone: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          is_company_admin?: boolean | null
          is_online?: boolean | null
          last_seen_at?: string | null
          phone?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          is_company_admin?: boolean | null
          is_online?: boolean | null
          last_seen_at?: string | null
          phone?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          key: string
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_form_submissions: {
        Row: {
          answers: Json
          connection_id: string | null
          contacted_at: string | null
          conversation_id: string | null
          created_at: string
          department_id: string | null
          form_id: string | null
          id: string
          name: string | null
          notes: string | null
          phone: string
          status: string
          submitted_at: string | null
          unique_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          connection_id?: string | null
          contacted_at?: string | null
          conversation_id?: string | null
          created_at?: string
          department_id?: string | null
          form_id?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          phone: string
          status?: string
          submitted_at?: string | null
          unique_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          connection_id?: string | null
          contacted_at?: string | null
          conversation_id?: string | null
          created_at?: string
          department_id?: string | null
          form_id?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          phone?: string
          status?: string
          submitted_at?: string | null
          unique_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "smart_form_submissions_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smart_form_submissions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smart_form_submissions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smart_form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "smart_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_forms: {
        Row: {
          created_at: string
          department_id: string | null
          fields: Json
          id: string
          is_active: boolean
          name: string
          success_message: string
          updated_at: string
          user_id: string
          welcome_message: string
          whatsapp_confirmation: boolean
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          fields?: Json
          id?: string
          is_active?: boolean
          name: string
          success_message?: string
          updated_at?: string
          user_id: string
          welcome_message?: string
          whatsapp_confirmation?: boolean
        }
        Update: {
          created_at?: string
          department_id?: string | null
          fields?: Json
          id?: string
          is_active?: boolean
          name?: string
          success_message?: string
          updated_at?: string
          user_id?: string
          welcome_message?: string
          whatsapp_confirmation?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "smart_forms_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string
          features: string[]
          id: string
          is_active: boolean
          max_connections: number
          max_users: number
          name: string
          price: number
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          features?: string[]
          id?: string
          is_active?: boolean
          max_connections?: number
          max_users?: number
          name: string
          price?: number
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          features?: string[]
          id?: string
          is_active?: boolean
          max_connections?: number
          max_users?: number
          name?: string
          price?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string | null
          company_id: string | null
          created_at: string
          id: string
          name: string
          user_id: string | null
        }
        Insert: {
          color?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          name: string
          user_id?: string | null
        }
        Update: {
          color?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tags_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_notification_configs: {
        Row: {
          company_id: string | null
          connection_id: string | null
          created_at: string
          filter_keywords: string[] | null
          filter_mode: string
          id: string
          is_active: boolean
          name: string
          notify_campaign_start: boolean
          notify_lead_response: boolean
          telegram_bot_token: string | null
          telegram_chat_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          connection_id?: string | null
          created_at?: string
          filter_keywords?: string[] | null
          filter_mode?: string
          id?: string
          is_active?: boolean
          name?: string
          notify_campaign_start?: boolean
          notify_lead_response?: boolean
          telegram_bot_token?: string | null
          telegram_chat_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          connection_id?: string | null
          created_at?: string
          filter_keywords?: string[] | null
          filter_mode?: string
          id?: string
          is_active?: boolean
          name?: string
          notify_campaign_start?: boolean
          notify_lead_response?: boolean
          telegram_bot_token?: string | null
          telegram_chat_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "telegram_notification_configs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telegram_notification_configs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connections"
            referencedColumns: ["id"]
          },
        ]
      }
      user_connections: {
        Row: {
          connection_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_connections_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connections"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_connections: {
        Row: {
          company_id: string
          created_at: string
          id: string
          last_error: string | null
          last_tested_at: string | null
          meta_access_token: string | null
          meta_business_id: string | null
          meta_connected_at: string | null
          meta_phone_number_id: string | null
          meta_verify_token: string | null
          meta_waba_id: string | null
          provider: string
          qr_api_token: string | null
          qr_api_url: string | null
          qr_instance_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          last_error?: string | null
          last_tested_at?: string | null
          meta_access_token?: string | null
          meta_business_id?: string | null
          meta_connected_at?: string | null
          meta_phone_number_id?: string | null
          meta_verify_token?: string | null
          meta_waba_id?: string | null
          provider: string
          qr_api_token?: string | null
          qr_api_url?: string | null
          qr_instance_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          last_error?: string | null
          last_tested_at?: string | null
          meta_access_token?: string | null
          meta_business_id?: string | null
          meta_connected_at?: string | null
          meta_phone_number_id?: string | null
          meta_verify_token?: string | null
          meta_waba_id?: string | null
          provider?: string
          qr_api_token?: string | null
          qr_api_url?: string | null
          qr_instance_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_connections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          body: string | null
          company_id: string
          connection_id: string | null
          created_at: string
          direction: string
          from_number: string | null
          id: string
          message_type: string | null
          phone_number_id: string | null
          provider: string
          raw: Json | null
          status: string | null
          to_number: string | null
          wa_message_id: string | null
        }
        Insert: {
          body?: string | null
          company_id: string
          connection_id?: string | null
          created_at?: string
          direction: string
          from_number?: string | null
          id?: string
          message_type?: string | null
          phone_number_id?: string | null
          provider: string
          raw?: Json | null
          status?: string | null
          to_number?: string | null
          wa_message_id?: string | null
        }
        Update: {
          body?: string | null
          company_id?: string
          connection_id?: string | null
          created_at?: string
          direction?: string
          from_number?: string | null
          id?: string
          message_type?: string | null
          phone_number_id?: string | null
          provider?: string
          raw?: Json | null
          status?: string | null
          to_number?: string | null
          wa_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      white_label_partners: {
        Row: {
          accent_color: string | null
          background_color: string | null
          company_id: string | null
          created_at: string | null
          custom_domain: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          partner_password: string
          primary_color: string | null
          secondary_color: string | null
          slug: string
          supabase_anon_key: string | null
          supabase_service_role_key: string | null
          supabase_url: string | null
          uazapi_admin_token: string | null
          uazapi_base_url: string | null
          uazapi_environment: string | null
          updated_at: string | null
        }
        Insert: {
          accent_color?: string | null
          background_color?: string | null
          company_id?: string | null
          created_at?: string | null
          custom_domain?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          partner_password: string
          primary_color?: string | null
          secondary_color?: string | null
          slug: string
          supabase_anon_key?: string | null
          supabase_service_role_key?: string | null
          supabase_url?: string | null
          uazapi_admin_token?: string | null
          uazapi_base_url?: string | null
          uazapi_environment?: string | null
          updated_at?: string | null
        }
        Update: {
          accent_color?: string | null
          background_color?: string | null
          company_id?: string | null
          created_at?: string | null
          custom_domain?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          partner_password?: string
          primary_color?: string | null
          secondary_color?: string | null
          slug?: string
          supabase_anon_key?: string | null
          supabase_service_role_key?: string | null
          supabase_url?: string | null
          uazapi_admin_token?: string | null
          uazapi_base_url?: string | null
          uazapi_environment?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "white_label_partners_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "agent"
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
      app_role: ["admin", "moderator", "user", "agent"],
    },
  },
} as const
