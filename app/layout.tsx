import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Listing Properti & Simulasi KPR",
  description: "Cari properti di peta, simulasikan KPR, dan simpan pencarian favorit Anda.",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
