import { signInWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

const SESSION_KEY = 'session_expiry';
const BIOMETRIC_CREDENTIALS_KEY = 'biometric_credentials';

export const AuthService = {
    login: async (email, password, rememberMe = true) => {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Session Persistence Logic
            const sessionDuration = rememberMe
                ? 7 * 24 * 60 * 60 * 1000  // 7 Days
                : 24 * 60 * 60 * 1000;     // 1 Day

            const expiryTime = Date.now() + sessionDuration;
            await AsyncStorage.setItem(SESSION_KEY, expiryTime.toString());

            // Sync User to Firestore
            try {
                await setDoc(doc(db, "users", user.uid), {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName || null,
                    lastLogin: new Date().toISOString()
                }, { merge: true });
            } catch (fsError) {
                console.log("Firestore Sync Error:", fsError);
            }

            return user;
        } catch (error) {
            throw error;
        }
    },

    logout: async () => {
        try {
            await AsyncStorage.removeItem(SESSION_KEY);
            await signOut(auth);
        } catch (error) {
            throw error;
        }
    },

    updateProfile: async (user, displayName) => {
        try {
            // 1. Update Auth Profile
            await updateProfile(user, { displayName });

            // 2. Sync to Firestore
            await setDoc(doc(db, "users", user.uid), {
                displayName,
                email: user.email,
                uid: user.uid,
                lastUpdated: new Date().toISOString()
            }, { merge: true });

            return { ...user, displayName };
        } catch (error) {
            throw error;
        }
    },

    checkSession: async () => {
        try {
            const expiry = await AsyncStorage.getItem(SESSION_KEY);
            if (expiry && Date.now() > parseInt(expiry)) {
                await AuthService.logout();
                return false;
            }
            return true;
        } catch (error) {
            return false;
        }
    },

    // Biometric Helpers (Using SecureStore for security)
    enableBiometric: async (email, password) => {
        try {
            const credentials = JSON.stringify({ email, password });
            await SecureStore.setItemAsync(BIOMETRIC_CREDENTIALS_KEY, credentials);
        } catch (error) {
            console.error("Biometric Save Error", error);
        }
    },

    getBiometricCredentials: async () => {
        try {
            const json = await SecureStore.getItemAsync(BIOMETRIC_CREDENTIALS_KEY);
            return json ? JSON.parse(json) : null;
        } catch (error) {
            return null;
        }
    },

    disableBiometric: async () => {
        await SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIALS_KEY);
    }
};
