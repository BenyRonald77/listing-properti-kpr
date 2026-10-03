import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateSavedSearchInput, serializeSavedSearch } from "@/lib/savedsearch";

async function findOr404(id: number) {
  const row = await prisma.savedSearch.findUnique({ where: { id } });
  return row;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "id tidak valid" }, { status: 400 });
  const row = await findOr404(id);
  if (!row) return NextResponse.json({ error: "saved search tidak ditemukan" }, { status: 404 });
  return NextResponse.json(serializeSavedSearch(row));
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "id tidak valid" }, { status: 400 });
  const existing = await findOr404(id);
  if (!existing) return NextResponse.json({ error: "saved search tidak ditemukan" }, { status: 404 });
  const body = await req.json().catch(() => null);
  const v = validateSavedSearchInput(body, true);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  const d = v.data;
  const b = (body ?? {}) as Record<string, unknown>;
  const update: Record<string, unknown> = {};
  for (const k of ["name", "centerLat", "centerLng", "radiusKm", "polygonJson", "minPrice", "maxPrice"] as const) {
    if (b[k] !== undefined) update[k] = d[k];
  }
  if (b["types"] !== undefined) update["types"] = JSON.stringify(d.types);
  if (b["facilities"] !== undefined) update["facilities"] = JSON.stringify(d.facilities);
  const updated = await prisma.savedSearch.update({ where: { id }, data: update });
  return NextResponse.json(serializeSavedSearch(updated));
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "id tidak valid" }, { status: 400 });
  const existing = await findOr404(id);
  if (!existing) return NextResponse.json({ error: "saved search tidak ditemukan" }, { status: 404 });
  await prisma.savedSearch.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
