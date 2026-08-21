import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { formatNamaLembaga } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { CloudinaryUpload } from "@/components/common/CloudinaryUpload";
import { Loader2, Save, CheckCircle2 } from "lucide-react";

interface Lembaga {
  id: string;
  nama: string;
  kode: string;
  deskripsi: string;
  gambar_url: string;
  logo_url: string;
  slug: string;
}

export function DashboardYayasanLembaga() {
  const [lembagaList, setLembagaList] = useState<Lembaga[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  useEffect(() => {
    fetchLembaga();
  }, []);

  const fetchLembaga = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('lembaga')
        .select('*')
        .neq('kode', 'YAYASAN')
        .order('nama');

      if (error) throw error;
      setLembagaList(data || []);
    } catch (error) {
      console.error("Error fetching lembaga:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateField = (id: string, field: keyof Lembaga, value: string) => {
    setLembagaList(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
    setSuccessId(null);
  };

  const handleSave = async (lembaga: Lembaga) => {
    setSavingId(lembaga.id);
    setSuccessId(null);

    try {
      const { error } = await supabase
        .from('lembaga')
        .update({
          deskripsi: lembaga.deskripsi,
          gambar_url: lembaga.gambar_url,
          logo_url: lembaga.logo_url,
          slug: lembaga.slug,
        })
        .eq('id', lembaga.id);

      if (error) throw error;
      
      setSuccessId(lembaga.id);
      setTimeout(() => setSuccessId(null), 3000);
    } catch (error: any) {
      console.error("Error saving lembaga:", error);
      alert("Gagal menyimpan: " + error.message);
    } finally {
      setSavingId(null);
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
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Manajemen Unit Lembaga</h2>
        <p className="text-muted-foreground">
          Atur foto sampul, logo, dan deskripsi singkat untuk masing-masing lembaga (tampil di section "Lembaga di Bawah Yayasan").
        </p>
      </div>

      <div className="space-y-8">
        {lembagaList.map((lembaga) => (
          <Card key={lembaga.id} className="overflow-hidden border-emerald-100">
            <CardHeader className="bg-gray-50 border-b">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg text-emerald-900">{formatNamaLembaga(lembaga.nama)}</CardTitle>
                  <CardDescription>Kode Unit: {lembaga.kode}</CardDescription>
                </div>
                {successId === lembaga.id && (
                  <span className="flex items-center text-sm text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Tersimpan
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Kiri: Deskripsi & Slug */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`deskripsi-${lembaga.id}`}>Deskripsi Singkat</Label>
                    <textarea 
                      id={`deskripsi-${lembaga.id}`}
                      value={lembaga.deskripsi || ""} 
                      onChange={(e) => handleUpdateField(lembaga.id, "deskripsi", e.target.value)}
                      className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                      placeholder={`Deskripsi untuk ${formatNamaLembaga(lembaga.nama)}...`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`slug-${lembaga.id}`}>Path URL (opsional)</Label>
                    <div className="flex rounded-md shadow-sm">
                      <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
                        /
                      </span>
                      <Input 
                        id={`slug-${lembaga.id}`}
                        value={lembaga.slug || ""} 
                        onChange={(e) => handleUpdateField(lembaga.id, "slug", e.target.value)}
                        className="rounded-l-none"
                        placeholder={lembaga.kode.toLowerCase()}
                      />
                    </div>
                  </div>
                </div>

                {/* Kanan: Gambar & Logo */}
                <div className="lg:col-span-5 space-y-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Foto Latar Belakang (Sampul)</Label>
                    <div className="border p-2 rounded-lg bg-gray-50 flex justify-center">
                      <CloudinaryUpload 
                        defaultImage={lembaga.gambar_url} 
                        onUploadSuccess={(url) => handleUpdateField(lembaga.id, "gambar_url", url)}
                        buttonText="Upload Foto"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Logo Bulat</Label>
                    <div className="border p-2 rounded-lg bg-gray-50 flex justify-center">
                      <CloudinaryUpload 
                        defaultImage={lembaga.logo_url} 
                        onUploadSuccess={(url) => handleUpdateField(lembaga.id, "logo_url", url)}
                        buttonText="Upload Logo"
                        className="scale-90"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-gray-50 border-t justify-end">
              <Button 
                onClick={() => handleSave(lembaga)} 
                disabled={savingId === lembaga.id}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {savingId === lembaga.id ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Simpan {lembaga.kode}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
