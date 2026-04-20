import { BottomNavigation } from "@/components/BottomNavigation";
import { PageTransition } from "@/components/ui/PageTransition";

export function generateStaticParams() {
  return ["en", "nl", "de", "fr", "zh", "es"].map((locale) => ({ locale }));
}

export default function LocaleLayout({
  children,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  return (
    <>
      {/* PageTransition herkeyert bij elke routewisseling → fade-in animatie */}
      <PageTransition>{children}</PageTransition>
      <BottomNavigation />
    </>
  );
}
