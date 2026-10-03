"use client";

import { useEffect, useRef } from "react";

export type MapMarker = { lat: number; lng: number; title: string; subtitle?: string };
export type MapCircle = { lat: number; lng: number; radiusKm: number };

type Props = {
  center: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  circle?: MapCircle | null;
  /** polygon GeoJSON [[lng,lat],...] */
  polygon?: number[][] | null;
  onMapClick?: (lat: number, lng: number) => void;
  height?: string;
};

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

function loadLeaflet(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("tanpa window"));
  if ((window as any).L) return Promise.resolve((window as any).L);
  return new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }
    const script = document.createElement("script");
    script.src = LEAFLET_JS;
    script.onload = () => resolve((window as any).L);
    script.onerror = () => reject(new Error("gagal memuat Leaflet dari CDN"));
    document.body.appendChild(script);
  });
}

/** Peta Leaflet (client-only). Muat via dynamic(..., { ssr: false }). */
export default function PropertyMap({
  center, zoom = 12, markers = [], circle = null, polygon = null,
  onMapClick, height = "420px",
}: Props) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const clickRef = useRef(onMapClick);
  clickRef.current = onMapClick;

  // inisialisasi sekali
  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !divRef.current || mapRef.current) return;
      const map = L.map(divRef.current).setView(center, zoom);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      map.on("click", (e: any) => clickRef.current?.(e.latlng.lat, e.latlng.lng));
      mapRef.current = map;
      layerRef.current = L.layerGroup().addTo(map);
      drawLayers(L);
    }).catch((e) => console.error(e));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const drawLayers = (L: any) => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    const icon = L.icon({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });
    for (const m of markers) {
      L.marker([m.lat, m.lng], { icon })
        .bindPopup(`<b>${escapeHtml(m.title)}</b>${m.subtitle ? `<br/>${escapeHtml(m.subtitle)}` : ""}`)
        .addTo(layer);
    }
    if (circle) {
      L.circle([circle.lat, circle.lng], { radius: circle.radiusKm * 1000, color: "#2563eb", fillOpacity: 0.08 }).addTo(layer);
      L.marker([circle.lat, circle.lng], { icon }).bindPopup("Titik pusat").addTo(layer);
    }
    if (polygon && polygon.length >= 3) {
      L.polygon(polygon.map(([lng, lat]) => [lat, lng] as [number, number]), {
        color: "#16a34a", fillOpacity: 0.12,
      }).addTo(layer);
    }
  };

  // gambar ulang layer saat data berubah
  useEffect(() => {
    const L = (window as any).L;
    if (L && mapRef.current) {
      drawLayers(L);
      mapRef.current.setView(center, zoom);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(markers), JSON.stringify(circle), JSON.stringify(polygon), center[0], center[1], zoom]);

  return <div ref={divRef} style={{ height, width: "100%" }} className="rounded-lg border" />;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
