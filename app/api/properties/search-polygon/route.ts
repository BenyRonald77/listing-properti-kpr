import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeProperty } from "@/lib/property";
import { validatePolygon, pointInPolygon } from "@/lib/geo";

/**
 * POST /api/properties/search-polygon
 * Body: { "polygon": [[lng,lat],...] } — polygon harus tertutup
 *       (titik pertama == titik terakhir) & minimal 3 titik berbeda.
 * Mengembalikan properti active di dalam polygon.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const polygon = (body as Record<string, unknown> | null)?.["polygon"];
  const err = validatePolygon(polygon);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  const poly = polygon as number[][];
  const rows = await prisma.property.findMany({
    where: { status: "active" },
    orderBy: { id: "asc" },
  });
  const hasil = rows
    .filter((p) => pointInPolygon([p.lng, p.lat], poly))
    .map(serializeProperty);
  return NextResponse.json(hasil);
}
