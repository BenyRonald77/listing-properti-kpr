import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeProperty } from "@/lib/property";

/**
 * GET /api/saved-searches/[id]/matches
 * Daftar notifikasi kecocokan untuk satu saved search, beserta detail properti.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "id tidak valid" }, { status: 400 });
  const search = await prisma.savedSearch.findUnique({ where: { id } });
  if (!search) return NextResponse.json({ error: "saved search tidak ditemukan" }, { status: 404 });
  const matches = await prisma.matchNotification.findMany({
    where: { savedSearchId: id },
    include: { property: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(
    matches.map((m) => ({
      id: m.id,
      savedSearchId: m.savedSearchId,
      createdAt: m.createdAt,
      property: serializeProperty(m.property),
    }))
  );
}
