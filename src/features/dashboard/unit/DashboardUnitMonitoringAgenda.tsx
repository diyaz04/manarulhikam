import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Calendar, FileText, CheckCircle2, Clock, XCircle, UserCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function DashboardUnitMonitoringAgenda() {
  const { activeRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [agendas, setAgendas] = useState<any[]>([]);
  const [tanggalFilter, setTanggalFilter] = useState<string>(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (activeRole?.lembaga_id) {
      fetchAgendas();
    }
  }, [activeRole, tanggalFilter]);

  const fetchAgendas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('agenda_mengajar')
        .select(`
          id, tanggal, materi, foto_url, status, status_kehadiran_guru, created_at,
          guru:teachers!inner(nama),
          jadwal:schedules!inner(mata_pelajaran, kelas, jam_ke_mulai, jam_ke_selesai),
          absensi:absensi_siswa(count)
        `)
        .eq('lembaga_id', activeRole!.lembaga_id)
        .eq('tanggal', tanggalFilter)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAgendas(data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAgendas = agendas.filter(a => 
    a.guru.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.jadwal.mata_pelajaran.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.jadwal.kelas.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (statusKehadiran: string) => {
    switch (statusKehadiran) {
      case 'TEPAT_WAKTU': return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none"><CheckCircle2 className="w-3 h-3 mr-1"/> Tepat Waktu</Badge>;
      case 'TERLAMBAT': return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-none"><Clock className="w-3 h-3 mr-1"/> Terlambat</Badge>;
      case 'IZIN': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">Izin</Badge>;
      case 'SAKIT': return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-none">Sakit</Badge>;
      case 'ALFA': return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none"><XCircle className="w-3 h-3 mr-1"/> Alfa</Badge>;
      default: return <Badge className="bg-gray-100 text-gray-700 border-none">{statusKehadiran}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Monitoring Agenda Guru</h2>
          <p className="text-gray-500 text-sm mt-1">
            Pantau pengisian agenda mengajar dan kehadiran guru per tanggal.
          </p>
        </div>
      </div>

      <Card className="border-gray-100 shadow-sm overflow-hidden rounded-2xl">
        <CardHeader className="bg-white border-b pb-4">
          <div className="flex flex-col sm:flex-row justify-between gap-4 items-center">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input 
                  type="date"
                  value={tanggalFilter}
                  onChange={(e) => setTanggalFilter(e.target.value)}
                  className="pl-9 font-semibold bg-gray-50 border-gray-200 rounded-xl w-[180px]"
                />
              </div>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input 
                placeholder="Cari guru, mapel, kelas..." 
                className="pl-9 bg-gray-50 border-none focus-visible:ring-1 focus-visible:ring-emerald-500 rounded-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-emerald-600">
              <Loader2 className="w-8 h-8 animate-spin mb-2" />
              <p className="text-sm font-medium text-gray-500">Memuat data monitoring...</p>
            </div>
          ) : filteredAgendas.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Tidak ada agenda mengajar pada tanggal ini.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead className="pl-6">Guru & Mapel</TableHead>
                    <TableHead>Waktu & Kelas</TableHead>
                    <TableHead>Materi & Bukti</TableHead>
                    <TableHead>Kehadiran Guru</TableHead>
                    <TableHead className="text-center">Absensi Siswa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAgendas.map((agenda) => (
                    <TableRow key={agenda.id} className="hover:bg-gray-50/50">
                      <TableCell className="pl-6">
                        <p className="font-bold text-gray-900">{agenda.guru.nama}</p>
                        <p className="text-xs text-gray-500 mt-0.5 font-medium">{agenda.jadwal.mata_pelajaran}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-semibold text-emerald-700 bg-emerald-50 inline-block px-2 py-0.5 rounded-md border border-emerald-100">
                          Kelas {agenda.jadwal.kelas}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Jam ke {agenda.jadwal.jam_ke_mulai} {agenda.jadwal.jam_ke_selesai > agenda.jadwal.jam_ke_mulai ? `- ${agenda.jadwal.jam_ke_selesai}` : ''}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <p className="text-sm text-gray-700 line-clamp-2 cursor-pointer hover:text-emerald-600">
                              {agenda.materi}
                            </p>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle>Detail Materi & Bukti Foto</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div>
                                <p className="text-sm font-semibold text-gray-900 mb-1">Materi:</p>
                                <p className="text-sm text-gray-700 p-3 bg-gray-50 rounded-lg">{agenda.materi}</p>
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-900 mb-1">Bukti Foto:</p>
                                {agenda.foto_url ? (
                                  <img src={agenda.foto_url} alt="Bukti Mengajar" className="w-full rounded-lg border shadow-sm" />
                                ) : (
                                  <p className="text-sm text-gray-500 italic">Tidak ada foto</p>
                                )}
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 items-start">
                          {getStatusBadge(agenda.status_kehadiran_guru)}
                          <span className="text-[10px] text-gray-400">
                            Diisi: {new Date(agenda.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center justify-center">
                          <UserCheck className="w-4 h-4 text-blue-500 mb-1" />
                          <span className="text-xs font-bold text-gray-700">{agenda.absensi[0]?.count || 0} Siswa</span>
                        </div>
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
