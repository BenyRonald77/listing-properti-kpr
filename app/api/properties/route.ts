import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validatePropertyInput, serializeProperty, PROPERTY_TYPES } from "@/lib/property";
import { haversineKm, parseStringArray } from "@/lib/geo";

const isNum = (v: unknown): v is number => typeof v === "number" && isFinite(v);

/**
 * GET /api/properties
 * Mode daftar: tanpa query geo -> semua properti.
 * Mode radius: ?lat=&lng=&radiusKm= (+ minPrice, maxPrice, type, facilities=a,b)
 *   -> properti active dalam radius, terurut dari terdekat, tiap item ada distanceKm.
 * Filter fasilitas bersifat AND: properti harus punya SEMUA fasilitas yang diminta.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const latS = q.get("lat"), lngS = q.get("lng"), radiusS = q.get("radiusKm");
  const useRadius = latS !== null || lngS !== null || radiusS !== null;

  // filter umum
  const minPrice = q.get("minPrice"), maxPrice = q.get("maxPrice");
  const type = q.get("type");
  const facilities = (q.get("facilities") ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean);

  const where: Record<string, unknown> = {};
  if (minPrice !== null) {
    const v = Number(minPrice);
    if (!isFinite(v)) return NextResponse.json({ error: "minPrice harus angka" }, { status: 400 });
    (where.price as Record<string, unknown> ??= {}).gte = v;
  }
  if (maxPrice !== null) {
    const v = Number(maxPrice);
    if (!isFinite(v)) return NextResponse.json({ error: "maxPrice harus angka" }, { status: 400 });
    (where.price as Record<string, unknown> ??= {}).lte = v;
  }
  if (type !== null) {
    if (!(PROPERTY_TYPES as readonly string[]).includes(type))
      return NextResponse.json({ error: `type harus salah satu dari: ${PROPERTY_TYPES.join(", ")}` }, { status: 400 });
    where.type = type;
  }

  if (!useRadius) {
    const rows = await prisma.property.findMany({ where, orderBy: { id: "asc" } });
    return NextResponse.json(rows.map(serializeProperty));
  }

  // --- mode radius ---
  if (latS === null || lngS === null || radiusS === null)
    return NextResponse.json(
      { error: "pencarian radius membutuhkan lat, lng, dan radiusKm sekaligus" },
      { status: 400 }
    );
  const lat = Number(latS), lng = Number(lngS), radiusKm = Number(radiusS);
  if (!isNum(lat) || lat < -90 || lat > 90)
    return NextResponse.json({ error: "lat harus angka dalam rentang -90..90" }, { status: 400 });
  if (!isNum(lng) || lng < -180 || lng > 180)
    return NextResponse.json({ error: "lng harus angka dalam rentang -180..180" }, { status: 400 });
  if (!isNum(radiusKm) || radiusKm <= 0)
    return NextResponse.json({ error: "radiusKm harus angka > 0" }, { status: 400 });

  const rows = await prisma.property.findMany({
    where: { ...where, status: "active" },
    orderBy: { id: "asc" },
  });
  const center = { lat, lng };
  const hasil = rows
    .map((p) => {
      const d = haversineKm(center, { lat: p.lat, lng: p.lng });
      return { p, distanceKm: Math.round(d * 1000) / 1000 };
    })
    .filter(({ p, distanceKm }) => {
      if (distanceKm > radiusKm) return false;
      if (facilities.length > 0) {
        const have = parseStringArray(p.facilities);
        if (!facilities.every((f) => have.includes(f))) return false;
      }
      return true;
    })
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .map(({ p, distanceKm }) => ({ ...serializeProperty(p), distanceKm }));
  return NextResponse.json(hasil);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const v = validatePropertyInput(body, false);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  const d = v.data;
  const created = await prisma.property.create({
    data: {
      title: d.title,
      description: d.description,
      price: d.price,
      type: d.type,
      bedrooms: d.bedrooms,
      bathrooms: d.bathrooms,
      landAreaM2: d.landAreaM2,
      buildingAreaM2: d.buildingAreaM2,
      lat: d.lat,
      lng: d.lng,
      facilities: JSON.stringify(d.facilities),
      photos: JSON.stringify(d.photos),
      status: d.status,
      agentName: d.agentName,
    },
  });
  return NextResponse.json(serializeProperty(created), { status: 201 });
}
