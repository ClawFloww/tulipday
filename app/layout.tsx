import type { Metadata } from "next";
import { Playfair_Display, Inter, Inter_Tight } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n-context";

// Display font: Playfair Display voor titels en headers — geeft een premium, seizoensgebonden gevoel
const playfair = Playfair_Display({
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
  title: "TulipDay",
  description: "Ontdek de mooiste tulpenvelden bij jou in de buurt.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body
        className={`${playfair.variable} ${inter.variable} ${interTight.variable} font-sans antialiased`}
      >
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
