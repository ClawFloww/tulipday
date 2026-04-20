// Bollenveld-locaties en user-contributie types voor TulipDay

export interface TulipField {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export type BloomStatusType = "in_bloom" | "fading" | "finished";

export interface FieldBloomStatus {
  id: string;
  fieldId: string;
  userId: string;
  status: BloomStatusType;
  photoUrl?: string;
  rating?: number;
  reviewText?: string;
  timestamp: Date;
  confirmedBy: number;
  reliabilityScore: number; // 0–1
}

export interface UserContributionPrefs {
  statusUpdates: boolean;
  photoRequests: boolean;
  reviews: boolean;
  dismissedFields: string[];
  lastPromptedAt: Record<string, number>; // fieldId → unix ms
  lastSubmittedAt: Record<string, number>; // fieldId → unix ms
}

export const DEFAULT_PREFS: UserContributionPrefs = {
  statusUpdates: true,
  photoRequests: true,
  reviews: true,
  dismissedFields: [],
  lastPromptedAt: {},
  lastSubmittedAt: {},
};

// ── Alle 174 bollenvelden ────────────────────────────────────────────────────

export const TULIP_FIELDS: TulipField[] = [
  { id: "field_001", name: "Frank van Borselenlaan 5",           lat: 52.22906, lng: 4.51242 },
  { id: "field_002", name: "Frank van Borselenlaan 4",           lat: 52.22931, lng: 4.50994 },
  { id: "field_003", name: "Van den Berch van Heemstedeweg 2",   lat: 52.22664, lng: 4.50686 },
  { id: "field_004", name: "Frank van Borselenlaan 1",           lat: 52.23247, lng: 4.51508 },
  { id: "field_005", name: "Frank van Borselenlaan 2",           lat: 52.23100, lng: 4.51325 },
  { id: "field_006", name: "Frank van Borselenlaan 3",           lat: 52.22994, lng: 4.51128 },
  { id: "field_007", name: "Van den Berch van Heemstedeweg 1",   lat: 52.22914, lng: 4.50303 },
  { id: "field_008", name: "Prinsenweg 4",                       lat: 52.23103, lng: 4.50200 },
  { id: "field_009", name: "Prinsenweg 3",                       lat: 52.23200, lng: 4.50372 },
  { id: "field_010", name: "Prinsenweg 2",                       lat: 52.23408, lng: 4.50667 },
  { id: "field_011", name: "Prinsenweg 1",                       lat: 52.23572, lng: 4.50969 },
  { id: "field_012", name: "Teylingerdreef 2",                   lat: 52.22347, lng: 4.50083 },
  { id: "field_013", name: "Eikenhorstlaan 1",                   lat: 52.22575, lng: 4.50522 },
  { id: "field_014", name: "Teylingerdreef 1",                   lat: 52.22706, lng: 4.50075 },
  { id: "field_015", name: "Jacoba van Beierenweg 3",            lat: 52.23242, lng: 4.49656 },
  { id: "field_016", name: "Jacoba van Beierenweg 2",            lat: 52.23367, lng: 4.49936 },
  { id: "field_017", name: "Jacoba van Beierenweg 1",            lat: 52.23667, lng: 4.50403 },
  { id: "field_018", name: "Leidsestraat 3",                     lat: 52.28186, lng: 4.57264 },
  { id: "field_019", name: "Leidsestraat 2",                     lat: 52.27989, lng: 4.57178 },
  { id: "field_020", name: "Leidsestraat 1",                     lat: 52.27386, lng: 4.56831 },
  { id: "field_021", name: "Heereweg Lis 8",                     lat: 52.26964, lng: 4.55992 },
  { id: "field_022", name: "Zwartelaan 2",                       lat: 52.27381, lng: 4.56161 },
  { id: "field_023", name: "Zwartelaan 1",                       lat: 52.27578, lng: 4.55658 },
  { id: "field_024", name: "Veenenburgerlaan 5",                 lat: 52.28842, lng: 4.57397 },
  { id: "field_025", name: "Veenenburgerlaan 4",                 lat: 52.28856, lng: 4.56858 },
  { id: "field_026", name: "Veenenburgerlaan 3",                 lat: 52.28736, lng: 4.56244 },
  { id: "field_027", name: "Veenenburgerlaan 2",                 lat: 52.28622, lng: 4.55900 },
  { id: "field_028", name: "Veenenburgerlaan 1",                 lat: 52.28522, lng: 4.55761 },
  { id: "field_029", name: "Loosterweg Noord 4",                 lat: 52.28203, lng: 4.55386 },
  { id: "field_030", name: "Loosterweg Noord 3",                 lat: 52.27989, lng: 4.55225 },
  { id: "field_031", name: "Loosterweg Noord 2",                 lat: 52.27725, lng: 4.54950 },
  { id: "field_032", name: "Loosterweg Noord 1",                 lat: 52.27500, lng: 4.54714 },
  { id: "field_033", name: "3e Loosterweg 3",                    lat: 52.28817, lng: 4.56444 },
  { id: "field_034", name: "3e Loosterweg 2",                    lat: 52.29150, lng: 4.56175 },
  { id: "field_035", name: "3e Loosterweg 1",                    lat: 52.29372, lng: 4.56261 },
  { id: "field_036", name: "Wilhelminalaan 1",                   lat: 52.29564, lng: 4.56631 },
  { id: "field_037", name: "Beeklaan 2",                         lat: 52.29700, lng: 4.55722 },
  { id: "field_038", name: "Beeklaan 1",                         lat: 52.29620, lng: 4.56003 },
  { id: "field_039", name: "Zuider Leidsevaart 4",               lat: 52.29372, lng: 4.55058 },
  { id: "field_040", name: "Zuider Leidsevaart 3",               lat: 52.28931, lng: 4.54667 },
  { id: "field_041", name: "Zuider Leidsevaart 2",               lat: 52.28519, lng: 4.54311 },
  { id: "field_042", name: "Zuider Leidsevaart 1",               lat: 52.28086, lng: 4.53878 },
  { id: "field_043", name: "Delfweg 2",                          lat: 52.28128, lng: 4.53444 },
  { id: "field_044", name: "Delfweg 1",                          lat: 52.28356, lng: 4.53283 },
  { id: "field_045", name: "Pastoorslaan 3",                     lat: 52.30331, lng: 4.57908 },
  { id: "field_046", name: "Pastoorslaan 2",                     lat: 52.30494, lng: 4.57397 },
  { id: "field_047", name: "Pastoorslaan 1",                     lat: 52.30653, lng: 4.56967 },
  { id: "field_048", name: "1e Loosterweg 2",                    lat: 52.30708, lng: 4.56947 },
  { id: "field_049", name: "1e Loosterweg 1",                    lat: 52.31019, lng: 4.57150 },
  { id: "field_050", name: "Nieuweweg 2",                        lat: 52.31372, lng: 4.58050 },
  { id: "field_051", name: "Nieuweweg 1",                        lat: 52.31353, lng: 4.57597 },
  { id: "field_052", name: "Noorder Leidsevaart 4",              lat: 52.31236, lng: 4.56647 },
  { id: "field_053", name: "2e Doodweg 2",                       lat: 52.31847, lng: 4.56569 },
  { id: "field_054", name: "2e Doodweg 1",                       lat: 52.31683, lng: 4.56439 },
  { id: "field_055", name: "Provincialeweg 4",                   lat: 52.31586, lng: 4.57414 },
  { id: "field_056", name: "Provincialeweg 3",                   lat: 52.31389, lng: 4.56706 },
  { id: "field_057", name: "Provincialeweg 2",                   lat: 52.31322, lng: 4.55994 },
  { id: "field_058", name: "Provincialeweg 1",                   lat: 52.31200, lng: 4.55333 },
  { id: "field_059", name: "Noorder Leidsevaart 3",              lat: 52.30744, lng: 4.56242 },
  { id: "field_060", name: "Noorder Leidsevaart 2",              lat: 52.30383, lng: 4.55947 },
  { id: "field_061", name: "Noorder Leidsevaart 1",              lat: 52.30039, lng: 4.55664 },
  { id: "field_062", name: "Hoogduinweg 3",                      lat: 52.29831, lng: 4.55264 },
  { id: "field_063", name: "Hoogduinweg 2",                      lat: 52.29967, lng: 4.54783 },
  { id: "field_064", name: "Hoogduinweg 1",                      lat: 52.30125, lng: 4.54072 },
  { id: "field_065", name: "Zilkerbinnenweg 5",                  lat: 52.29911, lng: 4.54242 },
  { id: "field_066", name: "Zilkerbinnenweg 4",                  lat: 52.29731, lng: 4.54164 },
  { id: "field_067", name: "Zilkerbinnenweg 3",                  lat: 52.29286, lng: 4.53622 },
  { id: "field_068", name: "Zilkerbinnenweg 2",                  lat: 52.29008, lng: 4.53444 },
  { id: "field_069", name: "Zilkerbinnenweg 1",                  lat: 52.28794, lng: 4.53286 },
  { id: "field_070", name: "Oude Herenweg 5",                    lat: 52.24131, lng: 4.52667 },
  { id: "field_071", name: "Oude Herenweg 4",                    lat: 52.24031, lng: 4.52550 },
  { id: "field_072", name: "Oude Herenweg 3",                    lat: 52.23819, lng: 4.52292 },
  { id: "field_073", name: "Oude Herenweg 2",                    lat: 52.23697, lng: 4.52117 },
  { id: "field_074", name: "Oude Herenweg 1",                    lat: 52.23561, lng: 4.51919 },
  { id: "field_075", name: "Teylingenlaan 3",                    lat: 52.23756, lng: 4.51078 },
  { id: "field_076", name: "Teylingenlaan 2",                    lat: 52.23603, lng: 4.51367 },
  { id: "field_077", name: "Teylingerlaan 1",                    lat: 52.23408, lng: 4.51731 },
  { id: "field_078", name: "Carolus Clusiuslaan 1",              lat: 52.23214, lng: 4.52492 },
  { id: "field_079", name: "Heereweg Lis 7",                     lat: 52.23444, lng: 4.53222 },
  { id: "field_080", name: "Heereweg Lis 6",                     lat: 52.23689, lng: 4.53456 },
  { id: "field_081", name: "Heereweg Lis 5",                     lat: 52.23864, lng: 4.53592 },
  { id: "field_082", name: "Heereweg Lis 4",                     lat: 52.24042, lng: 4.53739 },
  { id: "field_083", name: "Heereweg Lis 3",                     lat: 52.24578, lng: 4.54183 },
  { id: "field_084", name: "Heereweg Lis 2",                     lat: 52.24933, lng: 4.54469 },
  { id: "field_085", name: "Heereweg Lis 1",                     lat: 52.25156, lng: 4.54622 },
  { id: "field_086", name: "Westelijke Randweg 2",               lat: 52.25506, lng: 4.54711 },
  { id: "field_087", name: "Westelijke Randweg 1",               lat: 52.26103, lng: 4.54914 },
  { id: "field_088", name: "Stationsweg 1",                      lat: 52.26506, lng: 4.54867 },
  { id: "field_089", name: "Van Lyndenweg 2",                    lat: 52.26483, lng: 4.54650 },
  { id: "field_090", name: "Van Lyndenweg 1",                    lat: 52.26175, lng: 4.54392 },
  { id: "field_091", name: "Spekkenlaan 2",                      lat: 52.25992, lng: 4.53794 },
  { id: "field_092", name: "Spekkenlaan 1",                      lat: 52.26006, lng: 4.53481 },
  { id: "field_093", name: "Loosterweg Zuid 3",                  lat: 52.25917, lng: 4.53142 },
  { id: "field_094", name: "Loosterweg Zuid 2",                  lat: 52.25756, lng: 4.52942 },
  { id: "field_095", name: "Loosterweg Zuid 1",                  lat: 52.25325, lng: 4.52647 },
  { id: "field_096", name: "Achterweg Zuid 5",                   lat: 52.25494, lng: 4.54375 },
  { id: "field_097", name: "Achterweg Zuid 4",                   lat: 52.25311, lng: 4.54233 },
  { id: "field_098", name: "Achterweg Zuid 3",                   lat: 52.24839, lng: 4.53908 },
  { id: "field_099", name: "Achterweg Zuid 2",                   lat: 52.24594, lng: 4.53467 },
  { id: "field_100", name: "Achterweg Zuid 1",                   lat: 52.24392, lng: 4.53178 },
  { id: "field_101", name: "Akervoorderlaan 2",                  lat: 52.24047, lng: 4.53197 },
  { id: "field_102", name: "Akervoorderlaan 1",                  lat: 52.24250, lng: 4.52767 },
  { id: "field_103", name: "Essenlaan 3",                        lat: 52.24700, lng: 4.53403 },
  { id: "field_104", name: "Essenlaan 2",                        lat: 52.24892, lng: 4.53039 },
  { id: "field_105", name: "Essenlaan 1",                        lat: 52.25083, lng: 4.52731 },
  { id: "field_106", name: "Loosterweg 5",                       lat: 52.25122, lng: 4.52317 },
  { id: "field_107", name: "Loosterweg 4",                       lat: 52.24842, lng: 4.51881 },
  { id: "field_108", name: "Johan Speelmanweg 1",                lat: 52.24753, lng: 4.51836 },
  { id: "field_109", name: "Loosterweg 3",                       lat: 52.24481, lng: 4.51411 },
  { id: "field_110", name: "Loosterweg 2",                       lat: 52.24086, lng: 4.50933 },
  { id: "field_111", name: "Loosterweg 1",                       lat: 52.23878, lng: 4.50778 },
  { id: "field_112", name: "Sgravendamseweg 3",                  lat: 52.23975, lng: 4.50336 },
  { id: "field_113", name: "Sgravendamseweg 2",                  lat: 52.24856, lng: 4.48797 },
  { id: "field_114", name: "Sgravendamseweg 1",                  lat: 52.24958, lng: 4.48400 },
  { id: "field_115", name: "Leidsevaart 5",                      lat: 52.23603, lng: 4.48247 },
  { id: "field_116", name: "Leidsevaart 4",                      lat: 52.23481, lng: 4.48072 },
  { id: "field_117", name: "Leidsevaart 3",                      lat: 52.23322, lng: 4.47836 },
  { id: "field_118", name: "Leidsevaart 2",                      lat: 52.23044, lng: 4.47417 },
  { id: "field_119", name: "Leidsevaart 1",                      lat: 52.22378, lng: 4.47331 },
  { id: "field_120", name: "Schippersvaartweg 2",                lat: 52.25717, lng: 4.50942 },
  { id: "field_121", name: "Schippersvaartweg 1",                lat: 52.25903, lng: 4.50467 },
  { id: "field_122", name: "Via Nova 2",                         lat: 52.26033, lng: 4.50508 },
  { id: "field_123", name: "Via Nova 1",                         lat: 52.26586, lng: 4.50281 },
  { id: "field_124", name: "Achterweg 1",                        lat: 52.22056, lng: 4.44403 },
  { id: "field_125", name: "Herenweg NW 3",                      lat: 52.22483, lng: 4.44278 },
  { id: "field_126", name: "Herenweg NW 2",                      lat: 52.21961, lng: 4.43919 },
  { id: "field_127", name: "Herenweg NW 1",                      lat: 52.21678, lng: 4.43864 },
  { id: "field_128", name: "Zwarteweg",                          lat: 52.22086, lng: 4.43739 },
  { id: "field_129", name: "Het Laantje 3",                      lat: 52.22794, lng: 4.42744 },
  { id: "field_130", name: "Het Laantje 2",                      lat: 52.22897, lng: 4.43097 },
  { id: "field_131", name: "Het Laantje 1",                      lat: 52.23100, lng: 4.43508 },
  { id: "field_132", name: "Beeklaan 2 (NW)",                    lat: 52.23414, lng: 4.43714 },
  { id: "field_133", name: "Beeklaan (NW)",                      lat: 52.23633, lng: 4.43508 },
  { id: "field_134", name: "Nieuwe Zeeweg",                      lat: 52.23839, lng: 4.44197 },
  { id: "field_135", name: "Leeweg 6",                           lat: 52.23036, lng: 4.46500 },
  { id: "field_136", name: "Leeweg 5",                           lat: 52.23414, lng: 4.46686 },
  { id: "field_137", name: "Leeweg 4",                           lat: 52.23714, lng: 4.46897 },
  { id: "field_138", name: "Leeweg 3",                           lat: 52.23989, lng: 4.47097 },
  { id: "field_139", name: "Leeweg 2",                           lat: 52.24281, lng: 4.47317 },
  { id: "field_140", name: "Leeweg 1",                           lat: 52.24819, lng: 4.48272 },
  { id: "field_141", name: "Bronsgeesterweg 3",                  lat: 52.23292, lng: 4.46208 },
  { id: "field_142", name: "Bronsgeesterweg 2",                  lat: 52.23664, lng: 4.46544 },
  { id: "field_143", name: "Bronsgeesterweg 1",                  lat: 52.24053, lng: 4.46886 },
  { id: "field_144", name: "Langervelderweg 2",                  lat: 52.27375, lng: 4.49731 },
  { id: "field_145", name: "Langervelderweg",                    lat: 52.27094, lng: 4.49517 },
  { id: "field_146", name: "Duinweg 3",                          lat: 52.26200, lng: 4.45553 },
  { id: "field_147", name: "Duinweg 2",                          lat: 52.25906, lng: 4.45219 },
  { id: "field_148", name: "Duinweg 1",                          lat: 52.25119, lng: 4.44978 },
  { id: "field_149", name: "Northgodreef",                       lat: 52.24886, lng: 4.45131 },
  { id: "field_150", name: "Westeinde 6",                        lat: 52.24975, lng: 4.46558 },
  { id: "field_151", name: "Westeinde 5",                        lat: 52.25128, lng: 4.46806 },
  { id: "field_152", name: "Westeinde 4",                        lat: 52.26053, lng: 4.47794 },
  { id: "field_153", name: "Westeinde 3",                        lat: 52.25906, lng: 4.47500 },
  { id: "field_154", name: "Westeinde 2",                        lat: 52.25861, lng: 4.47228 },
  { id: "field_155", name: "Westeinde 1",                        lat: 52.25367, lng: 4.47275 },
  { id: "field_156", name: "Gooweg 1",                           lat: 52.25453, lng: 4.47994 },
  { id: "field_157", name: "Schulpweg 2",                        lat: 52.26011, lng: 4.48383 },
  { id: "field_158", name: "Schulpweg 1",                        lat: 52.26497, lng: 4.47483 },
  { id: "field_159", name: "Kraaierslaan",                       lat: 52.26958, lng: 4.47469 },
  { id: "field_160", name: "Langervelderlaan",                   lat: 52.28125, lng: 4.48822 },
  { id: "field_161", name: "Vogelaarsdreef 2",                   lat: 52.29325, lng: 4.49806 },
  { id: "field_162", name: "Vogelaarsdreef 1",                   lat: 52.29517, lng: 4.50325 },
  { id: "field_163", name: "Wilgendam 1",                        lat: 52.28531, lng: 4.49978 },
  { id: "field_164", name: "Wilgendam 2",                        lat: 52.29025, lng: 4.49511 },
  { id: "field_165", name: "De Boender 2",                       lat: 52.28878, lng: 4.50081 },
  { id: "field_166", name: "De Boender 1",                       lat: 52.29094, lng: 4.50678 },
  { id: "field_167", name: "Duinschoten 4",                      lat: 52.29092, lng: 4.51292 },
  { id: "field_168", name: "Duinschoten 3",                      lat: 52.28714, lng: 4.50811 },
  { id: "field_169", name: "Duinschoten 2",                      lat: 52.28481, lng: 4.50486 },
  { id: "field_170", name: "Duinschoten 1",                      lat: 52.28233, lng: 4.50047 },
  { id: "field_171", name: "Boekhorsterweg",                     lat: 52.27622, lng: 4.50036 },
  { id: "field_172", name: "Oosterduinen 3",                     lat: 52.27689, lng: 4.51114 },
  { id: "field_173", name: "Oosterduinen 2",                     lat: 52.28144, lng: 4.51528 },
  { id: "field_174", name: "Oosterduinen 1",                     lat: 52.28689, lng: 4.52044 },
];

// ── Haversine afstandsberekening (meters) ────────────────────────────────────

export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lng2 - lng1);
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Betrouwbaarheidsscore (0–1) ──────────────────────────────────────────────

