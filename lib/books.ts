export interface Book {
  id: string;
  title: string;
  authors: string[];
  description: string;
  thumbnail: string;
  previewLink: string;
  infoLink: string;
  categories: string[];
  publishedDate: string;
  source: "OpenLibrary" | "Gutenberg" | "QuranCloud" | "Hadith";
  readUrl?: string;
  isTextBased?: boolean;
  averageRating?: string;
  pageCount?: string;
}

const CATEGORY_MAP: Record<string, string> = {
  all: "History Literature",
  islamic: "Islamic",
  academic: "Science Technology",
  school: "Education",
  research: "Academic Research",
  comics: "Comics",
  stories: "Fiction",
  hadith: "Hadith",
  tafseer: "Tafseer"
};

const PLACEHOLDERS = {
  islamic: "https://images.unsplash.com/photo-1542810634-71277d95dcbb?q=80&w=800",
  academic: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=800",
  science: "https://images.unsplash.com/photo-1507413245164-6160d8298b31?q=80&w=800",
  literature: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?q=80&w=800",
  history: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?q=80&w=800",
  default: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=800"
};

function getPlaceholder(title: string, category: string): string {
  const t = title.toLowerCase();
  const c = category.toLowerCase();
  
  if (t.includes("quran") || t.includes("tafsir") || t.includes("tafseer") || c === "islamic" || t.includes("hadith")) {
    return PLACEHOLDERS.islamic;
  }
  if (t.includes("history") || t.includes("civilization") || t.includes("archive")) {
    return PLACEHOLDERS.history;
  }
  if (t.includes("science") || t.includes("physics") || t.includes("biology") || c === "academic") {
    return PLACEHOLDERS.science;
  }
  if (t.includes("math") || t.includes("tech") || t.includes("computer")) {
    return PLACEHOLDERS.academic;
  }
  if (t.includes("story") || t.includes("novel") || t.includes("poetry") || c === "stories") {
    return PLACEHOLDERS.literature;
  }
  
  return PLACEHOLDERS.default;
}

export async function searchBooks(query: string, category: string = "all"): Promise<Book[]> {
  const searchTerm = query.trim() || CATEGORY_MAP[category] || "Books";

  try {
    const promises: Promise<Book[]>[] = [
      fetchOpenLibrary(searchTerm),
      fetchGutenberg(searchTerm)
    ];

    // If searching for Quran, Tafseer, Hadith or in Islamic category
    const isIslamicSearch = category === "islamic" ||
      searchTerm.toLowerCase().includes("quran") ||
      searchTerm.toLowerCase().includes("tafsir") ||
      searchTerm.toLowerCase().includes("tafseer") ||
      searchTerm.toLowerCase().includes("hadith") ||
      searchTerm.toLowerCase().includes("sunnah");

    if (isIslamicSearch) {
      promises.push(fetchQuranicResources(searchTerm));
      promises.push(fetchHadith(searchTerm));
    }

    const results = await Promise.allSettled(promises);
    let combinedBooks: Book[] = [];

    results.forEach(res => {
      if (res.status === "fulfilled") {
        combinedBooks = [...combinedBooks, ...res.value];
      }
    });

    return combinedBooks.sort(() => Math.random() - 0.5);
  } catch (error) {
    console.error("Multi-API Library Error:", error);
    return [];
  }
}

async function fetchOpenLibrary(query: string): Promise<Book[]> {
  try {
    const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=15`);
    const data = await res.json();
    return (data.docs || []).map((doc: any) => ({
      id: doc.key.replace("/works/", ""),
      title: doc.title,
      authors: doc.author_name || ["Unknown Scholar"],
      description: doc.first_sentence?.[0] || doc.subtitle || "A scholarly work from the digital archives.",
      thumbnail: doc.cover_i
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
        : getPlaceholder(doc.title, query),
      previewLink: `https://openlibrary.org${doc.key}`,
      infoLink: `https://openlibrary.org${doc.key}`,
      categories: doc.subject ? doc.subject.slice(0, 3) : ["General"],
      publishedDate: doc.first_publish_year?.toString() || "N/A",
      source: "OpenLibrary",
      readUrl: doc.ia?.[0] ? `https://archive.org/embed/${doc.ia[0]}` : undefined
    }));
  } catch { return []; }
}

async function fetchGutenberg(query: string): Promise<Book[]> {
  try {
    const res = await fetch(`https://gutendex.com/books/?search=${encodeURIComponent(query)}`);
    const data = await res.json();
    return (data.results || []).map((book: any) => ({
      id: `gt-${book.id}`,
      title: book.title,
      authors: book.authors.map((a: any) => a.name) || ["Unknown"],
      description: `A public domain classic provided by Project Gutenberg.`,
      thumbnail: book.formats["image/jpeg"] || getPlaceholder(book.title, query),
      previewLink: book.formats["text/html"] || "#",
      infoLink: `https://www.gutenberg.org/ebooks/${book.id}`,
      categories: book.subjects ? book.subjects.slice(0, 3) : ["Classics"],
      publishedDate: "Public Domain",
      source: "Gutenberg",
      readUrl: book.formats["text/html"]
    }));
  } catch { return []; }
}

