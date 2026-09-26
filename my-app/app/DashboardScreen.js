import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert, Modal, KeyboardAvoidingView, Platform, ActivityIndicator, InteractionManager } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ScanLine, Users, History, ChevronRight, LogOut, TrendingUp, Cloud, Edit2, UserPlus, CheckCircle2, Calendar, X } from 'lucide-react-native';
import { collection, query, where, onSnapshot, getCountFromServer } from 'firebase/firestore';
import * as Haptics from 'expo-haptics';

import { auth, db } from '../lib/firebase';
import { COLORS } from '../theme/colors';

import { AuthService } from '../services/auth.service';
import { AttendanceService } from '../services/attendance.service';
import { StudentService } from '../services/student.service';
import { HolidayService } from '../services/holiday.service';
import { getLocalDateString } from '../lib/date.utils';
import { useAlert } from '../context/AlertContext';
import { ALERT_TYPES } from '../components/CustomAlert';

import Skeleton from '../components/Skeleton';
import InputField from '../components/InputField';
import PrimaryButton from '../components/PrimaryButton';
import AttendanceChart from '../components/AttendanceChart';

// Optimized Stats Card
const StatsCard = React.memo(({ title, count, icon, color, subtext, onPress, loading }) => (
    <TouchableOpacity
        className="flex-1 bg-white/10 p-3 rounded-2xl border border-white/10 backdrop-blur-md active:bg-white/20"
        onPress={onPress}
    >
        <View className="flex-row items-center space-x-2 mb-3">
            <View className={`p-1.5 rounded-lg ${color === 'emerald' ? 'bg-emerald-400/20' : 'bg-blue-400/20'}`}>
                {icon}
            </View>
            <Text className="text-emerald-50 font-medium">{title}</Text>
        </View>
        {loading ? (
            <Skeleton width={60} height={36} />
        ) : (
            <Text className="text-3xl font-black text-white">{count}</Text>
        )}
        <Text className="text-emerald-200/60 text-xs mt-1">{subtext}</Text>
    </TouchableOpacity>
));

