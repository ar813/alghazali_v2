import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, FlatList, Platform, UIManager, RefreshControl, Animated } from 'react-native';
import CopyableText from '../components/CopyableText';
import { Image } from 'expo-image';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ChevronLeft, Phone, MapPin, Calendar, Hash, User, School, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react-native';
import { AttendanceService } from '../services/attendance.service';
import { COLORS } from '../theme/colors';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    // Check if we are running on the New Architecture (Fabric)
    const isFabric = global.nativeFabricUIManager != null;
    if (!isFabric) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

const { width } = Dimensions.get('window');

// Skeleton Components
const SkeletonRow = () => (
    <View className="flex-row items-center mb-6 opacity-50">
        <View className="w-10 h-10 rounded-full bg-gray-200 mr-4" />
        <View className="flex-1">
            <View className="w-20 h-3 bg-gray-200 rounded mb-2" />
            <View className="w-32 h-4 bg-gray-200 rounded" />
        </View>
    </View>
);

const SkeletonCard = () => (
    <View className="flex-1 bg-gray-50 p-4 rounded-2xl mx-1 items-center opacity-50 h-28 justify-center">
        <View className="w-8 h-8 rounded-full bg-gray-200 mb-2" />
        <View className="w-12 h-8 bg-gray-200 rounded mb-1" />
        <View className="w-16 h-3 bg-gray-200 rounded" />
    </View>
);

const SkeletonHistoryItem = () => (
    <View className="flex-row items-center bg-gray-50 p-4 rounded-xl mb-3 border border-gray-100 opacity-50 h-20">
        <View className="w-2 h-10 rounded-full bg-gray-200 mr-4" />
        <View className="flex-1">
            <View className="w-24 h-4 bg-gray-200 rounded mb-2" />
            <View className="w-32 h-3 bg-gray-200 rounded" />
        </View>
        <View className="w-16 h-6 bg-gray-200 rounded" />
    </View>
);

// Reusable Detail Row
const DetailRow = ({ icon, label, value }) => (
    <View className="flex-row items-start mb-6">
        <View className="w-10 h-10 rounded-full bg-emerald-50 items-center justify-center mr-4">
            {icon}
        </View>
        <View className="flex-1 border-b border-gray-100 pb-4">
            <Text className="text-gray-400 text-xs uppercase font-bold tracking-wider mb-1">{label}</Text>
            <Text className="text-gray-800 text-lg font-medium">{value || 'N/A'}</Text>
        </View>
    </View>
);

// Stat Card
const StatCard = ({ label, value, color, icon }) => (
    <View className={`flex-1 ${color} p-4 rounded-2xl mx-1 items-center`}>
        {icon}
        <Text className="text-2xl font-bold text-gray-800 my-1">{value}</Text>
        <Text className="text-xs text-gray-500 font-medium uppercase">{label}</Text>
    </View>
);

// Helper to safely format date
const getFormattedDate = (record) => {
    try {
        // Priority: record.date -> record.timestamp -> record.id (if ISO string)
        const rawDate = record.date || record.timestamp || record.id;
        if (!rawDate) return 'Unknown Date';

        const dateObj = new Date(rawDate);
        if (isNaN(dateObj.getTime())) return 'Invalid Date';

        return dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) {
        return 'Error Date';
    }
};

const getFormattedTime = (record) => {
    try {
        const rawTime = record.timestamp || record.date; // Fallback to date if timestamp missing
        if (!rawTime) return 'N/A';
        const dateObj = new Date(rawTime);
        if (isNaN(dateObj.getTime())) return 'N/A';
        return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
        return 'N/A';
    }
}

