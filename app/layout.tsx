import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter, Inter_Tight } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n-context";

// Display font: Plus Jakarta Sans voor titels en headers — modern, helder en leesbaar
const playfair = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

// Body font: Inter voor lopende tekst en UI-labels
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

// Mono/stats font: Inter Tight voor getallen, afstanden en statistieken
const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://tulipday.nl"),
  title: "TulipDay",
  description: "Ontdek de mooiste tulpenvelden bij jou in de buurt.",
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
        className={`${playfair.variable} ${inter.variable} ${interTight.variable} font-sans antialiased`}
      >
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
