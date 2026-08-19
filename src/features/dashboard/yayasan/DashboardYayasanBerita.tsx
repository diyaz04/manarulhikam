import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { CloudinaryUpload } from "@/components/common/CloudinaryUpload";
import { Loader2, Plus, Pencil, Trash2, X, Save } from "lucide-react";

interface Berita {
  id: string;
  judul: string;
  slug: string;
  konten: string;
  foto_url: string;
  lembaga_id: string;
  created_at: string;
}

export function DashboardYayasanBerita() {
  const { activeRole, user } = useAuth();
  const [items, setItems] = useState<Berita[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State for form
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Berita>>({
    judul: "",
    slug: "",
    konten: "",
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
        .from('berita')
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
    setFormData({ judul: "", slug: "", konten: "", foto_url: "" });
    setIsEditing(true);
  };

  const handleEdit = (item: Berita) => {
    setFormData(item);
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus berita ini?")) return;
    
    try {
      const { error } = await supabase
        .from('berita')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setItems(prev => prev.filter(item => item.id !== id));
    } catch (error: any) {
      alert("Gagal menghapus: " + error.message);
    }
  };

  const generateSlug = (text: string) => {
    return text.toString().toLowerCase()
      .replace(/\s+/g, '-')           // Ganti spasi dengan -
      .replace(/[^\w\-]+/g, '')       // Hapus semua char non-word
      .replace(/\-\-+/g, '-')         // Ganti multiple - dengan single -
      .replace(/^-+/, '')             // Trim - dari awal
      .replace(/-+$/, '')             // Trim - dari akhir
      + '-' + Math.random().toString(36).substring(2, 6); // Add random string
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const slug = formData.slug || generateSlug(formData.judul || "berita");
      const payload = {
        judul: formData.judul,
        slug: slug,
        konten: formData.konten,
        foto_url: formData.foto_url,
        lembaga_id: activeRole!.lembaga_id,
        penulis_id: user?.id,
      };

      let error;
      if (formData.id) {
        const { error: updateError } = await supabase
          .from('berita')
          .update(payload)
          .eq('id', formData.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('berita')
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
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>{formData.id ? "Edit Berita" : "Tulis Berita Baru"}</CardTitle>
              <CardDescription>Publikasikan artikel atau berita terbaru ke Landing Page.</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form id="berita-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>Judul Berita</Label>
              <Input 
                value={formData.judul} 
                onChange={(e) => setFormData({...formData, judul: e.target.value})} 
                required 
                className="text-lg font-semibold"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Isi Konten Berita</Label>
              <textarea 
                value={formData.konten || ""} 
                onChange={(e) => setFormData({...formData, konten: e.target.value})} 
                required
                className="flex min-h-[300px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
              />
            </div>

            <div className="space-y-2">
              <Label>Foto Utama (Thumbnail)</Label>
              <div className="border p-4 rounded-lg bg-gray-50 flex justify-center">
                <CloudinaryUpload 
                  defaultImage={formData.foto_url} 
                  onUploadSuccess={(url) => setFormData({...formData, foto_url: url})}
                />
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => setIsEditing(false)} disabled={saving}>Batal</Button>
          <Button form="berita-form" type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Terbitkan Berita
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Manajemen Berita</h2>
          <p className="text-muted-foreground">Kelola artikel dan berita yang tampil di website publik.</p>
        </div>
        <Button onClick={handleAddNew} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-2" /> Tulis Berita
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="text-center p-12 border-2 border-dashed rounded-lg text-gray-500">
          Belum ada berita. Klik "Tulis Berita" untuk memulai.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden flex flex-col">
              <div className="h-48 bg-gray-100 overflow-hidden">
                {item.foto_url ? (
                  <img src={item.foto_url} alt={item.judul} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">Tanpa Foto</div>
                )}
              </div>
              <CardContent className="p-4 flex-1">
                <div className="text-xs text-gray-500 mb-2">
                  {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                <h3 className="font-bold text-lg mb-2 line-clamp-2 leading-tight">{item.judul}</h3>
                <p className="text-sm text-gray-600 line-clamp-3">{item.konten}</p>
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
