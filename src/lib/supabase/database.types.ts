export type Json = boolean | number | string | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
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
