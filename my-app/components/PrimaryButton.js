import React from 'react';
import { Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { COLORS } from '../theme/colors';

export default function PrimaryButton({ title, onPress, isLoading = false, style }) {
    return (
        <TouchableOpacity
            className={`w-full p-4 rounded-xl items-center justify-center shadow-sm active:opacity-90 ${isLoading ? 'opacity-80' : ''}`}
            style={[{ backgroundColor: COLORS.primary }, style]}
            onPress={onPress}
            disabled={isLoading}
        >
            {isLoading ? (
                <ActivityIndicator color={COLORS.white} />
            ) : (
                <Text className="text-white font-bold text-lg">{title}</Text>
            )}
        </TouchableOpacity>
    );
}
