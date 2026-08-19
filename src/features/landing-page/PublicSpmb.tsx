import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Loader2, ArrowLeft, Upload, FileText, CheckCircle2, Download, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PublicSpmb() {
  const { lembagaCode } = useParams<{ lembagaCode: string }>();

  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<any>(null);
  const [fields, setFields] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [docFiles, setDocFiles] = useState<Record<string, File | null>>({});
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<any>(null); // To store success payload (no_pendaftaran, dll)

  useEffect(() => {
    fetchSpmbData();
  }, [lembagaCode]);

  const fetchSpmbData = async () => {
    try {
      setLoading(true);
      // Determine actual db code
      let dbCode = (lembagaCode || "").toUpperCase();
      if (dbCode === "PESANTREN") dbCode = "PONTREN";

      // 1. Get Lembaga
      const { data: lembagaData } = await supabase
        .from('lembaga')
        .select('id, nama')
        .eq('kode', dbCode)
        .single();

      if (!lembagaData) throw new Error("Lembaga tidak ditemukan");

      // 2. Get Config
      const { data: configData } = await supabase
        .from('spmb_config')
        .select('*')
        .eq('lembaga_id', lembagaData.id)
        .eq('aktif', true)
        .single();

      if (!configData) {
        setConfig(null); // Not active or not exists
        return;
      }
      
      configData.lembaga_nama = lembagaData.nama;
      configData.lembaga_kode = dbCode;
      setConfig(configData);

      // 3. Get Fields
      const { data: fieldsData } = await supabase
        .from('spmb_form_fields')
        .select('*')
        .eq('config_id', configData.id)
        .order('urutan', { ascending: true });
      setFields(fieldsData || []);

      // 4. Get Docs
      const { data: docsData } = await supabase
        .from('spmb_required_docs')
        .select('*')
        .eq('config_id', configData.id)
        .order('urutan', { ascending: true });
      setDocs(docsData || []);

      // Setup initial forms
      const initForm: any = {};
      fieldsData?.forEach(f => {
        initForm[f.id] = "";
      });
      setFormData(initForm);

      const initDocs: any = {};
      docsData?.forEach(d => {
        initDocs[d.id] = null;
      });
      setDocFiles(initDocs);

    } catch (err) {
      console.error(err);
      setConfig(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleFileChange = (docId: string, file: File | null) => {
    if (file) {
      // Validasi simpel misal max 2MB
      if (file.size > 2 * 1024 * 1024) {
        alert("Ukuran file maksimal 2MB!");
        return;
      }
    }
    setDocFiles(prev => ({ ...prev, [docId]: file }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // 1. Generate No Pendaftaran
      // Format: SPMB-[KODE]-[TAHUN]-[TIMESTAMP/RANDOM]
      const year = config.tahun_pelajaran.replace('/', '');
      const uniqueNumber = Math.floor(1000 + Math.random() * 9000); 
      const noPendaftaran = `SPMB-${config.lembaga_kode}-${year}-${uniqueNumber}`;

      // 2. Insert Pendaftar
      const { data: pendaftarData, error: pendaftarError } = await supabase
        .from('spmb_pendaftar')
        .insert([{
          config_id: config.id,
          no_pendaftaran: noPendaftaran,
          data_isian: formData
        }])
        .select()
        .single();

      if (pendaftarError) throw pendaftarError;

      // 3. Upload Docs
      for (const doc of docs) {
        const file = docFiles[doc.id];
        if (file) {
          // Upload ke Supabase Storage. Pastikan bucket "spmb-docs" sudah ada (atau pakai bucket yang ada).
          // Untuk amannya dan karena instruksi menggunakan Supabase Storage (kita asumsikan bucket 'documents' atau default)
          const fileExt = file.name.split('.').pop();
          const fileName = `${noPendaftaran}_${doc.id}.${fileExt}`;
          const filePath = `${config.lembaga_kode}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('documents') // asumsikan bucket bernama documents
            .upload(filePath, file);
            
          let fileUrl = "";
          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage.from('documents').getPublicUrl(filePath);
            fileUrl = publicUrlData.publicUrl;
          }

          // Insert ke spmb_pendaftar_dokumen (kalau error upload tetap lanjut tapi url kosong atau diisi error info)
          await supabase.from('spmb_pendaftar_dokumen').insert([{
            pendaftar_id: pendaftarData.id,
            nama_dokumen: doc.nama_dokumen,
            file_url: fileUrl
          }]);
        }
      }

      setSuccessData({
        no_pendaftaran: noPendaftaran,
        nama_program: config.nama_program,
        lembaga_nama: config.lembaga_nama
      });

    } catch (err: any) {
      alert("Terjadi kesalahan: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintPDF = () => {
    // Sederhana menggunakan browser print dialog (bisa dibuat jadi komponen tersendiri untuk styling)
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-sm text-center max-w-md border border-gray-100">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Pendaftaran Ditutup</h2>
          <p className="text-gray-500 mb-6">Mohon maaf, pendaftaran untuk unit {lembagaCode?.toUpperCase()} saat ini sedang tidak aktif atau belum dibuka.</p>
          <Link to="/">
            <Button variant="outline" className="rounded-xl">Kembali ke Beranda</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (successData) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          {/* Card Bukti Pendaftaran - Printable Area */}
          <Card id="bukti-pendaftaran" className="border-0 shadow-lg rounded-3xl overflow-hidden bg-white mb-6 print:shadow-none print:border print:border-gray-200">
            <div className="bg-emerald-600 h-3 w-full"></div>
            <CardContent className="p-8 md:p-12 text-center">
              <CheckCircle2 className="w-20 h-20 text-emerald-500 mx-auto mb-6 print:text-gray-800" />
              <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2 uppercase">PENDAFTARAN BERHASIL</h1>
              <p className="text-gray-500 mb-8">{successData.nama_program} - {successData.lembaga_nama}</p>
              
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 inline-block w-full max-w-sm mx-auto">
                <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">Nomor Registrasi</p>
                <p className="text-2xl font-black text-emerald-700 font-mono tracking-wider">{successData.no_pendaftaran}</p>
              </div>

              <div className="mt-10 text-sm text-gray-500 leading-relaxed max-w-md mx-auto print:text-xs">
                Terima kasih telah mendaftar. Silakan simpan nomor registrasi ini atau unduh bukti pendaftaran sebagai tanda bukti yang sah. Informasi seleksi selanjutnya akan dihubungi oleh panitia.
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons (Not visible in print) */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center print:hidden">
            <Button onClick={handlePrintPDF} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm h-12 px-8">
              <Download className="w-5 h-5 mr-2" /> Unduh Bukti (PDF)
            </Button>
            <Link to="/">
              <Button variant="outline" className="w-full sm:w-auto rounded-xl border-gray-300 text-gray-700 h-12 px-8">
                Kembali ke Beranda
              </Button>
            </Link>
          </div>
        </div>

        {/* Global style for printing */}
        <style>{`
          @media print {
            body { background: white; }
            nav, footer, .print\\:hidden { display: none !important; }
            #bukti-pendaftaran { box-shadow: none !important; margin: 0; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center text-sm font-semibold text-emerald-600 hover:text-emerald-700 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Beranda
        </Link>
        
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black tracking-tight text-gray-900 mb-2">{config.nama_program}</h1>
          <p className="text-lg text-emerald-700 font-medium">{config.lembaga_nama} - Tahun Pelajaran {config.tahun_pelajaran}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* IDENTITAS */}
          <Card className="border-0 shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="bg-white border-b pb-4">
              <CardTitle className="text-xl">Formulir Pendaftaran</CardTitle>
              <CardDescription>Mohon isi data dengan benar dan valid sesuai dokumen resmi.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 md:p-8 space-y-6">
              {fields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">
                    {field.label} {field.wajib && <span className="text-red-500">*</span>}
                  </Label>
                  
                  {field.tipe_field === 'textarea' ? (
                    <textarea 
                      required={field.wajib}
                      className="w-full min-h-[100px] p-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white transition-colors"
                      value={formData[field.id] || ''}
                      onChange={e => handleFieldChange(field.id, e.target.value)}
                    />
                  ) : field.tipe_field === 'select' ? (
                    <select
                      required={field.wajib}
                      className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white transition-colors"
                      value={formData[field.id] || ''}
                      onChange={e => handleFieldChange(field.id, e.target.value)}
                    >
                      <option value="" disabled>Pilih {field.label}</option>
                      {(field.options || []).map((opt: string) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <Input 
                      type={field.tipe_field === 'date' ? 'date' : field.tipe_field === 'number' ? 'number' : 'text'}
                      required={field.wajib}
                      className="h-11 rounded-xl bg-gray-50 focus:bg-white"
                      value={formData[field.id] || ''}
                      onChange={e => handleFieldChange(field.id, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* DOKUMEN (If any) */}
          {docs.length > 0 && (
            <Card className="border-0 shadow-sm rounded-3xl overflow-hidden">
              <CardHeader className="bg-white border-b pb-4">
                <CardTitle className="text-xl">Unggah Dokumen</CardTitle>
                <CardDescription>Siapkan *scan* atau foto dokumen dengan ukuran maksimal 2MB per file.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 md:p-8 space-y-6">
                {docs.map((doc) => (
                  <div key={doc.id} className="space-y-2 p-4 border border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                    <Label className="text-sm font-semibold text-gray-700 flex items-center justify-between">
                      <span>{doc.nama_dokumen} {doc.wajib && <span className="text-red-500">*</span>}</span>
                      {docFiles[doc.id] && <span className="text-xs text-emerald-600 flex items-center"><CheckCircle2 className="w-3 h-3 mr-1" /> Terlampir</span>}
                    </Label>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="relative flex-1">
                        <input 
                          type="file" 
                          required={doc.wajib}
                          onChange={(e) => handleFileChange(doc.id, e.target.files ? e.target.files[0] : null)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
                            <Upload className="w-5 h-5" />
                          </div>
                          <div className="truncate text-sm text-gray-500">
                            {docFiles[doc.id] ? docFiles[doc.id]?.name : "Klik untuk memilih file..."}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* SUBMIT */}
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-14 text-lg font-bold shadow-lg shadow-emerald-600/20"
          >
            {isSubmitting ? (
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
            ) : (
              <FileText className="w-5 h-5 mr-2" />
            )}
            {isSubmitting ? "Memproses Pendaftaran..." : "Kirim Formulir Pendaftaran"}
          </Button>

        </form>
      </div>
    </div>
  );
}
