// Utilitas geospasial — pengganti PostGIS (SQLite tidak punya PostGIS).
// Semua perhitungan dilakukan di kode aplikasi.

export type LatLng = { lat: number; lng: number };
// Polygon dalam urutan GeoJSON: [[lng, lat], ...], titik pertama == titik terakhir.

const EARTH_R_KM = 6371;

/** Jarak haversine (km) antara dua titik koordinat. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R_KM * Math.asin(Math.sqrt(s));
}

function pointsEqual(p1: number[], p2: number[]): boolean {
  return p1[0] === p2[0] && p1[1] === p2[1];
}

/**
 * Validasi polygon GeoJSON [[lng,lat],...].
 * Mengembalikan pesan error (string) bila invalid, null bila valid.
 */
export function validatePolygon(polygon: unknown): string | null {
  if (!Array.isArray(polygon)) return "polygon harus berupa array [[lng,lat],...]";
  const pts = polygon as unknown[];
  // titik berbeda minimal 3 (selain titik penutup)
  const distinct = pts.filter(
    (p, i) => i === 0 || !pointsEqual(p as number[], pts[i - 1] as number[])
  );
  if (distinct.length < 3)
    return "polygon minimal terdiri dari 3 titik berbeda";
  for (const p of pts) {
    if (
      !Array.isArray(p) ||
      p.length < 2 ||
      typeof (p as number[])[0] !== "number" ||
      typeof (p as number[])[1] !== "number" ||
      !isFinite((p as number[])[0]) ||
      !isFinite((p as number[])[1])
    )
      return "setiap titik polygon harus berupa [lng,lat] angka yang valid";
    const [lng, lat] = p as number[];
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90)
      return "koordinat titik polygon di luar rentang valid (lng -180..180, lat -90..90)";
  }
  const first = pts[0] as number[];
  const last = pts[pts.length - 1] as number[];
  if (!pointsEqual(first, last))
    return "polygon harus tertutup (titik pertama sama dengan titik terakhir)";
  return null;
}

/**
 * Ray casting point-in-polygon. point = [lng, lat].
 * Titik tepat di garis tepi dianggap di dalam.
 */
export function pointInPolygon(point: [number, number], polygon: number[][]): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    // cek tepat di segmen garis -> di dalam
    const onSeg =
      Math.min(xi, xj) <= x && x <= Math.max(xi, xj) &&
      Math.min(yi, yj) <= y && y <= Math.max(yi, yj) &&
      Math.abs((yj - yi) * (x - xi) - (xj - xi) * (y - yi)) < 1e-9;
    if (onSeg) return true;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** Parse JSON array string dari DB menjadi string[] (aman bila rusak). */
export function parseStringArray(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}
