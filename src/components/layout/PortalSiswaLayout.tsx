import { Outlet, Link } from "react-router-dom";
import { GraduationCap, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PortalSiswaLayout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-emerald-700 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-emerald-100" />
            <div>
              <h1 className="font-bold text-lg leading-tight">Portal Keuangan Siswa</h1>
              <p className="text-xs text-emerald-200">Yayasan Manarul Hikam</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" className="text-emerald-50 hover:bg-emerald-600 hover:text-white">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kembali ke Beranda
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t py-6 text-center text-sm text-gray-500">
        &copy; {new Date().getFullYear()} Sistem Keuangan Terpadu - Yayasan Manarul Hikam
      </footer>
    </div>
  );
}