export default function DashboardScreen() {
    const navigation = useNavigation();

    // Stats
    const [todayPresent, setTodayPresent] = useState(0);
    const [totalStudents, setTotalStudents] = useState(0);
    const [nextHoliday, setNextHoliday] = useState(null);

    // UI States
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showNameModal, setShowNameModal] = useState(false);

    // Sync States
    const [isSyncing, setIsSyncing] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);

    // User State
    const [user, setUser] = useState(auth.currentUser);
    const [newName, setNewName] = useState('');
    const [updatingName, setUpdatingName] = useState(false);
    const { showAlert } = useAlert();

    useEffect(() => {
        if (auth.currentUser && !auth.currentUser.displayName) {
            setShowNameModal(true);
        }
        setUser(auth.currentUser);

        InteractionManager.runAfterInteractions(() => {
            loadInitialData();
        });
    }, []);

    const loadInitialData = async () => {
        await Promise.all([
            fetchTotals(),
            checkPendingSync(),
            fetchNextHoliday()
        ]);
        setLoading(false);
    };

    const checkPendingSync = async () => {
        const count = await AttendanceService.getPendingCount();
        setPendingCount(count);
    };

    const fetchTotals = async () => {
        const students = await StudentService.fetchAll();
        if (students) setTotalStudents(students.length);
    };

    const fetchNextHoliday = async () => {
        const holidays = await HolidayService.getHolidays();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const sorted = Object.values(holidays)
            .map(h => ({ ...h, dateObj: new Date(h.date) }))
            .filter(h => h.dateObj >= today)
            .sort((a, b) => a.dateObj - b.dateObj);

        if (sorted.length > 0) {
            setNextHoliday(sorted[0]);
        } else {
            setNextHoliday(null);
        }
    };

    // Re-fetch holidays when screen is focused (e.g. coming back from HolidaysScreen)
    useFocusEffect(
        useCallback(() => {
            fetchNextHoliday();
        }, [])
    );

    // Realtime Attendance Listener
    useEffect(() => {
        const today = getLocalDateString();
        const attendanceQ = query(collection(db, "daily_attendance"), where("date", "==", today));

        const unsubscribe = onSnapshot(attendanceQ, (snapshot) => {
            setTodayPresent(snapshot.size);
        }, (error) => {
            // silent error
        });

        return () => unsubscribe();
    }, []);

    const handleNavigateAttendance = useCallback(() => {
        navigation.navigate('AttendanceList');
    }, [navigation]);

    const handleNavigateStudentList = useCallback(() => {
        navigation.navigate('StudentList');
    }, [navigation]);

    const handleNavigateScanner = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        navigation.navigate('Scanner');
    }, [navigation]);

    const handleNavigateHolidays = useCallback(() => {
        navigation.navigate('Holidays');
    }, [navigation]);

    const onRefresh = async () => {
        setRefreshing(true);
        // Force refresh count from server
        const today = getLocalDateString();
        const attendanceQ = query(collection(db, "daily_attendance"), where("date", "==", today));
        const snapshot = await getCountFromServer(attendanceQ);
        setTodayPresent(snapshot.data().count);

        await fetchTotals();
        await checkPendingSync();
        setRefreshing(false);
    };

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const result = await AttendanceService.sync();
            if (result > 0) {
                showAlert({ title: "Sync Complete", message: `Successfully uploaded ${result} records.`, type: ALERT_TYPES.SUCCESS });
            } else {
                showAlert({ title: "Up to Date", message: "No pending records to sync.", type: ALERT_TYPES.INFO });
            }
            await checkPendingSync();
        } catch (error) {
            showAlert({ title: "Sync Failed", message: "Check internet connection.", type: ALERT_TYPES.ERROR });
        } finally {
            setIsSyncing(false);
        }
    };

    const handleUpdateName = async () => {
        if (!newName.trim()) return;
        setUpdatingName(true);
        try {
            const updatedUser = await AuthService.updateProfile(auth.currentUser, newName);
            setUser(updatedUser);
            setShowNameModal(false);
            showAlert({ title: "Success", message: "Profile updated!", type: ALERT_TYPES.SUCCESS });
        } catch (error) {
            console.error(error);
            showAlert({ title: "Error", message: "Could not update name.", type: ALERT_TYPES.ERROR });
        } finally {
            setUpdatingName(false);
        }
    };

    const handleLogout = async () => {
        try {
            setShowProfileModal(false);
            await AuthService.logout();
            navigation.replace("Login");
        } catch (error) {
            showAlert({ title: "Error", message: "Failed to logout", type: ALERT_TYPES.ERROR });
        }
    };

    return (
        <View className="flex-1 bg-gray-50">
            {/* Content Body */}
            <ScrollView
                className="flex-1 bg-gray-50"
                contentContainerStyle={{ paddingBottom: 40 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} progressViewOffset={10} />}
                showsVerticalScrollIndicator={false}
                stickyHeaderIndices={[0]}
            >
                {/* Modern Gradient-like Header */}
                <View className={`bg-emerald-700 pt-12 pb-5 px-5 rounded-b-[32px] mb-5 relative overflow-hidden ${Platform.OS === 'ios' ? 'shadow-xl shadow-emerald-900/20' : 'elevation-5'}`}>
                    {/* Decorative Circles */}
                    <View className="absolute top-0 right-0 w-64 h-64 bg-emerald-600 rounded-full -mr-16 -mt-16 opacity-50" />
                    <View className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500 rounded-full -ml-10 -mb-10 opacity-30" />

                    <View className="flex-row justify-between items-start mb-5 relative z-10">
                        <View>
                            <Text className="text-emerald-100 text-xs font-medium tracking-wider uppercase">Today's Overview</Text>
                            <Text className="text-2xl font-extrabold text-white mt-0.5 tracking-tight">Dashboard</Text>
                        </View>

                        <View className="flex-row items-center space-x-3">
                            {/* Cloud Sync Button */}
                            <TouchableOpacity
                                onPress={handleSync}
                                disabled={isSyncing}
                                className={`p-2.5 rounded-2xl border ${pendingCount > 0 ? 'bg-amber-500/20 border-amber-400/50' : 'bg-white/10 border-white/20'}`}
                            >
                                {isSyncing ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <View>
                                        <Cloud color={pendingCount > 0 ? '#FBBF24' : 'white'} size={24} />
                                        {pendingCount > 0 && (
                                            <View className="absolute -top-1.5 -right-1.5 bg-red-500 w-4 h-4 rounded-full border-2 border-emerald-700 items-center justify-center">
                                                <Text className="text-[8px] text-white font-bold">{pendingCount}</Text>
                                            </View>
                                        )}
                                    </View>
                                )}
                            </TouchableOpacity>

                            {/* Profile Button */}
                            <TouchableOpacity
                                onPress={() => setShowProfileModal(true)}
                                className="bg-white/10 p-2.5 rounded-2xl border border-white/20 active:bg-white/20"
                            >
                                <Users color="white" size={24} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Stats Cards in Header */}
                    <View className="relative z-10 ">
                        {/* Row 1: Key Metrics (Present & Total) */}
                        <View className="flex-row">
                            {/* Present Card */}
                            {/* Present Card */}
                            <StatsCard
                                title="Present"
                                count={todayPresent}
                                icon={<CheckCircle2 color="#34D399" size={16} />}
                                color="emerald"
                                subtext="Checked in today"
                                onPress={handleNavigateAttendance}
                                loading={loading && todayPresent === 0}
                            />

                            {/* Spacer */}
                            <View style={{ width: 12 }} />

                            {/* Total Card */}
                            <StatsCard
                                title="Total"
                                count={totalStudents}
                                icon={<Users color="#60A5FA" size={16} />}
                                color="blue"
                                subtext="Registered students"
                                onPress={handleNavigateStudentList}
                                loading={loading}
                            />
                        </View>
                    </View>
                </View>

                <View className="px-6">
                    {/* Upcoming Holiday Banner (Outside Header) */}
                    {nextHoliday && nextHoliday.name && (
                        <TouchableOpacity
                            className="bg-amber-50 p-4 rounded-2xl border border-amber-200 mb-5 flex-row items-center justify-between active:bg-amber-100"
                            onPress={handleNavigateHolidays}
                        >
                            <View className="flex-row items-center flex-1">
                                <View className="bg-amber-100 p-2.5 rounded-xl mr-3">
                                    <Calendar color="#D97706" size={22} />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-amber-800 text-[10px] font-bold uppercase tracking-wider">Upcoming Holiday</Text>
                                    <Text className="text-amber-900 font-bold text-base" numberOfLines={1}>{nextHoliday.name}</Text>
                                </View>
                            </View>
                            <View className="bg-amber-200 px-3 py-1.5 rounded-lg">
                                <Text className="text-amber-900 font-bold text-sm">
                                    {Math.ceil((new Date(nextHoliday.date) - new Date()) / (1000 * 60 * 60 * 24))}d
                                </Text>
                            </View>
                        </TouchableOpacity>
                    )}

                    <Text className="text-lg font-bold text-gray-800 mb-5">Quick Actions</Text>

                    <View className="flex-row justify-between mb-6">
                        <TouchableOpacity
                            className="w-[48%] bg-white p-6 rounded-[24px] items-center shadow-lg shadow-gray-200 border border-gray-50 active:scale-95 transition-transform"
                            onPress={handleNavigateScanner}
                        >
                            <View className="bg-emerald-50 p-5 rounded-full mb-4 group-active:bg-emerald-100">
                                <ScanLine color={COLORS.primary} size={32} strokeWidth={2.5} />
                            </View>
                            <Text className="text-gray-900 font-bold text-base">Scan QR</Text>
                            <Text className="text-gray-400 text-xs mt-1 text-center">Mark attendance</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="w-[48%] bg-white p-6 rounded-[24px] items-center shadow-lg shadow-gray-200 border border-gray-50 active:scale-95 transition-transform"
                            onPress={handleNavigateStudentList}
                        >
                            <View className="bg-blue-50 p-5 rounded-full mb-4 group-active:bg-blue-100">
                                <Users color="#3B82F6" size={32} strokeWidth={2.5} />
                            </View>
                            <Text className="text-gray-900 font-bold text-base">Directory</Text>
                            <Text className="text-gray-400 text-xs mt-1 text-center">View all students</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Holiday Button */}
                    <TouchableOpacity
                        className={`w-full bg-white p-5 rounded-[24px] flex-row items-center border border-gray-50 mb-4 active:opacity-90 ${Platform.OS === 'ios' ? 'shadow-lg shadow-gray-200' : 'elevation-2'}`}
                        onPress={handleNavigateHolidays}
                    >
                        <View className="bg-amber-50 p-4 rounded-2xl mr-4">
                            <Calendar color="#D97706" size={24} strokeWidth={2.5} />
                        </View>
                        <View className="flex-1">
                            <Text className="text-gray-900 font-bold text-lg">Events & Holidays</Text>
                            <Text className="text-gray-500 text-sm">Manage school calendar</Text>
                        </View>
                        <View className="bg-gray-50 p-2 rounded-full">
                            <ChevronRight color="#9CA3AF" size={20} />
                        </View>
                    </TouchableOpacity>

                    {/* Full Width Action */}
                    <TouchableOpacity
                        className={`w-full bg-white p-5 rounded-[24px] flex-row items-center border border-gray-50 mb-10 active:opacity-90 ${Platform.OS === 'ios' ? 'shadow-lg shadow-gray-200' : 'elevation-2'}`}
                        onPress={handleNavigateAttendance}
                    >
                        <View className="bg-purple-50 p-4 rounded-2xl mr-4">
                            <History color="#8B5CF6" size={24} strokeWidth={2.5} />
                        </View>
                        <View className="flex-1">
                            <Text className="text-gray-900 font-bold text-lg">History Log</Text>
                            <Text className="text-gray-500 text-sm">View past dates & records</Text>
                        </View>
                        <View className="bg-gray-50 p-2 rounded-full">
                            <ChevronRight color="#9CA3AF" size={20} />
                        </View>
                    </TouchableOpacity>

                    {/* Attendance Chart (Moved to Bottom) */}
                    <AttendanceChart />

                    <View className="mb-8 items-center opacity-50 px-6">
                        <Text className="text-gray-500 text-[10px] font-bold tracking-widest uppercase text-center mb-1">
                            Built with 🏫 by Abdul Rafay Naeem
                        </Text>
                        <Text className="text-gray-400 text-[9px] font-medium text-center leading-4">
                            Supervised by Al-Ghazali High School & Mahad Usman Bin Affan
                        </Text>
                        <Text className="text-gray-400 text-[8px] mt-1">v11.3.9</Text>
                    </View>
                    <View className="h-4" />
                </View>
            </ScrollView>

            {/* Profile Modal */}
            {/* Profile Modal */}
            <Modal
                transparent={true}
                visible={showProfileModal}
                animationType="fade"
                statusBarTranslucent
                onRequestClose={() => setShowProfileModal(false)}
            >
                <View className="flex-1 bg-black/60 justify-center items-center px-6">
                    <View className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl relative">

                        {/* Close Button */}
                        <TouchableOpacity
                            onPress={() => setShowProfileModal(false)}
                            className="absolute top-5 right-5 z-10 p-2 bg-gray-50 rounded-full border border-gray-100"
                        >
                            <X size={20} color={COLORS.gray} />
                        </TouchableOpacity>

                        {/* Header Section */}
                        <View className="items-center mb-8 mt-2">
                            <View className="bg-emerald-50 p-4 rounded-full mb-4 border-4 border-emerald-100">
                                <Users color={COLORS.primary} size={36} strokeWidth={2.5} />
                            </View>
                            <Text className="text-xl font-bold text-gray-900 text-center">{user?.displayName || "Admin User"}</Text>
                            <Text className="text-sm text-gray-500 text-center mt-1">{user?.email || "No Email Associated"}</Text>
                        </View>

                        {/* Menu Options */}
                        <View className="space-y-3">
                            <TouchableOpacity
                                onPress={() => {
                                    setShowProfileModal(false);
                                    // Small delay to allow modal to close before opening next one
                                    setTimeout(() => {
                                        setNewName(user?.displayName || '');
                                        setShowNameModal(true);
                                    }, 100);
                                }}
                                className="flex-row items-center bg-gray-50 p-4 rounded-2xl active:bg-gray-100 border border-gray-100"
                            >
                                <View className="bg-white p-2 rounded-xl mr-3 shadow-sm">
                                    <Edit2 size={18} color="#4B5563" />
                                </View>
                                <Text className="flex-1 text-gray-700 font-semibold text-base">Edit Profile Name</Text>
                                <ChevronRight size={18} color="#9CA3AF" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => {
                                    setShowProfileModal(false);
                                    navigation.navigate('About');
                                }}
                                className="flex-row items-center bg-gray-50 p-4 rounded-2xl active:bg-gray-100 border border-gray-100"
                            >
                                <View className="bg-white p-2 rounded-xl mr-3 shadow-sm">
                                    <Users size={18} color="#4B5563" />
                                </View>
                                <Text className="flex-1 text-gray-700 font-semibold text-base">About & Credits</Text>
                                <ChevronRight size={18} color="#9CA3AF" />
                            </TouchableOpacity>

                            <View className="h-px bg-gray-100 my-2" />

                            <TouchableOpacity
                                onPress={handleLogout}
                                className="flex-row items-center bg-red-50 p-4 rounded-2xl active:bg-red-100 border border-red-100"
                            >
                                <View className="bg-white p-2 rounded-xl mr-3 shadow-sm">
                                    <LogOut size={18} color="#EF4444" />
                                </View>
                                <Text className="text-red-900 font-bold text-base">Sign Out</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Name Edit Modal */}
            <Modal visible={showNameModal} transparent animationType="fade" statusBarTranslucent onRequestClose={() => { if (auth.currentUser?.displayName) setShowNameModal(false) }}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                    <View className="flex-1 bg-black/60 justify-center items-center px-6">
                        <View className="bg-white p-6 rounded-3xl w-full shadow-2xl relative">
                            {/* Close Button (Always visible) */}
                            <TouchableOpacity
                                onPress={() => {
                                    if (auth.currentUser?.displayName) {
                                        setShowNameModal(false);
                                    } else {
                                        handleLogout();
                                    }
                                }}
                                className="absolute top-4 right-4 z-10 p-2 bg-gray-100 rounded-full"
                            >
                                <X size={20} color={COLORS.gray} />
                            </TouchableOpacity>

                            <Text className="text-xl font-bold text-gray-900 text-center mb-2 mt-2">Update Profile</Text>
                            <Text className="text-gray-500 text-center text-sm mb-6">Enter your name for the display.</Text>

                            <InputField
                                placeholder="Full Name"
                                value={newName}
                                onChangeText={setNewName}
                                icon={<Users size={20} color={COLORS.gray} />}
                            />

                            <View className="mt-6">
                                <PrimaryButton title="Save Changes" onPress={handleUpdateName} isLoading={updatingName} />
                            </View>

                            {!auth.currentUser?.displayName && (
                                <Text className="text-red-400 text-xs text-center mt-4">* Name is required</Text>
                            )}
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}
