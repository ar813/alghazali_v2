import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { db } from './firebase';
import { doc, setDoc } from 'firebase/firestore';

const STUDENTS_CACHE_KEY = 'students_cache';
const OFFLINE_QUEUE_KEY = 'offline_attendance_queue';

// --- Connectivity ---
export const isOnline = async () => {
    const state = await NetInfo.fetch();
    return state.isConnected && state.isInternetReachable;
};

// --- Student Caching ---
export const cacheStudents = async (students) => {
    try {
        await AsyncStorage.setItem(STUDENTS_CACHE_KEY, JSON.stringify(students));
        console.log(`Cached ${students.length} students locally.`);
    } catch (error) {
        console.error("Error caching students:", error);
    }
};

export const getCachedStudents = async () => {
    try {
        const json = await AsyncStorage.getItem(STUDENTS_CACHE_KEY);
        return json ? JSON.parse(json) : [];
    } catch (error) {
        console.error("Error fetching cached students:", error);
        return [];
    }
};

export const getStudentFromCache = async (grNumber) => {
    try {
        const students = await getCachedStudents();
        // Check string and number match just like Sanity Logic
        return students.find(s => s.grNumber == grNumber) || null;
    } catch (error) {
        return null;
    }
};

// --- Offline Queue ---
export const queueAttendance = async (record) => {
    try {
        const currentQueue = await getOfflineQueue();
        const newQueue = [...currentQueue, record];
        await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(newQueue));
        console.log("Queued offline record:", record.grNumber);
    } catch (error) {
        console.error("Error queuing attendance:", error);
    }
};

export const getOfflineQueue = async () => {
    try {
        const json = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
        return json ? JSON.parse(json) : [];
    } catch (error) {
        return [];
    }
};

export const getPendingAttendance = getOfflineQueue;

export const clearQueue = async () => {
    await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
};

// --- Sync Mechanism ---
export const syncOfflineData = async () => {
    const connected = await isOnline();
    if (!connected) return 0;

    const queue = await getOfflineQueue();
    if (queue.length === 0) return 0;

    console.log(`Syncing ${queue.length} offline records...`);
    let syncedCount = 0;
    const failedQueue = [];

    for (const record of queue) {
        try {
            // Re-construct logic to save to Firebase
            // 1. History Path
            const studentRef = doc(db, 'attendance', String(record.grNumber), 'history', record.date);
            await setDoc(studentRef, {
                status: 'present',
                timestamp: record.timestamp,
                studentName: record.studentName,
                class: record.class,
                grNumber: record.grNumber
            });

            // 2. Daily List Path
            const dailyRef = doc(db, 'daily_attendance', `${record.date}_${record.grNumber}`);
            await setDoc(dailyRef, {
                date: record.date,
                grNumber: record.grNumber,
                timestamp: record.timestamp,
                studentName: record.studentName,
                class: record.class,
                rollNumber: record.rollNumber,
                photoUrl: record.photoUrl
            });

            syncedCount++;
        } catch (error) {
            console.error("Failed to sync record:", record.grNumber, error);
            failedQueue.push(record); // Keep in queue if failed
        }
    }

    // Update queue with failed items (if any) or clear if all good
    if (failedQueue.length > 0) {
        await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(failedQueue));
    } else {
        await clearQueue();
    }

    return syncedCount;
};
