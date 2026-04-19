import { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import RouteDetailClient from "./RouteDetailClient";

export function generateStaticParams() {
  return [{ slug: "_" }];
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string; locale: string }> }
): Promise<Metadata> {
  const { slug, locale } = await params;
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data } = await sb
    .from("routes")
    .select("title, description, cover_image_url, distance_km, duration_minutes")
    .eq("slug", slug)
    .single();

  if (!data) return { title: "TulipDay Routes" };

  const title       = `${data.title} · TulipDay`;
  const description = data.description ?? `Ontdek de ${data.title} route door de Bollenstreek.`;
  const image       = data.cover_image_url ?? "https://tulipday.online/og-default.jpg";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images:   [{ url: image, width: 1200, height: 630, alt: data.title }],
      locale:   locale === "nl" ? "nl_NL" : "en_US",
      type:     "website",
      siteName: "TulipDay",
    },
    twitter: {
      card:        "summary_large_image",
      title,
      description,
      images:      [image],
    },
  };
}

export default function Page() {
  return <RouteDetailClient />;
}
