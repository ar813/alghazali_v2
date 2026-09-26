import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getFeesByGR } from '../lib/sanity';
import { ArrowLeft, Wallet, Calendar, CheckCircle, Clock, AlertTriangle } from 'lucide-react-native';
import { COLORS } from '../theme/colors';
import { StatusBar } from 'expo-status-bar';

export default function FeesScreen() {
    const navigation = useNavigation();
    const { user } = useAuth();
    const [fees, setFees] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadFees();
    }, []);

    const loadFees = async () => {
        if (!user?.grNumber) return;
        setLoading(true);
        try {
            const data = await getFeesByGR(user.grNumber);
            setFees(data || []);
        } catch (error) {
            console.error("Error loading fees:", error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusInfo = (status) => {
        switch (status) {
            case 'paid':
                return {
                    icon: <CheckCircle size={16} color="#059669" />,
                    bg: 'bg-emerald-100',
                    text: 'text-emerald-700',
                    label: 'Paid'
                };
            case 'pending':
                return {
                    icon: <Clock size={16} color="#D97706" />,
                    bg: 'bg-amber-100',
                    text: 'text-amber-700',
                    label: 'Pending'
                };
            case 'overdue':
                return {
                    icon: <AlertTriangle size={16} color="#DC2626" />,
                    bg: 'bg-red-100',
                    text: 'text-red-700',
                    label: 'Overdue'
                };
            default:
                return {
                    icon: <Clock size={16} color={COLORS.gray} />,
                    bg: 'bg-gray-100',
                    text: 'text-gray-600',
                    label: status || 'Unknown'
                };
        }
    };

    const totalPending = fees.filter(f => f.status !== 'paid').reduce((sum, f) => sum + (f.amountPaid || 0), 0);
    const totalPaid = fees.filter(f => f.status === 'paid').reduce((sum, f) => sum + (f.amountPaid || 0), 0);

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <StatusBar style="dark" />

            {/* Header */}
            <View className="flex-row items-center px-6 py-4 bg-white border-b border-gray-100">
                <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
                    <ArrowLeft size={24} color={COLORS.gray} />
                </TouchableOpacity>
                <View className="flex-1">
                    <Text className="text-xl font-bold text-gray-900">Fee Details</Text>
                    <Text className="text-gray-400 text-xs">{fees.length} Records</Text>
                </View>
                <View className="bg-green-100 p-2 rounded-xl">
                    <Wallet size={20} color={COLORS.primary} />
                </View>
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : fees.length === 0 ? (
                <View className="flex-1 items-center justify-center px-6">
                    <Wallet size={48} color={COLORS.gray} />
                    <Text className="text-gray-400 mt-4 text-center font-medium">No fee records found.</Text>
                    <Text className="text-gray-300 text-sm mt-1 text-center">Fee details will appear here when available</Text>
                </View>
            ) : (
                <ScrollView
                    refreshControl={<RefreshControl refreshing={loading} onRefresh={loadFees} colors={[COLORS.primary]} />}
                    contentContainerStyle={{ padding: 24 }}
                >
                    {/* Summary Cards */}
                    <View className="flex-row mb-6">
                        <View className="bg-emerald-500 flex-1 p-4 rounded-2xl mr-2">
                            <Text className="text-emerald-100 text-xs font-medium">Total Paid</Text>
                            <Text className="text-white text-2xl font-bold mt-1">Rs. {totalPaid.toLocaleString()}</Text>
                        </View>
                        <View className="bg-amber-500 flex-1 p-4 rounded-2xl ml-2">
                            <Text className="text-amber-100 text-xs font-medium">Pending</Text>
                            <Text className="text-white text-2xl font-bold mt-1">Rs. {totalPending.toLocaleString()}</Text>
                        </View>
                    </View>

                    {/* Fee Records */}
                    <Text className="text-gray-400 font-bold text-xs uppercase tracking-wider mb-3">Payment History</Text>

                    {fees.map((fee, index) => {
                        const statusInfo = getStatusInfo(fee.status);
                        return (
                            <View
                                key={fee._id || index}
                                className="bg-white p-4 rounded-2xl border border-gray-100 mb-3 shadow-sm"
                            >
                                <View className="flex-row justify-between items-center mb-2">
                                    <View className="flex-1">
                                        <Text className="text-gray-800 font-bold text-base capitalize">{fee.feeType || 'Fee'}</Text>
                                        {fee.month && <Text className="text-gray-500 text-xs mt-0.5">{fee.month} {fee.year}</Text>}
                                    </View>
                                    <View className={`${statusInfo.bg} px-2.5 py-1 rounded-full flex-row items-center`}>
                                        {statusInfo.icon}
                                        <Text className={`${statusInfo.text} text-xs font-bold ml-1`}>{statusInfo.label}</Text>
                                    </View>
                                </View>

                                <View className="flex-row justify-between items-center">
                                    <View className="flex-row items-center">
                                        <Calendar size={14} color={COLORS.gray} />
                                        <Text className="ml-1.5 text-gray-400 text-xs">
                                            {fee.paidDate ? new Date(fee.paidDate).toLocaleDateString() : 'N/A'}
                                        </Text>
                                    </View>
                                    <Text className="text-gray-800 font-bold text-lg">
                                        Rs. {(fee.amountPaid || 0).toLocaleString()}
                                    </Text>
                                </View>
                            </View>
                        );
                    })}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}
