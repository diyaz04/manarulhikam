import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, Plus, Pencil, Trash2, X, Save, MapPin, Clock } from "lucide-react";

interface Agenda {
  id: string;
  nama_kegiatan: string;
  deskripsi: string;
  lokasi: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  lembaga_id: string;
}

export function DashboardYayasanAgenda() {
  const { activeRole } = useAuth();
  const [items, setItems] = useState<Agenda[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State for form
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Agenda>>({
    nama_kegiatan: "",
    deskripsi: "",
    lokasi: "",
    tanggal_mulai: "",
    tanggal_selesai: "",
  });

  useEffect(() => {
    if (activeRole) {
      fetchData();
    }
  }, [activeRole]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('agenda_kegiatan')
        .select('*')
        .eq('lembaga_id', activeRole!.lembaga_id)
        .order('tanggal_mulai', { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setFormData({ nama_kegiatan: "", deskripsi: "", lokasi: "", tanggal_mulai: "", tanggal_selesai: "" });
    setIsEditing(true);
  };

  const handleEdit = (item: Agenda) => {
    // Format dates for datetime-local input
    const formatForInput = (isoString: string) => {
      if (!isoString) return "";
      const date = new Date(isoString);
      // Adjust to local timezone for the input display
      const tzOffset = date.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16);
      return localISOTime;
    };

    setFormData({
      ...item,
      tanggal_mulai: formatForInput(item.tanggal_mulai),
      tanggal_selesai: item.tanggal_selesai ? formatForInput(item.tanggal_selesai) : "",
    });
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus agenda ini?")) return;
    
    try {
      const { error } = await supabase
        .from('agenda_kegiatan')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setItems(prev => prev.filter(item => item.id !== id));
    } catch (error: any) {
      alert("Gagal menghapus: " + error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Convert local datetime back to UTC for Supabase
      const payload = {
        nama_kegiatan: formData.nama_kegiatan,
        deskripsi: formData.deskripsi,
        lokasi: formData.lokasi,
        tanggal_mulai: new Date(formData.tanggal_mulai as string).toISOString(),
        tanggal_selesai: formData.tanggal_selesai ? new Date(formData.tanggal_selesai as string).toISOString() : null,
        lembaga_id: activeRole!.lembaga_id,
      };

      let error;
      if (formData.id) {
        const { error: updateError } = await supabase
          .from('agenda_kegiatan')
          .update(payload)
          .eq('id', formData.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('agenda_kegiatan')
          .insert([payload]);
        error = insertError;
      }

      if (error) throw error;
      
      setIsEditing(false);
      fetchData(); // Refresh list
    } catch (error: any) {
      console.error("Error saving:", error);
      alert("Gagal menyimpan: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;
  }

  if (isEditing) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>{formData.id ? "Edit Agenda" : "Tambah Agenda Baru"}</CardTitle>
              <CardDescription>Buat jadwal kegiatan yang akan datang.</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form id="agenda-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Kegiatan</Label>
              <Input 
                value={formData.nama_kegiatan} 
                onChange={(e) => setFormData({...formData, nama_kegiatan: e.target.value})} 
                required 
              />
            </div>
            
            <div className="space-y-2">
              <Label>Deskripsi Lengkap</Label>
              <textarea 
                value={formData.deskripsi || ""} 
                onChange={(e) => setFormData({...formData, deskripsi: e.target.value})} 
                className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
              />
            </div>

            <div className="space-y-2">
              <Label>Lokasi Pelaksanaan</Label>
              <Input 
                value={formData.lokasi || ""} 
                onChange={(e) => setFormData({...formData, lokasi: e.target.value})} 
                placeholder="Misal: Aula Yayasan"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Waktu Mulai</Label>
                <Input 
                  type="datetime-local"
                  value={formData.tanggal_mulai || ""} 
                  onChange={(e) => setFormData({...formData, tanggal_mulai: e.target.value})} 
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Waktu Selesai (Opsional)</Label>
                <Input 
                  type="datetime-local"
                  value={formData.tanggal_selesai || ""} 
                  onChange={(e) => setFormData({...formData, tanggal_selesai: e.target.value})} 
                />
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => setIsEditing(false)} disabled={saving}>Batal</Button>
          <Button form="agenda-form" type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Simpan Agenda
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Manajemen Agenda Kegiatan</h2>
          <p className="text-muted-foreground">Kelola jadwal kegiatan yang tampil di website publik.</p>
        </div>
        <Button onClick={handleAddNew} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-2" /> Tambah Agenda
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="text-center p-12 border-2 border-dashed rounded-lg text-gray-500">
          Belum ada agenda. Klik "Tambah Agenda" untuk memulai.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:gap-6">
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-lg leading-tight">{item.nama_kegiatan}</h3>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" onClick={() => handleEdit(item)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    <span>
                      {new Date(item.tanggal_mulai).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                      {item.tanggal_selesai && ` - ${new Date(item.tanggal_selesai).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}`}
                    </span>
                  </div>
                  {item.lokasi && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                      <span>{item.lokasi}</span>
                    </div>
                  )}
                </div>
                
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md line-clamp-2">
                  {item.deskripsi}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
