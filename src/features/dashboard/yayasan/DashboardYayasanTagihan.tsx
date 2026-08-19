import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Download, AlertTriangle, CheckCircle2, Search, X } from "lucide-react";
import * as XLSX from "xlsx";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Lembaga { id: string; nama: string; kode: string; }
interface Template { id: string; lembaga_id: string; jenis_tagihan: string; nominal: number; tipe_periode: string; }
interface Bill { id: string; student_id: string; student_nama?: string; nisn?: string; kelas?: string; lembaga_nama?: string; jenis_tagihan_final: string; nominal: number; nominal_terbayar: number; status: string; }

export function DashboardYayasanTagihan() {
  const { activeRole } = useAuth();
  const [loading, setLoading] = useState(true);
  
  const [lembagaList, setLembagaList] = useState<Lembaga[]>([]);
  const [templateList, setTemplateList] = useState<Template[]>([]);
  const [billsList, setBillsList] = useState<Bill[]>([]);
  
  // Filters
  const [selectedLembaga, setSelectedLembaga] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  // Generate Massal State
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [targetBulan, setTargetBulan] = useState(new Date().getMonth() + 1);
  const [targetTahun, setTargetTahun] = useState(new Date().getFullYear());
  
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateSuccess, setGenerateSuccess] = useState(false);

  useEffect(() => {
    if (activeRole?.lembaga.kode === 'YAYASAN') fetchInitialData();
  }, [activeRole]);

  useEffect(() => {
    fetchBills();
  }, [selectedLembaga]);

  const fetchInitialData = async () => {
    try {
      const [lembagaRes, templateRes] = await Promise.all([
        supabase.from('lembaga').select('*').neq('kode', 'YAYASAN').order('nama'),
        supabase.from('billing_templates').select('*').eq('is_active', true)
      ]);
      setLembagaList(lembagaRes.data || []);
      setTemplateList(templateRes.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBills = async () => {
    try {
      setLoading(true);
      let query = supabase.from('bills').select('*, students!inner(nama, nisn, kelas, lembaga_id, lembaga(nama))').order('created_at', { ascending: false }).limit(500);
      
      if (selectedLembaga !== "ALL") {
        query = query.eq('students.lembaga_id', selectedLembaga);
      }

      const { data, error } = await query;
      if (error) throw error;

      const formatted = (data || []).map(b => ({
        ...b,
        student_nama: b.students?.nama,
        nisn: b.students?.nisn,
        kelas: b.students?.kelas,
        lembaga_nama: b.students?.lembaga?.nama
      }));
      setBillsList(formatted);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
  };

  const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  const generatePreview = async () => {
    setIsPreviewing(true);
    setPreviewData([]);
    
    try {
      const template = templateList.find(t => t.id === selectedTemplateId);
      if (!template) return;

      // 1. Get all active students for this template's lembaga
      const { data: students, error: studentErr } = await supabase
        .from('students')
        .select('*')
        .eq('lembaga_id', template.lembaga_id)
        .eq('status', 'AKTIF');
      if (studentErr) throw studentErr;

      // 2. Get all overrides for this template
      const { data: overrides, error: overrideErr } = await supabase
        .from('student_billing_overrides')
        .select('*')
        .eq('billing_template_id', template.id);
      if (overrideErr) throw overrideErr;

      // 3. Format suffix based on tipe_periode
      let tagihanFinal = template.jenis_tagihan;
      if (template.tipe_periode === 'BULANAN') {
        tagihanFinal = `${template.jenis_tagihan} (${BULAN[targetBulan - 1]} ${targetTahun})`;
      } else if (template.tipe_periode === 'TAHUNAN') {
        tagihanFinal = `${template.jenis_tagihan} (${targetTahun})`;
      }

      // 4. Check existing bills to prevent duplicates
      const { data: existingBills, error: existingErr } = await supabase
        .from('bills')
        .select('student_id')
        .eq('jenis_tagihan_final', tagihanFinal)
        .in('student_id', students.map(s => s.id));
      if (existingErr) throw existingErr;
      const existingStudentIds = new Set(existingBills.map(b => b.student_id));

      // 5. Calculate preview
      const preview = [];
      const today = new Date();

      for (const student of students) {
        if (existingStudentIds.has(student.id)) continue; // Skip duplicate

        let finalNominal = template.nominal;
        let note = "Normal";
        let skip = false;

        const override = overrides.find(o => o.student_id === student.id);
        if (override) {
          // Check date validity
          let valid = true;
          if (override.start_date && new Date(override.start_date) > today) valid = false;
          if (override.end_date && new Date(override.end_date) < today) valid = false;

          if (valid) {
            if (override.tipe === 'GRATIS') {
              skip = true;
              note = "Dilewati (Gratis 100%)";
            } else if (override.tipe === 'KERINGANAN') {
              finalNominal = override.nominal_override;
              note = "Keringanan Diterapkan";
            }
          }
        }

        if (!skip) {
          preview.push({
            student_id: student.id,
            nama: student.nama,
            nisn: student.nisn,
            jenis_tagihan_final: tagihanFinal,
            nominal: finalNominal,
            note
          });
        }
      }

      setPreviewData(preview);
    } catch (err: any) {
      alert("Error generating preview: " + err.message);
    } finally {
      setIsPreviewing(false);
    }
  };

  const executeGenerate = async () => {
    if (previewData.length === 0) return;
    setIsGenerating(true);
    
    try {
      const inserts = previewData.map(p => ({
        student_id: p.student_id,
        jenis_tagihan_final: p.jenis_tagihan_final,
        nominal: p.nominal,
        nominal_terbayar: 0,
        status: 'UNPAID'
      }));

      const { error } = await supabase.from('bills').insert(inserts);
      if (error) throw error;

      setGenerateSuccess(true);
      fetchBills(); // Refresh table
      
      setTimeout(() => {
        setGenerateSuccess(false);
        setIsGenerateModalOpen(false);
        setPreviewData([]);
      }, 3000);
      
    } catch (err: any) {
      alert("Error execution: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTarikTagihan = async (billId: string, status: string, terbayar: number) => {
    if (status === 'UNPAID') {
      if(!confirm("Yakin ingin menarik (menghapus) tagihan ini?")) return;
      try {
        await supabase.from('bills').delete().eq('id', billId);
        fetchBills();
      } catch (err: any) {
        alert("Gagal menghapus: " + err.message);
      }
    } else {
      // Jika sudah ada pembayaran (PARTIAL / PAID)
      const choice = prompt("Peringatan: Tagihan ini sudah ada pembayaran masuk (Rp " + formatRupiah(terbayar) + ").\n\nKetik '1' untuk MENGHAPUS SISA TAGIHAN saja (Dianggap Lunas).\nKetik '2' untuk REFUND (Hapus Tagihan & Catat Pengeluaran Kas Yayasan).");
      
      if (choice === '1') {
        try {
          await supabase.from('bills').update({ nominal: terbayar, status: 'PAID' }).eq('id', billId);
          alert("Sisa tagihan berhasil dihapuskan. Status menjadi Lunas.");
          fetchBills();
        } catch (e:any) { alert(e.message); }
      } else if (choice === '2') {
        try {
          // Harus catat ke transaksi keuangan sebagai pengeluaran (Refund)
          alert("Fitur Refund otomatis sedang dikembangkan. Silakan hapus sisa tagihan manual dan catat pengeluaran di Keuangan Umum.");
        } catch (e:any) { alert(e.message); }
      }
    }
  };

  const exportToExcel = () => {
    const wsData = billsList.map(b => ({
      'Siswa': b.student_nama,
      'NISN': b.nisn,
      'Kelas': b.kelas,
      'Lembaga': b.lembaga_nama,
      'Tagihan': b.jenis_tagihan_final,
      'Nominal': b.nominal,
      'Terbayar': b.nominal_terbayar,
      'Status': b.status
    }));

    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daftar Tagihan");
    XLSX.writeFile(wb, `Data_Tagihan_${new Date().getTime()}.xlsx`);
  };

  const filteredBills = billsList.filter(b => 
    b.student_nama?.toLowerCase().includes(search.toLowerCase()) || 
    b.nisn?.includes(search) ||
    b.jenis_tagihan_final.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Manajemen Tagihan</h2>
          <p className="text-muted-foreground">Buat tagihan massal, pantau pembayaran, dan tarik tagihan salah.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="text-emerald-700" onClick={exportToExcel}>
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
          
          <Dialog open={isGenerateModalOpen} onOpenChange={(open) => {
            setIsGenerateModalOpen(open);
            if(!open) setPreviewData([]);
          }}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600">
                <Plus className="w-4 h-4 mr-2" /> Generate Massal
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
              {generateSuccess ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-4">
                  <CheckCircle2 className="w-16 h-16 text-emerald-500" />
                  <h3 className="text-xl font-bold text-emerald-900">Tagihan Berhasil Dibuat!</h3>
                  <p className="text-gray-500">{previewData.length} tagihan telah diterbitkan ke siswa.</p>
                </div>
              ) : (
                <>
                  <DialogHeader>
                    <DialogTitle>Generate Tagihan Massal</DialogTitle>
                    <DialogDescription>Sistem akan otomatis mengecek siswa aktif, melewati siswa gratis, dan menyesuaikan diskon keringanan.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Pilih Template Tagihan Dasar</Label>
                      <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                        <SelectTrigger><SelectValue placeholder="Pilih Template..." /></SelectTrigger>
                        <SelectContent>
                          {templateList.map(t => {
                            const lbg = lembagaList.find(l => l.id === t.lembaga_id);
                            return (
                              <SelectItem key={t.id} value={t.id}>
                                {t.jenis_tagihan} ({lbg?.kode}) - {formatRupiah(t.nominal)} /{t.tipe_periode}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedTemplateId && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Bulan Target</Label>
                          <Select value={targetBulan.toString()} onValueChange={v => setTargetBulan(parseInt(v))}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                              {BULAN.map((b, i) => <SelectItem key={i} value={(i+1).toString()}>{b}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Tahun Target</Label>
                          <Input type="number" value={targetTahun} onChange={e => setTargetTahun(parseInt(e.target.value))} />
                        </div>
                      </div>
                    )}

                    {previewData.length > 0 && (
                      <div className="mt-6 border rounded-md">
                        <div className="bg-amber-50 p-3 border-b text-sm text-amber-900 flex items-center">
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          <strong>Review:</strong> {previewData.length} tagihan siap diterbitkan. Siswa yang sudah ditagih (duplikat) otomatis di-skip.
                        </div>
                        <div className="max-h-[250px] overflow-y-auto p-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Siswa</TableHead>
                                <TableHead>Tagihan Final</TableHead>
                                <TableHead className="text-right">Nominal</TableHead>
                                <TableHead>Catatan</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {previewData.map((p, idx) => (
                                <TableRow key={idx}>
                                  <TableCell className="py-2"><span className="font-medium">{p.nama}</span> <br/><span className="text-xs text-gray-500">{p.nisn}</span></TableCell>
                                  <TableCell className="py-2">{p.jenis_tagihan_final}</TableCell>
                                  <TableCell className="py-2 text-right">{formatRupiah(p.nominal)}</TableCell>
                                  <TableCell className="py-2 text-xs">{p.note}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    {previewData.length === 0 ? (
                      <Button onClick={generatePreview} disabled={!selectedTemplateId || isPreviewing} className="w-full">
                        {isPreviewing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />} Lihat Preview
                      </Button>
                    ) : (
                      <div className="flex w-full gap-2">
                        <Button variant="outline" onClick={() => setPreviewData([])} className="flex-1">Batal</Button>
                        <Button onClick={executeGenerate} disabled={isGenerating} className="flex-1 bg-emerald-600">
                          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Terbitkan Sekarang'}
                        </Button>
                      </div>
                    )}
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="bg-gray-50 border-b pb-4">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex items-center gap-2">
              <Label className="whitespace-nowrap">Filter Lembaga:</Label>
              <Select value={selectedLembaga} onValueChange={setSelectedLembaga}>
                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Lembaga</SelectItem>
                  {lembagaList.map(l => <SelectItem key={l.id} value={l.id}>{l.nama}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input placeholder="Cari nama siswa, NISN, atau tagihan..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lembaga</TableHead>
              <TableHead>Siswa</TableHead>
              <TableHead>Tagihan</TableHead>
              <TableHead className="text-right">Total Nominal</TableHead>
              <TableHead className="text-right">Kekurangan</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
               <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600" /></TableCell></TableRow>
            ) : filteredBills.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-500">Tidak ada tagihan ditemukan.</TableCell></TableRow>
            ) : filteredBills.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="text-xs text-gray-500">{b.lembaga_nama}</TableCell>
                <TableCell>
                  <div className="font-medium">{b.student_nama}</div>
                  <div className="text-xs text-gray-500">{b.nisn} - Kls {b.kelas}</div>
                </TableCell>
                <TableCell className="font-medium">{b.jenis_tagihan_final}</TableCell>
                <TableCell className="text-right">{formatRupiah(b.nominal)}</TableCell>
                <TableCell className="text-right font-semibold text-red-600">
                  {formatRupiah(b.nominal - b.nominal_terbayar)}
                </TableCell>
                <TableCell className="text-center">
                  {b.status === 'PAID' && <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-xs font-bold">LUNAS</span>}
                  {b.status === 'PARTIAL' && <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-xs font-bold">MENCICIL</span>}
                  {b.status === 'UNPAID' && <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-bold">BELUM DIBAYAR</span>}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-800 hover:bg-red-50" title="Tarik Tagihan" onClick={() => handleTarikTagihan(b.id, b.status, b.nominal_terbayar)}>
                    <X className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
