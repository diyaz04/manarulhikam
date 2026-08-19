import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Save, User, Lock, AlertCircle, CheckCircle2, Camera } from "lucide-react";

export function DashboardPengaturanAkun() {
  const { user, activeRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Profile State
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  // Password State
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [pwdMessage, setPwdMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      if (data) {
        setFullName(data.full_name || "");
        setAvatarUrl(data.avatar_url || "");
      }
    } catch (err) {
      console.error("Error fetching profile", err);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      setLoading(true);
      setMessage(null);
      const { error } = await supabase
        .from('users')
        .update({ full_name: fullName, avatar_url: avatarUrl })
        .eq('id', user.id);

      if (error) throw error;
      
      // Attempt to sync name based on active role
      if (activeRole) {
        if (activeRole.role === 'GURU' || activeRole.role === 'UNIT_ADMIN' || activeRole.role === 'ADMIN_YAYASAN') {
          // Both Teachers and Admins have records in 'teachers' if they were created there. 
          // Or just standard best effort update.
          await supabase.from('teachers').update({ nama: fullName }).eq('user_id', user.id);
        } else if (activeRole.role === 'SISWA') {
          await supabase.from('students').update({ nama_lengkap: fullName }).eq('user_id', user.id);
        } else if (activeRole.role === 'ALUMNI') {
          await supabase.from('alumni').update({ nama_lengkap: fullName }).eq('user_id', user.id);
        }
      }

      setMessage({ type: 'success', text: 'Profil berhasil diperbarui.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Gagal memperbarui profil.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) {
      setPwdMessage({ type: 'error', text: 'Tidak dapat menemukan email pengguna.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwdMessage({ type: 'error', text: 'Konfirmasi password baru tidak cocok.' });
      return;
    }

    if (newPassword.length < 6) {
      setPwdMessage({ type: 'error', text: 'Password baru minimal 6 karakter.' });
      return;
    }

    try {
      setIsChangingPassword(true);
      setPwdMessage(null);

      // Verify old password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: oldPassword,
      });

      if (signInError) {
        setPwdMessage({ type: 'error', text: 'Password lama salah.' });
        return;
      }

      // If successful, update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        throw updateError;
      }

      setPwdMessage({ type: 'success', text: 'Password berhasil diubah.' });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPwdMessage({ type: 'error', text: err.message || 'Gagal mengubah password.' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // For this prototype, use object URL
    const objectUrl = URL.createObjectURL(file);
    setAvatarUrl(objectUrl);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Pengaturan Akun</h2>
        <p className="text-gray-500 text-sm mt-1">
          Kelola informasi profil dan keamanan akun Anda.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="shadow-sm rounded-2xl border-gray-100">
          <CardHeader className="border-b bg-gray-50/50 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-600" />
              Profil Pengguna
            </CardTitle>
            <CardDescription>Ubah nama dan foto profil Anda.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              {message && (
                <div className={`p-3 rounded-lg flex items-start gap-2 border ${message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                  {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
                  <p className="text-sm">{message.text}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Foto Profil</Label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <Input type="file" accept="image/*" id="avatar-upload" className="hidden" onChange={handlePhotoUpload} />
                    <Label htmlFor="avatar-upload" className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 cursor-pointer">
                      <Camera className="w-4 h-4 mr-2" />
                      Pilih Foto
                    </Label>
                    <p className="text-xs text-gray-500 mt-2">Pilih gambar untuk profil Anda.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nama Lengkap</Label>
                <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>

              <Button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700">
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : <><Save className="w-4 h-4 mr-2" /> Simpan Profil</>}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-2xl border-gray-100">
          <CardHeader className="border-b bg-gray-50/50 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lock className="w-5 h-5 text-blue-600" />
              Keamanan Akun
            </CardTitle>
            <CardDescription>Ganti password untuk mengamankan akun Anda.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleChangePassword} className="space-y-4">
              {pwdMessage && (
                <div className={`p-3 rounded-lg flex items-start gap-2 border ${pwdMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                  {pwdMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
                  <p className="text-sm">{pwdMessage.text}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="oldPwd">Password Lama</Label>
                <Input id="oldPwd" type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required placeholder="Masukkan password lama" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPwd">Password Baru</Label>
                <Input id="newPwd" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required placeholder="Minimal 6 karakter" minLength={6} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPwd">Konfirmasi Password Baru</Label>
                <Input id="confirmPwd" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required placeholder="Ketik ulang password baru" minLength={6} />
              </div>

              <Button type="submit" disabled={isChangingPassword} className="w-full bg-blue-600 hover:bg-blue-700">
                {isChangingPassword ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Mengganti...</> : <><Lock className="w-4 h-4 mr-2" /> Ganti Password</>}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
