// Interne paden, API-adressen en deel-URL's.
//
// De Capacitor-app is een statische export zonder server: er bestaat per
// detailpagina alleen een plaatshouder (`/nl/location/_/`). In de app gaat de
// slug daarom als query mee; op het web blijven de nette URL's (SEO, previews).

export const IS_NATIVE_BUILD = process.env.NEXT_PUBLIC_BUILD_TARGET === "mobile";

/** Publieke website — doel voor API-aanroepen vanuit de app en voor deellinks. */
export const SITE_URL = "https://tulipday.online";

/** Plaatshouder-segment dat generateStaticParams voor de app aanmaakt. */
export const STATIC_PLACEHOLDER = "_";

function detailPath(locale: string, section: string, key: string, value: string): string {
  return IS_NATIVE_BUILD
    ? `/${locale}/${section}/${STATIC_PLACEHOLDER}/?${key}=${encodeURIComponent(value)}`
    : `/${locale}/${section}/${value}`;
}

export const locationPath = (locale: string, slug: string) =>
  detailPath(locale, "location", "slug", slug);

export const routePath = (locale: string, slug: string) =>
  detailPath(locale, "routes", "slug", slug);

export const sharedRoutePath = (locale: string, shareId: string) =>
  detailPath(locale, "route/custom", "shareId", shareId);

/** Echte waarde van een dynamisch segment: in de app staat die in de query. */
export function resolveParam(
  param: string | undefined,
  searchParams: URLSearchParams | null,
  key: string,
): string | undefined {
  if (param && param !== STATIC_PLACEHOLDER) return param;
  return searchParams?.get(key) ?? undefined;
}

/** In de app bestaan geen API-routes lokaal; die draaien op de website. */
export const apiUrl = (path: string) => (IS_NATIVE_BUILD ? `${SITE_URL}${path}` : path);

/** Deellinks wijzen altijd naar de website, ook vanuit de app. */
export const publicUrl = (path: string) => `${SITE_URL}${path}`;
