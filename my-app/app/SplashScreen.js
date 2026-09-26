import React, { useEffect, useRef } from 'react';
import { View, Text, Image, Animated, Dimensions, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { auth } from '../lib/firebase';
import { COLORS } from '../theme/colors';

const { width } = Dimensions.get('window');

export default function SplashScreen() {
    const navigation = useNavigation();
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Fade In Logo
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
        }).start();

        // Check Auth Status & Session Validity
        const checkAuth = async () => {
            // Artificial delay for splash feeling (min 2 seconds)
            await new Promise(resolve => setTimeout(resolve, 2000));

            try {
                // 1. Check for Student Session first (Local)
                const role = await AsyncStorage.getItem('user_role');

                if (role === 'student') {
                    const expiry = await AsyncStorage.getItem('session_expiry');
                    const now = Date.now();

                    if (expiry && now < parseInt(expiry)) {
                        console.log("Valid Student Session");
                        navigation.replace('StudentDashboard');
                        return;
                    } else {
                        console.log("Student Session Expired");
                        await AsyncStorage.clear(); // Or selective clear
                        navigation.replace('Login');
                        return;
                    }
                }

                // 2. Check for Teacher Session (Firebase)
                // We trust onAuthStateChanged in AuthContext, but here we need a quick check.
                // Firebase automatically persists, so we can check currentUser or wait for observer.
                // However, splash screen usually finishes before AuthContext is fully ready if we wrap it.
                // Let's rely on the AuthContext logic which should already be running if we wrap App.
                // BUT, SplashScreen is a screen inside the stack.

                // Let's keep using onAuthStateChanged as a reliable check for Admin
                const unsubscribe = onAuthStateChanged(auth, async (user) => {
                    if (user) {
                        navigation.replace('Dashboard');
                    } else {
                        // Double check we didn't miss the student path above
                        navigation.replace('Login');
                    }
                });

                return unsubscribe;

            } catch (e) {
                console.error("Auth Check Error:", e);
                navigation.replace('Login');
            }
        };

        checkAuth();

    }, []);

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* Logo Section */}
            <Animated.View style={[styles.logoContainer, { opacity: fadeAnim }]}>
                {/* Removed Circle Container to blend logo with background */}
                <Image
                    source={require('../assets/logo.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
                <Text style={styles.schoolName}>AL-GHAZALI HIGH SCHOOL</Text>
                <Text style={styles.subtitle}>ATTENDANCE MANAGER</Text>
            </Animated.View>

            {/* Bottom Loader */}
            <View style={styles.bottomContainer}>
                {/* Round Activity Indicator (Dotted style on iOS, Circular on Android) */}
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF', // Pure White
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 80,
    },
    logo: {
        width: 180, // Slightly larger
        height: 180,
        marginBottom: 20,
    },
    schoolName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1F2937',
        textAlign: 'center',
        letterSpacing: 1,
    },
    subtitle: {
        marginTop: 8,
        fontSize: 14,
        color: '#9CA3AF',
        letterSpacing: 2,
        fontWeight: '500',
    },
    bottomContainer: {
        position: 'absolute',
        bottom: 80,
        alignItems: 'center',
    },
});
