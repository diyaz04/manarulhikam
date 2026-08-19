import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link, Navigate } from "react-router-dom";
import { 
  Users, 
  Search, 
  ChevronRight, 
  Wallet, 
  Receipt, 
  FileCheck2, 
  Settings, 
  School,
  FileText,
  CreditCard,
  Calendar,
  ClipboardList,
  Home
} from "lucide-react";
import { useEffect, useState } from "react";

import { useOutletContext } from "react-router-dom";

export function DashboardIndex() {
  const { user, activeRole } = useAuth();
  
  if (activeRole?.role === 'GURU') {
    return <Navigate to="/dashboard/guru" replace />;
  }

  const { pendingCount } = useOutletContext<{ pendingCount: number }>();
  const [greeting, setGreeting] = useState("Selamat Pagi");
  const [bannerConfig, setBannerConfig] = useState({
    bg: "from-blue-50 via-blue-50 to-amber-50",
    img: "/hero_pagi.jpg",
    emoji: "🌅"
  });

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 18 || hour < 4) {
      setGreeting("Selamat Malam");
      setBannerConfig({ bg: "from-indigo-900 via-slate-800 to-indigo-950", img: "/hero_malam.jpg", emoji: "🌙" });
    } else if (hour >= 15) {
      setGreeting("Selamat Sore");
      setBannerConfig({ bg: "from-orange-50 via-orange-50 to-orange-100", img: "/hero_sore.jpg", emoji: "🌥️" });
    } else if (hour >= 11) {
      setGreeting("Selamat Siang");
      setBannerConfig({ bg: "from-sky-50 via-white to-sky-100", img: "/hero_siang.jpg", emoji: "☀️" });
    } else {
      setGreeting("Selamat Pagi");
      setBannerConfig({ bg: "from-blue-50 via-blue-50 to-amber-50", img: "/hero_pagi.jpg", emoji: "🌅" });
    }
  }, []);

  const isYayasan = activeRole?.lembaga.kode === 'YAYASAN';

  const menuUtama = isYayasan ? [
    { name: "Verifikasi Pembayaran", icon: FileCheck2, features: "Perlu Verifikasi", href: "/dashboard/yayasan/verifikasi", badge: pendingCount },
    { name: "Data Siswa/Santri", icon: Users, features: "Master Data Siswa", href: "/dashboard/yayasan/siswa" },
    { name: "Keuangan Umum", icon: Wallet, features: "Laporan & Jurnal Kas", href: "/dashboard/yayasan/keuangan" },
    { name: "Kelola Tagihan", icon: Receipt, features: "Daftar Tagihan & Siswa", href: "/dashboard/yayasan/tagihan" },
    { name: "Konfigurasi Rekening", icon: CreditCard, features: "Daftar Bank Yayasan", href: "/dashboard/yayasan/rekening" },
    { name: "Master Data", icon: School, features: "Kelola Unit & Lembaga", href: "/dashboard/yayasan/lembaga" },
    { name: "Manajemen Konten Web", icon: FileText, features: "Berita, Agenda, Profil", href: "/dashboard/yayasan/berita" },
    { name: "Pengaturan Sistem", icon: Settings, features: "Konfigurasi Tagihan", href: "/dashboard/yayasan/tagihan-config" },
  ] : [
    { name: "Data Siswa/Santri", icon: Users, features: "Kelola Data Siswa Unit", href: "/dashboard/unit/siswa" },
    { name: "Data Guru/Ustadz", icon: Users, features: "Kelola Data Pendidik", href: "/dashboard/unit/guru" },
    { name: "Jadwal & Agenda", icon: Calendar, features: "Jadwal Mengajar", href: "/dashboard/unit/jadwal" },
    { name: "SPMB (Pendaftaran)", icon: ClipboardList, features: "Sistem Penerimaan", href: "/dashboard/unit/spmb" },
    { name: "Profil Lembaga", icon: Home, features: "Informasi & Medsos", href: "/dashboard/unit/profil" },
    { name: "Konten Publik", icon: FileText, features: "Berita & Agenda", href: "/dashboard/yayasan/berita" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      
      {/* Hero Banner */}
      <div className={`relative w-full rounded-2xl overflow-hidden bg-gradient-to-r ${bannerConfig.bg} p-6 sm:p-8 min-h-[160px] md:min-h-[180px] flex items-center shadow-sm border border-gray-100/50 transition-all duration-1000`}>
        
        {/* Decorative Shapes for warmth */}
        <div className={`absolute top-0 right-0 w-[400px] h-full bg-gradient-to-l ${greeting === "Selamat Malam" ? 'from-black/40' : 'from-white/60'} to-transparent pointer-events-none`}></div>

        <div className="relative z-10 max-w-[55%]">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-lg">{bannerConfig.emoji}</span>
            <span className={`text-xs font-semibold tracking-wide ${greeting === "Selamat Malam" ? 'text-indigo-200' : 'text-gray-600'}`}>{greeting},</span>
          </div>
          <h1 className={`text-2xl sm:text-3xl font-black mb-2 tracking-tight leading-tight ${greeting === "Selamat Malam" ? 'text-white' : 'text-slate-900'}`}>
            {user?.user_metadata?.full_name || "Admin"}.
          </h1>
          <p className={`text-[11px] sm:text-xs mb-4 max-w-sm leading-relaxed ${greeting === "Selamat Malam" ? 'text-indigo-200' : 'text-slate-600'}`}>
            Semoga hari ini penuh berkah dan kemudahan dalam mengelola sistem terpadu {activeRole?.lembaga.nama || "Yayasan"}.
          </p>
          
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 backdrop-blur-sm rounded-lg border ${greeting === "Selamat Malam" ? 'bg-indigo-950/50 border-indigo-500/30' : 'bg-white/50 border-white/50'}`}>
            <div className={`w-6 h-6 rounded-md flex items-center justify-center shadow-inner ${greeting === "Selamat Malam" ? 'bg-indigo-500 text-white' : 'bg-emerald-500 text-white'}`}>
              <Users className="w-3 h-3" />
            </div>
            <div>
              <p className={`text-[8px] font-bold uppercase tracking-widest ${greeting === "Selamat Malam" ? 'text-indigo-300' : 'text-emerald-800'}`}>Akses Akun</p>
              <p className={`text-[10px] font-black capitalize leading-none ${greeting === "Selamat Malam" ? 'text-white' : 'text-slate-900'}`}>{activeRole?.role.replace('_', ' ').toLowerCase() || "Administrator"}</p>
            </div>
          </div>
        </div>

        {/* 3D Illustration overlapping the right edge with a smooth gradient fade */}
        <div className="absolute right-0 bottom-0 h-full w-[60%] md:w-[50%] overflow-hidden flex select-none pointer-events-none [mask-image:linear-gradient(to_right,transparent_0%,black_35%)] -webkit-[mask-image:linear-gradient(to_right,transparent_0%,black_35%)]">
           {/* Fallback to online image if local is not available yet to avoid broken image during dev */}
          <img 
            src={bannerConfig.img} 
            alt="Welcome Illustration" 
            className={`w-full h-full object-cover object-[center_15%] md:object-[center_20%] mix-blend-multiply opacity-95 transition-opacity duration-1000 ${greeting === "Selamat Malam" ? 'mix-blend-normal' : ''}`}
            onError={(e) => {
              e.currentTarget.src = "https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&q=80&w=600&h=400";
            }}
          />
        </div>
      </div>

      {/* Global Search */}
      <div className="relative w-full shadow-sm rounded-xl bg-white border border-gray-100">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input 
          className="w-full h-11 pl-10 pr-4 rounded-xl border-none bg-transparent text-sm placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0" 
          placeholder="Cari menu atau layanan di sini..." 
        />
      </div>

      {/* Menu Cards List */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
        {menuUtama.map((menu, idx) => (
          <Link key={idx} to={menu.href} className="block transition-transform active:scale-[0.995]">
            <div className="flex flex-row items-center justify-start bg-white border border-gray-100 p-3 rounded-2xl hover:bg-emerald-50/30 hover:border-emerald-200 transition-colors cursor-pointer shadow-sm h-full">
              
              <div className="flex flex-row items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex shrink-0 items-center justify-center text-emerald-600 relative">
                  <menu.icon className="w-5 h-5" />
                  {/* Badge */}
                  {menu.badge ? (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-white shadow-sm">
                      {menu.badge > 9 ? '9+' : menu.badge}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-col text-left overflow-hidden">
                  <h3 className="font-bold text-gray-900 text-xs sm:text-sm truncate">{menu.name}</h3>
                  <p className="text-[10px] text-gray-500 font-medium truncate">{menu.features}</p>
                </div>
              </div>

            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
