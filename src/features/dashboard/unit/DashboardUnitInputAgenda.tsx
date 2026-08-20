import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Camera, Upload, AlertCircle, Save, CheckCircle2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface Teacher {
  id: string;
  nama: string;
}

interface Schedule {
  id: string;
  hari: string;
  jam_ke_mulai: number;
  jam_ke_selesai: number;
  mata_pelajaran: string;
  kelas: string;
}

interface StudentAttendance {
  student_id: string;
  nama: string;
  status: 'HADIR' | 'IZIN' | 'SAKIT' | 'ALFA';
  keterangan: string;
}

import { compressImage } from "@/lib/imageCompression";

export function DashboardUnitInputAgenda() {
  const { activeRole, user } = useAuth();
  const isGuru = activeRole?.role === 'GURU';

  const [loading, setLoading] = useState(true);
  
  // Data Master
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  
  // State for Cards View
  const [tanggal, setTanggal] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedTeacher, setSelectedTeacher] = useState<string>("");
  const [filledAgendas, setFilledAgendas] = useState<Record<string, {status_kehadiran_guru: string, status: string}>>({});
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<string>("");
  const [materi, setMateri] = useState<string>("");
  const [fotoUrl, setFotoUrl] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [statusKehadiranGuru, setStatusKehadiranGuru] = useState<string>("TEPAT_WAKTU");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [, setSubmitSuccess] = useState(false);

  const [activeYear, setActiveYear] = useState<any>(null);
  const [toleransiMenit, setToleransiMenit] = useState<number>(30); // default
  const [jamPelajaran, setJamPelajaran] = useState<any[]>([]);

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

      const { data: configData } = await supabase
        .from('agenda_configs')
        .select('toleransi_menit')
        .eq('lembaga_id', activeRole!.lembaga_id)
        .single();
      if (configData) setToleransiMenit(configData.toleransi_menit);

      const { data: jpData } = await supabase
        .from('jam_pelajaran')
        .select('*')
        .eq('lembaga_id', activeRole!.lembaga_id);
      if (jpData) setJamPelajaran(jpData);

      if (isGuru && user) {
        const { data: myTeacher } = await supabase
          .from('teachers')
          .select('id, nama')
          .eq('user_id', user.id)
          .eq('lembaga_id', activeRole!.lembaga_id)
          .single();
          
        if (myTeacher) {
          setTeachers([myTeacher]);
          setSelectedTeacher(myTeacher.id);
        }
      } else {
        const { data: teacherData, error } = await supabase
          .from('teachers')
          .select('id, nama')
          .eq('lembaga_id', activeRole!.lembaga_id)
          .eq('status', 'AKTIF')
          .order('nama');
          
        if (error) throw error;
        setTeachers(teacherData || []);
      }
    } catch (err) {
      console.error("Error fetching initial data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTeacher && activeYear) {
      fetchSchedules(selectedTeacher, activeYear.id);
    } else {
      setSchedules([]);
    }
  }, [selectedTeacher, activeYear]);

  const fetchSchedules = async (teacherId: string, yearId: string) => {
    try {
      const { data, error } = await supabase
        .from('schedules')
        .select('id, hari, jam_ke_mulai, jam_ke_selesai, mata_pelajaran, kelas')
        .eq('teacher_id', teacherId)
        .eq('academic_year_id', yearId)
        .eq('lembaga_id', activeRole!.lembaga_id);
        
      if (error) throw error;
      setSchedules(data || []);
    } catch (err) {
      console.error("Error fetching schedules", err);
    }
  };

  const days = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const selectedDayName = tanggal ? days[new Date(tanggal).getDay()] : '';
  const filteredSchedules = schedules.filter(s => s.hari === selectedDayName);

  const fetchFilledAgendas = async (scheduleIds: string[], targetDate: string) => {
    if (scheduleIds.length === 0) {
      setFilledAgendas({});
      return;
    }
    try {
      const { data, error } = await supabase
        .from('agenda_mengajar')
        .select('jadwal_id, status_kehadiran_guru, status')
        .in('jadwal_id', scheduleIds)
        .eq('tanggal', targetDate);

      if (error) throw error;
      const mapping: Record<string, {status_kehadiran_guru: string, status: string}> = {};
      (data || []).forEach(row => {
        mapping[row.jadwal_id] = {
          status_kehadiran_guru: row.status_kehadiran_guru,
          status: row.status
        };
      });
      setFilledAgendas(mapping);
    } catch (err) {
      console.error("Error fetching filled agendas", err);
    }
  };

  useEffect(() => {
    if (tanggal && schedules.length > 0) {
      const ids = schedules.filter(s => s.hari === selectedDayName).map(s => s.id);
      fetchFilledAgendas(ids, tanggal);
    }
  }, [schedules, tanggal]);

  const openModal = async (schedule: Schedule) => {
    setSelectedSchedule(schedule.id);
    setMateri("");
    setFotoUrl("");
    setSelectedFile(null);
    setStatusKehadiranGuru("TEPAT_WAKTU");
    setSubmitError("");
    setSubmitSuccess(false);
    
    // Fetch students for this class
    await fetchStudentsByKelas(schedule.kelas);
    setIsModalOpen(true);
  };

  const fetchStudentsByKelas = async (kelas: string) => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, nama, nisn')
        .eq('lembaga_id', activeRole!.lembaga_id)
        .eq('kelas', kelas)
        .in('status', ['AKTIF']);
        
      if (error) throw error;
      
      const attendanceData: StudentAttendance[] = (data || []).map(s => ({
        student_id: s.id,
        nama: s.nama,
        status: 'HADIR',
        keterangan: ''
      }));
      
      setStudents(attendanceData);
    } catch (err) {
      console.error("Error fetching students", err);
    }
  };

  const cycleAttendance = (studentId: string, currentStatus: string) => {
    const sequence = ['HADIR', 'SAKIT', 'IZIN', 'ALFA'];
    const currentIndex = sequence.indexOf(currentStatus);
    const nextStatus = sequence[(currentIndex + 1) % sequence.length];
    setStudents(prev => prev.map(s => s.student_id === studentId ? { ...s, status: nextStatus as any } : s));
  };
  
  const handleKeteranganChange = (studentId: string, keterangan: string) => {
    setStudents(prev => prev.map(s => s.student_id === studentId ? { ...s, keterangan } : s));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setFotoUrl(url); 
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacher || !selectedSchedule || !tanggal || !materi) {
      setSubmitError("Mohon lengkapi semua field yang wajib");
      return;
    }

    if (isGuru && !fotoUrl && !selectedFile) {
      setSubmitError("Bukti kehadiran dari kamera wajib dilampirkan.");
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError("");
      setSubmitSuccess(false);

      let uploadedFotoUrl = fotoUrl;

      if (selectedFile) {
        try {
          const compressedFile = await compressImage(selectedFile, 1200, 1200, 0.6);
          const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
          const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
          
          if (!cloudName || !uploadPreset) {
            throw new Error("Konfigurasi Cloudinary belum diatur.");
          }

          const formData = new FormData();
          formData.append("file", compressedFile);
          formData.append("upload_preset", uploadPreset);

          const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: "POST",
            body: formData,
          });

          const uploadData = await uploadResponse.json();
          if (uploadResponse.ok) {
            uploadedFotoUrl = uploadData.secure_url;
          } else {
            throw new Error(uploadData.error?.message || "Gagal mengunggah foto");
          }
        } catch (err: any) {
          setSubmitError("Upload foto gagal: " + err.message);
          setIsSubmitting(false);
          return;
        }
      }

      const finalFoto = uploadedFotoUrl || "https://res.cloudinary.com/dztv5k4sa/image/upload/v1723824000/placeholder-agenda.png";

      let finalStatusKehadiran = 'TEPAT_WAKTU';

      const schedule = schedules.find(s => s.id === selectedSchedule);
      if (schedule && jamPelajaran.length > 0) {
        const jpMulai = jamPelajaran.find(j => j.jam_ke === schedule.jam_ke_mulai);
        const jpSelesai = jamPelajaran.find(j => j.jam_ke === schedule.jam_ke_selesai);
        
        if (jpMulai && jpSelesai) {
          const [mulaiHours, mulaiMinutes] = jpMulai.waktu_mulai.split(':').map(Number);
          const [selesaiHours, selesaiMinutes] = jpSelesai.waktu_selesai.split(':').map(Number);
          
          const today = new Date();
          const todayStr = today.toISOString().split('T')[0];
          const isToday = tanggal === todayStr;
          
          if (isGuru) {
            if (tanggal > todayStr) {
              setSubmitError("Waktu pengisian agenda belum masuk");
              setIsSubmitting(false);
              return;
            }
            if (tanggal < todayStr) {
              setSubmitError("Waktu pengisian sudah habis di jadwal ini silahkan hubungi admin");
              setIsSubmitting(false);
              return;
            }
          }
          
          if (isToday) {
            const batasAwal = new Date();
            batasAwal.setHours(mulaiHours, mulaiMinutes, 0, 0);

            const batasTepatWaktu = new Date();
            batasTepatWaktu.setHours(mulaiHours, mulaiMinutes, 0, 0);
            batasTepatWaktu.setMinutes(batasTepatWaktu.getMinutes() + toleransiMenit);
            
            const batasAkhir = new Date();
            batasAkhir.setHours(selesaiHours, selesaiMinutes, 0, 0);

            if (today < batasAwal) {
              if (isGuru) {
                setSubmitError("Waktu pengisian agenda belum masuk");
                setIsSubmitting(false);
                return;
              }
            } else if (today > batasAkhir) {
              if (isGuru) {
                setSubmitError("Waktu pengisian sudah habis di jadwal ini silahkan hubungi admin");
                setIsSubmitting(false);
                return;
              }
            } else if (today > batasTepatWaktu) {
              finalStatusKehadiran = 'TERLAMBAT';
            } else {
              finalStatusKehadiran = 'TEPAT_WAKTU';
            }
          }
        }
      }

      const agendaPayload: any = {
        lembaga_id: activeRole!.lembaga_id,
        guru_id: selectedTeacher,
        jadwal_id: selectedSchedule,
        tanggal: tanggal,
        materi: materi,
        foto_url: finalFoto,
      };

      if (isGuru) {
        agendaPayload.status = 'PENDING';
        agendaPayload.status_kehadiran_guru = finalStatusKehadiran;
      } else {
        agendaPayload.status = 'VERIFIED';
        agendaPayload.diverifikasi_oleh = user!.id;
        agendaPayload.tanggal_verifikasi = new Date().toISOString();
        agendaPayload.status_kehadiran_guru = statusKehadiranGuru; 
      }

      const { data: agendaData, error: agendaError } = await supabase
        .from('agenda_mengajar')
        .insert([agendaPayload])
        .select('id')
        .single();

      if (agendaError) {
        if (agendaError.code === '23505') {
          throw new Error("Agenda untuk jadwal dan tanggal ini sudah pernah diinput!");
        }
        throw agendaError;
      }

      if (students.length > 0) {
        const absensiPayload = students.map(s => ({
          agenda_id: agendaData.id,
          student_id: s.student_id,
          status: s.status,
          keterangan: s.keterangan || null
        }));

        const { error: absensiError } = await supabase
          .from('absensi_siswa')
          .insert(absensiPayload);

        if (absensiError) throw absensiError;
      }

      setSubmitSuccess(true);
      // Refresh agendas
      const ids = filteredSchedules.map(s => s.id);
      await fetchFilledAgendas(ids, tanggal);
      setIsModalOpen(false); // close modal on success
      
    } catch (err: any) {
      setSubmitError(err.message || "Gagal menyimpan agenda");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && teachers.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{isGuru ? "Isi Agenda & Absensi" : "Input Agenda Susulan"}</h1>
          <p className="text-gray-500">{isGuru ? "Pilih jadwal di bawah ini untuk mengisi agenda dan kehadiran siswa." : "Menu khusus Admin untuk menyusulkan agenda & absen guru."}</p>
        </div>
      </div>

      {!activeYear && !loading && (
        <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 shrink-0" />
            <p className="text-sm text-orange-800">
              <strong>Belum ada Tahun Ajaran yang aktif.</strong> Jadwal guru dan input agenda memerlukan Tahun Ajaran yang aktif. Silakan atur di Pengaturan Sistem.
            </p>
          </div>
        </div>
      )}

      {activeYear && (
      <div className="space-y-4">
        <Card className="shadow-sm border-gray-100">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {!isGuru && (
                <div className="space-y-2">
                  <Label>Guru Pengajar</Label>
                  <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Guru..." />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.nama}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Tanggal Pertemuan</Label>
                <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} required />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Schedule Cards */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Jadwal Hari {selectedDayName}</h2>
          
          {filteredSchedules.length === 0 ? (
            <div className="p-8 text-center bg-gray-50 border-2 border-dashed rounded-xl">
              <p className="text-gray-500 font-medium">
                {!selectedTeacher 
                  ? "Silakan pilih guru terlebih dahulu." 
                  : `Tidak ada jadwal mengajar pada hari ${selectedDayName} ini.`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSchedules.map(schedule => {
                const filledInfo = filledAgendas[schedule.id];
                const isFilled = !!filledInfo;

                return (
                  <div 
                    key={schedule.id}
                    onClick={() => {
                      if (!isFilled) openModal(schedule);
                    }}
                    className={`relative p-5 rounded-xl border-2 transition-all ${isFilled ? 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-75' : 'bg-white border-emerald-200 hover:border-emerald-400 hover:shadow-md cursor-pointer'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="outline" className="bg-white">Jam ke-{schedule.jam_ke_mulai} {schedule.jam_ke_selesai > schedule.jam_ke_mulai ? `s/d ${schedule.jam_ke_selesai}` : ''}</Badge>
                      <Badge className={isFilled ? 'bg-gray-500' : 'bg-emerald-500'}>Kelas {schedule.kelas}</Badge>
                    </div>
                    <h3 className="font-bold text-lg text-gray-900 mb-4">{schedule.mata_pelajaran}</h3>
                    
                    {isFilled ? (
                      <div className="space-y-2 mt-4 pt-4 border-t">
                        <div className="flex items-center gap-2 text-sm font-bold text-emerald-600">
                          <CheckCircle2 className="w-4 h-4" /> Selesai Diisi
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className={filledInfo.status_kehadiran_guru === 'TEPAT_WAKTU' ? 'border-green-200 text-green-700 bg-green-50' : 'border-red-200 text-red-700 bg-red-50'}>
                            {filledInfo.status_kehadiran_guru.replace('_', ' ')}
                          </Badge>
                          <Badge variant="outline" className={filledInfo.status === 'VERIFIED' ? 'border-blue-200 text-blue-700 bg-blue-50' : filledInfo.status === 'REJECTED' ? 'border-red-200 text-red-700 bg-red-50' : 'border-orange-200 text-orange-700 bg-orange-50'}>
                            {filledInfo.status === 'VERIFIED' ? 'Terverifikasi' : filledInfo.status === 'REJECTED' ? 'Ditolak' : 'Menunggu Verifikasi'}
                          </Badge>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 pt-4 border-t flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-500">Belum diisi</span>
                        <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 pointer-events-none">Isi Agenda</Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      )}

      {/* MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-xl">
          <DialogHeader className="p-6 border-b bg-gray-50 shrink-0">
            <DialogTitle className="text-xl">Isi Agenda & Kehadiran Siswa</DialogTitle>
            <DialogDescription>
              {schedules.find(s => s.id === selectedSchedule)?.mata_pelajaran} - Kelas {schedules.find(s => s.id === selectedSchedule)?.kelas}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6">
            <form id="agendaForm" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Form Agenda */}
              <div className="lg:col-span-1 space-y-6">
                {submitError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{submitError}</p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label>Materi / Kegiatan</Label>
                  <Input placeholder="Isi materi yang diajarkan" value={materi} onChange={(e) => setMateri(e.target.value)} required />
                </div>

                <div className="space-y-2">
                  <Label>{isGuru ? "Bukti Kehadiran (Wajib, dari Kamera)" : "Bukti Foto (Opsional untuk Admin)"}</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 transition-colors">
                    {isGuru ? (
                      <Input type="file" accept="image/*" capture="environment" className="hidden" id="photo-upload" onChange={handleFileUpload} />
                    ) : (
                      <Input type="file" accept="image/*" className="hidden" id="photo-upload" onChange={handleFileUpload} />
                    )}
                    <Label htmlFor="photo-upload" className="cursor-pointer flex flex-col items-center justify-center gap-2">
                      {fotoUrl ? (
                        <img src={fotoUrl} alt="Preview" className="h-32 object-contain rounded-md" />
                      ) : (
                        <>
                          {isGuru ? (
                            <>
                              <Camera className="w-8 h-8 text-gray-400" />
                              <span className="text-sm text-gray-600 font-medium">Buka Kamera</span>
                              <span className="text-xs text-gray-500">Ambil foto suasana kelas</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-8 h-8 text-gray-400" />
                              <span className="text-sm text-gray-600 font-medium">Klik untuk upload foto</span>
                            </>
                          )}
                        </>
                      )}
                    </Label>
                  </div>
                </div>

                {!isGuru && (
                  <div className="space-y-2">
                    <Label>Status Kehadiran Guru</Label>
                    <Select value={statusKehadiranGuru} onValueChange={setStatusKehadiranGuru}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TEPAT_WAKTU">Tepat Waktu (Hadir)</SelectItem>
                        <SelectItem value="TERLAMBAT">Terlambat</SelectItem>
                        <SelectItem value="IZIN">Izin</SelectItem>
                        <SelectItem value="IZIN_DINAS">Izin Dinas Khusus</SelectItem>
                        <SelectItem value="SAKIT">Sakit</SelectItem>
                        <SelectItem value="ALFA">Alfa / Tanpa Keterangan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Right Column - Absensi Siswa */}
              <div className="lg:col-span-2">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <h3 className="font-bold text-lg">Kehadiran Siswa</h3>
                    <p className="text-sm text-gray-500">Klik status siswa untuk mengubah (Hadir → Sakit → Izin → Alfa)</p>
                  </div>
                </div>
                
                <div className="rounded-md border overflow-x-auto max-h-[50vh] overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-gray-50 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="w-10">No</TableHead>
                        <TableHead>Nama Siswa</TableHead>
                        <TableHead className="w-32 text-center">Status (Klik)</TableHead>
                        <TableHead>Keterangan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                            Tidak ada siswa aktif di kelas ini
                          </TableCell>
                        </TableRow>
                      ) : (
                        students.map((student, index) => (
                          <TableRow key={student.student_id}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell className="font-medium">
                              {student.nama}
                            </TableCell>
                            <TableCell className="text-center">
                              <button
                                type="button"
                                onClick={() => cycleAttendance(student.student_id, student.status)}
                                className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-colors w-20 text-center
                                  ${student.status === 'HADIR' ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200' 
                                  : student.status === 'IZIN' ? 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200'
                                  : student.status === 'SAKIT' ? 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200'
                                  : 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200'
                                  }`}
                              >
                                {student.status}
                              </button>
                            </TableCell>
                            <TableCell>
                              <Input 
                                placeholder="Opsional" 
                                className="h-8 text-sm w-full"
                                value={student.keterangan}
                                onChange={(e) => handleKeteranganChange(student.student_id, e.target.value)}
                                disabled={student.status === 'HADIR'}
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </form>
          </div>
          
          <div className="p-4 border-t bg-gray-50 shrink-0 flex justify-end">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="mr-2">Batal</Button>
            <Button type="submit" form="agendaForm" disabled={isSubmitting || !selectedSchedule} className="bg-emerald-600 hover:bg-emerald-700">
              {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : <><Save className="w-4 h-4 mr-2" /> Simpan Agenda</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
