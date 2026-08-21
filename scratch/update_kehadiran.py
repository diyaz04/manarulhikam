
import re

file_path = "c:\\website mkks\\MANARUL HIKAM\\src\\features\\dashboard\\unit\\DashboardUnitKehadiranSiswa.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace fetchReport
new_fetch_report = """  const fetchReport = async () => {
    if (!activeYear || !selectedClass) return;
    
    try {
      setLoadingData(true);
      
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
      
      if (recapType === 'HARIAN') {
        const { data: absensiSiswa } = await supabase
          .from('absensi_siswa')
          .select(`
            student_id,
            status,
            agenda:agenda_mengajar!inner (
              tanggal,
              jadwal:schedules!inner (
                mapel, jam_mulai, jam_selesai
              )
            )
          `)
          .eq('agenda.lembaga_id', activeRole!.lembaga_id)
          .eq('agenda.tanggal', selectedDate)
          .in('student_id', studentIds);
          
        const { data: absensiHarian } = await supabase
          .from('absensi_harian_siswa')
          .select('student_id, status')
          .eq('tanggal', selectedDate)
          .in('student_id', studentIds);

        const harianMap = new Map();
        absensiHarian?.forEach(ah => harianMap.set(ah.student_id, ah.status));

        const finalReport = studentsData.map(s => {
          const studentAbsensi = (absensiSiswa || []).filter(a => a.student_id === s.id);
          
          let counts = { HADIR: 0, IZIN: 0, SAKIT: 0, ALFA: 0 };
          studentAbsensi.forEach(a => counts[a.status as keyof typeof counts]++);
          
          let rekomendasi = 'HADIR';
          let maxCount = -1;
          for (const [status, count] of Object.entries(counts)) {
            if (count > maxCount) {
              maxCount = count;
              rekomendasi = status;
            }
          }
          if (maxCount === 0) rekomendasi = '-';

          // Urutkan berdasarkan jam mulai
          const detailJam = studentAbsensi.map(a => ({
            mapel: a.agenda.jadwal.mapel,
            waktu: `${a.agenda.jadwal.jam_mulai}-${a.agenda.jadwal.jam_selesai}`,
            status: a.status,
            jam_mulai: a.agenda.jadwal.jam_mulai
          })).sort((a, b) => a.jam_mulai.localeCompare(b.jam_mulai));

          return {
            ...s,
            detailJam,
            rekomendasi,
            keputusanHarian: harianMap.get(s.id) || ''
          };
        });
        setReportData(finalReport);
      } else {
        let query = supabase
          .from('absensi_harian_siswa')
          .select('student_id, status')
          .in('student_id', studentIds);

        if (recapType === 'BULANAN') {
          const startDate = new Date(selectedYear, selectedMonth - 1, 1).toISOString();
          const endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59).toISOString();
          query = query.gte('tanggal', startDate).lte('tanggal', endDate);
        }

        const { data: absensiHarian, error: absensiError } = await query;
        if (absensiError) throw absensiError;

        const statsMap = new Map();
        studentsData.forEach(s => {
          statsMap.set(s.id, { ...s, hadir: 0, izin: 0, sakit: 0, alfa: 0, total: 0 });
        });

        (absensiHarian || []).forEach(abs => {
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
      }
    } catch (err) {
      console.error("Error fetching report data:", err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSaveKeputusan = async (studentId: string, status: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('absensi_harian_siswa')
        .upsert({
          student_id: studentId,
          tanggal: selectedDate,
          status: status,
          decided_by: user?.id
        }, { onConflict: 'student_id, tanggal' });

      if (error) throw error;

      setReportData(prev => prev.map(s => s.id === studentId ? { ...s, keputusanHarian: status } : s));
    } catch (err: any) {
      alert("Gagal menyimpan keputusan harian: " + err.message);
    }
  };"""

content = re.sub(r"  const fetchReport = async \(\) => \{.*?\n  };\n", new_fetch_report + "\n", content, flags=re.DOTALL)

