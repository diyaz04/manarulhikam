import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { formatNamaLembaga } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar, Clock, BookOpen, Users, Camera } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function DashboardGuruIndex() {
  const { activeRole, user } = useAuth();
  const [teacher, setTeacher] = useState<any>(null);
  const [todaySchedule, setTodaySchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeRole?.lembaga_id && user?.id) {
      fetchDashboardData();
    }
  }, [activeRole, user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // 1. Get teacher data to know their ID
      const { data: teacherData } = await supabase
        .from('teachers')
        .select('*')
        .eq('user_id', user!.id)
        .eq('lembaga_id', activeRole!.lembaga_id)
        .single();
        
      setTeacher(teacherData);

      if (teacherData) {
        // 2. Get today's day name
        const days = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const todayName = days[new Date().getDay()];

        // 3. Get active academic year
        const { data: yearData } = await supabase
          .from('academic_years')
          .select('id')
          .eq('lembaga_id', activeRole!.lembaga_id)
          .eq('is_active', true)
          .single();

        if (yearData) {
          // 4. Get today's schedule
          const { data: scheduleData } = await supabase
            .from('schedules')
            .select('*')
            .eq('teacher_id', teacherData.id)
            .eq('academic_year_id', yearData.id)
            .eq('hari', todayName)
            .order('jam_ke_mulai', { ascending: true });
            
          setTodaySchedule(scheduleData || []);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const [greeting, setGreeting] = useState("Selamat Pagi");
  const [bannerConfig, setBannerConfig] = useState({
    bg: "from-blue-50 via-blue-50 to-amber-50",
    emoji: "☀️"
  });

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 18 || hour < 4) {
      setGreeting("Selamat Malam");
      setBannerConfig({ bg: "from-indigo-900 via-slate-800 to-indigo-950", emoji: "🌙" });
    } else if (hour >= 15) {
      setGreeting("Selamat Sore");
      setBannerConfig({ bg: "from-orange-50 via-orange-50 to-orange-100", emoji: "🌅" });
    } else if (hour >= 11) {
      setGreeting("Selamat Siang");
      setBannerConfig({ bg: "from-sky-50 via-white to-sky-100", emoji: "🌤️" });
    } else {
      setGreeting("Selamat Pagi");
      setBannerConfig({ bg: "from-blue-50 via-blue-50 to-amber-50", emoji: "☀️" });
    }
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500">Memuat dashboard...</div>;

  const hasAkses = (key: string) => teacher?.akses?.includes(key);

  const teacherName = teacher?.nama || user?.user_metadata?.full_name || "Guru";
  
  // Simple heuristic for Indonesian names to guess gender since it's not in DB yet
  const isFemale = (name: string) => {
    if (!name) return false;
    const n = name.toLowerCase();
    const femaleKeywords = ['siti ', 'nur ', 'ayu ', 'putri', 'dewi', 'sri ', 'nita', 'rini', 'yuli', 'sari', 'fitri', 'aisyah', 'fatimah', 'endang', 'ani ', 'indah', 'lestari', 'mega', 'rina', 'wahyuni', 'wulandari', 'ibu ', 'ustadzah'];
    return femaleKeywords.some(kw => n.includes(kw));
  };

  const isPerempuan = isFemale(teacherName);
  const heroImg = isPerempuan ? "/guru_perempuan_teknologi.jpg" : "/guru_laki_teknologi.jpg";

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {activeRole?.role === 'GURU' ? (
        <div className={`relative w-full rounded-2xl overflow-hidden bg-gradient-to-r ${bannerConfig.bg} p-6 sm:p-8 min-h-[160px] md:min-h-[180px] flex items-center shadow-sm border border-gray-100/50 transition-all duration-1000`}>
          {/* Decorative Shapes */}
          <div className={`absolute top-0 right-0 w-[400px] h-full bg-gradient-to-l ${greeting === "Selamat Malam" ? 'from-black/40' : 'from-white/60'} to-transparent pointer-events-none`}></div>

          <div className="relative z-10 max-w-[55%]">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-lg">{bannerConfig.emoji}</span>
              <span className={`text-xs font-semibold tracking-wide ${greeting === "Selamat Malam" ? 'text-indigo-200' : 'text-gray-600'}`}>{greeting},</span>
            </div>
            <h1 className={`text-2xl sm:text-3xl font-black mb-2 tracking-tight leading-tight ${greeting === "Selamat Malam" ? 'text-white' : 'text-slate-900'}`}>
              {teacherName}.
            </h1>
            <p className={`text-[11px] sm:text-xs mb-4 max-w-sm leading-relaxed ${greeting === "Selamat Malam" ? 'text-indigo-200' : 'text-slate-600'}`}>
              Selamat datang di Portal Guru {formatNamaLembaga(activeRole?.lembaga.nama)}. Mari kita mulai hari ini dengan semangat berbagi ilmu.
            </p>
            
            <div className="flex flex-wrap gap-3">
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 backdrop-blur-sm rounded-lg border ${greeting === "Selamat Malam" ? 'bg-indigo-950/50 border-indigo-500/30' : 'bg-white/50 border-white/50'}`}>
                <div className={`w-6 h-6 rounded-md flex items-center justify-center shadow-inner ${greeting === "Selamat Malam" ? 'bg-indigo-500 text-white' : 'bg-emerald-500 text-white'}`}>
                  <Users className="w-3 h-3" />
                </div>
                <div>
                  <p className={`text-[8px] font-bold uppercase tracking-widest ${greeting === "Selamat Malam" ? 'text-indigo-300' : 'text-emerald-800'}`}>Akses Akun</p>
                  <p className={`text-[10px] font-black capitalize leading-none ${greeting === "Selamat Malam" ? 'text-white' : 'text-slate-900'}`}>Guru</p>
                </div>
              </div>

              {teacher?.wali_kelas_dari && (
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 backdrop-blur-sm rounded-lg border ${greeting === "Selamat Malam" ? 'bg-indigo-950/50 border-indigo-500/30' : 'bg-white/50 border-white/50'}`}>
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center shadow-inner ${greeting === "Selamat Malam" ? 'bg-indigo-500 text-white' : 'bg-amber-500 text-white'}`}>
                    <BookOpen className="w-3 h-3" />
                  </div>
                  <div>
                    <p className={`text-[8px] font-bold uppercase tracking-widest ${greeting === "Selamat Malam" ? 'text-indigo-300' : 'text-amber-800'}`}>Wali Kelas</p>
                    <p className={`text-[10px] font-black capitalize leading-none ${greeting === "Selamat Malam" ? 'text-white' : 'text-slate-900'}`}>{teacher.wali_kelas_dari}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3D Illustration overlapping the right edge */}
          <div className="absolute right-0 bottom-0 h-full w-[60%] md:w-[50%] overflow-hidden flex select-none pointer-events-none [mask-image:linear-gradient(to_right,transparent_0%,black_35%)] -webkit-[mask-image:linear-gradient(to_right,transparent_0%,black_35%)]">
            <img 
              src={heroImg} 
              alt="Welcome Illustration" 
              className={`w-full h-full object-cover object-[center_15%] md:object-[center_20%] mix-blend-multiply opacity-95 transition-opacity duration-1000 ${greeting === "Selamat Malam" ? 'mix-blend-normal' : ''}`}
            />
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-800 rounded-3xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-4 md:gap-6">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-emerald-400/30 overflow-hidden bg-emerald-700 shrink-0 shadow-inner">
              {user?.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="w-full h-full flex items-center justify-center font-bold text-3xl text-emerald-100">
                  {user?.user_metadata?.full_name?.charAt(0) || teacher?.nama?.charAt(0) || "G"}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1.5">Ahlan wa Sahlan, {teacher?.nama || user?.user_metadata?.full_name}!</h1>
              <p className="text-emerald-50 text-sm md:text-base opacity-90 max-w-xl">
                Selamat datang di Portal Guru {formatNamaLembaga(activeRole?.lembaga.nama)}. Mari kita mulai hari ini dengan semangat berbagi ilmu.
              </p>
            </div>
          </div>
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <BookOpen className="w-40 h-40" />
          </div>
        </div>
      )}

      {/* Quick Access Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        
        <Link to="/dashboard/guru/kedatangan" className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center gap-3 hover:shadow-md transition-all group cursor-pointer">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Camera className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">Kedatangan</p>
            <p className="text-[10px] text-gray-500">Absen Selfie / Lokasi</p>
          </div>
        </Link>
        
        <Link to="/dashboard/guru/agenda" className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center gap-3 hover:shadow-md transition-all group cursor-pointer">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center group-hover:scale-110 transition-transform">
            <BookOpen className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">Isi Agenda</p>
            <p className="text-[10px] text-gray-500">& Absen Siswa</p>
          </div>
        </Link>

        {hasAkses('JADWAL') && (
          <Link to="/dashboard/guru/jadwal" className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center gap-3 hover:shadow-md transition-all group cursor-pointer">
            <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Jadwal Saya</p>
              <p className="text-[10px] text-gray-500">Jadwal mengajar full</p>
            </div>
          </Link>
        )}

        <Link to="/dashboard/guru/rekap-siswa" className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center gap-3 hover:shadow-md transition-all group cursor-pointer">
          <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Users className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">Rekap Siswa</p>
            <p className="text-[10px] text-gray-500">Laporan kehadiran</p>
          </div>
        </Link>
      </div>

      {/* Today's Schedule */}
      <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
        <CardHeader className="bg-gray-50 border-b border-gray-100 pb-4">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-600" />
            Jadwal Mengajar Hari Ini
          </CardTitle>
          <CardDescription>
            Jadwal Anda untuk hari {new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {todaySchedule.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-900 font-bold">Alhamdulillah, tidak ada jadwal</p>
              <p className="text-sm text-gray-500 mt-1">Anda tidak memiliki jadwal mengajar di kelas pada hari ini.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {todaySchedule.map((s, idx) => (
                <div key={idx} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase">Jam Ke</span>
                      <span className="text-lg font-black text-emerald-900 leading-none">{s.jam_ke_mulai}</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-base">{s.mata_pelajaran}</h4>
                      <p className="text-sm text-gray-500 font-medium mt-0.5">Kelas: <span className="text-emerald-600 font-bold">{s.kelas}</span></p>
                    </div>
                  </div>
                  <Link to="/dashboard/guru/agenda">
                    <Button variant="outline" size="sm" className="rounded-full text-xs font-semibold hover:bg-emerald-50 hover:text-emerald-700 border-gray-200">
                      Isi Agenda
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
