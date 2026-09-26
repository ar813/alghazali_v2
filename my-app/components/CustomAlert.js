import React, { useEffect, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export const ALERT_TYPES = {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info',
};

const CustomAlert = ({ visible, title, message, type = ALERT_TYPES.INFO, buttons = [], onClose }) => {
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 5,
                    tension: 40,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 150,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    if (!visible) return null;

    const getIcon = () => {
        switch (type) {
            case ALERT_TYPES.SUCCESS:
                return <CheckCircle size={48} color="#10B981" weight="fill" />; // emerald-500
            case ALERT_TYPES.ERROR:
                return <XCircle size={48} color="#EF4444" weight="fill" />; // red-500
            case ALERT_TYPES.WARNING:
                return <AlertTriangle size={48} color="#F59E0B" weight="fill" />; // amber-500
            default: // INFO
                return <Info size={48} color="#3B82F6" weight="fill" />; // blue-500
        }
    };

    const getColors = () => {
        switch (type) {
            case ALERT_TYPES.SUCCESS: return { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-800' };
            case ALERT_TYPES.ERROR: return { bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-800' };
            case ALERT_TYPES.WARNING: return { bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-800' };
            default: return { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-800' };
        }
    };

    const styles = getColors();

    return (
        <Modal transparent visible={visible} animationType="none" onRequestClose={() => { }}>
            <View className="flex-1 justify-center items-center bg-black/60 px-6">
                <Animated.View
                    className={`bg-white w-full rounded-3xl p-6 items-center shadow-2xl relative overflow-hidden`}
                    style={{
                        transform: [{ scale: scaleAnim }],
                        opacity: opacityAnim,
                        maxWidth: 400
                    }}
                >
                    {/* Decorative Background Blur/Gradient Element */}
                    <View className={`absolute top-0 w-full h-2 ${type === ALERT_TYPES.SUCCESS ? 'bg-emerald-500' : type === ALERT_TYPES.ERROR ? 'bg-red-500' : type === ALERT_TYPES.WARNING ? 'bg-amber-500' : 'bg-blue-500'}`} />

                    {/* Icon Container */}
                    <View className={`mb-5 p-4 rounded-full ${styles.bg} ${styles.border} border-4`}>
                        {getIcon()}
                    </View>

                    {/* Content */}
                    <Text className="text-xl font-bold text-gray-900 text-center mb-2 tracking-tight">
                        {title}
                    </Text>
                    <Text className="text-gray-500 text-center font-medium leading-5 mb-8 text-sm">
                        {message}
                    </Text>

                    {/* Buttons */}
                    <View className="w-full flex-col space-y-3">
                        {buttons.length > 0 ? (
                            buttons.map((btn, index) => (
                                <TouchableOpacity
                                    key={index}
                                    onPress={() => {
                                        if (btn.onPress) btn.onPress();
                                        if (btn.style === 'cancel' || !btn.style) onClose();
                                        // Standard behavior: clicking a button usually closes unless specific manual handling
                                        // But here we rely on parent to close, or we close automatically.
                                        // We'll mimic standard Alert: firing onPress doesn't auto-close in React Native? 
                                        // Actually RN Alert calls onPress then dismisses. We should probably dismiss.
                                        // We'll let the Context handle the dismissal or the caller.
                                        // For now, let's assume Context calls hideAlert() which sets visible false.
                                        // But if we use this component standalone, we might want to just call onClose.
                                    }}
                                    className={`w-full py-3.5 rounded-xl items-center flex-row justify-center ${btn.style === 'destructive'
                                        ? 'bg-red-500 shadow-sm shadow-red-200'
                                        : btn.style === 'cancel'
                                            ? 'bg-gray-100'
                                            : 'bg-gray-900 shadow-sm shadow-gray-300'
                                        }`}
                                >
                                    <Text
                                        className={`font-bold text-base ${btn.style === 'cancel'
                                            ? 'text-gray-700'
                                            : 'text-white'
                                            }`}
                                    >
                                        {btn.text}
                                    </Text>
                                </TouchableOpacity>
                            ))
                        ) : (
                            <TouchableOpacity
                                onPress={onClose}
                                className="w-full py-3.5 bg-gray-900 rounded-xl items-center shadow-sm shadow-gray-300"
                            >
                                <Text className="text-white font-bold text-base">OK</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

export default CustomAlert;
