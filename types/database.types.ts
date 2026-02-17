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
      exchange_accounts: {
        Row: {
          account_mode: string
          account_nickname: string | null
          account_type: string
          api_key: string
          created_at: string | null
          exchange_id: string
          exchange_name: string | null
          id: string
          is_enabled: boolean
          last_sync_at: string | null
          passphrase: string | null
          secret_key: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_mode: string
          account_nickname?: string | null
          account_type: string
          api_key: string
          created_at?: string | null
          exchange_id: string
          exchange_name?: string | null
          id?: string
          is_enabled?: boolean
          last_sync_at?: string | null
          passphrase?: string | null
          secret_key: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_mode?: string
          account_nickname?: string | null
          account_type?: string
          api_key?: string
          created_at?: string | null
          exchange_id?: string
          exchange_name?: string | null
          id?: string
          is_enabled?: boolean
          last_sync_at?: string | null
          passphrase?: string | null
          secret_key?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exchange_accounts_exchange_id_fkey"
            columns: ["exchange_id"]
            isOneToOne: false
            referencedRelation: "exchanges"
            referencedColumns: ["id"]
          },
        ]
      }
      exchanges: {
        Row: {
          created_at: string | null
          display_name: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          sort_order: number | null
          supported_account_types: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_name: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          sort_order?: number | null
          supported_account_types?: string[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          sort_order?: number | null
          supported_account_types?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      purchase_records: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          id: string
          new_vip_expires_at: string | null
          order_no: string
          package_name: string
          package_type: string
          payment_id: string | null
          payment_method: string | null
          platform: string | null
          previous_vip_expires_at: string | null
          purchased_at: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          id?: string
          new_vip_expires_at?: string | null
          order_no: string
          package_name: string
          package_type: string
          payment_id?: string | null
          payment_method?: string | null
          platform?: string | null
          previous_vip_expires_at?: string | null
          purchased_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          new_vip_expires_at?: string | null
          order_no?: string
          package_name?: string
          package_type?: string
          payment_id?: string | null
          payment_method?: string | null
          platform?: string | null
          previous_vip_expires_at?: string | null
          purchased_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      redemption_codes: {
        Row: {
          code: string
          created_at: string | null
          duration_days: number
          expires_at: string
          id: string
          status: string
          type: string
          updated_at: string | null
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          duration_days: number
          expires_at: string
          id?: string
          status?: string
          type: string
          updated_at?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          duration_days?: number
          expires_at?: string
          id?: string
          status?: string
          type?: string
          updated_at?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      redemption_records: {
        Row: {
          code: string
          code_type: string
          created_at: string | null
          duration_days: number
          id: string
          new_vip_expires_at: string
          previous_vip_expires_at: string | null
          redeemed_at: string | null
          user_id: string
        }
        Insert: {
          code: string
          code_type: string
          created_at?: string | null
          duration_days: number
          id?: string
          new_vip_expires_at: string
          previous_vip_expires_at?: string | null
          redeemed_at?: string | null
          user_id: string
        }
        Update: {
          code?: string
          code_type?: string
          created_at?: string | null
          duration_days?: number
          id?: string
          new_vip_expires_at?: string
          previous_vip_expires_at?: string | null
          redeemed_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      signals: {
        Row: {
          created_at: string | null
          currency: string
          direction: string
          entry_price: string
          id: string
          leverage: string | null
          signal_time: string | null
          signal_type: string | null
          status: string | null
          stop_loss: string
          take_profit: string
          trader_id: string
          updated_at: string | null
          roi: number | null
          realized_pnl: number | null
          closed_at: string | null
          exit_price: number | null
          exit_reason: string | null
          last_checked_at: string | null
          duration: number | null
        }
        Insert: {
          created_at?: string | null
          currency: string
          direction: string
          entry_price: string
          id?: string
          leverage?: string | null
          signal_time?: string | null
          signal_type?: string | null
          status?: string | null
          stop_loss: string
          take_profit: string
          trader_id: string
          updated_at?: string | null
          roi?: number | null
          realized_pnl?: number | null
          closed_at?: string | null
          exit_price?: number | null
          exit_reason?: string | null
          last_checked_at?: string | null
          duration?: number | null
        }
        Update: {
          created_at?: string | null
          currency?: string
          direction?: string
          entry_price?: string
          id?: string
          leverage?: string | null
          signal_time?: string | null
          signal_type?: string | null
          status?: string | null
          stop_loss?: string
          take_profit?: string
          trader_id?: string
          updated_at?: string | null
          roi?: number | null
          realized_pnl?: number | null
          closed_at?: string | null
          exit_price?: number | null
          exit_reason?: string | null
          last_checked_at?: string | null
          duration?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "signals_trader_id_fkey"
            columns: ["trader_id"]
            isOneToOne: false
            referencedRelation: "traders"
            referencedColumns: ["id"]
          },
        ]
      }
      traders: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          description: string | null
          followers_count: number | null
          id: string
          is_online: boolean | null
          is_online_today: boolean | null
          is_visible: boolean
          name: string
          signal_count: number | null
          updated_at: string | null
          win_rate: number | null
          total_roi: number | null
          avg_pnl_ratio: number | null
          profit_factor: number | null
          total_signals: number | null
          long_signals: number | null
          short_signals: number | null
          total_pnl: number | null
          trading_days: number | null
          subscription_count: number | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          description?: string | null
          followers_count?: number | null
          id?: string
          is_online?: boolean | null
          is_online_today?: boolean | null
          is_visible?: boolean
          name: string
          signal_count?: number | null
          updated_at?: string | null
          win_rate?: number | null
          total_roi?: number | null
          avg_pnl_ratio?: number | null
          profit_factor?: number | null
          total_signals?: number | null
          long_signals?: number | null
          short_signals?: number | null
          total_pnl?: number | null
          trading_days?: number | null
          subscription_count?: number | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          description?: string | null
          followers_count?: number | null
          id?: string
          is_online?: boolean | null
          is_online_today?: boolean | null
          is_visible?: boolean
          name?: string
          signal_count?: number | null
          updated_at?: string | null
          win_rate?: number | null
          total_roi?: number | null
          avg_pnl_ratio?: number | null
          profit_factor?: number | null
          total_signals?: number | null
          long_signals?: number | null
          short_signals?: number | null
          total_pnl?: number | null
          trading_days?: number | null
          subscription_count?: number | null
        }
        Relationships: []
      }
      user_follows: {
        Row: {
          followed_at: string | null
          id: string
          trader_id: string
          user_id: string
        }
        Insert: {
          followed_at?: string | null
          id?: string
          trader_id: string
          user_id: string
        }
        Update: {
          followed_at?: string | null
          id?: string
          trader_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_follows_trader_id_fkey"
            columns: ["trader_id"]
            isOneToOne: false
            referencedRelation: "traders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          id: string
          user_id: string
          trader_id: string
          subscribed_at: string | null
        }
        Insert: {
          id?: string
          subscribed_at?: string | null
          trader_id: string
          user_id: string
        }
        Update: {
          id?: string
          subscribed_at?: string | null
          trader_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_trader_id_fkey"
            columns: ["trader_id"]
            isOneToOne: false
            referencedRelation: "traders"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
      get_traders_with_stats: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_user_id?: string
        }
        Returns: {
          avatar_url: string
          avg_pnl_ratio: number
          created_at: string
          description: string
          followers_count: number
          id: string
          is_followed: boolean
          is_online: boolean
          is_online_today: boolean
          is_subscribed: boolean
          long_signals: number
          name: string
          profit_factor: number
          short_signals: number
          total_roi: number
          total_signals: number
          trading_days: number
          updated_at: string
          win_rate: number
        }[]
      }
      get_trader_detail: {
        Args: { 
          p_trader_id: string
          p_user_id?: string | null
        }
        Returns: {
          id: string
          name: string
          description: string
          avatar_url: string
          is_online_today: boolean
          is_online: boolean
          signal_count: number
          followers_count: number
          win_rate: number
          created_at: string
          updated_at: string
          total_signals: number
          active_signals: number
          closed_signals: number
          cancelled_signals: number
          long_signals: number
          short_signals: number
          spot_signals: number
          futures_signals: number
          margin_signals: number
          is_subscribed: boolean
          is_followed: boolean
        }[]
      }
      get_trader_signals: {
        Args: {
          p_trader_id: string
          p_status?: string | null
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          id: string
          trader_id: string
          currency: string
          direction: string
          entry_price: string
          stop_loss: string
          take_profit: string
          leverage: string
          status: string
          signal_type: string
          signal_time: string
          created_at: string
          updated_at: string
          roi: number
          closed_at: string
          realized_pnl: number
          exit_price: number
          exit_reason: string
          duration: number  // 新增：信号时长（小时）
          trader_name: string
          trader_avatar_url: string
          trader_is_online: boolean
        }[]
      }
      get_signals_with_traders: {
        Args: {
          p_status?: string
          p_direction?: string | null
          p_signal_type?: string | null
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          id: string
          trader_id: string
          currency: string
          direction: string
          entry_price: string
          stop_loss: string
          take_profit: string
          leverage: string
          status: string
          signal_type: string
          signal_time: string
          created_at: string
          updated_at: string
          trader_name: string
          trader_description: string
          trader_avatar_url: string
          trader_signal_count: number
          trader_is_online: boolean
          trader_is_online_today: boolean
          trader_followers_count: number
          trader_win_rate: number
        }[]
      }
    }
  }
}
