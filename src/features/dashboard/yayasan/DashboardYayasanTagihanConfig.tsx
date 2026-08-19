import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";

interface Lembaga { id: string; nama: string; kode: string; }
interface Template { id: string; lembaga_id: string; lembaga_nama?: string; jenis_tagihan: string; nominal: number; tipe_periode: string; keterangan: string; is_active: boolean; }
interface Override { id: string; student_id: string; student_nama?: string; nisn?: string; billing_template_id: string; template_nama?: string; tipe: string; nominal_override: number; alasan: string; start_date: string; end_date: string; }
interface Student { id: string; nama: string; nisn: string; lembaga_id: string; lembaga_nama?: string; }

export function DashboardYayasanTagihanConfig() {
  const { activeRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [lembagaList, setLembagaList] = useState<Lembaga[]>([]);
  const [templateList, setTemplateList] = useState<Template[]>([]);
  const [overrideList, setOverrideList] = useState<Override[]>([]);
  const [studentList, setStudentList] = useState<Student[]>([]);
  
  // Modals state
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  
  // Forms state
  const [templateForm, setTemplateForm] = useState<Partial<Template>>({ jenis_tagihan: "", nominal: 0, tipe_periode: "BULANAN", is_active: true, lembaga_id: "" });
  const [overrideForm, setOverrideForm] = useState<Partial<Override>>({ student_id: "", billing_template_id: "", tipe: "GRATIS", nominal_override: 0, alasan: "", start_date: "", end_date: "" });
  
  // Search
  const [studentSearch, setStudentSearch] = useState("");

  useEffect(() => {
    if (activeRole?.lembaga.kode === 'YAYASAN') fetchData();
  }, [activeRole]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [lembagaRes, templateRes, overrideRes, studentRes] = await Promise.all([
        supabase.from('lembaga').select('id, nama, kode').neq('kode', 'YAYASAN').order('nama'),
        supabase.from('billing_templates').select('*, lembaga(nama)'),
        supabase.from('student_billing_overrides').select('*, students(nama, nisn), billing_templates(jenis_tagihan)'),
        supabase.from('students').select('id, nama, nisn, lembaga_id, lembaga(nama)').limit(100) // limit for performance in UI
      ]);

      if (lembagaRes.error) throw lembagaRes.error;
      if (templateRes.error) throw templateRes.error;
      if (overrideRes.error) throw overrideRes.error;
      if (studentRes.error) throw studentRes.error;

      setLembagaList(lembagaRes.data || []);
      
      setTemplateList((templateRes.data || []).map(t => ({
        ...t, lembaga_nama: t.lembaga?.nama
      })));

      setOverrideList((overrideRes.data || []).map(o => ({
        ...o, 
        student_nama: o.students?.nama, 
        nisn: o.students?.nisn,
        template_nama: o.billing_templates?.jenis_tagihan
      })));

      setStudentList((studentRes.data || []).map((s: any) => ({
        ...s, lembaga_nama: s.lembaga?.nama
      })));

    } catch (error) {
      console.error("Error fetching tagihan config:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (templateForm.id) {
        await supabase.from('billing_templates').update(templateForm).eq('id', templateForm.id);
      } else {
        await supabase.from('billing_templates').insert([templateForm]);
      }
      setIsTemplateModalOpen(false);
      fetchData();
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    // Validasi nominal tidak boleh lebih dari standar template
    const selectedTemplate = templateList.find(t => t.id === overrideForm.billing_template_id);
    if (overrideForm.tipe === 'KERINGANAN' && selectedTemplate) {
      if ((overrideForm.nominal_override || 0) > selectedTemplate.nominal) {
        alert(`Error: Nominal keringanan (${formatRupiah(overrideForm.nominal_override || 0)}) tidak boleh lebih besar dari tarif standar template (${formatRupiah(selectedTemplate.nominal)}).`);
        setSaving(false);
        return;
      }
    }

    try {
      const payload = {
        ...overrideForm,
        nominal_override: overrideForm.tipe === 'GRATIS' ? null : overrideForm.nominal_override,
        start_date: overrideForm.start_date || null,
        end_date: overrideForm.end_date || null,
      };

      if (overrideForm.id) {
        await supabase.from('student_billing_overrides').update(payload).eq('id', overrideForm.id);
      } else {
        await supabase.from('student_billing_overrides').insert([payload]);
      }
      setIsOverrideModalOpen(false);
      fetchData();
    } catch (error: any) {
      alert("Error saving override (Mungkin siswa ini sudah punya pengaturan untuk tagihan ini): " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (table: string, id: string) => {
    if(!confirm("Yakin hapus data ini?")) return;
    try {
      await supabase.from(table).delete().eq('id', id);
      fetchData();
    } catch (error: any) {
      alert("Error hapus: " + error.message);
    }
  };

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
  };

  const filteredStudents = studentList.filter(s => 
    s.nama.toLowerCase().includes(studentSearch.toLowerCase()) || 
    s.nisn.includes(studentSearch)
  );

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Konfigurasi Tagihan</h2>
        <p className="text-muted-foreground">Atur template tarif dasar tagihan dan pengecualian/beasiswa per siswa.</p>
      </div>

      <Tabs defaultValue="template" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="template">Tarif Dasar (Template)</TabsTrigger>
          <TabsTrigger value="override">Keringanan & Gratis</TabsTrigger>
        </TabsList>

        {/* TAB 1: TEMPLATE */}
        <TabsContent value="template" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600" onClick={() => setTemplateForm({ jenis_tagihan: '', nominal: 0, tipe_periode: 'BULANAN', is_active: true, lembaga_id: lembagaList[0]?.id })}>
                  <Plus className="w-4 h-4 mr-2" /> Template Baru
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleSaveTemplate}>
                  <DialogHeader>
                    <DialogTitle>{templateForm.id ? 'Edit Template' : 'Template Tagihan Baru'}</DialogTitle>
                    <DialogDescription>Tarif dasar yang akan ditagihkan ke seluruh siswa lembaga terkait.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Lembaga Tujuan</Label>
                      <Select value={templateForm.lembaga_id} onValueChange={(val) => setTemplateForm({...templateForm, lembaga_id: val})} required disabled={!!templateForm.id}>
                        <SelectTrigger><SelectValue placeholder="Pilih Lembaga" /></SelectTrigger>
                        <SelectContent>
                          {lembagaList.map(l => <SelectItem key={l.id} value={l.id}>{l.nama}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Jenis Tagihan</Label>
                      <Input value={templateForm.jenis_tagihan} onChange={e => setTemplateForm({...templateForm, jenis_tagihan: e.target.value})} required placeholder="Misal: SPP, Uang Gedung" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Tipe Periode</Label>
                        <Select value={templateForm.tipe_periode} onValueChange={(val) => setTemplateForm({...templateForm, tipe_periode: val})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="BULANAN">Bulanan</SelectItem>
                            <SelectItem value="TAHUNAN">Tahunan</SelectItem>
                            <SelectItem value="SEKALI">Sekali (Selama Sekolah)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Nominal Standar (Rp)</Label>
                        <Input type="number" min="1" value={templateForm.nominal} onChange={e => setTemplateForm({...templateForm, nominal: Number(e.target.value)})} required />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={saving} className="bg-emerald-600">{saving ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Simpan'}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lembaga</TableHead>
                  <TableHead>Jenis Tagihan</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead className="text-right">Tarif Dasar</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templateList.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.lembaga_nama}</TableCell>
                    <TableCell>{t.jenis_tagihan}</TableCell>
                    <TableCell>{t.tipe_periode}</TableCell>
                    <TableCell className="text-right font-semibold text-emerald-700">{formatRupiah(t.nominal)}</TableCell>
                    <TableCell className="text-center">
                      <span className={`px-2 py-1 rounded text-xs ${t.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
                        {t.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => { setTemplateForm(t); setIsTemplateModalOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-red-600" onClick={() => handleDelete('billing_templates', t.id)}><Trash2 className="w-4 h-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* TAB 2: OVERRIDES */}
        <TabsContent value="override" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isOverrideModalOpen} onOpenChange={setIsOverrideModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600" onClick={() => setOverrideForm({ tipe: 'GRATIS', nominal_override: 0, student_id: '', billing_template_id: '', alasan: '' })}>
                  <Plus className="w-4 h-4 mr-2" /> Atur Keringanan
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <form onSubmit={handleSaveOverride}>
                  <DialogHeader>
                    <DialogTitle>{overrideForm.id ? 'Edit Keringanan' : 'Atur Beasiswa / Keringanan Siswa'}</DialogTitle>
                    <DialogDescription>Penyesuaian tagihan otomatis saat generate massal.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Cari Siswa</Label>
                      {!overrideForm.id && (
                        <Input 
                          placeholder="Ketik NISN atau Nama..." 
                          value={studentSearch} 
                          onChange={(e) => setStudentSearch(e.target.value)} 
                          className="mb-2"
                        />
                      )}
                      <Select value={overrideForm.student_id} onValueChange={(val) => setOverrideForm({...overrideForm, student_id: val})} required disabled={!!overrideForm.id}>
                        <SelectTrigger><SelectValue placeholder="Pilih Siswa" /></SelectTrigger>
                        <SelectContent>
                          {filteredStudents.map(s => <SelectItem key={s.id} value={s.id}>{s.nama} ({s.nisn}) - {s.lembaga_nama}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Jenis Tagihan (Template)</Label>
                      <Select value={overrideForm.billing_template_id} onValueChange={(val) => setOverrideForm({...overrideForm, billing_template_id: val})} required disabled={!!overrideForm.id}>
                        <SelectTrigger><SelectValue placeholder="Pilih Template" /></SelectTrigger>
                        <SelectContent>
                          {templateList.map(t => <SelectItem key={t.id} value={t.id}>{t.jenis_tagihan} ({t.lembaga_nama}) - {formatRupiah(t.nominal)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border p-4 bg-gray-50 rounded-lg">
                      <div className="space-y-2">
                        <Label>Tipe Pengecualian</Label>
                        <Select value={overrideForm.tipe} onValueChange={(val: "GRATIS"|"KERINGANAN") => setOverrideForm({...overrideForm, tipe: val})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="GRATIS">Gratis (100% Bebas)</SelectItem>
                            <SelectItem value="KERINGANAN">Keringanan (Diskon/Custom)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Nominal Baru {overrideForm.tipe === 'GRATIS' && '(Otomatis Rp 0)'}</Label>
                        <Input 
                          type="number" 
                          value={overrideForm.tipe === 'GRATIS' ? 0 : overrideForm.nominal_override} 
                          onChange={e => setOverrideForm({...overrideForm, nominal_override: Number(e.target.value)})} 
                          disabled={overrideForm.tipe === 'GRATIS'}
                          required={overrideForm.tipe === 'KERINGANAN'}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Alasan (Opsional tapi disarankan)</Label>
                      <Select value={overrideForm.alasan} onValueChange={(val) => setOverrideForm({...overrideForm, alasan: val})}>
                        <SelectTrigger><SelectValue placeholder="Pilih Preset Alasan" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Anak Yatim / Piatu">Anak Yatim / Piatu</SelectItem>
                          <SelectItem value="Anak Guru / Pegawai">Anak Guru / Pegawai</SelectItem>
                          <SelectItem value="Siswa Berprestasi">Siswa Berprestasi</SelectItem>
                          <SelectItem value="Keluarga Kurang Mampu">Keluarga Kurang Mampu</SelectItem>
                          <SelectItem value="Lainnya">Lainnya</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border p-4 rounded-lg">
                      <div className="space-y-2">
                        <Label>Masa Berlaku Dari (Opsional)</Label>
                        <Input type="date" value={overrideForm.start_date || ""} onChange={e => setOverrideForm({...overrideForm, start_date: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Hingga Tanggal (Opsional)</Label>
                        <Input type="date" value={overrideForm.end_date || ""} onChange={e => setOverrideForm({...overrideForm, end_date: e.target.value})} />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={saving} className="bg-emerald-600">{saving ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Simpan Keringanan'}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Siswa</TableHead>
                  <TableHead>Tagihan</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead className="text-right">Nominal Baru</TableHead>
                  <TableHead>Alasan & Masa Berlaku</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overrideList.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">Belum ada pengaturan keringanan.</TableCell></TableRow>
                ) : overrideList.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <div className="font-medium">{o.student_nama}</div>
                      <div className="text-xs text-gray-500">{o.nisn}</div>
                    </TableCell>
                    <TableCell>{o.template_nama}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${o.tipe === 'GRATIS' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                        {o.tipe}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{o.tipe === 'GRATIS' ? 'Rp 0' : formatRupiah(o.nominal_override)}</TableCell>
                    <TableCell>
                      <div className="text-sm">{o.alasan}</div>
                      <div className="text-xs text-gray-500">
                        {o.start_date || 'Seterusnya'} - {o.end_date || 'Selamanya'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => { setOverrideForm(o); setIsOverrideModalOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-red-600" onClick={() => handleDelete('student_billing_overrides', o.id)}><Trash2 className="w-4 h-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
