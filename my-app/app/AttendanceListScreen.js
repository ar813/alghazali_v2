import React, { useEffect, useState, useMemo, useCallback, memo } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Alert, Modal, Platform, ScrollView, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, deleteDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { ChevronLeft, Calendar as CalendarIcon, Trash2, Clock, Briefcase, Search } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getAllStudents } from '../lib/sanity';
import { COLORS } from '../theme/colors';
import FloatingScannerButton from '../components/FloatingScannerButton';
import SkeletonCard from '../components/SkeletonCard';
import { useAlert } from '../context/AlertContext';
import { ALERT_TYPES } from '../components/CustomAlert';
import { getLocalDateString } from '../lib/date.utils';

// ----------------------------------------------------------------------
// Optimized Item Component
// ----------------------------------------------------------------------
const AttendanceItem = memo(({ item, onDelete, onMarkLeave }) => {

    const getStatusColor = (status) => {
        if (status === 'present') return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-100' };
        if (status === 'leave') return { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-100' };
        return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100' };
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return "--:--";
        return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const style = getStatusColor(item.status);

    return (
        <View
            className={`bg-white p-4 mb-4 mx-6 rounded-2xl border ${style.border} flex-row items-center`}
            style={{ elevation: 2 }}
        >
            {/* Avatar / Leading */}
            <View className="mr-4">
                <View className="h-12 w-12 rounded-full bg-gray-200 overflow-hidden border border-gray-100">
                    {item.photo?.asset?.url ? (
                        <Image source={item.photo.asset.url} className="h-full w-full" contentFit="cover" />
                    ) : (
                        <View className="h-full w-full justify-center items-center"><Text>👤</Text></View>
                    )}
                </View>
            </View>

            {/* Info */}
            <View className="flex-1">
                <View className="flex-row justify-between items-start">
                    {/* Name & Details - Added flex-1 and pr-2 to prevent overlap */}
                    <View className="flex-1 pr-2">
                        <Text className="text-lg font-bold text-gray-800" numberOfLines={1} ellipsizeMode="tail">{item.fullName}</Text>
                        <Text className="text-xs text-gray-500 font-medium">GR: {item.grNumber} • Class {item.admissionFor}</Text>
                    </View>

                    {/* Status Badge - Added shrink-0 to maintain size */}
                    <View className={`px-2 py-1 rounded-md ${style.bg} shrink-0`}>
                        <Text className={`text-xs font-bold uppercase ${style.text}`}>{item.status}</Text>
                    </View>
                </View>

                {/* Action Row */}
                <View className="flex-row items-center mt-3 justify-between">
                    {item.status !== 'absent' ? (
                        <View className="flex-row items-center">
                            <Clock size={14} color="#9CA3AF" />
                            <Text className="text-gray-400 text-xs ml-1 font-medium">{formatTime(item.attendanceData?.timestamp)}</Text>
                        </View>
                    ) : (
                        <Text className="text-red-400 text-xs font-medium italic">Not marked yet</Text>
                    )}

                    {/* Context Actions */}
                    <View className="flex-row">
                        {item.status === 'absent' && (
                            <TouchableOpacity
                                onPress={() => onMarkLeave(item)}
                                className="bg-yellow-50 px-3 py-1.5 rounded-lg border border-yellow-100 flex-row items-center active:bg-yellow-100"
                            >
                                <Briefcase size={12} color="#B45309" />
                                <Text className="text-yellow-700 text-xs font-bold ml-1">Mark Leave</Text>
                            </TouchableOpacity>
                        )}

                        {(item.status === 'present' || item.status === 'leave') && (
                            <TouchableOpacity
                                onPress={() => onDelete(item)}
                                className="bg-red-50 p-1.5 rounded-lg border border-red-100 ml-2 active:bg-red-100"
                            >
                                <Trash2 size={16} color="#EF4444" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        </View>
    );
});

export default function AttendanceListScreen() {
    const navigation = useNavigation();
    const [fullData, setFullData] = useState([]);
    const [allStudents, setAllStudents] = useState([]); // Sanity Data
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const { showAlert } = useAlert();

    // Filtering
    const [selectedClass, setSelectedClass] = useState("All");
    const [classes, setClasses] = useState(["All"]);
    const [search, setSearch] = useState('');

    // Date Picker State
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Leave Modal State
    const [leaveModalVisible, setLeaveModalVisible] = useState(false);
    const [selectedStudentForLeave, setSelectedStudentForLeave] = useState(null);
    const [leaveReason, setLeaveReason] = useState("Sick Leave");

    // 1. Initial Fetch: Get Students form Sanity (Once)
    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const students = await getAllStudents();
                setAllStudents(students);

                // Extract classes once students are loaded
                const uniqueClasses = new Set(["All"]);
                students.forEach(s => {
                    if (s.admissionFor) uniqueClasses.add(s.admissionFor);
                });
                // Make sure "All" is first, then rest sorted numerically/alphabetically
                const sortedClasses = Array.from(uniqueClasses).sort((a, b) => {
                    if (a === 'All') return -1;
                    if (b === 'All') return 1;
                    return a.localeCompare(b, undefined, { numeric: true });
                });
                setClasses(sortedClasses);

            } catch (error) {
                console.error("Error fetching students:", error);
                showAlert({ title: "Error", message: "Could not fetch student list", type: ALERT_TYPES.ERROR });
            }
        };

        fetchStudents();
    }, []);

    // 2. Real-time Subscription: Listen to Firestore changes
    useEffect(() => {
        if (allStudents.length === 0) return;

        setLoading(true);
        const formattedDate = getLocalDateString(selectedDate);

        const q = query(
            collection(db, "daily_attendance"),
            where("date", "==", formattedDate)
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const attendanceMap = {};
            querySnapshot.forEach((doc) => {
                attendanceMap[doc.data().grNumber] = { id: doc.id, ...doc.data() };
            });

            // Merge & Sort Logic
            const mergedList = [];
            allStudents.forEach(student => {
                const record = attendanceMap[student.grNumber];

                if (record) {
                    mergedList.push({
                        ...student,
                        status: record.status || 'present',
                        attendanceData: record
                    });
                } else {
                    mergedList.push({
                        ...student,
                        status: 'absent',
                        attendanceData: null
                    });
                }
            });

            // Sorting Logic
            mergedList.sort((a, b) => {
                const statusPriority = { 'present': 3, 'leave': 2, 'absent': 1 };
                const priorityA = statusPriority[a.status] || 0;
                const priorityB = statusPriority[b.status] || 0;
                if (priorityA !== priorityB) return priorityB - priorityA;
                const timeA = a.attendanceData?.timestamp || 0;
                const timeB = b.attendanceData?.timestamp || 0;
                return timeB - timeA;
            });

            setFullData(mergedList);
            setLoading(false);
            setRefreshing(false);

        }, (error) => {
            console.error("Firestore Listen Error:", error);
            setLoading(false);
        });

        // Cleanup subscription on unmount or date change
        // We set loading true to show skeleton while switching dates, but since it's fast we might skip it for better UX?
        // Let's keep it to prevent stale data flash.
        return () => unsubscribe();

    }, [selectedDate, allStudents]);

    const onRefresh = () => {
        setRefreshing(true);
        // Re-fetching students just in case new ones were added in Sanity
        getAllStudents().then(students => {
            setAllStudents(students);
            // The snapshot listener will automatically handle the attendance data, but we can't force-trigger it easily without re-subscribing.
            // Updating 'allStudents' triggers the effect below effectively refreshing everything.
        }).catch(() => setRefreshing(false));
    };

    const handleDateChange = (event, date) => {
        setShowDatePicker(false);
        if (date) {
            setSelectedDate(date);
        }
    };

    const handleDelete = useCallback((student) => {
        showAlert({
            title: "Delete Attendance",
            message: `Are you sure you want to remove attendance for ${student.fullName}?`,
            type: ALERT_TYPES.WARNING,
            buttons: [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            // Don't need manual fetch here anymore, onSnapshot will catch the delete!
                            await deleteDoc(doc(db, "daily_attendance", student.attendanceData.id));
                            const formattedDate = getLocalDateString(selectedDate);
                            await deleteDoc(doc(db, "attendance", String(student.grNumber), 'history', formattedDate));
                        } catch (err) {
                            showAlert({ title: "Error", message: "Failed to delete", type: ALERT_TYPES.ERROR });
                        }
                    }
                }
            ]
        });
    }, [selectedDate]);

    const openLeaveModal = useCallback((student) => {
        setSelectedStudentForLeave(student);
        setLeaveReason("Sick Leave");
        setLeaveModalVisible(true);
    }, []);

    const handleMarkLeave = async () => {
        if (!selectedStudentForLeave) return;
        setLeaveModalVisible(false);
        // Don't need loading state here, onSnapshot will update UI instantly

        try {
            const formattedDate = getLocalDateString(selectedDate);
            const student = selectedStudentForLeave;

            const dailyRef = doc(db, 'daily_attendance', `${formattedDate}_${student.grNumber}`);
            const leafData = {
                date: formattedDate,
                grNumber: student.grNumber,
                timestamp: Date.now(),
                studentName: student.fullName,
                class: student.admissionFor || 'N/A',
                status: 'leave',
                reason: leaveReason
            };
            await setDoc(dailyRef, leafData);

            const historyRef = doc(db, 'attendance', String(student.grNumber), 'history', formattedDate);
            await setDoc(historyRef, leafData);

            // RECORD CLASS SESSION (Ensure leave also counts as a working day)
            if (student.admissionFor) {
                await setDoc(doc(db, 'class_sessions', `${student.admissionFor}_${formattedDate}`), {
                    className: student.admissionFor,
                    date: formattedDate,
                    timestamp: Date.now()
                });
            }

        } catch (error) {
            showAlert({ title: "Error", message: error.message, type: ALERT_TYPES.ERROR });
        }
    };

    const filteredList = useMemo(() => {
        let result = fullData;

        // Class Filter
        if (selectedClass !== "All") {
            result = result.filter(item => item.admissionFor === selectedClass);
        }

        // Search Filter
        if (search) {
            const lowerSearch = search.toLowerCase();
            result = result.filter(s =>
                (s.fullName && s.fullName.toLowerCase().includes(lowerSearch)) ||
                (s.grNumber && String(s.grNumber).toLowerCase().includes(lowerSearch)) ||
                (s.rollNumber && String(s.rollNumber).toLowerCase().includes(lowerSearch))
            );
        }

        return result;
    }, [selectedClass, fullData, search]);

    const renderSkeleton = () => (
        <View className="px-6 pt-4">
            {[1, 2, 3, 4, 5].map((key) => (
                <View key={key} className="flex-row items-center mb-4">
                    <SkeletonCard height={64} style={{ width: 80, borderRadius: 16, marginRight: 16, marginBottom: 0 }} />
                    <View className="flex-1">
                        <SkeletonCard height={20} style={{ width: '70%', marginBottom: 8 }} />
                        <SkeletonCard height={16} style={{ width: '40%', marginBottom: 0 }} />
                    </View>
                </View>
            ))}
        </View>
    );

    const renderItem = useCallback(({ item }) => (
        <AttendanceItem item={item} onDelete={handleDelete} onMarkLeave={openLeaveModal} />
    ), [handleDelete, openLeaveModal]);

    const getItemLayout = useCallback((data, index) => (
        { length: 100, offset: 100 * index, index }
    ), []);

    return (
        <View className="flex-1 bg-gray-50">
            {/* Header: Improved Alignment */}
            {/* Filter Scroll moved into Header Component below */}

            {(loading && fullData.length === 0) ? (
                renderSkeleton()
            ) : (
                <FlatList
                    data={filteredList}
                    keyExtractor={item => String(item.grNumber)}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} progressViewOffset={10} />
                    }
                    ListHeaderComponent={
                        <View className="pt-14 px-6 pb-4 bg-white rounded-b-3xl shadow-sm z-10 mb-6">
                            <View className="flex-row items-center mb-2">
                                {/* Back Button */}
                                <TouchableOpacity
                                    onPress={() => navigation.goBack()}
                                    className="mr-4 bg-gray-50 p-2 rounded-full border border-gray-100"
                                >
                                    <ChevronLeft color="#374151" size={24} />
                                </TouchableOpacity>

                                {/* Column: Title & Date (Aligned Vertically) */}
                                <View>
                                    <Text className="text-2xl font-bold text-gray-800 leading-tight">Attendance</Text>

                                    <TouchableOpacity
                                        onPress={() => setShowDatePicker(true)}
                                        className="flex-row items-center mt-1"
                                    >
                                        <CalendarIcon size={14} color="#6B7280" style={{ marginRight: 6 }} />
                                        <Text className="text-gray-500 font-medium text-sm">
                                            {selectedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View className="flex-row items-center bg-gray-50 p-3 rounded-2xl border border-gray-200 mb-2 mt-2">
                                <Search color={COLORS.gray} size={20} style={{ marginRight: 10 }} />
                                <TextInput
                                    placeholder="Search student..."
                                    className="flex-1 text-gray-700 font-medium text-base"
                                    placeholderTextColor="#9ca3af"
                                    value={search}
                                    onChangeText={setSearch}
                                    style={{ paddingVertical: 0 }}
                                />
                            </View>

                            {/* Filter Scroll */}
                            {!loading && (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2 text-red-500">
                                    {classes.map((cls, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            onPress={() => setSelectedClass(cls)}
                                            className={`mr-3 px-4 py-2 rounded-xl border ${selectedClass === cls ? 'bg-primary border-transparent' : 'bg-white border-gray-200'}`}
                                        >
                                            <Text className={`font-semibold ${selectedClass === cls ? 'text-white' : 'text-gray-600'}`}>{cls === 'All' ? 'All Classes' : `Class ${cls}`}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            )}
                        </View>
                    }
                    renderItem={({ item }) => (
                        <AttendanceItem item={item} onDelete={handleDelete} onMarkLeave={openLeaveModal} />
                    )}
                    initialNumToRender={8}
                    maxToRenderPerBatch={5}
                    windowSize={5}
                    updateCellsBatchingPeriod={50}
                    removeClippedSubviews={true}
                    getItemLayout={getItemLayout}
                    ListEmptyComponent={() => (
                        <View className="items-center mt-20">
                            <Text className="text-gray-400 text-lg">No students found for this date</Text>
                        </View>
                    )}
                />
            )}

            <FloatingScannerButton />

            {/* Date Picker Modal/Component */}
            {showDatePicker && (
                <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                    maximumDate={new Date()} // Prevent future selection
                />
            )}

            {/* Leave Modal */}
            <Modal
                transparent={true}
                visible={leaveModalVisible}
                animationType="fade"
                onRequestClose={() => setLeaveModalVisible(false)}
            >
                <View className="flex-1 bg-black/50 justify-center items-center px-6">
                    <View className="bg-white w-full rounded-3xl p-6 shadow-xl">
                        <Text className="text-xl font-bold text-gray-800 mb-2">Mark as Leave</Text>
                        <Text className="text-gray-500 mb-4">Reason for {selectedStudentForLeave?.fullName}'s absence:</Text>

                        <View className="flex-row flex-wrap mb-4">
                            {["Sick Leave", "Family Emergency", "Casual Leave", "Other"].map(reason => (
                                <TouchableOpacity
                                    key={reason}
                                    onPress={() => setLeaveReason(reason)}
                                    className={`mr-2 mb-2 px-3 py-2 rounded-lg border ${leaveReason === reason ? 'bg-primary border-primary' : 'bg-gray-50 border-gray-200'}`}
                                >
                                    <Text className={leaveReason === reason ? 'text-white font-medium' : 'text-gray-600'}>{reason}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View className="flex-row space-x-3">
                            <TouchableOpacity
                                onPress={() => setLeaveModalVisible(false)}
                                className="flex-1 bg-gray-100 p-4 rounded-xl items-center"
                            >
                                <Text className="font-bold text-gray-600">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleMarkLeave}
                                className="flex-1 bg-primary p-4 rounded-xl items-center"
                            >
                                <Text className="font-bold text-white">Confirm</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
