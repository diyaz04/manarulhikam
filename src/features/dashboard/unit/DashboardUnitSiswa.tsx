import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Users, Loader2, Plus, AlertCircle, Edit, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Student {
  id: string;
  nama: string;
  nisn: string;
  nik: string | null;
  kelas: string;
  angkatan: number;
  status: string;
}

export function DashboardUnitSiswa() {
  const { activeRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    nama: "",
    nisn: "",
    nik: "",
    kelas: "",
    angkatan: new Date().getFullYear().toString(),
    status: "AKTIF"
  });

  useEffect(() => {
    if (activeRole?.lembaga_id) {
      fetchStudents();
    }
  }, [activeRole]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('lembaga_id', activeRole!.lembaga_id)
        .order('nama', { ascending: true });

      if (error) throw error;
      setStudents(data || []);
    } catch (err: any) {
      console.error("Error fetching students:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    setIsSubmitting(true);

    try {
      if (!formData.nama || !formData.nisn || !formData.kelas || !formData.angkatan) {
        throw new Error("Mohon lengkapi semua field yang wajib diisi (Nama, NISN, Kelas, Angkatan).");
      }

      // Check for duplicates in the SAME lembaga
      const { data: existing, error: checkError } = await supabase
        .from('students')
        .select('id, nama')
        .eq('lembaga_id', activeRole!.lembaga_id)
        .neq('id', editingId || '00000000-0000-0000-0000-000000000000')
        .or(`nisn.eq.${formData.nisn}${formData.nik ? `,nik.eq.${formData.nik}` : ''}`);

      if (checkError) throw checkError;
      
      if (existing && existing.length > 0) {
        throw new Error(`Data siswa dengan NISN/NIK tersebut sudah terdaftar di unit ini atas nama ${existing[0].nama}. Siswa tidak boleh didaftarkan 2x di unit yang sama.`);
      }

      if (editingId) {
        const { error: updateError } = await supabase
          .from('students')
          .update({
            nama: formData.nama,
            nisn: formData.nisn,
            nik: formData.nik || null,
            kelas: formData.kelas,
            angkatan: parseInt(formData.angkatan),
            status: formData.status
          })
          .eq('id', editingId)
          .eq('lembaga_id', activeRole!.lembaga_id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('students')
          .insert({
            lembaga_id: activeRole!.lembaga_id,
            nama: formData.nama,
            nisn: formData.nisn,
            nik: formData.nik || null,
            kelas: formData.kelas,
            angkatan: parseInt(formData.angkatan),
            status: 'AKTIF'
          });

        if (insertError) throw insertError;
      }

      // Success
      closeModal();
      fetchStudents();
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data siswa ini? Seluruh tagihan dan pembayarannya juga akan ikut terhapus.")) return;
    
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id)
        .eq('lembaga_id', activeRole!.lembaga_id);
        
      if (error) throw error;
      fetchStudents();
    } catch (err: any) {
      alert("Gagal menghapus: " + err.message);
    }
  };

  const openEditModal = (student: Student) => {
    setEditingId(student.id);
    setFormData({
      nama: student.nama,
      nisn: student.nisn,
      nik: student.nik || "",
      kelas: student.kelas,
      angkatan: student.angkatan.toString(),
      status: student.status
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({
      nama: "",
      nisn: "",
      nik: "",
      kelas: "",
      angkatan: new Date().getFullYear().toString(),
      status: "AKTIF"
    });
    setSubmitError("");
  };

  const filteredStudents = students.filter(s => 
    s.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.nisn.includes(searchQuery) ||
    (s.nik && s.nik.includes(searchQuery))
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Data Siswa/Santri</h2>
          <p className="text-gray-500 text-sm mt-1">
            Kelola data master siswa khusus unit {activeRole?.lembaga.nama}.
          </p>
        </div>
        
        <Dialog open={isModalOpen} onOpenChange={(open) => { if (!open) closeModal(); else setIsModalOpen(true); }}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 shadow-sm rounded-xl px-5 h-11 w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Input Siswa Baru
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] rounded-2xl">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Data Siswa" : "Input Data Siswa Baru"}</DialogTitle>
              <DialogDescription>
                Data akan otomatis masuk ke unit {activeRole?.lembaga.nama}.
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
                <Label htmlFor="nama">Nama Lengkap <span className="text-red-500">*</span></Label>
                <Input id="nama" placeholder="Masukkan nama lengkap" value={formData.nama} onChange={e => setFormData({...formData, nama: e.target.value})} required />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nisn">NISN <span className="text-red-500">*</span></Label>
                  <Input id="nisn" placeholder="Nomor NISN" value={formData.nisn} onChange={e => setFormData({...formData, nisn: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nik">NIK (Opsional)</Label>
                  <Input id="nik" placeholder="Nomor NIK Siswa" value={formData.nik} onChange={e => setFormData({...formData, nik: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="kelas">Kelas <span className="text-red-500">*</span></Label>
                  <Input id="kelas" placeholder="Misal: 7A, 10 IPA" value={formData.kelas} onChange={e => setFormData({...formData, kelas: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="angkatan">Tahun Angkatan <span className="text-red-500">*</span></Label>
                  <Input id="angkatan" type="number" placeholder="2024" value={formData.angkatan} onChange={e => setFormData({...formData, angkatan: e.target.value})} required />
                </div>
              </div>

              {editingId && (
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select 
                    id="status"
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="AKTIF">Aktif</option>
                    <option value="LULUS">Lulus</option>
                    <option value="KELUAR">Keluar</option>
                    <option value="ALUMNI">Alumni</option>
                  </select>
                </div>
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
              Total: {students.length} Siswa
            </CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input 
                placeholder="Cari nama, NISN, atau NIK..." 
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
              <p className="text-sm font-medium text-gray-500">Memuat data siswa...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Tidak ada data siswa yang ditemukan.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead className="w-[250px] pl-6">Nama Lengkap</TableHead>
                    <TableHead>Identitas</TableHead>
                    <TableHead>Kelas/Angkatan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right pr-6">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id} className="hover:bg-emerald-50/30 transition-colors">
                      <TableCell className="font-semibold text-gray-900 pl-6">{student.nama}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-xs">
                          <span className="text-gray-600">NISN: <span className="font-mono font-medium text-gray-900">{student.nisn}</span></span>
                          {student.nik && <span className="text-gray-600">NIK: <span className="font-mono font-medium text-gray-900">{student.nik}</span></span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-gray-900 font-medium">{student.kelas}</p>
                        <p className="text-xs text-gray-500">Angkatan {student.angkatan}</p>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${
                          student.status === 'AKTIF' ? 'bg-green-100 text-green-700 hover:bg-green-100' :
                          student.status === 'LULUS' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' :
                          student.status === 'ALUMNI' ? 'bg-purple-100 text-purple-700 hover:bg-purple-100' :
                          'bg-red-100 text-red-700 hover:bg-red-100'
                        } border-none font-bold text-[10px]`}>
                          {student.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEditModal(student)} className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(student.id)} className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50">
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
