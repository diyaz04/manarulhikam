import { useState, useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  FileText,
  Calendar,
  Settings,
  LogOut,
  Menu,
  X,
  Home,
  School,
  MapPin,
  Wallet,
  Receipt,
  FileCheck2,
  Bell,
  CreditCard,
  Users,
  ClipboardList,
  BadgeDollarSign,
  UserCheck,
  GraduationCap,
  Edit3,
  UserCircle,
  Camera
} from "lucide-react";

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, roles, activeRole, setActiveRole, signOut } = useAuth();
  const location = useLocation();
  const [currentDate, setCurrentDate] = useState("");

  const [pendingCount, setPendingCount] = useState(0);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    const formatter = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
    setCurrentDate(formatter.format(new Date()));
  }, []);

  const isYayasan = activeRole?.lembaga.kode === 'YAYASAN';

  // Fetch Logo
  useEffect(() => {
    if (activeRole?.lembaga_id) {
      supabase
        .from('site_profile')
        .select('logo_url')
        .eq('lembaga_id', activeRole.lembaga_id)
        .single()
        .then(({ data }) => {
          if (data?.logo_url) setLogoUrl(data.logo_url);
        });
    }
  }, [activeRole]);

  useEffect(() => {
    if (isYayasan) {
      if (location.pathname === '/dashboard/yayasan/verifikasi') {
        localStorage.setItem('last_seen_verifikasi', new Date().toISOString());
        setPendingCount(0);
      } else {
        const fetchPending = async () => {
          const lastSeen = localStorage.getItem('last_seen_verifikasi') || '1970-01-01T00:00:00.000Z';
          const { count } = await supabase
            .from('payments')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'PENDING')
            .gt('created_at', lastSeen);
          setPendingCount(count || 0);
        };

        fetchPending();

        const channel = supabase.channel('payments_changes')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'payments' }, fetchPending)
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }
    }
  }, [isYayasan, location.pathname]);

  const [teacherAccess, setTeacherAccess] = useState<string[]>([]);

  useEffect(() => {
    if (activeRole?.role === 'GURU' && user) {
      supabase
        .from('teachers')
        .select('akses')
        .eq('user_id', user.id)
        .eq('lembaga_id', activeRole.lembaga_id)
        .single()
        .then(({ data }) => {
          if (data?.akses) setTeacherAccess(data.akses);
        });
    }
  }, [activeRole, user]);

  const sidebarGroups = isYayasan ? [
    {
      title: "MENU UTAMA",
      items: [
        { name: "Dashboard Yayasan", href: "/dashboard", icon: LayoutDashboard },
        { name: "Laporan & Verifikasi", href: "/dashboard/yayasan/verifikasi", icon: FileCheck2 },
        { name: "Keuangan Umum", href: "/dashboard/yayasan/keuangan", icon: Wallet },
        { name: "Tagihan Siswa", href: "/dashboard/yayasan/tagihan", icon: Receipt },
        { name: "Konfigurasi Rekening", href: "/dashboard/yayasan/rekening", icon: CreditCard },
      ]
    },
    {
      title: "MASTER & PENGATURAN",
      items: [
        { name: "Data Master (Unit)", href: "/dashboard/yayasan/lembaga", icon: School },
        { name: "Profil Yayasan", href: "/dashboard/yayasan/profil", icon: Home },
        { name: "Konfig Tagihan", href: "/dashboard/yayasan/tagihan-config", icon: Settings },
        { name: "Berita & Artikel", href: "/dashboard/yayasan/berita", icon: FileText },
        { name: "Agenda Kegiatan", href: "/dashboard/yayasan/agenda", icon: Calendar },
        { name: "Fasilitas Umum", href: "/dashboard/yayasan/fasilitas", icon: MapPin },
      ]
    }
  ] : (() => {
    const isGuru = activeRole?.role === 'GURU';
    const unitCode = activeRole?.lembaga.kode;
    const isSMP = unitCode === 'SMP';

    if (isGuru) {
      const akademikItems = [
        { name: "Absen Kedatangan", href: "/dashboard/guru/kedatangan", icon: Camera },
        { name: "Isi Agenda & Absen", href: "/dashboard/guru/agenda", icon: ClipboardList },
      ];
      
      if (teacherAccess.includes('JADWAL')) {
        akademikItems.push({ name: "Jadwal Saya", href: "/dashboard/guru/jadwal", icon: Calendar });
      }
      
      if (teacherAccess.includes('KEHADIRAN_SISWA')) {
        akademikItems.push({ name: "Rekap Kehadiran Siswa", href: "/dashboard/guru/rekap-siswa", icon: Users });
      }

      return [
        {
          title: "MENU UTAMA",
          items: [
            { name: "Beranda Guru", href: "/dashboard", icon: LayoutDashboard },
          ]
        },
        {
          title: "AKADEMIK & KBM",
          items: akademikItems
        },
        {
          title: "PENGATURAN",
          items: [
            { name: "Pengaturan Akun", href: "/dashboard/pengaturan", icon: Settings },
          ]
        }
      ];
    }

    const groups = [
      {
        title: "MENU UTAMA",
        items: [
          { name: "Dashboard Unit", href: "/dashboard", icon: LayoutDashboard },
        ]
      },
      {
        title: "DATA & AKADEMIK",
        items: [
          { name: "Data Siswa/Santri", href: "/dashboard/unit/siswa", icon: Users },
          { name: "Data Alumni", href: "/dashboard/unit/alumni", icon: GraduationCap },
          { name: "Data Guru/Ustadz", href: "/dashboard/unit/guru", icon: Users },
          { name: "Jadwal & Agenda", href: "/dashboard/unit/jadwal", icon: Calendar },
        ]
      },
    ];

    // Absensi & Kepegawaian — hanya untuk SMP (Admin)
    if (isSMP) {
      groups.push({
        title: "ABSENSI & KEPEGAWAIAN",
        items: [
          { name: "Monitoring Agenda", href: "/dashboard/unit/monitoring-agenda", icon: Calendar },
          { name: "Input Agenda Susulan", href: "/dashboard/unit/input-agenda", icon: ClipboardList },
          { name: "Verifikasi Kedatangan", href: "/dashboard/unit/verifikasi-kedatangan", icon: Camera },
          { name: "Verifikasi Absensi", href: "/dashboard/unit/absensi", icon: FileCheck2 },
          { name: "Kehadiran Siswa", href: "/dashboard/unit/kehadiran-siswa", icon: UserCheck },
          { name: "Hitung Gaji Guru", href: "/dashboard/unit/penggajian", icon: BadgeDollarSign },
        ]
      });
    }

    groups.push(
      {
        title: "INFORMASI & HUMAS",
        items: [
          { name: "SPMB (Pendaftaran)", href: "/dashboard/unit/spmb", icon: ClipboardList },
          { name: "Berita Unit", href: "/dashboard/yayasan/berita", icon: FileText },
          { name: "Agenda Unit", href: "/dashboard/yayasan/agenda", icon: Calendar },
          { name: "Fasilitas Unit", href: "/dashboard/yayasan/fasilitas", icon: MapPin },
        ]
      },
      {
        title: "PENGATURAN",
        items: [
          { name: "Pengaturan Sistem", href: "/dashboard/unit/pengaturan-sistem", icon: Settings },
          { name: "Profil Lembaga", href: "/dashboard/unit/profil", icon: Home },
          { name: "Pengaturan Akun", href: "/dashboard/pengaturan", icon: Settings },
        ]
      }
    );

    return groups;
  })();

  const handleSignOut = async () => {
    await signOut();
  };

  const SidebarItem = ({ item }: { item: any }) => {
    const isActive = location.pathname === item.href;
    return (
      <Link
        to={item.href}
        className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
          isActive 
            ? "bg-emerald-50 text-emerald-600 shadow-sm" 
            : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
        }`}
        onClick={() => setSidebarOpen(false)}
      >
        <div className="flex items-center gap-2.5">
          <item.icon className={`w-4 h-4 shrink-0 ${isActive ? "text-emerald-500" : "text-gray-400"}`} />
          {item.name}
        </div>
        {item.badge > 0 && (
          <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  const getDefaultLogo = () => {
    if (isYayasan) return '/logo-yayasan.png';
    const code = activeRole?.lembaga.kode;
    if (code === 'TK') return '/logo-tk.png';
    if (code === 'SMP') return '/logo-smp.png';
    if (code === 'SMA') return '/logo-sma.png';
    if (code === 'PONTREN') return '/logo-pesantren.png';
    return '/logo-yayasan.png';
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-sm lg:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Clean White Style */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-100 flex flex-col transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}`}
      >
        {/* Sidebar Header / Logo */}
        <div className="h-24 flex items-center px-8 border-b border-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-emerald-500 overflow-hidden flex-shrink-0 bg-white p-0.5 shadow-sm">
              <img src={logoUrl || getDefaultLogo()} alt="Logo" className="w-full h-full object-cover rounded-full" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm text-emerald-950 leading-tight tracking-tight">
                {isYayasan ? "Yayasan Manarul Hikam" : activeRole?.lembaga.nama}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-emerald-600 font-bold mt-0.5">
                {isYayasan ? "Dashboard Yayasan" : `Dashboard ${activeRole?.lembaga.kode}`}
              </span>
            </div>
          </div>
          <button className="lg:hidden ml-auto text-gray-400 hover:text-gray-600" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Navigation Menus */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8 no-scrollbar">
          
          {sidebarGroups.map((group, idx) => (
            <div key={idx}>
              <p className="px-4 text-[11px] font-bold text-gray-400 tracking-wider mb-3">{group.title}</p>
              <div className="space-y-1.5">
                {group.items.map((item) => <SidebarItem key={item.name} item={item} />)}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Profile & Logout */}
        <div className="border-t border-gray-100 p-4">
          <div className="flex items-center gap-3 px-2 py-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center shrink-0">
              {user?.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="font-semibold text-gray-600">{user?.user_metadata?.full_name?.charAt(0) || "U"}</span>
              )}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-gray-900 truncate">{user?.user_metadata?.full_name || "User"}</p>
              <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">{activeRole?.role}</p>
            </div>
          </div>
          <Button variant="outline" className="w-full justify-center text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100 rounded-xl" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* Top Header */}
        <header className="h-14 md:h-20 bg-[#f8fafc]/80 backdrop-blur-md flex items-center justify-between px-3 sm:px-8 z-30 sticky top-0">
          <div className="flex items-center gap-2 md:gap-4">
            <button 
              className="lg:hidden p-1.5 rounded-lg bg-white border shadow-sm text-gray-600"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-4 h-4" />
            </button>
            <h1 className="lg:hidden text-sm font-bold tracking-tight text-gray-900 uppercase">
               {isYayasan ? 'YAYASAN' : activeRole?.lembaga.kode}
            </h1>
            <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-blue-50/50 rounded-full border border-blue-100/50">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-medium text-blue-700">{currentDate}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 rounded-full bg-white border border-gray-100 shadow-sm text-gray-400 hover:text-emerald-500 transition-colors relative">
                  <Bell className="w-5 h-5 md:w-4 md:h-4" />
                  {pendingCount > 0 && (
                    <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 border border-white text-[9px] font-bold text-white shadow-sm">
                      {pendingCount > 9 ? '9+' : pendingCount}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 p-4 rounded-xl shadow-lg border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <Bell className="w-4 h-4 text-emerald-600" />
                  <h4 className="font-bold text-sm text-gray-900">Notifikasi Baru</h4>
                </div>
                {pendingCount > 0 ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                      <p className="text-sm text-emerald-800 font-medium">Ada <span className="font-bold text-red-600">{pendingCount} pembayaran</span> yang perlu segera diverifikasi.</p>
                    </div>
                    <Link to="/dashboard/yayasan/verifikasi" className="block w-full">
                      <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-xs shadow-sm h-9">
                        Buka Halaman Verifikasi
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    Belum ada notifikasi baru.
                  </p>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 bg-white md:pl-4 md:pr-1.5 md:py-1.5 p-0.5 rounded-full border border-gray-100 shadow-sm hover:bg-gray-50 transition-colors focus:outline-none">
                  <div className="hidden md:block text-right">
                    <p className="text-xs font-bold text-gray-900 leading-tight">{user?.user_metadata?.full_name || "User"}</p>
                    <p className="text-[10px] text-gray-500 capitalize">{activeRole?.role.replace('_', ' ').toLowerCase()}</p>
                  </div>
                  <div className="w-9 h-9 md:w-8 md:h-8 rounded-full bg-emerald-100 overflow-hidden flex items-center justify-center shrink-0">
                    {user?.user_metadata?.avatar_url ? (
                      <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-bold text-emerald-700 text-sm md:text-xs">{user?.user_metadata?.full_name?.charAt(0) || "U"}</span>
                    )}
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-lg mt-1 border-gray-100 p-2">
                
                {/* Mobile Info */}
                <div className="md:hidden px-2 py-3 border-b border-gray-100 mb-2">
                  <p className="text-sm font-bold text-gray-900">{user?.user_metadata?.full_name || "User"}</p>
                  <p className="text-xs text-gray-500">{activeRole?.lembaga.nama}</p>
                </div>

                {roles.length > 1 && (
                  <>
                    <DropdownMenuLabel className="text-xs text-gray-500">Ganti Role / Lembaga</DropdownMenuLabel>
                    {roles.map((r, i) => (
                      <DropdownMenuItem 
                        key={i} 
                        className={`cursor-pointer rounded-lg mb-1 ${activeRole?.lembaga_id === r.lembaga_id && activeRole?.role === r.role ? 'bg-emerald-50 text-emerald-700' : ''}`}
                        onClick={() => setActiveRole(r)}
                      >
                        <div className="flex flex-col">
                           <span className="font-medium">{r.lembaga.nama}</span>
                          <span className="text-xs opacity-70">{r.role}</span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator className="my-2" />
                  </>
                )}
                
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600 hover:text-red-700 focus:text-red-700 focus:bg-red-50 rounded-lg cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" />
                  <span className="font-medium">Logout Akun</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto px-3 sm:px-8 pb-24 lg:pb-12 pt-2">
          <Outlet context={{ pendingCount }} />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      {(() => {
        const isGuru = activeRole?.role === 'GURU';
        const unitCode = activeRole?.lembaga.kode;
        const isSmp = unitCode === 'SMP';

        const bottomItems: ({ label: string; href: string; icon: any; badge?: number } | null)[] = isYayasan ? [
          { label: "Beranda", href: "/dashboard", icon: LayoutDashboard },
          { label: "Verifikasi", href: "/dashboard/yayasan/verifikasi", icon: FileCheck2, badge: pendingCount },
          null, // placeholder for center MENU button
          { label: "Keuangan", href: "/dashboard/yayasan/keuangan", icon: Wallet },
          { label: "Profil", href: "/dashboard/yayasan/profil", icon: UserCircle },
        ] : isGuru ? [
          { label: "Beranda", href: "/dashboard/guru", icon: LayoutDashboard },
          { label: "Isi Agenda", href: "/dashboard/guru/agenda", icon: Edit3 },
          null,
          teacherAccess.includes('JADWAL') ? { label: "Jadwal", href: "/dashboard/guru/jadwal", icon: Calendar } : (teacherAccess.includes('KEHADIRAN_SISWA') ? { label: "Rekap", href: "/dashboard/guru/rekap-siswa", icon: Users } : { label: "Beranda", href: "/dashboard/guru", icon: LayoutDashboard }),
          { label: "Profil", href: "/dashboard/pengaturan", icon: UserCircle },
        ] : isSmp ? [
          { label: "Beranda", href: "/dashboard", icon: LayoutDashboard },
          { label: "Agenda", href: "/dashboard/unit/monitoring-agenda", icon: Calendar },
          null,
          { label: "Gaji Guru", href: "/dashboard/unit/penggajian", icon: BadgeDollarSign },
          { label: "Profil", href: "/dashboard/unit/profil", icon: UserCircle },
        ] : [
          { label: "Guru", href: "/dashboard/unit/guru", icon: Users },
          { label: "SPMB", href: "/dashboard/unit/spmb", icon: ClipboardList },
        ];

        return (
          <nav className="lg:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 z-40 flex items-center justify-between px-2 py-1 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] pb-safe">
            {bottomItems.map((item) => {
              if (item === null) {
                // Center MENU button
                return (
                  <div key="menu-center" className="relative -top-5 flex flex-col items-center justify-center">
                    <button 
                      onClick={() => setSidebarOpen(true)}
                      className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-500/40 border-4 border-[#f8fafc] active:scale-95 transition-transform"
                    >
                      <Menu className="w-6 h-6" />
                    </button>
                    <span className="text-[10px] font-bold text-emerald-700 mt-1">MENU</span>
                  </div>
                );
              }

              const isActive = location.pathname === item.href;
              return (
                <Link 
                  key={item.href} 
                  to={item.href} 
                  className={`flex flex-col items-center justify-center w-16 h-14 relative ${isActive ? 'text-emerald-600' : 'text-gray-400 hover:text-emerald-500'}`}
                >
                  <div className="relative">
                    <item.icon className="w-5 h-5 mb-1" />
                    {item.badge && item.badge > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 border border-white text-[8px] font-bold text-white"></span>
                    )}
                  </div>
                  <span className="text-[9px] font-semibold">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        );
      })()}

    </div>
  );
}
