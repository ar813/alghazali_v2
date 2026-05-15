"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Book as BookIcon,
  Library,
  Sparkles,
  ChevronRight,
  Star,
  Info,
  X,
  BookOpen,
  GraduationCap,
  ScrollText,
  Users
} from "lucide-react";
import { searchBooks, Book, getFeaturedBooks } from "@/lib/books";
import NavBar from "@/components/NavBar/NavBar";
import Footer from "@/components/Footer/Footer";
import { cn } from "@/lib/utils";
import LordIcon from "@/components/ui/LordIcon";

const CATEGORIES = [
  { id: "all", label: "All Books", icon: Library },
  { id: "islamic", label: "Islamic Studies", icon: BookIcon },
  { id: "academic", label: "Science & Tech", icon: Sparkles },
  { id: "school", label: "School Education", icon: BookOpen },
  { id: "saved", label: "My Library", icon: Star },
];

const IslamicPattern = () => (
  <svg className="absolute inset-0 w-full h-full opacity-[0.03] pointer-events-none" xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
    <defs>
      <pattern id="islamic-geo" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M20 0L24 16L40 20L24 24L20 40L16 24L0 20L16 16L20 0Z" fill="currentColor" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#islamic-geo)" />
  </svg>
);

const BookCover = ({ book, className }: { book: Book; className?: string }) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  return (
    <div className={cn("relative w-full h-full bg-neutral-900 flex items-center justify-center overflow-hidden", className)}>
      {!error ? (
        <Image
          src={book.thumbnail}
          alt={book.title}
          fill
          onError={() => setError(true)}
          onLoad={() => setLoading(false)}
          className={cn(
            "object-cover transition-all duration-700",
            loading ? "opacity-0 scale-105" : "opacity-80 group-hover:opacity-100 group-hover:scale-110"
          )}
        />
      ) : (
        <div className="absolute inset-0 p-4 flex flex-col justify-between bg-gradient-to-br from-emerald-950 to-neutral-900 border border-emerald-500/20">
          <div className="opacity-10 absolute inset-0">
            <IslamicPattern />
          </div>
          <div className="relative z-10">
            <div className="w-8 h-1 bg-emerald-500 mb-4" />
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500/50 mb-1">Digital Edition</h4>
            <div className="text-[10px] font-bold text-neutral-500">{book.source}</div>
          </div>
          <div className="relative z-10">
            <div className="text-xs font-black tracking-tighter leading-tight mb-2 line-clamp-3">
              {book.title}
            </div>
            <div className="text-[8px] font-medium text-neutral-400 uppercase tracking-widest truncate">
              {book.authors[0]}
            </div>
          </div>
        </div>
      )}
      {loading && !error && (
        <div className="absolute inset-0 bg-neutral-900 animate-pulse" />
      )}
    </div>
  );
};

