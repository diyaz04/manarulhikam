import { ArrowRight } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative pt-32 pb-16 lg:pt-40 lg:pb-24 overflow-hidden bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-8">
          
          {/* Left Text Content */}
          <div className="w-full lg:w-1/2 flex flex-col justify-center text-center lg:text-left z-10 pt-8 lg:pt-0">
            <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent mb-2">
              Selamat Datang di
            </h2>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight leading-[1.1] mb-2">
              Sistem Terpadu
            </h1>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent tracking-tight leading-[1.1] mb-6 pb-2">
              Yayasan Manarul Hikam
            </h1>
            <p className="text-lg text-gray-600 mb-10 max-w-lg mx-auto lg:mx-0">
              Membangun generasi berilmu, berakhlak mulia, dan berdaya saing global berlandaskan nilai-nilai Islam.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <a 
                href="#lembaga"
                className="inline-flex w-full sm:w-auto items-center justify-center px-8 py-3.5 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 transition-all shadow-md hover:shadow-lg"
              >
                Jelajahi Lembaga
                <ArrowRight className="ml-2 w-4 h-4" />
              </a>
              <a 
                href="#profil"
                className="inline-flex w-full sm:w-auto items-center justify-center px-8 py-3.5 text-sm font-semibold rounded-lg text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"
              >
                Tentang Kami
              </a>
            </div>
          </div>

          {/* Right Image Content */}
          <div className="w-full lg:w-1/2 relative mt-12 lg:mt-0">
            {/* Round Logo Overlapping */}
            <div className="absolute -top-12 lg:-top-16 left-1/2 transform -translate-x-1/2 lg:translate-x-0 lg:-left-12 z-20">
              <div className="w-32 h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 rounded-full bg-white p-2 shadow-2xl flex items-center justify-center overflow-hidden border border-gray-100">
                 {/* Temporary Logo placeholder */}
                 <img 
                  src="/logo-yayasan.png" 
                  alt="Logo Bulat Yayasan" 
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
            </div>

            {/* Main Building Image */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl aspect-[4/3] lg:aspect-[4/3] border-4 border-white">
              <img 
                src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=1200&auto=format&fit=crop" 
                alt="Gedung Yayasan" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
