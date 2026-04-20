// Weer-utilities voor TulipDay — Open-Meteo API + fietsweer-score berekening

// ── Data-modellen ─────────────────────────────────────────────────────────────

export interface CurrentWeather {
  temperature: number;    // °C
  windspeed: number;      // km/u
  winddirection: number;  // graden
  precipitation: number;  // mm
  weathercode: number;    // WMO code
  cyclingScore: number;   // 0–100
  cyclingLabel: string;
}

export interface DailyForecast {
  date: string;             // "2024-04-15"
  dayName: string;          // "Ma", "Di", etc.
  tempMax: number;
  tempMin: number;
  precipitationSum: number;
  windspeedMax: number;
  weathercode: number;
  cyclingScore: number;
  isBestDay: boolean;
}

export interface WeatherState {
  current: CurrentWeather | null;
  daily: DailyForecast[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

// ── WMO Weercodes ─────────────────────────────────────────────────────────────

export const WEATHER_ICONS: Record<number, string> = {
  0:  "☀️",
  1:  "🌤️",
  2:  "⛅",
  3:  "☁️",
  45: "🌫️",
  48: "🌫️",
  51: "🌦️",
  53: "🌦️",
  55: "🌧️",
  61: "🌧️",
  63: "🌧️",
  65: "🌧️",
  71: "🌨️",
  73: "🌨️",
  75: "🌨️",
  77: "🌨️",
  80: "🌦️",
  81: "🌦️",
  82: "🌧️",
  85: "🌨️",
  86: "🌨️",
  95: "⛈️",
  96: "⛈️",
  99: "⛈️",
};

export const WEATHER_LABELS: Record<number, string> = {
  0:  "Helder",
  1:  "Overwegend helder",
  2:  "Gedeeltelijk bewolkt",
  3:  "Bewolkt",
  45: "Mist",
  48: "IJsmist",
  51: "Lichte motregen",
  53: "Motregen",
  55: "Zware motregen",
  61: "Lichte regen",
  63: "Matige regen",
  65: "Zware regen",
  71: "Lichte sneeuw",
  73: "Matige sneeuw",
  75: "Zware sneeuw",
  77: "Sneeuwkorrels",
  80: "Regenbuien",
  81: "Matige buien",
  82: "Zware buien",
  85: "Sneeuwbuien",
  86: "Zware sneeuwbuien",
  95: "Onweer",
  96: "Onweer met hagel",
  99: "Zwaar onweer",
};

export function weatherIcon(code: number): string {
  if (code in WEATHER_ICONS) return WEATHER_ICONS[code];
  if (code < 10)  return "🌤️";
  if (code < 50)  return "☁️";
  if (code < 70)  return "🌧️";
  if (code < 80)  return "🌨️";
  if (code < 90)  return "🌦️";
  return "⛈️";
}

export function weatherLabel(code: number): string {
  return WEATHER_LABELS[code] ?? "Onbekend";
}

// ── Windrichting ──────────────────────────────────────────────────────────────

export function windDirectionLabel(deg: number): string {
  const dirs = ["N", "NO", "O", "ZO", "Z", "ZW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

// ── Fietsweer-score berekening ────────────────────────────────────────────────

function tempScore(t: number): number {
  if (t < 5)   return 10;
  if (t < 10)  return 40;
  if (t < 15)  return 70;
  if (t <= 22) return 100;
  if (t <= 28) return 75;
  return 50;
}

function windScore(w: number): number {
  if (w < 10) return 100;
  if (w < 20) return 80;
  if (w < 30) return 55;
  if (w < 40) return 30;
  return 10;
}

function rainScore(r: number): number {
  if (r === 0) return 100;
  if (r < 1)   return 60;
  if (r <= 3)  return 25;
  return 0;
}

function weathercodeScore(code: number): number {
  if (code <= 1)                                         return 100; // Helder
  if (code <= 3 || code === 45 || code === 48)           return 75;  // Bewolkt/mist
  if (code === 51 || code === 53 || code === 61 ||
      code === 80 || code === 81)                        return 40;  // Lichte regen
  return 10;                                                         // Zware regen/sneeuw/onweer
}

export function calcCyclingScore(
  temp: number,
  wind: number,
  rain: number,
  code: number,
): number {
  return Math.round(
    tempScore(temp)          * 0.30 +
    windScore(wind)          * 0.35 +
    rainScore(rain)          * 0.25 +
    weathercodeScore(code)   * 0.10,
  );
}

export function cyclingScoreLabel(score: number): string {
  if (score >= 80) return "Perfecte fietsdag 🚴";
  if (score >= 60) return "Goed fietsweer";
  if (score >= 40) return "Redelijk fietsweer";
  if (score >= 20) return "Matig fietsweer";
  return "Slechte fietsdag";
}

export function cyclingScoreColor(score: number): string {
  if (score >= 70) return "#2D7D46";
  if (score >= 40) return "#E8A020";
  return "#D94040";
}

// ── API-response verwerking ───────────────────────────────────────────────────

function getDayName(dateStr: string, isToday: boolean): string {
  if (isToday) return "Vandaag";
  // "2024-04-15" → Date op middag om tijdzone-edge-cases te vermijden
  const date = new Date(`${dateStr}T12:00:00`);
  const raw  = date.toLocaleDateString("nl-NL", { weekday: "short" }); // "ma.", "di.", etc.
  const clean = raw.replace(".", "");
  return clean.charAt(0).toUpperCase() + clean.slice(1); // "Ma"
}

// Type voor de ruwe API-respons
interface OpenMeteoResponse {
  current: {
    temperature_2m:    number;
    windspeed_10m:     number;
    winddirection_10m: number;
    precipitation:     number;
    weathercode:       number;
  };
  daily: {
    time:                 string[];
    temperature_2m_max:   number[];
    temperature_2m_min:   number[];
    precipitation_sum:    number[];
    windspeed_10m_max:    number[];
    weathercode:          number[];
  };
}

export function parseOpenMeteo(
  data: unknown,
): { current: CurrentWeather; daily: DailyForecast[] } {
  const d = data as OpenMeteoResponse;
  const c = d.current;

  const currentScore = calcCyclingScore(
    c.temperature_2m,
    c.windspeed_10m,
    c.precipitation,
    c.weathercode,
  );

  const current: CurrentWeather = {
    temperature:  c.temperature_2m,
    windspeed:    c.windspeed_10m,
    winddirection: c.winddirection_10m,
    precipitation: c.precipitation,
    weathercode:  c.weathercode,
    cyclingScore: currentScore,
    cyclingLabel: cyclingScoreLabel(currentScore),
  };

  const scores = d.daily.time.map((_, i) => {
    const avgTemp = (d.daily.temperature_2m_max[i] + d.daily.temperature_2m_min[i]) / 2;
    return calcCyclingScore(
      avgTemp,
      d.daily.windspeed_10m_max[i],
      d.daily.precipitation_sum[i],
      d.daily.weathercode[i],
    );
  });

  const maxScore = Math.max(...scores);
  // Markeer de eerste dag met de hoogste score als "beste dag"
  const bestIdx  = scores.indexOf(maxScore);

  const today = d.daily.time[0];

  const daily: DailyForecast[] = d.daily.time.map((date, i) => ({
    date,
    dayName:          getDayName(date, date === today),
    tempMax:          d.daily.temperature_2m_max[i],
    tempMin:          d.daily.temperature_2m_min[i],
    precipitationSum: d.daily.precipitation_sum[i],
    windspeedMax:     d.daily.windspeed_10m_max[i],
    weathercode:      d.daily.weathercode[i],
    cyclingScore:     scores[i],
    isBestDay:        i === bestIdx,
  }));

  return { current, daily };
}
