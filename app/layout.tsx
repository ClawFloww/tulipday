import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n-context";

// Display font: Plus Jakarta Sans alleen voor grote titels
const playfair = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

// Body font: Inter voor tekst, labels en cijfers (tabular-nums via .font-mono)
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://tulipday.online"),
  title: "TulipDay",
  description: "Ontdek de mooiste tulpenvelden bij jou in de buurt.",
};

// viewport-fit=cover: inhoud loopt door tot onder notch en home-indicator,
// zodat env(safe-area-inset-*) in de iOS-app echte waarden geeft.
export const viewport: Viewport = {
  width:        "device-width",
  initialScale: 1,
  viewportFit:  "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAF7" },
    { media: "(prefers-color-scheme: dark)",  color: "#0F0F0E" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning: de .dark klasse wordt client-side gezet via het anti-FOUC script
    <html suppressHydrationWarning>
      <head>
        {/*
          Anti-FOUC script — wordt synchroon uitgevoerd vóór de eerste render.
          Leest de opgeslagen thema-voorkeur en zet de .dark klasse direct op <html>
          zodat de pagina nooit oplicht in het verkeerde thema.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('tulipday_theme')||'system';var dark=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',dark);document.documentElement.classList.toggle('light',!dark);}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${playfair.variable} ${inter.variable} font-sans antialiased`}
      >
        <I18nProvider>{children}</I18nProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