export function calculateReliabilityScore(
  status: Pick<FieldBloomStatus, "timestamp" | "photoUrl" | "confirmedBy">,
): number {
  const ageMs = Date.now() - status.timestamp.getTime();
  const H24 = 24 * 60 * 60 * 1000;
  if (ageMs >= H24) return 0;
  let score = 1 - ageMs / H24;                           // lineair 1.0 → 0.0
  if (status.photoUrl) score += 0.15;                    // bonus foto aanwezig
  score += Math.min(status.confirmedBy * 0.05, 0.30);    // max +0.30
  return Math.min(score, 1);
}

export function getReliabilityLabel(score: number): string {
  if (score < 0.3) return "Onbevestigd";
  if (score <= 0.7) return "Redelijk betrouwbaar";
  return "Betrouwbaar";
}

// Leesbare tijd-geleden string
export function timeAgo(date: Date): string {
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (diffMin < 1) return "zojuist";
  if (diffMin < 60) return `${diffMin} min geleden`;
  const h = Math.floor(diffMin / 60);
  if (h < 24) return `${h} uur geleden`;
  return `${Math.floor(h / 24)} dag geleden`;
}

// Status labels en kleuren
export const STATUS_CONFIG: Record<
  BloomStatusType,
  { emoji: string; label: string; bg: string; text: string; border: string }
