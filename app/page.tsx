import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-3xl font-bold">Listing Properti & Simulasi KPR</h1>
      <p className="mt-2 text-slate-600">
        Cari properti di peta, simulasikan cicilan KPR, dan simpan pencarian favorit Anda.
      </p>
      <nav className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link href="/properti" className="rounded-lg border bg-white p-4 shadow-sm hover:shadow">
          <div className="font-semibold">Daftar Properti + Peta</div>
          <div className="text-sm text-slate-500">Jelajahi semua listing di peta interaktif.</div>
        </Link>
        <Link href="/cari-radius" className="rounded-lg border bg-white p-4 shadow-sm hover:shadow">
          <div className="font-semibold">Cari dalam Radius</div>
          <div className="text-sm text-slate-500">Properti di sekitar titik lokasi Anda.</div>
        </Link>
        <Link href="/cari-polygon" className="rounded-lg border bg-white p-4 shadow-sm hover:shadow">
          <div className="font-semibold">Cari dalam Polygon</div>
          <div className="text-sm text-slate-500">Gambar area di peta, cari properti di dalamnya.</div>
        </Link>
        <Link href="/kpr" className="rounded-lg border bg-white p-4 shadow-sm hover:shadow">
          <div className="font-semibold">Simulasi KPR</div>
          <div className="text-sm text-slate-500">Hitung angsuran fixed & floating.</div>
        </Link>
        <Link href="/saved-searches" className="rounded-lg border bg-white p-4 shadow-sm hover:shadow">
          <div className="font-semibold">Pencarian Tersimpan</div>
          <div className="text-sm text-slate-500">Dapat notifikasi saat listing cocok muncul.</div>
        </Link>
      </nav>
    </main>
  );
}
