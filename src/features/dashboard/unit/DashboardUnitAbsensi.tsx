import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Eye,
  Image as ImageIcon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function DashboardUnitAbsensi() {
  const { activeRole, user } = useAuth();
  const [agendas, setAgendas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeYear, setActiveYear] = useState<any>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [selectedAgenda, setSelectedAgenda] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (activeRole?.lembaga_id) {
      fetchData();
    }
  }, [activeRole]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: yearData } = await supabase
        .from('academic_years')
        .select('*')
        .eq('lembaga_id', activeRole!.lembaga_id)
        .eq('is_active', true)
        .single();
        
      setActiveYear(yearData || null);

      if (!yearData) {
        setLoading(false);
        return;
      }

      const { data: agendaData, error } = await supabase
        .from('agenda_mengajar')
        .select(`
          id,
          tanggal,
          materi,
          foto_url,
          status,
          guru:teachers!guru_id (nama),
          jadwal:schedules!jadwal_id (
            hari, jam_ke_mulai, jam_ke_selesai, mata_pelajaran, kelas, academic_year_id
          )
        `)
        .eq('status', 'PENDING')
        .eq('lembaga_id', activeRole!.lembaga_id)
        .order('tanggal', { ascending: false });

      if (error) throw error;

      const validAgendas = (agendaData || []).filter((a: any) => a.jadwal != null && a.jadwal.academic_year_id === yearData.id);
      setAgendas(validAgendas);

    } catch (err) {
      console.error("Error fetching pending agendas:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (id: string, action: 'VERIFIED' | 'REJECTED') => {
    if (!confirm(`Apakah Anda yakin ingin ${action === 'VERIFIED' ? 'Menyetujui' : 'Menolak'} agenda ini?`)) return;

    try {
      setProcessingId(id);
      
      const { error } = await supabase
        .from('agenda_mengajar')
        .update({
          status: action,
          diverifikasi_oleh: user!.id,
          tanggal_verifikasi: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      
      setAgendas(prev => prev.filter(a => a.id !== id));
      setIsModalOpen(false);
      setSelectedAgenda(null);
      
    } catch (err: any) {
      alert("Gagal memverifikasi agenda: " + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const openDetail = (agenda: any) => {
    setSelectedAgenda(agenda);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Verifikasi Absensi Mengajar</h1>
        <p className="text-gray-500 text-sm mt-1">
          Tinjau laporan agenda guru dan verifikasi untuk menghitung honor secara otomatis.
        </p>
      </div>

      {!activeYear && !loading && (
        <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 shrink-0" />
            <p className="text-sm text-orange-800">
              <strong>Belum ada Tahun Ajaran yang aktif.</strong> Verifikasi hanya dapat dilakukan jika ada Tahun Ajaran yang aktif.
            </p>
          </div>
        </div>
      )}

      {activeYear && (
        <Card className="border-0 shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="bg-white border-b pb-4">
            <CardTitle>Menunggu Verifikasi</CardTitle>
            <CardDescription>Daftar agenda yang belum diverifikasi.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 bg-white">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              </div>
            ) : agendas.length === 0 ? (
              <div className="text-center py-24 bg-white">
                <CheckCircle className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Bagus! Semua agenda sudah diverifikasi.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="w-16 text-center">No</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Nama Guru</TableHead>
                      <TableHead>Kelas & Mapel</TableHead>
                      <TableHead>Jam Ke</TableHead>
                      <TableHead className="text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agendas.map((agenda, index) => (
                      <TableRow key={agenda.id} className="hover:bg-gray-50">
                        <TableCell className="text-center font-medium">{index + 1}</TableCell>
                        <TableCell>
                          {new Date(agenda.tanggal).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </TableCell>
                        <TableCell className="font-bold text-emerald-900">{agenda.guru.nama}</TableCell>
                        <TableCell>
                          {agenda.jadwal.mata_pelajaran} (KLS {agenda.jadwal.kelas})
                        </TableCell>
                        <TableCell>
                          {agenda.jadwal.jam_ke_mulai}{agenda.jadwal.jam_ke_selesai > agenda.jadwal.jam_ke_mulai ? `-${agenda.jadwal.jam_ke_selesai}` : ''}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                            onClick={() => openDetail(agenda)}
                          >
                            <Eye className="w-4 h-4 mr-1" /> Detail
                          </Button>
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

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-2xl max-h-[90vh] flex flex-col">
          {selectedAgenda && (
            <>
              <DialogHeader className="p-4 md:p-6 border-b bg-gray-50 shrink-0">
                <DialogTitle>Detail Verifikasi Agenda</DialogTitle>
                <DialogDescription>
                  Tinjau bukti mengajar dan materi sebelum menyetujui.
                </DialogDescription>
              </DialogHeader>
              
              <div className="p-4 md:p-6 space-y-5 overflow-y-auto flex-1">
                {/* Photo section */}
                <div className="w-full h-48 sm:h-56 bg-gray-100 rounded-xl overflow-hidden border">
                  {selectedAgenda.foto_url ? (
                    <img 
                      src={selectedAgenda.foto_url} 
                      alt="Bukti Mengajar" 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                      <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
                      <span className="text-sm font-medium">Tanpa Foto</span>
                    </div>
                  )}
                </div>

                {/* Details section */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <span className="text-gray-500">Nama Guru:</span>
                    <p className="font-bold text-gray-900">{selectedAgenda.guru.nama}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-gray-500">Tanggal:</span>
                    <p className="font-bold text-gray-900">
                      {new Date(selectedAgenda.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-gray-500">Mata Pelajaran:</span>
                    <p className="font-bold text-gray-900">{selectedAgenda.jadwal.mata_pelajaran}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-gray-500">Kelas & Waktu:</span>
                    <p className="font-bold text-gray-900">
                      KLS {selectedAgenda.jadwal.kelas} • Jam ke-{selectedAgenda.jadwal.jam_ke_mulai}{selectedAgenda.jadwal.jam_ke_selesai > selectedAgenda.jadwal.jam_ke_mulai ? `-${selectedAgenda.jadwal.jam_ke_selesai}` : ''}
                    </p>
                  </div>
                </div>

                <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100">
                  <span className="text-xs font-bold text-orange-800 uppercase tracking-wider mb-1 block">Materi / Catatan:</span>
                  <p className="text-gray-800">{selectedAgenda.materi}</p>
                </div>
              </div>

              <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 shrink-0">
                <Button 
                  variant="outline" 
                  className="rounded-xl text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 px-6"
                  onClick={() => handleVerify(selectedAgenda.id, 'REJECTED')}
                  disabled={processingId === selectedAgenda.id}
                >
                  Tolak
                </Button>
                <Button 
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm px-6"
                  onClick={() => handleVerify(selectedAgenda.id, 'VERIFIED')}
                  disabled={processingId === selectedAgenda.id}
                >
                  {processingId === selectedAgenda.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Setujui
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
