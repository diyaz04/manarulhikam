import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CloudinaryUpload } from "@/components/common/CloudinaryUpload";
import { Loader2, Save, CheckCircle2 } from "lucide-react";

export function DashboardUnitProfil() {
  const { activeRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    id: "",
    nama: "",
    deskripsi: "",
    logo_url: "",
    gambar_url: "",
  });

  useEffect(() => {
    if (activeRole?.lembaga_id) {
      fetchProfile();
    }
  }, [activeRole]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('lembaga')
        .select('*')
        .eq('id', activeRole?.lembaga_id)
        .single();

      if (error) throw error;
      
      if (data) {
        setFormData({
          id: data.id,
          nama: data.nama || "",
          deskripsi: data.deskripsi || "",
          logo_url: data.logo_url || "",
          gambar_url: data.gambar_url || "",
        });
      }
    } catch (error) {
      console.error("Error fetching unit profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id) return;
    
    try {
      setSaving(true);
      const { error } = await supabase
        .from('lembaga')
        .update({
          nama: formData.nama,
          deskripsi: formData.deskripsi,
          logo_url: formData.logo_url,
          gambar_url: formData.gambar_url,
        })
        .eq('id', formData.id);

      if (error) throw error;
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      console.error("Error saving unit profile:", error);
      alert("Gagal menyimpan: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Profil Lembaga {activeRole?.lembaga.kode}</h2>
          <p className="text-muted-foreground">
            Sesuaikan identitas, logo, dan profil unit ini untuk ditampilkan di Landing Page publik.
          </p>
        </div>
        <Button onClick={handleSubmit} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Simpan Perubahan
        </Button>
      </div>

      {saveSuccess && (
        <div className="bg-emerald-50 text-emerald-700 p-3 rounded-md flex items-center border border-emerald-200">
          <CheckCircle2 className="w-5 h-5 mr-2" />
          Perubahan berhasil disimpan dan akan langsung tampil di Landing Page.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Identitas Lembaga</CardTitle>
            <CardDescription>Informasi dasar nama dan deskripsi unit/lembaga.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Lengkap Lembaga</Label>
              <Input 
                value={formData.nama}
                onChange={e => setFormData({...formData, nama: e.target.value})}
                placeholder="Contoh: SMP IT Manarul Hikam"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Deskripsi / Profil Lengkap</Label>
              <textarea 
                className="flex min-h-[150px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.deskripsi}
                onChange={e => setFormData({...formData, deskripsi: e.target.value})}
                placeholder="Ceritakan tentang profil singkat, keunggulan, atau sejarah lembaga ini..."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Media & Branding</CardTitle>
            <CardDescription>Logo dan banner gambar (Hero) utama.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Logo Lembaga</Label>
              <CloudinaryUpload 
                onUploadSuccess={(url) => setFormData({...formData, logo_url: url})}
                defaultImage={formData.logo_url}
              />
              <p className="text-xs text-muted-foreground mt-1">Gunakan format PNG transparan agar terlihat rapi (max 2MB).</p>
            </div>

            <div className="space-y-2">
              <Label>Gambar Banner (Hero Image)</Label>
              <CloudinaryUpload 
                onUploadSuccess={(url) => setFormData({...formData, gambar_url: url})}
                defaultImage={formData.gambar_url}
              />
              <p className="text-xs text-muted-foreground mt-1">Gambar lebar berukuran HD (contoh: 1920x1080) untuk sampul di Landing Page (max 5MB).</p>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
