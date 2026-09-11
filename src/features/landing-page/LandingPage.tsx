import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "./components/HeroSection";
import { ProfilSection } from "./components/ProfilSection";
import { LembagaSection } from "./components/LembagaSection";
import { BeritaSection } from "./components/BeritaSection";
import { AgendaSection } from "./components/AgendaSection";
import { FasilitasSection } from "./components/FasilitasSection";

export function LandingPage() {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data } = await supabase.from("site_profile").select("*").limit(1).single();
      if (data) setProfile(data);
    };
    fetchProfile();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className="flex-grow pt-20"> {/* Add padding top because navbar is fixed */}
        <HeroSection profile={profile} />
        <ProfilSection profile={profile} />
        <LembagaSection />
        
        {/* Berita & Agenda digabung dalam 1 baris (Grid 2 Kolom) */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
              <BeritaSection />
              <AgendaSection />
            </div>
          </div>
        </section>

        <FasilitasSection />
      </main>
      <Footer profile={profile} />
    </div>
  );
}