export default function LibraryPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [featuredBooks, setFeaturedBooks] = useState<Book[]>([]);
  const [savedBooks, setSavedBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isReaderOpen, setIsReaderOpen] = useState(false);

  useEffect(() => {
    // Load saved books from localStorage
    const saved = localStorage.getItem("alghazali_saved_books");
    if (saved) {
      setSavedBooks(JSON.parse(saved));
    }
  }, []);

  const fetchBooks = useCallback(async (query = "") => {
    setLoading(true);
    const results = await searchBooks(query, activeCategory);
    setBooks(results);
    setLoading(false);
  }, [activeCategory]);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    // Load featured books once
    if (featuredBooks.length === 0) {
      const featured = await getFeaturedBooks();
      setFeaturedBooks(featured.slice(0, 3));
    }
    await fetchBooks();
  }, [featuredBooks.length, fetchBooks]);

  useEffect(() => {
    if (activeCategory === "saved") {
      setBooks(savedBooks);
      setLoading(false);
    } else {
      loadInitialData();
    }
  }, [activeCategory, savedBooks, loadInitialData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBooks(searchQuery);
  };

  const toggleSaveBook = (book: Book) => {
    const isSaved = savedBooks.some((b) => b.id === book.id);
    let newSaved;
    if (isSaved) {
      newSaved = savedBooks.filter((b) => b.id !== book.id);
    } else {
      newSaved = [...savedBooks, book];
    }
    setSavedBooks(newSaved);
    localStorage.setItem("alghazali_saved_books", JSON.stringify(newSaved));
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-emerald-500 selection:text-black font-sans">
      <NavBar />

      {/* Hero Section */}
      <section className="relative pt-40 pb-24 px-4 overflow-hidden border-b border-white/5">
        {/* Background Patterns */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_-20%,#10b98120,transparent_70%)]" />
          <div className="absolute inset-0 bg-grid-vercel opacity-[0.05]" />
          <div className="absolute inset-0 opacity-[0.08]">
            <IslamicPattern />
          </div>
        </div>

        <div className="container mx-auto relative z-10">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-3 px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 mb-8 rounded-full"
            >
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </div>
              <span className="text-[10px] uppercase tracking-[0.4em] font-bold text-emerald-400">Digital Library Live</span>
            </motion.div>

            <div className="mb-8 h-24 w-24">
              <LordIcon
                src="https://cdn.lordicon.com/vufjamjj.json" // Open book/study icon
                trigger="loop"
                delay={1000}
                colors="primary:#ffffff,secondary:#10b981"
                size={96}
              />
            </div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-6xl md:text-8xl font-black tracking-tighter mb-8 leading-[0.9]"
            >
              E-LIBRARY <span className="text-emerald-500">.</span>
            </motion.h1>
            <p className="text-neutral-400 text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
              Access thousands of digital resources, Islamic manuscripts, science publications, and academic textbooks from around the world.
            </p>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="relative w-full max-w-2xl mx-auto group">
              <div className="absolute inset-0 bg-emerald-500/10 blur-xl group-focus-within:bg-emerald-500/20 transition-all duration-500" />
              <div className="relative flex items-center bg-black/40 backdrop-blur-xl border border-white/10 p-1 group-focus-within:border-emerald-500/50 transition-all duration-300">
                <div className="pl-4 pr-2 text-neutral-500">
                  <Search size={20} />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search titles, authors, or subjects..."
                  className="flex-1 bg-transparent border-none outline-none py-4 text-white placeholder:text-neutral-600 font-medium text-lg"
                />
                <button
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-400 text-black px-8 py-4 font-black text-sm tracking-widest transition-all duration-200"
                >
                  EXPLORE
                </button>
              </div>
            </form>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-20 w-full">
              {[
                { label: "Digital Volumes", value: "5,000+", icon: ScrollText },
                { label: "Active Readers", value: "1,200+", icon: Users },
                { label: "Academic Research", value: "850+", icon: GraduationCap },
                { label: "Daily New Books", value: "25+", icon: Sparkles },
              ].map((stat, i) => (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + (i * 0.1) }}
                  key={stat.label}
                  className="p-6 bg-white/[0.02] border border-white/5 backdrop-blur-sm text-left group hover:bg-white/[0.04] transition-all"
                >
                  <stat.icon size={20} className="text-emerald-500 mb-4 group-hover:scale-110 transition-transform" />
                  <div className="text-2xl font-black mb-1 tracking-tighter">{stat.value}</div>
                  <div className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Section */}
      {!searchQuery && activeCategory === "all" && featuredBooks.length > 0 && (
        <section className="py-24 container mx-auto px-4">
          <div className="flex items-end justify-between mb-12">
            <div>
              <div className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.3em] mb-4">Spotlight</div>
              <h2 className="text-4xl font-black tracking-tighter">FEATURED MASTERPIECES</h2>
            </div>
            <div className="hidden md:block h-[1px] flex-1 mx-12 bg-white/10" />
            <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-white transition-colors">
              View All Classics <ChevronRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {featuredBooks.map((book) => (
              <motion.div
                whileHover={{ y: -10 }}
                key={book.id}
                onClick={() => setSelectedBook(book)}
                className="relative h-[400px] overflow-hidden group cursor-pointer border border-white/5"
              >
                <Image
                  src={book.thumbnail}
                  alt={book.title}
                  fill
                  className="object-cover opacity-40 group-hover:opacity-60 group-hover:scale-110 transition-all duration-1000"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="absolute inset-0 p-8 flex flex-col justify-end">
                  <div className="absolute top-4 left-4 z-10 px-2 py-0.5 bg-emerald-500 text-black text-[8px] font-black uppercase tracking-widest">
                    {book.categories?.[0] || "Featured"}
                  </div>
                  <h3 className="text-2xl font-black tracking-tighter mb-2 leading-tight group-hover:text-emerald-400 transition-colors line-clamp-2">
                    {book.title}
                  </h3>
                  <p className="text-neutral-400 text-xs mb-6 line-clamp-2 leading-relaxed">
                    {book.description}
                  </p>
                  <div className="flex items-center gap-4">
                    <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white border-b-2 border-emerald-500 pb-1">
                      Read Preview
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 pb-32">
        {/* Categories Bar */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-16">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all duration-300 border",
                activeCategory === cat.id
                  ? "bg-white text-black border-white"
                  : "bg-transparent text-neutral-500 border-white/5 hover:border-white/20 hover:text-white"
              )}
            >
              <cat.icon size={14} />
              {cat.label}
            </button>
          ))}
        </div>

        {/* Books Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="space-y-4 animate-pulse">
                <div className="aspect-[3/4] bg-neutral-900 border border-white/5" />
                <div className="h-4 bg-neutral-900 w-3/4" />
                <div className="h-3 bg-neutral-900 w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
            <AnimatePresence mode="popLayout">
              {books.map((book, index) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  key={book.id}
                  onClick={() => setSelectedBook(book)}
                  className="group cursor-pointer"
                >
                  <div className="relative aspect-[3/4] mb-4 overflow-hidden bg-neutral-900 border border-white/5 group-hover:border-emerald-500/50 transition-all duration-500">
                    <BookCover book={book} />
                    
                    <div className="absolute top-2 left-2 z-10 px-1.5 py-0.5 bg-black/80 backdrop-blur-md text-[8px] font-black text-emerald-400 border border-white/5 uppercase tracking-tighter">
                      {book.source}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />

                    {/* Quick Save Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSaveBook(book);
                      }}
                      className={cn(
                        "absolute top-2 right-2 p-2 backdrop-blur-md border transition-all duration-300 z-20",
                        savedBooks.some(b => b.id === book.id)
                          ? "bg-emerald-500 border-emerald-400 text-black"
                          : "bg-black/50 border-white/10 text-white hover:bg-white/20"
                      )}
                    >
                      <Star size={12} className={savedBooks.some(b => b.id === book.id) ? "fill-black" : ""} />
                    </button>

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 flex items-end p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-500 bg-emerald-950/80 backdrop-blur-sm">
                      <div className="w-full">
                        <div className="flex items-center gap-1 mb-2">
                          <Star size={12} className="text-emerald-400 fill-emerald-400" />
                          <span className="text-[10px] font-bold text-emerald-400">{book.averageRating || "4.5"}</span>
                        </div>
                        <button className="w-full bg-white text-black py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-400 transition-colors">
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                  <h3 className="text-sm font-bold truncate group-hover:text-emerald-400 transition-colors">{book.title}</h3>
                  <p className="text-[10px] text-neutral-500 font-medium tracking-tight truncate">{book.authors.join(", ")}</p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {!loading && books.length === 0 && (
          <div className="text-center py-32 flex flex-col items-center">
            <div className="w-24 h-24 mb-8 opacity-20">
              <LordIcon
                src="https://cdn.lordicon.com/wxnxiano.json" // Book icon
                trigger="loop"
                colors="primary:#ffffff,secondary:#10b981"
                size={96}
              />
            </div>
            <p className="text-neutral-500 font-bold uppercase tracking-widest text-sm">The library is vast, but this shelf is empty.</p>
            <button
              onClick={() => { setSearchQuery(""); fetchBooks(""); }}
              className="mt-6 text-emerald-500 text-xs font-black uppercase tracking-widest border-b border-emerald-500 pb-1"
            >
              Reset Search
            </button>
          </div>
        )}
      </main>

      {/* Book Detail Modal */}
      <AnimatePresence>
        {selectedBook && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10"
          >
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setSelectedBook(null)} />

            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative w-full max-w-5xl bg-[#0a0a0a] border border-white/10 overflow-hidden flex flex-col md:flex-row h-full max-h-[80vh]"
            >
              <button
                onClick={() => setSelectedBook(null)}
                className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-white/10 transition-colors border border-white/5"
              >
                <X size={20} />
              </button>

              {/* Cover Side */}
              <div className="w-full md:w-1/3 p-8 flex items-center justify-center bg-[#111]">
                <div className="relative w-full aspect-[3/4] shadow-[0_32px_64px_-16px_rgba(0,0,0,1)]">
                  <BookCover book={selectedBook} className="border border-white/10" />
                  <div className="absolute -inset-1 border border-emerald-500/20 pointer-events-none" />
                </div>
              </div>

              {/* Content Side */}
              <div className="flex-1 p-8 md:p-12 overflow-y-auto custom-scrollbar">
                <div className="inline-block px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-4">
                  {selectedBook.categories?.[0] || "General"}
                </div>
                <h2 className="text-3xl md:text-5xl font-bold tracking-tighter mb-4 leading-none">
                  {selectedBook.title}
                </h2>
                <div className="flex flex-wrap items-center gap-6 text-neutral-400 text-sm mb-8">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold tracking-tight">By</span>
                    <span>{selectedBook.authors.join(", ")}</span>
                  </div>
                  <div className="h-1 w-1 bg-neutral-700 rounded-full" />
                  <div>{selectedBook.publishedDate}</div>
                  {selectedBook.pageCount && (
                    <>
                      <div className="h-1 w-1 bg-neutral-700 rounded-full" />
                      <div>{selectedBook.pageCount} Pages</div>
                    </>
                  )}
                </div>

                <div className="prose prose-invert max-w-none mb-10">
                  <p className="text-neutral-400 leading-relaxed text-base mb-8">
                    {selectedBook.description.length > 500
                      ? selectedBook.description.substring(0, 500) + "..."
                      : selectedBook.description}
                  </p>

                  {/* Integrated Reader Preview */}
                  {selectedBook.readUrl && (
                    <div className="mt-8">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500">
                          <BookOpen size={14} /> Digital Library Live Access
                        </div>
                        <button 
                          onClick={() => setIsReaderOpen(true)}
                          className="text-[10px] font-black uppercase tracking-widest text-white bg-emerald-500/20 hover:bg-emerald-500 px-3 py-1 transition-all"
                        >
                          Expand Reader
                        </button>
                      </div>
                      <div className="relative w-full aspect-video border border-white/10 bg-neutral-950 overflow-hidden group rounded-sm shadow-2xl">
                        <iframe
                          src={selectedBook.readUrl}
                          className="w-full h-full opacity-90 group-hover:opacity-100 transition-opacity duration-500"
                          title="Book Reader"
                          allowFullScreen
                        />
                        <div className="absolute top-4 right-4 bg-emerald-500 text-black px-3 py-1 text-[8px] font-black uppercase tracking-widest pointer-events-none">
                          Live Sync
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-4 mt-auto">
                  <a
                    href={selectedBook.previewLink}
                    target="_blank"
                    className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black px-8 py-4 font-black text-xs uppercase tracking-[0.2em] transition-all"
                  >
                    <BookOpen size={16} />
                    Read Online
                  </a>
                  <button
                    onClick={() => toggleSaveBook(selectedBook)}
                    className={cn(
                      "flex items-center gap-2 px-8 py-4 font-black text-xs uppercase tracking-[0.2em] transition-all border",
                      savedBooks.some(b => b.id === selectedBook.id)
                        ? "bg-white text-black border-white"
                        : "bg-white/5 hover:bg-white/10 text-white border-white/10"
                    )}
                  >
                    <Star size={16} className={savedBooks.some(b => b.id === selectedBook.id) ? "fill-black" : ""} />
                    {savedBooks.some(b => b.id === selectedBook.id) ? "Saved to Library" : "Save to Library"}
                  </button>
                  <a
                    href={selectedBook.infoLink}
                    target="_blank"
                    className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 px-8 py-4 font-black text-xs uppercase tracking-[0.2em] transition-all"
                  >
                    <Info size={16} />
                    More Info
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Screen Reader Mode */}
      <AnimatePresence>
        {isReaderOpen && selectedBook && (
          <motion.div
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="fixed inset-0 z-[200] bg-black flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#050505]">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-emerald-500 flex items-center justify-center text-black font-black text-xs">
                  AG
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-tight uppercase">{selectedBook.title}</h3>
                  <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">
                    Live Reading Session • {selectedBook.source}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsReaderOpen(false)}
                className="p-2 hover:bg-white/10 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 bg-[#111]">
              <iframe
                src={selectedBook.readUrl}
                className="w-full h-full border-none"
                title="Full Screen Reader"
                allowFullScreen
              />
            </div>
            <div className="p-4 bg-[#050505] border-t border-white/10 text-center">
              <p className="text-[10px] text-neutral-600 font-bold uppercase tracking-[0.5em]">
                Al-Ghazali Digital Archives • High Performance Reading Mode
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <Footer />
    </div>
  );
}
