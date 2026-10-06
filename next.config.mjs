import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const isMobile = process.env.BUILD_TARGET === "mobile";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export alleen voor Capacitor (iOS/Android)
  // Web (Vercel) gebruikt server rendering zodat Server Actions werken
  ...(isMobile ? { output: "export", trailingSlash: true } : {}),

  // Laat client-code weten of dit de app-build is (zie lib/links.ts)
  env: { NEXT_PUBLIC_BUILD_TARGET: isMobile ? "mobile" : "web" },

  images: {
    unoptimized: isMobile, // Capacitor heeft geen image optimizer
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.unsplash.com" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "maps.googleapis.com" },
    ],
  },
};

export default withNextIntl(nextConfig);
