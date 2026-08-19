import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export function BeritaSection() {
  const beritaList = [
    {
      id: 1,
      judul: "Siswa SMA Manarul Hikam Raih Prestasi di Olimpiade Sains Nasional 2024",
      excerpt: "Alhamdulillah, siswa SMA Manarul Hikam meraih medali emas pada bidang Matematika tingkat nasional...",
      tanggal: "20 Mei 2024",
      gambar: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=400&auto=format&fit=crop",
    },
    {
      id: 2,
      judul: "Kegiatan Pesantren Kilat Ramadhan 1445 H",
      excerpt: "Rangkaian kegiatan pesantren kilat di bulan Ramadhan berjalan dengan penuh semangat dan keberkahan...",
      tanggal: "15 Mei 2024",
      gambar: "https://images.unsplash.com/photo-1512858117071-ee3650c831a1?q=80&w=400&auto=format&fit=crop",
    },
    {
      id: 3,
      judul: "Wisuda Tahfidz SMP Manarul Hikam Angkatan ke-5",
      excerpt: "Sebanyak 50 siswa SMP Manarul Hikam berhasil menyelesaikan hafalan Al-Qur'an juz 30 dalam wisuda tahfidz...",
      tanggal: "10 Mei 2024",
      gambar: "https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?q=80&w=400&auto=format&fit=crop",
    }
  ];

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Berita Terbaru</h2>
        <Link 
          to="/berita"
          className="inline-flex items-center text-emerald-600 font-bold hover:text-emerald-700 transition-colors text-sm"
        >
          Lihat Semua
          <ArrowRight className="ml-1 w-4 h-4" />
        </Link>
      </div>

      <div className="space-y-4">
        {beritaList.map((berita) => (
          <article key={berita.id} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100 flex p-3 gap-4 items-center">
            <div className="w-24 h-24 sm:w-32 sm:h-24 rounded-lg overflow-hidden shrink-0 bg-gray-100">
              <img 
                src={berita.gambar} 
                alt={berita.judul} 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col flex-grow py-1">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1 line-clamp-2 leading-snug">
                {berita.judul}
              </h3>
              <span className="text-xs text-gray-400 mb-1.5 font-medium">{berita.tanggal}</span>
              <p className="text-gray-600 text-xs sm:text-sm line-clamp-2">
                {berita.excerpt}
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
