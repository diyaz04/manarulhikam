import { useState, useEffect } from "react";
import { ArrowRight, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export function LembagaSection() {
  const [activeSpmbs, setActiveSpmbs] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchActiveSpmbs();
  }, []);

  const fetchActiveSpmbs = async () => {
    try {
      const { data, error } = await supabase
        .from('spmb_config')
        .select('*, lembaga:lembaga_id(kode)')
        .eq('aktif', true);

      if (error) throw error;
      
      if (data) {
        const activeMap: Record<string, any> = {};
        data.forEach(conf => {
          if (conf.lembaga && conf.lembaga.kode) {
            activeMap[conf.lembaga.kode.toLowerCase()] = conf;
          }
        });
        // Handle PESANTREN -> PONTREN mapping
        if (activeMap['pontren']) {
          activeMap['pesantren'] = activeMap['pontren'];
        }
        setActiveSpmbs(activeMap);
      }
    } catch (err) {
      console.error("Error fetching active SPMB:", err);
    }
  };

  const lembagaList = [
    {
      id: "tk",
      nama: "TK Manarul Hikam",
      deskripsi: "Pendidikan anak usia dini berbasis karakter dan nilai-nilai Islam.",
      gambar: "https://images.unsplash.com/photo-1587691592099-24045742c181?q=80&w=800&auto=format&fit=crop",
      logo: "/logo-tk.png",
      link: "/tk"
    },
    {
      id: "smp",
      nama: "SMP Manarul Hikam",
      deskripsi: "Sekolah menengah pertama dengan kurikulum terpadu dan pembinaan karakter islami.",
      gambar: "https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=800&auto=format&fit=crop",
      logo: "/logo-smp.png",
      link: "/smp"
    },
    {
      id: "sma",
      nama: "SMA Manarul Hikam",
      deskripsi: "Sekolah menengah atas dengan fokus pada akademik, karakter, dan keterampilan.",
      gambar: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=800&auto=format&fit=crop",
      logo: "/logo-sma.png",
      link: "/sma"
    },
    {
      id: "pesantren",
      nama: "Pondok Pesantren Manarul Hikam",
      deskripsi: "Pendidikan pesantren modern untuk membentuk generasi ulul albab.",
      gambar: "https://images.unsplash.com/photo-1585036156171-384164a8c675?q=80&w=800&auto=format&fit=crop",
      logo: "/logo-pesantren.png",
      link: "/pesantren"
    }
  ];

  return (
    <section id="lembaga" className="py-20 bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Lembaga di Bawah Yayasan</h2>
          <div className="w-16 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 mx-auto rounded-full"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {lembagaList.map((lembaga) => {
            const spmbConfig = activeSpmbs[lembaga.id];

            return (
            <div key={lembaga.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all group flex flex-col h-full mt-10">
              
              <div className="relative h-40 rounded-t-2xl bg-gray-200">
                <img 
                  src={lembaga.gambar} 
                  alt={lembaga.nama} 
                  className="w-full h-full object-cover rounded-t-2xl"
                />
                
                {/* Logo Bulat Overlap */}
                <div className="absolute -bottom-10 inset-x-0 flex justify-center z-20">
                  <div className="w-20 h-20 bg-white rounded-full p-1 shadow-md border border-gray-100">
                     <img 
                      src={lembaga.logo} 
                      alt={`Logo ${lembaga.nama}`} 
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                </div>
              </div>
              
              <div className="pt-14 pb-6 px-6 flex flex-col flex-grow text-center">
                <h3 className="text-lg font-bold text-gray-900 mb-2">{lembaga.nama}</h3>
                <p className="text-gray-600 text-sm mb-6 flex-grow leading-relaxed">
                  {lembaga.deskripsi}
                </p>

                {/* Tampilkan tombol SPMB jika aktif */}
                {spmbConfig && (
                  <div className="mb-4 pt-4 border-t border-gray-100">
                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">
                      Pendaftaran Dibuka!
                    </p>
                    <Link 
                      to={`/spmb/${lembaga.id.toUpperCase()}`}
                      className="w-full inline-flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 text-sm font-semibold shadow-sm transition-colors"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Daftar Sekarang
                    </Link>
                  </div>
                )}

                <Link 
                  to={lembaga.link}
                  className="inline-flex items-center justify-center text-emerald-600 font-semibold text-sm hover:text-emerald-700 transition-colors"
                >
                  Lihat Info Lembaga
                  <ArrowRight className="ml-1.5 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          )})}
        </div>
      </div>
    </section>
  );
}
