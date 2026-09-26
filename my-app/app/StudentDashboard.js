import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl, Image, TouchableOpacity, Modal, Alert } from 'react-native';
import CopyableText from '../components/CopyableText';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { AttendanceService } from '../services/attendance.service';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { getNotices, getFeesByGR } from '../lib/sanity';
import QRCode from 'react-native-qrcode-svg';
import { LogOut, Calendar, CheckCircle, XCircle, User, ClipboardList, Trophy, ChevronRight, Phone, Megaphone, Wallet, TrendingUp, CalendarDays, AlertTriangle, Bell, Settings, Info, X, History, CreditCard } from 'lucide-react-native';
import { COLORS } from '../theme/colors';
import { StatusBar } from 'expo-status-bar';
import { AnimatedCircularProgress } from 'react-native-circular-progress';
import { useNoticePolling } from '../hooks/useNoticePolling';
import { useFeePolling } from '../hooks/useFeePolling';
import { NotificationService } from '../services/notification.service';

export default function StudentDashboard() {
    const navigation = useNavigation();
    const { user, logout } = useAuth();

    const [settingsVisible, setSettingsVisible] = useState(false);
    const [idCardVisible, setIdCardVisible] = useState(false);

    // Enable background polling
    useNoticePolling(user?.admissionFor);
    useFeePolling(user?.grNumber);

    const [stats, setStats] = useState({ present: 0, absent: 0, total: 0, percentage: 0 });
    const [upcomingEvents, setUpcomingEvents] = useState([]);
    const [latestNotices, setLatestNotices] = useState([]);
    const [pendingFees, setPendingFees] = useState(0);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        if (!user || !user.grNumber) return;
        setLoading(true);
        try {
            // Attendance
            // Attendance Stats Calculation
            const history = await AttendanceService.getStudentHistory(user.grNumber);
            const present = history.filter(r => r.status?.toLowerCase() === 'present').length;
            const leaves = history.filter(r => r.status?.toLowerCase() === 'leave').length;

            console.log(`[DEBUG] History Docs: ${history.length}, Present: ${present}, Leaves: ${leaves}`);

            // Fetch Class Sessions to determine Total Working Days
            let totalWorkingDays = 0;
            if (user.admissionFor) {
                try {
                    const sessionsRef = collection(db, 'class_sessions');
                    // Query for className as both string and potential number
                    const q = query(sessionsRef, where('className', 'in', [String(user.admissionFor), Number(user.admissionFor)]));
                    const snapshot = await getDocs(q);

                    // Filter sessions after admission date
                    const admissionDate = user.dateOfAdmission ? new Date(user.dateOfAdmission) : new Date(0);
                    const today = new Date();

                    const validSessions = snapshot.docs.filter(doc => {
                        const sessionDate = new Date(doc.data().date);
                        return sessionDate >= admissionDate && sessionDate <= today;
                    });

                    totalWorkingDays = validSessions.length;
                    console.log(`[DEBUG] Total Working Days (Sessions): ${totalWorkingDays}`);
                } catch (e) {
                    console.error("Error fetching class sessions:", e);
                    totalWorkingDays = history.length;
                }
            } else {
                totalWorkingDays = history.length;
            }

            // Ensure total doesn't drop below recorded history (edge case)
            const total = Math.max(totalWorkingDays, history.length);
            const absent = Math.max(0, total - present - leaves);
            const percentage = total > 0 ? Math.round(((present + leaves) / total) * 100) : 0; // Leaves might enable 100% attendance if considered 'excused'

            console.log(`[DEBUG] Final Stats -> Total: ${total}, Absent: ${absent}, %: ${percentage}`);

            setStats({ present, absent, total, percentage, leaves });

            // Notices & Events
            const notices = await getNotices(user?.admissionFor);
            const today = new Date();
            const events = notices.filter(n => n.isEvent && n.eventDate && new Date(n.eventDate) > today)
                .sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate))
                .slice(0, 3);
            setUpcomingEvents(events);
            setLatestNotices(notices.slice(0, 3));

            // Fees
            const fees = await getFeesByGR(user.grNumber);
            const pending = fees.filter(f => f.status !== 'paid').reduce((sum, f) => sum + (f.amountPaid || 0), 0);
            setPendingFees(pending);
        } catch (error) {
            console.error("Error loading student data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [user]);

    const handleLogoutPress = () => {
        setSettingsVisible(false);
        Alert.alert(
            "Sign Out",
            "Are you sure you want to sign out?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Sign Out",
                    style: "destructive",
                    onPress: async () => {
                        await logout();
                        navigation.replace('Login');
                    }
                }
            ]
        );
    };

    const NavCard = ({ icon, title, subtitle, screen, color }) => (
        <TouchableOpacity
            onPress={() => navigation.navigate(screen)}
            className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex-row items-center mb-3"
            activeOpacity={0.7}
        >
            <View className={`${color} p-3 rounded-xl mr-4`}>
                {icon}
            </View>
            <View className="flex-1">
                <Text className="text-gray-800 font-bold text-base">{title}</Text>
                <Text className="text-gray-400 text-xs mt-0.5">{subtitle}</Text>
            </View>
            <ChevronRight size={20} color={COLORS.gray} />
        </TouchableOpacity>
    );

    const getAttendanceColor = (percentage) => {
        if (percentage >= 75) return '#10B981'; // Green
        if (percentage >= 60) return '#F59E0B'; // Amber
        return '#EF4444'; // Red
    };

    return (
        <View className="flex-1 bg-gray-50">
            <StatusBar style="light" />

            {/* Premium Header / Profile Card */}
            <View className="bg-emerald-600 rounded-b-[40px] pt-12 pb-8 px-5 shadow-xl shadow-emerald-900/30 relative overflow-hidden">
                {/* Decorative Background Shapes */}
                <View className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full -mr-20 -mt-20" />
                <View className="absolute top-20 right-10 w-24 h-24 bg-emerald-400/20 rounded-full" />
                <View className="absolute bottom-0 left-0 w-40 h-40 bg-white/10 rounded-full -ml-16 -mb-16" />
                <View className="absolute bottom-12 right-4 w-16 h-16 bg-emerald-400/15 rounded-full" />

                {/* Top Row: Greeting + Settings */}
                <View className="flex-row justify-between items-start mb-5 z-10">
                    <View>
                        <Text className="text-emerald-100/80 font-semibold text-[11px] uppercase tracking-widest">Student Portal</Text>
                        <Text className="text-white text-xl font-extrabold mt-0.5 tracking-tight">Salam, {user?.fullName?.split(' ')[0]}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setSettingsVisible(true)} className="bg-white/20 p-2.5 rounded-xl border border-white/10">
                        <Settings color="white" size={18} />
                    </TouchableOpacity>
                </View>

                {/* Profile Glass Card */}
                <View className="bg-white/15 p-4 rounded-3xl border border-white/20 backdrop-blur-lg flex-row items-center z-10">
                    {/* Profile Photo with Glow */}
                    <View className="relative mr-4">
                        <View className="absolute -inset-1 bg-emerald-300/30 rounded-full blur-md" />
                        <View className="h-16 w-16 rounded-full bg-white/20 p-1 border-2 border-white/40">
                            {user?.photo?.asset?.url ? (
                                <Image
                                    source={{ uri: user.photo.asset.url }}
                                    style={{ width: '100%', height: '100%', borderRadius: 999 }}
                                />
                            ) : (
                                <View className="h-full w-full bg-emerald-200 rounded-full items-center justify-center">
                                    <Text className="text-2xl">🎓</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Info */}
                    <View className="flex-1">
                        <Text className="text-white font-bold text-lg">{user?.fullName}</Text>
                        <View className="flex-row items-center mt-1">
                            <View className="bg-white/20 px-2 py-0.5 rounded-md mr-2">
                                <Text className="text-white text-[10px] font-bold">Class {user?.admissionFor}</Text>
                            </View>
                            <Text className="text-emerald-100 text-xs">Roll #{user?.rollNumber}</Text>
                        </View>

                        {/* ID Card Button */}
                        <TouchableOpacity
                            onPress={() => setIdCardVisible(true)}
                            className="bg-white/20 px-3 py-1.5 rounded-full self-start flex-row items-center mt-2"
                        >
                            <CreditCard size={10} color="#A7F3D0" />
                            <Text className="text-emerald-100 text-[10px] font-bold ml-1.5 uppercase tracking-wide">Digital ID Card</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Right Side Badges */}
                    <View className="items-end">
                        {/* GR Badge */}
                        <View className="bg-emerald-900/50 px-2.5 py-1 rounded-lg mb-2">
                            <Text className="text-emerald-100 text-[9px] font-mono font-bold">GR #{user?.grNumber}</Text>
                        </View>
                        {/* Attendance Quick Badge */}
                        <View className="bg-white/25 px-2.5 py-1 rounded-lg flex-row items-center">
                            <CheckCircle size={10} color="#A7F3D0" />
                            <Text className="text-white text-[10px] font-bold ml-1">{stats.percentage}%</Text>
                        </View>
                    </View>
                </View>
            </View>

            <ScrollView
                refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} colors={[COLORS.primary]} />}
                contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
            >
                {/* Premium Attendance Widget */}
                <View className="bg-gradient-to-br from-emerald-50 to-teal-50 p-5 rounded-3xl border border-emerald-100 mb-6 overflow-hidden relative">
                    <View className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-200/20 rounded-full" />
                    <View className="absolute -bottom-6 -left-6 w-24 h-24 bg-teal-200/20 rounded-full" />

                    <View className="flex-row items-center mb-4 z-10">
                        <View className="bg-emerald-500 p-2 rounded-xl">
                            <TrendingUp size={18} color="white" />
                        </View>
                        <Text className="text-gray-800 font-bold text-lg ml-2">Attendance Score</Text>
                    </View>

                    <View className="flex-row items-center z-10">
                        <View className="relative">
                            <View className="absolute -inset-2 bg-emerald-300/30 rounded-full blur-lg" />
                            <AnimatedCircularProgress
                                size={90}
                                width={8}
                                fill={stats.percentage}
                                tintColor={getAttendanceColor(stats.percentage)}
                                backgroundColor="#E0E7FF"
                                rotation={0}
                                lineCap="round"
                            >
                                {() => (
                                    <View className="items-center">
                                        <Text className="text-2xl font-extrabold" style={{ color: getAttendanceColor(stats.percentage) }}>
                                            {stats.percentage}%
                                        </Text>
                                        <Text className="text-gray-500 text-[8px] font-bold uppercase tracking-wider">Score</Text>
                                    </View>
                                )}
                            </AnimatedCircularProgress>
                        </View>

                        <View className="flex-1 ml-5">
                            <View className="bg-white/60 backdrop-blur-sm p-3 rounded-2xl border border-white/40">
                                <View className="flex-row justify-between items-center mb-2 pb-2 border-b border-gray-200">
                                    <View className="flex-row items-center">
                                        <View className="w-2 h-2 bg-emerald-500 rounded-full mr-2" />
                                        <Text className="text-gray-600 text-xs font-medium">Present</Text>
                                    </View>
                                    <Text className="text-emerald-600 font-bold text-sm">{stats.present}</Text>
                                </View>
                                <View className="flex-row justify-between items-center mb-2 pb-2 border-b border-gray-200">
                                    <View className="flex-row items-center">
                                        <View className="w-2 h-2 bg-amber-500 rounded-full mr-2" />
                                        <Text className="text-gray-600 text-xs font-medium">Leaves</Text>
                                    </View>
                                    <Text className="text-amber-600 font-bold text-sm">{stats.leaves || 0}</Text>
                                </View>
                                <View className="flex-row justify-between items-center">
                                    <View className="flex-row items-center">
                                        <View className="w-2 h-2 bg-red-500 rounded-full mr-2" />
                                        <Text className="text-gray-600 text-xs font-medium">Absent</Text>
                                    </View>
                                    <Text className="text-red-600 font-bold text-sm">{stats.absent}</Text>
                                </View>
                            </View>
                            <View className="bg-gray-100/60 backdrop-blur-sm px-3 py-2 rounded-xl mt-2 flex-row justify-between items-center">
                                <Text className="text-gray-600 text-xs font-semibold">Total Days</Text>
                                <Text className="text-gray-800 font-bold text-sm">{stats.total}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Pending Fees Alert */}
                {pendingFees > 0 && (
                    <TouchableOpacity
                        onPress={() => navigation.navigate('FeesScreen')}
                        className="bg-amber-50 border-2 border-amber-300 p-4 rounded-2xl mb-6 flex-row items-center"
                        activeOpacity={0.7}
                    >
                        <View className="bg-amber-500 p-2.5 rounded-xl mr-4">
                            <AlertTriangle size={24} color="white" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-amber-900 font-bold text-base">Pending Fees</Text>
                            <Text className="text-amber-700 text-sm">Rs. {pendingFees.toLocaleString()} due</Text>
                        </View>
                        <ChevronRight size={20} color="#D97706" />
                    </TouchableOpacity>
                )}

                {/* Upcoming Events */}
                {upcomingEvents.length > 0 && (
                    <View className="mb-6">
                        <View className="flex-row justify-between items-center mb-4 px-1">
                            <View className="flex-row items-center">
                                <View className="bg-blue-500 p-2 rounded-xl">
                                    <CalendarDays size={16} color="white" />
                                </View>
                                <Text className="text-gray-800 font-bold text-lg ml-2">Upcoming Events</Text>
                            </View>
                            <TouchableOpacity onPress={() => navigation.navigate('NoticesScreen')} className="bg-blue-50 px-3 py-1.5 rounded-lg">
                                <Text className="text-blue-600 font-semibold text-xs">View All →</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
                            {upcomingEvents.map((event, index) => (
                                <TouchableOpacity
                                    key={event._id || index}
                                    onPress={() => navigation.navigate('NoticesScreen')}
                                    className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 p-4 rounded-3xl mr-3 w-64 shadow-sm"
                                    activeOpacity={0.7}
                                >
                                    <View className="bg-blue-500 self-start px-2 py-1 rounded-lg mb-2">
                                        <Text className="text-white text-[10px] font-bold uppercase">{event.eventType}</Text>
                                    </View>
                                    <Text className="text-blue-900 font-bold text-base mb-3" numberOfLines={2}>{event.title}</Text>
                                    <View className="flex-row items-center bg-white/50 px-2 py-1.5 rounded-lg self-start">
                                        <Calendar size={12} color="#1D4ED8" />
                                        <Text className="text-blue-700 text-xs ml-1.5 font-bold">
                                            {new Date(event.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Latest Notices */}
                {latestNotices.length > 0 && (
                    <View className="mb-6">
                        <View className="flex-row justify-between items-center mb-4 px-1">
                            <View className="flex-row items-center">
                                <View className="bg-rose-500 p-2 rounded-xl">
                                    <Bell size={16} color="white" />
                                </View>
                                <Text className="text-gray-800 font-bold text-lg ml-2">Latest Notices</Text>
                            </View>
                            <TouchableOpacity onPress={() => navigation.navigate('NoticesScreen')} className="bg-rose-50 px-3 py-1.5 rounded-lg">
                                <Text className="text-rose-600 font-semibold text-xs">View All →</Text>
                            </TouchableOpacity>
                        </View>
                        {latestNotices.map((notice, index) => (
                            <TouchableOpacity
                                key={notice._id || index}
                                onPress={() => navigation.navigate('NoticesScreen')}
                                className="bg-white border-2 border-gray-100 p-4 rounded-2xl mb-3 shadow-sm"
                                activeOpacity={0.7}
                            >
                                <View className="flex-row items-start">
                                    <View className={`${notice.isHeadline ? 'bg-rose-500' : 'bg-gray-200'} p-2.5 rounded-xl mr-3`}>
                                        <Megaphone size={16} color={notice.isHeadline ? 'white' : '#6B7280'} />
                                    </View>
                                    <View className="flex-1">
                                        <View className="flex-row items-center mb-1">
                                            <Text className="text-gray-800 font-bold text-sm flex-1" numberOfLines={1}>{notice.title}</Text>
                                            {notice.isHeadline && (
                                                <View className="bg-rose-100 px-2 py-0.5 rounded-md ml-2">
                                                    <Text className="text-rose-700 text-[9px] font-bold uppercase">Hot</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text className="text-gray-500 text-xs mt-0.5" numberOfLines={2}>{notice.content}</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Dynamic Grid Actions */}
                <Text className="text-gray-800 font-bold text-lg mb-4 px-1">Quick Access</Text>

                <View className="mb-6">
                    <NavCard
                        icon={<User size={24} color="#10B981" />}
                        title="My Profile"
                        subtitle="Personal Details"
                        screen="ProfileScreen"
                        color="bg-emerald-50"
                    />
                    <NavCard
                        icon={<ClipboardList size={24} color="#3B82F6" />}
                        title="My Schedule"
                        subtitle="Classes & Time"
                        screen="ScheduleScreen"
                        color="bg-blue-50"
                    />
                    <NavCard
                        icon={<Trophy size={24} color="#F59E0B" />}
                        title="Quiz Results"
                        subtitle="Scores & Stats"
                        screen="QuizResultsScreen"
                        color="bg-amber-50"
                    />
                    <NavCard
                        icon={<Megaphone size={24} color="#E11D48" />}
                        title="Notices"
                        subtitle="Announcements"
                        screen="NoticesScreen"
                        color="bg-rose-50"
                    />
                    <NavCard
                        icon={<Wallet size={24} color="#0D9488" />}
                        title="Fee Details"
                        subtitle="Dues & History"
                        screen="FeesScreen"
                        color="bg-teal-50"
                    />
                    <NavCard
                        icon={<Calendar size={24} color="#9333EA" />}
                        title="Holidays"
                        subtitle="School Calendar"
                        screen="StudentHolidays"
                        color="bg-purple-50"
                    />
                    <NavCard
                        icon={<History size={24} color="#8B5CF6" />}
                        title="Attendance History"
                        subtitle="View full log"
                        screen="AttendanceHistoryScreen"
                        color="bg-violet-50"
                    />
                </View>

            </ScrollView>

            {/* Settings Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={settingsVisible}
                onRequestClose={() => setSettingsVisible(false)}
            >
                <TouchableOpacity
                    className="flex-1 bg-black/50 justify-center items-center p-6"
                    activeOpacity={1}
                    onPress={() => setSettingsVisible(false)}
                >
                    <View className="bg-white w-full rounded-3xl p-6 shadow-2xl">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-xl font-bold text-gray-900">Settings</Text>
                            <TouchableOpacity onPress={() => setSettingsVisible(false)} className="bg-gray-100 p-2 rounded-full">
                                <X size={20} color={COLORS.gray} />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            onPress={() => {
                                setSettingsVisible(false);
                                navigation.navigate('About');
                            }}
                            className="flex-row items-center p-4 bg-gray-50 rounded-2xl mb-3"
                        >
                            <View className="bg-blue-100 p-2 rounded-xl mr-3">
                                <Info size={20} color="#2563EB" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-gray-800 font-bold text-base">Credits & About</Text>
                                <Text className="text-gray-500 text-xs">App version and developer info</Text>
                            </View>
                            <ChevronRight size={20} color={COLORS.gray} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={async () => {
                                await NotificationService.triggerTestNotification();
                                Alert.alert("Test Sent", "Check your notification center!");
                            }}
                            className="flex-row items-center p-4 bg-purple-50 rounded-2xl mb-3"
                        >
                            <View className="bg-purple-100 p-2 rounded-xl mr-3">
                                <Bell size={20} color="#9333EA" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-purple-700 font-bold text-base">Test Notification</Text>
                                <Text className="text-purple-400 text-xs">Verify alerts are working</Text>
                            </View>
                            <ChevronRight size={20} color="#D8B4FE" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleLogoutPress}
                            className="flex-row items-center p-4 bg-red-50 rounded-2xl"
                        >
                            <View className="bg-red-100 p-2 rounded-xl mr-3">
                                <LogOut size={20} color="#DC2626" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-red-700 font-bold text-base">Sign Out</Text>
                                <Text className="text-red-400 text-xs">Log out of your account</Text>
                            </View>
                            <ChevronRight size={20} color="#FCA5A5" />
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* ID Card Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={idCardVisible}
                onRequestClose={() => setIdCardVisible(false)}
            >
                <View className="flex-1 bg-black/80 justify-center items-center p-6">
                    <View className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden">
                        {/* Card Header (Green) */}
                        <View className="bg-emerald-600 p-6 flex-row justify-between items-start">
                            <View>
                                <Text className="text-emerald-100 font-bold text-xs uppercase tracking-widest">Student Card</Text>
                                <Text className="text-white text-xl font-extrabold mt-1">Al-Ghazali High School</Text>
                            </View>
                            <TouchableOpacity onPress={() => setIdCardVisible(false)} className="bg-black/20 p-2 rounded-full">
                                <X size={20} color="white" />
                            </TouchableOpacity>
                        </View>

                        {/* Card Body */}
                        <View className="p-6 items-center -mt-6">
                            {/* Photo */}
                            <View className="w-28 h-28 rounded-full border-4 border-white shadow-xl bg-gray-200 p-1 mb-4">
                                {user?.photo?.asset?.url ? (
                                    <Image
                                        source={{ uri: user.photo.asset.url }}
                                        style={{ width: '100%', height: '100%', borderRadius: 999 }}
                                    />
                                ) : (
                                    <View className="h-full w-full bg-emerald-100 rounded-full items-center justify-center">
                                        <User size={48} color={COLORS.primary} />
                                    </View>
                                )}
                            </View>

                            <Text className="text-2xl font-bold text-gray-900 text-center mb-1">{user?.fullName}</Text>
                            <Text className="text-gray-500 font-medium mb-6">Class {user?.admissionFor} • Roll #{user?.rollNumber}</Text>

                            {/* QR Code */}
                            <View className="bg-white p-4 rounded-xl border-2 border-dashed border-gray-200 mb-6">
                                <QRCode
                                    value={`GR NO: ${user?.grNumber}`}
                                    size={150}
                                    color="black"
                                    backgroundColor="white"
                                />
                            </View>

                            {/* Footer Info */}
                            <View className="w-full bg-gray-50 rounded-2xl p-4 flex-row justify-between">
                                <View>
                                    <View>
                                        <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1">GR Number</Text>
                                        <CopyableText
                                            value={user?.grNumber}
                                            color="#1f2937"
                                        />
                                    </View>
                                </View>
                                <View className="items-end">
                                    <Text className="text-gray-400 text-[10px] font-bold uppercase">Valid Until</Text>
                                    <Text className="text-gray-900 font-bold text-lg">Dec 2026</Text>
                                </View>
                            </View>
                        </View>

                        {/* Decorative Bottom Strip */}
                        <View className="bg-emerald-600 h-2 w-full" />
                    </View>
                </View>
            </Modal>
        </View>
    );
}
