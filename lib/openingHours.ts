export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
// ["HH:MM", "HH:MM"] = open, null = gesloten die dag
export type DaySchedule = [string, string] | null;
export type OpeningHours = Partial<Record<DayKey, DaySchedule>>;

const DAY_ORDER: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/** Geeft true (open), false (gesloten), of null (geen data) */
export function isCurrentlyOpen(hours: OpeningHours | null | undefined): boolean | null {
  if (!hours) return null;
  const now   = new Date();
  const key   = DAY_ORDER[now.getDay()];
  const sched = hours[key];
  if (sched === undefined) return null;   // dag niet ingevuld
  if (sched === null)      return false;  // bewust gesloten
  const [openStr, closeStr] = sched;
  const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const cur = now.getHours() * 60 + now.getMinutes();
  return cur >= toMin(openStr) && cur < toMin(closeStr);
}

/** Geordende rij met alle dagschemas voor weergave */
export function getWeekSchedule(hours: OpeningHours): { key: DayKey; schedule: DaySchedule }[] {
  const keys: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  return keys.map((key) => ({ key, schedule: hours[key] ?? null }));
}
