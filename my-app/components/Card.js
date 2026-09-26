import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

export default function Card({ title, value, icon, onPress, color = "bg-white" }) {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={onPress ? 0.7 : 1}
            className={`p-4 rounded-2xl shadow-sm mb-4 border border-gray-100 ${color}`}
        >
            <View className="flex-row justify-between items-center">
                <View>
                    <Text className="text-gray-500 text-sm font-medium">{title}</Text>
                    <Text className="text-2xl font-bold text-gray-800 mt-1">{value}</Text>
                </View>
                {/* Placeholder for Icon if we add an icon library later */}
                {icon && <View className="bg-green-50 p-2 rounded-full">{icon}</View>}
            </View>
        </TouchableOpacity>
    );
}
