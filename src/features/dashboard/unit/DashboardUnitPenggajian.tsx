import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { 
  BadgeDollarSign, 
  Settings, 
  Save, 
  Download,
  Loader2,
  Calendar,
  CheckCircle2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import * as XLSX from "xlsx";

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export function DashboardUnitPenggajian() {
  const { activeRole } = useAuth();
  
  // Payroll Config state
  const [ratePerJam, setRatePerJam] = useState<number>(0);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configSuccess, setConfigSuccess] = useState(false);

  // Payroll Report state
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [loadingPayrolls, setLoadingPayrolls] = useState(true);
  
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  useEffect(() => {
    if (activeRole?.lembaga_id) {
      fetchConfig();
    }
  }, [activeRole]);

  useEffect(() => {
    if (activeRole?.lembaga_id) {
      fetchPayrolls();
    }
  }, [activeRole, selectedMonth, selectedYear]);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('payroll_config')
        .select('rate_per_jam')
        .eq('lembaga_id', activeRole!.lembaga_id)
        .single();
        
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is not found (0 rows)
      if (data) {
        setRatePerJam(data.rate_per_jam || 0);
      }
    } catch (err) {
      console.error("Error fetching config:", err);
    }
  };

  const saveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    setConfigSuccess(false);
    try {
      const { error } = await supabase
        .from('payroll_config')
        .upsert({
          lembaga_id: activeRole!.lembaga_id,
          rate_per_jam: ratePerJam,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
      setConfigSuccess(true);
      setTimeout(() => setConfigSuccess(false), 3000);
    } catch (err: any) {
      alert("Gagal menyimpan konfigurasi: " + err.message);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const fetchPayrolls = async () => {
    try {
      setLoadingPayrolls(true);
      const { data, error } = await supabase
        .from('payroll_guru')
        .select(`
          id,
          total_jam_terverifikasi,
          total_honor,
          status,
          guru:teachers!guru_id (nama)
        `)
        .eq('lembaga_id', activeRole!.lembaga_id)
        .eq('bulan', selectedMonth)
        .eq('tahun', selectedYear)
        .order('total_honor', { ascending: false });

      if (error) throw error;
      setPayrolls(data || []);
    } catch (err) {
      console.error("Error fetching payrolls:", err);
    } finally {
      setLoadingPayrolls(false);
    }
  };

  const handleExportExcel = () => {
    if (payrolls.length === 0) return;
    
    const formattedData = payrolls.map((p, index) => ({
      "No": index + 1,
      "Nama Guru / Ustadz": p.guru.nama,
      "Total Jam (Terverifikasi)": p.total_jam_terverifikasi,
      "Total Honor": p.total_honor,
      "Status Pembayaran": p.status,
      "Bulan": MONTHS[selectedMonth - 1],
      "Tahun": selectedYear
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Payroll Guru");
    XLSX.writeFile(workbook, `Rekap_Honor_${MONTHS[selectedMonth - 1]}_${selectedYear}.xlsx`);
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);
  };

  const totalHonorBulanIni = payrolls.reduce((acc, curr) => acc + (curr.total_honor || 0), 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Hitung Gaji Guru</h1>
        <p className="text-gray-500 text-sm mt-1">
          Konfigurasi besaran honor dan laporan rekapitulasi gaji bulanan otomatis.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Kolom Kiri: Konfigurasi */}
        <div className="md:col-span-1 space-y-6">
          <Card className="border-0 shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="bg-white border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                  <Settings className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Tarif Honor</CardTitle>
                  <CardDescription>Berlaku global untuk unit ini</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={saveConfig} className="space-y-4">
                <div className="space-y-2">
                  <Label>Besaran Honor per Jam Pelajaran (Rp)</Label>
                  <Input 
                    type="number" 
                    min="0"
                    step="1000"
                    placeholder="Contoh: 25000"
                    value={ratePerJam}
                    onChange={(e) => setRatePerJam(parseFloat(e.target.value) || 0)}
                    required
                  />
                  <p className="text-xs text-gray-500">
                    Nilai ini akan dikalikan otomatis setiap ada agenda mengajar yang disetujui.
                  </p>
                </div>
                <Button 
                  type="submit" 
                  disabled={isSavingConfig} 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all"
                >
                  {isSavingConfig ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Simpan Pengaturan
                </Button>
                {configSuccess && (
                  <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium justify-center mt-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Tersimpan!
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white rounded-3xl border-0 shadow-sm overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <BadgeDollarSign className="w-24 h-24" />
            </div>
            <CardContent className="p-6 relative z-10">
              <p className="text-emerald-100 font-medium mb-1">Total Proyeksi Honor</p>
              <h2 className="text-3xl font-bold mb-4">{formatRupiah(totalHonorBulanIni)}</h2>
              <p className="text-emerald-100 text-sm">
                Bulan {MONTHS[selectedMonth - 1]} {selectedYear}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Kolom Kanan: Tabel Laporan */}
        <div className="md:col-span-2">
          <Card className="border-0 shadow-sm rounded-3xl overflow-hidden h-full flex flex-col">
            <CardHeader className="bg-white border-b pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                  <BadgeDollarSign className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Rekapitulasi Honor</CardTitle>
                  <CardDescription>Otomatis berdasarkan agenda terverifikasi</CardDescription>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select 
                  className="h-9 px-3 rounded-lg border border-gray-200 text-sm bg-white"
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(parseInt(e.target.value))}
                >
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
                <select 
                  className="h-9 px-3 rounded-lg border border-gray-200 text-sm bg-white"
                  value={selectedYear}
                  onChange={e => setSelectedYear(parseInt(e.target.value))}
                >
                  {[currentYear - 1, currentYear, currentYear + 1].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 bg-gray-50/50">
              {loadingPayrolls ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                </div>
              ) : payrolls.length === 0 ? (
                <div className="text-center py-24 bg-white h-full flex flex-col justify-center">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">Belum ada data rekapan honor di periode ini.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-white">
                      <TableRow>
                        <TableHead className="pl-6">Nama Guru / Ustadz</TableHead>
                        <TableHead className="text-center">Jam Hadir</TableHead>
                        <TableHead className="text-right">Total Honor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payrolls.map((payroll) => (
                        <TableRow key={payroll.id} className="bg-white hover:bg-gray-50">
                          <TableCell className="pl-6 font-medium">
                            {payroll.guru.nama}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="inline-flex items-center justify-center bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg text-xs font-bold">
                              {payroll.total_jam_terverifikasi} JP
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-bold text-gray-900 pr-6">
                            {formatRupiah(payroll.total_honor)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
            {payrolls.length > 0 && (
              <div className="p-4 bg-white border-t border-gray-100 flex justify-end">
                <Button 
                  onClick={handleExportExcel}
                  variant="outline" 
                  className="rounded-xl border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 shadow-sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Rekap Excel
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
