"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Verse {
    arabic: string;
    urdu: string;
    reference: string;
}

const VERSES: Verse[] = [
    {
        arabic: "وَقُل رَّبِّ زِدْنِي عِلْمًا",
        urdu: "اے میرے رب! میرے علم میں اضافہ فرما۔",
        reference: "Surah Taha: 114"
    },
    {
        arabic: "اَلطُّهُوْرُ شَطْرُ الْاِيْمَانِ",
        urdu: "صفائی اور پاکیزگی ایمان کا حصہ ہے۔",
        reference: "Hadith: Sahih Muslim"
    },
    {
        arabic: "طَلَبُ الْعِلْمِ فَرِيضَةٌ عَلَى كُلِّ مُسْلِمٍ",
        urdu: "علم حاصل کرنا ہر مسلمان پر فرض ہے۔",
        reference: "Hadith: Ibn Majah"
    },
    {
        arabic: "اِنَّمَا الْاَعْمَالُ بِالنِّیَّاتِ",
        urdu: "اعمال کا دارومدار نیتوں پر ہے۔",
        reference: "Hadith: Sahih Bukhari"
    },
    {
        arabic: "اَلْکَلِمَۃُ الطَّیِّبَۃُ صَدَقَۃٌ",
        urdu: "اچھی بات کہنا بھی صدقہ ہے۔",
        reference: "Hadith: Sahih Bukhari"
    },
    {
        arabic: "خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ",
        urdu: "تم میں سے بہتر وہ ہے جو قرآن سیکھے اور سکھائے۔",
        reference: "Hadith: Sahih Bukhari"
    },
    {
        arabic: "اَلْحَيَاءُ مِنَ الْاِيْمَانِ",
        urdu: "حیا ایمان کا ایک شعبہ ہے۔",
        reference: "Hadith: Sahih Bukhari"
    },
    {
        arabic: "مَنْ لَّا يَرْحَمْ لَا يُرْحَمْ",
        urdu: "جو رحم نہیں کرتا، اس پر رحم نہیں کیا جاتا۔",
        reference: "Hadith: Sahih Muslim"
    },
    {
        arabic: "اِنَّ اللّٰهَ طَيِّبٌ يُحِبُّ الطَّيِّبَ",
        urdu: "بے شک اللہ پاک ہے اور پاکیزگی کو پسند فرماتا ہے۔",
        reference: "Hadith: Tirmidhi"
    },
    {
        arabic: "اَلسَّلَامُ قَبْلَ الْكَلَامِ",
        urdu: "بات کرنے سے پہلے سلام کرو۔",
        reference: "Hadith: Tirmidhi"
    }
];

const VerseBox = () => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const SLIDE_DURATION = 30000;

    const handleNext = useCallback(() => {
        setCurrentIndex((prev) => (prev + 1) % VERSES.length);
        setProgress(0);
    }, []);

    const handlePrev = useCallback(() => {
        setCurrentIndex((prev) => (prev - 1 + VERSES.length) % VERSES.length);
        setProgress(0);
    }, []);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (!isPaused) {
            timer = setInterval(() => {
                setProgress((prev) => {
                    if (prev >= 100) {
                        handleNext();
                        return 0;
                    }
                    return prev + (100 / (SLIDE_DURATION / 100));
                });
            }, 100);
        }
        return () => clearInterval(timer);
    }, [isPaused, handleNext]);

    return (
        <div 
            className="relative w-full max-w-lg mx-auto group"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            {/* Main Sharp Fixed Box */}
            <div className="relative overflow-hidden bg-white/95 dark:bg-neutral-900/95 border border-emerald-300/50 dark:border-emerald-800/50 rounded-none shadow-lg h-[180px] flex flex-col justify-center px-4 py-6 transition-all duration-300">
                
                {/* Navigation Buttons - Always Shown with Light Outlines */}
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none z-20 px-2">
                    <button 
                        onClick={handlePrev}
                        className="p-2 bg-white/40 dark:bg-neutral-800/40 border border-emerald-300/60 dark:border-emerald-700/60 text-emerald-900/60 dark:text-emerald-350 pointer-events-auto transition-all hover:bg-emerald-800 hover:text-white hover:border-emerald-800 rounded-none shadow-sm"
                        title="Previous"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={handleNext}
                        className="p-2 bg-white/40 dark:bg-neutral-800/40 border border-emerald-300/60 dark:border-emerald-700/60 text-emerald-900/60 dark:text-emerald-350 pointer-events-auto transition-all hover:bg-emerald-800 hover:text-white hover:border-emerald-800 rounded-none shadow-sm"
                        title="Next"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                <div className="h-full flex flex-col justify-center overflow-hidden">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentIndex}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                            className="flex flex-col items-center text-center space-y-2 px-10"
                        >
                            {/* Arabic Text - Auto-adjusting feel with clamp and balance */}
                            <h2 
                                className="text-lg sm:text-xl md:text-2xl text-emerald-950 dark:text-emerald-200 leading-tight text-wrap-balance" 
                                style={{ 
                                    fontFamily: 'var(--font-amiri), serif', 
                                    direction: 'rtl'
                                }}
                            >
                                {VERSES[currentIndex].arabic}
                            </h2>

                            {/* Urdu Translation - Compact & Clean */}
                            <p 
                                className="text-[10px] sm:text-xs md:text-sm text-slate-600 dark:text-neutral-300 leading-relaxed font-medium text-wrap-balance"
                                style={{ direction: 'rtl' }}
                            >
                                {VERSES[currentIndex].urdu}
                            </p>

                            {/* Reference - Minimalist Footer */}
                            <div className="pt-2">
                                <span className="text-[8px] sm:text-[9px] font-bold text-emerald-900/40 dark:text-emerald-400/40 tracking-widest uppercase border-t border-emerald-200/30 dark:border-emerald-800/30 pt-1">
                                    {VERSES[currentIndex].reference}
                                </span>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Minimalist Progress Bar */}
                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-emerald-50/50">
                    <motion.div 
                        className="h-full bg-emerald-500/80"
                        style={{ width: `${progress}%` }}
                        transition={{ duration: 0.1, ease: "linear" }}
                    />
                </div>
            </div>

            {/* Subtle Status Indicator */}
            <AnimatePresence>
                {isPaused && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-emerald-800 text-white rounded-none shadow-sm flex items-center justify-center z-30"
                    >
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default VerseBox;
