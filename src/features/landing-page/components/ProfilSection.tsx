import { Eye, Target, BookOpen } from "lucide-react";

export function ProfilSection() {
  return (
    <section id="profil" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-start">
          
          {/* Kiri: Foto Ketua */}
          <div className="w-full lg:w-1/3 shrink-0">
            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 flex flex-col items-center text-center h-full">
              <div className="w-full aspect-[4/5] bg-gray-200 rounded-2xl overflow-hidden mb-6">
                <img 
                  src="https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=1000&auto=format&fit=crop" 
                  alt="H. Asep Habibullah, M.Pd." 
                  className="w-full h-full object-cover object-top"
                />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">H. Asep Habibullah, M.Pd.</h3>
              <p className="text-emerald-600 font-semibold text-sm">Ketua Yayasan Manarul Hikam</p>
            </div>
          </div>

          {/* Kanan: Tentang Yayasan & Cards */}
          <div className="w-full lg:w-2/3">
            <div className="mb-10 text-center lg:text-left">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Tentang Yayasan</h2>
              <div className="w-16 h-1 bg-emerald-600 mx-auto lg:mx-0 rounded-full"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Visi */}
              <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 h-full flex flex-col">
                <div className="mb-4">
                  <Eye className="w-8 h-8 text-emerald-600" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">Visi</h3>
                <p className="text-gray-600 text-sm leading-relaxed flex-grow">
                  Menjadi yayasan pendidikan Islam terdepan dalam membentuk generasi berilmu, berakhlak mulia, mandiri, dan berwawasan global.
                </p>
              </div>

              {/* Misi */}
              <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 h-full flex flex-col">
                <div className="mb-4">
                  <Target className="w-8 h-8 text-emerald-600" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">Misi</h3>
                <ul className="text-gray-600 text-sm leading-relaxed list-disc list-outside ml-4 space-y-1.5 flex-grow">
                  <li>Menyelenggarakan pendidikan berkualitas berbasis nilai Islam</li>
                  <li>Mengembangkan potensi peserta didik secara optimal</li>
                  <li>Membangun lingkungan pendidikan yang Islami dan kondusif</li>
                  <li>Menjalin kemitraan dengan masyarakat dan dunia usaha</li>
                </ul>
              </div>

              {/* Sejarah Singkat */}
              <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 h-full flex flex-col">
                <div className="mb-4">
                  <BookOpen className="w-8 h-8 text-emerald-600" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">Sejarah Singkat</h3>
                <p className="text-gray-600 text-sm leading-relaxed flex-grow">
                  Yayasan Manarul Hikam berdiri sejak tahun 2005 di Singaparna, Tasikmalaya dengan komitmen menghadirkan pendidikan Islam terpadu. Berawal dari sebuah mimpi kecil untuk mencetak generasi Qur'ani dan berprestasi, hingga kini telah menaungi berbagai lembaga pendidikan dari jenjang TK hingga SMA serta Pondok Pesantren.
                </p>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
