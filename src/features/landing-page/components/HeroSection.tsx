import { ArrowRight, BookOpen, Users, Globe } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative pt-24 overflow-hidden bg-white">
      {/* Background Dot Pattern (Top Right) */}
      <div className="absolute top-20 right-4 lg:right-10 p-4 opacity-50 z-0 hidden sm:block">
        <div className="grid grid-cols-4 gap-3">
          {[...Array(32)].map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-500/60"></div>
          ))}
        </div>
      </div>
      
      {/* Mobile Dot Pattern */}
      <div className="absolute top-16 right-0 p-4 opacity-70 z-0 sm:hidden">
        <div className="grid grid-cols-3 gap-2.5">
          {[...Array(21)].map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 sm:px-8 relative z-10 pt-4 lg:pt-12">
        <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
          
          {/* Text Content (Left on Desktop, Top on Mobile) */}
          <div className="w-full lg:w-1/2 flex flex-col justify-center text-left relative z-10">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50/80 mb-6 w-fit border border-emerald-100">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span className="text-sm font-medium text-emerald-700">Selamat Datang di</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1] mb-1">
              Sistem Terpadu
            </h1>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-emerald-600 tracking-tight leading-[1.1] mb-6">
              Yayasan<br/>Manarul Hikam
            </h1>
            
            {/* Decorative Line */}
            <div className="w-12 h-1 bg-emerald-500 mb-6 rounded-full"></div>

            {/* Subtitle */}
            <p className="text-base md:text-lg text-gray-500 mb-8 max-w-sm lg:max-w-lg leading-relaxed font-medium">
              Membangun generasi berilmu, berakhlak mulia, dan berdaya saing global berlandaskan nilai-nilai Islam.
            </p>
            
            {/* Buttons */}
            <div className="flex flex-row flex-wrap items-center gap-4">
              <a 
                href="#lembaga"
                className="inline-flex items-center justify-center px-5 py-3 text-sm font-semibold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-[0_8px_20px_-6px_rgba(5,150,105,0.4)]"
              >
                Jelajahi Lembaga
                <ArrowRight className="ml-1.5 w-4 h-4" />
              </a>
              <a 
                href="#profil"
                className="inline-flex items-center justify-center px-5 py-3 text-sm font-semibold rounded-xl text-slate-800 bg-white border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-colors shadow-sm"
              >
                Tentang Kami
                <ArrowRight className="ml-1.5 w-4 h-4 text-slate-400" />
              </a>
            </div>
          </div>

          {/* Image Content - DESKTOP ONLY */}
          <div className="hidden lg:block w-full lg:w-1/2 relative mt-12 lg:mt-0">
            {/* Round Logo Overlapping */}
            <div className="absolute -top-12 -left-12 z-30">
              <div className="w-32 h-32 rounded-full bg-white p-1.5 shadow-2xl flex items-center justify-center overflow-hidden border-4 border-emerald-600">
                 <img 
                  src="/logo-yayasan.png" 
                  alt="Logo Yayasan" 
                  className="w-full h-full object-contain rounded-full bg-white p-2"
                />
              </div>
            </div>

            {/* Main Building Image */}
            <div className="relative rounded-[2rem] overflow-hidden shadow-[0_20px_50px_-12px_rgba(5,150,105,0.3)] aspect-[4/3] border-4 border-white">
              <img 
                src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=1200&auto=format&fit=crop" 
                alt="Graduation" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Image & Bottom Section - MOBILE ONLY */}
      <div className="relative mt-12 w-full flex flex-col lg:hidden">
        {/* Custom SVG Curve overlaying the image top */}
        <div className="absolute top-0 left-0 w-full overflow-hidden leading-none z-10 h-16 sm:h-24 -translate-y-[1px]">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-full relative block">
            <path d="M0,120 C300,120 400,0 1200,0 L1200,0 L0,0 Z" fill="#ffffff"></path>
          </svg>
        </div>

        {/* Round Logo Overlapping */}
        <div className="absolute top-12 sm:top-16 left-8 sm:left-16 z-30">
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-white p-1.5 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.4)] flex items-center justify-center overflow-hidden border-4 border-emerald-600">
             <img 
              src="/logo-yayasan.png" 
              alt="Logo Yayasan" 
              className="w-full h-full object-contain rounded-full bg-white p-2"
            />
          </div>
        </div>

        {/* Image Area */}
        <div className="relative w-full" style={{ height: '400px' }}>
          <img 
            src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=1200&auto=format&fit=crop" 
            alt="Graduation" 
            className="w-full h-full object-cover object-center"
          />
        </div>

        {/* Custom SVG Curve for the bottom transitioning to dark green */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none z-10 translate-y-[1px]">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-24 sm:h-32 relative block rotate-180">
            <path d="M0,120 C400,120 600,0 1200,0 L1200,0 L0,0 Z" fill="#047857"></path>
          </svg>
        </div>
      </div>

      {/* Dark Green Bottom Area & Floating Card */}
      <div className="relative bg-emerald-700 pt-8 pb-12 px-4 sm:px-6 lg:px-8 flex justify-center z-20 mt-0 lg:mt-24 lg:rounded-t-[3rem]">
        
        {/* Floating Info Card */}
        <div className="w-full max-w-5xl bg-white rounded-3xl p-6 sm:p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] relative -mt-16 sm:-mt-24 lg:-mt-32 grid grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          
          {/* Feature 1 */}
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-xs sm:text-sm mb-1">Berilmu</h3>
              <p className="text-[10px] sm:text-xs text-gray-500 leading-relaxed">Ilmu sebagai penerang kehidupan</p>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-xs sm:text-sm mb-1">Berakhlak Mulia</h3>
              <p className="text-[10px] sm:text-xs text-gray-500 leading-relaxed">Akhlak sebagai landasan utama</p>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="flex flex-col sm:flex-row items-start gap-4 col-span-2 lg:col-span-1">
            <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-xs sm:text-sm mb-1">Berdaya Saing Global</h3>
              <p className="text-[10px] sm:text-xs text-gray-500 leading-relaxed">Siap menghadapi tantangan dunia</p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
