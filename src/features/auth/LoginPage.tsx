import { useState } from "react";
import { useNavigate, Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();

  const from = location.state?.from?.pathname || "/dashboard";

  // Redirect to destination if already logged in
  if (session) {
    return <Navigate to={from} replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }
      
      // onAuthStateChange in AuthContext will handle state update
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || "Gagal masuk. Periksa kembali email dan kata sandi Anda.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50/50 p-4">
      <div className="w-full max-w-md">
        
        <Link to="/" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-emerald-600 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Kembali ke Beranda
        </Link>
        
        <Card className="w-full shadow-lg border-0 bg-white">
          <CardHeader className="space-y-1 pb-6 text-center">
            <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <img 
                src="/logo-yayasan.png" 
                alt="Logo" 
                className="w-12 h-12 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://ui-avatars.com/api/?name=MH&background=10b981&color=fff";
                }}
              />
            </div>
            <CardTitle className="text-2xl font-bold">Portal Terpadu</CardTitle>
            <CardDescription className="text-gray-500">
              Masuk ke sistem manajemen Yayasan Manarul Hikam
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm flex items-start gap-3 mb-6">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="admin@manarulhikam.sch.id" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="focus-visible:ring-emerald-500"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Kata Sandi</Label>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="focus-visible:ring-emerald-500"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" 
                disabled={loading}
              >
                {loading ? "Memproses..." : "Masuk"}
              </Button>
            </form>
          </CardContent>
          
          <CardFooter className="flex flex-col border-t px-6 py-4">
            <p className="text-xs text-center text-gray-500">
              Sistem ini dibatasi hanya untuk pengurus dan staf yang berwenang. Hubungi Administrator jika Anda tidak memiliki akses.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
