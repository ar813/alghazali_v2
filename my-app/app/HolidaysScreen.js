import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Animated, RefreshControl } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Plus, Trash2, Calendar as CalendarIcon, Check } from 'lucide-react-native';
import { Swipeable } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../theme/colors';
import { HolidayService } from '../services/holiday.service';
import { useAlert } from '../context/AlertContext';
import { ALERT_TYPES } from '../components/CustomAlert';
import { getLocalDateString } from '../lib/date.utils';

export default function HolidaysScreen() {
    const navigation = useNavigation();
    const [holidays, setHolidays] = useState({});
    const [loading, setLoading] = useState(true);
    const [markedDates, setMarkedDates] = useState({});

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedDate, setSelectedDate] = useState('');
    const [holidayName, setHolidayName] = useState('');
    const [saving, setSaving] = useState(false);
    const [deletingDate, setDeletingDate] = useState(null);
    const { showAlert } = useAlert();

    // Date Range State
    const [isRangeMode, setIsRangeMode] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        fetchHolidays();
    }, []);

    // Refresh marked dates whenever holidays change
    useEffect(() => {
        generateMarkedDates();
    }, [holidays]);

    const fetchHolidays = async () => {
        setLoading(true);
        const data = await HolidayService.getHolidays();
        setHolidays(data);
        setLoading(false);
    };

    const generateMarkedDates = () => {
        const marks = {};

        // 1. Mark all Fridays as Gray (Weekly Off) - for current year +/- 1 year
        const today = new Date();
        const startYear = today.getFullYear() - 1;
        const endYear = today.getFullYear() + 1;

        for (let year = startYear; year <= endYear; year++) {
            for (let month = 0; month < 12; month++) {
                let d = new Date(year, month, 1);
                while (d.getMonth() === month) {
                    if (d.getDay() === 5) { // Friday (0=Sun, 5=Fri)
                        // Use local date format to avoid UTC timezone shift
                        const yyyy = d.getFullYear();
                        const mm = String(d.getMonth() + 1).padStart(2, '0');
                        const dd = String(d.getDate()).padStart(2, '0');
                        const dateStr = `${yyyy}-${mm}-${dd}`;
                        marks[dateStr] = {
                            disabled: true,
                            disableTouchEvent: true,
                            customStyles: {
                                container: { backgroundColor: '#F3F4F6' },
                                text: { color: '#9CA3AF' }
                            }
                        };
                    }
                    d.setDate(d.getDate() + 1);
                }
            }
        }

        // 2. Mark fetched holidays (overwrite Friday if needed)
        Object.keys(holidays).forEach(date => {
            marks[date] = {
                selected: true,
                selectedColor: COLORS.primary,
                marked: true
            };
        });

        setMarkedDates(marks);
    };

    const handleDayPress = (day) => {
        const date = day.dateString;

        // Check if it's already a holiday
        if (holidays[date]) {
            // Confirm Delete
            // Confirm Delete
            showAlert({
                title: "Remove Holiday?",
                message: `Do you want to remove "${holidays[date].name}"?`,
                type: ALERT_TYPES.WARNING,
                buttons: [
                    { text: "Cancel", style: "cancel" },
                    { text: "Remove", style: "destructive", onPress: () => deleteHoliday(date) }
                ]
            });
        } else {
            // Add New
            // Check if Friday?
            const d = new Date(date);
            if (d.getDay() === 5) { // 0=Sun, 1=Mon... 5=Fri
                showAlert({
                    title: "Weekly Off",
                    message: "Friday is already a weekly holiday.",
                    type: ALERT_TYPES.INFO
                });
                return;
            }

            setStartDate(date);
            setEndDate(date);
            setSelectedDate(date);
            setHolidayName('');
            setIsRangeMode(false);
            setModalVisible(true);
        }
    };

    const saveHoliday = async () => {
        if (!holidayName.trim()) return;
        setSaving(true);

        const datesToSave = [];
        let current = new Date(startDate);
        const end = new Date(isRangeMode ? endDate : startDate);

        // Swap if start > end
        if (current > end) {
            [current, end] = [end, current];
        }

        while (current <= end) {
            // Skip Fridays
            if (current.getDay() !== 5) {
                datesToSave.push(getLocalDateString(current));
            }
            current.setDate(current.getDate() + 1);
        }

        // Save all dates
        const newHolidays = { ...holidays };
        for (const dateStr of datesToSave) {
            const success = await HolidayService.addHoliday(dateStr, holidayName);
            if (success) {
                newHolidays[dateStr] = { date: dateStr, name: holidayName };
            }
        }

        setHolidays(newHolidays);
        setModalVisible(false);
        setSaving(false);
    };

    const deleteHoliday = async (date) => {
        setDeletingDate(date);
        const success = await HolidayService.removeHoliday(date);
        if (success) {
            setHolidays(prev => {
                const updated = { ...prev };
                delete updated[date];
                return updated;
            });
        } else {
            showAlert({
                title: "Error",
                message: "Failed to delete holiday.",
                type: ALERT_TYPES.ERROR
            });
        }
        setDeletingDate(null);
    };

    const handleDeletePress = (holiday) => {
        showAlert({
            title: "Delete Holiday?",
            message: `Are you sure you want to delete "${holiday.name}"?`,
            type: ALERT_TYPES.WARNING,
            buttons: [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => deleteHoliday(holiday.date) }
            ]
        });
    };

    return (
        <View className="flex-1 bg-gray-50">
            <ScrollView
                className="flex-1 bg-gray-50"
                contentContainerStyle={{ paddingBottom: 40 }}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchHolidays} colors={[COLORS.primary]} progressViewOffset={10} />}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View className="bg-white pt-16 pb-6 px-6 rounded-b-[40px] shadow-sm z-10 mb-6">
                    <View className="flex-row items-center justify-between">
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            className="p-2 bg-gray-50 rounded-full border border-gray-100"
                        >
                            <ChevronLeft color={COLORS.text} size={24} />
                        </TouchableOpacity>
                        <Text className="text-xl font-bold text-gray-800">Events & Holidays</Text>
                        <View className="w-10" />
                    </View>
                </View>

                <View className="px-4">
                    <View className="bg-white p-4 rounded-3xl shadow-sm mb-6">
                        <Calendar
                            // Basic
                            current={getLocalDateString()}
                            onDayPress={handleDayPress}
                            markedDates={markedDates}

                            // Theme
                            theme={{
                                backgroundColor: '#ffffff',
                                calendarBackground: '#ffffff',
                                textSectionTitleColor: '#b6c1cd',
                                selectedDayBackgroundColor: COLORS.primary,
                                selectedDayTextColor: '#ffffff',
                                todayTextColor: COLORS.primary,
                                dayTextColor: '#2d4150',
                                textDisabledColor: '#d9e1e8',
                                dotColor: '#00adf5',
                                selectedDotColor: '#ffffff',
                                arrowColor: COLORS.primary,
                                disabledArrowColor: '#d9e1e8',
                                monthTextColor: COLORS.text,
                                indicatorColor: 'blue',
                                textDayFontWeight: '600',
                                textMonthFontWeight: 'bold',
                                textDayHeaderFontWeight: '600',
                                textDayFontSize: 14,
                                textMonthFontSize: 16,
                                textDayHeaderFontSize: 12
                            }}

                        // Friday Logic: Visual only here via dayComponent or custom style? 
                        // Simplest: Use 'dayNamesShort' to ensure user sees Fri.
                        // We will rely on built-in rendering but block action on Fridays (implemented in handleDayPress).
                        />
                    </View>
                </View>

                {/* Legend / Info */}
                <View className="px-2">
                    <Text className="text-gray-900 font-bold mb-3 text-lg">Legend</Text>
                    <View className="flex-row items-center mb-3 bg-white p-4 rounded-2xl border border-gray-100">
                        <View className="w-4 h-4 rounded-full bg-emerald-600 mr-3" />
                        <View>
                            <Text className="font-bold text-gray-800">Official Holiday</Text>
                            <Text className="text-xs text-gray-500">Tap date to add/remove</Text>
                        </View>
                    </View>
                    <View className="flex-row items-center bg-white p-4 rounded-2xl border border-gray-100">
                        <View className="w-4 h-4 rounded-full bg-gray-800 mr-3" />
                        <View>
                            <Text className="font-bold text-gray-800">Friday (Weekly Off)</Text>
                            <Text className="text-xs text-gray-500">System auto-ignores attendance</Text>
                        </View>
                    </View>
                </View>

                {/* List of Upcoming Holidays */}
                <View className="mt-6 px-2 pb-10">
                    <Text className="text-gray-900 font-bold mb-3 text-lg">Scheduled Holidays</Text>
                    {Object.keys(holidays).length === 0 ? (
                        <Text className="text-gray-400 text-center py-4">No events scheduled.</Text>
                    ) : (
                        Object.values(holidays)
                            .sort((a, b) => new Date(a.date) - new Date(b.date))
                            .map((holiday) => (
                                <Swipeable
                                    key={holiday.date}
                                    renderRightActions={() => (
                                        <TouchableOpacity
                                            onPress={() => {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                                handleDeletePress(holiday);
                                            }}
                                            className="bg-red-500 justify-center items-center px-6 rounded-2xl ml-2 mb-3"
                                        >
                                            <Trash2 size={22} color="white" />
                                            <Text className="text-white text-xs font-bold mt-1">Delete</Text>
                                        </TouchableOpacity>
                                    )}
                                    onSwipeableOpen={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                                >
                                    <View className="flex-row items-center justify-between bg-white p-4 mb-3 rounded-2xl border border-gray-100 shadow-sm">
                                        <View className="flex-row items-center">
                                            <View className="bg-emerald-50 p-3 rounded-xl mr-3">
                                                <CalendarIcon size={20} color={COLORS.primary} />
                                            </View>
                                            <View>
                                                <Text className="font-bold text-gray-800 text-base">{holiday.name}</Text>
                                                <Text className="text-emerald-600 font-medium text-xs">{new Date(holiday.date).toDateString()}</Text>
                                            </View>
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                handleDeletePress(holiday);
                                            }}
                                            disabled={deletingDate === holiday.date}
                                            className="p-2"
                                        >
                                            {deletingDate === holiday.date ? (
                                                <ActivityIndicator size={18} color="#EF4444" />
                                            ) : (
                                                <Trash2 size={18} color="#EF4444" />
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </Swipeable>
                            ))
                    )}
                </View>
            </ScrollView>

            {/* Add Holiday Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <View className="flex-1 justify-end bg-black/50">
                        <View className="bg-white rounded-t-3xl p-6 pb-10">
                            <View className="flex-row justify-between items-center mb-6">
                                <Text className="text-xl font-bold text-gray-900">Add Holiday</Text>
                                <TouchableOpacity onPress={() => setModalVisible(false)}>
                                    <Text className="text-gray-400 font-bold">Cancel</Text>
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View className="bg-gray-50 p-4 rounded-xl mb-4">
                                    <Text className="text-gray-500 text-xs font-bold uppercase mb-1">Start Date</Text>
                                    <Text className="text-gray-900 font-bold text-lg">{new Date(startDate).toDateString()}</Text>
                                </View>

                                {/* Range Toggle */}
                                <TouchableOpacity
                                    className={`flex-row items-center justify-between p-4 rounded-xl mb-4 border ${isRangeMode ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}
                                    onPress={() => setIsRangeMode(!isRangeMode)}
                                >
                                    <Text className={`font-bold ${isRangeMode ? 'text-emerald-700' : 'text-gray-600'}`}>Multiple Days (Range)</Text>
                                    <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${isRangeMode ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300'}`}>
                                        {isRangeMode && <Check size={14} color="white" />}
                                    </View>
                                </TouchableOpacity>

                                {/* End Date Picker (Calendar) */}
                                {isRangeMode && (
                                    <View className="bg-gray-50 p-4 rounded-xl mb-4">
                                        <Text className="text-gray-500 text-xs font-bold uppercase mb-3">Select End Date</Text>
                                        <Calendar
                                            current={startDate}
                                            minDate={startDate}
                                            onDayPress={(day) => setEndDate(day.dateString)}
                                            markedDates={{
                                                [startDate]: { selected: true, startingDay: true, color: COLORS.primary },
                                                [endDate]: { selected: true, endingDay: true, color: COLORS.primary },
                                                ...(endDate ? {
                                                    [endDate]: { selected: true, color: COLORS.primary }
                                                } : {})
                                            }}
                                            theme={{
                                                calendarBackground: 'transparent',
                                                textSectionTitleColor: '#b6c1cd',
                                                selectedDayBackgroundColor: COLORS.primary,
                                                selectedDayTextColor: '#ffffff',
                                                todayTextColor: COLORS.primary,
                                                dayTextColor: '#2d4150',
                                                textDisabledColor: '#d9e1e8',
                                                dotColor: '#00adf5',
                                                selectedDotColor: '#ffffff',
                                                arrowColor: COLORS.primary,
                                                disabledArrowColor: '#d9e1e8',
                                                monthTextColor: COLORS.text,
                                                indicatorColor: 'blue',
                                                textDayFontWeight: '600',
                                                textMonthFontWeight: 'bold',
                                                textDayHeaderFontWeight: '600',
                                                textDayFontSize: 14,
                                                textMonthFontSize: 16,
                                                textDayHeaderFontSize: 12
                                            }}
                                        />
                                        <Text className="text-gray-500 text-xs mt-3 font-medium text-center">
                                            {endDate ? `Ending: ${new Date(endDate).toDateString()}` : 'Tap a date above'}
                                        </Text>
                                    </View>
                                )}

                                <Text className="text-gray-500 text-xs font-bold uppercase mb-2">Event Name</Text>
                                <TextInput
                                    className="bg-gray-50 p-4 rounded-xl text-lg font-medium text-gray-900 mb-6 border border-gray-200"
                                    placeholder="e.g. Winter Vacation, Eid Holidays"
                                    value={holidayName}
                                    onChangeText={setHolidayName}
                                    autoFocus={!isRangeMode} // Only autofocus if not picking dates
                                />

                                <TouchableOpacity
                                    onPress={saveHoliday}
                                    disabled={saving}
                                    className="bg-emerald-600 p-4 rounded-2xl items-center flex-row justify-center mb-6"
                                >
                                    {saving ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <>
                                            <Plus color="white" size={20} className="mr-2" />
                                            <Text className="text-white font-bold text-lg">Save Event</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}
