import { MapPin, Phone, Mail, Globe, MessageCircle, Video } from "lucide-react";
import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="bg-emerald-950 text-emerald-100 py-16 border-t border-emerald-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          
          {/* Kolom 1: Profil */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full border-2 border-emerald-500 overflow-hidden flex-shrink-0 bg-white p-0.5">
                <img 
                  src="/logo-yayasan.png" 
                  alt="Logo Yayasan" 
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-bold text-[11px] text-emerald-400 uppercase tracking-widest">Yayasan</span>
                <span className="font-extrabold text-[15px] text-white uppercase">Manarul Hikam</span>
              </div>
            </div>
            <p className="text-sm text-emerald-200 mb-6 leading-relaxed">
              Bersama membangun generasi berilmu, berakhlak mulia, dan berdaya saing global berlandaskan nilai-nilai Islam.
            </p>
            <div className="flex space-x-3">
              <a href="#" className="w-8 h-8 rounded-full bg-white text-emerald-900 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-colors">
                <Globe className="w-4 h-4" />
              </a>
              <a href="#" className="w-8 h-8 rounded-full bg-white text-emerald-900 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-colors">
                <MessageCircle className="w-4 h-4" />
              </a>
              <a href="#" className="w-8 h-8 rounded-full bg-white text-emerald-900 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-colors">
                <Video className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Kolom 2: Tautan Cepat */}
          <div>
            <h3 className="text-white font-bold mb-6 text-lg">Tautan Cepat</h3>
            <ul className="space-y-3 text-sm text-emerald-200">
              <li><a href="/" className="hover:text-emerald-400 transition-colors">Beranda</a></li>
              <li><a href="#profil" className="hover:text-emerald-400 transition-colors">Profil</a></li>
              <li><a href="#lembaga" className="hover:text-emerald-400 transition-colors">Lembaga</a></li>
              <li><a href="#berita" className="hover:text-emerald-400 transition-colors">Berita</a></li>
              <li><a href="#agenda" className="hover:text-emerald-400 transition-colors">Agenda</a></li>
              <li><a href="#fasilitas" className="hover:text-emerald-400 transition-colors">Fasilitas</a></li>
            </ul>
          </div>

          {/* Kolom 3: Lembaga */}
          <div>
            <h3 className="text-white font-bold mb-6 text-lg">Lembaga</h3>
            <ul className="space-y-3 text-sm text-emerald-200">
              <li><Link to="/tk" className="hover:text-emerald-400 transition-colors">TK IT Manarul Hikam</Link></li>
              <li><Link to="/smp" className="hover:text-emerald-400 transition-colors">SMP IT Manarul Hikam</Link></li>
              <li><Link to="/sma" className="hover:text-emerald-400 transition-colors">SMA IT Manarul Hikam</Link></li>
              <li><Link to="/pesantren" className="hover:text-emerald-400 transition-colors">Pondok Pesantren</Link></li>
              <li><Link to="/majlis" className="hover:text-emerald-400 transition-colors">Majlis Ta'lim Manarul Hikam</Link></li>
            </ul>
          </div>

          {/* Kolom 4: Kontak Kami */}
          <div>
            <h3 className="text-white font-bold mb-6 text-lg">Kontak Kami</h3>
            <ul className="space-y-4 text-sm text-emerald-200">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">Jl. Raya Singaparna No. 123, Singaparna, Kabupaten Tasikmalaya, Jawa Barat 46412</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>(0265) 123456</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>info@manarulhikam.sch.id</span>
              </li>
              <li className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>www.manarulhikam.sch.id</span>
              </li>
            </ul>
          </div>

        </div>
        
        <div className="border-t border-emerald-900/50 mt-16 pt-8 text-center text-xs text-emerald-500 font-medium">
          <p>&copy; {new Date().getFullYear()} Yayasan Manarul Hikam. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
