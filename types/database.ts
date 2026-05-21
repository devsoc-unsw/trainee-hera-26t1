export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      driving_groups: {
        Row: {
          id: string;
          created_at: string;
          trip_id: string;
          name: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          trip_id: string;
          name?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          trip_id?: string;
          name?: string | null;
        };
        Relationships: [];
      };
      location_images: {
        Row: {
          id: string;
          location_id: string;
          storage_path: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          location_id: string;
          storage_path: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          location_id?: string;
          storage_path?: string;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      locations: {
        Row: {
          id: string;
          name: string | null;
          address: string | null;
          latitude: number | null;
          longitude: number | null;
          airbnb_url: string | null;
        };
        Insert: {
          id?: string;
          name?: string | null;
          address?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          airbnb_url?: string | null;
        };
        Update: {
          id?: string;
          name?: string | null;
          address?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          airbnb_url?: string | null;
        };
        Relationships: [];
      };
      trip_participants: {
        Row: {
          username: string;
          trip_id: string;
          group_id: string | null;
          group_order: number | null;
          location: string | null;
          is_driver: boolean;
          password_hash: string | null;
          is_admin: boolean;
          seats: number | null;
        };
        Insert: {
          username: string;
          trip_id: string;
          group_id?: string | null;
          group_order?: number | null;
          location?: string | null;
          is_driver: boolean;
          password_hash?: string | null;
          is_admin: boolean;
          seats?: number | null;
        };
        Update: {
          username?: string;
          trip_id?: string;
          group_id?: string | null;
          group_order?: number | null;
          location?: string | null;
          is_driver?: boolean;
          password_hash?: string | null;
          is_admin?: boolean;
          seats?: number | null;
        };
        Relationships: [];
      };
      trips: {
        Row: {
          id: string;
          created_at: string;
          trip_name: string;
          trip_date: string | null;
          location: string | null;
          trip_code: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          trip_name: string;
          trip_date?: string | null;
          location?: string | null;
          trip_code: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          trip_name?: string;
          trip_date?: string | null;
          location?: string | null;
          trip_code?: string;
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

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

export type DrivingGroup = Tables<"driving_groups">;
export type LocationImage = Tables<"location_images">;
export type Location = Tables<"locations">;
export type TripParticipant = Tables<"trip_participants">;
export type Trip = Tables<"trips">;

export type DrivingGroupInsert = TablesInsert<"driving_groups">;
export type LocationInsert = TablesInsert<"locations">;
export type TripParticipantInsert = TablesInsert<"trip_participants">;
export type TripParticipantUpdate = TablesUpdate<"trip_participants">;
export type TripInsert = TablesInsert<"trips">;
