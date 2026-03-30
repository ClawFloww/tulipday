import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";

const handleI18nRouting = createMiddleware({
  locales: ["en", "nl", "de", "fr", "zh", "es"],
  defaultLocale: "nl",
});

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip locale routing for splash screen and admin
  if (pathname === "/" || pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  return handleI18nRouting(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)", "/"],
};
