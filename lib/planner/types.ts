// Planner types — TulipDay route planner

export type GroupType   = "solo" | "couple" | "family" | "friends";
export type TimeBudget  = "2h" | "half" | "full";
export type Transport   = "walking" | "cycling" | "car";
export type Vibe        = "bloemen" | "fotografie" | "cultuur" | "eten" | "natuur";
export type Pace        = "relaxed" | "normal" | "active";

export interface PlannerProfile {
  group:      GroupType;
  time:       TimeBudget;
  transport:  Transport;
  vibes:      Vibe[];
  pace:       Pace;
}

// A raw Supabase location row (fields we fetch for scoring)
export interface LocationCandidate {
  id:           string;
  title:        string;
  slug:         string | null;
  latitude:     number;
  longitude:    number;
  category:     string | null;
  bloom_status: string | null;
  access_type:  string | null;
  photo_score:  number | null;
  image_url:    string | null;
}

export interface ScoredLocation extends LocationCandidate {
  score:       number;
  reasons:     string[];    // "waarom voor jou" bullets (NL)
  vibeTags:    string[];
  accessible:  boolean;
  avgVisitMin: number;
}

export interface PlannedStop {
  id:          string;
  name:        string;
  slug:        string | null;
  lat:         number;
  lng:         number;
  category:    string;
  image_url:   string | null;
  startMin:    number;   // minuten na 09:00
  durationMin: number;
  reasons:     string[];
}

export interface DayPlan {
  profile:   PlannerProfile;
  stops:     PlannedStop[];
  totalMin:  number;
  generatedAt: string; // ISO timestamp
}

// localStorage keys
export const PLANNER_PROFILE_KEY = "tulipday_planner_profile";
export const PLANNER_RESULT_KEY  = "tulipday_planner_result";
