import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { syncOfflineData, getPendingAttendance, getOfflineQueue } from '../lib/offline';

export const AttendanceService = {
    sync: async () => {
        return await syncOfflineData();
    },

    getPendingCount: async () => {
        const queue = await getPendingAttendance();
        return queue.length;
    },

    getStudentHistory: async (grNumber) => {
        try {
            // Placeholder for 'db' if not imported globally.
            // You'll need to ensure 'db' (your Firestore instance) is accessible here.
            // For example, by importing it: import { db } from '../path/to/firebase';

            const historyRef = collection(db, "attendance", String(grNumber), "history");
            const q = query(historyRef); // You can add orderBy("date", "desc") here if needed
            const snapshot = await getDocs(q);

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error("Error fetching student history:", error);
            return [];
        }
    }
};
