import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, CheckCircle2, Loader2, RefreshCcw, AlertTriangle, Paperclip, FileText } from "lucide-react";
import { compressImage } from "@/lib/imageCompression";

export function DashboardGuruKedatangan() {
  const { user, activeRole } = useAuth();
  const [teacher, setTeacher] = useState<any>(null);
  
  const [status, setStatus] = useState<string>("HADIR");
  const [keterangan, setKeterangan] = useState("");
  const [tugasKeterangan, setTugasKeterangan] = useState("");
  const [tugasFile, setTugasFile] = useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fotoBlob, setFotoBlob] = useState<Blob | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);

  const [hasSubmittedToday, setHasSubmittedToday] = useState(false);
  const [submissionData, setSubmissionData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user && activeRole?.lembaga_id) {
      checkTodaySubmission();
    }
    return () => stopCamera();
  }, [user, activeRole]);

  const checkTodaySubmission = async () => {
    try {
      setIsLoading(true);
      const { data: tData } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', user!.id)
        .eq('lembaga_id', activeRole!.lembaga_id)
        .single();
      
      setTeacher(tData);

      if (tData) {
        const todayStr = new Date().toISOString().split('T')[0];
        const { data: aData } = await supabase
          .from('absensi_kedatangan_guru')
          .select('*')
          .eq('guru_id', tData.id)
          .eq('tanggal', todayStr)
          .single();
          
        if (aData) {
          setHasSubmittedToday(true);
          setSubmissionData(aData);
        } else {
          startCamera();
        }
      }
    } catch (err) {
      console.error(err);
      startCamera();
    } finally {
      setIsLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      if (cameraStream) return;
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access denied", err);
      alert("Tidak dapat mengakses kamera. Pastikan Anda telah memberikan izin.");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        if (blob) {
          setFotoBlob(blob);
          setFotoUrl(URL.createObjectURL(blob));
          stopCamera();
        }
      }, 'image/jpeg', 0.8);
    }
  };

  const retakePhoto = () => {
    setFotoBlob(null);
    setFotoUrl(null);
    startCamera();
  };

  const handleSubmit = async () => {
    if (!fotoBlob) {
      alert("Harap ambil foto kedatangan Anda!");
      return;
    }
    if ((status === 'IZIN' || status === 'SAKIT') && !keterangan.trim()) {
      alert("Harap isi keterangan untuk pengajuan Izin/Sakit.");
      return;
    }
    if (!teacher?.id || !activeRole?.lembaga_id) return;

    setIsSubmitting(true);
    try {
      // 1. Upload Selfie
      const compressedBlob = await compressImage(fotoBlob);
      const fileSelfie = new File([compressedBlob], `absen_${teacher.id}_${Date.now()}.jpg`, { type: 'image/jpeg' });

      const formDataSelfie = new FormData();
      formDataSelfie.append('file', fileSelfie);
      formDataSelfie.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

      const resSelfie = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formDataSelfie
      });
      const dataSelfie = await resSelfie.json();
      if (!resSelfie.ok) throw new Error(dataSelfie.error?.message || "Upload selfie gagal");

      const fotoUrlFinal = dataSelfie.secure_url;

      // 2. Upload Tugas File if exists
      let tugasUrlFinal = null;
      if (tugasFile && (status === 'IZIN' || status === 'SAKIT')) {
        const formDataTugas = new FormData();
        formDataTugas.append('file', tugasFile);
        formDataTugas.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

        const resTugas = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/auto/upload`, {
          method: 'POST',
          body: formDataTugas
        });
        const dataTugas = await resTugas.json();
        if (resTugas.ok) {
           tugasUrlFinal = dataTugas.secure_url;
        } else {
           throw new Error(dataTugas.error?.message || "Upload file tugas gagal");
        }
      }

      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:00`;

      // 3. Insert DB
      const payload: any = {
        lembaga_id: activeRole.lembaga_id,
        guru_id: teacher.id,
        tanggal: now.toISOString().split('T')[0],
        waktu_absen: timeStr,
        status: status,
        keterangan: keterangan,
        foto_url: fotoUrlFinal,
        status_verifikasi: 'PENDING'
      };

      if (status === 'IZIN' || status === 'SAKIT') {
        payload.tugas_keterangan = tugasKeterangan;
        payload.tugas_file_url = tugasUrlFinal;
      }

      const { error } = await supabase
        .from('absensi_kedatangan_guru')
        .insert([payload]);

      if (error) throw error;
      
      alert("Absen berhasil dikirim!");
      checkTodaySubmission();

    } catch (err: any) {
      console.error(err);
      alert("Gagal menyimpan absen: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center">Memuat...</div>;

  if (hasSubmittedToday && submissionData) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="border-emerald-100 shadow-sm bg-emerald-50/50">
          <CardContent className="p-8 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-emerald-900 mb-2">Anda Sudah Absen Hari Ini</h2>
            <p className="text-gray-600 mb-6">Absensi kedatangan Anda untuk tanggal {new Intl.DateTimeFormat('id-ID', { dateStyle: 'full' }).format(new Date(submissionData.tanggal))} telah tercatat.</p>
            
            <div className="w-full bg-white rounded-2xl border border-gray-100 p-6 flex flex-col sm:flex-row items-start gap-6 text-left shadow-sm">
              <div className="w-32 h-32 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-gray-200">
                <img src={submissionData.foto_url} alt="Selfie Absen" className="w-full h-full object-cover" />
              </div>
              <div className="space-y-3 flex-1 w-full overflow-hidden">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase">Waktu Absen</p>
                    <p className="text-lg font-black text-gray-900">{submissionData.waktu_absen}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase">Status Kehadiran</p>
                    <p className={`font-bold ${submissionData.status === 'HADIR' ? 'text-emerald-600' : 'text-orange-600'}`}>{submissionData.status}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase">Status Verifikasi Admin</p>
                  <p className={`font-bold ${submissionData.status_verifikasi === 'PENDING' ? 'text-amber-500' : submissionData.status_verifikasi === 'VERIFIED' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {submissionData.status_verifikasi}
                  </p>
                </div>

                {submissionData.keterangan && (
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase">Keterangan Izin/Sakit</p>
                    <p className="text-sm text-gray-700">{submissionData.keterangan}</p>
                  </div>
                )}
                
                {(submissionData.tugas_keterangan || submissionData.tugas_file_url) && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1"><FileText className="w-3 h-3" /> Detail Tugas yang Ditinggalkan</p>
                    {submissionData.tugas_keterangan && (
                      <p className="text-sm text-gray-700 mb-2">{submissionData.tugas_keterangan}</p>
                    )}
                    {submissionData.tugas_file_url && (
                      <a 
                        href={submissionData.tugas_file_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100"
                      >
                        <Paperclip className="w-4 h-4" /> Lihat / Unduh File Tugas
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="border-gray-100 shadow-sm">
        <CardHeader className="bg-emerald-50/50 border-b border-gray-100 pb-6">
          <CardTitle className="text-xl font-bold flex items-center gap-2 text-emerald-900">
            <Camera className="w-6 h-6 text-emerald-600" />
            Absen Kedatangan Hari Ini
          </CardTitle>
          <CardDescription>
            Silakan ambil swafoto (selfie) dan pilih status kehadiran Anda untuk hari ini.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          
          <div className="space-y-3">
            <Label className="text-gray-900 font-bold">Status Kehadiran</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-12 bg-gray-50/50">
                <SelectValue placeholder="Pilih status kehadiran" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HADIR">Hadir / Tepat Waktu / Terlambat</SelectItem>
                <SelectItem value="IZIN">Izin</SelectItem>
                <SelectItem value="SAKIT">Sakit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(status === 'IZIN' || status === 'SAKIT') && (
            <div className="space-y-5 p-5 bg-orange-50/50 border border-orange-100 rounded-xl">
              <div className="space-y-3">
                <Label className="text-gray-900 font-bold flex items-center gap-2">
                  Keterangan Izin / Sakit
                  <span className="text-xs font-normal text-red-500">*Wajib diisi</span>
                </Label>
                <Textarea 
                  placeholder="Jelaskan alasan izin / sakit..." 
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  className="bg-white resize-none h-20"
                />
              </div>
              
              <div className="space-y-3 pt-4 border-t border-orange-200/50">
                <Label className="text-gray-900 font-bold flex items-center gap-2">
                  Tugas Pengganti <span className="text-xs font-normal text-gray-500">(Opsional)</span>
                </Label>
                <p className="text-xs text-gray-600 mb-2">Tinggalkan tugas untuk siswa yang bisa dipantau/disampaikan oleh guru piket atau admin.</p>
                <Textarea 
                  placeholder="Deskripsi tugas yang harus dikerjakan siswa..." 
                  value={tugasKeterangan}
                  onChange={(e) => setTugasKeterangan(e.target.value)}
                  className="bg-white resize-none h-20 mb-3"
                />
                
                <Label className="text-sm font-semibold text-gray-700 block">Lampirkan File/Materi Tugas</Label>
                <Input 
                  type="file" 
                  onChange={(e) => setTugasFile(e.target.files?.[0] || null)}
                  className="bg-white"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.png"
                />
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Label className="text-gray-900 font-bold">Bukti Foto / Selfie</Label>
            
            <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden relative shadow-inner">
              {!fotoUrl ? (
                <>
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover scale-x-[-1]" 
                  />
                  <div className="absolute inset-0 border-[6px] border-emerald-500/30 rounded-2xl pointer-events-none"></div>
                </>
              ) : (
                <img src={fotoUrl} alt="Preview" className="w-full h-full object-cover" />
              )}
            </div>
            
            <div className="flex justify-center mt-4">
              {!fotoUrl ? (
                <Button type="button" onClick={takePhoto} className="rounded-full w-16 h-16 bg-emerald-600 hover:bg-emerald-700 shadow-lg border-4 border-emerald-100 text-white p-0 flex items-center justify-center">
                  <Camera className="w-6 h-6" />
                </Button>
              ) : (
                <Button type="button" variant="outline" onClick={retakePhoto} className="gap-2 rounded-xl">
                  <RefreshCcw className="w-4 h-4" /> Ambil Ulang Foto
                </Button>
              )}
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="pt-4 border-t border-gray-100">
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || !fotoBlob}
              className="w-full h-14 text-base font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSubmitting ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Menyimpan...</>
              ) : (
                "Kirim Absensi Kedatangan"
              )}
            </Button>
            {status !== 'HADIR' && (
              <p className="text-xs text-center text-amber-600 mt-3 font-medium flex items-center justify-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Pengajuan {status.toLowerCase()} memerlukan verifikasi admin.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
