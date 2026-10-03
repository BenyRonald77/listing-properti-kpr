# Listing Properti & Simulasi KPR

Aplikasi listing properti (rumah/apartemen/tanah/ruko) dengan peta interaktif
(Leaflet via CDN), pencarian radius & polygon, simulasi cicilan KPR
(fixed + floating), serta pencarian tersimpan dengan notifikasi otomatis
saat ada listing baru yang cocok.

## Cara Menjalankan

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma db push
npm run seed
npm run dev
```

## Halaman

- `/` — Daftar properti + peta (marker per properti, klik untuk detail).
- `/cari-radius` — Pencarian properti dalam radius dari suatu titik + lingkaran di peta.
- `/cari-polygon` — Pencarian properti di dalam polygon + gambar polygon di peta.
- `/kpr` — Form simulasi KPR + hasil angsuran + jadwal per tahun.
- `/saved-searches` — Kelola pencarian tersimpan + lihat notifikasi kecocokan.

## API

- `GET/POST /api/properties` — daftar & buat listing (radius search via query `lat,lng,radiusKm,minPrice,maxPrice,type,facilities`)
- `GET/PATCH/DELETE /api/properties/[id]`
- `POST /api/properties/search-polygon` — `{ polygon: [[lng,lat],...] }`
- `POST /api/kpr/simulate` — simulasi cicilan KPR
- `GET/POST /api/saved-searches`, `GET/PATCH/DELETE /api/saved-searches/[id]`
- `GET /api/saved-searches/[id]/matches` — notifikasi kecocokan

## Catatan teknis

SQLite tidak punya PostGIS: pencarian radius memakai formula haversine dan
pencarian polygon memakai ray casting point-in-polygon — keduanya di
`lib/geo.ts` (kode aplikasi, bukan query DB).
