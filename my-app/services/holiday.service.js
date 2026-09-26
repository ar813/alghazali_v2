import { collection, doc, setDoc, deleteDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const HolidayService = {
    // Fetch all holidays
    getHolidays: async () => {
        try {
            const q = query(collection(db, "holidays"));
            const snapshot = await getDocs(q);
            const holidays = {};
            snapshot.forEach(doc => {
                holidays[doc.id] = { ...doc.data(), type: 'holiday' }; // doc.id is the date YYYY-MM-DD
            });
            return holidays;
        } catch (error) {
            console.error("Error fetching holidays:", error);
            return {};
        }
    },

    // Add a holiday
    addHoliday: async (date, name) => {
        try {
            await setDoc(doc(db, "holidays", date), {
                date,
                name,
                createdAt: new Date().toISOString()
            });
            return true;
        } catch (error) {
            console.error("Error adding holiday:", error);
            return false;
        }
    },

    // Remove a holiday
    removeHoliday: async (date) => {
        try {
            await deleteDoc(doc(db, "holidays", date));
            return true;
        } catch (error) {
            console.error("Error removing holiday:", error);
            return false;
        }
    }
};
