import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { formatNamaLembaga } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Calendar, Plus, Clock, Trash2, Power, AlertCircle, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type AcademicYear = {
  id: string;
  nama: string;
  is_active: boolean;
  tanggal_mulai: string;
  tanggal_selesai: string | null;
};

type Holiday = {
  id: string;
  nama: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  academic_year_id: string;
};

type JamPelajaran = {
  id?: string;
  lembaga_id: string;
  jam_ke: number;
  waktu_mulai: string;
  waktu_selesai: string;
};

export default function DashboardUnitPengaturanSistem() {
  const { activeRole } = useAuth();
  const [activeTab, setActiveTab] = useState<"TAHUN_AJARAN" | "HARI_LIBUR" | "AGENDA_KEHADIRAN">("TAHUN_AJARAN");
  
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isYearModalOpen, setIsYearModalOpen] = useState(false);
  const [isJamModalOpen, setIsJamModalOpen] = useState(false);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [yearForm, setYearForm] = useState({ nama: "", tanggal_mulai: "", tanggal_selesai: "" });
  const [holidayForm, setHolidayForm] = useState({ nama: "", tanggal_mulai: "", tanggal_selesai: "", academic_year_id: "" });
  
  // Jam Pelajaran form states
  const [, setSelectedYearId] = useState<string | null>(null);
  const [jamPelajaranList, setJamPelajaranList] = useState<JamPelajaran[]>([]);
  const [jamKeForm, setJamKeForm] = useState({ jam_ke: 1, waktu_mulai: "07:00", waktu_selesai: "07:45" });

  // Agenda config states
  const [toleransiMenit, setToleransiMenit] = useState(30);

  useEffect(() => {
    if (activeRole) {
      fetchAcademicYears();
      fetchAgendaConfig();
    }
  }, [activeRole]);

  const fetchAgendaConfig = async () => {
    try {
      const { data } = await supabase
        .from('agenda_configs')
        .select('toleransi_menit')
        .eq('lembaga_id', activeRole!.lembaga_id)
        .single();
      
      if (data) {
        setToleransiMenit(data.toleransi_menit);
      }
    } catch (err) {
      console.error("No config yet", err);
    }
  };

  const handleSaveAgendaConfig = async () => {
    try {
      setIsSubmitting(true);
      const { error } = await supabase
        .from('agenda_configs')
        .upsert([{
          lembaga_id: activeRole!.lembaga_id,
          toleransi_menit: toleransiMenit
        }], { onConflict: 'lembaga_id' });
        
      if (error) throw error;
      alert("Konfigurasi agenda berhasil disimpan!");
    } catch (err: any) {
      alert("Gagal menyimpan konfigurasi: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (activeRole && academicYears.length > 0) {
      fetchHolidays();
    }
  }, [activeRole, academicYears]);

  const fetchAcademicYears = async () => {
    try {
      const { data, error } = await supabase
        .from('academic_years')
        .select('*')
        .eq('lembaga_id', activeRole!.lembaga_id)
        .order('tanggal_mulai', { ascending: false });
      
      if (error) throw error;
      setAcademicYears(data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHolidays = async () => {
    try {
      const { data, error } = await supabase
        .from('holidays')
        .select('*, academic_years!inner(lembaga_id)')
        .eq('academic_years.lembaga_id', activeRole!.lembaga_id)
        .order('tanggal_mulai', { ascending: false });
      
      if (error) throw error;
      setHolidays(data || []);
    } catch (err: any) {
      console.error(err);
    }
  };

  const fetchJamPelajaran = async () => {
    try {
      const { data, error } = await supabase
        .from('jam_pelajaran')
        .select('*')
        .eq('lembaga_id', activeRole!.lembaga_id)
        .order('jam_ke');
      
      if (error) throw error;
      setJamPelajaranList(data || []);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleSaveYear = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const { error } = await supabase.from('academic_years').insert([{
        lembaga_id: activeRole!.lembaga_id,
        nama: yearForm.nama,
        tanggal_mulai: yearForm.tanggal_mulai,
        tanggal_selesai: yearForm.tanggal_selesai || null
      }]);
      if (error) throw error;
      setIsYearModalOpen(false);
      setYearForm({ nama: "", tanggal_mulai: "", tanggal_selesai: "" });
      fetchAcademicYears();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleActiveYear = async (id: string, currentlyActive: boolean) => {
    if (currentlyActive) return;
    try {
      // Deactivate all first
      await supabase
        .from('academic_years')
        .update({ is_active: false })
        .eq('lembaga_id', activeRole!.lembaga_id);
      
      // Activate the selected one
      const { error } = await supabase
        .from('academic_years')
        .update({ is_active: true })
        .eq('id', id);
      
      if (error) throw error;
      fetchAcademicYears();
    } catch (err: any) {
      alert("Error activating year: " + err.message);
    }
  };

  const handleOpenJamModal = (yearId: string) => {
    setSelectedYearId(yearId);
    fetchJamPelajaran();
    setIsJamModalOpen(true);
  };

  const handleAddJamPelajaran = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const { error } = await supabase.from('jam_pelajaran').insert([{
        lembaga_id: activeRole!.lembaga_id,
        jam_ke: jamKeForm.jam_ke,
        waktu_mulai: jamKeForm.waktu_mulai,
        waktu_selesai: jamKeForm.waktu_selesai
      }]);
      if (error) throw error;
      fetchJamPelajaran();
      setJamKeForm(prev => ({ ...prev, jam_ke: prev.jam_ke + 1 }));
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteJam = async (id: string) => {
    try {
      const { error } = await supabase.from('jam_pelajaran').delete().eq('id', id);
      if (error) throw error;
      fetchJamPelajaran();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleSaveHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const { error } = await supabase.from('holidays').insert([{
        academic_year_id: holidayForm.academic_year_id,
        nama: holidayForm.nama,
        tanggal_mulai: holidayForm.tanggal_mulai,
        tanggal_selesai: holidayForm.tanggal_selesai
      }]);
      if (error) throw error;
      setIsHolidayModalOpen(false);
      setHolidayForm({ nama: "", tanggal_mulai: "", tanggal_selesai: "", academic_year_id: "" });
      fetchHolidays();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!confirm("Hapus hari libur ini?")) return;
    try {
      const { error } = await supabase.from('holidays').delete().eq('id', id);
      if (error) throw error;
      fetchHolidays();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Pengaturan Sistem</h2>
          <p className="text-gray-500 text-sm mt-1">
            Kelola kalender akademik dan jam pelajaran untuk {formatNamaLembaga(activeRole?.lembaga.nama)}.
          </p>
        </div>
      </div>

      <div className="flex bg-white rounded-2xl shadow-sm border p-1 w-fit overflow-x-auto max-w-full hide-scrollbar">
        <button
          onClick={() => setActiveTab("TAHUN_AJARAN")}
          className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === "TAHUN_AJARAN" ? "bg-emerald-50 text-emerald-700" : "text-gray-500 hover:text-gray-900"}`}
        >
          Tahun Ajaran
        </button>
        <button
          onClick={() => setActiveTab("HARI_LIBUR")}
          className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === "HARI_LIBUR" ? "bg-emerald-50 text-emerald-700" : "text-gray-500 hover:text-gray-900"}`}
        >
          Hari Libur
        </button>
        <button
          onClick={() => setActiveTab("AGENDA_KEHADIRAN")}
          className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === "AGENDA_KEHADIRAN" ? "bg-emerald-50 text-emerald-700" : "text-gray-500 hover:text-gray-900"}`}
        >
          Konfigurasi Agenda
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>
      ) : activeTab === "TAHUN_AJARAN" ? (
        <Card className="border-0 shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="bg-white border-b px-6 py-5 flex flex-row items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center shrink-0">
                <Calendar className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Manajemen Tahun Ajaran</CardTitle>
                <p className="text-sm text-gray-500">Kelola periode dan jam pelajaran per hari</p>
              </div>
            </div>
            <Dialog open={isYearModalOpen} onOpenChange={setIsYearModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gray-900 hover:bg-gray-800 rounded-xl px-5 h-11">
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Periode
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Tambah Tahun Ajaran</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSaveYear} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Nama Periode</Label>
                    <Input placeholder="Misal: 2026/2027 Semester Ganjil" value={yearForm.nama} onChange={e => setYearForm({...yearForm, nama: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Tanggal Mulai</Label>
                    <Input type="date" value={yearForm.tanggal_mulai} onChange={e => setYearForm({...yearForm, tanggal_mulai: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Tanggal Selesai (Opsional)</Label>
                    <Input type="date" value={yearForm.tanggal_selesai} onChange={e => setYearForm({...yearForm, tanggal_selesai: e.target.value})} />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 w-full rounded-xl">Simpan Periode</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="p-0">
            {academicYears.length === 0 ? (
              <div className="text-center py-16 text-gray-500">Belum ada data Tahun Ajaran.</div>
            ) : (
              <div className="divide-y">
                {academicYears.map((year, index) => (
                  <div key={year.id} className="p-6 flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 ${year.is_active ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">{year.nama}</h3>
                        <p className="text-sm text-gray-500 mt-1">Mulai: {year.tanggal_mulai}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" className="rounded-xl border-gray-200" onClick={() => handleOpenJamModal(year.id)}>
                        <Clock className="w-4 h-4 mr-2 text-orange-500" />
                        Pola Jam Pelajaran
                      </Button>
                      <Button 
                        variant={year.is_active ? "default" : "outline"}
                        className={`rounded-xl ${year.is_active ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0" : "border-gray-200 text-gray-600"}`}
                        onClick={() => toggleActiveYear(year.id, year.is_active)}
                      >
                        <Power className="w-4 h-4 mr-2" />
                        {year.is_active ? "Sedang Aktif" : "Aktifkan"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : activeTab === "AGENDA_KEHADIRAN" ? (
        <Card className="border-gray-100 shadow-sm overflow-hidden rounded-2xl max-w-2xl">
          <CardHeader className="bg-white border-b pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-600" />
              Aturan Pengisian Agenda & Absen
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3 text-sm text-blue-800">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>Atur berapa menit batas toleransi bagi guru untuk mengisi agenda mengajar <b>setelah jam pelajaran mereka dimulai</b>. Jika lewat dari menit toleransi (namun belum berakhir jam pelajarannya), statusnya menjadi Terlambat. Jika terlewat hingga jadwal kelas usai, sistem akan menolak (blokir) dan guru harus meminta admin untuk menyusulkan.</p>
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="toleransi">Batas Waktu Toleransi Keterlambatan (Menit)</Label>
              <div className="flex gap-4 items-center">
                <Input 
                  id="toleransi" 
                  type="number" 
                  min="0"
                  className="w-32 rounded-xl text-center font-bold text-lg"
                  value={toleransiMenit}
                  onChange={(e) => setToleransiMenit(Number(e.target.value))}
                />
                <span className="text-gray-500">Menit dihitung sejak waktu <b>jam mulai</b> kelas.</span>
              </div>
            </div>

            <Button onClick={handleSaveAgendaConfig} disabled={isSubmitting} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto">
              {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : "Simpan Konfigurasi"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="bg-white border-b px-6 py-5 flex flex-row items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center shrink-0">
                <Calendar className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Hari Libur Akademik</CardTitle>
                <p className="text-sm text-gray-500">Blokir tanggal agar tidak dihitung dalam kehadiran guru</p>
              </div>
            </div>
            <Dialog open={isHolidayModalOpen} onOpenChange={setIsHolidayModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gray-900 hover:bg-gray-800 rounded-xl px-5 h-11">
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Libur
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Tambah Hari Libur</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSaveHoliday} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Pilih Tahun Ajaran Terkait</Label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={holidayForm.academic_year_id}
                      onChange={e => setHolidayForm({...holidayForm, academic_year_id: e.target.value})}
                      required
                    >
                      <option value="" disabled>-- Pilih --</option>
                      {academicYears.map(y => <option key={y.id} value={y.id}>{y.nama}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Keterangan Libur</Label>
                    <Input placeholder="Misal: Libur Idul Fitri" value={holidayForm.nama} onChange={e => setHolidayForm({...holidayForm, nama: e.target.value})} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Dari Tanggal</Label>
                      <Input type="date" value={holidayForm.tanggal_mulai} onChange={e => setHolidayForm({...holidayForm, tanggal_mulai: e.target.value})} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Sampai Tanggal</Label>
                      <Input type="date" value={holidayForm.tanggal_selesai} onChange={e => setHolidayForm({...holidayForm, tanggal_selesai: e.target.value})} required />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 w-full rounded-xl">Simpan Libur</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="p-0">
            {holidays.length === 0 ? (
              <div className="text-center py-16 text-gray-500">Belum ada data Hari Libur.</div>
            ) : (
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="pl-6">Keterangan</TableHead>
                    <TableHead>Tahun Ajaran</TableHead>
                    <TableHead>Rentang Tanggal</TableHead>
                    <TableHead className="text-right pr-6">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holidays.map(h => {
                    const year = academicYears.find(y => y.id === h.academic_year_id);
                    return (
                      <TableRow key={h.id}>
                        <TableCell className="pl-6 font-medium">{h.nama}</TableCell>
                        <TableCell>{year?.nama || '-'}</TableCell>
                        <TableCell>{h.tanggal_mulai} s/d {h.tanggal_selesai}</TableCell>
                        <TableCell className="text-right pr-6">
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteHoliday(h.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal Jam Pelajaran */}
      <Dialog open={isJamModalOpen} onOpenChange={setIsJamModalOpen}>
        <DialogContent className="rounded-2xl sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pengaturan Pola Jam Pelajaran</DialogTitle>
            <DialogDescription>
              Atur jam masuk dan selesai untuk masing-masing "Jam Ke-". Konfigurasi ini berlaku global untuk sekolah.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <div className="md:col-span-1 space-y-4 bg-gray-50 p-4 rounded-2xl h-fit">
              <h3 className="font-semibold">Tambah Jam Pelajaran</h3>
              <form onSubmit={handleAddJamPelajaran} className="space-y-4">
                <div className="space-y-2">
                  <Label>Jam Ke-</Label>
                  <Input type="number" min="1" max="20" value={jamKeForm.jam_ke} onChange={e => setJamKeForm({...jamKeForm, jam_ke: parseInt(e.target.value)})} required />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Waktu Mulai</Label>
                    <Input type="time" value={jamKeForm.waktu_mulai} onChange={e => setJamKeForm({...jamKeForm, waktu_mulai: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Selesai</Label>
                    <Input type="time" value={jamKeForm.waktu_selesai} onChange={e => setJamKeForm({...jamKeForm, waktu_selesai: e.target.value})} required />
                  </div>
                </div>
                <Button type="submit" disabled={isSubmitting} className="w-full bg-emerald-600 hover:bg-emerald-700">Tambah Pola</Button>
              </form>
            </div>
            
            <div className="md:col-span-2">
              <div className="bg-white border rounded-xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="w-[100px] text-center">Jam Ke-</TableHead>
                      <TableHead>Waktu</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jamPelajaranList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-gray-500">Belum ada data Jam Pelajaran.</TableCell>
                      </TableRow>
                    ) : (
                      jamPelajaranList.map(jam => (
                        <TableRow key={jam.id}>
                          <TableCell className="text-center font-bold">Ke-{jam.jam_ke}</TableCell>
                          <TableCell>{jam.waktu_mulai.substring(0,5)} - {jam.waktu_selesai.substring(0,5)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteJam(jam.id!)} className="text-red-500 hover:bg-red-50 hover:text-red-600 w-8 h-8">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
