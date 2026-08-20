import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, Loader2, CheckCircle, XCircle, Camera, Check, X, FileText, Paperclip } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export function DashboardUnitVerifikasiKedatangan() {
  const { activeRole, user } = useAuth();
  const [absensi, setAbsensi] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isVerifying, setIsVerifying] = useState<string | null>(null);

  const [selectedAbsensi, setSelectedAbsensi] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (activeRole?.lembaga_id) {
      fetchAbsensi();
    }
  }, [activeRole, selectedDate]);

  const fetchAbsensi = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('absensi_kedatangan_guru')
        .select(`
          *,
          guru:teachers!inner(nama, nip)
        `)
        .eq('lembaga_id', activeRole!.lembaga_id)
        .eq('tanggal', selectedDate)
        .order('waktu_absen', { ascending: false });

      if (error) throw error;
      setAbsensi(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (id: string, statusVerifikasi: 'VERIFIED' | 'REJECTED') => {
    setIsVerifying(id);
    try {
      const { error } = await supabase
        .from('absensi_kedatangan_guru')
        .update({
          status_verifikasi: statusVerifikasi,
          diverifikasi_oleh: user!.id,
          waktu_verifikasi: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      setAbsensi(prev => prev.map(a => a.id === id ? { ...a, status_verifikasi: statusVerifikasi } : a));
      if (isDialogOpen) setIsDialogOpen(false);
    } catch (err) {
      console.error(err);
      alert("Gagal memverifikasi");
    } finally {
      setIsVerifying(null);
    }
  };

  const filtered = absensi.filter(a => 
    a.guru.nama.toLowerCase().includes(search.toLowerCase()) || 
    (a.guru.nip && a.guru.nip.includes(search))
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Verifikasi Absen Kedatangan</h1>
          <p className="text-gray-500">Pantau dan verifikasi kehadiran guru harian.</p>
        </div>
      </div>

      <Card className="border-gray-100 shadow-sm">
        <CardContent className="p-0">
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between bg-gray-50/50 rounded-t-xl">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input 
                placeholder="Cari nama atau NIP guru..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white border-gray-200"
              />
            </div>
            <Input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full sm:w-auto bg-white border-gray-200"
            />
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="font-semibold text-gray-600">Guru</TableHead>
                  <TableHead className="font-semibold text-gray-600">Waktu Absen</TableHead>
                  <TableHead className="font-semibold text-gray-600">Status & Ket.</TableHead>
                  <TableHead className="font-semibold text-gray-600">Bukti Foto</TableHead>
                  <TableHead className="font-semibold text-gray-600">Verifikasi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-gray-500">
                      Tidak ada data absensi kedatangan untuk tanggal ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <p className="font-bold text-gray-900">{a.guru.nama}</p>
                        <p className="text-xs text-gray-500">{a.guru.nip || '-'}</p>
                      </TableCell>
                      <TableCell>
                        <p className="font-bold text-gray-700">{a.waktu_absen}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 items-start">
                          <Badge variant="outline" className={
                            a.status === 'HADIR' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                            a.status === 'IZIN' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                            'bg-orange-50 text-orange-700 border-orange-200'
                          }>
                            {a.status}
                          </Badge>
                          {a.keterangan && <p className="text-xs text-gray-500 max-w-[150px] truncate">{a.keterangan}</p>}
                          {(a.tugas_keterangan || a.tugas_file_url) && (
                            <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                              <FileText className="w-3 h-3" /> Ada Tugas
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {a.foto_url ? (
                          <div 
                            className="w-12 h-12 rounded bg-gray-100 cursor-pointer overflow-hidden border hover:ring-2 ring-emerald-500/50"
                            onClick={() => { setSelectedAbsensi(a); setIsDialogOpen(true); }}
                          >
                            <img src={a.foto_url} alt="Selfie" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <span className="text-gray-400"><Camera className="w-5 h-5" /></span>
                        )}
                      </TableCell>
                      <TableCell>
                        {a.status_verifikasi === 'PENDING' ? (
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 h-8 px-2"
                              onClick={() => handleVerify(a.id, 'VERIFIED')}
                              disabled={isVerifying === a.id}
                            >
                              <Check className="w-4 h-4 mr-1" /> ACC
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="border-red-200 text-red-700 hover:bg-red-50 h-8 px-2"
                              onClick={() => handleVerify(a.id, 'REJECTED')}
                              disabled={isVerifying === a.id}
                            >
                              <X className="w-4 h-4 mr-1" /> Tolak
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-sm font-medium">
                            {a.status_verifikasi === 'VERIFIED' ? (
                              <span className="text-emerald-600 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Disetujui</span>
                            ) : (
                              <span className="text-red-600 flex items-center gap-1"><XCircle className="w-4 h-4" /> Ditolak</span>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Preview */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader className="p-6 border-b border-gray-100 bg-gray-50/50">
            <DialogTitle>Detail Kedatangan: {selectedAbsensi?.guru.nama}</DialogTitle>
          </DialogHeader>
          {selectedAbsensi && (
            <div className="p-6 space-y-6">
              <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                <img src={selectedAbsensi.foto_url} alt="Selfie Besar" className="w-full h-full object-contain" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase">Status</p>
                  <p className="font-bold">{selectedAbsensi.status}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase">Waktu Absen</p>
                  <p className="font-bold">{selectedAbsensi.waktu_absen}</p>
                </div>
                {selectedAbsensi.keterangan && (
                  <div className="col-span-2">
                    <p className="text-xs font-bold text-gray-500 uppercase">Keterangan</p>
                    <p className="text-sm text-gray-800">{selectedAbsensi.keterangan}</p>
                  </div>
                )}
              </div>
              
              {(selectedAbsensi.tugas_keterangan || selectedAbsensi.tugas_file_url) && (
                <div className="col-span-2 pt-4 border-t border-gray-100">
                  <p className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1 mb-2"><FileText className="w-4 h-4" /> Tugas Pengganti (Guru Izin/Sakit)</p>
                  {selectedAbsensi.tugas_keterangan && (
                    <p className="text-sm text-gray-800 bg-orange-50 p-3 rounded-lg border border-orange-100 mb-3 whitespace-pre-wrap">
                      {selectedAbsensi.tugas_keterangan}
                    </p>
                  )}
                  {selectedAbsensi.tugas_file_url && (
                    <a 
                      href={selectedAbsensi.tugas_file_url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-100"
                    >
                      <Paperclip className="w-4 h-4" /> Lihat / Unduh File Lampiran
                    </a>
                  )}
                </div>
              )}

              {selectedAbsensi.status_verifikasi === 'PENDING' && (
                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <Button 
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700" 
                    onClick={() => handleVerify(selectedAbsensi.id, 'VERIFIED')}
                    disabled={isVerifying === selectedAbsensi.id}
                  >
                    Setujui Absen
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => handleVerify(selectedAbsensi.id, 'REJECTED')}
                    disabled={isVerifying === selectedAbsensi.id}
                  >
                    Tolak
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
