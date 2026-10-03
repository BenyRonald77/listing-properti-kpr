import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validatePropertyInput, serializeProperty } from "@/lib/property";

export async function GET() {
  const rows = await prisma.property.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json(rows.map(serializeProperty));
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
