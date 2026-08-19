import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { 
  ClipboardList, 
  Settings, 
  FileText, 
  ListOrdered, 
  Users, 
  Plus, 
  Trash2, 
  Save,
  Loader2,
  Download,
  Eye,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import * as XLSX from "xlsx";

export function DashboardUnitSpmb() {
  const { activeRole } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<any>(null);
  
  // Tabs State
  const [formFields, setFormFields] = useState<any[]>([]);
  const [reqDocs, setReqDocs] = useState<any[]>([]);
  const [pendaftar, setPendaftar] = useState<any[]>([]);

  // Local Config Form State
  const [configForm, setConfigForm] = useState({
    aktif: false,
    nama_program: "Penerimaan Murid Baru",
    tahun_pelajaran: new Date().getFullYear().toString(),
    tanggal_buka: "",
    tanggal_tutup: ""
  });
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Modal Detail Pendaftar
  const [selectedPendaftar, setSelectedPendaftar] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (activeRole?.lembaga_id) {
      loadInitialData();
    }
  }, [activeRole]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // 1. Get or create Config
      let { data: configData, error: configError } = await supabase
        .from('spmb_config')
        .select('*')
        .eq('lembaga_id', activeRole!.lembaga_id)
        .maybeSingle();

      if (configError) throw configError;

      if (!configData) {
        // Create initial config if not exists
        const { data: newConfig, error: insertError } = await supabase
          .from('spmb_config')
          .insert([{ 
            lembaga_id: activeRole!.lembaga_id, 
            nama_program: 'Penerimaan Murid Baru',
            tahun_pelajaran: new Date().getFullYear().toString()
          }])
          .select()
          .single();
          
        if (insertError) throw insertError;
        configData = newConfig;
      }

      setConfig(configData);
      setConfigForm({
        aktif: configData.aktif || false,
        nama_program: configData.nama_program || "",
        tahun_pelajaran: configData.tahun_pelajaran || "",
        tanggal_buka: configData.tanggal_buka || "",
        tanggal_tutup: configData.tanggal_tutup || ""
      });

      // 2. Get Fields
      const { data: fieldsData } = await supabase
        .from('spmb_form_fields')
        .select('*')
        .eq('config_id', configData.id)
        .order('urutan', { ascending: true });
      setFormFields(fieldsData || []);

      // 3. Get Docs
      const { data: docsData } = await supabase
        .from('spmb_required_docs')
        .select('*')
        .eq('config_id', configData.id)
        .order('urutan', { ascending: true });
      setReqDocs(docsData || []);

      // 4. Get Pendaftar
      const { data: pendaftarData } = await supabase
        .from('spmb_pendaftar')
        .select(`
          *,
          dokumen:spmb_pendaftar_dokumen(*)
        `)
        .eq('config_id', configData.id)
        .order('tanggal_daftar', { ascending: false });
      setPendaftar(pendaftarData || []);

    } catch (err: any) {
      console.error("Error loading SPMB data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!config) return;
    setIsSavingConfig(true);
    try {
      const { error } = await supabase
        .from('spmb_config')
        .update({
          aktif: configForm.aktif,
          nama_program: configForm.nama_program,
          tahun_pelajaran: configForm.tahun_pelajaran,
          tanggal_buka: configForm.tanggal_buka || null,
          tanggal_tutup: configForm.tanggal_tutup || null
        })
        .eq('id', config.id);

      if (error) throw error;
      alert("Pengaturan berhasil disimpan.");
    } catch (err: any) {
      alert("Gagal menyimpan: " + err.message);
    } finally {
      setIsSavingConfig(false);
    }
  };

  // --- Form Fields Logic ---
  const addField = async () => {
    try {
      const newField = {
        config_id: config.id,
        label: "Field Baru",
        tipe_field: "text",
        wajib: true,
        urutan: formFields.length
      };
      const { data, error } = await supabase.from('spmb_form_fields').insert([newField]).select().single();
      if (error) throw error;
      setFormFields([...formFields, data]);
    } catch (err: any) { alert(err.message); }
  };

  const updateField = async (index: number, key: string, value: any) => {
    const updated = [...formFields];
    updated[index][key] = value;
    setFormFields(updated);
    
    // Save to db (debounced/direct)
    await supabase.from('spmb_form_fields').update({ [key]: value }).eq('id', updated[index].id);
  };

  const deleteField = async (id: string) => {
    try {
      await supabase.from('spmb_form_fields').delete().eq('id', id);
      setFormFields(formFields.filter(f => f.id !== id));
    } catch (err: any) { alert(err.message); }
  };

  // --- Required Docs Logic ---
  const addDoc = async () => {
    try {
      const newDoc = {
        config_id: config.id,
        nama_dokumen: "Dokumen Baru",
        wajib: true,
        urutan: reqDocs.length
      };
      const { data, error } = await supabase.from('spmb_required_docs').insert([newDoc]).select().single();
      if (error) throw error;
      setReqDocs([...reqDocs, data]);
    } catch (err: any) { alert(err.message); }
  };

  const updateDoc = async (index: number, key: string, value: any) => {
    const updated = [...reqDocs];
    updated[index][key] = value;
    setReqDocs(updated);
    await supabase.from('spmb_required_docs').update({ [key]: value }).eq('id', updated[index].id);
  };

  const deleteDoc = async (id: string) => {
    try {
      await supabase.from('spmb_required_docs').delete().eq('id', id);
      setReqDocs(reqDocs.filter(d => d.id !== id));
    } catch (err: any) { alert(err.message); }
  };

  // --- Export Excel ---
  const exportToExcel = () => {
    if (pendaftar.length === 0) return;
    
    // Flatten data_isian
    const formattedData = pendaftar.map((p, idx) => {
      const flat: any = {
        "No": idx + 1,
        "No Pendaftaran": p.no_pendaftaran,
        "Tanggal Daftar": new Date(p.tanggal_daftar).toLocaleDateString('id-ID')
      };
      
      // Dynamic fields
      formFields.forEach(f => {
        flat[f.label] = p.data_isian[f.id] || "-";
      });

      return flat;
    });

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Pendaftar ${configForm.tahun_pelajaran}`);
    XLSX.writeFile(workbook, `Data_Pendaftar_SPMB_${configForm.tahun_pelajaran}.xlsx`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Modul SPMB</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manajemen Penerimaan Murid/Santri Baru untuk unit {activeRole?.lembaga.kode}.
          </p>
        </div>
        <div className={`px-4 py-2 rounded-full border text-sm font-bold flex items-center gap-2 ${configForm.aktif ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
          {configForm.aktif ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          Status Pendaftaran: {configForm.aktif ? 'DIBUKA' : 'DITUTUP'}
        </div>
      </div>

      <Tabs defaultValue="pengaturan" className="w-full space-y-6">
        <TabsList className="bg-gray-100/80 p-1.5 rounded-xl h-auto grid grid-cols-2 md:grid-cols-4 gap-1.5">
          <TabsTrigger value="pengaturan" className="rounded-lg py-2.5 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-700 text-gray-600 hover:text-gray-900 transition-all">
            <Settings className="w-4 h-4 mr-2" /> Pengaturan Umum
          </TabsTrigger>
          <TabsTrigger value="form" className="rounded-lg py-2.5 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-700 text-gray-600 hover:text-gray-900 transition-all">
            <ListOrdered className="w-4 h-4 mr-2" /> Builder Formulir
          </TabsTrigger>
          <TabsTrigger value="dokumen" className="rounded-lg py-2.5 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-700 text-gray-600 hover:text-gray-900 transition-all">
            <FileText className="w-4 h-4 mr-2" /> Persyaratan Berkas
          </TabsTrigger>
          <TabsTrigger value="pendaftar" className="rounded-lg py-2.5 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-700 text-gray-600 hover:text-gray-900 transition-all">
            <Users className="w-4 h-4 mr-2" /> Data Pendaftar
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: PENGATURAN UMUM */}
        <TabsContent value="pengaturan" className="mt-0">
          <Card className="border-0 shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="bg-white border-b pb-4">
              <CardTitle className="text-lg">Pengaturan Landing Page & Gelombang</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6 max-w-2xl">
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="space-y-0.5">
                    <Label className="text-base font-bold text-gray-900">Aktifkan Pendaftaran</Label>
                    <p className="text-sm text-gray-500">Jika aktif, seksi SPMB akan muncul di Landing Page untuk publik.</p>
                  </div>
                  <Switch 
                    checked={configForm.aktif}
                    onCheckedChange={(val) => setConfigForm({...configForm, aktif: val})}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Nama Program SPMB</Label>
                    <Input 
                      value={configForm.nama_program}
                      onChange={e => setConfigForm({...configForm, nama_program: e.target.value})}
                      placeholder="Contoh: PPDB Reguler Gel. 1"
                      className="rounded-xl bg-gray-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tahun Pelajaran</Label>
                    <Input 
                      value={configForm.tahun_pelajaran}
                      onChange={e => setConfigForm({...configForm, tahun_pelajaran: e.target.value})}
                      placeholder="Contoh: 2026/2027"
                      className="rounded-xl bg-gray-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Tanggal Buka (Opsional)</Label>
                    <Input 
                      type="date"
                      value={configForm.tanggal_buka}
                      onChange={e => setConfigForm({...configForm, tanggal_buka: e.target.value})}
                      className="rounded-xl bg-gray-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tanggal Tutup (Opsional)</Label>
                    <Input 
                      type="date"
                      value={configForm.tanggal_tutup}
                      onChange={e => setConfigForm({...configForm, tanggal_tutup: e.target.value})}
                      className="rounded-xl bg-gray-50"
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleSaveConfig} 
                  disabled={isSavingConfig}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm"
                >
                  {isSavingConfig ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Simpan Pengaturan
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: FORM BUILDER */}
        <TabsContent value="form" className="mt-0">
          <Card className="border-0 shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="bg-white border-b pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Form Builder</CardTitle>
                <CardDescription>Rancang isian formulir pendaftaran yang akan diisi calon siswa.</CardDescription>
              </div>
              <Button onClick={addField} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
                <Plus className="w-4 h-4 mr-1" /> Tambah Field
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {formFields.length === 0 ? (
                <div className="text-center py-16 text-gray-400">Belum ada field formulir.</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {formFields.map((field, idx) => (
                    <div key={field.id} className="p-4 md:p-6 bg-white hover:bg-gray-50 transition-colors flex flex-col md:flex-row gap-4 items-start md:items-center">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 w-full">
                        
                        <div className="md:col-span-1 flex items-center justify-center font-bold text-gray-300">
                          #{idx + 1}
                        </div>
                        
                        <div className="md:col-span-5 space-y-1">
                          <Label className="text-xs text-gray-500">Label Pertanyaan</Label>
                          <Input 
                            value={field.label}
                            onChange={(e) => updateField(idx, 'label', e.target.value)}
                            className="h-9 rounded-lg"
                            placeholder="Cth: Nama Lengkap"
                          />
                        </div>

                        <div className="md:col-span-3 space-y-1">
                          <Label className="text-xs text-gray-500">Tipe Input</Label>
                          <select 
                            className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm bg-white"
                            value={field.tipe_field}
                            onChange={(e) => updateField(idx, 'tipe_field', e.target.value)}
                          >
                            <option value="text">Teks Singkat</option>
                            <option value="textarea">Teks Panjang</option>
                            <option value="number">Angka / Nominal</option>
                            <option value="date">Tanggal</option>
                            <option value="select">Pilihan Ganda (Dropdown)</option>
                          </select>
                        </div>

                        <div className="md:col-span-2 space-y-1 flex flex-col justify-center">
                          <Label className="text-xs text-gray-500 mb-2">Wajib Diisi?</Label>
                          <Switch 
                            checked={field.wajib}
                            onCheckedChange={(val) => updateField(idx, 'wajib', val)}
                          />
                        </div>

                        {field.tipe_field === 'select' && (
                          <div className="md:col-span-11 md:col-start-2 mt-2">
                            <Label className="text-xs text-gray-500">Opsi Pilihan (Pisahkan dengan koma)</Label>
                            <Input 
                              value={Array.isArray(field.options) ? field.options.join(',') : ''}
                              onChange={(e) => {
                                const arr = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                                updateField(idx, 'options', arr);
                              }}
                              className="h-9 rounded-lg text-xs"
                              placeholder="Cth: Laki-laki, Perempuan"
                            />
                          </div>
                        )}
                      </div>
                      
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => deleteField(field.id)}
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0 self-end md:self-auto"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: DOKUMEN BUILDER */}
        <TabsContent value="dokumen" className="mt-0">
          <Card className="border-0 shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="bg-white border-b pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Persyaratan Berkas</CardTitle>
                <CardDescription>Atur daftar file/dokumen (PDF/Gambar) yang harus diunggah pendaftar.</CardDescription>
              </div>
              <Button onClick={addDoc} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
                <Plus className="w-4 h-4 mr-1" /> Tambah Berkas
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {reqDocs.length === 0 ? (
                <div className="text-center py-16 text-gray-400">Belum ada persyaratan berkas.</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {reqDocs.map((doc, idx) => (
                    <div key={doc.id} className="p-4 bg-white hover:bg-gray-50 transition-colors flex items-center gap-4">
                       <div className="flex items-center justify-center font-bold text-gray-300 w-8">
                          #{idx + 1}
                        </div>
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs text-gray-500">Nama Dokumen</Label>
                          <Input 
                            value={doc.nama_dokumen}
                            onChange={(e) => updateDoc(idx, 'nama_dokumen', e.target.value)}
                            className="h-9 rounded-lg"
                            placeholder="Cth: Scan Kartu Keluarga"
                          />
                        </div>
                        <div className="space-y-1 w-24">
                          <Label className="text-xs text-gray-500 mb-2 block">Wajib Upload?</Label>
                          <Switch 
                            checked={doc.wajib}
                            onCheckedChange={(val) => updateDoc(idx, 'wajib', val)}
                          />
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => deleteDoc(doc.id)}
                          className="text-red-400 hover:text-red-600 hover:bg-red-50 mt-5"
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: DATA PENDAFTAR */}
        <TabsContent value="pendaftar" className="mt-0">
          <Card className="border-0 shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="bg-white border-b pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Data Pendaftar</CardTitle>
                <CardDescription>Total: {pendaftar.length} calon siswa untuk tahun ajaran {configForm.tahun_pelajaran}.</CardDescription>
              </div>
              <Button 
                onClick={exportToExcel} 
                disabled={pendaftar.length === 0}
                variant="outline" 
                className="rounded-xl border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Excel
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {pendaftar.length === 0 ? (
                <div className="text-center py-24 text-gray-500">
                  <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  Belum ada data pendaftar.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead className="pl-6 w-12 text-center">No</TableHead>
                        <TableHead>No. Registrasi</TableHead>
                        <TableHead>Tanggal Daftar</TableHead>
                        {/* Show first 2 dynamic fields as summary in table if available */}
                        {formFields.slice(0,2).map(f => (
                          <TableHead key={f.id}>{f.label}</TableHead>
                        ))}
                        <TableHead className="text-right pr-6">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendaftar.map((p, index) => (
                        <TableRow key={p.id} className="hover:bg-gray-50/50">
                          <TableCell className="pl-6 text-center text-gray-500">{index + 1}</TableCell>
                          <TableCell className="font-bold text-emerald-700">{p.no_pendaftaran}</TableCell>
                          <TableCell className="text-gray-500">
                            {new Date(p.tanggal_daftar).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric'})}
                          </TableCell>
                          {formFields.slice(0,2).map(f => (
                            <TableCell key={f.id} className="truncate max-w-[150px]">
                              {p.data_isian[f.id] || '-'}
                            </TableCell>
                          ))}
                          <TableCell className="text-right pr-6">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => { setSelectedPendaftar(p); setIsModalOpen(true); }}
                            >
                              <Eye className="w-4 h-4 mr-1" /> Detail
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
      </Tabs>

      {/* MODAL DETAIL PENDAFTAR */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl">Detail Pendaftar</DialogTitle>
            <DialogDescription>
              No. Reg: <span className="font-bold text-emerald-700">{selectedPendaftar?.no_pendaftaran}</span>
            </DialogDescription>
          </DialogHeader>
          
          {selectedPendaftar && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 border-b pb-1">Data Isian Formulir</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6">
                  {formFields.map(f => (
                    <div key={f.id}>
                      <span className="text-xs text-gray-500 block mb-0.5">{f.label}</span>
                      <span className="text-sm font-medium text-gray-900">
                        {selectedPendaftar.data_isian[f.id] || <span className="text-gray-400 italic">Kosong</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 border-b pb-1">Lampiran Dokumen</h4>
                {selectedPendaftar.dokumen && selectedPendaftar.dokumen.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2">
                    {selectedPendaftar.dokumen.map((doc: any) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 border rounded-xl">
                        <span className="text-sm font-medium text-gray-700">{doc.nama_dokumen}</span>
                        <a 
                          href={doc.file_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-blue-600 hover:underline flex items-center"
                        >
                          Lihat File <Eye className="w-3 h-3 ml-1" />
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">Tidak ada dokumen yang dilampirkan.</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
