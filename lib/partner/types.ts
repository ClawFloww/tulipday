// TypeScript-types voor de Partner Portal-dataset. Deze types worden
// gedeeld door de client- en server-helpers in lib/partner/* en door de
// componenten in components/partner/*.

export type PartnerCategory =
  | "horeca"
  | "fietsverhuur"
  | "attractie"
  | "recreatiepark"
  | "accommodatie"
  | "bollenveld"
  | "evenement";

export type PartnerTier = "free" | "featured" | "premium";

export type OperationalStatus = "open" | "closing_soon" | "closed";
export type CrowdLevel        = "quiet" | "normal" | "busy" | "full";
export type BloomPhase        = "not_yet" | "first_buds" | "starting" | "peak" | "fading";
export type BloomSource       = "partner" | "user" | "admin";

export interface Partner {
  id:            string;
  name:          string;
  contact_email: string;
  contact_phone: string | null;
  kvk_number:    string | null;
  tier:          PartnerTier;
  active:        boolean;
  created_at:    string;
  updated_at:    string;
}

export interface PartnerLocation {
  id:          string;
  partner_id:  string;
  location_id: string;
  category:    PartnerCategory;
  created_at:  string;
  /** Wordt los meegeleverd door queries.getPartnerLocations() */
  location?: {
    id:        string;
    title:     string;
    address:   string | null;
    category:  string | null;
    image_url: string | null;
  };
}

export interface PartnerSession {
  userId:           string;
  email:            string;
  partner:          Partner;
  partnerLocations: PartnerLocation[];
}

export interface OperationalUpdateRow {
  id:                  string;
  partner_location_id: string;
  status:              OperationalStatus;
  crowd_level:         CrowdLevel | null;
  notes:               string | null;
  created_by:          string | null;
  created_at:          string;
}

export interface BloomUpdateRow {
  id:                  string;
  partner_location_id: string | null;
  location_id:         string;
  phase:               BloomPhase;
  notes:               string | null;
  source:              BloomSource;
  created_by:          string | null;
  created_at:          string;
}

export interface CurrentOperationalStatus {
  partner_location_id: string;
  status:              OperationalStatus;
  crowd_level:         CrowdLevel | null;
  notes:               string | null;
  updated_at:          string;
}

export interface CurrentBloomStatus {
  location_id: string;
  phase:       BloomPhase;
  notes:       string | null;
  source:      BloomSource;
  updated_at:  string;
}