> = {
  in_bloom: {
    emoji: "🌷",
    label: "Vol in bloei",
    bg: "#FEF0F3",
    text: "#B5003A",
    border: "#F7A8BF",
  },
  fading: {
    emoji: "🌼",
    label: "Bijna uitgebloeid",
    bg: "#FFFBEA",
    text: "#8A6A00",
    border: "#FFE08A",
  },
  finished: {
    emoji: "🍂",
    label: "Uitgebloeid",
    bg: "#F5F5F5",
    text: "#5A5A5A",
    border: "#D4D4D4",
  },
};

// ── Mock data (10 velden met variatie) ──────────────────────────────────────

function minsAgo(m: number): Date {
  return new Date(Date.now() - m * 60_000);
}

export const MOCK_BLOOM_STATUSES: FieldBloomStatus[] = [
  {
    id: "s001", fieldId: "field_001", userId: "user_1",
    status: "in_bloom",
    photoUrl: "https://images.unsplash.com/photo-1462275646964-a0e3386b89fa?w=400",
    rating: 5, timestamp: minsAgo(23), confirmedBy: 4, reliabilityScore: 0,
  },
  {
    id: "s002", fieldId: "field_018", userId: "user_2",
    status: "fading",
    timestamp: minsAgo(152), confirmedBy: 1, reliabilityScore: 0,
  },
  {
    id: "s003", fieldId: "field_033", userId: "user_3",
    status: "in_bloom",
    timestamp: minsAgo(45), confirmedBy: 0, reliabilityScore: 0,
  },
  {
    id: "s004", fieldId: "field_045", userId: "user_4",
    status: "finished",
    timestamp: minsAgo(18 * 60), confirmedBy: 2, reliabilityScore: 0,
  },
  {
    id: "s005", fieldId: "field_062", userId: "user_5",
    status: "in_bloom",
    photoUrl: "https://images.unsplash.com/photo-1490750967868-88df5691cc96?w=400",
    rating: 4, reviewText: "Prachtig! Veel roze tulpen.",
    timestamp: minsAgo(10), confirmedBy: 6, reliabilityScore: 0,
  },
  {
    id: "s006", fieldId: "field_080", userId: "user_6",
    status: "fading",
    timestamp: minsAgo(5 * 60), confirmedBy: 3, reliabilityScore: 0,
  },
  {
    id: "s007", fieldId: "field_100", userId: "user_7",
    status: "in_bloom",
    timestamp: minsAgo(60), confirmedBy: 2, reliabilityScore: 0,
  },
  {
    id: "s008", fieldId: "field_120", userId: "user_8",
    status: "finished",
    timestamp: minsAgo(8 * 60), confirmedBy: 0, reliabilityScore: 0,
  },
  {
    id: "s009", fieldId: "field_144", userId: "user_9",
    status: "in_bloom",
    timestamp: minsAgo(30), confirmedBy: 1, reliabilityScore: 0,
  },
  {
    id: "s010", fieldId: "field_160", userId: "user_10",
    status: "fading",
    photoUrl: "https://images.unsplash.com/photo-1524863479829-916d8e77f114?w=400",
    rating: 3, timestamp: minsAgo(3 * 60), confirmedBy: 5, reliabilityScore: 0,
  },
];

// Bereken reliabilityScore dynamisch
MOCK_BLOOM_STATUSES.forEach((s) => {
  s.reliabilityScore = calculateReliabilityScore(s);
});
