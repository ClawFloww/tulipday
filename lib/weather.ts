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
  walkingScore: number;   // 0–100
  walkingLabel: string;
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

export type WeatherCondition =
  | "clear" | "mostly_clear" | "partly_cloudy" | "cloudy" | "fog"
  | "drizzle" | "rain" | "snow" | "showers" | "thunder";

/** WMO-weercode → weertype (vertaling: weather.condition_<type>, icoon: WeatherIcon). */
export function weatherCondition(code: number): WeatherCondition {
  if (code === 0) return "clear";
  if (code === 1) return "mostly_clear";
  if (code === 2) return "partly_cloudy";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if (code >= 61 && code <= 67) return "rain";
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 80 && code <= 86) return "showers";
  if (code >= 95) return "thunder";
  return "cloudy";
}

export type ScoreBand = "perfect" | "good" | "fair" | "moderate" | "poor";

/** Fiets-/wandelscore → band (vertaling: weather.cycling_<band> / weather.walking_<band>). */
export function scoreBand(score: number): ScoreBand {
  if (score >= 80) return "perfect";
  if (score >= 60) return "good";
  if (score >= 40) return "fair";
  if (score >= 20) return "moderate";
  return "poor";
}

/** Kleur van een score als CSS-variabele (werkt in licht en donker). */
export function scoreColor(score: number): string {
  if (score >= 70) return "var(--color-success)";
  if (score >= 40) return "var(--color-warning)";
  return "var(--color-danger)";
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

// Max toegestane score op basis van weercode
function weathercodeCap(code: number): number {
  if (code <= 1)                                         return 100; // Helder → geen beperking
  if (code === 2)                                        return 90;  // Gedeeltelijk bewolkt → max 90
  if (code === 3)                                        return 82;  // Volledig bewolkt → max "Goed", niet "Perfect"
  if (code === 45 || code === 48)                        return 70;  // Mist
  if (code === 51 || code === 53)                        return 55;  // Lichte/matige motregen → max "Redelijk"
  if (code === 55 || code === 61 || code === 80 ||
      code === 81)                                       return 45;  // Zware motregen / lichte regen / buien
  if (code === 63 || code === 82)                        return 30;  // Matige regen / zware buien
  return 15;                                                         // Zware regen / sneeuw / onweer
}

export function calcCyclingScore(
  temp: number,
  wind: number,
  rain: number,
  code: number,
): number {
  const raw = Math.round(
    tempScore(temp)          * 0.30 +
    windScore(wind)          * 0.35 +
    rainScore(rain)          * 0.25 +
    weathercodeScore(code)   * 0.10,
  );
  return Math.min(raw, weathercodeCap(code));
}

export function cyclingScoreLabel(score: number): string {
  if (score >= 80) return "Perfecte fietsdag 🚴";
  if (score >= 60) return "Goed fietsweer";
  if (score >= 40) return "Redelijk fietsweer";
  if (score >= 20) return "Matig fietsweer";
  return "Slechte fietsdag";
}

// Wandelen: wind weegt minder zwaar, regen weegt zwaarder
export function calcWalkingScore(
  temp: number,
  wind: number,
  rain: number,
  code: number,
): number {
  const raw = Math.round(
    tempScore(temp)        * 0.35 +
    windScore(wind)        * 0.15 +
    rainScore(rain)        * 0.40 +
    weathercodeScore(code) * 0.10,
  );
  return Math.min(raw, weathercodeCap(code));
}

export function walkingScoreLabel(score: number): string {
  if (score >= 80) return "Perfecte wandeldag 🚶";
  if (score >= 60) return "Goed wandelweer";
  if (score >= 40) return "Redelijk wandelweer";
  if (score >= 20) return "Matig wandelweer";
  return "Slechte wandeldag";
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

  const currentScore  = calcCyclingScore(
    c.temperature_2m,
    c.windspeed_10m,
    c.precipitation,
    c.weathercode,
  );
  const currentWalkScore = calcWalkingScore(
    c.temperature_2m,
    c.windspeed_10m,
    c.precipitation,
    c.weathercode,
  );

  const current: CurrentWeather = {
    temperature:   c.temperature_2m,
    windspeed:     c.windspeed_10m,
    winddirection: c.winddirection_10m,
    precipitation: c.precipitation,
    weathercode:   c.weathercode,
    cyclingScore:  currentScore,
    cyclingLabel:  cyclingScoreLabel(currentScore),
    walkingScore:  currentWalkScore,
    walkingLabel:  walkingScoreLabel(currentWalkScore),
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
