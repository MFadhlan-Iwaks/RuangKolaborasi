export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          username: string | null;
          avatar_url: string | null;
          status: 'online' | 'idle' | 'dnd' | 'offline';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          username?: string | null;
          avatar_url?: string | null;
          status?: 'online' | 'idle' | 'dnd' | 'offline';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          full_name?: string | null;
          username?: string | null;
          avatar_url?: string | null;
          status?: 'online' | 'idle' | 'dnd' | 'offline';
          updated_at?: string;
        };
        Relationships: [];
      };
      workspaces: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          short_name: string | null;
          color: string | null;
          owner_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          short_name?: string | null;
          color?: string | null;
          owner_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          short_name?: string | null;
          color?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      workspace_members: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'member';
          joined_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          role?: 'owner' | 'admin' | 'member';
          joined_at?: string;
        };
        Update: {
          role?: 'owner' | 'admin' | 'member';
        };
        Relationships: [];
      };
      channels: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          description: string | null;
          favorite: boolean;
          archived: boolean;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          description?: string | null;
          favorite?: boolean;
          archived?: boolean;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          favorite?: boolean;
          archived?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          channel_id: string;
          sender_id: string;
          content: string | null;
          type: 'text' | 'file' | 'image' | 'document_scan' | 'summary';
          file_id: string | null;
          pinned: boolean;
          edited: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          channel_id: string;
          sender_id: string;
          content?: string | null;
          type?: 'text' | 'file' | 'image' | 'document_scan' | 'summary';
          file_id?: string | null;
          pinned?: boolean;
          edited?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          content?: string | null;
          type?: 'text' | 'file' | 'image' | 'document_scan' | 'summary';
          file_id?: string | null;
          pinned?: boolean;
          edited?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      workspace_role: 'owner' | 'admin' | 'member';
      message_type: 'text' | 'file' | 'image' | 'document_scan' | 'summary';
      device_platform: 'web' | 'android' | 'ios';
    };
    CompositeTypes: Record<string, never>;
  };
}
