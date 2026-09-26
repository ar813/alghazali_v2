import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getNotices } from '../lib/sanity';
import { ArrowLeft, Bell, Calendar, AlertCircle, Megaphone, Star, CalendarDays } from 'lucide-react-native';
import { COLORS } from '../theme/colors';
import { StatusBar } from 'expo-status-bar';

export default function NoticesScreen() {
    const navigation = useNavigation();
    const { user } = useAuth();
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadNotices();
    }, []);

    const loadNotices = async () => {
        setLoading(true);
        try {
            const data = await getNotices(user?.admissionFor);
            setNotices(data || []);
        } catch (error) {
            console.error("Error loading notices:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-gray-50">
            <StatusBar style="light" />

            {/* Gradient Header */}
            <View className="bg-rose-600 pb-10 pt-12 px-6 rounded-b-[40px] shadow-xl relative overflow-hidden">
                <View className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16" />
                <View className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-10 -mb-10" />

                <View className="flex-row items-center mb-6">
                    <TouchableOpacity onPress={() => navigation.goBack()} className="bg-white/20 p-2 rounded-xl mr-4">
                        <ArrowLeft size={24} color="white" />
                    </TouchableOpacity>
                    <Text className="text-white text-xl font-bold flex-1">Notices & Events</Text>
                    <View className="bg-white/20 p-2 rounded-xl">
                        <Megaphone size={20} color="white" />
                    </View>
                </View>

                {/* Summary / Banner */}
                <View className="bg-white/10 p-4 rounded-2xl flex-row items-center backdrop-blur-md border border-white/10">
                    <Bell size={24} color="white" />
                    <View className="ml-4 flex-1">
                        <Text className="text-white font-bold text-lg">{notices.length} Announcements</Text>
                        <Text className="text-rose-100 text-xs">Stay updated with latest news</Text>
                    </View>
                </View>
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : notices.length === 0 ? (
                <View className="flex-1 items-center justify-center px-6 -mt-20">
                    <View className="bg-white p-6 rounded-full shadow-lg mb-6">
                        <Bell size={48} color={COLORS.gray} />
                    </View>
                    <Text className="text-gray-400 font-bold text-lg">No notices available</Text>
                    <Text className="text-gray-400 text-sm mt-1 text-center font-medium">Check back later for announcements</Text>
                </View>
            ) : (
                <ScrollView
                    refreshControl={<RefreshControl refreshing={loading} onRefresh={loadNotices} colors={[COLORS.primary]} />}
                    contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
                >
                    <Text className="text-gray-500 font-bold text-xs uppercase tracking-wider mb-4 px-2">Recent Updates</Text>

                    {notices.map((notice, index) => {
                        const isHeadline = notice.isHeadline;
                        const isEvent = notice.isEvent;

                        return (
                            <View
                                key={notice._id || index}
                                className={`bg-white p-5 rounded-2xl mb-4 shadow-sm ${isHeadline ? 'border border-rose-200 bg-rose-50/30' : 'border border-gray-100'}`}
                            >
                                {/* Headline Badge */}
                                {isHeadline && (
                                    <View className="flex-row items-center mb-3">
                                        <View className="bg-rose-500 px-2 py-1 rounded-lg mr-2 flex-row items-center">
                                            <Star size={10} color="white" fill="white" />
                                            <Text className="text-white font-bold text-[10px] ml-1 uppercase">Important</Text>
                                        </View>
                                    </View>
                                )}

                                {/* Title & Event Type */}
                                <View className="flex-row justify-between items-start mb-2">
                                    <View className="flex-1 mr-3">
                                        <Text className={`text-gray-900 font-bold ${isHeadline ? 'text-lg' : 'text-base'}`}>
                                            {notice.title}
                                        </Text>
                                    </View>
                                    {notice.eventType && (
                                        <View className="bg-blue-100 px-2.5 py-1 rounded-lg">
                                            <Text className="text-blue-700 text-[10px] font-bold uppercase">{notice.eventType}</Text>
                                        </View>
                                    )}
                                </View>

                                {/* Content */}
                                <Text className="text-gray-600 text-sm leading-relaxed mb-4">{notice.content}</Text>

                                {/* Footer - Dates */}
                                <View className="pt-3 border-t border-gray-100/50 space-y-2">
                                    {/* Event Date (if event) */}
                                    {isEvent && notice.eventDate && (
                                        <View className="flex-row items-center bg-amber-50 p-2.5 rounded-xl border border-amber-100">
                                            <CalendarDays size={16} color="#D97706" />
                                            <Text className="ml-2 text-amber-900 text-xs font-bold">
                                                Event: {new Date(notice.eventDate).toLocaleDateString('en-US', {
                                                    weekday: 'short',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </Text>
                                        </View>
                                    )}

                                    {/* Posted Date */}
                                    <View className="flex-row items-center justify-between mt-1">
                                        <View className="flex-row items-center">
                                            <Calendar size={12} color={COLORS.gray} />
                                            <Text className="ml-1.5 text-gray-400 text-xs font-medium">
                                                Posted: {notice.createdAt ? new Date(notice.createdAt).toLocaleDateString() : 'N/A'}
                                            </Text>
                                        </View>
                                        <View className="bg-gray-100 px-2 py-0.5 rounded-md">
                                            <Text className="text-gray-500 text-[10px] font-bold uppercase">{notice.targetType || 'All'}</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        );
                    })}
                </ScrollView>
            )}
        </View>
    );
}
