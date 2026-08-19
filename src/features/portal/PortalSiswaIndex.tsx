import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ReceiptText, UploadCloud, History, Search, Building2, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Student { id: string; nama: string; nisn: string; nik: string; lembaga: { nama: string } }
interface Bill { id: string; jenis_tagihan_final: string; nominal: number; nominal_terbayar: number; status: string; created_at: string; }
interface Payment { id: string; nominal_dibayar: number; status: string; tanggal_bayar: string; catatan: string; bukti_transfer_url: string; bills: { jenis_tagihan_final: string }; }
interface Rekening { id: string; nama_bank: string; no_rekening: string; atas_nama: string; }

export function PortalSiswaIndex() {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [student, setStudent] = useState<Student | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [rekening, setRekening] = useState<Rekening[]>([]);

  // Payment Form State
  const [selectedBillIds, setSelectedBillIds] = useState<string[]>([]);
  const [nominalBayar, setNominalBayar] = useState<number>(0);
  const [buktiUrl, setBuktiUrl] = useState<string>("");
  const [catatan, setCatatan] = useState<string>("");
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Widget dummy upload karena belum ada CloudinaryUpload public
  const handleUploadClick = () => {
    const url = prompt("Masukkan URL gambar bukti transfer (Sementara):", "https://via.placeholder.com/150");
    if (url) setBuktiUrl(url);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      // 1. Get Student Profiles by NISN or NIK (might return multiple if registered in multiple units)
      const { data: studentsData, error: studentErr } = await supabase
        .from('students')
        .select(`id, nama, nisn, nik, lembaga (nama)`)
        .or(`nisn.eq.${searchQuery},nik.eq.${searchQuery}`);
      
      if (studentErr || !studentsData || studentsData.length === 0) {
        setStudent(null);
        alert("Siswa tidak ditemukan. Periksa kembali NISN atau NIK.");
        return;
      }

      // Merge multiple records into one cohesive view
      const studentIds = studentsData.map(s => s.id);
      const combinedLembagaNames = Array.from(new Set(studentsData.map(s => (s.lembaga as any).nama))).join(", ");
      
      const mergedStudent = {
        ...studentsData[0],
        lembaga: { nama: combinedLembagaNames }
      };

      setStudent(mergedStudent as unknown as Student);

      // Fetch Data across all their student_ids
      await fetchData(studentIds);
      
      // Fetch Rekening
      const { data: rekData } = await supabase.from('rekening_yayasan').select('*').eq('is_active', true);
      setRekening(rekData || []);

    } catch (e: any) {
      console.error(e);
      alert("Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async (studentIds: string[]) => {
    // 2. Get Bills
    const { data: billsData } = await supabase
      .from('bills')
      .select('*')
      .in('student_id', studentIds)
      .order('created_at', { ascending: true });
    setBills(billsData || []);

    // 3. Get Payments History
    const { data: paymentsData } = await supabase
      .from('payments')
      .select('*, bills!inner(student_id, jenis_tagihan_final)')
      .in('bills.student_id', studentIds)
      .order('tanggal_bayar', { ascending: false });
    
    setPayments((paymentsData as any) || []);
  };

  const formatRupiah = (angka: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);

  const toggleBillSelect = (billId: string) => {
    setSelectedBillIds(prev => 
      prev.includes(billId) ? prev.filter(id => id !== billId) : [...prev, billId]
    );
  };

  const selectedBillsData = bills.filter(b => selectedBillIds.includes(b.id));
  const totalKekuranganSelected = selectedBillsData.reduce((acc, b) => acc + (b.nominal - b.nominal_terbayar), 0);

  const openPayModal = () => {
    if (selectedBillIds.length === 0) return alert("Pilih minimal satu tagihan untuk dibayar.");
    setNominalBayar(totalKekuranganSelected);
    setBuktiUrl("");
    setCatatan("");
    setIsPayModalOpen(true);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nominalBayar <= 0) return alert("Nominal bayar harus lebih dari 0");
    if (!buktiUrl) return alert("Bukti transfer wajib diunggah.");

    setSubmitting(true);
    try {
      let sisaUang = nominalBayar;
      const inserts = [];

      for (const bill of selectedBillsData) {
        if (sisaUang <= 0) break;
        const kekuranganBill = bill.nominal - bill.nominal_terbayar;
        const alokasi = Math.min(sisaUang, kekuranganBill);
        
        inserts.push({
          bill_id: bill.id,
          nominal_dibayar: alokasi,
          status: 'PENDING',
          catatan: catatan || `Pembayaran kolektif via portal publik`,
          bukti_transfer_url: buktiUrl
        });

        sisaUang -= alokasi;
      }

      if (inserts.length > 0) {
        const { error } = await supabase.from('payments').insert(inserts);
        if (error) throw error;
        
        alert("Pembayaran berhasil disubmit dan menunggu verifikasi Bendahara!");
        setIsPayModalOpen(false);
        setSelectedBillIds([]);
        if (student) fetchData([student.id]);
      }
    } catch (err: any) {
      alert("Gagal mensubmit pembayaran: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <Card className="w-full max-w-md shadow-xl border-0 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 h-2"></div>
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8" />
            </div>
            <CardTitle className="text-2xl font-bold">Cek Tagihan Siswa</CardTitle>
            <CardDescription>
              Masukkan Nomor Induk Siswa Nasional (NISN) atau NIK untuk mengecek tagihan dan riwayat pembayaran.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="search">NISN / NIK Siswa</Label>
                <Input 
                  id="search" 
                  placeholder="Contoh: 0012345678" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="text-center text-lg tracking-wider"
                  required
                />
              </div>
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-lg" disabled={loading}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Cari Data Siswa"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const unpaidBills = bills.filter(b => b.status !== 'PAID');

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Siswa */}
      <Card className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-none shadow-md overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Building2 className="w-32 h-32" />
        </div>
        <CardContent className="p-6 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <p className="text-emerald-200 text-sm font-medium mb-1 uppercase tracking-wider">{student.lembaga?.nama}</p>
              <h2 className="text-3xl font-bold mb-1">{student.nama}</h2>
              <div className="flex items-center gap-4 text-emerald-100 text-sm">
                <span>NISN: {student.nisn}</span>
                {student.nik && <span>• NIK: {student.nik}</span>}
              </div>
            </div>
            <div className="bg-white/10 p-4 rounded-xl border border-white/20 backdrop-blur-md min-w-[200px]">
              <p className="text-sm text-emerald-100 font-medium mb-1">Total Kekurangan</p>
              <p className="text-3xl font-bold tracking-tight">
                {formatRupiah(unpaidBills.reduce((acc, b) => acc + (b.nominal - b.nominal_terbayar), 0))}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="aktif" className="w-full">
        <TabsList className="mb-4 bg-white border shadow-sm p-1">
          <TabsTrigger value="aktif" className="px-6 py-2.5 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
            <ReceiptText className="w-4 h-4 mr-2"/> Tagihan Aktif
          </TabsTrigger>
          <TabsTrigger value="riwayat" className="px-6 py-2.5 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
            <History className="w-4 h-4 mr-2"/> Riwayat Pembayaran
          </TabsTrigger>
        </TabsList>

        <TabsContent value="aktif" className="space-y-4">
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="bg-gray-50/50 border-b pb-4">
              <CardTitle className="text-xl">Daftar Tagihan Belum Lunas</CardTitle>
              <CardDescription>Pilih satu atau beberapa tagihan untuk dibayar sekaligus, lalu unggah bukti transfer.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {unpaidBills.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Luar Biasa!</h3>
                  <p className="text-gray-500 font-medium max-w-sm mx-auto">Semua administrasi keuangan atas nama {student.nama} sudah lunas.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {unpaidBills.map(b => (
                    <label key={b.id} className="flex items-center space-x-4 p-5 hover:bg-emerald-50/50 transition-colors cursor-pointer group">
                      <Checkbox 
                        id={b.id} 
                        checked={selectedBillIds.includes(b.id)} 
                        onCheckedChange={() => toggleBillSelect(b.id)}
                        className="w-6 h-6 rounded-md data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                      />
                      <div className="flex-1">
                        <p className="text-lg font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">{b.jenis_tagihan_final}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Tarif Pokok: {formatRupiah(b.nominal)} 
                          {b.nominal_terbayar > 0 && <span className="text-amber-600 font-medium ml-2">• Telah dicicil: {formatRupiah(b.nominal_terbayar)}</span>}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400 mb-1 uppercase font-semibold tracking-wider">Sisa Bayar</p>
                        <p className="font-bold text-xl text-red-600">{formatRupiah(b.nominal - b.nominal_terbayar)}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </CardContent>
            {unpaidBills.length > 0 && (
              <CardFooter className="bg-white border-t p-6 flex flex-col sm:flex-row justify-between items-center rounded-b-xl gap-4">
                <div className="text-center sm:text-left w-full sm:w-auto">
                  <p className="text-sm text-gray-500 font-medium">Total Terpilih: <span className="font-bold text-gray-900">{selectedBillIds.length} item</span></p>
                  <p className="font-extrabold text-2xl text-emerald-700 mt-1">{formatRupiah(totalKekuranganSelected)}</p>
                </div>
                <Button size="lg" className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 h-12 px-8 shadow-md" disabled={selectedBillIds.length === 0} onClick={openPayModal}>
                  <UploadCloud className="w-5 h-5 mr-2" /> Konfirmasi & Upload Bukti
                </Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="riwayat">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Riwayat Pembayaran</CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Belum ada riwayat pembayaran yang tercatat.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {payments.map(p => (
                    <div key={p.id} className="flex justify-between items-center border p-4 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
                      <div>
                        <p className="font-bold text-gray-900 text-lg">{p.bills.jenis_tagihan_final}</p>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                          <span>{new Date(p.tanggal_bayar).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</span>
                          {p.catatan && (
                            <>
                              <span>•</span>
                              <span className="italic">"{p.catatan}"</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <p className="font-extrabold text-lg text-emerald-600">{formatRupiah(p.nominal_dibayar)}</p>
                        <span className={`mt-2 px-3 py-1 rounded-full text-xs font-bold ${p.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : p.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {p.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL PEMBAYARAN */}
      <Dialog open={isPayModalOpen} onOpenChange={setIsPayModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmitPayment}>
            <DialogHeader>
              <DialogTitle className="text-2xl text-emerald-800">Form Konfirmasi Transfer</DialogTitle>
              <DialogDescription>
                Mohon transfer sesuai nominal dan unggah bukti pembayarannya.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Rekening Tujuan */}
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4">
                <h4 className="text-sm font-bold text-emerald-800 mb-3 uppercase tracking-wider">Rekening Tujuan Transfer:</h4>
                {rekening.length === 0 ? (
                  <p className="text-sm text-amber-600">Belum ada info rekening yayasan. Harap hubungi Tata Usaha.</p>
                ) : (
                  <div className="grid gap-3">
                    {rekening.map(rek => (
                      <div key={rek.id} className="bg-white p-3 rounded-lg border shadow-sm flex items-center justify-between">
                        <div>
                          <p className="font-bold text-gray-900">{rek.nama_bank}</p>
                          <p className="text-sm text-gray-500 uppercase">A.N {rek.atas_nama}</p>
                        </div>
                        <p className="font-mono font-bold text-lg text-emerald-700">{rek.no_rekening}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border">
                <span className="font-medium text-gray-700">Total Tagihan Terpilih:</span>
                <span className="font-bold text-xl text-gray-900">{formatRupiah(totalKekuranganSelected)}</span>
              </div>
              
              <div className="space-y-3">
                <Label className="text-base">Nominal yang Anda Transfer (Rp)</Label>
                <Input 
                  type="number" 
                  min="1" 
                  value={nominalBayar} 
                  onChange={e => setNominalBayar(Number(e.target.value))} 
                  required 
                  className="text-lg font-bold h-12"
                />
                <p className="text-xs text-gray-500 leading-relaxed">
                  Jika Anda men-transfer kurang dari total di atas, sistem akan mengalokasikan pembayaran secara berurutan untuk mencicil tagihan.
                </p>
              </div>

              <div className="space-y-3">
                <Label className="text-base">Bukti Transfer</Label>
                {buktiUrl ? (
                  <div className="relative rounded-lg overflow-hidden border">
                    <img src={buktiUrl} alt="Bukti Transfer" className="w-full h-48 object-cover" />
                    <Button type="button" variant="destructive" size="sm" className="absolute top-2 right-2" onClick={() => setBuktiUrl("")}>Hapus</Button>
                  </div>
                ) : (
                  <div 
                    onClick={handleUploadClick}
                    className="border-2 border-dashed border-emerald-200 bg-emerald-50/30 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-emerald-50 transition-colors"
                  >
                    <UploadCloud className="w-10 h-10 text-emerald-400 mb-3" />
                    <p className="font-medium text-emerald-700">Klik untuk mengunggah gambar</p>
                    <p className="text-xs text-gray-500 mt-1">JPG, PNG (Maks. 2MB)</p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label className="text-base">Catatan Pengirim (Opsional)</Label>
                <Input 
                  placeholder="Misal: Pembayaran dari Bank BCA an Budi..."
                  value={catatan} 
                  onChange={e => setCatatan(e.target.value)} 
                />
              </div>
            </div>

            <DialogFooter className="border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setIsPayModalOpen(false)}>Batal</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 shadow-md" disabled={submitting}>
                {submitting ? "Memproses..." : "Kirim Bukti Pembayaran"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
