import { ArrowRight, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

export function AgendaSection() {
  const agendaList = [
    {
      id: 1,
      nama_kegiatan: "Parenting Class TK IT Manarul Hikam",
      tanggal_angka: "25",
      tanggal_bulan: "MEI",
      detail_waktu: "Sabtu, 25 Mei 2024",
      lokasi: "Aula Yayasan Manarul Hikam",
    },
    {
      id: 2,
      nama_kegiatan: "Ujian Akhir Semester Genap",
      tanggal_angka: "01",
      tanggal_bulan: "JUN",
      detail_waktu: "Sabtu, 01 - 07 Juni 2024",
      lokasi: "Seluruh Unit Pendidikan",
    },
    {
      id: 3,
      nama_kegiatan: "Pentas Seni & Gelar Karya",
      tanggal_angka: "15",
      tanggal_bulan: "JUN",
      detail_waktu: "Sabtu, 15 Juni 2024",
      lokasi: "Lapangan Yayasan Manarul Hikam",
    },
    {
      id: 4,
      nama_kegiatan: "Rapat Wali Murid Semester Genap",
      tanggal_angka: "20",
      tanggal_bulan: "JUN",
      detail_waktu: "Kamis, 20 Juni 2024",
      lokasi: "Aula Yayasan Manarul Hikam",
    }
  ];

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Agenda Kegiatan</h2>
        <Link 
          to="/agenda"
          className="inline-flex items-center text-emerald-600 font-bold hover:text-emerald-700 transition-colors text-sm"
        >
          Lihat Semua
          <ArrowRight className="ml-1 w-4 h-4" />
        </Link>
      </div>

      <div className="space-y-4">
        {agendaList.map((agenda) => (
          <div key={agenda.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-5">
            
            {/* Box Tanggal */}
            <div className="flex flex-col items-center justify-center min-w-[70px] shrink-0">
              <span className="text-3xl font-extrabold text-emerald-600 leading-none mb-1">
                {agenda.tanggal_angka}
              </span>
              <span className="text-sm font-bold text-gray-900 uppercase tracking-widest">
                {agenda.tanggal_bulan}
              </span>
            </div>

            {/* Divider vertikal tipis (optional, tapi di mockup ada border tipis atau pemisah) */}
            <div className="w-px h-12 bg-gray-200 hidden sm:block"></div>

            {/* Detail Agenda */}
            <div className="flex flex-col flex-grow">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1 leading-snug">
                {agenda.nama_kegiatan}
              </h3>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-gray-500">
                <span>{agenda.detail_waktu}</span>
                <span className="hidden sm:inline text-gray-300">•</span>
                <div className="flex items-center gap-1 mt-1 sm:mt-0">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{agenda.lokasi}</span>
                </div>
              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}
