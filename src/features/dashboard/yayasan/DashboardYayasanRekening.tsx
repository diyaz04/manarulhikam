import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, CreditCard, Trash2, Edit2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Rekening {
  id: string;
  nama_bank: string;
  no_rekening: string;
  atas_nama: string;
  is_active: boolean;
}

export function DashboardYayasanRekening() {
  const [rekening, setRekening] = useState<Rekening[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [namaBank, setNamaBank] = useState("");
  const [noRekening, setNoRekening] = useState("");
  const [atasNama, setAtasNama] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRekening();
  }, []);

  const fetchRekening = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('rekening_yayasan')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setRekening(data || []);
    } catch (e: any) {
      console.error(e);
      alert("Gagal memuat data rekening");
    } finally {
      setLoading(false);
    }
  };

  const openModal = (rek?: Rekening) => {
    if (rek) {
      setEditingId(rek.id);
      setNamaBank(rek.nama_bank);
      setNoRekening(rek.no_rekening);
      setAtasNama(rek.atas_nama);
    } else {
      setEditingId(null);
      setNamaBank("");
      setNoRekening("");
      setAtasNama("");
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from('rekening_yayasan')
          .update({ nama_bank: namaBank, no_rekening: noRekening, atas_nama: atasNama })
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('rekening_yayasan')
          .insert([{ nama_bank: namaBank, no_rekening: noRekening, atas_nama: atasNama }]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      fetchRekening();
    } catch (e: any) {
      alert("Gagal menyimpan rekening: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus rekening ini?")) return;
    try {
      const { error } = await supabase.from('rekening_yayasan').delete().eq('id', id);
      if (error) throw error;
      fetchRekening();
    } catch (e: any) {
      alert("Gagal menghapus: " + e.message);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Konfigurasi Rekening Pembayaran</h2>
          <p className="text-muted-foreground">Kelola nomor rekening bank Yayasan yang akan ditampilkan di Portal Siswa.</p>
        </div>
        <Button onClick={() => openModal()} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-2" /> Tambah Rekening
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rekening.length === 0 ? (
          <div className="col-span-full p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Belum ada rekening yang dikonfigurasi.</p>
          </div>
        ) : (
          rekening.map(rek => (
            <Card key={rek.id}>
              <CardHeader className="pb-3">
                <CardTitle className="flex justify-between items-start text-lg">
                  <span className="font-bold text-gray-900">{rek.nama_bank}</span>
                  <div className="flex gap-2">
                    <button onClick={() => openModal(rek)} className="text-blue-600 hover:text-blue-800 p-1"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(rek.id)} className="text-red-600 hover:text-red-800 p-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                  <p className="font-mono text-xl text-emerald-800 font-bold tracking-widest">{rek.no_rekening}</p>
                  <p className="text-sm text-emerald-600 mt-1 uppercase font-semibold">A.N. {rek.atas_nama}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Rekening" : "Tambah Rekening Baru"}</DialogTitle>
              <DialogDescription>Masukkan detail bank yang akan menerima transfer pembayaran dari orangtua siswa.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nama Bank</Label>
                <Input placeholder="Contoh: BCA / Mandiri / BSI" required value={namaBank} onChange={e => setNamaBank(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Nomor Rekening</Label>
                <Input placeholder="Contoh: 1234567890" required value={noRekening} onChange={e => setNoRekening(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Atas Nama (Pemilik Rekening)</Label>
                <Input placeholder="Contoh: Yayasan Manarul Hikam" required value={atasNama} onChange={e => setAtasNama(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={submitting}>
                {submitting ? "Menyimpan..." : "Simpan Rekening"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
