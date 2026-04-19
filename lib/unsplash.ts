export interface UnsplashPhoto {
  id: string;
  url: string;
  thumbUrl: string;
  altDescription: string;
  photographerName: string;
  photographerLink: string;
  photoLink: string;
}

interface UnsplashApiPhoto {
  id: string;
  urls: { regular: string; small: string };
  alt_description: string | null;
  user: { name: string; links: { html: string } };
  links: { html: string };
}

interface UnsplashSearchResponse {
  results: UnsplashApiPhoto[];
}

export async function fetchUnsplashPhotos(
  query: string,
  count: number,
): Promise<UnsplashPhoto[]> {
  const key = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
  if (!key) return [];

  try {
    const params = new URLSearchParams({
      query,
      per_page: String(count),
      orientation: "landscape",
      client_id: key,
    });

    const res = await fetch(
      `https://api.unsplash.com/search/photos?${params.toString()}`,
      { next: { revalidate: 3600 } },
    );

    if (!res.ok) return [];

    const data: UnsplashSearchResponse = await res.json();

    return data.results.map((p) => ({
      id: p.id,
      url: p.urls.regular,
      thumbUrl: p.urls.small,
      altDescription: p.alt_description ?? "",
      photographerName: p.user.name,
      photographerLink: p.user.links.html,
      photoLink: p.links.html,
    }));
  } catch {
    return [];
  }
}
