import { NextRequest, NextResponse } from "next/server";
import { corsPreflight, withCors } from "@/lib/cors";
import { createAdminClient } from "@/lib/supabase-admin";
import { bearerToken, getUserFromToken } from "@/lib/supabase-server-auth";

// Na inloggen: zet de gegevens van het anonieme account op dit apparaat over
// naar het echte account en verwijder het anonieme account.
// Authorization = token van het echte account, body.anonToken = token van het anonieme.

export async function POST(req: NextRequest) {
  const sb = createAdminClient();
  const user = await getUserFromToken(sb, bearerToken(req));
  if (!user || user.is_anonymous) {
    return withCors(req, NextResponse.json({ error: "Not signed in" }, { status: 401 }));
  }

  const { anonToken } = await req.json().catch(() => ({ anonToken: null }));
  const anon = await getUserFromToken(sb, anonToken);
  // Alleen anonieme accounts mogen worden opgeheven; een echt account nooit
  if (!anon || !anon.is_anonymous || anon.id === user.id) {
    return withCors(req, NextResponse.json({ merged: false }));
  }

  const { error } = await sb.rpc("merge_anonymous_user", { p_from: anon.id, p_to: user.id });
  if (error) return withCors(req, NextResponse.json({ error: error.message }, { status: 500 }));

  await sb.auth.admin.deleteUser(anon.id);
  return withCors(req, NextResponse.json({ merged: true }));
}

export function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}
