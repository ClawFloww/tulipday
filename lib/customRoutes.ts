// Opgeslagen eigen routes (localStorage) — geen account vereist

const STORAGE_KEY = "tulipday_custom_routes";

export interface CustomRoute {
  id: string;
  name: string;
  waypoints: [number, number][];  // [lng, lat]
  createdAt: string;              // ISO date string
  cycling: { duration: number; distance: number } | null;
  walking: { duration: number; distance: number } | null;
  driving: { duration: number; distance: number } | null;
  shareId?: string;               // share_id in Supabase na delen
}

export function getCustomRoutes(): CustomRoute[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CustomRoute[]) : [];
  } catch {
    return [];
  }
}

export function saveCustomRoute(
  data: Omit<CustomRoute, "id" | "createdAt">,
): CustomRoute {
  const routes = getCustomRoutes();
  const newRoute: CustomRoute = {
    ...data,
    id:        crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  routes.unshift(newRoute);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(routes));
  return newRoute;
}

export function deleteCustomRoute(id: string): void {
  const routes = getCustomRoutes().filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(routes));
}

export function updateCustomRoute(id: string, updates: Partial<CustomRoute>): void {
  const routes = getCustomRoutes().map((r) => r.id === id ? { ...r, ...updates } : r);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(routes));
}
