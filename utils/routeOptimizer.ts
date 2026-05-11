export interface RoutePoint {
  id: string;
  lat: number;
  lng: number;
  type: 'field' | 'attraction' | 'start';
}

function haversineDistance(a: RoutePoint, b: RoutePoint): number {
  const R = 6371000; // meter
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) *
    Math.cos(b.lat * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function totalDistance(route: RoutePoint[]): number {
  let d = 0;
  for (let i = 0; i < route.length - 1; i++) {
    d += haversineDistance(route[i], route[i + 1]);
  }
  return d;
}

function nearestNeighbor(points: RoutePoint[]): RoutePoint[] {
  const [start, ...rest] = points;
  const route = [start];
  const remaining = [...rest];

  while (remaining.length > 0) {
    const last = route[route.length - 1];
    let minDist = Infinity;
    let minIdx = 0;

    remaining.forEach((p, i) => {
      const d = haversineDistance(last, p);
      if (d < minDist) { minDist = d; minIdx = i; }
    });

    route.push(remaining.splice(minIdx, 1)[0]);
  }
  return route;
}

function twoOpt(route: RoutePoint[]): RoutePoint[] {
  if (route.length <= 3) return route;
  let best = [...route];
  let improved = true;

  while (improved) {
    improved = false;
    for (let i = 1; i < best.length - 1; i++) {
      for (let j = i + 1; j < best.length; j++) {
        const candidate = [
          ...best.slice(0, i),
          ...best.slice(i, j + 1).reverse(),
          ...best.slice(j + 1),
        ];
        if (totalDistance(candidate) < totalDistance(best)) {
          best = candidate;
          improved = true;
        }
      }
    }
  }
  return best;
}

export function optimizeRoute(points: RoutePoint[]): RoutePoint[] {
  if (points.length <= 2) return points;
  const nn = nearestNeighbor(points);
  return twoOpt(nn);
}
