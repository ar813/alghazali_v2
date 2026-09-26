import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { AttendanceService } from '../services/attendance.service';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { ArrowLeft, Calendar, CheckCircle, XCircle, Clock, BarChart2 } from 'lucide-react-native';
import { COLORS } from '../theme/colors';
import { StatusBar } from 'expo-status-bar';
import { AnimatedCircularProgress } from 'react-native-circular-progress';

export default function AttendanceHistoryScreen() {
    const navigation = useNavigation();
    const { user } = useAuth();
    const [attendanceHistory, setAttendanceHistory] = useState([]);
    const [stats, setStats] = useState({ present: 0, absent: 0, total: 0, percentage: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAttendance();
    }, []);

    const loadAttendance = async () => {
        if (!user?.grNumber) return;
        setLoading(true);
        try {
            // 1. Get Existing History (Present / Leaves)
            const history = await AttendanceService.getStudentHistory(user.grNumber);

            // 2. Get Class Sessions (to find Gap Absents)
            let validSessions = [];
            if (user.admissionFor) {
                try {
                    const sessionsRef = collection(db, 'class_sessions');
                    // Query for className as both string and potential number
                    const q = query(sessionsRef, where('className', 'in', [String(user.admissionFor), Number(user.admissionFor)]));
                    const snapshot = await getDocs(q);

                    const admissionDate = user.dateOfAdmission ? new Date(user.dateOfAdmission) : new Date(0);
                    const today = new Date();

                    validSessions = snapshot.docs
                        .map(doc => ({ id: doc.id, ...doc.data() }))
                        .filter(session => {
                            const d = new Date(session.date);
                            // Only count sessions from admission date up to TODAY
                            return d >= admissionDate && d <= today;
                        });

                    console.log(`[DEBUG] Valid Sessions Found: ${validSessions.length}`);
                } catch (e) {
                    console.error("Error fetching sessions:", e);
                }
            }

            // 3. Gap Analysis: Find dates in validSessions NOT in history
            // Create a Set of dates (YYYY-MM-DD string) that have attendance records
            const attendedDates = new Set(
                history.map(r => new Date(r.timestamp || r.date).toDateString())
            );

            const absentRecords = [];
            validSessions.forEach(session => {
                const sessionDate = new Date(session.date);
                const dateKey = sessionDate.toDateString();

                // If this session date is NOT in history, it's an absent
                // Also ensure we don't duplicate if there's somehow already an absent record in history (rare)
                if (!attendedDates.has(dateKey)) {
                    absentRecords.push({
                        _id: `absent-${session.id}`,
                        status: 'absent',
                        date: session.date, // Keep original ISO string
                        timestamp: sessionDate.getTime(),
                        className: session.className
                    });
                }
            });

            console.log(`[DEBUG] Generated Absent Records: ${absentRecords.length}`);

            // 4. Combine & Sort
            const combinedHistory = [...history, ...absentRecords].sort((a, b) => {
                const timeA = a.timestamp || new Date(a.date).getTime();
                const timeB = b.timestamp || new Date(b.date).getTime();
                return timeB - timeA;
            });

            setAttendanceHistory(combinedHistory);

            // 5. Update Stats
            const present = history.filter(r => r.status?.toLowerCase() === 'present').length;
            const leaves = history.filter(r => r.status?.toLowerCase() === 'leave').length;

            // Total Absents = Generated Absents + Any explicit 'absent' in valid history (if any)
            const explicitAbsents = history.filter(r => r.status?.toLowerCase() === 'absent').length;
            const absent = absentRecords.length + explicitAbsents;

            // Total Working Days = Valid Sessions (if available) or fall back to history length
            const total = validSessions.length > 0 ? validSessions.length : history.length;

            // Percentage Calculation
            const percentage = total > 0 ? Math.round(((present + leaves) / total) * 100) : 0;

            console.log(`[DEBUG] Final Stats -> Total: ${total}, Present: ${present}, Leaves: ${leaves}, Absent: ${absent}, %: ${percentage}`);

            setStats({ present, absent, total, percentage, leaves });

        } catch (error) {
            console.error("Error loading attendance:", error);
        } finally {
            setLoading(false);
        }
    };

    const getPercentageColor = (percentage) => {
        if (percentage >= 75) return '#10B981'; // Green
        if (percentage >= 60) return '#F59E0B'; // Amber
        return '#EF4444'; // Red
    };

    return (
        <View className="flex-1 bg-gray-50">
            <StatusBar style="light" />

            {/* Compact Gradient Header */}
            <View className="bg-purple-600 pb-6 pt-12 px-4 rounded-b-[32px] shadow-xl relative overflow-hidden">
                <View className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16" />
                <View className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-10 -mb-10" />

                <View className="flex-row items-center mb-4">
                    <TouchableOpacity onPress={() => navigation.goBack()} className="bg-white/20 p-2 rounded-xl mr-4">
                        <ArrowLeft size={20} color="white" />
                    </TouchableOpacity>
                    <Text className="text-white text-lg font-bold flex-1">Attendance History</Text>
                    <View className="bg-white/20 px-3 py-1 rounded-full flex-row items-center">
                        <Calendar size={10} color="white" />
                        <Text className="text-white font-bold text-[10px] ml-1">Daily Log</Text>
                    </View>
                </View>

                {/* Ultra-Compact Premium Glass Card */}
                <View className="bg-white/10 mx-1 p-3 rounded-[24px] border border-white/20 backdrop-blur-3xl shadow-2xl flex-row items-center">

                    {/* Left: Mini Circular Progress */}
                    <View className="items-center mr-4 ml-1">
                        <View className="relative">
                            <View className="absolute inset-0 bg-purple-400/20 blur-xl rounded-full" />
                            <AnimatedCircularProgress
                                size={90}
                                width={8}
                                fill={stats.percentage}
                                tintColor="#ffffff"
                                backgroundColor="rgba(255,255,255,0.15)"
                                rotation={0}
                                lineCap="round"
                                arcSweepAngle={360}
                            >
                                {() => (
                                    <View className="items-center justify-center">
                                        <Text className="text-white text-xl font-extrabold tracking-tighter">{stats.percentage}%</Text>
                                        <Text className="text-purple-200 text-[7px] font-bold uppercase tracking-widest">Score</Text>
                                    </View>
                                )}
                            </AnimatedCircularProgress>
                        </View>
                    </View>

                    {/* Right: Dense Vertical Stats */}
                    <View className="flex-1 bg-black/10 px-4 py-3 rounded-2xl border border-white/5 justify-between h-24">
                        {/* Present */}
                        <View className="flex-row justify-between items-center border-b border-white/10 pb-1.5">
                            <Text className="text-emerald-300 text-[10px] font-bold uppercase tracking-wider">Present</Text>
                            <Text className="text-white text-sm font-bold">{stats.present}</Text>
                        </View>

                        {/* Leaves */}
                        <View className="flex-row justify-between items-center border-b border-white/10 pb-1.5 pt-1.5">
                            <Text className="text-amber-300 text-[10px] font-bold uppercase tracking-wider">Leaves</Text>
                            <Text className="text-white text-sm font-bold">{stats.leaves || 0}</Text>
                        </View>

                        {/* Absent */}
                        <View className="flex-row justify-between items-center pt-1.5">
                            <Text className="text-rose-300 text-[10px] font-bold uppercase tracking-wider">Absent</Text>
                            <Text className="text-white text-sm font-bold">{stats.absent}</Text>
                        </View>
                    </View>
                </View>
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <ScrollView
                    refreshControl={<RefreshControl refreshing={loading} onRefresh={loadAttendance} colors={[COLORS.primary]} />}
                    contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
                >
                    <Text className="text-gray-500 font-bold text-xs uppercase tracking-wider mb-4 px-2">History Log</Text>

                    {attendanceHistory.length === 0 ? (
                        <View className="items-center py-10 opacity-50 bg-white rounded-2xl p-8 border border-gray-100">
                            <Calendar size={48} color={COLORS.gray} />
                            <Text className="text-gray-400 mt-4 text-center font-medium">No attendance records yet.</Text>
                        </View>
                    ) : (
                        attendanceHistory.map((record, index) => {
                            const isPresent = record.status === 'present';
                            const isLeave = record.status === 'leave';

                            // Determine Colors & Icon
                            let iconBg = 'bg-red-100';
                            let IconComponent = XCircle;
                            let iconColor = '#EF4444';

                            if (isPresent) {
                                iconBg = 'bg-emerald-100';
                                IconComponent = CheckCircle;
                                iconColor = '#10B981';
                            } else if (isLeave) {
                                iconBg = 'bg-amber-100';
                                IconComponent = Clock;
                                iconColor = '#F59E0B';
                            }

                            const textClass = isPresent ? 'text-emerald-700' : isLeave ? 'text-amber-700' : 'text-red-700';
                            const badgeBg = isPresent ? 'bg-emerald-50' : isLeave ? 'bg-amber-50' : 'bg-red-50';

                            return (
                                <View key={index} className="bg-white p-4 rounded-2xl border border-gray-100 mb-3 flex-row items-center shadow-sm">
                                    <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${iconBg}`}>
                                        <IconComponent size={22} color={iconColor} />
                                    </View>

                                    <View className="flex-1">
                                        <Text className="text-gray-800 font-bold text-base">
                                            {new Date(record.timestamp || record.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                        </Text>
                                        <View className="flex-row items-center mt-1">
                                            <Clock size={12} color="#9CA3AF" />
                                            <Text className="text-gray-400 text-xs ml-1">
                                                {record.timestamp ? new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'All Day'}
                                            </Text>

                                            {/* Show Reason if Leave */}
                                            {isLeave && record.reason && (
                                                <Text className="text-amber-600 text-xs ml-2 italic">• {record.reason}</Text>
                                            )}
                                        </View>
                                    </View>

                                    <View className={`px-3 py-1.5 rounded-lg ${badgeBg}`}>
                                        <Text className={`text-xs font-bold capitalize ${textClass}`}>
                                            {record.status}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })
                    )}
                </ScrollView>
            )}
        </View>
    );
}
