import { getAllStudents } from '../lib/sanity';
import { cacheStudents, getCachedStudents } from '../lib/offline';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export const StudentService = {
    fetchAll: async () => {
        try {
            // 1. Fetch from Sanity
            // 1. Fetch from Sanity & Firestore in Parallel
            let sanityStudents = [];
            let firestoreStudents = [];

            try {
                const results = await Promise.all([
                    getAllStudents().catch(e => { console.log("Sanity Error", e); return []; }),
                    getDocs(collection(db, "students")).catch(e => { console.log("Firestore Error", e); return { docs: [] }; })
                ]);

                sanityStudents = results[0];
                firestoreStudents = results[1].docs.map(doc => ({ _id: doc.id, ...doc.data() }));

            } catch (e) { console.log("Fetch Error", e); }

            // 2. Merge & Deduplicate
            const allStudentsMap = new Map();
            [...sanityStudents, ...firestoreStudents].forEach(s => {
                const id = s._id || s.grNumber;
                // Strict Filter: Must have ID/GR AND a Name
                if (id && s.fullName && s.fullName.trim() !== "") {
                    allStudentsMap.set(String(id), s);
                }
            });

            const mergedStudents = Array.from(allStudentsMap.values());

            if (mergedStudents.length > 0) {
                await cacheStudents(mergedStudents);
                return mergedStudents;
            }
        } catch (error) {
            console.warn("Using offline cache due to error:", error);
        }

        // Fallback to cache
        return await getCachedStudents();
    },

    getCached: async () => {
        return await getCachedStudents();
    }
};
