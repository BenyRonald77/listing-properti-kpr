"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { rupiah } from "@/lib/format";
import type { MapMarker } from "@/components/PropertyMap";

const PropertyMap = dynamic(() => import("@/components/PropertyMap"), { ssr: false });

type Hasil = {
  id: number; title: string; price: number; type: string; lat: number; lng: number;
};

export default function CariPolygonPage() {
  const [points, setPoints] = useState<[number, number][]>([]);
  const [hasil, setHasil] = useState<Hasil[] | null>(null);
  const [error, setError] = useState("");

  const tambahTitik = (lat: number, lng: number) => {
    setPoints((p) => [...p, [lng, lat]]);
  };

  const cari = async () => {
    setError("");
    if (points.length < 3) { setError("Tambahkan minimal 3 titik dengan mengklik peta."); return; }
    const polygon = [...points, points[0]]; // tutup polygon
    const res = await fetch("/api/properties/search-polygon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ polygon }),
    });
    const d = await res.json();
    if (!res.ok) { setError(d.error ?? "Gagal mencari"); setHasil(null); return; }
    setHasil(d);
  };

  const markers: MapMarker[] = (hasil ?? []).map((h) => ({
    lat: h.lat, lng: h.lng, title: h.title, subtitle: rupiah(h.price),
  }));
  // titik polygon yang sedang digambar juga tampil sebagai marker kecil
  const pointMarkers: MapMarker[] = points.map(([lng, lat], i) => ({
    lat, lng, title: `Titik ${i + 1}`,
  }));
  const closed = points.length >= 3 ? [...points, points[0]] : null;
  const center: [number, number] = points.length > 0
    ? [points[0][1], points[0][0]]
    : [-6.25, 106.8];

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-bold">Cari Properti dalam Polygon</h1>
      <p className="mt-1 text-sm text-slate-600">
        Klik peta untuk menambah titik sudut area (minimal 3), lalu tekan "Cari di dalam polygon".
      </p>
      <div className="mt-3 flex gap-2">
        <button onClick={cari} className="rounded bg-blue-600 px-4 py-2 text-sm text-white">Cari di dalam polygon</button>
        <button onClick={() => { setPoints([]); setHasil(null); setError(""); }} className="rounded bg-slate-200 px-4 py-2 text-sm">Reset</button>
        <span className="self-center text-sm text-slate-500">{points.length} titik</span>
      </div>
      {error && <p className="mt-3 text-red-600">{error}</p>}
      <div className="mt-3">
        <PropertyMap
          center={center} zoom={11}
          markers={[...markers, ...pointMarkers]}
          polygon={closed}
          onMapClick={tambahTitik}
        />
      </div>
      {hasil !== null && (
        <>
          <p className="mt-4 text-sm text-slate-600">Ditemukan {hasil.length} properti di dalam polygon.</p>
          <div className="mt-2 grid gap-3 md:grid-cols-2">
            {hasil.map((h) => (
              <div key={h.id} className="rounded-lg border bg-white p-3">
                <p className="font-semibold">{h.title}</p>
                <p className="text-sm text-slate-600">{rupiah(h.price)} · {h.type}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
