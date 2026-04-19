/**
 * Lightweight privacy-respecting analytics.
 * Stores anonymous events in Supabase — no PII, session-UUID only.
 * All calls are fire-and-forget; errors are silently swallowed.
 */

import { supabase } from "@/lib/supabase";
import { getOrCreateSessionId } from "@/lib/session";

export type EventName =
  | "location_view"        // swipe card shown / detail page opened
  | "location_detail"      // detail page fully loaded
  | "swipe_right"          // card swiped right / visit button
  | "swipe_left"           // card swiped left / skip button
  | "share"                // share button tapped
  | "save"                 // save/unsave toggled
  | "photo_upload"         // photo upload completed
  | "navigate"             // navigate to maps tapped
  | "filter_applied";      // discover filter chip selected

export type EventProperties = Record<string, string | number | boolean | null>;

const queue: Array<{ event_name: EventName; properties: EventProperties }> = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(flush, 2000);
}

async function flush() {
  flushTimer = null;
  if (queue.length === 0) return;
  const events = queue.splice(0);
  const sessionId = getOrCreateSessionId();
  const rows = events.map((e) => ({
    session_id: sessionId,
    event_name: e.event_name,
    properties: e.properties,
  }));
  // Fire and forget — don't await so callers are never blocked
  supabase.from("page_events").insert(rows).then(() => {});
}

export function track(event: EventName, properties: EventProperties = {}): void {
  queue.push({ event_name: event, properties });
  scheduleFlush();
}
