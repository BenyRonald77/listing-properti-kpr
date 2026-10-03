// Validasi input SavedSearch.

import { validatePolygon } from "./geo";
import { PROPERTY_TYPES } from "./property";

export type SavedSearchInput = {
  name: string;
  centerLat: number | null;
  centerLng: number | null;
  radiusKm: number | null;
  polygonJson: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  types: string[];
  facilities: string[];
};

const isNum = (v: unknown): v is number => typeof v === "number" && isFinite(v);

type VResult = { ok: true; data: SavedSearchInput } | { ok: false; error: string };

export function validateSavedSearchInput(body: unknown, partial = false): VResult {
  if (typeof body !== "object" || body === null)
    return { ok: false, error: "body harus berupa objek JSON" };
  const b = body as Record<string, unknown>;
  const need = (k: string) => !partial || b[k] !== undefined;

  const data: SavedSearchInput = {
    name: "", centerLat: null, centerLng: null, radiusKm: null,
    polygonJson: null, minPrice: null, maxPrice: null, types: [], facilities: [],
  };

  if (need("name")) {
    const v = b["name"];
    if (typeof v !== "string" || v.trim() === "")
      return { ok: false, error: "name wajib diisi (string tidak kosong)" };
    data.name = v.trim();
  }

  const geoKeys = ["centerLat", "centerLng", "radiusKm"] as const;
  const geoProvided = geoKeys.some((k) => b[k] !== undefined && b[k] !== null);
  if (geoProvided) {
    for (const k of geoKeys) {
      if (b[k] === undefined || b[k] === null)
        return { ok: false, error: "centerLat, centerLng, dan radiusKm harus diisi bersamaan" };
    }
    const { centerLat, centerLng, radiusKm } = b as Record<string, number>;
    if (!isNum(centerLat) || centerLat < -90 || centerLat > 90)
      return { ok: false, error: "centerLat harus angka dalam rentang -90..90" };
    if (!isNum(centerLng) || centerLng < -180 || centerLng > 180)
      return { ok: false, error: "centerLng harus angka dalam rentang -180..180" };
    if (!isNum(radiusKm) || radiusKm <= 0)
      return { ok: false, error: "radiusKm harus angka > 0" };
    data.centerLat = centerLat; data.centerLng = centerLng; data.radiusKm = radiusKm;
  } else if (!partial) {
    data.centerLat = null; data.centerLng = null; data.radiusKm = null;
  }

  if (need("polygonJson")) {
    const v = b["polygonJson"];
    if (v !== undefined && v !== null) {
      if (typeof v !== "string")
        return { ok: false, error: "polygonJson harus string JSON [[lng,lat],...]" };
      let parsed: unknown;
      try { parsed = JSON.parse(v); } catch {
        return { ok: false, error: "polygonJson bukan JSON yang valid" };
      }
      const err = validatePolygon(parsed);
      if (err) return { ok: false, error: `polygon tidak valid: ${err}` };
      data.polygonJson = v;
    } else if (!partial) {
      data.polygonJson = null;
    }
  }

  for (const k of ["minPrice", "maxPrice"] as const) {
    if (need(k)) {
      const v = b[k];
      if (v !== undefined && v !== null) {
        if (!isNum(v) || (v as number) < 0)
          return { ok: false, error: `${k} harus angka >= 0` };
        data[k] = v as number;
      } else if (!partial) {
        data[k] = null;
      }
    }
  }
  // untuk PATCH, baca nilai existing bila perlu? -> disederhanakan: validasi silang hanya bila keduanya dikirim
  const minP = b["minPrice"] as number | undefined;
  const maxP = b["maxPrice"] as number | undefined;
  if (minP != null && maxP != null && minP > maxP)
    return { ok: false, error: "minPrice tidak boleh lebih besar dari maxPrice" };

  for (const k of ["types", "facilities"] as const) {
    if (need(k)) {
      const v = b[k];
      if (v !== undefined) {
        if (!Array.isArray(v) || !v.every((x) => typeof x === "string"))
          return { ok: false, error: `${k} harus array of string` };
        if (k === "types") {
          const bad = (v as string[]).filter((t) => !(PROPERTY_TYPES as readonly string[]).includes(t));
          if (bad.length > 0)
            return { ok: false, error: `type tidak dikenal: ${bad.join(", ")}` };
        }
        data[k] = v as string[];
      }
    }
  }
  return { ok: true, data };
}

/** Bentuk API: parse JSON string kembali menjadi array. */
export function serializeSavedSearch(s: {
  types: string; facilities: string; [k: string]: unknown;
}) {
  const arr = (j: string) => {
    try { const v = JSON.parse(j); return Array.isArray(v) ? v : []; }
    catch { return []; }
  };
  return { ...s, types: arr(s.types), facilities: arr(s.facilities) };
}
