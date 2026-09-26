import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Calendar as CalendarIcon, PartyPopper,  } from 'lucide-react-native';
import { COLORS } from '../theme/colors';
import { HolidayService } from '../services/holiday.service';
import { getLocalDateString } from '../lib/date.utils';

export default function StudentHolidaysScreen() {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [holidays, setHolidays] = useState({});
    const [markedDates, setMarkedDates] = useState({});

    // Fetch Holidays (Firebase Only)
    const fetchData = useCallback(async () => {
        try {
            const holidaysData = await HolidayService.getHolidays();
            setHolidays(holidaysData);
            generateMarkedDates(holidaysData);
        } catch (error) {
            console.error("Error fetching holidays:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData();
    }, [fetchData]);

    const generateMarkedDates = (holidaysData) => {
        const marks = {};

        // 1. Mark all Fridays as Gray (Weekly Off)
        const today = new Date();
        const startYear = today.getFullYear() - 1;
        const endYear = today.getFullYear() + 1;

        for (let year = startYear; year <= endYear; year++) {
            for (let month = 0; month < 12; month++) {
                let d = new Date(year, month, 1);
                while (d.getMonth() === month) {
                    if (d.getDay() === 5) { // Friday
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
        Object.values(holidaysData).forEach(holiday => {
            marks[holiday.date] = {
                marked: true,
                dotColor: 'white',
                selected: true,
                selectedColor: COLORS.primary,
                textColor: 'white'
            };
        });
        setMarkedDates(marks);
    };

    const getUpcomingHolidays = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return Object.values(holidays)
            .map(h => ({ ...h, dateObj: new Date(h.date) }))
            .filter(h => h.dateObj >= today)
            .sort((a, b) => a.dateObj - b.dateObj);
    };

    return (
        <View className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-white pt-12 pb-4 px-4 flex-row items-center border-b border-gray-100 shadow-sm">
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    className="p-2 bg-gray-50 rounded-full mr-3"
                >
                    <ChevronLeft size={24} color="#374151" />
                </TouchableOpacity>
                <View className="bg-purple-100 p-2 rounded-xl mr-3">
                    <CalendarIcon size={20} color={COLORS.primary} />
                </View>
                <View>
                    <Text className="text-xl font-bold text-gray-900">School Calendar</Text>
                    <Text className="text-gray-500 text-xs">Holidays & Events</Text>
                </View>
            </View>

            <ScrollView
                className="flex-1 px-5 pt-6"
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
                }
            >
                {/* Calendar View */}
                <View className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 mb-6">
                    <Calendar
                        markingType={'custom'}
                        markedDates={markedDates}
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
                            monthTextColor: '#1F2937',
                            indicatorColor: COLORS.primary,
                            textDayFontWeight: '600',
                            textMonthFontWeight: 'bold',
                            textDayHeaderFontWeight: '600',
                            textDayFontSize: 14,
                            textMonthFontSize: 16,
                            textDayHeaderFontSize: 12
                        }}
                        enableSwipeMonths={true}
                    />
                </View>

                {/* Upcoming Holidays List */}
                <Text className="text-gray-900 font-bold text-lg mb-4">Upcoming Holidays</Text>

                {loading ? (
                    <ActivityIndicator size="large" color={COLORS.primary} className="mt-10" />
                ) : getUpcomingHolidays().length > 0 ? (
                    <View className="pb-8">
                        {getUpcomingHolidays().map((holiday, index) => (
                            <View
                                key={holiday.date || index}
                                className="bg-white p-4 rounded-2xl mb-3 border border-gray-100 flex-row items-center shadow-sm"
                            >
                                <View className="bg-purple-50 p-3 rounded-xl mr-4 items-center justify-center w-14">
                                    <Text className="text-purple-700 font-bold text-lg">
                                        {new Date(holiday.date).getDate()}
                                    </Text>
                                    <Text className="text-purple-500 text-[10px] uppercase font-bold">
                                        {new Date(holiday.date).toLocaleDateString('en-US', { month: 'short' })}
                                    </Text>
                                </View>
                                <View className="flex-1">
                                    <View className="flex-row items-center mb-1">
                                        <Text className="text-gray-900 font-bold text-base flex-1">{holiday.name}</Text>
                                        <View className="bg-green-100 px-2 py-0.5 rounded text-xs">
                                            <Text className="text-green-700 font-bold text-[10px] uppercase">Holiday</Text>
                                        </View>
                                    </View>
                                    <Text className="text-gray-500 text-sm">
                                        {new Date(holiday.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric' })}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                ) : (
                    <View className="items-center justify-center py-10 opacity-50">
                        <PartyPopper size={48} color="#9CA3AF" />
                        <Text className="text-gray-400 mt-3 font-medium">No upcoming holidays</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
