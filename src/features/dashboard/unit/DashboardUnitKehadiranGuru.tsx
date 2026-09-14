import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { 
  Download,
  Loader2,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

export function DashboardUnitKehadiranGuru() {
  const { activeRole } = useAuth();
  
  // Date State
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Data State
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeRole?.lembaga_id) {
      fetchReport();
    }
  }, [activeRole, selectedMonth, selectedYear]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      
      // 1. Get all active teachers
      const { data: teachersData, error: teacherError } = await supabase
        .from('teachers')
        .select('id, nama, nip')
        .eq('lembaga_id', activeRole!.lembaga_id)
        .in('status', ['AKTIF'])
        .order('nama', { ascending: true });
        
      if (teacherError) throw teacherError;
      if (!teachersData || teachersData.length === 0) {
        setReportData([]);
        setLoading(false);
        return;
      }
      
      // 2. Get all verified attendance for the selected month
      const startDate = new Date(selectedYear, selectedMonth - 1, 1).toISOString();
      const endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59).toISOString();
      
      const { data: absensiData, error: absensiError } = await supabase
        .from('absensi_kedatangan_guru')
        .select('guru_id, status')
        .eq('lembaga_id', activeRole!.lembaga_id)
        .eq('status_verifikasi', 'VERIFIED')
        .gte('tanggal', startDate)
        .lte('tanggal', endDate);

      if (absensiError) throw absensiError;

      // 3. Aggregate data
      const statsMap = new Map();
      teachersData.forEach(t => {
        statsMap.set(t.id, { ...t, hadir: 0, izin: 0, sakit: 0, alfa: 0, total: 0 });
      });

      (absensiData || []).forEach(abs => {
        const t = statsMap.get(abs.guru_id);
        if (t) {
          t.total += 1;
          if (abs.status === 'HADIR') t.hadir += 1;
          else if (abs.status === 'IZIN') t.izin += 1;
          else if (abs.status === 'SAKIT') t.sakit += 1;
          else if (abs.status === 'ALFA') t.alfa += 1;
        }
      });

      const finalReport = Array.from(statsMap.values()).map(t => {
        const persentase = t.total > 0 ? ((t.hadir / t.total) * 100).toFixed(1) : "0.0";
        return { ...t, persentase };
      });

      setReportData(finalReport);
    } catch (err) {
      console.error("Error fetching report data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (reportData.length === 0) return;
    
    const title = `Bulanan_${MONTHS[selectedMonth - 1]}_${selectedYear}`;
    const fileName = `Rekap_Kehadiran_Guru_${title}.xlsx`;

    const formattedData = reportData.map((t, index) => ({
      "No": index + 1,
      "NIP / ID": t.nip || "-",
      "Nama Guru / Ustadz": t.nama,
      "Total Sesi (Hari)": t.total,
      "Hadir (H)": t.hadir,
      "Izin (I)": t.izin,
      "Sakit (S)": t.sakit,
      "Alfa (A)": t.alfa,
      "Persentase (%)": parseFloat(t.persentase)
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Rekap Guru`);
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Rekap Kehadiran Guru</h1>
        <p className="text-gray-500 text-sm mt-1">
          Pantau rekapitulasi kehadiran (kedatangan) guru per bulan. Data yang dihitung adalah absensi yang sudah <strong className="text-gray-700">Diverifikasi</strong>.
        </p>
      </div>

      <Card className="border-0 shadow-sm rounded-3xl overflow-hidden">
        <CardHeader className="bg-white border-b pb-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-end justify-between">
            <div className="flex flex-wrap gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Bulan</label>
                <select 
                  className="h-10 px-3 rounded-xl border border-gray-200 text-sm bg-gray-50 font-medium"
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(parseInt(e.target.value))}
                >
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tahun</label>
                <select 
                  className="h-10 px-3 rounded-xl border border-gray-200 text-sm bg-gray-50 font-medium"
                  value={selectedYear}
                  onChange={e => setSelectedYear(parseInt(e.target.value))}
                >
                  {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <Button 
              onClick={handleExportExcel}
              disabled={reportData.length === 0 || loading}
              variant="outline" 
              className="rounded-xl border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 shadow-sm shrink-0 h-10"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Rekap Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 bg-gray-50/50">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
          ) : reportData.length === 0 ? (
            <div className="text-center py-24 bg-white">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Belum ada data kehadiran guru untuk bulan ini.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-white">
                  <TableRow>
                    <TableHead className="pl-6 w-12 text-center">No</TableHead>
                    <TableHead>Nama Guru / Ustadz</TableHead>
                    <TableHead>NIP / ID</TableHead>
                    <TableHead className="text-center">Total Hari (Terverifikasi)</TableHead>
                    <TableHead className="text-center bg-emerald-50 text-emerald-700">Hadir</TableHead>
                    <TableHead className="text-center bg-blue-50 text-blue-700">Izin</TableHead>
                    <TableHead className="text-center bg-orange-50 text-orange-700">Sakit</TableHead>
                    <TableHead className="text-center bg-red-50 text-red-700">Alfa</TableHead>
                    <TableHead className="text-right pr-6">% Kehadiran</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((t, index) => (
                    <TableRow key={t.id} className="bg-white hover:bg-gray-50">
                      <TableCell className="pl-6 text-center text-gray-500">{index + 1}</TableCell>
                      <TableCell className="font-bold text-emerald-900">{t.nama}</TableCell>
                      <TableCell className="text-gray-500 font-mono text-xs">{t.nip || '-'}</TableCell>
                      <TableCell className="text-center font-bold text-gray-700">{t.total}</TableCell>
                      <TableCell className="text-center text-emerald-600 font-bold">{t.hadir}</TableCell>
                      <TableCell className="text-center text-blue-600 font-bold">{t.izin}</TableCell>
                      <TableCell className="text-center text-orange-600 font-bold">{t.sakit}</TableCell>
                      <TableCell className="text-center text-red-600 font-bold">{t.alfa}</TableCell>
                      <TableCell className="text-right pr-6">
                        <span className={`inline-flex px-2 py-1 rounded-md text-xs font-bold ${
                          parseFloat(t.persentase) >= 80 ? 'bg-emerald-100 text-emerald-800' : 
                          parseFloat(t.persentase) >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {t.persentase}%
                        </span>
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
