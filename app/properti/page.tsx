"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { rupiah } from "@/lib/format";
import type { MapMarker } from "@/components/PropertyMap";

const PropertyMap = dynamic(() => import("@/components/PropertyMap"), { ssr: false });

type Property = {
  id: number; title: string; description: string; price: number; type: string;
  bedrooms: number; bathrooms: number; landAreaM2: number; buildingAreaM2: number;
  lat: number; lng: number; facilities: string[]; photos: string[];
  status: string; agentName: string;
};

const TIPE = ["rumah", "apartemen", "tanah", "ruko"];

export default function PropertiPage() {
  const [items, setItems] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "", description: "", price: "", type: "rumah",
    bedrooms: "3", bathrooms: "2", landAreaM2: "150", buildingAreaM2: "120",
    lat: "-6.28", lng: "106.73", facilities: "garasi, taman", agentName: "",
  });

  const load = () => {
    setLoading(true);
    fetch("/api/properties")
      .then((r) => r.json())
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .catch(() => setError("Gagal memuat data"))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/properties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title, description: form.description,
        price: Number(form.price), type: form.type,
        bedrooms: Number(form.bedrooms), bathrooms: Number(form.bathrooms),
        landAreaM2: Number(form.landAreaM2), buildingAreaM2: Number(form.buildingAreaM2),
        lat: Number(form.lat), lng: Number(form.lng),
        facilities: form.facilities.split(",").map((s) => s.trim()).filter(Boolean),
        photos: [], status: "active", agentName: form.agentName,
      }),
    });
    const d = await res.json();
    if (!res.ok) { setError(d.error ?? "Gagal menambah listing"); return; }
    setForm({ ...form, title: "", description: "", price: "", agentName: "" });
    load();
  };

  const tandaiSold = async (id: number) => {
    await fetch(`/api/properties/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "sold" }),
    });
    load();
  };
  const hapus = async (id: number) => {
    if (!confirm("Hapus listing ini?")) return;
    await fetch(`/api/properties/${id}`, { method: "DELETE" });
    load();
  };

  const active = items.filter((p) => p.status === "active");
  const markers: MapMarker[] = active.map((p) => ({
    lat: p.lat, lng: p.lng, title: p.title, subtitle: rupiah(p.price),
  }));
  const center: [number, number] = items.length ? [items[0].lat, items[0].lng] : [-6.2, 106.8];

  const input = "w-full rounded border px-2 py-1 text-sm";
  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-bold">Daftar Properti</h1>
      <PropertyMap center={center} zoom={6} markers={markers} />
      {loading && <p className="mt-4 text-slate-500">Memuat…</p>}
      {error && <p className="mt-4 text-red-600">{error}</p>}
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
          <div key={p.id} className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-semibold">{p.title}</h2>
              <span className={`rounded px-2 py-0.5 text-xs ${p.status === "active" ? "bg-green-100 text-green-800" : "bg-slate-200 text-slate-600"}`}>
                {p.status === "active" ? "Aktif" : "Terjual"}
              </span>
            </div>
            <p className="mt-1 text-lg font-bold text-blue-700">{rupiah(p.price)}</p>
            <p className="mt-1 text-sm capitalize text-slate-500">{p.type} · {p.bedrooms} KT · {p.bathrooms} KM · LT {p.landAreaM2} m² · LB {p.buildingAreaM2} m²</p>
            <p className="mt-2 text-sm text-slate-600">{p.description}</p>
            {p.facilities.length > 0 && (
              <p className="mt-1 text-xs text-slate-500">Fasilitas: {p.facilities.join(", ")}</p>
            )}
            <p className="mt-1 text-xs text-slate-500">Agen: {p.agentName || "-"} · {p.lat.toFixed(4)}, {p.lng.toFixed(4)}</p>
            <div className="mt-3 flex gap-2">
              {p.status === "active" && (
                <button onClick={() => tandaiSold(p.id)} className="rounded bg-amber-500 px-2 py-1 text-xs text-white">Tandai Terjual</button>
              )}
              <button onClick={() => hapus(p.id)} className="rounded bg-red-500 px-2 py-1 text-xs text-white">Hapus</button>
            </div>
          </div>
        ))}
      </div>

      <h2 className="mt-10 text-xl font-bold">Tambah Listing Baru</h2>
      <p className="text-sm text-slate-500">Listing baru otomatis dicocokkan dengan semua pencarian tersimpan.</p>
      <form onSubmit={submit} className="mt-3 grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-3">
        <input className={input} placeholder="Judul" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <input className={input} placeholder="Nama agen" value={form.agentName} onChange={(e) => setForm({ ...form, agentName: e.target.value })} />
        <select className={input} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          {TIPE.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input className={input} placeholder="Harga (Rp)" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
        <input className={input} placeholder="Kamar tidur" type="number" value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: e.target.value })} />
        <input className={input} placeholder="Kamar mandi" type="number" value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: e.target.value })} />
        <input className={input} placeholder="Luas tanah (m²)" type="number" value={form.landAreaM2} onChange={(e) => setForm({ ...form, landAreaM2: e.target.value })} />
        <input className={input} placeholder="Luas bangunan (m²)" type="number" value={form.buildingAreaM2} onChange={(e) => setForm({ ...form, buildingAreaM2: e.target.value })} />
        <input className={input} placeholder="Latitude" type="number" step="any" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} required />
        <input className={input} placeholder="Longitude" type="number" step="any" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} required />
        <input className={input} placeholder="Fasilitas (pisahkan koma)" value={form.facilities} onChange={(e) => setForm({ ...form, facilities: e.target.value })} />
        <textarea className={`${input} md:col-span-3`} placeholder="Deskripsi" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <button className="rounded bg-blue-600 px-4 py-2 text-sm text-white md:col-span-3">Simpan Listing</button>
      </form>
    </main>
  );
}
