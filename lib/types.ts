export type BloomStatus = "early" | "blooming" | "peak" | "ending";
export type Category = "flower_field" | "photo_spot" | "attraction" | "food" | "parking";
export type RouteType = "car" | "bike" | "walk" | "family" | "photo";
export type AccessType = "roadside_only" | "public_access" | "private_view_only";

export interface Location {
  id: string;
  title: string;
  slug: string;
  category: Category;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  short_description: string | null;
  full_description: string | null;
  flower_type: string | null;
  bloom_status: BloomStatus | null;
  photo_score: number | null;
  crowd_score: number | null;
  access_type: AccessType | null;
  parking_info: string | null;
  best_visit_time: string | null;
  image_url: string | null;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Route {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  route_type: RouteType | null;
  duration_minutes: number | null;
  distance_km: number | null;
  cover_image_url: string | null;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
}

export interface RouteStop {
  id: string;
  sort_order: number;
  locations: Location;
}

export interface OnboardingPrefs {
  intent: string;
  transport: string;
  time: string;
}
