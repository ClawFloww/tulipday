export function generateStaticParams() {
  return ["en", "nl", "de", "fr", "zh", "es"].map((locale) => ({ locale }));
}

export default function LocaleLayout({
  children,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  return <>{children}</>;
}
