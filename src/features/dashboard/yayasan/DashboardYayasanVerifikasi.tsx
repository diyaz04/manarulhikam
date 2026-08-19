import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CheckCircle2, XCircle, Eye, AlertCircle } from "lucide-react";

interface Payment {
  id: string;
  nominal_dibayar: number;
  status: string;
  tanggal_bayar: string;
  catatan: string;
  bukti_transfer_url: string;
  bill_id: string;
  bills: {
    jenis_tagihan_final: string;
    nominal: number;
    nominal_terbayar: number;
    students: { nama: string; nisn: string; lembaga: { nama: string, id: string } };
  };
}

export function DashboardYayasanVerifikasi() {
  const { activeRole, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [kategoriList, setKategoriList] = useState<{id: string, nama: string}[]>([]);

  useEffect(() => {
    if (activeRole?.lembaga.kode === 'YAYASAN') {
      fetchData();
      fetchKategori();
    }
  }, [activeRole]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          bills!inner (
            jenis_tagihan_final,
            nominal,
            nominal_terbayar,
            students!inner (
              nama,
              nisn,
              lembaga!inner(nama, id)
            )
          )
        `)
        .order('tanggal_bayar', { ascending: false });

      if (error) throw error;
      setPayments(data as unknown as Payment[]);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchKategori = async () => {
    try {
      const { data } = await supabase.from('kategori_transaksi').select('id, nama').eq('lembaga_id', activeRole!.lembaga_id).eq('jenis_default', 'KREDIT');
      setKategoriList(data || []);
    } catch (e) {}
  };

  const formatRupiah = (angka: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);

  const handleVerify = async (payment: Payment, isApproved: boolean) => {
    if (!confirm(`Yakin ingin ${isApproved ? 'MENYETUJUI' : 'MENOLAK'} pembayaran ini?`)) return;

    try {
      if (!isApproved) {
        // Just reject
        await supabase.from('payments').update({ status: 'REJECTED', verified_by: user!.id, verified_at: new Date().toISOString() }).eq('id', payment.id);
        alert("Pembayaran ditolak.");
        fetchData();
        return;
      }

      // APPROVE LOGIC:
      // 1. Check current bill status
      const { data: billData, error: billErr } = await supabase.from('bills').select('nominal, nominal_terbayar').eq('id', payment.bill_id).single();
      if (billErr) throw billErr;

      const newTerbayar = billData.nominal_terbayar + payment.nominal_dibayar;
      const newStatus = newTerbayar >= billData.nominal ? 'PAID' : 'PARTIAL';

      // 2. Update Bill
      await supabase.from('bills').update({ nominal_terbayar: newTerbayar, status: newStatus }).eq('id', payment.bill_id);

      // 3. Update Payment Status
      await supabase.from('payments').update({ status: 'APPROVED', verified_by: user!.id, verified_at: new Date().toISOString() }).eq('id', payment.id);

      // 4. Auto-Jurnal (Insert to transaksi_keuangan)
      // Cari kategori 'Pemasukan Tagihan' atau ambil yang pertama
      let targetKategori = kategoriList.find(k => k.nama.toLowerCase().includes('tagihan') || k.nama.toLowerCase().includes('spp'));
      if (!targetKategori && kategoriList.length > 0) targetKategori = kategoriList[0];

      if (targetKategori) {
        await supabase.from('transaksi_keuangan').insert([{
          lembaga_id: activeRole!.lembaga_id, // Masuk ke kas Yayasan
          kategori_id: targetKategori.id,
          jenis: 'KREDIT',
          jumlah: payment.nominal_dibayar,
          tanggal: new Date().toISOString().split('T')[0],
          keterangan: `Pembayaran ${payment.bills.jenis_tagihan_final} an. ${payment.bills.students.nama} (${payment.bills.students.lembaga.nama})`,
          bukti_url: payment.bukti_transfer_url,
          created_by: user!.id
        }]);
      } else {
        alert("Pembayaran disetujui, tapi GAGAL mencatat jurnal otomatis karena Anda belum membuat Kategori Pemasukan di menu Keuangan Umum.");
      }

      fetchData();
    } catch (err: any) {
      alert("Error proses verifikasi: " + err.message);
    }
  };

  const pendingPayments = payments.filter(p => p.status === 'PENDING');
  const historyPayments = payments.filter(p => p.status !== 'PENDING');

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Verifikasi Pembayaran</h2>
        <p className="text-muted-foreground">Tinjau bukti transfer dari siswa. Persetujuan akan otomatis menjurnal pemasukan ke Buku Kas Yayasan.</p>
      </div>

      {kategoriList.length === 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded text-amber-800 flex items-start">
          <AlertCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-bold">Peringatan: Belum Ada Kategori Pemasukan</h4>
            <p className="text-sm mt-1">Anda belum membuat Kategori Transaksi berjenis KREDIT di menu "Keuangan Umum". Harap buat kategori (misal: "Pemasukan SPP") terlebih dahulu agar sistem bisa otomatis menjurnal pembayaran yang Anda setujui ke buku kas.</p>
          </div>
        </div>
      )}

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="pending" className="relative">
            Menunggu Verifikasi
            {pendingPayments.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {pendingPayments.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">Riwayat Verifikasi</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal Submit</TableHead>
                  <TableHead>Siswa & Lembaga</TableHead>
                  <TableHead>Untuk Tagihan</TableHead>
                  <TableHead className="text-right">Nominal Transfer</TableHead>
                  <TableHead className="text-center">Bukti</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingPayments.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-12 text-gray-500 font-medium">Hore! Tidak ada pembayaran yang perlu diverifikasi.</TableCell></TableRow>
                ) : pendingPayments.map((p) => (
                  <TableRow key={p.id} className="bg-amber-50/30">
                    <TableCell className="whitespace-nowrap text-sm">{new Date(p.tanggal_bayar).toLocaleString('id-ID')}</TableCell>
                    <TableCell>
                      <div className="font-bold">{p.bills.students.nama}</div>
                      <div className="text-xs text-gray-600">{p.bills.students.nisn} - {p.bills.students.lembaga.nama}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{p.bills.jenis_tagihan_final}</div>
                      <div className="text-xs text-gray-500">Catatan Siswa: {p.catatan || '-'}</div>
                    </TableCell>
                    <TableCell className="text-right font-bold text-emerald-700">{formatRupiah(p.nominal_dibayar)}</TableCell>
                    <TableCell className="text-center">
                      <a href={p.bukti_transfer_url} target="_blank" rel="noreferrer" className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 text-xs font-medium">
                        <Eye className="w-3 h-3 mr-1" /> Lihat Bukti
                      </a>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleVerify(p, true)}><CheckCircle2 className="w-4 h-4 mr-1"/> Terima</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleVerify(p, false)}><XCircle className="w-4 h-4 mr-1"/> Tolak</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal Bayar</TableHead>
                  <TableHead>Siswa</TableHead>
                  <TableHead>Tagihan</TableHead>
                  <TableHead className="text-right">Nominal</TableHead>
                  <TableHead className="text-center">Bukti</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyPayments.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">Belum ada riwayat verifikasi.</TableCell></TableRow>
                ) : historyPayments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="whitespace-nowrap text-sm text-gray-500">{new Date(p.tanggal_bayar).toLocaleDateString('id-ID')}</TableCell>
                    <TableCell>
                      <div className="font-medium">{p.bills.students.nama}</div>
                      <div className="text-xs text-gray-500">{p.bills.students.lembaga.nama}</div>
                    </TableCell>
                    <TableCell className="text-sm">{p.bills.jenis_tagihan_final}</TableCell>
                    <TableCell className="text-right font-medium">{formatRupiah(p.nominal_dibayar)}</TableCell>
                    <TableCell className="text-center">
                      <a href={p.bukti_transfer_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-xs">
                        Lihat
                      </a>
                    </TableCell>
                    <TableCell className="text-right">
                      {p.status === 'APPROVED' ? (
                        <span className="text-emerald-700 bg-emerald-100 px-2 py-1 rounded text-xs font-bold flex items-center justify-end w-fit ml-auto">
                          <CheckCircle2 className="w-3 h-3 mr-1"/> DITERIMA
                        </span>
                      ) : (
                        <span className="text-red-700 bg-red-100 px-2 py-1 rounded text-xs font-bold flex items-center justify-end w-fit ml-auto">
                          <XCircle className="w-3 h-3 mr-1"/> DITOLAK
                        </span>
                      )}
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
