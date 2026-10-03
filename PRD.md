# PRD — Listing Properti dengan Peta dan Simulasi KPR (`listing-properti-kpr`)

## Ringkasan
Aplikasi web listing properti (jual rumah/apartemen/tanah/ruko) dengan peta
interaktif (Leaflet via CDN), pencarian berdasarkan radius dari suatu titik,
pencarian berdasarkan polygon yang digambar pengguna, simulasi cicilan KPR
(fixed + floating), serta fitur pencarian tersimpan (saved search) yang otomatis
memberi notifikasi saat ada listing baru yang cocok.

## Stack
- Next.js 14 (App Router) + TypeScript + Prisma 5.22 + SQLite + Tailwind CSS.
- Peta: Leaflet via CDN (hanya di sisi klien, `useEffect` + `next/dynamic`
  `ssr:false` agar lolos build; tanpa test browser).

### Penyesuaian stack (PostGIS → SQLite)
Stack SQLite tidak punya PostGIS. Seluruh operasi geospasial dilakukan di kode
aplikasi TypeScript (`lib/geo.ts`):
- **Pencarian radius**: formula **haversine** di kode aplikasi — setiap properti
  dihitung jaraknya (km) dari titik pusat, difilter `distanceKm <= radiusKm`,
  lalu diurutkan dari terdekat. Untuk skala data aplikasi ini (ratusan–ribuan
  listing) pemindaian penuh per query dapat diterima.
- **Pencarian polygon**: **ray casting point-in-polygon** di `lib/geo.ts`.
  Input polygon dalam format `[[lng,lat],...]` (urutan GeoJSON). Polygon wajib
  minimal 3 titik dan **tertutup** (titik pertama == titik terakhir).
- Bounding-box prefilter tidak diwajibkan; semua filter dilakukan di memori
  setelah fetch dari SQLite.

## Model Data

### Property
| Field | Tipe | Keterangan |
|---|---|---|
| id | Int @id autoincrement | |
| title | String | nama listing |
| description | String | deskripsi |
| price | Float | harga jual, wajib > 0 |
| type | String | `rumah` \| `apartemen` \| `tanah` \| `ruko` |
| bedrooms | Int | jumlah kamar tidur |
| bathrooms | Int | jumlah kamar mandi |
| landAreaM2 | Float | luas tanah (m²) |
| buildingAreaM2 | Float | luas bangunan (m²) |
| lat | Float | -90..90 (validasi) |
| lng | Float | -180..180 (validasi) |
| facilities | String (JSON) | array string, mis. `["kolam","garasi"]` |
| photos | String (JSON) | array URL string |
| status | String | `active` \| `sold` |
| agentName | String | nama agen |
| createdAt | DateTime @default(now()) | |

### SavedSearch
| Field | Tipe | Keterangan |
|---|---|---|
| id | Int @id autoincrement | |
| name | String | nama pencarian |
| centerLat | Float? | pusat radius |
| centerLng | Float? | pusat radius |
| radiusKm | Float? | radius (km), dipakai bersama centerLat/Lng |
| polygonJson | String? | polygon GeoJSON `[[lng,lat],...]` |
| minPrice | Float? | |
| maxPrice | Float? | |
| types | String (JSON) | array tipe, kosong = semua |
| facilities | String (JSON) | array fasilitas wajib (AND) |
| createdAt | DateTime @default(now()) | |

### MatchNotification
| Field | Tipe | Keterangan |
|---|---|---|
| id | Int @id autoincrement | |
| savedSearchId | Int | FK SavedSearch (cascade delete) |
| propertyId | Int | FK Property (cascade delete) |
| createdAt | DateTime @default(now()) | |
| @@unique([savedSearchId, propertyId]) | | tanpa duplikat |

## Fungsionalitas

### F0 — Scaffold, PRD, schema, seed
Scaffold Next.js 14 + TS + Prisma + Tailwind; `PRD.md`; `prisma/schema.prisma`;
`prisma/seed.ts` berisi 10 properti (koordinat realistis Jakarta & DIY,
harga/tipe/fasilitas bervariasi) + 1 SavedSearch contoh.

### F1 — CRUD listing properti
- `GET /api/properties` — daftar semua properti.
- `POST /api/properties` — buat listing; validasi: `price > 0`,
  `lat` dalam -90..90, `lng` dalam -180..180, `type` salah satu dari
  4 nilai, `status` salah satu dari 2 nilai → 400 bila invalid.
- `GET /api/properties/[id]` — detail; 404 bila tidak ada.
- `PATCH /api/properties/[id]` — ubah (termasuk tandai `sold`); validasi sama.
- `DELETE /api/properties/[id]` — hapus; 404 bila tidak ada.