async function fetchQuranicResources(query: string): Promise<Book[]> {
  const authenticFallbacks: Book[] = [
    {
      id: "qc-en.sahih",
      title: "The Holy Quran (English Translation)",
      authors: ["Sahih International"],
      description: "The most widely used English translation of the Holy Quran in the world.",
      thumbnail: "https://images.unsplash.com/photo-1584281729155-3c9933058042?q=80&w=800",
      previewLink: "https://quran.com/1",
      infoLink: "https://quran.com",
      categories: ["Quran", "Islamic Studies"],
      publishedDate: "Modern",
      source: "QuranCloud",
      readUrl: "https://quran.com/1",
      isTextBased: true
    },
    {
      id: "qc-ur.maarif",
      title: "Tafseer Maarif-ul-Quran (Urdu)",
      authors: ["Mufti Muhammad Shafi"],
      description: "A detailed and authentic Urdu commentary of the Holy Quran.",
      thumbnail: "https://images.unsplash.com/photo-1591633511110-3222d861bc22?q=80&w=800",
      previewLink: "https://quran.com/1?translations=158",
      infoLink: "https://quran.com",
      categories: ["Tafseer", "Urdu", "Islamic Studies"],
      publishedDate: "20th Century",
      source: "QuranCloud",
      readUrl: "https://quran.com/1?translations=158",
      isTextBased: true
    },
    {
      id: "qc-ur.usmani",
      title: "Tafseer-e-Usmani (Urdu)",
      authors: ["Allama Shabbir Ahmad Usmani"],
      description: "One of the most authentic and respected Urdu Tafseers.",
      thumbnail: "https://images.unsplash.com/photo-1542810634-71277d95dcbb?q=80&w=800",
      previewLink: "https://quran.com/1?translations=97",
      infoLink: "https://quran.com",
      categories: ["Tafseer", "Urdu"],
      publishedDate: "Classical",
      source: "QuranCloud",
      readUrl: "https://quran.com/1?translations=97",
      isTextBased: true
    }
  ];

  try {
    const [enRes, urRes] = await Promise.all([
      fetch(`https://api.alquran.cloud/v1/edition?type=tafsir&language=en`).catch(() => null),
      fetch(`https://api.alquran.cloud/v1/edition?type=tafsir&language=ur`).catch(() => null)
    ]);
    
    if (!enRes || !urRes) return authenticFallbacks;

    const enData = await enRes.json();
    const urData = await urRes.json();

    const combined = [...(enData.data || []), ...(urData.data || [])].slice(0, 10);

    const apiBooks = combined.map((t: any) => ({
      id: `qc-${t.identifier}`,
      title: `${t.name} (${t.language === 'ur' ? 'Urdu' : 'English'})`,
      authors: [t.authorName || "Classical Scholars"],
      description: `Authentic ${t.englishName} of the Holy Quran. Provided by Al-Quran Cloud.`,
      thumbnail: t.language === 'ur'
        ? "https://images.unsplash.com/photo-1591633511110-3222d861bc22?q=80&w=1000&auto=format&fit=crop"
        : "https://images.unsplash.com/photo-1584281729155-3c9933058042?q=80&w=1000&auto=format&fit=crop",
      previewLink: `https://quran.com/1?translations=${t.identifier}`,
      infoLink: `https://alquran.cloud/`,
      categories: ["Islamic Studies", "Quran", "Tafseer"],
      publishedDate: "Classical Era",
      source: "QuranCloud" as const,
      readUrl: `https://quran.com/1?translations=${t.identifier}`,
      isTextBased: true
    }));

    return [...authenticFallbacks, ...apiBooks];
  } catch {
    return authenticFallbacks;
  }
}

async function fetchHadith(query: string): Promise<Book[]> {
  try {
    // Using a public Hadith API for major collections
    const collections = [
      { id: "bukhari", name: "Sahih al-Bukhari", author: "Imam Bukhari", desc: "The most authentic collection of Hadith." },
      { id: "muslim", name: "Sahih Muslim", author: "Imam Muslim", desc: "A highly respected collection of authentic Hadith." },
      { id: "abudaud", name: "Sunan Abi Dawud", author: "Imam Abu Dawood", desc: "One of the Kutub al-Sittah (six major hadith collections)." },
      { id: "tirmidhi", name: "Jami' at-Tirmidhi", author: "Imam at-Tirmidhi", desc: "Famous for its categorization of Hadith grades." }
    ];

    const queryLower = query.toLowerCase();
    return collections.filter(c =>
      c.name.toLowerCase().includes(queryLower) ||
      queryLower.includes("hadith") ||
      queryLower.includes("islamic") ||
      queryLower.includes("sunnah")
    ).map(c => ({
      id: `hd-${c.id}`,
      title: c.name,
      authors: [c.author],
      description: c.desc,
      thumbnail: getPlaceholder(c.name, "islamic"),
      previewLink: `https://sunnah.com/${c.id}`,
      infoLink: `https://sunnah.com/`,
      categories: ["Hadith", "Sunnah", "Islamic Studies"],
      publishedDate: "Classical Era",
      source: "Hadith" as const,
      readUrl: `https://sunnah.com/${c.id}`,
      isTextBased: true
    }));
  } catch { return []; }
}

export async function getFeaturedBooks(): Promise<Book[]> {
  return searchBooks("Great Masterpieces Literature", "all");
}