export default function StudentDetailScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { student } = route.params;

    const [activeTab, setActiveTab] = useState('profile');
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Animation Value for Tab Content Opacity
    const fadeAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        fetchHistory();
    }, []);

    const changeTab = (tab) => {
        if (tab === activeTab) return;

        // Fade Out
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
        }).start(() => {
            setActiveTab(tab);
            // Fade In
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }).start();
        });
    };

    const fetchHistory = async () => {
        if (!student.grNumber) return;
        setLoadingHistory(true);
        try {
            const data = await AttendanceService.getStudentHistory(student.grNumber);
            // Sort by date descending (Safe compare)
            const sorted = data.sort((a, b) => {
                const dateA = new Date(a.date || a.timestamp || 0);
                const dateB = new Date(b.date || b.timestamp || 0);
                return dateB - dateA; // Descending
            });
            setHistory(sorted);
        } catch (e) {
            console.error(e);
        } finally {
            // Artificial delay to show skeleton (UX)
            setTimeout(() => setLoadingHistory(false), 800);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchHistory();
        setRefreshing(false);
    };

    // Calculate Stats
    const stats = useMemo(() => {
        let present = 0, absent = 0, leave = 0;
        history.forEach(record => {
            if (record.status === 'present') present++;
            else if (record.status === 'absent') absent++;
            else if (record.status === 'leave') leave++;
        });
        return { present, absent, leave, total: history.length };
    }, [history]);

    return (
        <View className="flex-1 bg-white">
            {/* Main Scroll Container */}
            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
            >
                {/* Header Image Background */}
                <View className="h-48 bg-emerald-700 relative overflow-hidden">
                    <View className="absolute -bottom-24 -right-10 w-64 h-64 bg-emerald-500 rounded-full opacity-30" />
                    <View className="absolute top-10 -left-10 w-40 h-40 bg-emerald-400 rounded-full opacity-20" />

                    {/* Navbar */}
                    <View className="flex-row items-center pt-12 px-6 z-10">
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            className="bg-white/20 p-2 rounded-full backdrop-blur-md"
                        >
                            <ChevronLeft color="white" size={24} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Profile Info Card (Overlapping) */}
                <View className="px-6 -mt-[90px] mb-4">
                    <View className="bg-white rounded-3xl p-6 shadow-xl shadow-gray-200 items-center">
                        <View className="w-28 h-28 rounded-full bg-gray-100 p-1 mb-3 border-4 border-white shadow-sm -mt-20">
                            {student.photo?.asset?.url ? (
                                <Image
                                    source={student.photo.asset.url}
                                    className="w-full h-full rounded-full"
                                    contentFit="cover"
                                    transition={500}
                                />
                            ) : (
                                <View className="w-full h-full rounded-full bg-gray-200 items-center justify-center">
                                    <User size={40} color={COLORS.gray} />
                                </View>
                            )}
                        </View>

                        <Text className="text-2xl font-bold text-gray-900 text-center">{student.fullName}</Text>

                        <View className="flex-row mt-2 space-x-2">
                            <View className="px-3 py-1 bg-emerald-50 rounded-lg flex-row items-center">
                                <Hash size={12} color={COLORS.primary} className="mr-1" />
                                <Text className="text-emerald-700 text-xs font-bold">GR: {student.grNumber}</Text>
                            </View>
                            <View className="px-3 py-1 bg-blue-50 rounded-lg flex-row items-center">
                                <School size={12} color="#3B82F6" className="mr-1" />
                                <Text className="text-blue-700 text-xs font-bold">{student.admissionFor}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Custom Tabs */}
                <View className="flex-row px-6 mb-4 z-0">
                    <TouchableOpacity
                        onPress={() => changeTab('profile')}
                        className={`flex-1 pb-3 border-b-2 items-center ${activeTab === 'profile' ? 'border-emerald-600' : 'border-gray-100'}`}
                    >
                        <Text className={`${activeTab === 'profile' ? 'text-emerald-700 font-bold' : 'text-gray-400 font-medium'}`}>Profile Details</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => changeTab('history')}
                        className={`flex-1 pb-3 border-b-2 items-center ${activeTab === 'history' ? 'border-emerald-600' : 'border-gray-100'}`}
                    >
                        <Text className={`${activeTab === 'history' ? 'text-emerald-700 font-bold' : 'text-gray-400 font-medium'}`}>Attendance History</Text>
                    </TouchableOpacity>
                </View>

                {/* Tab Content with Fade Animation */}
                <Animated.View className="px-6" style={{ opacity: fadeAnim }}>
                    {activeTab === 'profile' ? (
                        <View className="pt-2">
                            {/* Section: Academic Info */}
                            <View className="mb-6">
                                <Text className="text-gray-800 font-bold text-lg mb-3">Academic Information</Text>
                                <View className="flex-row flex-wrap justify-between">
                                    <View className="w-[48%] bg-gray-50 p-3 rounded-xl mb-3 border border-gray-100">
                                        <View className="flex-row items-center mb-1">
                                            <Hash size={14} color={COLORS.primary} className="mr-1" />
                                        </View>
                                        <CopyableText
                                            label="GR Number"
                                            value={student.grNumber}
                                            color="#1f2937"
                                        />
                                    </View>
                                    <View className="w-[48%] bg-gray-50 p-3 rounded-xl mb-3 border border-gray-100">
                                        <View className="flex-row items-center mb-1">
                                            <Hash size={14} color="#9333ea" className="mr-1" />
                                            <Text className="text-gray-500 text-xs font-bold uppercase">Roll Number</Text>
                                        </View>
                                        <Text className="text-gray-800 font-bold text-base">{student.rollNumber || 'N/A'}</Text>
                                    </View>
                                    <View className="w-[48%] bg-gray-50 p-3 rounded-xl mb-3 border border-gray-100">
                                        <View className="flex-row items-center mb-1">
                                            <School size={14} color="#2563eb" className="mr-1" />
                                            <Text className="text-gray-500 text-xs font-bold uppercase">Class</Text>
                                        </View>
                                        <Text className="text-gray-800 font-bold text-base">{student.admissionFor}</Text>
                                    </View>
                                    <View className="w-[48%] bg-gray-50 p-3 rounded-xl mb-3 border border-gray-100">
                                        <View className="flex-row items-center mb-1">
                                            <Calendar size={14} color="#ea580c" className="mr-1" />
                                            <Text className="text-gray-500 text-xs font-bold uppercase">Admission Date</Text>
                                        </View>
                                        <Text className="text-gray-800 font-bold text-sm" numberOfLines={1}>
                                            {student.dateOfAdmission ? new Date(student.dateOfAdmission).toLocaleDateString() : 'N/A'}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Section: Personal Info */}
                            <View className="mb-6">
                                <Text className="text-gray-800 font-bold text-lg mb-3">Personal Information</Text>

                                <DetailRow
                                    icon={<User size={18} color={COLORS.primary} />}
                                    label="Full Name"
                                    value={student.fullName}
                                />
                                <DetailRow
                                    icon={<User size={18} color={COLORS.primary} />}
                                    label="Father's Name"
                                    value={student.fatherName}
                                />
                                <View className="flex-row justify-between">
                                    <View className="flex-1 mr-2">
                                        <DetailRow
                                            icon={<User size={18} color={COLORS.primary} />}
                                            label="Gender"
                                            value={student.gender ? student.gender.charAt(0).toUpperCase() + student.gender.slice(1) : 'N/A'}
                                        />
                                    </View>
                                    <View className="flex-1 ml-2">
                                        <DetailRow
                                            icon={<Calendar size={18} color={COLORS.primary} />}
                                            label="Date of Birth"
                                            value={student.dob ? new Date(student.dob).toLocaleDateString() : 'N/A'}
                                        />
                                    </View>
                                </View>

                                <DetailRow
                                    icon={<MapPin size={18} color={COLORS.primary} />}
                                    label="Nationality"
                                    value={student.nationality}
                                />
                                <DetailRow
                                    icon={<MapPin size={18} color={COLORS.primary} />}
                                    label="Address"
                                    value={student.address}
                                />
                                <DetailRow
                                    icon={<Phone size={18} color={COLORS.primary} />}
                                    label="Phone"
                                    value={student.phoneNumber}
                                />
                            </View>

                            {/* Section: Identification */}
                            <View>
                                <Text className="text-gray-800 font-bold text-lg mb-3">Identification</Text>
                                <View className="mb-4">
                                    <View className="flex-row items-center mb-1">
                                        <Hash size={18} color={COLORS.primary} className="mr-4" />
                                        <View className="flex-1 border-b border-gray-100 pb-2">
                                            <CopyableText
                                                label="Father CNIC"
                                                value={student.fatherCnic}
                                                color="#1f2937"
                                            />
                                        </View>
                                    </View>
                                </View>
                                <View className="mb-4">
                                    <View className="flex-row items-center mb-1">
                                        <Hash size={18} color={COLORS.primary} className="mr-4" />
                                        <View className="flex-1 border-b border-gray-100 pb-2">
                                            <CopyableText
                                                label="Student B-Form / CNIC"
                                                value={student.cnicOrBform}
                                                color="#1f2937"
                                            />
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </View>
                    ) : (
                        <View className="flex-1">
                            {loadingHistory ? (
                                <View className="pt-2">
                                    <View className="flex-row justify-between mb-6 mt-2">
                                        <SkeletonCard />
                                        <SkeletonCard />
                                        <SkeletonCard />
                                    </View>

                                    <View className="h-6 w-40 bg-gray-200 rounded mb-4 opacity-50" />

                                    <View className="mt-0">
                                        <SkeletonHistoryItem />
                                        <SkeletonHistoryItem />
                                        <SkeletonHistoryItem />
                                    </View>
                                </View>
                            ) : (
                                <>
                                    {/* Summary Stats */}
                                    <View className="flex-row justify-between mb-6 mt-2">
                                        <StatCard
                                            label="Present"
                                            value={stats.present}
                                            color="bg-emerald-50"
                                            icon={<CheckCircle2 size={24} color={COLORS.primary} />}
                                        />
                                        <StatCard
                                            label="Absent"
                                            value={stats.absent}
                                            color="bg-red-50"
                                            icon={<XCircle size={24} color="#EF4444" />}
                                        />
                                        <StatCard
                                            label="Leaves"
                                            value={stats.leave}
                                            color="bg-amber-50"
                                            icon={<AlertCircle size={24} color="#F59E0B" />}
                                        />
                                    </View>

                                    <Text className="text-lg font-bold text-gray-800 mb-4">Detailed Records</Text>

                                    {history.length === 0 ? (
                                        <Text className="text-gray-400 text-center mt-10">No attendance records found.</Text>
                                    ) : (
                                        history.map((record, index) => (
                                            <View key={record.id || index} className="flex-row items-center bg-gray-50 p-4 rounded-xl mb-3 border border-gray-100">
                                                <View className={`w-2 h-10 rounded-full mr-4 ${record.status === 'present' ? 'bg-emerald-500' :
                                                    record.status === 'absent' ? 'bg-red-500' : 'bg-amber-500'
                                                    }`} />
                                                <View className="flex-1">
                                                    <Text className="text-gray-800 font-bold text-base">
                                                        {getFormattedDate(record)}
                                                    </Text>
                                                    <Text className="text-gray-400 text-xs text-medium">
                                                        {record.status === 'present'
                                                            ? `Checked in at ${getFormattedTime(record)}`
                                                            : record.status === 'leave' ? `Reason: ${record.reason || 'N/A'}` : 'Absent'}
                                                    </Text>
                                                </View>
                                                <View className={`px-2 py-1 rounded text-xs ${record.status === 'present' ? 'bg-emerald-100' :
                                                    record.status === 'absent' ? 'bg-red-100' : 'bg-amber-100'
                                                    }`}>
                                                    <Text className={`font-bold capitalize ${record.status === 'present' ? 'text-emerald-700' :
                                                        record.status === 'absent' ? 'text-red-700' : 'text-amber-700'
                                                        }`}>{record.status}</Text>
                                                </View>
                                            </View>
                                        ))
                                    )}
                                </>
                            )}
                        </View>
                    )}
                </Animated.View>
            </ScrollView>
        </View>
    );
}
