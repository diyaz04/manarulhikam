import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { CloudinaryUpload } from "@/components/common/CloudinaryUpload";
import { Loader2, Plus, Pencil, Trash2, X, Save } from "lucide-react";

interface Fasilitas {
  id: string;
  nama_fasilitas: string;
  deskripsi: string;
  foto_url: string;
  lembaga_id: string;
}

export function DashboardYayasanFasilitas() {
  const { activeRole } = useAuth();
  const [items, setItems] = useState<Fasilitas[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State for form
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Fasilitas>>({
    nama_fasilitas: "",
    deskripsi: "",
    foto_url: "",
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
        .from('fasilitas')
        .select('*')
        .eq('lembaga_id', activeRole!.lembaga_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setFormData({ nama_fasilitas: "", deskripsi: "", foto_url: "" });
    setIsEditing(true);
  };

  const handleEdit = (item: Fasilitas) => {
    setFormData(item);
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus fasilitas ini?")) return;
    
    try {
      const { error } = await supabase
        .from('fasilitas')
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
      const payload = {
        ...formData,
        lembaga_id: activeRole!.lembaga_id
      };

      let error;
      if (formData.id) {
        // Update
        const { error: updateError } = await supabase
          .from('fasilitas')
          .update(payload)
          .eq('id', formData.id);
        error = updateError;
      } else {
        // Insert
        const { error: insertError } = await supabase
          .from('fasilitas')
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
              <CardTitle>{formData.id ? "Edit Fasilitas" : "Tambah Fasilitas Baru"}</CardTitle>
              <CardDescription>Isi detail fasilitas yang ada di lembaga ini.</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form id="fasilitas-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Fasilitas</Label>
              <Input 
                value={formData.nama_fasilitas} 
                onChange={(e) => setFormData({...formData, nama_fasilitas: e.target.value})} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label>Deskripsi Singkat</Label>
              <Input 
                value={formData.deskripsi || ""} 
                onChange={(e) => setFormData({...formData, deskripsi: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label>Foto Fasilitas</Label>
              <div className="border p-4 rounded-lg bg-gray-50 flex justify-center">
                <CloudinaryUpload 
                  defaultImage={formData.foto_url} 
                  onUploadSuccess={(url) => setFormData({...formData, foto_url: url})}
                />
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button variant="outline" onClick={() => setIsEditing(false)} disabled={saving}>Batal</Button>
          <Button form="fasilitas-form" type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Simpan
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Manajemen Fasilitas</h2>
          <p className="text-muted-foreground">Kelola fasilitas yang tampil di website publik.</p>
        </div>
        <Button onClick={handleAddNew} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-2" /> Tambah Fasilitas
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="text-center p-12 border-2 border-dashed rounded-lg text-gray-500">
          Belum ada data fasilitas. Klik "Tambah Fasilitas" untuk memulai.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden flex flex-col">
              <div className="h-48 bg-gray-100 overflow-hidden">
                {item.foto_url ? (
                  <img src={item.foto_url} alt={item.nama_fasilitas} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">Tanpa Foto</div>
                )}
              </div>
              <CardContent className="p-4 flex-1">
                <h3 className="font-bold text-lg mb-1">{item.nama_fasilitas}</h3>
                <p className="text-sm text-gray-600 line-clamp-2">{item.deskripsi}</p>
              </CardContent>
              <CardFooter className="p-4 border-t bg-gray-50 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
                  <Pencil className="w-4 h-4 mr-1" /> Edit
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
