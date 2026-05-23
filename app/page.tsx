"use client"

import NavBar from '@/components/NavBar/NavBar';
import HeroSection from '@/components/HeroSection/HeroSection';
import OurCampus from '@/components/OurCampus/OurCampus';
import ReadyToPioneer from '@/components/ReadyToPioneer/ReadyToPioneer';
import AppDownload from '@/components/AppDownload/AppDownload';
import StatsSection from '@/components/StatsSection/StatsSection';
import LegendaryStudents from '@/components/LegendaryStudents/LegendaryStudents';
import About from '@/components/About/About';
import CoreValues from '@/components/CoreValues/CoreValues';
import AcademicPrograms from '@/components/AcademicPrograms/AcademicPrograms';
import Faculty from '@/components/Faculty/Faculty';
import SchoolEvents from '@/components/SchoolEvents/SchoolEvents';
import TuitionFees from '@/components/TuitionFees/TuitionFees';
import Footer from '@/components/Footer/Footer';
import Contact from '@/components/Contact/Contact';
import { SectionReveal, ScrollProgress } from '@/components/ScrollEffects/SectionReveal';
import SchemaOrg from '@/components/SEO/SchemaOrg';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white relative flex flex-col w-full overflow-x-hidden">
      <SchemaOrg />
      <ScrollProgress />
      <NavBar />

      <HeroSection />
      <OurCampus />
      <ReadyToPioneer />

      <SectionReveal>
        <SchoolEvents />
      </SectionReveal>

      <SectionReveal>
        <LegendaryStudents />
      </SectionReveal>

      <SectionReveal>
        <StatsSection />
      </SectionReveal>

      <SectionReveal>
        <CoreValues />
      </SectionReveal>

      <SectionReveal>
        <About />
      </SectionReveal>


      <SectionReveal>
        <AcademicPrograms />
      </SectionReveal>

      <SectionReveal>
        <Faculty />
      </SectionReveal>

      <SectionReveal>
        <TuitionFees />
      </SectionReveal>

      <SectionReveal>
        <Contact />
      </SectionReveal>

      <AppDownload />

      <Footer />
    </main>
  );
}