### F2 — Pencarian radius
`GET /api/properties?lat=&lng=&radiusKm=` (+ filter opsional
`minPrice`, `maxPrice`, `type`, `facilities=kolam,garden`):
- `lat`, `lng`, `radiusKm` wajib ketiganya bila salah satu dipakai; validasi
  angka & rentang → 400 bila invalid.
- Hitung `distanceKm` haversine per properti; hanya yang `<= radiusKm` lolos.
- Urut dari terdekat; tiap item respons menyertakan `distanceKm` (3 desimal).
- Filter fasilitas: properti harus memiliki **SEMUA** fasilitas yang diminta.
- Radius search hanya mempertimbangkan properti `status=active`.

### F3 — Pencarian polygon
`POST /api/properties/search-polygon` dengan body
`{ "polygon": [[lng,lat],...] }`:
- Validasi: minimal 3 titik berbeda & polygon tertutup
  (titik pertama == titik terakhir) → 400 bila invalid.
- Ray casting (`lib/geo.ts`); kembalikan properti `active` di dalam polygon.

### F4 — Simulasi KPR
`POST /api/kpr/simulate` dengan body:
`{ price, downPayment, fixedYears, fixedAnnualRate, floatingAnnualRate, totalYears }`
- Validasi: `price > 0`, `0 <= downPayment < price`, `0 <= fixedYears <= totalYears`,
  `totalYears > 0`, rate >= 0 → 400 bila invalid.
- Rumus angsuran PMT: `M = P·r(1+r)^n / ((1+r)^n − 1)`, r = rate tahunan/12.
- `angsuranFixed` = PMT(pokokPinjaman, fixedRate, totalBulan).
- Amortisasi selama periode fixed → sisa pokok → `angsuranFloating` =
  PMT(sisaPokok, floatingRate, sisaBulan) (estimasi, floating diasumsikan konstan).
- Respons: `angsuranFixed`, `angsuranFloating`, `totalBunga`, `totalBayar`
  (DP + seluruh angsuran), `pokokPinjaman`, `jadwalTahunan[]`
  (`tahun`, `angsuranPerBulan`, `totalPokok`, `totalBunga`, `sisaPokok`).

### F5 — SavedSearch + pencocokan otomatis + UI
- CRUD `GET/POST /api/saved-searches`, `GET/PATCH/DELETE /api/saved-searches/[id]`.
- Setiap kali listing **baru** dibuat (`POST /api/properties`), evaluasi semua
  SavedSearch (radius ATAU polygon + rentang harga + tipe + fasilitas wajib):
  buat `MatchNotification` untuk yang cocok; `@@unique` mencegah duplikat.
- `GET /api/saved-searches/[id]/matches` — daftar notifikasi + detail properti.
- UI (Bahasa Indonesia):
  - `/` daftar properti + peta Leaflet (marker properti, klik untuk detail).
  - Halaman pencarian radius: input lat/lng/radius + peta menampilkan lingkaran.
  - Halaman pencarian polygon: daftar koordinat + peta menampilkan polygon.
  - `/kpr` form simulasi KPR + hasil + jadwal tahunan.
  - `/saved-searches` kelola saved search + lihat notifikasi kecocokan.

## Aturan bisnis penting
1. Validasi koordinat & harga di semua endpoint tulis (400).
2. Fasilitas filter bersifat AND (semua harus ada).
3. Polygon: minimal 3 titik, harus tertutup (400 bila tidak).
4. KPR: DP < harga, fixedYears <= totalYears (400 bila dilanggar).
5. MatchNotification unik per (savedSearchId, propertyId) — tanpa duplikat.

## Seed
10 properti: 5 di Jakarta (rumah, apartemen, ruko, tanah, rumah), 5 di DIY
(Yogyakarta/Sleman/Bantul) dengan harga, tipe, fasilitas bervariasi; 1
SavedSearch contoh ("Rumah di Jakarta Selatan < 3M, radius 10 km dari Blok M").

## Pengujian (tanpa browser)
- `npm run build` lolos.
- curl: CRUD valid/invalid (lat 200 → 400); radius: dalam radius muncul & terurut
  jarak benar, luar radius tidak muncul, filter harga+fasilitas; polygon: titik di
  dalam vs luar, polygon invalid → 400; KPR: angsuran bulan pertama cocok hitungan
  manual rumus PMT, fixedYears > totalYears → 400; listing cocok kriteria →
  MatchNotification tercipta; listing tidak cocok → tidak tercipta.
