import { BookOpen, Monitor, Presentation, Tent, Utensils, Wheat } from "lucide-react"; // Using generic icons for fasilitas

export function FasilitasSection() {
  const fasilitasList = [
    {
      id: 1,
      nama: "Masjid",
      icon: <Tent className="w-5 h-5 text-white" />,
      gambar: "https://images.unsplash.com/photo-1564683214965-3619addd900d?q=80&w=800&auto=format&fit=crop",
    },
    {
      id: 2,
      nama: "Perpustakaan",
      icon: <BookOpen className="w-5 h-5 text-white" />,
      gambar: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=800&auto=format&fit=crop",
    },
    {
      id: 3,
      nama: "Laboratorium",
      icon: <Presentation className="w-5 h-5 text-white" />,
      gambar: "https://images.unsplash.com/photo-1516321497487-e288fb19713f?q=80&w=800&auto=format&fit=crop",
    },
    {
      id: 4,
      nama: "Ruang Kelas",
      icon: <Presentation className="w-5 h-5 text-white" />,
      gambar: "https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=800&auto=format&fit=crop",
    },
    {
      id: 5,
      nama: "Lapangan Olahraga",
      icon: <Wheat className="w-5 h-5 text-white" />,
      gambar: "https://images.unsplash.com/photo-1526232761682-d26e03ac148e?q=80&w=800&auto=format&fit=crop",
    },
    {
      id: 6,
      nama: "Ruang Komputer",
      icon: <Monitor className="w-5 h-5 text-white" />,
      gambar: "https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?q=80&w=800&auto=format&fit=crop",
    }
  ];

  return (
    <section id="fasilitas" className="py-20 bg-gray-50/50 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Fasilitas Yayasan</h2>
          <div className="w-16 h-1 bg-emerald-600 mx-auto rounded-full"></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {fasilitasList.map((fasilitas) => (
            <div key={fasilitas.id} className="group relative rounded-xl overflow-hidden aspect-[4/3] bg-gray-200 border border-gray-100 shadow-sm">
              <img 
                src={fasilitas.gambar} 
                alt={fasilitas.nama} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              
              {/* Banner Hijau di Bawah */}
              <div className="absolute bottom-4 left-4 right-4 bg-emerald-800/95 backdrop-blur-sm rounded-lg p-3 flex items-center gap-3 shadow-lg transform translate-y-2 opacity-90 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                <div className="p-1.5 border border-emerald-600/50 rounded-md bg-emerald-700/50 shrink-0">
                  {fasilitas.icon}
                </div>
                <h3 className="text-white font-semibold text-sm">
                  {fasilitas.nama}
                </h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
