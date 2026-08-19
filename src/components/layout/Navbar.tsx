import { useState } from "react";
import { Menu, X, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { name: "Beranda", path: "/" },
    { name: "Profil", path: "#profil" },
    { name: "Lembaga", path: "#lembaga" },
    { name: "Berita", path: "#berita" },
    { name: "Agenda", path: "#agenda" },
    { name: "Fasilitas", path: "#fasilitas" },
    { name: "Kontak", path: "#kontak" },
  ];

  return (
    <nav className="fixed w-full bg-white/95 backdrop-blur-md z-50 shadow-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-emerald-500 p-0.5 overflow-hidden flex-shrink-0">
                <img 
                  src="/logo-yayasan.png" 
                  alt="Logo Yayasan" 
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-bold text-[11px] text-gray-500 uppercase tracking-widest">Yayasan</span>
                <span className="font-extrabold text-[15px] text-gray-900 uppercase">Manarul Hikam</span>
              </div>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden lg:flex space-x-6">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.path}
                className="text-gray-600 hover:text-emerald-600 px-3 py-2 text-sm font-semibold transition-colors"
              >
                {link.name}
              </a>
            ))}
          </div>

          {/* Portal Button Desktop */}
          <div className="hidden lg:flex items-center gap-3">
            <Link 
              to="/portal/siswa"
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-bold rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors shadow-sm"
            >
              Portal Siswa
            </Link>
            <Link 
              to="/login"
              className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 transition-all shadow-md hover:shadow-lg"
            >
              Portal Admin
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-600 hover:text-emerald-600 focus:outline-none"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="lg:hidden bg-white border-t border-gray-100 shadow-lg absolute w-full">
          <div className="px-4 pt-2 pb-6 space-y-1 sm:px-6">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.path}
                onClick={() => setIsOpen(false)}
                className="block text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 px-3 py-3 rounded-md text-base font-semibold"
              >
                {link.name}
              </a>
            ))}
            <div className="mt-6 flex flex-col gap-3">
              <Link 
                to="/portal/siswa"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center justify-center px-5 py-3 text-base font-bold rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors shadow-sm"
              >
                Portal Siswa
              </Link>
              <Link 
                to="/login"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center justify-center px-5 py-3 text-base font-semibold rounded-lg text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 transition-all shadow-md"
              >
                Portal Admin
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
