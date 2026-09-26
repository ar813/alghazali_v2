import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getScheduleByClass } from '../lib/sanity';
import { ArrowLeft, Clock, BookOpen, Calendar } from 'lucide-react-native';
import { COLORS } from '../theme/colors';
import { StatusBar } from 'expo-status-bar';

export default function ScheduleScreen() {
    const navigation = useNavigation();
    const { user } = useAuth();
    const [schedule, setSchedule] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSchedule();
    }, []);

    const loadSchedule = async () => {
        if (!user?.admissionFor) return;
        setLoading(true);
        try {
            const data = await getScheduleByClass(user.admissionFor);
            setSchedule(data);
        } catch (error) {
            console.error("Error loading schedule:", error);
        } finally {
            setLoading(false);
        }
    };

    const days = schedule?.days || [];

    return (
        <View className="flex-1 bg-gray-50">
            <StatusBar style="light" />

            {/* Header Area */}
            <View className="bg-blue-600 pt-12 pb-8 px-6 relative z-10 rounded-b-[30px] shadow-lg">
                <View className="flex-row items-center mb-4">
                    <TouchableOpacity onPress={() => navigation.goBack()} className="bg-white/20 p-2 rounded-xl mr-4">
                        <ArrowLeft size={24} color="white" />
                    </TouchableOpacity>
                    <View className="flex-1">
                        <Text className="text-white text-xl font-bold tracking-wide">Timetable</Text>
                        <Text className="text-blue-100 text-sm font-medium">Class {user?.admissionFor}</Text>
                    </View>
                </View>

                {/* Date Display */}
                <View className="flex-row items-center">
                    <Calendar size={16} color="#DBEAFE" />
                    <Text className="text-blue-50 ml-2 font-medium">
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </Text>
                </View>
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : !schedule || days.length === 0 ? (
                <View className="flex-1 items-center justify-center px-6">
                    <BookOpen size={48} color={COLORS.gray} />
                    <Text className="text-gray-400 mt-4 text-center font-medium">No schedule found</Text>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={{ padding: 24, paddingTop: 32, paddingBottom: 100 }}
                    refreshControl={<RefreshControl refreshing={loading} onRefresh={loadSchedule} colors={[COLORS.primary]} />}
                >
                    {days.map((dayObj, dayIndex) => (
                        <View key={dayIndex} className="mb-10">
                            {/* Day Title */}
                            <View className="flex-row items-center mb-6 pl-2">
                                <View className="w-1.5 h-6 bg-blue-600 rounded-full mr-3" />
                                <Text className="text-gray-900 font-bold text-2xl tracking-tight">{dayObj.day}</Text>
                            </View>

                            {dayObj.periods?.map((period, index) => {
                                const isBreak = period.subject === 'Break Time';
                                const isLast = index === dayObj.periods.length - 1;

                                // Visual connector line
                                const LineConnector = !isLast && (
                                    <View className="absolute left-[29px] top-12 bottom-[-24px] w-[2px] bg-gray-200 z-0" />
                                );

                                return (
                                    <View key={index} className="flex-row relative mb-6">
                                        {LineConnector}

                                        {/* Timeline Dot */}
                                        <View className="w-16 items-center z-10 pt-1">
                                            <View className={`w-8 h-8 rounded-full items-center justify-center border-2 border-white shadow-sm ${isBreak ? 'bg-amber-100' : 'bg-blue-100'
                                                }`}>
                                                {isBreak ? (
                                                    <Clock size={14} color="#D97706" />
                                                ) : (
                                                    <Text className="text-blue-700 font-bold text-xs">{index + 1}</Text>
                                                )}
                                            </View>
                                        </View>

                                        {/* Content Card */}
                                        <View className={`flex-1 p-4 rounded-2xl shadow-sm border ${isBreak
                                                ? 'bg-amber-50 border-amber-100'
                                                : 'bg-white border-gray-100'
                                            }`}>
                                            <View className="flex-row justify-between items-start mb-1">
                                                <Text className={`font-bold text-lg ${isBreak ? 'text-amber-900' : 'text-gray-800'}`}>
                                                    {period.subject}
                                                </Text>
                                                <View className={`px-2 py-0.5 rounded-md ${isBreak ? 'bg-amber-200/50' : 'bg-blue-50'}`}>
                                                    <Text className={`text-[10px] font-bold ${isBreak ? 'text-amber-800' : 'text-blue-700'}`}>
                                                        35 min
                                                    </Text>
                                                </View>
                                            </View>

                                            <View className="flex-row items-center mt-1">
                                                <Clock size={14} color={isBreak ? '#B45309' : '#6B7280'} />
                                                <Text className={`ml-1.5 text-sm font-medium ${isBreak ? 'text-amber-700' : 'text-gray-500'}`}>
                                                    {period.time}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    ))}
                </ScrollView>
            )}
        </View>
    );
}
