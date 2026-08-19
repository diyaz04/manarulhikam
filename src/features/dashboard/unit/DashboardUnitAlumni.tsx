import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { 
  GraduationCap, 
  Search, 
  Plus, 
  Edit,
  Loader2,
  CheckSquare
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export function DashboardUnitAlumni() {
  const { activeRole } = useAuth();
  
  // Tab 1: Daftar Alumni
  const [alumni, setAlumni] = useState<any[]>([]);
  const [loadingAlumni, setLoadingAlumni] = useState(false);
  const [searchAlumni, setSearchAlumni] = useState("");
  
  // Modal Alumni
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nama: "",
    nisn: "",
    tahun_lulus: new Date().getFullYear().toString(),
    pekerjaan_kuliah: "",
    kontak: ""
  });

  // Tab 2: Kelulusan Massal
  const [activeStudents, setActiveStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [graduationYear, setGraduationYear] = useState<string>(new Date().getFullYear().toString());
  const [isGraduating, setIsGraduating] = useState(false);

  useEffect(() => {
    if (activeRole?.lembaga_id) {
      fetchAlumni();
      fetchActiveStudents();
    }
  }, [activeRole]);

  // --- TAB 1: ALUMNI LIST ---
  const fetchAlumni = async () => {
    try {
      setLoadingAlumni(true);
      const { data, error } = await supabase
        .from('alumni')
        .select('*')
        .eq('lembaga_id', activeRole!.lembaga_id)
        .order('tahun_lulus', { ascending: false })
        .order('nama', { ascending: true });

      if (error) throw error;
      setAlumni(data || []);
    } catch (err) {
      console.error("Error fetching alumni:", err);
    } finally {
      setLoadingAlumni(false);
    }
  };

  const handleOpenModal = (item?: any) => {
    if (item) {
      setEditingId(item.id);
      setFormData({
        nama: item.nama,
        nisn: item.nisn || "",
        tahun_lulus: item.tahun_lulus.toString(),
        pekerjaan_kuliah: item.pekerjaan_kuliah || "",
        kontak: item.kontak || ""
      });
    } else {
      setEditingId(null);
      setFormData({
        nama: "",
        nisn: "",
        tahun_lulus: new Date().getFullYear().toString(),
        pekerjaan_kuliah: "",
        kontak: ""
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmitAlumni = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        lembaga_id: activeRole!.lembaga_id,
        nama: formData.nama,
        nisn: formData.nisn || null,
        tahun_lulus: parseInt(formData.tahun_lulus),
        pekerjaan_kuliah: formData.pekerjaan_kuliah || null,
        kontak: formData.kontak || null
      };

      if (editingId) {
        const { error } = await supabase
          .from('alumni')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('alumni')
          .insert([payload]);
        if (error) throw error;
      }
      
      setIsModalOpen(false);
      fetchAlumni();
    } catch (err: any) {
      alert("Error menyimpan data alumni: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAlumni = alumni.filter(a => 
    a.nama.toLowerCase().includes(searchAlumni.toLowerCase()) || 
    a.tahun_lulus.toString().includes(searchAlumni)
  );


  // --- TAB 2: KELULUSAN MASSAL ---
  const fetchActiveStudents = async () => {
    try {
      setLoadingStudents(true);
      const { data, error } = await supabase
        .from('students')
        .select('id, nama, nisn, kelas')
        .eq('lembaga_id', activeRole!.lembaga_id)
        .eq('status', 'AKTIF')
        .order('kelas', { ascending: true })
        .order('nama', { ascending: true });

      if (error) throw error;
      
      setActiveStudents(data || []);
      
      const uniqueClasses = Array.from(new Set(data?.map(s => s.kelas))).filter(Boolean) as string[];
      setClasses(uniqueClasses);
      if (uniqueClasses.length > 0) setSelectedClass(uniqueClasses[0]);
      
    } catch (err) {
      console.error("Error fetching students:", err);
    } finally {
      setLoadingStudents(false);
    }
  };

  const toggleStudentSelection = (id: string) => {
    const newSet = new Set(selectedStudentIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedStudentIds(newSet);
  };

  const selectAllStudentsInClass = () => {
    const classStudents = activeStudents.filter(s => s.kelas === selectedClass);
    const allSelected = classStudents.every(s => selectedStudentIds.has(s.id));
    
    const newSet = new Set(selectedStudentIds);
    if (allSelected) {
      classStudents.forEach(s => newSet.delete(s.id));
    } else {
      classStudents.forEach(s => newSet.add(s.id));
    }
    setSelectedStudentIds(newSet);
  };

  const handleGraduation = async () => {
    if (selectedStudentIds.size === 0) return alert("Pilih minimal 1 siswa yang akan diluluskan.");
    if (!confirm(`Anda yakin akan meluluskan ${selectedStudentIds.size} siswa menjadi angkatan ${graduationYear}? Tindakan ini akan mengubah status mereka menjadi ALUMNI dan memindahkannya ke direktori alumni.`)) return;

    setIsGraduating(true);
    try {
      const selectedStudents = activeStudents.filter(s => selectedStudentIds.has(s.id));
      const year = parseInt(graduationYear);

      // 1. Update students table status to ALUMNI
      const { error: updateError } = await supabase
        .from('students')
        .update({ status: 'ALUMNI' })
        .in('id', Array.from(selectedStudentIds));
        
      if (updateError) throw updateError;

      // 2. Insert into alumni table
      const alumniPayload = selectedStudents.map(s => ({
        lembaga_id: activeRole!.lembaga_id,
        student_id: s.id,
        nama: s.nama,
        nisn: s.nisn,
        tahun_lulus: year
      }));

      const { error: insertError } = await supabase
        .from('alumni')
        .insert(alumniPayload);

      if (insertError) throw insertError;

      alert(`Berhasil meluluskan ${selectedStudentIds.size} siswa!`);
      setSelectedStudentIds(new Set());
      fetchActiveStudents(); // Refresh active students (graduated ones will disappear)
      fetchAlumni(); // Refresh alumni list

    } catch (err: any) {
      alert("Gagal memproses kelulusan: " + err.message);
    } finally {
      setIsGraduating(false);
    }
  };

  const classStudents = activeStudents.filter(s => s.kelas === selectedClass);
  const allClassStudentsSelected = classStudents.length > 0 && classStudents.every(s => selectedStudentIds.has(s.id));

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Manajemen Alumni</h1>
        <p className="text-gray-500 text-sm mt-1">
          Direktori alumni dan fitur kelulusan massal siswa.
        </p>
      </div>

      <Tabs defaultValue="direktori" className="w-full space-y-6">
        <TabsList className="bg-white border p-1 rounded-xl shadow-sm h-auto">
          <TabsTrigger value="direktori" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
            Direktori Alumni
          </TabsTrigger>
          <TabsTrigger value="kelulusan" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
            Kelulusan Massal
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: DIREKTORI ALUMNI */}
        <TabsContent value="direktori" className="mt-0">
          <Card className="border-0 shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="bg-white border-b pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                  <GraduationCap className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Daftar Lulusan</CardTitle>
                  <CardDescription>Total {alumni.length} alumni terdaftar</CardDescription>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input 
                    placeholder="Cari nama / tahun lulus..." 
                    className="pl-9 bg-gray-50 border-gray-200 rounded-xl"
                    value={searchAlumni}
                    onChange={(e) => setSearchAlumni(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={() => handleOpenModal()} 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm shrink-0"
                >
                  <Plus className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Tambah Manual</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loadingAlumni ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                </div>
              ) : filteredAlumni.length === 0 ? (
                <div className="text-center py-24 text-gray-500">
                  <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  Belum ada data alumni yang sesuai pencarian.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead className="pl-6 w-12 text-center">No</TableHead>
                        <TableHead>Nama Alumni</TableHead>
                        <TableHead>NISN</TableHead>
                        <TableHead className="text-center">Th. Lulus</TableHead>
                        <TableHead>Kuliah / Pekerjaan</TableHead>
                        <TableHead>Kontak</TableHead>
                        <TableHead className="text-right pr-6">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAlumni.map((item, index) => (
                        <TableRow key={item.id} className="hover:bg-gray-50/50">
                          <TableCell className="pl-6 text-center text-gray-500">{index + 1}</TableCell>
                          <TableCell className="font-bold text-gray-900">{item.nama}</TableCell>
                          <TableCell className="text-gray-500">{item.nisn || '-'}</TableCell>
                          <TableCell className="text-center font-medium bg-emerald-50 text-emerald-800">{item.tahun_lulus}</TableCell>
                          <TableCell>{item.pekerjaan_kuliah || '-'}</TableCell>
                          <TableCell>{item.kontak || '-'}</TableCell>
                          <TableCell className="text-right pr-6">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                              onClick={() => handleOpenModal(item)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: KELULUSAN MASSAL */}
        <TabsContent value="kelulusan" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Form Settings */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="border-0 shadow-sm rounded-3xl overflow-hidden">
                <CardHeader className="bg-white border-b pb-4">
                  <CardTitle className="text-lg">Pengaturan</CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div className="space-y-2">
                    <Label>Pilih Kelas</Label>
                    <select 
                      className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm bg-gray-50"
                      value={selectedClass}
                      onChange={e => setSelectedClass(e.target.value)}
                    >
                      <option value="" disabled>-- Pilih Kelas --</option>
                      {classes.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Tahun Lulus (Angkatan)</Label>
                    <Input 
                      type="number"
                      value={graduationYear}
                      onChange={e => setGraduationYear(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>

                  <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm border border-blue-100">
                    Siswa yang dipilih akan diubah statusnya menjadi <strong>ALUMNI</strong> dan dipindahkan ke direktori.
                  </div>

                  <Button 
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm"
                    disabled={selectedStudentIds.size === 0 || isGraduating}
                    onClick={handleGraduation}
                  >
                    {isGraduating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckSquare className="w-4 h-4 mr-2" />}
                    Luluskan ({selectedStudentIds.size} Siswa)
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* List Siswa */}
            <div className="lg:col-span-3">
              <Card className="border-0 shadow-sm rounded-3xl overflow-hidden h-full">
                <CardHeader className="bg-white border-b pb-4 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Daftar Siswa Kelas {selectedClass}</CardTitle>
                    <CardDescription>Ceklis siswa yang akan diluluskan.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {loadingStudents ? (
                    <div className="flex justify-center items-center h-64">
                      <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                    </div>
                  ) : !selectedClass ? (
                    <div className="text-center py-24 text-gray-500">Pilih kelas terlebih dahulu.</div>
                  ) : classStudents.length === 0 ? (
                    <div className="text-center py-24 text-gray-500">Tidak ada siswa aktif di kelas ini.</div>
                  ) : (
                    <Table>
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead className="pl-6 w-12 text-center">
                            <input 
                              type="checkbox" 
                              className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-600"
                              checked={allClassStudentsSelected}
                              onChange={selectAllStudentsInClass}
                            />
                          </TableHead>
                          <TableHead>Nama Siswa</TableHead>
                          <TableHead>NISN</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {classStudents.map(student => (
                          <TableRow key={student.id} className="hover:bg-gray-50/50">
                            <TableCell className="pl-6 text-center">
                              <input 
                                type="checkbox" 
                                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-600 cursor-pointer"
                                checked={selectedStudentIds.has(student.id)}
                                onChange={() => toggleStudentSelection(student.id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium text-gray-900 cursor-pointer" onClick={() => toggleStudentSelection(student.id)}>
                              {student.nama}
                            </TableCell>
                            <TableCell className="text-gray-500">{student.nisn}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* MODAL ALUMNI */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Data Alumni" : "Tambah Alumni Manual"}</DialogTitle>
            <DialogDescription>
              Lengkapi biodata dan informasi terkini alumni.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitAlumni} className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Lengkap</Label>
              <Input 
                required 
                value={formData.nama}
                onChange={e => setFormData({...formData, nama: e.target.value})}
                placeholder="Nama Alumni" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>NISN (Opsional)</Label>
                <Input 
                  value={formData.nisn}
                  onChange={e => setFormData({...formData, nisn: e.target.value})}
                  placeholder="0012345678" 
                />
              </div>
              <div className="space-y-2">
                <Label>Tahun Lulus</Label>
                <Input 
                  required
                  type="number"
                  value={formData.tahun_lulus}
                  onChange={e => setFormData({...formData, tahun_lulus: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Pekerjaan / Kuliah (Opsional)</Label>
              <Input 
                value={formData.pekerjaan_kuliah}
                onChange={e => setFormData({...formData, pekerjaan_kuliah: e.target.value})}
                placeholder="Contoh: Univ. Indonesia / Karyawan BUMN" 
              />
            </div>
            <div className="space-y-2">
              <Label>Kontak / No. WA (Opsional)</Label>
              <Input 
                value={formData.kontak}
                onChange={e => setFormData({...formData, kontak: e.target.value})}
                placeholder="0812xxxxxx" 
              />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Batal</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Simpan Data
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
