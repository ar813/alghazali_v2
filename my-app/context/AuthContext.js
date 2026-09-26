import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { StudentService } from '../services/student.service';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null); // 'teacher' | 'student'
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            setLoading(true);

            // 1. Check if Teacher is logged in via Firebase
            const firebaseUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
                if (firebaseUser) {
                    // Double check if we didn't manually set a student session
                    const storedRole = await AsyncStorage.getItem('user_role');

                    if (storedRole === 'student') {
                        // Current logic prioritizes Firebase, but if we have Student role explicitly set,
                        // we might want to respect that? 
                        // Actually, Firebase Auth is persistent. If teacher logged in, they are teacher.
                        setUser(firebaseUser);
                        setRole('teacher');
                        setLoading(false);
                    } else {
                        setUser(firebaseUser);
                        setRole('teacher');
                        setLoading(false);
                        await AsyncStorage.setItem('user_role', 'teacher');
                    }
                } else {
                    // 2. No Firebase User -> Check for Local Student Session
                    const storedRole = await AsyncStorage.getItem('user_role');
                    const storedStudent = await AsyncStorage.getItem('student_session');
                    const sessionExpiry = await AsyncStorage.getItem('session_expiry');

                    if (storedRole === 'student' && storedStudent && sessionExpiry) {
                        const now = Date.now();
                        if (now < parseInt(sessionExpiry)) {
                            setUser(JSON.parse(storedStudent));
                            setRole('student');
                        } else {
                            // Expired
                            await logout();
                        }
                    } else {
                        // No valid session
                        setUser(null);
                        setRole(null);
                    }
                    setLoading(false);
                }
            });

            return () => firebaseUnsubscribe();

        } catch (error) {
            console.error("Auth Check Failed:", error);
            setLoading(false);
        }
    };

    const loginStudent = async (studentData) => {
        try {
            // Set 24h Expiry
            const expiry = Date.now() + (24 * 60 * 60 * 1000);

            await AsyncStorage.setItem('user_role', 'student');
            await AsyncStorage.setItem('student_session', JSON.stringify(studentData));
            await AsyncStorage.setItem('session_expiry', String(expiry));

            setUser(studentData);
            setRole('student');
            return true;
        } catch (error) {
            console.error("Student Login Error:", error);
            return false;
        }
    };

    const logout = async () => {
        try {
            if (role === 'teacher') {
                await auth.signOut();
            }
            await AsyncStorage.removeItem('user_role');
            await AsyncStorage.removeItem('student_session');
            await AsyncStorage.removeItem('session_expiry');
            setUser(null);
            setRole(null);
        } catch (error) {
            console.error("Logout Error:", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, role, loading, loginStudent, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
