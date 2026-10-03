import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validatePropertyInput, serializeProperty } from "@/lib/property";

async function findOr404(id: number) {
  const row = await prisma.property.findUnique({ where: { id } });
  if (!row) return null;
  return row;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "id tidak valid" }, { status: 400 });
  const row = await findOr404(id);
  if (!row) return NextResponse.json({ error: "properti tidak ditemukan" }, { status: 404 });
  return NextResponse.json(serializeProperty(row));
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "id tidak valid" }, { status: 400 });
  const existing = await findOr404(id);
  if (!existing) return NextResponse.json({ error: "properti tidak ditemukan" }, { status: 404 });
  const body = await req.json().catch(() => null);
  const v = validatePropertyInput(body, true);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  const d = v.data;
  const b = (body ?? {}) as Record<string, unknown>;
  const update: Record<string, unknown> = {};
  const map: Record<string, string> = {
    title: "title", description: "description", price: "price", type: "type",
    bedrooms: "bedrooms", bathrooms: "bathrooms", landAreaM2: "landAreaM2",
    buildingAreaM2: "buildingAreaM2", lat: "lat", lng: "lng",
    status: "status", agentName: "agentName",
  };
  for (const [jsonKey, dbKey] of Object.entries(map)) {
    if (b[jsonKey] !== undefined) update[dbKey] = (d as Record<string, unknown>)[jsonKey];
  }
  if (b["facilities"] !== undefined) update["facilities"] = JSON.stringify(d.facilities);
  if (b["photos"] !== undefined) update["photos"] = JSON.stringify(d.photos);
  const updated = await prisma.property.update({ where: { id }, data: update });
  return NextResponse.json(serializeProperty(updated));
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "id tidak valid" }, { status: 400 });
  const existing = await findOr404(id);
  if (!existing) return NextResponse.json({ error: "properti tidak ditemukan" }, { status: 404 });
  await prisma.property.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
