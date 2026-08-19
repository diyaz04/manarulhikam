import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CloudinaryUpload } from "@/components/common/CloudinaryUpload";
import { Loader2, Save, CheckCircle2 } from "lucide-react";

export function DashboardYayasanProfil() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    id: "",
    nama_yayasan: "",
    hero_title: "",
    hero_subtitle: "",
    hero_image_url: "",
    ketua_nama: "",
    ketua_foto_url: "",
    visi: "",
    misi: "",
    sejarah: "",
    alamat: "",
    kontak: "",
    email: "",
    facebook_url: "",
    instagram_url: "",
    youtube_url: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('site_profile')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // ignore no rows error
      
      if (data) {
        setFormData({
          id: data.id,
          nama_yayasan: data.nama_yayasan || "",
          hero_title: data.hero_title || "",
          hero_subtitle: data.hero_subtitle || "",
          hero_image_url: data.hero_image_url || "",
          ketua_nama: data.ketua_nama || "",
          ketua_foto_url: data.ketua_foto_url || "",
          visi: data.visi || "",
          misi: data.misi || "",
          sejarah: data.sejarah || "",
          alamat: data.alamat || "",
          kontak: data.kontak || "",
          email: data.email || "",
          facebook_url: data.facebook_url || "",
          instagram_url: data.instagram_url || "",
          youtube_url: data.youtube_url || "",
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setSaveSuccess(false);
  };

  const handleImageUrlChange = (field: string, url: string) => {
    setFormData(prev => ({ ...prev, [field]: url }));
    setSaveSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      const { id: _id, ...dataToSave } = formData;
      
      let error;
      
      if (formData.id) {
        // Update existing
        const { error: updateError } = await supabase
          .from('site_profile')
          .update({ ...dataToSave, updated_at: new Date().toISOString() })
          .eq('id', formData.id);
        error = updateError;
      } else {
        // Insert new (should rarely happen since migration seeds it)
        const { error: insertError } = await supabase
          .from('site_profile')
          .insert([dataToSave]);
        error = insertError;
      }

      if (error) throw error;
      setSaveSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      console.error("Error saving profile:", error);
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
          <h2 className="text-2xl font-bold tracking-tight">Pengaturan Profil Yayasan</h2>
          <p className="text-muted-foreground">
            Kelola konten utama yang tampil di Landing Page publik.
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
        {/* Section 1: Hero Banner */}
        <Card>
          <CardHeader>
            <CardTitle>Hero Banner & Sambutan</CardTitle>
            <CardDescription>Atur teks penyambutan utama dan gambar banner latar belakang.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nama_yayasan">Nama Yayasan</Label>
                  <Input id="nama_yayasan" name="nama_yayasan" value={formData.nama_yayasan} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hero_title">Judul Sambutan Utama</Label>
                  <Input id="hero_title" name="hero_title" value={formData.hero_title} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hero_subtitle">Teks Subtitle / Slogan</Label>
                  <textarea 
                    id="hero_subtitle" 
                    name="hero_subtitle" 
                    value={formData.hero_subtitle} 
                    onChange={handleChange}
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Gambar Banner Belakang</Label>
                <div className="border p-4 rounded-lg bg-gray-50 flex justify-center">
                  <CloudinaryUpload 
                    defaultImage={formData.hero_image_url} 
                    onUploadSuccess={(url) => handleImageUrlChange("hero_image_url", url)}
                    buttonText="Upload Banner"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Profil Yayasan */}
        <Card>
          <CardHeader>
            <CardTitle>Profil & Pimpinan</CardTitle>
            <CardDescription>Atur foto pimpinan, visi, misi, dan sejarah.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-b pb-6">
              <div className="space-y-2 md:col-span-1">
                <Label>Foto Pimpinan (Ketua)</Label>
                <div className="flex justify-center">
                  <CloudinaryUpload 
                    defaultImage={formData.ketua_foto_url} 
                    onUploadSuccess={(url) => handleImageUrlChange("ketua_foto_url", url)}
                    buttonText="Upload Foto"
                    className="w-full max-w-[200px]"
                  />
                </div>
              </div>
              <div className="space-y-4 md:col-span-2">
                <div className="space-y-2">
                  <Label htmlFor="ketua_nama">Nama Pimpinan / Ketua Yayasan</Label>
                  <Input id="ketua_nama" name="ketua_nama" value={formData.ketua_nama} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sejarah">Sejarah Singkat</Label>
                  <textarea 
                    id="sejarah" 
                    name="sejarah" 
                    value={formData.sejarah} 
                    onChange={handleChange}
                    className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="visi">Visi Yayasan</Label>
                <textarea 
                  id="visi" 
                  name="visi" 
                  value={formData.visi} 
                  onChange={handleChange}
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="misi">Misi Yayasan</Label>
                <textarea 
                  id="misi" 
                  name="misi" 
                  value={formData.misi} 
                  onChange={handleChange}
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Kontak & Footer */}
        <Card>
          <CardHeader>
            <CardTitle>Kontak & Footer</CardTitle>
            <CardDescription>Informasi kontak dan sosial media untuk bagian bawah web.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="alamat">Alamat Lengkap</Label>
                <textarea 
                  id="alamat" 
                  name="alamat" 
                  value={formData.alamat} 
                  onChange={handleChange}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kontak">Nomor Telepon / WhatsApp</Label>
                <Input id="kontak" name="kontak" value={formData.kontak} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Resmi</Label>
                <Input id="email" type="email" name="email" value={formData.email} onChange={handleChange} />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="facebook_url">Facebook URL</Label>
                <Input id="facebook_url" name="facebook_url" value={formData.facebook_url} onChange={handleChange} placeholder="https://facebook.com/..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram_url">Instagram URL</Label>
                <Input id="instagram_url" name="instagram_url" value={formData.instagram_url} onChange={handleChange} placeholder="https://instagram.com/..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="youtube_url">YouTube Channel URL</Label>
                <Input id="youtube_url" name="youtube_url" value={formData.youtube_url} onChange={handleChange} placeholder="https://youtube.com/..." />
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
