import { PrismaClient } from "@prisma/client";
import { evaluateMatchesForProperty } from "../lib/match";

const prisma = new PrismaClient();

type SeedProperty = {
  title: string; description: string; price: number; type: string;
  bedrooms: number; bathrooms: number; landAreaM2: number; buildingAreaM2: number;
  lat: number; lng: number; facilities: string[]; photos: string[];
  status: string; agentName: string;
};

const properties: SeedProperty[] = [
  {
    title: "Rumah Modern 2 Lantai di Kemang",
    description: "Rumah modern di kawasan elit Kemang, dekat pusat kuliner dan sekolah internasional.",
    price: 4500000000, type: "rumah", bedrooms: 4, bathrooms: 3,
    landAreaM2: 250, buildingAreaM2: 200, lat: -6.2625, lng: 106.8133,
    facilities: ["garasi", "kolam", "taman", "ac", "keamanan"], photos: [],
    status: "active", agentName: "Budi Santoso",
  },
  {
    title: "Apartemen 2BR View Kota di Sudirman",
    description: "Apartemen fully furnished di jantung CBD Sudirman, akses MRT & TransJakarta.",
    price: 2800000000, type: "apartemen", bedrooms: 2, bathrooms: 2,
    landAreaM2: 0, buildingAreaM2: 85, lat: -6.225, lng: 106.8028,
    facilities: ["ac", "gym", "kolam", "keamanan", "parkir"], photos: [],
    status: "active", agentName: "Siti Rahayu",
  },
  {
    title: "Ruko 3 Lantai di Kelapa Gading",
    description: "Ruko strategis di boulevard utama Kelapa Gading, cocok untuk kantor/retail.",
    price: 6200000000, type: "ruko", bedrooms: 2, bathrooms: 2,
    landAreaM2: 120, buildingAreaM2: 300, lat: -6.158, lng: 106.908,
    facilities: ["parkir", "gudang", "ac"], photos: [],
    status: "active", agentName: "Agus Wijaya",
  },
  {
    title: "Tanah Kavling Siap Bangun di Cibubur",
    description: "Tanah kavling datar di kawasan berkembang Cibubur, akses tol dekat.",
    price: 1100000000, type: "tanah", bedrooms: 0, bathrooms: 0,
    landAreaM2: 300, buildingAreaM2: 0, lat: -6.36, lng: 106.88,
    facilities: ["pagar", "akses_jalan"], photos: [],
    status: "active", agentName: "Dewi Lestari",
  },
  {
    title: "Rumah Cluster Asri di Bintaro",
    description: "Rumah cluster one-gate system di Bintaro, lingkungan hijau dan aman.",
    price: 2950000000, type: "rumah", bedrooms: 3, bathrooms: 2,
    landAreaM2: 180, buildingAreaM2: 150, lat: -6.28, lng: 106.73,
    facilities: ["garasi", "taman", "keamanan", "ac"], photos: [],
    status: "active", agentName: "Budi Santoso",
  },
  {
    title: "Rumah Joglo Etnik di Sleman",
    description: "Rumah joglo kayu jati dengan pendopo luas, nuansa Jawa yang kental.",
    price: 1850000000, type: "rumah", bedrooms: 4, bathrooms: 2,
    landAreaM2: 400, buildingAreaM2: 220, lat: -7.717, lng: 110.36,
    facilities: ["taman", "garasi", "sumur"], photos: [],
    status: "active", agentName: "Rina Marlina",
  },
  {
    title: "Apartemen Studio Dekat UGM",
    description: "Apartemen studio ideal untuk mahasiswa/pasutri muda, 5 menit ke UGM.",
    price: 950000000, type: "apartemen", bedrooms: 1, bathrooms: 1,
    landAreaM2: 0, buildingAreaM2: 45, lat: -7.77, lng: 110.377,
    facilities: ["ac", "gym", "keamanan", "parkir"], photos: [],
    status: "active", agentName: "Joko Prasetyo",
  },
  {
    title: "Tanah View Merapi di Kaliurang",
    description: "Tanah dengan pemandangan Gunung Merapi, udara sejuk, cocok untuk villa.",
    price: 750000000, type: "tanah", bedrooms: 0, bathrooms: 0,
    landAreaM2: 1000, buildingAreaM2: 0, lat: -7.6, lng: 110.43,
    facilities: ["akses_jalan", "irigasi"], photos: [],
    status: "active", agentName: "Sari Wulandari",
  },
  {
    title: "Ruko Premium di Kawasan Malioboro",
    description: "Ruko premium di jantung wisata Malioboro, traffic pengunjung tinggi.",
    price: 8500000000, type: "ruko", bedrooms: 3, bathrooms: 3,
    landAreaM2: 200, buildingAreaM2: 450, lat: -7.792, lng: 110.366,
    facilities: ["parkir", "gudang", "ac", "keamanan"], photos: [],
    status: "active", agentName: "Rina Marlina",
  },
  {
    title: "Rumah Minimalis di Bantul",
    description: "Rumah minimalis modern di Bantul, dekat kampus dan pusat kota.",
    price: 1250000000, type: "rumah", bedrooms: 3, bathrooms: 2,
    landAreaM2: 150, buildingAreaM2: 120, lat: -7.88, lng: 110.33,
    facilities: ["garasi", "taman", "ac"], photos: [],
    status: "active", agentName: "Joko Prasetyo",
  },
];

async function main() {
  const n = await prisma.property.count();
  if (n > 0) {
    console.log("seed dilewati (sudah ada data)");
    return;
  }
  for (const p of properties) {
    await prisma.property.create({
      data: {
        ...p,
        facilities: JSON.stringify(p.facilities),
        photos: JSON.stringify(p.photos),
      },
    });
  }
  const saved = await prisma.savedSearch.create({
    data: {
      name: "Rumah di Jakarta Selatan < Rp3M",
      centerLat: -6.2443,
      centerLng: 106.7999,
      radiusKm: 10,
      maxPrice: 3000000000,
      types: JSON.stringify(["rumah"]),
      facilities: JSON.stringify([]),
    },
  });
  // evaluasi kecocokan awal untuk data contoh
  const props = await prisma.property.findMany({ where: { status: "active" } });
  let matched = 0;
  for (const p of props) {
    matched += await evaluateMatchesForProperty(prisma, p.id);
  }
  console.log(`seed selesai: ${props.length} properti, 1 saved search, ${matched} notifikasi cocok`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
