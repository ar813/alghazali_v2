import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking, Image, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Globe, MapPin, Mail, Award, Code, BookOpen, ExternalLink, GraduationCap } from 'lucide-react-native';
// import { Image } from 'expo-image'; // User has not installed expo-image yet, revert to standard Image if needed or check package.json. 
// User *has* installed expo-image in my previous logical step (I asked them to). 
// But just to be safe and avoid "stuck" issues if they didn't, I'll use standard Image for now or conditional. 
// Actually, earlier I reverted expo-image in StudentListScreen because user said "Unable to resolve". 
// So I should use standard Image from react-native.
// import { LinearGradient } from 'expo-linear-gradient'; // Removed to fix build error 
// Dashboard uses "className" so I will use NativeWind.

const SectionCard = ({ title, description, link, icon, color, badge }) => (
    <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => link && Linking.openURL(link)}
        className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-5"
    >
        <View className="flex-row items-start justify-between mb-3">
            <View className={`p-3 rounded-2xl ${color}`}>
                {icon}
            </View>
            {badge && (
                <View className="bg-gray-100 px-3 py-1 rounded-full">
                    <Text className="text-xs font-semibold text-gray-600">{badge}</Text>
                </View>
            )}
        </View>

        <Text className="text-xl font-bold text-gray-800 mb-2">{title}</Text>
        <Text className="text-gray-500 leading-6 mb-4">{description}</Text>

        {link && (
            <View className="flex-row items-center">
                <Text className="text-emerald-600 font-bold mr-2">Visit Website</Text>
                <ExternalLink size={16} color="#059669" />
            </View>
        )}
    </TouchableOpacity>
);

const DeveloperCard = () => (
    <View className="bg-gray-900 p-6 rounded-[32px] mb-8 relative overflow-hidden">
        {/* Abstract Background Design */}
        <View className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 rounded-full -mr-16 -mt-16 opacity-20" />
        <View className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500 rounded-full -ml-12 -mb-12 opacity-20" />

        <View className="items-center mb-6">
            <View className="w-20 h-20 bg-gray-800 rounded-full items-center justify-center mb-4 border-2 border-emerald-500/50">
                <Code color="#34D399" size={32} />
            </View>
            <Text className="text-white text-2xl font-bold text-center">Abdul Rafay Naeem</Text>
            <Text className="text-emerald-400 font-medium tracking-widest text-xs uppercase mt-1">Agentic AI Engineer</Text>
        </View>

        <View className="space-y-4">
            <View className="flex-row items-center bg-white/5 p-3 rounded-xl border border-white/10">
                <Award size={20} color="#9CA3AF" className="mr-3" />
                <View>
                    <Text className="text-gray-400 text-xs">Certified In</Text>
                    <Text className="text-white font-semibold">Agentic AI, Web3 & Metaverse</Text>
                </View>
            </View>
            <View className="flex-row items-center bg-white/5 p-3 rounded-xl border border-white/10">
                <Globe size={20} color="#9CA3AF" className="mr-3" />
                <View>
                    <Text className="text-gray-400 text-xs">Portfolio</Text>
                    <Text className="text-white font-semibold">abdulrafay.online</Text>
                </View>
            </View>
            <View className="flex-row items-center bg-white/5 p-3 rounded-xl border border-white/10">
                <GraduationCap size={20} color="#9CA3AF" className="mr-3" />
                <View>
                    <Text className="text-gray-400 text-xs">Designation</Text>
                    <Text className="text-white font-semibold">Teaching and IT Faculty</Text>
                </View>
            </View>
        </View>

        <TouchableOpacity
            onPress={() => Linking.openURL('https://abdulrafay.online')}
            className="mt-6 bg-emerald-600 w-full py-4 rounded-xl items-center active:bg-emerald-700"
        >
            <Text className="text-white font-bold text-lg">Contact Developer</Text>
        </TouchableOpacity>
    </View>
);

export default function AboutScreen() {
    const navigation = useNavigation();

    return (
        <View className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="pt-14 px-6 pb-6 bg-white z-10 border-b border-gray-100">
                <View className="flex-row items-center justify-between">
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center border border-gray-200"
                    >
                        <ChevronLeft color="#374151" size={24} />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-gray-800">About & Credits</Text>
                    <View style={{ width: 40 }} />
                </View>
            </View>

            <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50 }}>

                <Text className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 ml-1">Institutions</Text>

                <SectionCard
                    title="Al-Ghazali High School"
                    description="A premier educational institution dedicated to academic excellence, fostering values, and shaping the future leaders of tomorrow."
                    link="https://alghazali.vercel.app"
                    icon={<BookOpen color="#D97706" size={24} />}
                    color="bg-amber-100"
                    badge="Education Partner"
                />

                <SectionCard
                    title="Mahad Usman Bin Affan"
                    description="A center for Islamic learning, specializing in Hifz-e-Quran, Hadith studies, and religious scholarship."
                    link="https://mahadusman.com"
                    icon={<Globe color="#2563EB" size={24} />}
                    color="bg-blue-100"
                    badge="Religious Institute"
                />

                <Text className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 ml-1 mt-4">Developed By</Text>

                <DeveloperCard />

                <Text className="text-center text-gray-400 text-xs mb-8">
                    Version 11.2.9 • Built with ❤️ by Abdul Rafay
                </Text>

            </ScrollView>
        </View>
    );
}
