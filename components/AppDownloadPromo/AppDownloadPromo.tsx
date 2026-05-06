"use client";

import { useEffect } from 'react';
import { toast } from 'sonner';
import { Smartphone } from 'lucide-react';

const AppDownloadPromo = () => {
  const appUrl = process.env.NEXT_PUBLIC_MOBILE_APP_URL || '#';

  useEffect(() => {
    const STORAGE_KEY = 'lastAppPromoShownDate';
    const today = new Date().toDateString(); // e.g., "Fri May 01 2026"
    const lastShownDate = localStorage.getItem(STORAGE_KEY);

    if (lastShownDate === today) {
      return;
    }

    // Show after 5 seconds to be non-intrusive
    const timer = setTimeout(() => {
      toast("Al Ghazali Mobile App", {
        description: "Fast, Secure & Official Access. Get the best experience on your phone.",
        icon: <Smartphone className="w-5 h-5 text-blue-600" />,
        action: {
          label: "Download",
          onClick: () => window.open(appUrl, '_blank')
        },
        duration: 6000, // Show for 6 seconds
      });
      localStorage.setItem(STORAGE_KEY, today);
    }, 5000);

    return () => clearTimeout(timer);
  }, [appUrl]);

  // This component now only handles logic, no persistent UI
  return null;
};

export default AppDownloadPromo;

