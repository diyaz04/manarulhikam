import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { 
  UserCheck, 
  Download,
  Loader2,
  Calendar,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

export function DashboardUnitKehadiranSiswa() {
  const { activeRole } = useAuth();
  
  // Base State
  const [activeYear, setActiveYear] = useState<any>(null);
  const [classes, setClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter State
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [recapType, setRecapType] = useState<'HARIAN' | 'BULANAN' | 'SEMESTER'>('BULANAN');
  
  // Date State
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Data State
  const [reportData, setReportData] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (activeRole?.lembaga_id) {
      fetchBaseData();
    }
  }, [activeRole]);

  useEffect(() => {
    if (activeRole?.lembaga_id && activeYear && selectedClass) {
      fetchReport();
    } else {
      setReportData([]);
    }
  }, [selectedClass, recapType, selectedDate, selectedMonth, selectedYear]);

  const fetchBaseData = async () => {
    try {
      setLoading(true);
      
      // 1. Get active academic year
      const { data: yearData } = await supabase
        .from('academic_years')
        .select('*')
        .eq('lembaga_id', activeRole!.lembaga_id)
        .eq('is_active', true)
        .single();
        
      setActiveYear(yearData || null);

      // 2. Get distinct classes
      const { data: classData } = await supabase
        .from('students')
        .select('kelas')
        .eq('lembaga_id', activeRole!.lembaga_id)
        .order('kelas', { ascending: true });
        
      if (classData) {
        const uniqueClasses = Array.from(new Set(classData.map(c => c.kelas))).filter(Boolean);
        setClasses(uniqueClasses as string[]);
        if (uniqueClasses.length > 0) {
          setSelectedClass(uniqueClasses[0] as string);
        }
      }
    } catch (err) {
      console.error("Error fetching base data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReport = async () => {
    if (!activeYear || !selectedClass) return;
    
    try {
      setLoadingData(true);
      
      // 1. Get students for this class
      const { data: studentsData, error: studentError } = await supabase
        .from('students')
        .select('id, nama, nisn')
        .eq('lembaga_id', activeRole!.lembaga_id)
        .eq('kelas', selectedClass)
        .in('status', ['AKTIF'])
        .order('nama', { ascending: true });
        
      if (studentError) throw studentError;
      if (!studentsData || studentsData.length === 0) {
        setReportData([]);
        setLoadingData(false);
        return;
      }
      
      const studentIds = studentsData.map(s => s.id);
      
      // 2. Build attendance query
      let query = supabase
        .from('absensi_siswa')
        .select(`
          student_id,
          status,
          agenda:agenda_mengajar!inner (
            tanggal,
            jadwal:schedules!inner (
              academic_year_id
            )
          )
        `)
        .eq('agenda.lembaga_id', activeRole!.lembaga_id)
        .eq('agenda.jadwal.academic_year_id', activeYear.id)
        .in('student_id', studentIds);

      // 3. Apply Time Filter
      if (recapType === 'HARIAN') {
        query = query.eq('agenda.tanggal', selectedDate);
      } else if (recapType === 'BULANAN') {
        const startDate = new Date(selectedYear, selectedMonth - 1, 1).toISOString();
        const endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59).toISOString();
        query = query.gte('agenda.tanggal', startDate).lte('agenda.tanggal', endDate);
      }

      const { data: absensiData, error: absensiError } = await query;
      if (absensiError) throw absensiError;

      // 4. Calculate Stats
      const statsMap = new Map();
      studentsData.forEach(s => {
        statsMap.set(s.id, {
          ...s,
          hadir: 0,
          izin: 0,
          sakit: 0,
          alfa: 0,
          total: 0
        });
      });

      (absensiData || []).forEach(abs => {
        const std = statsMap.get(abs.student_id);
        if (std) {
          std.total += 1;
          if (abs.status === 'HADIR') std.hadir += 1;
          else if (abs.status === 'IZIN') std.izin += 1;
          else if (abs.status === 'SAKIT') std.sakit += 1;
          else if (abs.status === 'ALFA') std.alfa += 1;
        }
      });

      const finalReport = Array.from(statsMap.values()).map(s => {
        const persentase = s.total > 0 ? ((s.hadir / s.total) * 100).toFixed(1) : "0.0";
        return { ...s, persentase };
      });

      setReportData(finalReport);
      
    } catch (err) {
      console.error("Error fetching report data:", err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleExportExcel = () => {
    if (reportData.length === 0) return;
    
    let title = "";
    if (recapType === 'HARIAN') title = `Harian_${selectedDate}`;
    else if (recapType === 'BULANAN') title = `Bulanan_${MONTHS[selectedMonth - 1]}_${selectedYear}`;
    else title = `Semester_${activeYear?.nama.replace(/\s+/g, '_')}`;
    
    const fileName = `Rekap_Absensi_Kelas_${selectedClass}_${title}.xlsx`;

    const formattedData = reportData.map((s, index) => ({
      "No": index + 1,
      "NISN": s.nisn,
      "Nama Siswa / Santri": s.nama,
      "Hadir (H)": s.hadir,
      "Izin (I)": s.izin,
      "Sakit (S)": s.sakit,
      "Alfa (A)": s.alfa,
      "Total Sesi": s.total,
      "Persentase (%)": parseFloat(s.persentase)
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Kelas ${selectedClass}`);
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Rekap Kehadiran Siswa</h1>
        <p className="text-gray-500 text-sm mt-1">
          Pantau statistik kehadiran siswa di Tahun Ajaran aktif berdasarkan kelas dan periode.
        </p>
      </div>

      {!activeYear && !loading && (
        <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 shrink-0" />
            <p className="text-sm text-orange-800">
              <strong>Belum ada Tahun Ajaran yang aktif.</strong> Rekap absensi hanya dapat dilihat jika ada Tahun Ajaran yang aktif.
            </p>
          </div>
        </div>
      )}

      {activeYear && (
        <Card className="border-0 shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="bg-white border-b pb-6">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-end justify-between">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Kelas</label>
                    <select 
                      className="h-10 px-3 rounded-xl border border-gray-200 text-sm bg-gray-50 font-medium min-w-[120px]"
                      value={selectedClass}
                      onChange={e => setSelectedClass(e.target.value)}
                    >
                      {classes.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipe Rekap</label>
                    <select 
                      className="h-10 px-3 rounded-xl border border-gray-200 text-sm bg-gray-50 font-medium"
                      value={recapType}
                      onChange={e => setRecapType(e.target.value as any)}
                    >
                      <option value="HARIAN">Harian</option>
                      <option value="BULANAN">Bulanan</option>
                      <option value="SEMESTER">Satu Semester (Tahun Ajaran)</option>
                    </select>
                  </div>

                  {recapType === 'HARIAN' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tanggal</label>
                      <input 
                        type="date"
                        className="h-10 px-3 rounded-xl border border-gray-200 text-sm bg-gray-50 font-medium"
                        value={selectedDate}
                        onChange={e => setSelectedDate(e.target.value)}
                      />
                    </div>
                  )}

                  {recapType === 'BULANAN' && (
                    <>
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
                    </>
                  )}
                </div>
              </div>
              
              <Button 
                onClick={handleExportExcel}
                disabled={reportData.length === 0 || loadingData}
                variant="outline" 
                className="rounded-xl border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 shadow-sm shrink-0 h-10"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Excel
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 bg-gray-50/50">
            {loading || loadingData ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              </div>
            ) : reportData.length === 0 ? (
              <div className="text-center py-24 bg-white">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Belum ada data kehadiran untuk filter tersebut.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-white">
                    <TableRow>
                      <TableHead className="pl-6 w-12 text-center">No</TableHead>
                      <TableHead>Nama Siswa</TableHead>
                      <TableHead>NISN</TableHead>
                      <TableHead className="text-center">Total Sesi</TableHead>
                      <TableHead className="text-center bg-emerald-50 text-emerald-700">Hadir</TableHead>
                      <TableHead className="text-center bg-blue-50 text-blue-700">Izin</TableHead>
                      <TableHead className="text-center bg-orange-50 text-orange-700">Sakit</TableHead>
                      <TableHead className="text-center bg-red-50 text-red-700">Alfa</TableHead>
                      <TableHead className="text-right pr-6">% Kehadiran</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.map((s, index) => (
                      <TableRow key={s.id} className="bg-white hover:bg-gray-50">
                        <TableCell className="pl-6 text-center text-gray-500">{index + 1}</TableCell>
                        <TableCell className="font-medium text-gray-900">{s.nama}</TableCell>
                        <TableCell className="text-gray-500">{s.nisn || '-'}</TableCell>
                        <TableCell className="text-center font-medium">{s.total}</TableCell>
                        <TableCell className="text-center text-emerald-600 font-bold">{s.hadir}</TableCell>
                        <TableCell className="text-center text-blue-600 font-bold">{s.izin}</TableCell>
                        <TableCell className="text-center text-orange-600 font-bold">{s.sakit}</TableCell>
                        <TableCell className="text-center text-red-600 font-bold">{s.alfa}</TableCell>
                        <TableCell className="text-right pr-6">
                          <span className={`inline-flex px-2 py-1 rounded-md text-xs font-bold ${
                            parseFloat(s.persentase) >= 80 ? 'bg-emerald-100 text-emerald-800' : 
                            parseFloat(s.persentase) >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {s.persentase}%
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
      )}
    </div>
  );
}
