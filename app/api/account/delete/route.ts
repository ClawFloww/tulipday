import { NextRequest, NextResponse } from "next/server";
import { corsPreflight, withCors } from "@/lib/cors";
import { createAdminClient } from "@/lib/supabase-admin";
import { bearerToken, getUserFromToken } from "@/lib/supabase-server-auth";

// Account verwijderen (verplicht door Apple). Opgeslagen items en premium-rechten
// verdwijnen via on delete cascade; geüploade foto's blijven anoniem staan.

export async function POST(req: NextRequest) {
  const sb = createAdminClient();
  const user = await getUserFromToken(sb, bearerToken(req));
  if (!user) return withCors(req, NextResponse.json({ error: "Not signed in" }, { status: 401 }));

  const { error } = await sb.auth.admin.deleteUser(user.id);
  if (error) return withCors(req, NextResponse.json({ error: error.message }, { status: 500 }));

  return withCors(req, NextResponse.json({ deleted: true }));
}

export function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}
