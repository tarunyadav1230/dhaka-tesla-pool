/**
 * Dhaka Area Registry
 *
 * A lightweight, predefined geography module for Dhaka Tesla Pool.
 * No map API required. Areas have a fixed lat/lng centroid and a zone ID.
 * Pool-matching uses "compatible zone" rules, not live geocoding.
 *
 * Zone groups (for pickup compatibility):
 *   Zone A: Banani, Gulshan, Mohakhali, Bashundhara
 *   Zone B: Dhanmondi, Farmgate, Motijheel
 *   Zone C: Mirpur, Uttara
 *
 * Pool-matching rule:
 *   Two passengers can share a Tesla if their pickup areas are in the SAME zone
 *   AND their dropoff areas are both reachable in a route that doesn't require
 *   the driver to backtrack more than 1 zone.
 */

export interface Area {
  name: string;
  zone: 'A' | 'B' | 'C';
  lat: number;
  lng: number;
}

export const AREAS: Record<string, Area> = {
  Banani: { name: 'Banani', zone: 'A', lat: 23.7937, lng: 90.4066 },
  Gulshan: { name: 'Gulshan', zone: 'A', lat: 23.7808, lng: 90.4142 },
  Mohakhali: { name: 'Mohakhali', zone: 'A', lat: 23.7780, lng: 90.4005 },
  Bashundhara: { name: 'Bashundhara', zone: 'A', lat: 23.8041, lng: 90.4264 },
  Dhanmondi: { name: 'Dhanmondi', zone: 'B', lat: 23.7461, lng: 90.3742 },
  Farmgate: { name: 'Farmgate', zone: 'B', lat: 23.7588, lng: 90.3877 },
  Motijheel: { name: 'Motijheel', zone: 'B', lat: 23.7232, lng: 90.4185 },
  Mirpur: { name: 'Mirpur', zone: 'C', lat: 23.8223, lng: 90.3654 },
  Uttara: { name: 'Uttara', zone: 'C', lat: 23.8759, lng: 90.3795 },
};

export const AREA_NAMES = Object.keys(AREAS);

/**
 * Haversine distance between two lat/lng points, in kilometres.
 */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Distance between two named areas in km.
 */
export function distanceBetweenAreas(from: string, to: string): number {
  const a = AREAS[from];
  const b = AREAS[to];
  if (!a || !b) throw new Error(`Unknown area: ${!a ? from : to}`);
  return haversineKm(a.lat, a.lng, b.lat, b.lng);
}

/**
 * Pool-matching compatibility check.
 *
 * Two ride requests are pool-compatible if:
 *   1. Their pickup areas are in the SAME zone.
 *   2. Their dropoff areas are either in the same zone, or adjacent zones —
 *      meaning the driver doesn't need to backtrack across two zone boundaries.
 *
 * This covers Nusrat (Banani→Mohakhali, both Zone A) and
 * Rafiq (Banani→Gulshan, both Zone A): ✅ compatible.
 */
export function areRoutesCompatible(
  pickupArea1: string,
  dropoffArea1: string,
  pickupArea2: string,
  dropoffArea2: string
): boolean {
  const p1 = AREAS[pickupArea1];
  const p2 = AREAS[pickupArea2];
  const d1 = AREAS[dropoffArea1];
  const d2 = AREAS[dropoffArea2];

  if (!p1 || !p2 || !d1 || !d2) return false;

  // Rule 1: pickups must be in the same zone
  if (p1.zone !== p2.zone) return false;

  // Rule 2: dropoffs must be in the same or adjacent zone
  const zoneOrder: Record<string, number> = { A: 0, B: 1, C: 2 };
  const dropoffZoneDiff = Math.abs(zoneOrder[d1.zone] - zoneOrder[d2.zone]);
  return dropoffZoneDiff <= 1;
}

export function getArea(name: string): Area {
  const area = AREAS[name];
  if (!area) throw new Error(`Unknown area: "${name}". Valid areas: ${AREA_NAMES.join(', ')}`);
  return area;
}
