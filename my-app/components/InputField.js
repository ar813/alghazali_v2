import React, { forwardRef } from 'react';
import { View, Text, TextInput } from 'react-native';
import { COLORS } from '../theme/colors';

const InputField = forwardRef(({
    label,
    value,
    onChangeText,
    placeholder,
    secureTextEntry,
    keyboardType = 'default',
    visble = true,
    icon,
    rightIcon,
    containerStyle,
    onSubmitEditing,
    returnKeyType,
    blurOnSubmit,
    autoComplete,
    textContentType
}, ref) => {
    if (!visble) return null;

    return (
        <View className="mb-4">
            {label && <Text className="text-gray-700 mb-1 ml-1 font-medium">{label}</Text>}
            <View
                className="flex-row items-center w-full bg-gray-50 border border-gray-200 rounded-xl px-4"
                style={[{ height: 56 }, containerStyle]}
            >
                {icon && <View className="mr-3">{icon}</View>}
                <TextInput
                    ref={ref}
                    className="flex-1 text-gray-900 text-base h-full"
                    placeholder={placeholder}
                    placeholderTextColor={COLORS.textLight}
                    value={value}
                    onChangeText={onChangeText}
                    secureTextEntry={secureTextEntry}
                    keyboardType={keyboardType}
                    autoCapitalize="none"
                    onSubmitEditing={onSubmitEditing}
                    returnKeyType={returnKeyType}
                    blurOnSubmit={blurOnSubmit}
                    autoComplete={autoComplete}
                    textContentType={textContentType}
                    style={{ paddingVertical: 0 }} // Fix for Android text clipping
                />
                {rightIcon && <View className="ml-3">{rightIcon}</View>}
            </View>
        </View>
    );
});

export default InputField;
