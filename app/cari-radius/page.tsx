"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { rupiah } from "@/lib/format";
import type { MapMarker } from "@/components/PropertyMap";

const PropertyMap = dynamic(() => import("@/components/PropertyMap"), { ssr: false });

type Hasil = {
  id: number; title: string; price: number; type: string; lat: number; lng: number;
  distanceKm: number; facilities: string[]; agentName: string;
};

export default function CariRadiusPage() {
  const [lat, setLat] = useState("-6.2088");
  const [lng, setLng] = useState("106.8456");
  const [radiusKm, setRadiusKm] = useState("10");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [type, setType] = useState("");
  const [facilities, setFacilities] = useState("");
  const [hasil, setHasil] = useState<Hasil[] | null>(null);
  const [error, setError] = useState("");

  const cari = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const p = new URLSearchParams({ lat, lng, radiusKm });
    if (minPrice) p.set("minPrice", minPrice);
    if (maxPrice) p.set("maxPrice", maxPrice);
    if (type) p.set("type", type);
    if (facilities) p.set("facilities", facilities);
    const res = await fetch(`/api/properties?${p.toString()}`);
    const d = await res.json();
    if (!res.ok) { setError(d.error ?? "Gagal mencari"); setHasil(null); return; }
    setHasil(d);
  };

  const markers: MapMarker[] = (hasil ?? []).map((h) => ({
    lat: h.lat, lng: h.lng, title: h.title,
    subtitle: `${rupiah(h.price)} · ${h.distanceKm} km`,
  }));
  const cLat = Number(lat), cLng = Number(lng);
  const center: [number, number] = [isFinite(cLat) ? cLat : -6.2, isFinite(cLng) ? cLng : 106.8];

  const input = "w-full rounded border px-2 py-1 text-sm";
  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-bold">Cari Properti dalam Radius</h1>
      <form onSubmit={cari} className="mt-4 grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-4">
        <label className="text-sm">Latitude<input className={input} value={lat} onChange={(e) => setLat(e.target.value)} required /></label>
        <label className="text-sm">Longitude<input className={input} value={lng} onChange={(e) => setLng(e.target.value)} required /></label>
        <label className="text-sm">Radius (km)<input className={input} type="number" step="any" value={radiusKm} onChange={(e) => setRadiusKm(e.target.value)} required /></label>
        <label className="text-sm">Tipe
          <select className={input} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Semua</option>
            <option value="rumah">Rumah</option>
            <option value="apartemen">Apartemen</option>
            <option value="tanah">Tanah</option>
            <option value="ruko">Ruko</option>
          </select>
        </label>
        <label className="text-sm">Harga min (Rp)<input className={input} type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} /></label>
        <label className="text-sm">Harga maks (Rp)<input className={input} type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} /></label>
        <label className="text-sm md:col-span-2">Fasilitas wajib (koma)<input className={input} value={facilities} onChange={(e) => setFacilities(e.target.value)} placeholder="mis. kolam, garasi" /></label>
        <button className="rounded bg-blue-600 px-4 py-2 text-sm text-white md:col-span-4">Cari</button>
      </form>
      {error && <p className="mt-3 text-red-600">{error}</p>}
      {hasil !== null && (
        <>
          <p className="mt-4 text-sm text-slate-600">Ditemukan {hasil.length} properti, terurut dari terdekat.</p>
          <div className="mt-2">
            <PropertyMap
              center={center} zoom={11} markers={markers}
              circle={{ lat: center[0], lng: center[1], radiusKm: Number(radiusKm) || 0 }}
            />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {hasil.map((h) => (
              <div key={h.id} className="rounded-lg border bg-white p-3">
                <div className="flex justify-between gap-2">
                  <span className="font-semibold">{h.title}</span>
                  <span className="whitespace-nowrap text-sm font-bold text-blue-700">{h.distanceKm} km</span>
                </div>
                <p className="text-sm text-slate-600">{rupiah(h.price)} · {h.type}</p>
                {h.facilities.length > 0 && <p className="text-xs text-slate-500">{h.facilities.join(", ")}</p>}
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
