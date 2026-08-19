import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Search, Loader2, Plus, AlertCircle, Edit, Trash2, Calendar, Clock, BookOpen, Upload, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import * as XLSX from 'xlsx';

interface Schedule {
  id: string;
  hari: string;
  jam_ke_mulai: number;
  jam_ke_selesai: number;
  mata_pelajaran: string;
  kelas: string;
  teacher: { id: string; nama: string };
}

interface Teacher {
  id: string;
  nama: string;
}

const HARI_LIST = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Ahad"];

export function DashboardUnitJadwal() {
  const { activeRole, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHari, setSelectedHari] = useState<string>("ALL");
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    teacher_id: "",
    hari: "Senin",
    jam_ke_mulai: 1,
    jam_ke_selesai: 1,
    mata_pelajaran: "",
    kelas: ""
  });

  const [activeYear, setActiveYear] = useState<any>(null);

  const isGuru = activeRole?.role === 'GURU';

  useEffect(() => {
    if (activeRole?.lembaga_id) {
      fetchData();
    }
  }, [activeRole]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: yearData } = await supabase
        .from('academic_years')
        .select('*')
        .eq('lembaga_id', activeRole!.lembaga_id)
        .eq('is_active', true)
        .single();
        
      setActiveYear(yearData || null);

      let scheduleQuery = supabase
        .from('schedules')
        .select(`
          id, 
          hari, 
          jam_ke_mulai, 
          jam_ke_selesai, 
          mata_pelajaran, 
          kelas, 
          teacher:teachers!inner(id, nama, user_id)
        `)
        .eq('lembaga_id', activeRole!.lembaga_id)
        .eq('academic_year_id', yearData?.id)
        .order('hari', { ascending: true })
        .order('jam_ke_mulai', { ascending: true });

      if (isGuru && user) {
        scheduleQuery = scheduleQuery.eq('teacher.user_id', user.id);
      }

      const [scheduleRes, teacherRes] = await Promise.all([
        yearData ? scheduleQuery : Promise.resolve({ data: [], error: null }),
        supabase
          .from('teachers')
          .select('id, nama')
          .eq('lembaga_id', activeRole!.lembaga_id)
          .eq('status', 'AKTIF')
          .order('nama')
      ]);

      if (scheduleRes.error) throw scheduleRes.error;
      if (teacherRes.error) throw teacherRes.error;
      
      setSchedules((scheduleRes.data as unknown as Schedule[]) || []);
      setTeachers(teacherRes.data || []);
    } catch (err: any) {
      console.error("Error fetching data:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.teacher_id || !formData.mata_pelajaran || !formData.kelas) {
      setSubmitError("Mohon lengkapi semua data wajib.");
      return;
    }
    if (formData.jam_ke_mulai > formData.jam_ke_selesai) {
      setSubmitError("Jam ke-mulai tidak boleh lebih besar dari jam ke-selesai.");
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError("");

      if (editingId) {
        const { error } = await supabase
          .from('schedules')
          .update({
            teacher_id: formData.teacher_id,
            hari: formData.hari,
            jam_ke_mulai: formData.jam_ke_mulai,
            jam_ke_selesai: formData.jam_ke_selesai,
            mata_pelajaran: formData.mata_pelajaran,
            kelas: formData.kelas
          })
          .eq('id', editingId)
          .eq('lembaga_id', activeRole!.lembaga_id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('schedules')
          .insert([{
            lembaga_id: activeRole!.lembaga_id,
            academic_year_id: activeYear.id,
            teacher_id: formData.teacher_id,
            hari: formData.hari,
            jam_ke_mulai: formData.jam_ke_mulai,
            jam_ke_selesai: formData.jam_ke_selesai,
            mata_pelajaran: formData.mata_pelajaran,
            kelas: formData.kelas
          }]);

        if (error) throw error;
      }

      closeModal();
      await fetchData();
    } catch (err: any) {
      setSubmitError(err.message || "Gagal menyimpan jadwal.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus jadwal ini?")) return;
    
    try {
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', id)
        .eq('lembaga_id', activeRole!.lembaga_id);

      if (error) throw error;
      await fetchData();
    } catch (err: any) {
      alert("Gagal menghapus jadwal: " + err.message);
    }
  };

  const openEditModal = (schedule: Schedule) => {
    setFormData({
      teacher_id: schedule.teacher?.id || "",
      hari: schedule.hari,
      jam_ke_mulai: schedule.jam_ke_mulai,
      jam_ke_selesai: schedule.jam_ke_selesai,
      mata_pelajaran: schedule.mata_pelajaran,
      kelas: schedule.kelas
    });
    setEditingId(schedule.id);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({
      teacher_id: "",
      hari: "Senin",
      jam_ke_mulai: 1,
      jam_ke_selesai: 1,
      mata_pelajaran: "",
      kelas: ""
    });
    setSubmitError("");
  };
  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      {
        "Hari": "Senin",
        "Jam Ke-Mulai": 1,
        "Jam Ke-Selesai": 2,
        "Mata Pelajaran": "Matematika",
        "Kelas": "7A",
        "Nama Guru": teachers.length > 0 ? teachers[0].nama : "Budi Santoso"
      },
      {
        "Hari": "Senin",
        "Jam Ke-Mulai": 3,
        "Jam Ke-Selesai": 4,
        "Mata Pelajaran": "B. Indonesia",
        "Kelas": "7B",
        "Nama Guru": teachers.length > 1 ? teachers[1].nama : "Siti Aminah"
      }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Jadwal");
    XLSX.writeFile(wb, `Template_Jadwal_${activeRole?.lembaga.kode || 'Unit'}.xlsx`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setLoading(true);
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          alert("File Excel kosong atau format tidak sesuai.");
          return;
        }

        const validSchedules = [];
        const errors = [];

        for (let i = 0; i < data.length; i++) {
          const row: any = data[i];
          const hari = row["Hari"]?.toString().trim();
          const jamMulai = parseInt(row["Jam Ke-Mulai"]);
          const jamSelesai = parseInt(row["Jam Ke-Selesai"]);
          const mapel = row["Mata Pelajaran"]?.toString().trim();
          const kelas = row["Kelas"]?.toString().trim();
          const namaGuru = row["Nama Guru"]?.toString().trim();

          if (!hari || !jamMulai || !jamSelesai || !mapel || !kelas || !namaGuru) {
            errors.push(`Baris ${i + 2}: Data tidak lengkap`);
            continue;
          }

          if (!HARI_LIST.includes(hari)) {
            errors.push(`Baris ${i + 2}: Hari "${hari}" tidak valid`);
            continue;
          }

          // Cari guru (case-insensitive)
          const teacher = teachers.find(t => t.nama.toLowerCase() === namaGuru.toLowerCase());
          
          if (!teacher) {
            errors.push(`Baris ${i + 2}: Guru "${namaGuru}" tidak ditemukan di database`);
            continue;
          }

          validSchedules.push({
            lembaga_id: activeRole!.lembaga_id,
            academic_year_id: activeYear.id,
            teacher_id: teacher.id,
            hari: hari,
            jam_ke_mulai: jamMulai,
            jam_ke_selesai: jamSelesai,
            mata_pelajaran: mapel,
            kelas: kelas
          });
        }

        if (validSchedules.length > 0) {
          const { error } = await supabase.from('schedules').insert(validSchedules);
          if (error) throw error;
          
          let msg = `Berhasil mengimpor ${validSchedules.length} jadwal.`;
          if (errors.length > 0) {
            msg += `\n\nBeberapa baris dilewati karena error:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...' : ''}`;
          }
          alert(msg);
          await fetchData();
        } else {
          alert(`Gagal mengimpor jadwal.\n\nError:\n${errors.slice(0, 10).join('\n')}`);
        }
      } catch (err: any) {
        console.error(err);
        alert("Gagal memproses file Excel: " + err.message);
      } finally {
        setLoading(false);
        // Reset file input
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const sortedSchedules = [...schedules].sort((a, b) => {
    const hariA = HARI_LIST.indexOf(a.hari);
    const hariB = HARI_LIST.indexOf(b.hari);
    if (hariA !== hariB) return hariA - hariB;
    return a.jam_ke_mulai - b.jam_ke_mulai;
  });

  const filteredSchedules = sortedSchedules.filter(s => {
    const matchSearch = s.mata_pelajaran.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        s.teacher.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        s.kelas.toLowerCase().includes(searchQuery.toLowerCase());
    const matchHari = selectedHari === "ALL" || s.hari === selectedHari;
    return matchSearch && matchHari;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">{isGuru ? "Jadwal Saya" : "Jadwal & Agenda Mengajar"}</h2>
          <p className="text-gray-500 text-sm mt-1">
            {isGuru ? "Lihat jadwal mengajar Anda di sini." : `Kelola jadwal pelajaran untuk ${activeRole?.lembaga.nama}.`}
          </p>
        </div>
        {!isGuru && (
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <Button variant="outline" className="shadow-sm rounded-xl px-4 h-11 w-full sm:w-auto" onClick={handleDownloadTemplate} disabled={!activeYear}>
            <Download className="w-4 h-4 mr-2" />
            Template
          </Button>
          
          <div className="relative w-full sm:w-auto">
            <input 
              type="file" 
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              title="Import Excel"
              disabled={!activeYear}
            />
            <Button variant="outline" className="shadow-sm rounded-xl px-4 h-11 w-full sm:w-auto border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100" disabled={!activeYear}>
              <Upload className="w-4 h-4 mr-2" />
              Import Excel
            </Button>
          </div>

          <Dialog open={isModalOpen} onOpenChange={(open) => { if (!open) closeModal(); else setIsModalOpen(true); }}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 shadow-sm rounded-xl px-5 h-11 w-full sm:w-auto" disabled={!activeYear}>
                <Plus className="w-4 h-4 mr-2" />
                Tambah Jadwal
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] rounded-2xl">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Jadwal" : "Tambah Jadwal Baru"}</DialogTitle>
              <DialogDescription>
                Isi form di bawah untuk menjadwalkan kelas.
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
                <Label htmlFor="teacher">Pilih Guru / Ustadz <span className="text-red-500">*</span></Label>
                <select 
                  id="teacher"
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  value={formData.teacher_id}
                  onChange={e => setFormData({...formData, teacher_id: e.target.value})}
                  required
                >
                  <option value="" disabled>-- Pilih Pengajar --</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.nama}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hari">Hari <span className="text-red-500">*</span></Label>
                  <select 
                    id="hari"
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    value={formData.hari}
                    onChange={e => setFormData({...formData, hari: e.target.value})}
                  >
                    {HARI_LIST.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kelas">Kelas / Ruang <span className="text-red-500">*</span></Label>
                  <Input id="kelas" placeholder="Misal: 7A, Lab Komputer" value={formData.kelas} onChange={e => setFormData({...formData, kelas: e.target.value})} required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mapel">Mata Pelajaran <span className="text-red-500">*</span></Label>
                <Input id="mapel" placeholder="Misal: Matematika, Fiqih" value={formData.mata_pelajaran} onChange={e => setFormData({...formData, mata_pelajaran: e.target.value})} required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="jam_ke_mulai">Dari Jam Ke- <span className="text-red-500">*</span></Label>
                  <Input id="jam_ke_mulai" type="number" min="1" max="15" value={formData.jam_ke_mulai} onChange={e => setFormData({...formData, jam_ke_mulai: parseInt(e.target.value) || 1})} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jam_ke_selesai">Sampai Jam Ke- <span className="text-red-500">*</span></Label>
                  <Input id="jam_ke_selesai" type="number" min="1" max="15" value={formData.jam_ke_selesai} onChange={e => setFormData({...formData, jam_ke_selesai: parseInt(e.target.value) || 1})} required />
                </div>
              </div>

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
      )}
      </div>

      <Card className="border-gray-100 shadow-sm overflow-hidden rounded-2xl">
        <CardHeader className="bg-white border-b pb-4">
          <div className="flex flex-col md:flex-row justify-between gap-4 items-center">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
              <Button 
                variant={selectedHari === "ALL" ? "default" : "outline"} 
                size="sm"
                onClick={() => setSelectedHari("ALL")}
                className={selectedHari === "ALL" ? "bg-emerald-600 hover:bg-emerald-700 rounded-full" : "rounded-full"}
              >
                Semua Hari
              </Button>
              {HARI_LIST.map(hari => (
                <Button 
                  key={hari}
                  variant={selectedHari === hari ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setSelectedHari(hari)}
                  className={selectedHari === hari ? "bg-emerald-600 hover:bg-emerald-700 rounded-full" : "rounded-full"}
                >
                  {hari}
                </Button>
              ))}
            </div>
            
            <div className="relative w-full md:w-64 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input 
                placeholder="Cari mapel, guru, kelas..." 
                className="pl-9 bg-gray-50 border-none focus-visible:ring-1 focus-visible:ring-emerald-500 rounded-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!activeYear && !loading && (
            <div className="bg-orange-50 border-b border-orange-100 p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600 shrink-0" />
                <p className="text-sm text-orange-800">
                  <strong>Belum ada Tahun Ajaran yang aktif.</strong> Silakan buat dan aktifkan Tahun Ajaran di menu Pengaturan Sistem terlebih dahulu sebelum dapat mengelola jadwal.
                </p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
          ) : filteredSchedules.length === 0 ? (
            <div className="text-center py-24 bg-white">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Belum ada jadwal yang ditambahkan untuk hari ini.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead className="w-[200px] pl-6">Hari & Jam Ke-</TableHead>
                    <TableHead>Mata Pelajaran</TableHead>
                    <TableHead>Kelas</TableHead>
                    <TableHead>Guru / Pengajar</TableHead>
                    <TableHead className="text-right pr-6">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSchedules.map((schedule) => (
                    <TableRow key={schedule.id} className="hover:bg-emerald-50/30 transition-colors">
                      <TableCell className="pl-6">
                        <p className="font-bold text-gray-900">{schedule.hari}</p>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1 bg-gray-100 w-fit px-2 py-0.5 rounded-md font-medium">
                          <Clock className="w-3 h-3" /> 
                          Jam ke-{schedule.jam_ke_mulai} {schedule.jam_ke_selesai > schedule.jam_ke_mulai ? ` s/d ${schedule.jam_ke_selesai}` : ''}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600 shrink-0">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <p className="font-semibold text-gray-900">{schedule.mata_pelajaran}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold tracking-wide">
                          KLS {schedule.kelas}
                        </span>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-gray-700 font-medium">{schedule.teacher?.nama || "-"}</p>
                      </TableCell>
                      {!isGuru && (
                        <TableCell className="text-right pr-6">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => openEditModal(schedule)} className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(schedule.id)} className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
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
