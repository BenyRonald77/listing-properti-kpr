"use client";

import { useState } from "react";
import { rupiah } from "@/lib/format";

type KprResult = {
  pokokPinjaman: number; angsuranFixed: number; angsuranFloating: number;
  totalBunga: number; totalBayar: number;
  jadwalTahunan: { tahun: number; angsuranPerBulan: number; totalPokok: number; totalBunga: number; sisaPokok: number }[];
};

export default function KprPage() {
  const [form, setForm] = useState({
    price: "2000000000", downPayment: "400000000",
    fixedYears: "3", fixedAnnualRate: "5", floatingAnnualRate: "10", totalYears: "20",
  });
  const [hasil, setHasil] = useState<KprResult | null>(null);
  const [error, setError] = useState("");

  const hitung = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/kpr/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        price: Number(form.price), downPayment: Number(form.downPayment),
        fixedYears: Number(form.fixedYears), fixedAnnualRate: Number(form.fixedAnnualRate),
        floatingAnnualRate: Number(form.floatingAnnualRate), totalYears: Number(form.totalYears),
      }),
    });
    const d = await res.json();
    if (!res.ok) { setError(d.error ?? "Gagal menghitung"); setHasil(null); return; }
    setHasil(d);
  };

  const input = "w-full rounded border px-2 py-1 text-sm";
  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-bold">Simulasi KPR</h1>
      <p className="mt-1 text-sm text-slate-600">
        Periode fixed memakai suku bunga fixed, sisanya memakai floating (dihitung ulang dari sisa pokok).
      </p>
      <form onSubmit={hitung} className="mt-4 grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-3">
        <label className="text-sm">Harga properti (Rp)<input className={input} type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required /></label>
        <label className="text-sm">Uang muka / DP (Rp)<input className={input} type="number" value={form.downPayment} onChange={(e) => setForm({ ...form, downPayment: e.target.value })} required /></label>
        <label className="text-sm">Tenor total (tahun)<input className={input} type="number" value={form.totalYears} onChange={(e) => setForm({ ...form, totalYears: e.target.value })} required /></label>
        <label className="text-sm">Masa fixed (tahun)<input className={input} type="number" value={form.fixedYears} onChange={(e) => setForm({ ...form, fixedYears: e.target.value })} required /></label>
        <label className="text-sm">Bunga fixed (%/thn)<input className={input} type="number" step="any" value={form.fixedAnnualRate} onChange={(e) => setForm({ ...form, fixedAnnualRate: e.target.value })} required /></label>
        <label className="text-sm">Bunga floating (%/thn)<input className={input} type="number" step="any" value={form.floatingAnnualRate} onChange={(e) => setForm({ ...form, floatingAnnualRate: e.target.value })} required /></label>
        <button className="rounded bg-blue-600 px-4 py-2 text-sm text-white md:col-span-3">Hitung Simulasi</button>
      </form>
      {error && <p className="mt-3 text-red-600">{error}</p>}
      {hasil && (
        <div className="mt-6">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border bg-white p-4"><p className="text-xs text-slate-500">Pokok pinjaman</p><p className="text-lg font-bold">{rupiah(hasil.pokokPinjaman)}</p></div>
            <div className="rounded-lg border bg-white p-4"><p className="text-xs text-slate-500">Angsuran/bulan (fixed)</p><p className="text-lg font-bold text-blue-700">{rupiah(hasil.angsuranFixed)}</p></div>
            <div className="rounded-lg border bg-white p-4"><p className="text-xs text-slate-500">Angsuran/bulan (floating, estimasi)</p><p className="text-lg font-bold text-amber-700">{rupiah(hasil.angsuranFloating)}</p></div>
            <div className="rounded-lg border bg-white p-4"><p className="text-xs text-slate-500">Total bunga</p><p className="text-lg font-bold">{rupiah(hasil.totalBunga)}</p></div>
          </div>
          <p className="mt-3 text-sm text-slate-600">Total bayar (DP + seluruh angsuran): <b>{rupiah(hasil.totalBayar)}</b></p>
          <h2 className="mt-6 text-lg font-bold">Jadwal per Tahun</h2>
          <div className="mt-2 overflow-x-auto rounded-lg border bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-3 py-2 text-left">Tahun</th>
                  <th className="px-3 py-2 text-right">Angsuran/bln</th>
                  <th className="px-3 py-2 text-right">Pokok</th>
                  <th className="px-3 py-2 text-right">Bunga</th>
                  <th className="px-3 py-2 text-right">Sisa pokok</th>
                </tr>
              </thead>
              <tbody>
                {hasil.jadwalTahunan.map((j) => (
                  <tr key={j.tahun} className="border-t">
                    <td className="px-3 py-1.5">{j.tahun}</td>
                    <td className="px-3 py-1.5 text-right">{rupiah(j.angsuranPerBulan)}</td>
                    <td className="px-3 py-1.5 text-right">{rupiah(j.totalPokok)}</td>
                    <td className="px-3 py-1.5 text-right">{rupiah(j.totalBunga)}</td>
                    <td className="px-3 py-1.5 text-right">{rupiah(j.sisaPokok)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
