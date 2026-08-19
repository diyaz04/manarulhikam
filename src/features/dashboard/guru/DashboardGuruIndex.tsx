import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar, Clock, BookOpen, Users } from "lucide-react";
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

  if (loading) return <div className="p-8 text-center text-gray-500">Memuat dashboard...</div>;

  const hasAkses = (key: string) => teacher?.akses?.includes(key);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Welcome Banner */}
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
              Selamat datang di Portal Guru {activeRole?.lembaga.nama}. Mari kita mulai hari ini dengan semangat berbagi ilmu.
            </p>
          </div>
        </div>
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <BookOpen className="w-40 h-40" />
        </div>
      </div>

      {/* Quick Access Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        
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

        {hasAkses('KEHADIRAN_SISWA') && (
          <Link to="/dashboard/guru/rekap-siswa" className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center gap-3 hover:shadow-md transition-all group cursor-pointer">
            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Rekap Siswa</p>
              <p className="text-[10px] text-gray-500">Laporan kehadiran</p>
            </div>
          </Link>
        )}
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
