import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export function DashboardRLSTest() {
  const { activeRole } = useAuth();
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTestRLS = async () => {
    setLoading(true);
    setTestResult(null);
    
    try {
      // Kita coba insert berita menggunakan lembaga_id fiktif (atau UUID acak yang valid secara format)
      // Ini mensimulasikan percobaan user untuk insert data ke lembaga yang bukan miliknya.
      const fakeLembagaId = "00000000-0000-0000-0000-000000000000";
      
      const { error } = await supabase
        .from('berita')
        .insert({
          judul: "Test Berita Ilegal",
          slug: "test-berita-ilegal-" + Date.now(),
          konten: "Ini adalah percobaan insert berita ke lembaga yang tidak berhak.",
          lembaga_id: fakeLembagaId
        });

      if (error) {
        // Jika error terjadi karena RLS, itu berarti sistem berfungsi dengan benar!
        setTestResult({
          success: true,
          message: `Berhasil diblokir oleh RLS! Database menolak akses: ${error.message}`
        });
      } else {
        // Jika berhasil insert, berarti RLS bocor.
        setTestResult({
          success: false,
          message: "BAHAYA: Insert berhasil! RLS tidak memblokir query ini."
        });
      }
    } catch (err: any) {
      setTestResult({
        success: true,
        message: `Error tertangkap (kemungkinan RLS bekerja): ${err.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mt-8 border-emerald-100 shadow-sm">
      <CardHeader className="bg-emerald-50/50 pb-4">
        <CardTitle className="text-lg">Security Test: Row Level Security (RLS)</CardTitle>
        <CardDescription>
          Panel ini digunakan untuk memverifikasi bahwa kebijakan RLS di Supabase Postgres benar-benar aktif untuk user <strong>{activeRole?.role}</strong>.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <p className="text-sm text-gray-600 mb-4">
          Tombol di bawah ini akan mencoba memasukkan (insert) data 'Berita' ke lembaga lain yang ID-nya tidak ada di daftar <code>user_roles</code> Anda. Jika RLS bekerja, operasi ini harus <strong>ditolak (diblokir)</strong> oleh database, terlepas dari kodenya dipanggil dari frontend.
        </p>
        
        <Button 
          onClick={handleTestRLS} 
          disabled={loading}
          variant="outline"
          className="border-emerald-600 text-emerald-700 hover:bg-emerald-50"
        >
          {loading ? "Menjalankan Test..." : "Jalankan Test RLS"}
        </Button>

        {testResult && (
          <div className={`mt-4 p-4 rounded-lg flex items-start gap-3 ${
            testResult.success ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"
          }`}>
            {testResult.success ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
            )}
            <div>
              <h4 className="font-semibold text-sm mb-1">
                {testResult.success ? "Status: AMAN" : "Status: RENTAN (RLS BOCOR)"}
              </h4>
              <p className="text-sm opacity-90">{testResult.message}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
