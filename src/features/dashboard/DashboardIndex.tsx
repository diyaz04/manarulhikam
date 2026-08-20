import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Link, Navigate, useOutletContext } from "react-router-dom";
import { 
  Users, Search, Wallet, Receipt, FileCheck2, Settings, School,
  FileText, CreditCard, CheckCircle2,
  Clock, AlertTriangle, UserX, BookOpen, Loader2
} from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

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
    emoji: "☀️"
  });

  const [stats, setStats] = useState({
    siswa: 0,
    guru: 0,
    siswaTidakHadir: 0,
    agendaTotal: 0,
    agendaTerisi: 0,
    agendaTerlambat: 0,
    agendaTepatWaktu: 0,
    agendaPending: 0
  });
  const [loadingStats, setLoadingStats] = useState(false);
  
  const isYayasan = activeRole?.lembaga.kode === 'YAYASAN';

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 18 || hour < 4) {
      setGreeting("Selamat Malam");
      setBannerConfig({ bg: "from-indigo-900 via-slate-800 to-indigo-950", img: "/hero_malam.jpg", emoji: "🌙" });
    } else if (hour >= 15) {
      setGreeting("Selamat Sore");
      setBannerConfig({ bg: "from-orange-50 via-orange-50 to-orange-100", img: "/hero_sore.jpg", emoji: "🌅" });
    } else if (hour >= 11) {
      setGreeting("Selamat Siang");
      setBannerConfig({ bg: "from-sky-50 via-white to-sky-100", img: "/hero_siang.jpg", emoji: "🌤️" });
    } else {
      setGreeting("Selamat Pagi");
      setBannerConfig({ bg: "from-blue-50 via-blue-50 to-amber-50", img: "/hero_pagi.jpg", emoji: "☀️" });
    }
  }, []);

  useEffect(() => {
    if (!isYayasan && activeRole?.lembaga_id) {
      fetchStats();
    }
  }, [isYayasan, activeRole]);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const lId = activeRole!.lembaga_id;
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const dayNames = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const todayName = dayNames[today.getDay()];

      const { data: yearData } = await supabase
        .from('academic_years')
        .select('id')
        .eq('lembaga_id', lId)
        .eq('is_active', true)
        .single();

      const academicYearId = yearData?.id;

      const { count: countSiswa } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('lembaga_id', lId);
      const { count: countGuru } = await supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('lembaga_id', lId);

      let countAgendaTotal = 0;
      if (academicYearId) {
        const { count } = await supabase.from('schedules')
          .select('*', { count: 'exact', head: true })
          .eq('lembaga_id', lId)
          .eq('academic_year_id', academicYearId)
          .eq('hari', todayName);
        countAgendaTotal = count || 0;
      }

      const { data: agendaData } = await supabase
        .from('agenda_mengajar')
        .select('id, status, status_kehadiran_guru')
        .eq('lembaga_id', lId)
        .eq('tanggal', todayStr);

      const agendaTerisi = agendaData?.length || 0;
      const agendaPending = agendaData?.filter(a => a.status === 'PENDING').length || 0;
      const agendaTerlambat = agendaData?.filter(a => a.status_kehadiran_guru === 'TERLAMBAT').length || 0;
      const agendaTepatWaktu = agendaData?.filter(a => a.status_kehadiran_guru === 'TEPAT_WAKTU').length || 0;

      let siswaTidakHadir = 0;
      if (agendaData && agendaData.length > 0) {
        const agendaIds = agendaData.map(a => a.id);
        const { data: absensiData } = await supabase
          .from('absensi_siswa')
          .select('id, status')
          .in('agenda_id', agendaIds)
          .neq('status', 'HADIR');
        siswaTidakHadir = absensiData?.length || 0;
      }

      setStats({
        siswa: countSiswa || 0,
        guru: countGuru || 0,
        siswaTidakHadir,
        agendaTotal: countAgendaTotal,
        agendaTerisi,
        agendaTerlambat,
        agendaTepatWaktu,
        agendaPending
      });

    } catch (error) {
      console.error("Error fetching stats", error);
    } finally {
      setLoadingStats(false);
    }
  };

  const menuUtama = isYayasan ? [
    { name: "Verifikasi Pembayaran", icon: FileCheck2, features: "Perlu Verifikasi", href: "/dashboard/yayasan/verifikasi", badge: pendingCount },
    { name: "Data Siswa/Santri", icon: Users, features: "Master Data Siswa", href: "/dashboard/yayasan/siswa" },
    { name: "Keuangan Umum", icon: Wallet, features: "Laporan & Jurnal Kas", href: "/dashboard/yayasan/keuangan" },
    { name: "Kelola Tagihan", icon: Receipt, features: "Daftar Tagihan & Siswa", href: "/dashboard/yayasan/tagihan" },
    { name: "Konfigurasi Rekening", icon: CreditCard, features: "Daftar Bank Yayasan", href: "/dashboard/yayasan/rekening" },
    { name: "Master Data", icon: School, features: "Kelola Unit & Lembaga", href: "/dashboard/yayasan/lembaga" },
    { name: "Manajemen Konten Web", icon: FileText, features: "Berita, Agenda, Profil", href: "/dashboard/yayasan/berita" },
    { name: "Pengaturan Sistem", icon: Settings, features: "Konfigurasi Tagihan", href: "/dashboard/yayasan/tagihan-config" },
  ] : [];

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Hero Banner */}
      <div className={`relative w-full rounded-2xl overflow-hidden bg-gradient-to-r ${bannerConfig.bg} p-6 sm:p-8 min-h-[160px] md:min-h-[180px] flex items-center shadow-sm border border-gray-100/50 transition-all duration-1000`}>
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
        <div className="absolute right-0 bottom-0 h-full w-[60%] md:w-[50%] overflow-hidden flex select-none pointer-events-none [mask-image:linear-gradient(to_right,transparent_0%,black_35%)] -webkit-[mask-image:linear-gradient(to_right,transparent_0%,black_35%)]">
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

      {isYayasan ? (
        <>
          <div className="relative w-full shadow-sm rounded-xl bg-white border border-gray-100">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input 
              className="w-full h-11 pl-10 pr-4 rounded-xl border-none bg-transparent text-sm placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0" 
              placeholder="Cari menu atau layanan di sini..." 
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
            {menuUtama.map((menu, idx) => (
              <Link key={idx} to={menu.href} className="block transition-transform active:scale-[0.995]">
                <div className="flex flex-row items-center justify-start bg-white border border-gray-100 p-3 rounded-2xl hover:bg-emerald-50/30 hover:border-emerald-200 transition-colors cursor-pointer shadow-sm h-full">
                  <div className="flex flex-row items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex shrink-0 items-center justify-center text-emerald-600 relative">
                      <menu.icon className="w-5 h-5" />
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
        </>
      ) : (
        <div className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border border-gray-100 shadow-sm bg-white overflow-hidden rounded-2xl relative group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                <Users className="w-16 h-16" />
              </div>
              <CardContent className="p-6">
                <p className="text-sm font-semibold text-gray-500 mb-1">Total Siswa</p>
                {loadingStats ? <Loader2 className="w-6 h-6 animate-spin text-gray-400" /> : <h3 className="text-3xl font-black text-slate-800">{stats.siswa}</h3>}
              </CardContent>
            </Card>
            
            <Card className="border border-gray-100 shadow-sm bg-white overflow-hidden rounded-2xl relative group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                <School className="w-16 h-16" />
              </div>
              <CardContent className="p-6">
                <p className="text-sm font-semibold text-gray-500 mb-1">Total Guru</p>
                {loadingStats ? <Loader2 className="w-6 h-6 animate-spin text-gray-400" /> : <h3 className="text-3xl font-black text-slate-800">{stats.guru}</h3>}
              </CardContent>
            </Card>
            
            <Card className="border border-red-100 shadow-sm bg-red-50/30 overflow-hidden rounded-2xl relative group">
              <div className="absolute top-0 right-0 p-4 opacity-10 text-red-600 group-hover:scale-110 transition-transform">
                <UserX className="w-16 h-16" />
              </div>
              <CardContent className="p-6">
                <p className="text-sm font-semibold text-red-600/80 mb-1">Siswa Absen (Hari ini)</p>
                {loadingStats ? <Loader2 className="w-6 h-6 animate-spin text-red-400" /> : <h3 className="text-3xl font-black text-red-600">{stats.siswaTidakHadir}</h3>}
              </CardContent>
            </Card>
          </div>

          <Card className="border border-emerald-100 shadow-sm bg-emerald-50/30 overflow-hidden rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-emerald-900">Agenda & KBM Guru Hari Ini</h2>
                  <p className="text-sm text-emerald-600/80">Pantau progres pengisian agenda mengajar harian.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-emerald-200/50">
                <div className="py-2 sm:py-0 px-2">
                  <p className="text-[11px] font-bold text-emerald-600 mb-1 uppercase tracking-wider">Target Agenda</p>
                  {loadingStats ? <Loader2 className="w-5 h-5 animate-spin text-emerald-400" /> : <p className="text-2xl font-black text-emerald-950">{stats.agendaTotal}</p>}
                </div>
                <div className="py-2 sm:py-0 sm:px-4">
                  <p className="text-[11px] font-bold text-emerald-600 mb-1 uppercase tracking-wider">Sudah Terisi</p>
                  {loadingStats ? <Loader2 className="w-5 h-5 animate-spin text-emerald-400" /> : <p className="text-2xl font-black text-emerald-700">{stats.agendaTerisi}</p>}
                </div>
                <div className="py-2 sm:py-0 sm:px-4">
                  <p className="text-[11px] font-bold text-emerald-600 mb-1 uppercase tracking-wider flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Tepat Waktu</p>
                  {loadingStats ? <Loader2 className="w-5 h-5 animate-spin text-emerald-400" /> : <p className="text-2xl font-black text-emerald-600">{stats.agendaTepatWaktu}</p>}
                </div>
                <div className="py-2 sm:py-0 sm:px-4">
                  <p className="text-[11px] font-bold text-orange-600 mb-1 uppercase tracking-wider flex items-center gap-1"><Clock className="w-3 h-3" /> Terlambat</p>
                  {loadingStats ? <Loader2 className="w-5 h-5 animate-spin text-orange-400" /> : <p className="text-2xl font-black text-orange-600">{stats.agendaTerlambat}</p>}
                </div>
                <div className="py-2 sm:py-0 sm:px-4">
                  <p className="text-[11px] font-bold text-amber-600 mb-1 uppercase tracking-wider flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Verifikasi</p>
                  {loadingStats ? <Loader2 className="w-5 h-5 animate-spin text-amber-400" /> : <p className="text-2xl font-black text-amber-600">{stats.agendaPending}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
