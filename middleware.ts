import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";

const handleI18nRouting = createMiddleware({
  locales: ["en", "nl"],
  defaultLocale: "nl",
});

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip locale routing for splash and onboarding
  if (
    pathname === "/" ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/home") ||
    pathname.startsWith("/map") ||
    pathname.startsWith("/location") ||
    pathname.startsWith("/routes") ||
    pathname.startsWith("/saved") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/admin")
  ) {
    return NextResponse.next();
  }

  return handleI18nRouting(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)", "/"],
};
