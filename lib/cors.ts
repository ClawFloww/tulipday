import { NextRequest, NextResponse } from "next/server";

// Origins van de Capacitor-app: iOS (capacitor://) en Android (androidScheme https).
const APP_ORIGINS = ["capacitor://localhost", "https://localhost"];

/** Voeg CORS-headers toe als het verzoek uit de app komt. */
export function withCors(req: NextRequest, res: NextResponse): NextResponse {
  const origin = req.headers.get("origin");
  if (origin && APP_ORIGINS.includes(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Vary", "Origin");
  }
  return res;
}

/** Antwoord op de preflight die de app stuurt vóór JSON-verzoeken. */
export function corsPreflight(req: NextRequest): NextResponse {
  const res = withCors(req, new NextResponse(null, { status: 204 }));
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  res.headers.set("Access-Control-Max-Age", "86400");
  return res;
}
