import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Dimensions, Image, Animated, ActivityIndicator, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Mail, Lock, Eye, EyeOff, User, School, CreditCard, ChevronRight, CheckSquare, Square, Fingerprint } from 'lucide-react-native';
import * as LocalAuthentication from 'expo-local-authentication';

import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { authenticateStudent } from '../lib/sanity';
import { useAuth } from '../context/AuthContext';
import { AuthService } from '../services/auth.service';
import { COLORS } from '../theme/colors';
import InputField from '../components/InputField';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
    const navigation = useNavigation();
    const { loginStudent } = useAuth();

    // Mode: 'teacher' | 'student'
    const [mode, setMode] = useState('teacher');

    // Teacher Inputs
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    // Student Inputs
    const [grNumber, setGrNumber] = useState('');
    const [cnic, setCnic] = useState('');
    // showCnic removed per user request

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Biometric State
    const [isBiometricSupported, setIsBiometricSupported] = useState(false);

    // Refs
    const passwordRef = useRef(null);
    const cnicRef = useRef(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();

        checkBiometricAvailability();
    }, []);

    // --- Biometric Logic (Restored) ---
    const checkBiometricAvailability = async () => {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        const credentials = await AuthService.getBiometricCredentials();

        if (compatible && enrolled && credentials) {
            setIsBiometricSupported(true);
            // User requested exactly like before, checking on mount
            handleBiometricLogin();
        }
    };

    const handleBiometricLogin = async () => {
        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Login with Biometrics',
                disableDeviceFallback: false,
            });

            if (result.success) {
                const credentials = await AuthService.getBiometricCredentials();
                if (credentials) {
                    setEmail(credentials.email);
                    setPassword(credentials.password);
                    setLoading(true);
                    // Slight delay to show fields filled
                    setTimeout(() => autoLogin(credentials.email, credentials.password), 500);
                }
            }
        } catch (err) {
            console.log(err);
        }
    };

    const autoLogin = async (e, p) => {
        try {
            await AuthService.login(e, p, true);
            navigation.replace('Dashboard');
        } catch (error) {
            setError("Biometric Login Failed. Please enter password manually.");
            setLoading(false);
        }
    };
    // ----------------------------------

    const handleCnicChange = (text) => {
        // Remove non-numeric characters
        const cleaned = text.replace(/[^0-9]/g, '');

        // Format as xxxxx-xxxxxxx-x
        let formatted = cleaned;
        if (cleaned.length > 5) {
            formatted = cleaned.slice(0, 5) + '-' + cleaned.slice(5);
        }
        if (cleaned.length > 12) {
            formatted = formatted.slice(0, 13) + '-' + formatted.slice(13);
        }

        // Limit to standard CNIC length (15 including dashes)
        if (formatted.length > 15) {
            formatted = formatted.slice(0, 15);
        }

        setCnic(formatted);
        setError(null);
    };

    const handleTeacherLogin = async () => {
        if (!email || !password) {
            setError("Please fill in all fields");
            return;
        }
        setError(null);
        setLoading(true);
        try {
            await AuthService.login(email, password, rememberMe);

            if (rememberMe) {
                await AuthService.enableBiometric(email, password);
            }

            navigation.replace('Dashboard');
        } catch (err) {
            console.error(err);
            let msg = "Login failed. Please try again.";
            if (err.code === 'auth/invalid-email') msg = "Invalid email address.";
            if (err.code === 'auth/user-not-found') msg = "User not found.";
            if (err.code === 'auth/wrong-password') msg = "Incorrect password.";
            setLoading(false);
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleStudentLogin = async () => {
        if (!grNumber || !cnic) {
            setError("Please enter both GR Number and CNIC");
            return;
        }
        setError(null);
        setLoading(true);
        try {
            const student = await authenticateStudent(grNumber.trim(), cnic.trim());
            if (student) {
                const success = await loginStudent(student);
                if (success) {
                    navigation.replace('StudentDashboard');
                } else {
                    setError("Could not create session. Please try again.");
                }
            } else {
                setError("Student not found! Check GR or CNIC.");
            }
        } catch (err) {
            console.error(err);
            setError("Network error. Please check your connection.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View className="flex-1 px-8 justify-center pt-6">
                        {/* Header Section */}
                        <Animated.View style={{ opacity: fadeAnim, alignItems: 'center', marginBottom: 30 }}>
                            <View className="bg-emerald-50 p-4 rounded-full mb-6 shadow-sm shadow-emerald-100">
                                <Image
                                    source={require('../assets/logo.png')}
                                    style={{ width: 120, height: 120 }}
                                    resizeMode="contain"
                                />
                            </View>
                            <Text className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight text-center">
                                Welcome Back
                            </Text>
                            <Text className="text-gray-500 text-base text-center font-medium px-4">
                                Manage attendance efficiently for <Text className="text-emerald-600 font-bold">Al-Ghazali High School</Text>
                            </Text>
                        </Animated.View>

                        {/* Main Interaction Area */}
                        <Animated.View style={{ opacity: fadeAnim }} className="space-y-6">

                            {/* Role Switcher */}
                            <View className="flex-row bg-gray-50 p-1 rounded-xl mb-4 border border-gray-100">
                                <TouchableOpacity
                                    onPress={() => { setMode('teacher'); setError(null); }}
                                    className={`flex-1 py-3 rounded-lg items-center flex-row justify-center space-x-2 transition-all ${mode === 'teacher' ? 'bg-white shadow-sm' : ''}`}
                                >
                                    <School size={18} color={mode === 'teacher' ? COLORS.primary : '#9CA3AF'} />
                                    <Text className={`font-bold text-sm ${mode === 'teacher' ? 'text-gray-900' : 'text-gray-400'}`}>Teacher</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => { setMode('student'); setError(null); }}
                                    className={`flex-1 py-3 rounded-lg items-center flex-row justify-center space-x-2 transition-all ${mode === 'student' ? 'bg-white shadow-sm' : ''}`}
                                >
                                    <User size={18} color={mode === 'student' ? COLORS.primary : '#9CA3AF'} />
                                    <Text className={`font-bold text-sm ${mode === 'student' ? 'text-gray-900' : 'text-gray-400'}`}>Student</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Error Message */}
                            {error && (
                                <View className="bg-red-50 p-4 rounded-xl border border-red-100 flex-row items-center justify-center">
                                    <View className="w-2 h-2 rounded-full bg-red-500 mr-2" />
                                    <Text className="text-red-600 font-medium text-sm">{error}</Text>
                                </View>
                            )}

                            {/* Inputs */}
                            <View className="space-y-4">
                                {mode === 'teacher' ? (
                                    <>
                                        <View>
                                            <Text className="text-gray-700 font-bold mb-2 ml-1 text-sm uppercase tracking-wide">Email Address</Text>
                                            <InputField
                                                placeholder="name@school.edu"
                                                value={email}
                                                onChangeText={(t) => { setEmail(t); setError(null); }}
                                                keyboardType="email-address"
                                                icon={<Mail size={20} color={COLORS.gray} />}
                                                autoCapitalize="none"
                                                returnKeyType="next"
                                                onSubmitEditing={() => passwordRef.current?.focus()}
                                                containerStyle={{ borderRadius: 12, backgroundColor: '#F9FAFB' }}
                                            />
                                        </View>
                                        <View>
                                            <Text className="text-gray-700 font-bold mb-2 ml-1 text-sm uppercase tracking-wide">Password</Text>
                                            <InputField
                                                ref={passwordRef}
                                                placeholder="Enter your password"
                                                value={password}
                                                onChangeText={(t) => { setPassword(t); setError(null); }}
                                                secureTextEntry={!showPassword}
                                                icon={<Lock size={20} color={COLORS.gray} />}
                                                returnKeyType="done"
                                                onSubmitEditing={handleTeacherLogin}
                                                containerStyle={{ borderRadius: 12, backgroundColor: '#F9FAFB' }}
                                                rightIcon={
                                                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                                        {showPassword ? <EyeOff size={20} color={COLORS.gray} /> : <Eye size={20} color={COLORS.gray} />}
                                                    </TouchableOpacity>
                                                }
                                            />
                                        </View>
                                        {/* Remember Me Toggle */}
                                        <View className="flex-row items-center justify-between mt-2">
                                            <TouchableOpacity
                                                activeOpacity={0.7}
                                                onPress={() => setRememberMe(!rememberMe)}
                                                className="flex-row items-center py-2"
                                            >
                                                {rememberMe ? <CheckSquare size={22} color={COLORS.primary} /> : <Square size={22} color={COLORS.gray} />}
                                                <Text className="ml-2 text-gray-600 font-semibold selection:text-emerald-500">Keep me logged in</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </>
                                ) : (
                                    <>
                                        <View>
                                            <Text className="text-gray-700 font-bold mb-2 ml-1 text-sm uppercase tracking-wide">GR Number</Text>
                                            <InputField
                                                placeholder="e.g. 4291"
                                                value={grNumber}
                                                onChangeText={(t) => { setGrNumber(t); setError(null); }}
                                                keyboardType="numeric"
                                                icon={<School size={20} color={COLORS.gray} />}
                                                returnKeyType="next"
                                                onSubmitEditing={() => cnicRef.current?.focus()}
                                                containerStyle={{ borderRadius: 12, backgroundColor: '#F9FAFB' }}
                                            />
                                        </View>
                                        <View>
                                            <Text className="text-gray-700 font-bold mb-2 ml-1 text-sm uppercase tracking-wide">CNIC / B-Form</Text>
                                            <InputField
                                                ref={cnicRef}
                                                placeholder="xxxxx-xxxxxxx-x"
                                                value={cnic}
                                                onChangeText={handleCnicChange}
                                                keyboardType="numeric"
                                                maxLength={15}
                                                icon={<CreditCard size={20} color={COLORS.gray} />}
                                                returnKeyType="done"
                                                onSubmitEditing={handleStudentLogin}
                                                containerStyle={{ borderRadius: 12, backgroundColor: '#F9FAFB' }}
                                            />
                                            <Text className="text-[10px] text-gray-400 ml-1 mt-1.5 font-medium">* Enter Father's CNIC or B-Form Number</Text>
                                        </View>
                                    </>
                                )}
                            </View>

                            {/* Action Button */}
                            <TouchableOpacity
                                onPress={mode === 'teacher' ? handleTeacherLogin : handleStudentLogin}
                                disabled={loading}
                                className={`mt-4 bg-emerald-600 h-14 rounded-xl flex-row justify-center items-center shadow-md shadow-emerald-200 ${loading ? 'opacity-80' : ''}`}
                            >
                                {loading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text className="text-white font-bold text-lg">
                                        {mode === 'teacher' ? 'Sign In' : 'Check Profile'}
                                    </Text>
                                )}
                            </TouchableOpacity>

                            {/* Biometric Button (Teacher Only) */}
                            {mode === 'teacher' && isBiometricSupported && !loading && (
                                <View className="items-center mt-4">
                                    <TouchableOpacity
                                        onPress={handleBiometricLogin}
                                        className="bg-gray-100 p-4 rounded-full border border-gray-200"
                                    >
                                        <Fingerprint size={32} color={COLORS.primary} />
                                    </TouchableOpacity>
                                    <Text className="text-gray-400 text-xs mt-2 font-medium">Touch to Login</Text>
                                </View>
                            )}

                        </Animated.View>

                        {/* Footer */}
                        <View className="items-center mt-10 mb-6">
                            <Text className="text-gray-400 text-xs font-semibold">Developed by Abdul Rafay Khan</Text>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
