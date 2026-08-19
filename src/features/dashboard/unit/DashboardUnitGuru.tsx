import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Loader2, Plus, AlertCircle, Edit, Trash2, Users, KeyRound, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface Teacher {
  id: string;
  nama: string;
  nip: string | null;
  jabatan: string;
  status: string;
  email: string | null;
  user_id: string | null;
  akses: string[] | null; // ['ABSENSI', 'JADWAL', 'SISWA', etc.]
  created_at: string;
}

// Daftar akses yang bisa diberikan ke guru SMP
const AKSES_OPTIONS = [
  { key: "ABSENSI", label: "Absensi (Selfie & GPS)", desc: "Bisa melakukan presensi harian" },
  { key: "JADWAL", label: "Lihat Jadwal", desc: "Melihat jadwal mengajar pribadi" },
  { key: "KEHADIRAN_SISWA", label: "Kehadiran Siswa", desc: "Mengelola rekap kehadiran siswa" },
];

export function DashboardUnitGuru() {
  const { activeRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  const isSMP = activeRole?.lembaga.kode === 'SMP';

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    nama: "",
    nip: "",
    jabatan: "Guru",
    status: "AKTIF",
    email: "",
    password: "",
    akses: ["ABSENSI", "JADWAL"] as string[], // Default akses
  });

  useEffect(() => {
    if (activeRole?.lembaga_id) {
      fetchTeachers();
    }
  }, [activeRole]);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .eq('lembaga_id', activeRole!.lembaga_id)
        .order('nama', { ascending: true });

      if (error) throw error;
      setTeachers(data || []);
    } catch (err: any) {
      console.error("Error fetching teachers:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama) return;

    try {
      setIsSubmitting(true);
      setSubmitError("");
      
      if (editingId) {
        // Update guru
        const updatePayload: any = {
          nama: formData.nama,
          nip: formData.nip,
          jabatan: formData.jabatan,
          status: formData.status,
        };

        // Kalau SMP, simpan juga akses
        if (isSMP) {
          updatePayload.akses = formData.akses;
        }

        const { error } = await supabase
          .from('teachers')
          .update(updatePayload)
          .eq('id', editingId)
          .eq('lembaga_id', activeRole!.lembaga_id);

        if (error) throw error;
      } else {
        // INSERT guru baru
        let userId = null;

        // Jika SMP dan email+password diisi, buat akun auth
        if (isSMP && formData.email && formData.password) {
          const cleanEmail = formData.email.trim();
          
          // Simpan sesi Admin saat ini
          const { data: currentSessionData } = await supabase.auth.getSession();
          const currentSession = currentSessionData.session;

          // 1. Buat user di auth.users via Supabase GoTrue resmi
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: cleanEmail,
            password: formData.password,
            options: {
              data: {
                full_name: formData.nama,
                role: 'GURU',
              }
            }
          });

          // Langsung kembalikan sesi Admin sebelum melakukan hal lain
          if (currentSession) {
            await supabase.auth.setSession({
              access_token: currentSession.access_token,
              refresh_token: currentSession.refresh_token
            });
          }

          if (authError) {
            if (authError.message.includes('already registered') || authError.message.includes('already been registered')) {
              console.warn('Email sudah terdaftar di auth, lanjutkan insert teacher saja.');
            } else {
              throw new Error("Gagal membuat akun: " + authError.message);
            }
          } else {
            userId = authData.user?.id;

            // 2. Masukkan ke tabel users
            if (userId) {
              const { error: userError } = await supabase.from('users').upsert([{
                id: userId,
                full_name: formData.nama,
              }], { onConflict: 'id' });
              
              if (userError) throw new Error("Gagal membuat profil user: " + userError.message);

              // 3. Assign role GURU di lembaga SMP
              const { error: roleError } = await supabase.from('user_roles').insert([{
                user_id: userId,
                lembaga_id: activeRole!.lembaga_id,
                role: 'GURU',
              }]);
              
              if (roleError) throw new Error("Gagal menugaskan role: " + roleError.message);
            }
          }
        }

        const insertPayload: any = {
          lembaga_id: activeRole!.lembaga_id,
          nama: formData.nama,
          nip: formData.nip,
          jabatan: formData.jabatan,
          status: formData.status,
        };

        if (isSMP) {
          insertPayload.email = formData.email ? formData.email.trim() : null;
          insertPayload.user_id = userId;
          insertPayload.akses = formData.akses;
        }

        const { error } = await supabase
          .from('teachers')
          .insert([insertPayload]);

        if (error) throw error;
      }

      await fetchTeachers();
      closeModal();
    } catch (err: any) {
      setSubmitError(err.message || "Gagal menyimpan data guru");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data guru/ustadz ini? Akun login dan jadwal yang terkait juga akan ikut terhapus.")) return;
    
    try {
      // 1. Ambil user_id guru sebelum dihapus (untuk hapus auth)
      const { data: teacher } = await supabase
        .from('teachers')
        .select('user_id')
        .eq('id', id)
        .single();

      // 2. Hapus data guru dari tabel teachers
      const { error } = await supabase
        .from('teachers')
        .delete()
        .eq('id', id)
        .eq('lembaga_id', activeRole!.lembaga_id);
        
      if (error) throw error;

      // 3. Jika guru punya akun auth, hapus juga dari auth & user_roles
      if (teacher?.user_id) {
        await supabase.from('user_roles').delete().eq('user_id', teacher.user_id);
        await supabase.from('users').delete().eq('id', teacher.user_id);
        await supabase.rpc('delete_auth_user', { target_user_id: teacher.user_id });
      }

      fetchTeachers();
    } catch (err: any) {
      alert("Gagal menghapus: " + err.message);
    }
  };

  const openEditModal = (teacher: Teacher) => {
    setEditingId(teacher.id);
    setFormData({
      nama: teacher.nama,
      nip: teacher.nip || "",
      jabatan: teacher.jabatan,
      status: teacher.status,
      email: teacher.email || "",
      password: "", // Tidak tampilkan password lama
      akses: teacher.akses || ["ABSENSI", "JADWAL"],
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({
      nama: "",
      nip: "",
      jabatan: "Guru",
      status: "AKTIF",
      email: "",
      password: "",
      akses: ["ABSENSI", "JADWAL"],
    });
    setSubmitError("");
    setShowPassword(false);
  };

  const toggleAkses = (key: string) => {
    setFormData(prev => ({
      ...prev,
      akses: prev.akses.includes(key) 
        ? prev.akses.filter(a => a !== key) 
        : [...prev.akses, key]
    }));
  };

  const filteredTeachers = teachers.filter(t => 
    t.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (t.nip && t.nip.includes(searchQuery)) ||
    t.jabatan.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.email && t.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Data Guru & Ustadz</h2>
          <p className="text-gray-500 text-sm mt-1">
            Kelola data tenaga pendidik khusus di unit {activeRole?.lembaga.nama}.
            {isSMP && <span className="text-emerald-600 font-medium"> • Bisa mendaftarkan akun guru</span>}
          </p>
        </div>
        
        <Dialog open={isModalOpen} onOpenChange={(open) => { if (!open) closeModal(); else setIsModalOpen(true); }}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 shadow-sm rounded-xl px-5 h-11 w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Pendidik
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[520px] rounded-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Data Pendidik" : "Tambah Pendidik Baru"}</DialogTitle>
              <DialogDescription>
                {isSMP 
                  ? "Isi detail informasi dan buat akun login untuk guru SMP."
                  : "Isi detail informasi guru/ustadz di bawah ini."
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              {submitError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{submitError}</p>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="nama">Nama Lengkap (beserta gelar) <span className="text-red-500">*</span></Label>
                <Input id="nama" placeholder="Misal: Ust. Fulan, S.Pd." value={formData.nama} onChange={e => setFormData({...formData, nama: e.target.value})} required />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="nip">NIP / NUPTK (Opsional)</Label>
                <Input id="nip" placeholder="Nomor Induk Pegawai" value={formData.nip} onChange={e => setFormData({...formData, nip: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="jabatan">Jabatan <span className="text-red-500">*</span></Label>
                  <Input id="jabatan" placeholder="Misal: Guru, Wali Kelas" value={formData.jabatan} onChange={e => setFormData({...formData, jabatan: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select 
                    id="status"
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="AKTIF">Aktif</option>
                    <option value="NON-AKTIF">Non-Aktif</option>
                  </select>
                </div>
              </div>

              {/* === SECTION AKUN LOGIN — Khusus SMP === */}
              {isSMP && (
                <>
                  <div className="border-t border-gray-100 pt-4 mt-2">
                    <div className="flex items-center gap-2 mb-3">
                      <KeyRound className="w-4 h-4 text-blue-600" />
                      <h4 className="text-sm font-bold text-gray-900">Akun Login Guru</h4>
                      {editingId && formData.email && (
                        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none text-[10px]">Sudah Terdaftar</Badge>
                      )}
                    </div>
                    {editingId && formData.email ? (
                      <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg border border-dashed border-gray-200">
                        Akun email <span className="font-mono font-bold text-gray-700">{formData.email}</span> sudah terdaftar. Untuk reset password, gunakan fitur lupa password di halaman login.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="email">Email Login</Label>
                          <Input 
                            id="email" 
                            type="email" 
                            placeholder="guru@manarulhikam.sch.id" 
                            value={formData.email} 
                            onChange={e => setFormData({...formData, email: e.target.value})} 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="password">Password Awal</Label>
                          <div className="relative">
                            <Input 
                              id="password" 
                              type={showPassword ? "text" : "password"} 
                              placeholder="Minimal 6 karakter" 
                              value={formData.password} 
                              onChange={e => setFormData({...formData, password: e.target.value})}
                              minLength={6}
                            />
                            <button 
                              type="button" 
                              onClick={() => setShowPassword(!showPassword)} 
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          <p className="text-[11px] text-gray-400">Guru bisa mengganti password sendiri setelah login pertama kali.</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* === SECTION HAK AKSES === */}
                  <div className="border-t border-gray-100 pt-4 mt-2">
                    <div className="flex items-center gap-2 mb-3">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <h4 className="text-sm font-bold text-gray-900">Hak Akses Fitur</h4>
                    </div>
                    <div className="space-y-2">
                      {AKSES_OPTIONS.map(opt => (
                        <label 
                          key={opt.key} 
                          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                            formData.akses.includes(opt.key) 
                              ? 'bg-emerald-50 border-emerald-200' 
                              : 'bg-gray-50/50 border-gray-100 hover:bg-gray-50'
                          }`}
                        >
                          <Checkbox 
                            checked={formData.akses.includes(opt.key)} 
                            onCheckedChange={() => toggleAkses(opt.key)} 
                            className="mt-0.5"
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                            <p className="text-[11px] text-gray-500">{opt.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={closeModal} className="rounded-xl">Batal</Button>
                <Button type="submit" disabled={isSubmitting} className="rounded-xl bg-emerald-600 hover:bg-emerald-700">
                  {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : "Simpan Data"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-gray-100 shadow-sm overflow-hidden rounded-2xl">
        <CardHeader className="bg-white border-b pb-4">
          <div className="flex flex-col sm:flex-row justify-between gap-4 items-center">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              Daftar Guru / Ustadz
            </CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input 
                placeholder="Cari nama, NIP, atau email..." 
                className="pl-9 bg-gray-50 border-none focus-visible:ring-1 focus-visible:ring-emerald-500 rounded-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-emerald-600">
              <Loader2 className="w-8 h-8 animate-spin mb-2" />
              <p className="text-sm font-medium text-gray-500">Memuat data...</p>
            </div>
          ) : filteredTeachers.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Belum ada data guru/ustadz yang ditambahkan.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead className="w-[250px] pl-6">Nama & NIP</TableHead>
                    <TableHead>Jabatan</TableHead>
                    {isSMP && <TableHead>Akun & Akses</TableHead>}
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right pr-6">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeachers.map((teacher) => (
                    <TableRow key={teacher.id} className="hover:bg-emerald-50/30 transition-colors">
                      <TableCell className="pl-6">
                        <p className="font-semibold text-gray-900">{teacher.nama}</p>
                        {teacher.nip && <p className="text-xs text-gray-500 font-mono mt-0.5">NIP: {teacher.nip}</p>}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-gray-700">{teacher.jabatan}</p>
                      </TableCell>
                      {isSMP && (
                        <TableCell>
                          {teacher.email ? (
                            <div>
                              <p className="text-xs font-mono text-blue-700 bg-blue-50 inline-block px-2 py-0.5 rounded-md">{teacher.email}</p>
                              {teacher.akses && teacher.akses.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {teacher.akses.map(a => (
                                    <Badge key={a} className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-none text-[9px] font-bold px-1.5 py-0">{a}</Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Belum punya akun</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge className={`${
                          teacher.status === 'AKTIF' ? 'bg-green-100 text-green-700 hover:bg-green-100' :
                          'bg-gray-100 text-gray-700 hover:bg-gray-100'
                        } border-none font-bold text-[10px]`}>
                          {teacher.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEditModal(teacher)} className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(teacher.id)} className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
