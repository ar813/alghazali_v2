"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User, signOut, updateProfile } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

interface AuthContextType {
    user: User | null;
    role: "admin" | "super_admin" | null;
    gender: "male" | "female" | null;
    photoURL: string | null;
    loading: boolean;
    isSuperAdmin: boolean;
    profileSetupRequired: boolean;
    logout: () => Promise<void>;
    updateName: (newName: string) => Promise<void>;
    updateEmail: (newEmail: string, newPassword: string) => Promise<void>;
    updatePassword: (newPassword: string) => Promise<void>;
    updateGender: (newGender: "male" | "female") => Promise<void>;
    updatePhoto: (file: File) => Promise<void>;
    removePhoto: () => Promise<void>;
    completeProfileSetup: (name: string, email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    role: null,
    gender: null,
    photoURL: null,
    loading: true,
    isSuperAdmin: false,
    profileSetupRequired: false,
    logout: async () => { },
    updateName: async () => { },
    updateEmail: async () => { },
    updatePassword: async () => { },
    updateGender: async () => { },
    updatePhoto: async () => { },
    removePhoto: async () => { },
    completeProfileSetup: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<"admin" | "super_admin" | null>(null);
    const [gender, setGender] = useState<"male" | "female" | null>(null);
    const [photoURL, setPhotoURL] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [profileSetupRequired, setProfileSetupRequired] = useState(false);

    useEffect(() => {
        let unsubscribeRole: (() => void) | undefined;

        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            setPhotoURL(currentUser?.photoURL || null);

            if (unsubscribeRole) {
                unsubscribeRole();
                unsubscribeRole = undefined;
            }

            if (currentUser) {
                unsubscribeRole = onSnapshot(doc(db, "users", currentUser.uid), (userDoc) => {
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        setRole(userData.role || "admin");
                        setGender(userData.gender || null);
                        setPhotoURL(userData.photoURL || currentUser.photoURL || null);
                        setProfileSetupRequired(userData.profileSetupRequired === true);
                    } else {
                        console.warn("User account deleted. Logging out.");
                        signOut(auth).then(() => {
                            setRole(null);
                            localStorage.removeItem("adminSession");
                        });
                        return;
                    }
                    setLoading(false);
                }, (error) => {
                    console.error("Error fetching user role:", error);
                    setRole(null);
                    setLoading(false);
                });
            } else {
                setRole(null);
                setPhotoURL(null);
                setProfileSetupRequired(false);
                setLoading(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeRole) unsubscribeRole();
        };
    }, []);

    const logout = async () => {
        try {
            await signOut(auth);
            localStorage.removeItem("adminSession");
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    const updateName = async (newName: string) => {
        if (!auth.currentUser) return;
        await updateProfile(auth.currentUser, { displayName: newName.trim() });
        const token = await auth.currentUser.getIdToken();
        const res = await fetch("/api/auth/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ displayName: newName.trim() })
        });
        if (!res.ok) throw new Error("Failed to update name on server");
        setUser({ ...auth.currentUser } as User);
    };

    const updateEmail = async (newEmail: string, newPassword: string) => {
        if (!auth.currentUser) return;
        const token = await auth.currentUser.getIdToken();
        const res = await fetch("/api/auth/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ email: newEmail, password: newPassword })
        });
        if (!res.ok) throw new Error("Failed to update email on server");
        setUser({ ...auth.currentUser } as User);
    };

    const updatePassword = async (newPassword: string) => {
        if (!auth.currentUser) return;
        const token = await auth.currentUser.getIdToken();
        const res = await fetch("/api/auth/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ password: newPassword })
        });
        if (!res.ok) throw new Error("Failed to update password on server");
    };

    const updateGender = async (newGender: "male" | "female") => {
        if (!auth.currentUser) return;
        const token = await auth.currentUser.getIdToken();
        const res = await fetch("/api/auth/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ gender: newGender })
        });
        if (!res.ok) throw new Error("Failed to update gender on server");
        setGender(newGender);
    };

    const completeProfileSetup = async (name: string, email: string, password: string) => {
        if (!auth.currentUser) return;
        const token = await auth.currentUser.getIdToken();
        const res = await fetch("/api/auth/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
                displayName: name.trim(),
                email,
                password,
                profileSetupRequired: false,
            })
        });
        if (!res.ok) throw new Error("Failed to complete profile setup");
        await updateProfile(auth.currentUser, { displayName: name.trim() });
        setProfileSetupRequired(false);
        // Sign out so user must log in fresh with their new credentials
        await signOut(auth);
        localStorage.removeItem("adminSession");
        localStorage.removeItem("adminCredentials");
        // Redirect after a short delay to show success screen
        setTimeout(() => {
            window.location.href = "/admin";
        }, 2000);
    };

    // Helper to compress image to base64
    const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 200;
                    const MAX_HEIGHT = 200;
                    let width = img.width;
                    let height = img.height;
                    if (width > height) {
                        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                    } else {
                        if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                };
            };
            reader.onerror = error => reject(error);
        });
    };

    const updatePhoto = async (file: File) => {
        if (!auth.currentUser) throw new Error("Not authenticated");
        const base64Photo = await compressImage(file);
        await updateProfile(auth.currentUser, { displayName: auth.currentUser.displayName });
        const token = await auth.currentUser.getIdToken();
        const res = await fetch("/api/auth/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ photoURL: base64Photo })
        });
        if (!res.ok) throw new Error("Failed to sync photo on server");
        setPhotoURL(base64Photo);
        setUser({ ...auth.currentUser } as User);
    };

    const removePhoto = async () => {
        if (!auth.currentUser) throw new Error("Not authenticated");
        await updateProfile(auth.currentUser, { displayName: auth.currentUser.displayName });
        const token = await auth.currentUser.getIdToken();
        const res = await fetch("/api/auth/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ photoURL: null })
        });
        if (!res.ok) throw new Error("Failed to remove photo on server");
        setPhotoURL(null);
        setUser({ ...auth.currentUser } as User);
    };

    const value = {
        user,
        role,
        gender,
        photoURL,
        loading,
        isSuperAdmin: role === "super_admin",
        profileSetupRequired,
        logout,
        updateName,
        updateEmail,
        updatePassword,
        updateGender,
        updatePhoto,
        removePhoto,
        completeProfileSetup,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
