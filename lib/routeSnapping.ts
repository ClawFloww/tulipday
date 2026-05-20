// Snap GPS-positie aan een route-polyline. Gebruikt voor de blauwe gebruiker-
// dot in de navigatie: zolang je dichtbij de route bent (binnen SNAP_THRESHOLD)
// wordt de positie naar de dichtstbijzijnde punt op de route getrokken én de
// koers afgeleid van de route-richting. Dat geeft een stabielere ervaring dan
// rauwe GPS-coördinaten, vooral bij langzaam fietsen of stilstand waar de
// hardware-heading onbetrouwbaar wordt.
//
// Werkt zonder externe API — alle berekening lokaal in de browser. Voor
// kleine afstanden (< 1 km segmenten) is de equirectangulaire benadering
// nauwkeurig genoeg.

const EARTH_R = 6371000; // meters

function toRad(deg: number) { return deg * Math.PI / 180; }
function toDeg(rad: number) { return rad * 180 / Math.PI; }

export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.sqrt(a));
}

export interface SnapResult {
  lat:        number;
  lng:        number;
  distance:   number;  // meters van origineel naar snap
  segmentIdx: number;  // index van het segment in de polyline
  heading:    number;  // 0-360 graden (0 = noord, 90 = oost)
}

/**
 * Vindt het dichtstbijzijnde punt op een polyline en de richting van het
 * segment op dat punt. Geeft null als de polyline minder dan 2 punten heeft.
 *
 * @param lat       Originele GPS-latitude
 * @param lng       Originele GPS-longitude
 * @param geometry  Array van [lng, lat] paren (MapLibre conventie)
 */
export function snapToPolyline(
  lat: number,
  lng: number,
  geometry: [number, number][],
): SnapResult | null {
  if (geometry.length < 2) return null;

  let bestDistance = Infinity;
  let bestIdx      = 0;
  let bestLat      = lat;
  let bestLng      = lng;

  for (let i = 0; i < geometry.length - 1; i++) {
    const [aLng, aLat] = geometry[i];
    const [bLng, bLat] = geometry[i + 1];

    // Cartesische projectie via equirectangulaire benadering. Voor segmenten
    // van enkele meters tot een paar km bij Nederlandse breedtes klopt dit
    // tot op centimeters — ruim voldoende voor GPS-precisie.
    const meanLat = (aLat + bLat) / 2;
    const cosLat  = Math.cos(toRad(meanLat));

    const ax = aLng * cosLat, ay = aLat;
    const bx = bLng * cosLat, by = bLat;
    const px = lng  * cosLat, py = lat;

    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;

    // Projecteer P op AB; clamp t aan [0,1] zodat we niet voorbij de segmentuiteindes snappen
    let t = lenSq === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const snappedLng = (ax + t * dx) / cosLat;
    const snappedLat = ay + t * dy;

    const distance = haversineMeters(lat, lng, snappedLat, snappedLng);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIdx      = i;
      bestLat      = snappedLat;
      bestLng      = snappedLng;
    }
  }

  // Heading uit het richtingsvector van het beste segment.
  // atan2(dx, dy) want compass-bearing: noord = 0, oost = 90.
  const [aLng, aLat] = geometry[bestIdx];
  const [bLng, bLat] = geometry[bestIdx + 1];
  const meanLat2 = (aLat + bLat) / 2;
  const dLngScaled = (bLng - aLng) * Math.cos(toRad(meanLat2));
  const dLat       = bLat - aLat;
  let heading = toDeg(Math.atan2(dLngScaled, dLat));
  if (heading < 0) heading += 360;

  return {
    lat:        bestLat,
    lng:        bestLng,
    distance:   bestDistance,
    segmentIdx: bestIdx,
    heading,
  };
}
