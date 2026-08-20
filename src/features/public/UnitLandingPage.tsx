import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  MessageCircle, 
  Video,
  Calendar,
  Clock,
  Menu,
  X,
  BookOpen,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function UnitLandingPage({ unitCode }: { unitCode: string }) {
  const [loading, setLoading] = useState(true);
  const [lembaga, setLembaga] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [berita, setBerita] = useState<any[]>([]);
  const [agenda, setAgenda] = useState<any[]>([]);
  const [fasilitas, setFasilitas] = useState<any[]>([]);
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [unitCode]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // 1. Get Lembaga ID
      const { data: lembagaData } = await supabase
        .from('lembaga')
        .select('*')
        .eq('kode', unitCode)
        .single();
        
      if (!lembagaData) return;
      setLembaga(lembagaData);

      // 2. Fetch all related data concurrently
      const [profileRes, beritaRes, agendaRes, fasilitasesRes] = await Promise.all([
        supabase.from('site_profile').select('*').eq('lembaga_id', lembagaData.id).single(),
        supabase.from('berita').select('*').eq('lembaga_id', lembagaData.id).order('created_at', { ascending: false }).limit(3),
        supabase.from('agenda_kegiatan').select('*').eq('lembaga_id', lembagaData.id).order('tanggal_mulai', { ascending: true }).limit(3),
        supabase.from('fasilitas').select('*').eq('lembaga_id', lembagaData.id).limit(4),
      ]);

      setProfile(profileRes.data || {
        nama_situs: lembagaData.nama,
        deskripsi_singkat: "Selamat datang di website resmi " + lembagaData.nama,
        alamat: "Alamat belum diatur",
        email: "email@contoh.com",
        telepon: "080000000",
      });
      setBerita(beritaRes.data || []);
      setAgenda(agendaRes.data || []);
      setFasilitas(fasilitasesRes.data || []);

    } catch (error) {
      console.error("Error fetching unit data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Theme configuration based on Unit
  const getTheme = () => {
    switch (unitCode) {
      case 'TK':
        return {
          primary: 'rose-500',
          hover: 'rose-600',
          light: 'rose-50',
          bg: 'bg-rose-500',
          text: 'text-rose-500',
          border: 'border-rose-200',
          gradient: 'from-rose-400 to-orange-300',
          logoPath: '/logo-tk.png',
          heroPath: '/hero_pagi.jpg',
          nuansaAnak: true
        };
      case 'SMP':
        return {
          primary: 'blue-600',
          hover: 'blue-700',
          light: 'blue-50',
          bg: 'bg-blue-600',
          text: 'text-blue-600',
          border: 'border-blue-200',
          gradient: 'from-blue-600 to-cyan-500',
          logoPath: '/logo-smp.png',
          heroPath: '/hero_siang.jpg',
          nuansaAnak: false
        };
      case 'SMA':
        return {
          primary: 'indigo-600',
          hover: 'indigo-700',
          light: 'indigo-50',
          bg: 'bg-indigo-600',
          text: 'text-indigo-600',
          border: 'border-indigo-200',
          gradient: 'from-indigo-600 to-violet-500',
          logoPath: '/logo-sma.png',
          heroPath: '/hero_sore.jpg',
          nuansaAnak: false
        };
      case 'PONTREN':
        return {
          primary: 'emerald-600',
          hover: 'emerald-700',
          light: 'emerald-50',
          bg: 'bg-emerald-600',
          text: 'text-emerald-600',
          border: 'border-emerald-200',
          gradient: 'from-emerald-600 to-teal-500',
          logoPath: '/logo-pesantren.png',
          heroPath: '/hero_malam.jpg',
          nuansaAnak: false
        };
      default:
        return {
          primary: 'emerald-600',
          hover: 'emerald-700',
          light: 'emerald-50',
          bg: 'bg-emerald-600',
          text: 'text-emerald-600',
          border: 'border-emerald-200',
          gradient: 'from-emerald-600 to-emerald-400',
          logoPath: '/logo-yayasan.png',
          heroPath: '/hero_pagi.jpg',
          nuansaAnak: false
        };
    }
  };

  const theme = getTheme();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Memuat halaman...</div>;
  }

  if (!lembaga) {
    return <div className="min-h-screen flex items-center justify-center">Lembaga tidak ditemukan.</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-white font-sans">
      
      {/* NAVBAR */}
      <nav className={`fixed w-full z-50 transition-all duration-300 bg-white/80 backdrop-blur-md border-b ${theme.border}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link to={`/${unitCode.toLowerCase()}`} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-current p-0.5 overflow-hidden flex-shrink-0" style={{ borderColor: theme.text }}>
                <img 
                  src={profile?.logo_url || theme.logoPath} 
                  alt="Logo" 
                  className="w-full h-full object-cover rounded-full bg-white" 
                />
              </div>
              <div className="flex flex-col">
                <span className={`font-bold text-xl ${theme.text} leading-none tracking-tight`}>
                  {profile?.nama_situs || lembaga.nama}
                </span>
                <span className="text-xs text-gray-500 font-medium tracking-widest mt-1">YAYASAN MANARUL HIKAM</span>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-6">
              <a href="#profil" className="text-sm font-bold text-gray-600 hover:text-gray-900">Profil</a>
              <a href="#berita" className="text-sm font-bold text-gray-600 hover:text-gray-900">Berita & Agenda</a>
              <a href="#fasilitas" className="text-sm font-bold text-gray-600 hover:text-gray-900">Fasilitas</a>
              
              <div className="flex items-center gap-2 border-l border-gray-200 pl-6 ml-2">
                <Link to="/">
                  <Button variant="ghost" className={`rounded-full px-4 font-bold ${theme.text} hover:bg-gray-100`}>
                    Kembali ke Yayasan
                  </Button>
                </Link>
                <Link to="/login">
                  <Button className={`${theme.bg} hover:${theme.hover} text-white rounded-full px-6 font-bold shadow-sm`}>
                    Login Admin
                  </Button>
                </Link>
              </div>
            </div>

            <button className="md:hidden p-2 text-gray-600" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 pt-2 pb-6 shadow-lg">
            <div className="flex flex-col space-y-4">
              <a href="#profil" className="text-base font-bold text-gray-800 py-2" onClick={() => setMobileMenuOpen(false)}>Profil</a>
              <a href="#berita" className="text-base font-bold text-gray-800 py-2" onClick={() => setMobileMenuOpen(false)}>Berita & Agenda</a>
              <a href="#fasilitas" className="text-base font-bold text-gray-800 py-2" onClick={() => setMobileMenuOpen(false)}>Fasilitas</a>
              
              <div className="border-t border-gray-100 pt-4 flex flex-col gap-3 mt-2">
                <Link to="/" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className={`w-full rounded-full font-bold ${theme.text} border-gray-200`}>
                    Kembali ke Yayasan
                  </Button>
                </Link>
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button className={`w-full rounded-full font-bold text-white ${theme.bg} hover:${theme.hover}`}>
                    Login Admin
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      <main className="flex-grow pt-20">
        
        {/* HERO SECTION */}
        <section className={`relative pt-16 md:pt-24 overflow-hidden ${theme.nuansaAnak ? 'bg-[#fdfbf7]' : 'bg-white'}`}>
          {/* Background Dot Pattern (Top Right) */}
          <div className="absolute top-20 right-4 lg:right-10 p-4 opacity-50 z-0 hidden sm:block">
            <div className="grid grid-cols-4 gap-3">
              {[...Array(32)].map((_, i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full ${theme.bg} opacity-60`}></div>
              ))}
            </div>
          </div>
          
          {/* Mobile Dot Pattern */}
          <div className="absolute top-16 right-0 p-4 opacity-70 z-0 sm:hidden">
            <div className="grid grid-cols-3 gap-2.5">
              {[...Array(21)].map((_, i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full ${theme.bg}`}></div>
              ))}
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-6 sm:px-8 relative z-10 pt-4 lg:pt-12">
            <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
              
              {/* Text Content (Left on Desktop, Top on Mobile) */}
              <div className="w-full lg:w-1/2 flex flex-col justify-center text-left relative z-10">
                {theme.nuansaAnak && (
                  <div className="absolute -top-10 -left-10 w-20 h-20 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse -z-10"></div>
                )}
                
                {/* Badge */}
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${theme.light} mb-6 w-fit border ${theme.border}`}>
                  <div className={`w-2 h-2 rounded-full ${theme.bg}`}></div>
                  <span className={`text-sm font-medium ${theme.text}`}>Penerimaan Siswa Baru Dibuka</span>
                </div>

                {/* Headline */}
                <h1 className={`text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1] mb-1 ${theme.nuansaAnak ? 'font-comic' : ''}`}>
                  Masa Depan Cerah
                </h1>
                <h1 className={`text-4xl md:text-5xl lg:text-6xl font-black ${theme.text} tracking-tight leading-[1.1] mb-6 ${theme.nuansaAnak ? 'font-comic' : ''}`}>
                  Dimulai Dari {lembaga.nama}
                </h1>
                
                {/* Decorative Line */}
                <div className={`w-12 h-1 ${theme.bg} mb-6 rounded-full`}></div>

                {/* Subtitle */}
                <p className="text-base md:text-lg text-gray-500 mb-8 max-w-sm lg:max-w-lg leading-relaxed font-medium">
                  {profile?.deskripsi_singkat || "Kami berkomitmen memberikan pendidikan terbaik yang mengintegrasikan ilmu pengetahuan umum dan nilai-nilai keislaman."}
                </p>
                
                {/* Buttons */}
                <div className="flex flex-row flex-wrap items-center gap-4">
                  <a 
                    href={`https://wa.me/${profile?.telepon?.replace(/[^0-9]/g, '')}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className={`inline-flex items-center justify-center px-5 py-3 text-sm font-semibold rounded-xl text-white ${theme.bg} hover:${theme.hover} transition-all shadow-lg`}
                  >
                    Hubungi Pendaftaran
                    <ArrowRight className="ml-1.5 w-4 h-4" />
                  </a>
                  <a 
                    href="#profil"
                    className="inline-flex items-center justify-center px-5 py-3 text-sm font-semibold rounded-xl text-slate-800 bg-white border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-colors shadow-sm"
                  >
                    Pelajari Lebih Lanjut
                  </a>
                </div>
              </div>

              {/* Image Content - DESKTOP ONLY */}
              <div className="hidden lg:block w-full lg:w-1/2 relative mt-12 lg:mt-0">
                <div className={`absolute inset-0 bg-gradient-to-tr ${theme.gradient} rounded-[2rem] transform rotate-3 opacity-20`}></div>
                
                {/* Round Logo Overlapping */}
                <div className="absolute -top-12 -left-12 z-30">
                  <div className={`w-32 h-32 rounded-full bg-white p-1.5 shadow-2xl flex items-center justify-center overflow-hidden border-4 ${theme.border}`}>
                     <img 
                      src={profile?.logo_url || theme.logoPath} 
                      alt="Logo Lembaga" 
                      className="w-full h-full object-contain rounded-full bg-white p-2"
                    />
                  </div>
                </div>

                <img 
                  src={profile?.foto_url || theme.heroPath} 
                  alt="Hero Image" 
                  className="relative rounded-[2rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] object-cover aspect-[4/3] w-full border-4 border-white"
                />
                {theme.nuansaAnak && (
                  <>
                    <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-70"></div>
                    <div className="absolute -top-6 -right-6 w-16 h-16 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-70"></div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Image & Bottom Section - MOBILE ONLY */}
          <div className="relative mt-12 w-full flex flex-col lg:hidden">
            {/* Custom SVG Curve overlaying the image top */}
            <div className="absolute top-0 left-0 w-full overflow-hidden leading-none z-10 h-16 sm:h-24 -translate-y-[1px]">
              <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-full relative block">
                <path d="M0,120 C300,120 400,0 1200,0 L1200,0 L0,0 Z" fill={theme.nuansaAnak ? '#fdfbf7' : '#ffffff'}></path>
              </svg>
            </div>

            {/* Round Logo Overlapping */}
            <div className="absolute top-12 sm:top-16 left-8 sm:left-16 z-30">
              <div className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-white p-1.5 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.4)] flex items-center justify-center overflow-hidden border-4 border-white`}>
                 <img 
                  src={profile?.logo_url || theme.logoPath} 
                  alt="Logo Lembaga" 
                  className="w-full h-full object-contain rounded-full bg-white p-2"
                />
              </div>
            </div>

            {/* Image Area */}
            <div className="relative w-full" style={{ height: '400px' }}>
              <img 
                src={profile?.foto_url || theme.heroPath} 
                alt="Hero Image" 
                className="w-full h-full object-cover object-center"
              />
            </div>

            {/* Custom SVG Curve for the bottom */}
            <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none z-10 translate-y-[1px]">
              <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className={`w-full h-24 sm:h-32 relative block rotate-180 ${theme.text}`}>
                <path d="M0,120 C400,120 600,0 1200,0 L1200,0 L0,0 Z" fill="currentColor"></path>
              </svg>
            </div>
          </div>

          {/* Dark Area (matches the curve color) */}
          <div className={`relative ${theme.bg} pt-4 pb-12 px-4 sm:px-6 lg:px-8 flex justify-center z-20 lg:mt-24 lg:rounded-t-[3rem]`}>
            {/* The Floating Card equivalent for Units */}
            <div className="w-full max-w-5xl bg-white rounded-3xl p-6 sm:p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] relative -mt-8 sm:-mt-12 lg:-mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <h3 className={`text-2xl font-bold ${theme.text}`}>A</h3>
                <p className="text-xs text-gray-500 mt-1">Akreditasi</p>
              </div>
              <div>
                <h3 className={`text-2xl font-bold ${theme.text}`}>100+</h3>
                <p className="text-xs text-gray-500 mt-1">Siswa Aktif</p>
              </div>
              <div>
                <h3 className={`text-2xl font-bold ${theme.text}`}>20+</h3>
                <p className="text-xs text-gray-500 mt-1">Guru & Staf</p>
              </div>
              <div>
                <h3 className={`text-2xl font-bold ${theme.text}`}>Beragam</h3>
                <p className="text-xs text-gray-500 mt-1">Ekstrakurikuler</p>
              </div>
            </div>
          </div>
        </section>

        {/* PROFIL SECTION */}
        <section id="profil" className={`py-20 ${theme.light}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Profil Lembaga</h2>
              <div className={`w-20 h-1.5 ${theme.bg} rounded-full mx-auto`}></div>
            </div>
            <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-gray-100">
              <p className="text-gray-700 leading-loose text-lg whitespace-pre-line text-center">
                {profile?.deskripsi_lengkap || profile?.deskripsi_singkat || "Profil lembaga belum diatur oleh Admin."}
              </p>
            </div>
          </div>
        </section>

        {/* BERITA & AGENDA SECTION */}
        <section id="berita" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
              
              {/* Berita Column */}
              <div>
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg ${theme.light} flex items-center justify-center`}>
                      <BookOpen className={`w-4 h-4 ${theme.text}`} />
                    </div>
                    Kabar Terbaru
                  </h2>
                </div>
                <div className="space-y-6">
                  {berita.length === 0 ? (
                    <p className="text-gray-500 italic">Belum ada berita yang dipublikasikan.</p>
                  ) : (
                    berita.map((b) => (
                      <div key={b.id} className="group flex gap-4 bg-white border border-gray-100 rounded-2xl p-3 hover:shadow-md transition-all">
                        <div className="w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-gray-100">
                          {b.foto_url && <img src={b.foto_url} alt={b.judul} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
                        </div>
                        <div className="flex flex-col justify-center">
                          <span className={`text-xs font-bold ${theme.text} mb-1`}>
                            {new Date(b.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </span>
                          <h3 className="font-bold text-gray-900 leading-tight group-hover:text-emerald-600 transition-colors line-clamp-2">
                            {b.judul}
                          </h3>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Agenda Column */}
              <div>
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg ${theme.light} flex items-center justify-center`}>
                      <Calendar className={`w-4 h-4 ${theme.text}`} />
                    </div>
                    Agenda Kegiatan
                  </h2>
                </div>
                <div className="space-y-4">
                  {agenda.length === 0 ? (
                    <p className="text-gray-500 italic">Belum ada agenda yang dijadwalkan.</p>
                  ) : (
                    agenda.map((a) => (
                      <div key={a.id} className="flex bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md transition-all group">
                        <div className={`${theme.bg} p-4 flex flex-col items-center justify-center text-white min-w-[80px]`}>
                          <span className="text-xs font-medium uppercase">{new Date(a.tanggal_mulai).toLocaleDateString('id-ID', { month: 'short' })}</span>
                          <span className="text-2xl font-black leading-none my-1">{new Date(a.tanggal_mulai).getDate()}</span>
                        </div>
                        <div className="p-4 flex flex-col justify-center flex-grow">
                          <h3 className="font-bold text-gray-900 mb-1">{a.nama_kegiatan}</h3>
                          <div className="flex items-center text-xs text-gray-500 gap-3">
                            {a.lokasi && (
                              <span className="flex items-center">
                                <MapPin className="w-3 h-3 mr-1" />
                                {a.lokasi}
                              </span>
                            )}
                            <span className="flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {new Date(a.tanggal_mulai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* FASILITAS SECTION */}
        <section id="fasilitas" className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Fasilitas Unggulan</h2>
              <p className="text-gray-600">Dukungan sarana dan prasarana terbaik untuk menunjang kegiatan pembelajaran.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {fasilitas.length === 0 ? (
                <div className="col-span-full text-center text-gray-500 italic">Data fasilitas belum ditambahkan.</div>
              ) : (
                fasilitas.map((f) => (
                  <div key={f.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl transition-all group">
                    <div className="h-48 overflow-hidden bg-gray-100">
                      {f.foto_url ? (
                        <img src={f.foto_url} alt={f.nama_fasilitas} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="font-bold text-gray-900 mb-2">{f.nama_fasilitas}</h3>
                      {f.deskripsi && <p className="text-sm text-gray-600 line-clamp-2">{f.deskripsi}</p>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="bg-gray-900 text-white pt-16 pb-8 border-t-4 border-gray-800" style={{ borderTopColor: theme.nuansaAnak ? '#f43f5e' : undefined }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-12">
            <div className="md:col-span-5">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-lg bg-white p-1 flex items-center justify-center">
                  <img src={profile?.logo_url || theme.logoPath} alt="Logo" className="w-full h-full object-contain" />
                </div>
                <span className="font-bold text-xl text-white">
                  {profile?.nama_situs || lembaga.nama}
                </span>
              </div>
              <p className="text-gray-400 mb-6 leading-relaxed max-w-sm">
                {profile?.deskripsi_singkat || "Berkomitmen mencetak generasi masa depan yang cerdas, berakhlak mulia, dan berprestasi."}
              </p>
              <div className="flex gap-4">
                {profile?.facebook_url && (
                  <a href={profile.facebook_url} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-blue-600 transition-colors">
                    <Globe className="w-4 h-4" />
                  </a>
                )}
                {profile?.instagram_url && (
                  <a href={profile.instagram_url} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-pink-600 transition-colors">
                    <MessageCircle className="w-4 h-4" />
                  </a>
                )}
                {profile?.youtube_url && (
                  <a href={profile.youtube_url} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-red-600 transition-colors">
                    <Video className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
            
            <div className="md:col-span-3">
              <h3 className="font-bold text-lg mb-6 text-white">Tautan Cepat</h3>
              <ul className="space-y-4 text-gray-400">
                <li><a href="#profil" className="hover:text-white transition-colors">Profil Lembaga</a></li>
                <li><a href="#berita" className="hover:text-white transition-colors">Berita & Artikel</a></li>
                <li><a href="#fasilitas" className="hover:text-white transition-colors">Fasilitas</a></li>
              </ul>
            </div>
            
            <div className="md:col-span-4">
              <h3 className="font-bold text-lg mb-6 text-white">Hubungi Kami</h3>
              <ul className="space-y-4 text-gray-400">
                <li className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
                  <span>{profile?.alamat || "Alamat belum diatur"}</span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gray-500 shrink-0" />
                  <span>{profile?.telepon || "-"}</span>
                </li>
                <li className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-500 shrink-0" />
                  <span>{profile?.email || "-"}</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-gray-800 text-center text-gray-500 text-sm">
            <p>&copy; {new Date().getFullYear()} {profile?.nama_situs || lembaga.nama}. Hak Cipta Dilindungi.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
