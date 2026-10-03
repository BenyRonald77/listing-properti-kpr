// Validasi input Property + serialisasi JSON. Dipakai route API properties.

import { parseStringArray } from "./geo";

export const PROPERTY_TYPES = ["rumah", "apartemen", "tanah", "ruko"] as const;
export const PROPERTY_STATUSES = ["active", "sold"] as const;

export type PropertyInput = {
  title: string;
  description: string;
  price: number;
  type: string;
  bedrooms: number;
  bathrooms: number;
  landAreaM2: number;
  buildingAreaM2: number;
  lat: number;
  lng: number;
  facilities: string[];
  photos: string[];
  status: string;
  agentName: string;
};

const isNum = (v: unknown): v is number => typeof v === "number" && isFinite(v);
const isInt = (v: unknown): v is number => isNum(v) && Number.isInteger(v);

type VResult = { ok: true; data: PropertyInput } | { ok: false; error: string };

/**
 * Validasi body create/update properti.
 * partial=true untuk PATCH (hanya field yang dikirim yang divalidasi).
 */
export function validatePropertyInput(body: unknown, partial = false): VResult {
  if (typeof body !== "object" || body === null)
    return { ok: false, error: "body harus berupa objek JSON" };
  const b = body as Record<string, unknown>;
  const need = (k: string) => !partial || b[k] !== undefined;

  const str = (k: string, allowEmpty = true): string | null => {
    const v = b[k];
    if (v === undefined) return partial ? null : "";
    if (typeof v !== "string") return null;
    if (!allowEmpty && v.trim() === "") return null;
    return v;
  };

  const data: PropertyInput = {
    title: "",
    description: "",
    price: 0,
    type: "rumah",
    bedrooms: 0,
    bathrooms: 0,
    landAreaM2: 0,
    buildingAreaM2: 0,
    lat: 0,
    lng: 0,
    facilities: [],
    photos: [],
    status: "active",
    agentName: "",
  };

  if (need("title")) {
    const v = str("title", false);
    if (v === null) return { ok: false, error: "title wajib diisi (string tidak kosong)" };
    data.title = v.trim();
  }
  if (need("description")) {
    const v = b["description"];
    if (v !== undefined && typeof v !== "string")
      return { ok: false, error: "description harus string" };
    data.description = (v as string) ?? "";
  }
  if (need("price")) {
    if (!isNum(b["price"]) || (b["price"] as number) <= 0)
      return { ok: false, error: "price harus angka > 0" };
    data.price = b["price"] as number;
  }
  if (need("type")) {
    if (!(PROPERTY_TYPES as readonly string[]).includes(b["type"] as string))
      return { ok: false, error: `type harus salah satu dari: ${PROPERTY_TYPES.join(", ")}` };
    data.type = b["type"] as string;
  }
  for (const k of ["bedrooms", "bathrooms"] as const) {
    if (need(k)) {
      if (!isInt(b[k]) || (b[k] as number) < 0)
        return { ok: false, error: `${k} harus bilangan bulat >= 0` };
      data[k] = b[k] as number;
    }
  }
  for (const k of ["landAreaM2", "buildingAreaM2"] as const) {
    if (need(k)) {
      if (!isNum(b[k]) || (b[k] as number) < 0)
        return { ok: false, error: `${k} harus angka >= 0` };
      data[k] = b[k] as number;
    }
  }
  if (need("lat")) {
    if (!isNum(b["lat"]) || (b["lat"] as number) < -90 || (b["lat"] as number) > 90)
      return { ok: false, error: "lat harus angka dalam rentang -90..90" };
    data.lat = b["lat"] as number;
  }
  if (need("lng")) {
    if (!isNum(b["lng"]) || (b["lng"] as number) < -180 || (b["lng"] as number) > 180)
      return { ok: false, error: "lng harus angka dalam rentang -180..180" };
    data.lng = b["lng"] as number;
  }
  for (const k of ["facilities", "photos"] as const) {
    if (need(k)) {
      const v = b[k];
      if (v !== undefined) {
        if (!Array.isArray(v) || !v.every((x) => typeof x === "string"))
          return { ok: false, error: `${k} harus array of string` };
        data[k] = v as string[];
      }
    }
  }
  if (need("status")) {
    if (!(PROPERTY_STATUSES as readonly string[]).includes(b["status"] as string))
      return { ok: false, error: `status harus salah satu dari: ${PROPERTY_STATUSES.join(", ")}` };
    data.status = b["status"] as string;
  }
  if (need("agentName")) {
    const v = b["agentName"];
    if (v !== undefined && typeof v !== "string")
      return { ok: false, error: "agentName harus string" };
    data.agentName = (v as string) ?? "";
  }
  return { ok: true, data };
}

/** Ubah row Prisma (facilities/photos JSON string) menjadi objek API. */
export function serializeProperty(p: {
  facilities: string; photos: string;
  [k: string]: unknown;
}) {
  return {
    ...p,
    facilities: parseStringArray(p.facilities),
    photos: parseStringArray(p.photos),
  };
}
