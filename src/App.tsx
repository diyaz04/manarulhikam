import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LandingPage } from "@/features/landing-page/LandingPage";
import { UnitLandingPage } from "@/features/public/UnitLandingPage";
import { LoginPage } from "@/features/auth/LoginPage";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PortalSiswaLayout } from "@/components/layout/PortalSiswaLayout";
import { PortalSiswaIndex } from "@/features/portal/PortalSiswaIndex";
import { DashboardIndex } from "@/features/dashboard/DashboardIndex";
import { DashboardYayasanKeuangan } from "@/features/dashboard/yayasan/DashboardYayasanKeuangan";
import { DashboardYayasanTagihanConfig } from "@/features/dashboard/yayasan/DashboardYayasanTagihanConfig";
import { DashboardYayasanTagihan } from "@/features/dashboard/yayasan/DashboardYayasanTagihan";
import { DashboardYayasanVerifikasi } from "@/features/dashboard/yayasan/DashboardYayasanVerifikasi";
import { DashboardYayasanRekening } from "@/features/dashboard/yayasan/DashboardYayasanRekening";
import { DashboardYayasanProfil } from "@/features/dashboard/yayasan/DashboardYayasanProfil";
import { DashboardYayasanLembaga } from "@/features/dashboard/yayasan/DashboardYayasanLembaga";
import { DashboardYayasanSiswa } from "@/features/dashboard/yayasan/DashboardYayasanSiswa";
import { DashboardYayasanBerita } from "@/features/dashboard/yayasan/DashboardYayasanBerita";
import { DashboardYayasanAgenda } from "@/features/dashboard/yayasan/DashboardYayasanAgenda";
import { DashboardYayasanFasilitas } from "@/features/dashboard/yayasan/DashboardYayasanFasilitas";

import { DashboardUnitSiswa } from "@/features/dashboard/unit/DashboardUnitSiswa";
import { DashboardUnitAlumni } from "@/features/dashboard/unit/DashboardUnitAlumni";
import { DashboardUnitGuru } from "@/features/dashboard/unit/DashboardUnitGuru";
import { DashboardGuruIndex } from "@/features/dashboard/guru/DashboardGuruIndex";
import { DashboardUnitJadwal } from "@/features/dashboard/unit/DashboardUnitJadwal";
import { DashboardUnitInputAgenda } from "@/features/dashboard/unit/DashboardUnitInputAgenda";
import { DashboardUnitMonitoringAgenda } from "@/features/dashboard/unit/DashboardUnitMonitoringAgenda";
import { DashboardUnitSpmb } from "@/features/dashboard/unit/DashboardUnitSpmb";
import { DashboardUnitProfil } from "@/features/dashboard/unit/DashboardUnitProfil";
import DashboardUnitPengaturanSistem from "@/features/dashboard/unit/DashboardUnitPengaturanSistem";
import { DashboardUnitAbsensi } from "@/features/dashboard/unit/DashboardUnitAbsensi";
import { DashboardUnitPenggajian } from "@/features/dashboard/unit/DashboardUnitPenggajian";
import { DashboardUnitKehadiranSiswa } from "@/features/dashboard/unit/DashboardUnitKehadiranSiswa";
import { DashboardPengaturanAkun } from "@/features/dashboard/pengaturan/DashboardPengaturanAkun";
import { PublicSpmb } from "@/features/landing-page/PublicSpmb";
import { DashboardGuruKedatangan } from "@/features/dashboard/guru/DashboardGuruKedatangan";
import { DashboardUnitVerifikasiKedatangan } from "@/features/dashboard/unit/DashboardUnitVerifikasiKedatangan";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          
          {/* Public Pages Placeholder */}
          <Route path="/tk" element={<UnitLandingPage unitCode="TK" />} />
          <Route path="/smp" element={<UnitLandingPage unitCode="SMP" />} />
          <Route path="/sma" element={<UnitLandingPage unitCode="SMA" />} />
          <Route path="/pesantren" element={<UnitLandingPage unitCode="PONTREN" />} />

          {/* SPMB Route */}
          <Route path="/spmb/:lembagaCode" element={<PublicSpmb />} />

          {/* Protected Dashboard Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<DashboardIndex />} />
              
              {/* Yayasan Specific Routes */}
              <Route path="yayasan">
                <Route path="keuangan" element={<DashboardYayasanKeuangan />} />
                <Route path="rekening" element={<DashboardYayasanRekening />} />
                <Route path="tagihan" element={<DashboardYayasanTagihan />} />
                <Route path="tagihan-config" element={<DashboardYayasanTagihanConfig />} />
                <Route path="verifikasi" element={<DashboardYayasanVerifikasi />} />
                <Route path="siswa" element={<DashboardYayasanSiswa />} />
                
                <Route path="profil" element={<DashboardYayasanProfil />} />
                <Route path="lembaga" element={<DashboardYayasanLembaga />} />
                <Route path="berita" element={<DashboardYayasanBerita />} />
                <Route path="agenda" element={<DashboardYayasanAgenda />} />
                <Route path="fasilitas" element={<DashboardYayasanFasilitas />} />
              </Route>

              {/* Unit Specific Routes */}
              {/* Guru Academic Routes */}
              <Route path="guru" element={<DashboardGuruIndex />} />
              <Route path="guru/kedatangan" element={<DashboardGuruKedatangan />} />
              <Route path="guru/jadwal" element={<DashboardUnitJadwal />} />
              <Route path="guru/agenda" element={<DashboardUnitInputAgenda />} />
              <Route path="guru/rekap-siswa" element={<DashboardUnitKehadiranSiswa />} />

              {/* Unit Academic Routes */}
              <Route path="unit/siswa" element={<DashboardUnitSiswa />} />
              <Route path="unit/alumni" element={<DashboardUnitAlumni />} />
              <Route path="unit/guru" element={<DashboardUnitGuru />} />
              <Route path="unit/jadwal" element={<DashboardUnitJadwal />} />
              <Route path="unit/input-agenda" element={<DashboardUnitInputAgenda />} />
              <Route path="unit/monitoring-agenda" element={<DashboardUnitMonitoringAgenda />} />
              <Route path="unit/verifikasi-kedatangan" element={<DashboardUnitVerifikasiKedatangan />} />
              <Route path="unit/spmb" element={<DashboardUnitSpmb />} />
              <Route path="unit/profil" element={<DashboardUnitProfil />} />
              <Route path="unit/pengaturan-sistem" element={<DashboardUnitPengaturanSistem />} />
              <Route path="unit/absensi" element={<DashboardUnitAbsensi />} />
              <Route path="unit/kehadiran-siswa" element={<DashboardUnitKehadiranSiswa />} />
              <Route path="unit/penggajian" element={<DashboardUnitPenggajian />} />
              
              <Route path="berita" element={<div className="p-4">Berita Unit Dashboard (Coming Soon)</div>} />
              <Route path="agenda" element={<div className="p-4">Agenda Unit Dashboard (Coming Soon)</div>} />
              <Route path="fasilitas" element={<div className="p-4">Fasilitas Unit Dashboard (Coming Soon)</div>} />
              <Route path="pengaturan" element={<DashboardPengaturanAkun />} />
            </Route>
          </Route>

          {/* Public Portal Siswa Route */}
          <Route path="/portal/siswa" element={<PortalSiswaLayout />}>
            <Route index element={<PortalSiswaIndex />} />
          </Route>

        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
