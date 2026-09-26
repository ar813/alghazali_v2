import React, { useState } from 'react';
import { TouchableOpacity, Text, View, Animated } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Copy, Check } from 'lucide-react-native';
import { COLORS } from '../theme/colors';

export default function CopyableText({ label, value, color = COLORS.gray }) {
    const [copied, setCopied] = useState(false);
    
    // Simple fade animation
    const opacity = new Animated.Value(1);

    const handleCopy = async () => {
        if (!value) return;
        
        await Clipboard.setStringAsync(String(value));
        setCopied(true);

        // Reset after 2 seconds
        setTimeout(() => {
            setCopied(false);
        }, 2000);
    };

    return (
        <TouchableOpacity 
            onPress={handleCopy} 
            activeOpacity={0.7}
            className="flex-row justify-between items-center py-1"
        >
            <View>
                {label && <Text className="text-gray-400 text-[10px] font-bold uppercase mb-0.5">{label}</Text>}
                <Text style={{ color: color }} className="font-bold text-lg">
                    {value || 'N/A'}
                </Text>
            </View>

            {value && (
                <View className={`p-2 rounded-full ${copied ? 'bg-green-100' : 'bg-gray-100'}`}>
                    {copied ? (
                        <Check size={16} color={COLORS.success || '#10B981'} />
                    ) : (
                        <Copy size={16} color={COLORS.gray || '#9CA3AF'} />
                    )}
                </View>
            )}
        </TouchableOpacity>
    );
}
