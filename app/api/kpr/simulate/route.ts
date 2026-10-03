import { NextRequest, NextResponse } from "next/server";
import { validateKprInput, simulateKpr } from "@/lib/kpr";

/**
 * POST /api/kpr/simulate
 * Body: { price, downPayment, fixedYears, fixedAnnualRate, floatingAnnualRate, totalYears }
 * Respons: pokokPinjaman, angsuranFixed, angsuranFloating, totalBunga, totalBayar, jadwalTahunan.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const v = validateKprInput(body);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  return NextResponse.json(simulateKpr(v.data));
}
