"use client";

import { useEffect, useState } from "react";
import { rupiah } from "@/lib/format";

type SavedSearch = {
  id: number; name: string; centerLat: number | null; centerLng: number | null;
  radiusKm: number | null; polygonJson: string | null; minPrice: number | null;
  maxPrice: number | null; types: string[]; facilities: string[];
};

type Match = {
  id: number; createdAt: string;
  property: { id: number; title: string; price: number; type: string; status: string };
};

export default function SavedSearchesPage() {
  const [items, setItems] = useState<SavedSearch[]>([]);
  const [matches, setMatches] = useState<Record<number, Match[]>>({});
  const [openId, setOpenId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "", centerLat: "", centerLng: "", radiusKm: "",
    minPrice: "", maxPrice: "", types: "", facilities: "",
  });

  const load = () => {
    fetch("/api/saved-searches")
      .then((r) => r.json())
      .then((d) => setItems(Array.isArray(d) ? d : []));
  };
  useEffect(load, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const body: Record<string, unknown> = { name: form.name };
    if (form.centerLat && form.centerLng && form.radiusKm) {
      body.centerLat = Number(form.centerLat);
      body.centerLng = Number(form.centerLng);
      body.radiusKm = Number(form.radiusKm);
    }
    if (form.minPrice) body.minPrice = Number(form.minPrice);
    if (form.maxPrice) body.maxPrice = Number(form.maxPrice);
    body.types = form.types.split(",").map((s) => s.trim()).filter(Boolean);
    body.facilities = form.facilities.split(",").map((s) => s.trim()).filter(Boolean);
    const res = await fetch("/api/saved-searches", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await res.json();
    if (!res.ok) { setError(d.error ?? "Gagal menyimpan"); return; }
    setForm({ name: "", centerLat: "", centerLng: "", radiusKm: "", minPrice: "", maxPrice: "", types: "", facilities: "" });
    load();
  };

  const hapus = async (id: number) => {
    if (!confirm("Hapus pencarian tersimpan ini?")) return;
    await fetch(`/api/saved-searches/${id}`, { method: "DELETE" });
    load();
  };

  const lihatCocok = async (id: number) => {
    if (openId === id) { setOpenId(null); return; }
    const res = await fetch(`/api/saved-searches/${id}/matches`);
    const d = await res.json();
    if (res.ok) {
      setMatches((m) => ({ ...m, [id]: d }));
      setOpenId(id);
    }
  };

  const input = "w-full rounded border px-2 py-1 text-sm";
  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-bold">Pencarian Tersimpan</h1>
      <p className="mt-1 text-sm text-slate-600">
        Setiap listing baru otomatis dicocokkan — bila cocok, muncul sebagai notifikasi di sini.
      </p>
      {error && <p className="mt-3 text-red-600">{error}</p>}
      <div className="mt-4 grid gap-4">
        {items.map((s) => (
          <div key={s.id} className="rounded-lg border bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold">{s.name}</h2>
                <p className="text-xs text-slate-500">
                  {s.centerLat != null && `Radius ${s.radiusKm} km dari (${s.centerLat}, ${s.centerLng}) · `}
                  {s.minPrice != null && `min ${rupiah(s.minPrice)} · `}
                  {s.maxPrice != null && `maks ${rupiah(s.maxPrice)} · `}
                  {s.types.length > 0 && `tipe: ${s.types.join(", ")} · `}
                  {s.facilities.length > 0 && `fasilitas: ${s.facilities.join(", ")}`}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button onClick={() => lihatCocok(s.id)} className="rounded bg-blue-600 px-2 py-1 text-xs text-white">
                  {openId === s.id ? "Tutup" : "Lihat Kecocokan"}
                </button>
                <button onClick={() => hapus(s.id)} className="rounded bg-red-500 px-2 py-1 text-xs text-white">Hapus</button>
              </div>
            </div>
            {openId === s.id && (
              <div className="mt-3 border-t pt-3">
                {(matches[s.id] ?? []).length === 0 && (
                  <p className="text-sm text-slate-500">Belum ada listing yang cocok.</p>
                )}
                {(matches[s.id] ?? []).map((m) => (
                  <div key={m.id} className="mb-2 rounded bg-green-50 p-2 text-sm">
                    <span className="font-semibold">{m.property.title}</span>
                    <span className="text-slate-600"> · {rupiah(m.property.price)} · {m.property.type} · {m.property.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <h2 className="mt-10 text-xl font-bold">Buat Pencarian Tersimpan</h2>
      <form onSubmit={submit} className="mt-3 grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-3">
        <input className={input} placeholder="Nama pencarian" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input className={input} placeholder="Latitude pusat" type="number" step="any" value={form.centerLat} onChange={(e) => setForm({ ...form, centerLat: e.target.value })} />
        <input className={input} placeholder="Longitude pusat" type="number" step="any" value={form.centerLng} onChange={(e) => setForm({ ...form, centerLng: e.target.value })} />
        <input className={input} placeholder="Radius (km)" type="number" step="any" value={form.radiusKm} onChange={(e) => setForm({ ...form, radiusKm: e.target.value })} />
        <input className={input} placeholder="Harga min (Rp)" type="number" value={form.minPrice} onChange={(e) => setForm({ ...form, minPrice: e.target.value })} />
        <input className={input} placeholder="Harga maks (Rp)" type="number" value={form.maxPrice} onChange={(e) => setForm({ ...form, maxPrice: e.target.value })} />
        <input className={input} placeholder="Tipe (koma: rumah, apartemen)" value={form.types} onChange={(e) => setForm({ ...form, types: e.target.value })} />
        <input className={input} placeholder="Fasilitas wajib (koma)" value={form.facilities} onChange={(e) => setForm({ ...form, facilities: e.target.value })} />
        <button className="rounded bg-blue-600 px-4 py-2 text-sm text-white md:col-span-3">Simpan Pencarian</button>
      </form>
    </main>
  );
}
