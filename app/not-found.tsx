"use client";

import Link from "next/link";
import { Home, ArrowLeft, Search, Book, User, CreditCard } from "lucide-react";
import NavBar from "@/components/NavBar/NavBar";
import Footer from "@/components/Footer/Footer";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-white dark:bg-[#0a0a0a] flex flex-col w-full">
      <NavBar />
      
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        <div className="max-w-xl w-full text-center space-y-8">
          
          <div className="space-y-2">
            <h1 className="text-[120px] font-black leading-none tracking-tighter text-zinc-900 dark:text-white">
              404
            </h1>
            <p className="text-xl font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-widest">
              Page Not Found
            </p>
          </div>

          <div className="space-y-4">
            <p className="text-zinc-500 dark:text-zinc-400 text-lg">
              Sorry, we couldn't find the page you're looking for. It might have been moved or doesn't exist anymore.
            </p>
            <p className="text-zinc-400 dark:text-zinc-500 font-amiri text-2xl italic">
              Maaf kijiyega, ye safha maujood nahi hai.
            </p>
          </div>

          <div className="pt-8 border-t border-zinc-100 dark:border-zinc-900">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-6">
              Helpful Links
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <HelpLink href="/" icon={<Home size={18} />} label="Home" />
              <HelpLink href="/library" icon={<Book size={18} />} label="Library" />
              <HelpLink href="/student-portal" icon={<User size={18} />} label="Portal" />
              <HelpLink href="/#fees" icon={<CreditCard size={18} />} label="Fees" />
            </div>
          </div>

          <div className="pt-10">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold rounded-full hover:bg-emerald-700 dark:hover:bg-emerald-500 hover:text-white dark:hover:text-white transition-all shadow-lg"
            >
              <Home size={18} />
              Return to Homepage
            </Link>
          </div>

        </div>
      </div>

      <Footer />
    </main>
  );
}

function HelpLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link 
      href={href} 
      className="flex items-center gap-3 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 border border-transparent hover:border-emerald-100 dark:hover:border-emerald-900/30 transition-all group"
    >
      <div className="text-zinc-400 group-hover:text-emerald-500 transition-colors">
        {icon}
      </div>
      <span className="font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
        {label}
      </span>
    </Link>
  );
}
