import { NextRequest } from "next/server";
import { SupabaseClient, User } from "@supabase/supabase-js";

// Server-only helpers voor API-routes die namens een ingelogde gebruiker werken.

/** Leest `Authorization: Bearer <token>` uit het verzoek. */
export function bearerToken(req: NextRequest): string | null {
  return req.headers.get("authorization")?.replace(/^Bearer /, "") || null;
}

/** Gebruiker bij een access token, of null als het token ongeldig/verlopen is. */
export async function getUserFromToken(sb: SupabaseClient, token: string | null | undefined): Promise<User | null> {
  if (!token) return null;
  const { data: { user } } = await sb.auth.getUser(token);
  return user ?? null;
}
