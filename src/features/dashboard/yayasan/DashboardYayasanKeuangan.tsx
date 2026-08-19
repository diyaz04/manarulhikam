import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CloudinaryUpload } from "@/components/common/CloudinaryUpload";
import { Loader2, Plus, Pencil, Trash2, X, Save, TrendingUp, TrendingDown, Download, Eye } from "lucide-react";
import * as XLSX from "xlsx";

interface Kategori {
  id: string;
  nama: string;
  jenis_default: "DEBIT" | "KREDIT";
}

interface Transaksi {
  id: string;
  kategori_id: string;
  kategori_nama?: string;
  jenis: "DEBIT" | "KREDIT";
  jumlah: number;
  tanggal: string;
  keterangan: string;
  bukti_url: string;
  created_at: string;
}

export function DashboardYayasanKeuangan() {
  const { activeRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [kategoriList, setKategoriList] = useState<Kategori[]>([]);
  const [transaksiList, setTransaksiList] = useState<Transaksi[]>([]);
  
  // States for Modals
  const [isKategoriModalOpen, setIsKategoriModalOpen] = useState(false);
  const [isTransaksiModalOpen, setIsTransaksiModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Forms
  const [kategoriForm, setKategoriForm] = useState<Partial<Kategori>>({ nama: "", jenis_default: "DEBIT" });
  const [transaksiForm, setTransaksiForm] = useState<Partial<Transaksi>>({
    kategori_id: "",
    jenis: "DEBIT",
    jumlah: 0,
    tanggal: new Date().toISOString().split('T')[0],
    keterangan: "",
    bukti_url: "",
  });

  useEffect(() => {
    if (activeRole?.lembaga.kode === 'YAYASAN') {
      fetchData();
    }
  }, [activeRole]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const yayasanId = activeRole!.lembaga_id;

      const [katRes, transRes] = await Promise.all([
        supabase.from('kategori_transaksi').select('*').eq('lembaga_id', yayasanId).order('nama'),
        supabase.from('transaksi_keuangan').select('*, kategori_transaksi(nama)').eq('lembaga_id', yayasanId).order('tanggal', { ascending: false })
      ]);

      if (katRes.error) throw katRes.error;
      if (transRes.error) throw transRes.error;

      setKategoriList(katRes.data || []);
      
      const mappedTransaksi = (transRes.data || []).map(t => ({
        ...t,
        kategori_nama: t.kategori_transaksi?.nama
      }));
      setTransaksiList(mappedTransaksi);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveKategori = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (kategoriForm.id) {
        await supabase.from('kategori_transaksi').update(kategoriForm).eq('id', kategoriForm.id);
      } else {
        await supabase.from('kategori_transaksi').insert([{...kategoriForm, lembaga_id: activeRole!.lembaga_id}]);
      }
      setIsKategoriModalOpen(false);
      fetchData();
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTransaksi = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (transaksiForm.id) {
        await supabase.from('transaksi_keuangan').update({
          kategori_id: transaksiForm.kategori_id,
          jenis: transaksiForm.jenis,
          jumlah: transaksiForm.jumlah,
          tanggal: transaksiForm.tanggal,
          keterangan: transaksiForm.keterangan,
          bukti_url: transaksiForm.bukti_url,
        }).eq('id', transaksiForm.id);
      } else {
        await supabase.from('transaksi_keuangan').insert([{
          ...transaksiForm,
          lembaga_id: activeRole!.lembaga_id
        }]);
      }
      setIsTransaksiModalOpen(false);
      fetchData();
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (table: 'kategori_transaksi' | 'transaksi_keuangan', id: string) => {
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

  const totalPemasukan = transaksiList.filter(t => t.jenis === 'KREDIT').reduce((acc, curr) => acc + Number(curr.jumlah), 0);
  const totalPengeluaran = transaksiList.filter(t => t.jenis === 'DEBIT').reduce((acc, curr) => acc + Number(curr.jumlah), 0);
  const saldoAkhir = totalPemasukan - totalPengeluaran;

  const exportToExcel = () => {
    const wsData = transaksiList.map(t => ({
      'Tanggal': t.tanggal,
      'Kategori': t.kategori_nama,
      'Keterangan': t.keterangan,
      'Pemasukan (Kredit)': t.jenis === 'KREDIT' ? t.jumlah : 0,
      'Pengeluaran (Debit)': t.jenis === 'DEBIT' ? t.jumlah : 0,
      'Bukti URL': t.bukti_url || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan Keuangan");
    XLSX.writeFile(wb, `Laporan_Keuangan_${new Date().getTime()}.xlsx`);
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Keuangan Umum Yayasan</h2>
          <p className="text-muted-foreground">Pencatatan buku kas (pemasukan & pengeluaran) lintas lembaga.</p>
        </div>
        <Button onClick={exportToExcel} variant="outline" className="text-emerald-700 border-emerald-200 hover:bg-emerald-50">
          <Download className="w-4 h-4 mr-2" /> Export Excel
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-emerald-50 border-emerald-100">
          <CardHeader className="pb-2">
            <CardDescription className="text-emerald-800 font-medium">Total Pemasukan</CardDescription>
            <CardTitle className="text-2xl text-emerald-900 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-emerald-600" />
              {formatRupiah(totalPemasukan)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-red-50 border-red-100">
          <CardHeader className="pb-2">
            <CardDescription className="text-red-800 font-medium">Total Pengeluaran</CardDescription>
            <CardTitle className="text-2xl text-red-900 flex items-center">
              <TrendingDown className="w-5 h-5 mr-2 text-red-600" />
              {formatRupiah(totalPengeluaran)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-blue-50 border-blue-100">
          <CardHeader className="pb-2">
            <CardDescription className="text-blue-800 font-medium">Saldo Akhir</CardDescription>
            <CardTitle className="text-2xl text-blue-900">
              {formatRupiah(saldoAkhir)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="transaksi" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="transaksi">Buku Kas Transaksi</TabsTrigger>
          <TabsTrigger value="kategori">Kategori Transaksi</TabsTrigger>
        </TabsList>

        <TabsContent value="transaksi" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isTransaksiModalOpen} onOpenChange={setIsTransaksiModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setTransaksiForm({ jenis: 'DEBIT', jumlah: 0, tanggal: new Date().toISOString().split('T')[0], keterangan: '', bukti_url: '', kategori_id: '' })}>
                  <Plus className="w-4 h-4 mr-2" /> Catat Transaksi
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleSaveTransaksi}>
                  <DialogHeader>
                    <DialogTitle>{transaksiForm.id ? 'Edit Transaksi' : 'Catat Transaksi Baru'}</DialogTitle>
                    <DialogDescription>Masukkan detail arus kas yang terjadi.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Jenis Transaksi</Label>
                        <Select value={transaksiForm.jenis} onValueChange={(val: "DEBIT"|"KREDIT") => setTransaksiForm({...transaksiForm, jenis: val})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="KREDIT">Pemasukan (Uang Masuk)</SelectItem>
                            <SelectItem value="DEBIT">Pengeluaran (Uang Keluar)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Kategori</Label>
                        <Select value={transaksiForm.kategori_id} onValueChange={(val) => setTransaksiForm({...transaksiForm, kategori_id: val})} required>
                          <SelectTrigger><SelectValue placeholder="Pilih Kategori" /></SelectTrigger>
                          <SelectContent>
                            {kategoriList.filter(k => k.jenis_default === transaksiForm.jenis).map(k => (
                              <SelectItem key={k.id} value={k.id}>{k.nama}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Tanggal</Label>
                        <Input type="date" value={transaksiForm.tanggal} onChange={e => setTransaksiForm({...transaksiForm, tanggal: e.target.value})} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Jumlah (Rp)</Label>
                        <Input type="number" min="0" value={transaksiForm.jumlah} onChange={e => setTransaksiForm({...transaksiForm, jumlah: Number(e.target.value)})} required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Keterangan</Label>
                      <Input value={transaksiForm.keterangan} onChange={e => setTransaksiForm({...transaksiForm, keterangan: e.target.value})} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Bukti Transaksi (Opsional)</Label>
                      <CloudinaryUpload 
                        defaultImage={transaksiForm.bukti_url} 
                        onUploadSuccess={(url) => setTransaksiForm({...transaksiForm, bukti_url: url})} 
                        buttonText="Upload Bukti" 
                        className="scale-90 origin-top-left" 
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={saving} className="bg-emerald-600">
                      {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Save className="w-4 h-4 mr-2" />} Simpan
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="text-right">Debit (Keluar)</TableHead>
                  <TableHead className="text-right">Kredit (Masuk)</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transaksiList.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">Belum ada transaksi tercatat.</TableCell></TableRow>
                ) : transaksiList.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="whitespace-nowrap">{new Date(t.tanggal).toLocaleDateString('id-ID')}</TableCell>
                    <TableCell>
                      <span className="font-medium">{t.keterangan}</span>
                      {t.bukti_url && (
                        <a href={t.bukti_url} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center text-xs text-blue-600 hover:underline">
                          <Eye className="w-3 h-3 mr-1"/> Bukti
                        </a>
                      )}
                    </TableCell>
                    <TableCell><span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">{t.kategori_nama}</span></TableCell>
                    <TableCell className="text-right text-red-600">{t.jenis === 'DEBIT' ? formatRupiah(t.jumlah) : '-'}</TableCell>
                    <TableCell className="text-right text-emerald-600">{t.jenis === 'KREDIT' ? formatRupiah(t.jumlah) : '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => { setTransaksiForm(t); setIsTransaksiModalOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-red-600" onClick={() => handleDelete('transaksi_keuangan', t.id)}><Trash2 className="w-4 h-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="kategori" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isKategoriModalOpen} onOpenChange={setIsKategoriModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600" onClick={() => setKategoriForm({ nama: '', jenis_default: 'DEBIT' })}>
                  <Plus className="w-4 h-4 mr-2" /> Kategori Baru
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleSaveKategori}>
                  <DialogHeader>
                    <DialogTitle>{kategoriForm.id ? 'Edit Kategori' : 'Kategori Baru'}</DialogTitle>
                    <DialogDescription>Kelompokkan transaksi Anda agar mudah dilacak.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Nama Kategori</Label>
                      <Input value={kategoriForm.nama} onChange={e => setKategoriForm({...kategoriForm, nama: e.target.value})} required placeholder="Misal: Gaji Guru, ATK..." />
                    </div>
                    <div className="space-y-2">
                      <Label>Jenis Arus Kas Default</Label>
                      <Select value={kategoriForm.jenis_default} onValueChange={(val: "DEBIT"|"KREDIT") => setKategoriForm({...kategoriForm, jenis_default: val})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DEBIT">Pengeluaran (DEBIT)</SelectItem>
                          <SelectItem value="KREDIT">Pemasukan (KREDIT)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={saving} className="bg-emerald-600">Simpan</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="bg-red-50 pb-4"><CardTitle className="text-red-900 text-lg">Kategori Pengeluaran (DEBIT)</CardTitle></CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  {kategoriList.filter(k => k.jenis_default === 'DEBIT').map(k => (
                    <div key={k.id} className="flex justify-between items-center p-2 hover:bg-gray-50 border rounded">
                      <span>{k.nama}</span>
                      <div>
                        <Button variant="ghost" size="icon" onClick={() => { setKategoriForm(k); setIsKategoriModalOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-red-600" onClick={() => handleDelete('kategori_transaksi', k.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="bg-emerald-50 pb-4"><CardTitle className="text-emerald-900 text-lg">Kategori Pemasukan (KREDIT)</CardTitle></CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  {kategoriList.filter(k => k.jenis_default === 'KREDIT').map(k => (
                    <div key={k.id} className="flex justify-between items-center p-2 hover:bg-gray-50 border rounded">
                      <span>{k.nama}</span>
                      <div>
                        <Button variant="ghost" size="icon" onClick={() => { setKategoriForm(k); setIsKategoriModalOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-red-600" onClick={() => handleDelete('kategori_transaksi', k.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
