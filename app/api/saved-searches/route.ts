import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateSavedSearchInput, serializeSavedSearch } from "@/lib/savedsearch";

export async function GET() {
  const rows = await prisma.savedSearch.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json(rows.map(serializeSavedSearch));
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const v = validateSavedSearchInput(body, false);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  const d = v.data;
  const created = await prisma.savedSearch.create({
    data: {
      name: d.name,
      centerLat: d.centerLat,
      centerLng: d.centerLng,
      radiusKm: d.radiusKm,
      polygonJson: d.polygonJson,
      minPrice: d.minPrice,
      maxPrice: d.maxPrice,
      types: JSON.stringify(d.types),
      facilities: JSON.stringify(d.facilities),
    },
  });
  return NextResponse.json(serializeSavedSearch(created), { status: 201 });
}
