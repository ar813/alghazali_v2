import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getQuizResultsByGR } from '../lib/sanity';
import { ArrowLeft, Trophy, Calendar, Award, TrendingUp, Star, AlertCircle } from 'lucide-react-native';
import { COLORS } from '../theme/colors';
import { StatusBar } from 'expo-status-bar';

export default function QuizResultsScreen() {
    const navigation = useNavigation();
    const { user } = useAuth();
    const [results, setResults] = useState([]);
    const [stats, setStats] = useState({ average: 0, highest: 0, total: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadResults();
    }, []);

    const loadResults = async () => {
        if (!user?.grNumber) return;
        setLoading(true);
        try {
            const data = await getQuizResultsByGR(user.grNumber);
            setResults(data);

            // Calculate stats
            if (data.length > 0) {
                const totalScore = data.reduce((sum, r) => sum + (r.score || 0), 0);
                const average = Math.round(totalScore / data.length);
                const highest = Math.max(...data.map(r => r.score || 0));
                setStats({ average, highest, total: data.length });
            }
        } catch (error) {
            console.error("Error loading quiz results:", error);
        } finally {
            setLoading(false);
        }
    };

    const getScoreBadge = (score) => {
        if (score >= 18) return { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Excellent', icon: Star };
        if (score >= 14) return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Good', icon: TrendingUp };
        if (score >= 10) return { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Average', icon: Award };
        return { bg: 'bg-red-100', text: 'text-red-700', label: 'Needs Work', icon: AlertCircle };
    };

    return (
        <View className="flex-1 bg-gray-50">
            <StatusBar style="light" />

            {/* Gradient Header */}
            <View className="bg-amber-500 pb-10 pt-12 px-6 rounded-b-[40px] shadow-xl relative overflow-hidden">
                <View className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16" />
                <View className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-10 -mb-10" />

                <View className="flex-row items-center mb-6">
                    <TouchableOpacity onPress={() => navigation.goBack()} className="bg-white/20 p-2 rounded-xl mr-4">
                        <ArrowLeft size={24} color="white" />
                    </TouchableOpacity>
                    <Text className="text-white text-xl font-bold flex-1">Quiz Results</Text>
                    <View className="bg-white/20 px-3 py-1 rounded-full">
                        <Text className="text-white font-bold text-xs">{results.length} Attempts</Text>
                    </View>
                </View>

                {/* Stats Row */}
                <View className="flex-row justify-between mb-2">
                    <View className="bg-white/20 p-4 rounded-2xl flex-1 mr-2 items-center backdrop-blur-md">
                        <Text className="text-amber-50 text-xs font-medium uppercase tracking-wider mb-1">Average</Text>
                        <Text className="text-white text-2xl font-bold">{stats.average > 0 ? stats.average : '-'}<Text className="text-sm font-normal text-amber-100">/20</Text></Text>
                    </View>
                    <View className="bg-white/20 p-4 rounded-2xl flex-1 ml-2 items-center backdrop-blur-md">
                        <Text className="text-amber-50 text-xs font-medium uppercase tracking-wider mb-1">Highest</Text>
                        <Text className="text-white text-2xl font-bold">{stats.highest > 0 ? stats.highest : '-'}<Text className="text-sm font-normal text-amber-100">/20</Text></Text>
                    </View>
                </View>
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : results.length === 0 ? (
                <View className="flex-1 items-center justify-center px-6 -mt-20">
                    <View className="bg-white p-6 rounded-full shadow-lg mb-6">
                        <Trophy size={48} color={COLORS.primary} />
                    </View>
                    <Text className="text-gray-800 text-xl font-bold mb-2">No Results Yet</Text>
                    <Text className="text-gray-400 text-center px-8">Complete quizzes to see your performance analytics here.</Text>
                </View>
            ) : (
                <ScrollView
                    refreshControl={<RefreshControl refreshing={loading} onRefresh={loadResults} colors={[COLORS.primary]} />}
                    contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
                >
                    <Text className="text-gray-500 font-bold text-xs uppercase tracking-wider mb-4 px-2">Recent Attempts</Text>

                    {results.map((result, index) => {
                        const badge = getScoreBadge(result.score);
                        const BadgeIcon = badge.icon;

                        return (
                            <View
                                key={result._id || index}
                                className="bg-white p-5 rounded-2xl border border-gray-100 mb-4 shadow-sm"
                            >
                                <View className="flex-row justify-between items-start mb-4">
                                    <View className="flex-1 mr-4">
                                        <Text className="text-gray-800 font-bold text-lg leading-tight">
                                            {result.quiz?.title || 'Quiz'}
                                        </Text>
                                        <Text className="text-gray-400 text-sm mt-1 font-medium">
                                            {result.quiz?.subject || 'General'}
                                        </Text>
                                    </View>
                                    <View className={`${badge.bg} px-3 py-1.5 rounded-xl flex-row items-center`}>
                                        {BadgeIcon && <BadgeIcon size={12} color={badge.text.replace('text-', '').replace('-700', '') === 'emerald' ? '#047857' : '#B45309'} style={{ marginRight: 4 }} />}
                                        <Text className={`${badge.text} text-xs font-bold`}>{badge.label}</Text>
                                    </View>
                                </View>

                                <View className="flex-row items-center justify-between bg-gray-50 p-4 rounded-xl">
                                    <View>
                                        <Text className="text-gray-400 text-xs font-bold uppercase mb-1">Score Achieved</Text>
                                        <View className="flex-row items-baseline">
                                            <Text className="text-gray-900 text-2xl font-bold">{result.score}</Text>
                                            <Text className="text-gray-400 text-sm font-medium">/20</Text>
                                        </View>
                                    </View>
                                    <View className="h-8 w-[1px] bg-gray-200 mx-4" />
                                    <View className="flex-1">
                                        <Text className="text-gray-400 text-xs font-bold uppercase mb-1">Date</Text>
                                        <View className="flex-row items-center">
                                            <Calendar size={16} color="#6B7280" />
                                            <Text className="ml-2 text-gray-700 font-medium">
                                                {result.submittedAt ? new Date(result.submittedAt).toLocaleDateString() : 'N/A'}
                                            </Text>
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