# Add ui elements
table_ui = """              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-white">
                    {recapType === 'HARIAN' ? (
                      <TableRow>
                        <TableHead className="pl-6 w-12 text-center">No</TableHead>
                        <TableHead>Nama Siswa</TableHead>
                        <TableHead>NISN</TableHead>
                        <TableHead className="min-w-[200px]">Jejak Jam Pelajaran (Guru)</TableHead>
                        <TableHead className="text-center bg-gray-50">Rekomendasi</TableHead>
                        <TableHead className="text-center bg-emerald-50 text-emerald-800">Keputusan Harian</TableHead>
                      </TableRow>
                    ) : (
                      <TableRow>
                        <TableHead className="pl-6 w-12 text-center">No</TableHead>
                        <TableHead>Nama Siswa</TableHead>
                        <TableHead>NISN</TableHead>
                        <TableHead className="text-center">Total Hari Bersekolah</TableHead>
                        <TableHead className="text-center bg-emerald-50 text-emerald-700">Hadir</TableHead>
                        <TableHead className="text-center bg-blue-50 text-blue-700">Izin</TableHead>
                        <TableHead className="text-center bg-orange-50 text-orange-700">Sakit</TableHead>
                        <TableHead className="text-center bg-red-50 text-red-700">Alfa</TableHead>
                        <TableHead className="text-right pr-6">% Kehadiran</TableHead>
                      </TableRow>
                    )}
                  </TableHeader>
                  <TableBody>
                    {reportData.map((s, index) => (
                      <TableRow key={s.id} className="bg-white hover:bg-gray-50">
                        <TableCell className="pl-6 text-center text-gray-500">{index + 1}</TableCell>
                        <TableCell className="font-medium text-gray-900">{s.nama}</TableCell>
                        <TableCell className="text-gray-500">{s.nisn || '-'}</TableCell>
                        
                        {recapType === 'HARIAN' ? (
                          <>
                            <TableCell>
                              <div className="flex flex-wrap gap-2">
                                {s.detailJam?.length > 0 ? s.detailJam.map((dj: any, i: number) => (
                                  <div key={i} className="flex flex-col text-[10px] border rounded p-1 bg-gray-50">
                                    <span className="font-semibold">{dj.waktu}</span>
                                    <span className={`font-bold ${
                                      dj.status === 'HADIR' ? 'text-emerald-600' :
                                      dj.status === 'IZIN' ? 'text-blue-600' :
                                      dj.status === 'SAKIT' ? 'text-orange-600' : 'text-red-600'
                                    }`}>{dj.status}</span>
                                  </div>
                                )) : <span className="text-xs text-gray-400 italic">Belum ada absen guru</span>}
                              </div>
                            </TableCell>
                            <TableCell className="text-center bg-gray-50/50">
                              {s.rekomendasi !== '-' ? (
                                <span className={`inline-flex px-2 py-1 rounded text-xs font-bold ${
                                  s.rekomendasi === 'HADIR' ? 'bg-emerald-100 text-emerald-800' :
                                  s.rekomendasi === 'IZIN' ? 'bg-blue-100 text-blue-800' :
                                  s.rekomendasi === 'SAKIT' ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'
                                }`}>{s.rekomendasi}</span>
                              ) : <span className="text-xs text-gray-400">-</span>}
                            </TableCell>
                            <TableCell className="text-center bg-emerald-50/30">
                              <select 
                                className={`text-sm border rounded-lg px-2 py-1.5 font-bold outline-none cursor-pointer ${
                                  !s.keputusanHarian ? 'border-dashed border-gray-300 text-gray-400' :
                                  s.keputusanHarian === 'HADIR' ? 'bg-emerald-100 border-emerald-200 text-emerald-700' :
                                  s.keputusanHarian === 'IZIN' ? 'bg-blue-100 border-blue-200 text-blue-700' :
                                  s.keputusanHarian === 'SAKIT' ? 'bg-orange-100 border-orange-200 text-orange-700' :
                                  'bg-red-100 border-red-200 text-red-700'
                                }`}
                                value={s.keputusanHarian || '}
                                onChange={(e) => handleSaveKeputusan(s.id, e.target.value)}
                              >
                                <option value="" disabled>Pilih Status</option>
                                <option value="HADIR">Hadir</option>
                                <option value="IZIN">Izin</option>
                                <option value="SAKIT">Sakit</option>
                                <option value="ALFA">Alfa</option>
                              </select>
                            </TableCell>
                          </>
                        ) : (
                          <>
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
                          </>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>"""

content = re.sub(r"              <div className=\"overflow-x-auto\">.*?</div>", table_ui, content, flags=re.DOTALL)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
