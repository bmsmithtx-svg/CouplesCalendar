export type Json = boolean | number | string | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      calendar_events: {
        Row: {
          category: string;
          couple_id: string;
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          description: string | null;
          ends_at: string;
          id: string;
          is_all_day: boolean;
          location: string | null;
          recurrence_ends_at: string | null;
          recurrence_rule: string | null;
          starts_at: string;
          status: string;
          timezone: string;
          title: string;
          updated_at: string;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          category?: string;
          couple_id: string;
          created_at?: string;
          created_by: string;
          deleted_at?: string | null;
          description?: string | null;
          ends_at: string;
          id?: string;
          is_all_day?: boolean;
          location?: string | null;
          recurrence_ends_at?: string | null;
          recurrence_rule?: string | null;
          starts_at: string;
          status?: string;
          timezone?: string;
          title: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Update: {
          category?: string;
          couple_id?: string;
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          description?: string | null;
          ends_at?: string;
          id?: string;
          is_all_day?: boolean;
          location?: string | null;
          recurrence_ends_at?: string | null;
          recurrence_rule?: string | null;
          starts_at?: string;
          status?: string;
          timezone?: string;
          title?: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            columns: ['couple_id'];
            foreignKeyName: 'calendar_events_couple_id_fkey';
            referencedColumns: ['id'];
            referencedRelation: 'couples';
          },
          {
            columns: ['created_by'];
            foreignKeyName: 'calendar_events_created_by_fkey';
            referencedColumns: ['id'];
            referencedRelation: 'profiles';
          },
          {
            columns: ['updated_by'];
            foreignKeyName: 'calendar_events_updated_by_fkey';
            referencedColumns: ['id'];
            referencedRelation: 'profiles';
          },
        ];
      };
      couple_invitations: {
        Row: {
          accepted_at: string | null;
          accepted_by: string | null;
          couple_id: string;
          created_at: string;
          created_by: string;
          expires_at: string;
          id: string;
          revoked_at: string | null;
          status: string;
          token_hash: string;
          updated_at: string;
        };
        Insert: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          couple_id: string;
          created_at?: string;
          created_by: string;
          expires_at: string;
          id?: string;
          revoked_at?: string | null;
          status?: string;
          token_hash: string;
          updated_at?: string;
        };
        Update: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          couple_id?: string;
          created_at?: string;
          created_by?: string;
          expires_at?: string;
          id?: string;
          revoked_at?: string | null;
          status?: string;
          token_hash?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            columns: ['couple_id'];
            foreignKeyName: 'couple_invitations_couple_id_fkey';
            referencedColumns: ['id'];
            referencedRelation: 'couples';
          },
          {
            columns: ['created_by'];
            foreignKeyName: 'couple_invitations_created_by_fkey';
            referencedColumns: ['id'];
            referencedRelation: 'profiles';
          },
          {
            columns: ['accepted_by'];
            foreignKeyName: 'couple_invitations_accepted_by_fkey';
            referencedColumns: ['id'];
            referencedRelation: 'profiles';
          },
        ];
      };
      couple_members: {
        Row: {
          active_member_slot: number | null;
          couple_id: string;
          created_at: string;
          id: string;
          joined_at: string;
          left_at: string | null;
          membership_status: string;
          role: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          active_member_slot?: number | null;
          couple_id: string;
          created_at?: string;
          id?: string;
          joined_at?: string;
          left_at?: string | null;
          membership_status?: string;
          role?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          active_member_slot?: number | null;
          couple_id?: string;
          created_at?: string;
          id?: string;
          joined_at?: string;
          left_at?: string | null;
          membership_status?: string;
          role?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            columns: ['couple_id'];
            foreignKeyName: 'couple_members_couple_id_fkey';
            referencedColumns: ['id'];
            referencedRelation: 'couples';
          },
          {
            columns: ['user_id'];
            foreignKeyName: 'couple_members_user_id_fkey';
            referencedColumns: ['id'];
            referencedRelation: 'profiles';
          },
        ];
      };
      couples: {
        Row: {
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          id: string;
          name: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          deleted_at?: string | null;
          id?: string;
          name: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          id?: string;
          name?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            columns: ['created_by'];
            foreignKeyName: 'couples_created_by_fkey';
            referencedColumns: ['id'];
            referencedRelation: 'profiles';
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          default_timezone: string;
          display_name: string;
          id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          default_timezone: string;
          display_name: string;
          id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          default_timezone?: string;
          display_name?: string;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
