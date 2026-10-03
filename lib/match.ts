// Evaluasi kecocokan properti terhadap semua SavedSearch.
// Dipakai oleh POST /api/properties (listing baru) dan seed.

import { PrismaClient } from "@prisma/client";
import { haversineKm, pointInPolygon, parseStringArray } from "./geo";

type AnyPrisma = PrismaClient;

function parsePolygon(json: string | null): number[][] | null {
  if (!json) return null;
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? (v as number[][]) : null;
  } catch {
    return null;
  }
}

/** true bila properti cocok dengan kriteria satu SavedSearch. */
export function propertyMatchesSearch(
  property: { price: number; type: string; lat: number; lng: number; facilities: string },
  search: {
    centerLat: number | null; centerLng: number | null; radiusKm: number | null;
    polygonJson: string | null; minPrice: number | null; maxPrice: number | null;
    types: string; facilities: string;
  }
): boolean {
  if (search.minPrice != null && property.price < search.minPrice) return false;
  if (search.maxPrice != null && property.price > search.maxPrice) return false;
  const types = parseStringArray(search.types);
  if (types.length > 0 && !types.includes(property.type)) return false;
  const reqFac = parseStringArray(search.facilities);
  if (reqFac.length > 0) {
    const have = parseStringArray(property.facilities);
    if (!reqFac.every((f) => have.includes(f))) return false;
  }
  const hasRadius =
    search.centerLat != null && search.centerLng != null && search.radiusKm != null;
  const polygon = parsePolygon(search.polygonJson);
  if (hasRadius || polygon) {
    let geoOk = false;
    if (hasRadius) {
      const d = haversineKm(
        { lat: property.lat, lng: property.lng },
        { lat: search.centerLat as number, lng: search.centerLng as number }
      );
      if (d <= (search.radiusKm as number)) geoOk = true;
    }
    if (!geoOk && polygon) {
      if (pointInPolygon([property.lng, property.lat], polygon)) geoOk = true;
    }
    if (!geoOk) return false;
  }
  return true;
}

/**
 * Evaluasi satu properti terhadap SEMUA saved search; buat MatchNotification
 * untuk yang cocok. Idempoten (skip bila sudah ada).
 * Mengembalikan jumlah notifikasi baru yang dibuat.
 */
export async function evaluateMatchesForProperty(
  prisma: AnyPrisma,
  propertyId: number
): Promise<number> {
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property || property.status !== "active") return 0;
  const searches = await prisma.savedSearch.findMany();
  let created = 0;
  for (const s of searches) {
    if (!propertyMatchesSearch(property, s)) continue;
    try {
      await prisma.matchNotification.create({
        data: { savedSearchId: s.id, propertyId: property.id },
      });
      created++;
    } catch {
      // duplikat (unique constraint) -> lewati
    }
  }
  return created;
}
