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
      users: {
        Row: {
          id: string
          name: string | null
          email: string
          email_verified: string | null
          password: string
          image: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name?: string | null
          email: string
          email_verified?: string | null
          password: string
          image?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          email?: string
          email_verified?: string | null
          password?: string
          image?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      accounts: {
        Row: {
          id: string
          user_id: string
          type: string
          provider: string
          provider_account_id: string
          refresh_token: string | null
          access_token: string | null
          expires_at: number | null
          token_type: string | null
          scope: string | null
          id_token: string | null
          session_state: string | null
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          provider: string
          provider_account_id: string
          refresh_token?: string | null
          access_token?: string | null
          expires_at?: number | null
          token_type?: string | null
          scope?: string | null
          id_token?: string | null
          session_state?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          provider?: string
          provider_account_id?: string
          refresh_token?: string | null
          access_token?: string | null
          expires_at?: number | null
          token_type?: string | null
          scope?: string | null
          id_token?: string | null
          session_state?: string | null
        }
      }
      sessions: {
        Row: {
          id: string
          session_token: string
          user_id: string
          expires: string
        }
        Insert: {
          id?: string
          session_token: string
          user_id: string
          expires: string
        }
        Update: {
          id?: string
          session_token?: string
          user_id?: string
          expires?: string
        }
      }
      verification_tokens: {
        Row: {
          identifier: string
          token: string
          expires: string
        }
        Insert: {
          identifier: string
          token: string
          expires: string
        }
        Update: {
          identifier?: string
          token?: string
          expires?: string
        }
      }
      products: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          price: number
          image_url: string | null
          short_code: string
          stripe_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          price: number
          image_url?: string | null
          short_code: string
          stripe_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          price?: number
          image_url?: string | null
          short_code?: string
          stripe_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      analytics: {
        Row: {
          id: string
          product_id: string
          ip: string | null
          country: string | null
          user_agent: string | null
          device_type: string | null
          timestamp: string
        }
        Insert: {
          id?: string
          product_id: string
          ip?: string | null
          country?: string | null
          user_agent?: string | null
          device_type?: string | null
          timestamp?: string
        }
        Update: {
          id?: string
          product_id?: string
          ip?: string | null
          country?: string | null
          user_agent?: string | null
          device_type?: string | null
          timestamp?: string
        }
      }
      payments: {
        Row: {
          id: string
          product_id: string
          stripe_payment_id: string
          amount: number
          status: string
          timestamp: string
        }
        Insert: {
          id?: string
          product_id: string
          stripe_payment_id: string
          amount: number
          status: string
          timestamp?: string
        }
        Update: {
          id?: string
          product_id?: string
          stripe_payment_id?: string
          amount?: number
          status?: string
          timestamp?: string
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
