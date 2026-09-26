import React from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, Modal } from 'react-native';
import CopyableText from '../components/CopyableText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, User, Phone, MapPin, Calendar, CreditCard, Globe, Users, AlertTriangle, X } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { COLORS } from '../theme/colors';
import { StatusBar } from 'expo-status-bar';

export default function ProfileScreen() {
    const navigation = useNavigation();
    const { user } = useAuth();

    const InfoRow = ({ icon, label, value }) => (
        <View className="flex-row items-center py-4 border-b border-gray-100">
            <View className="bg-emerald-50 p-2.5 rounded-xl mr-4">
                {icon}
            </View>
            <View className="flex-1">
                <Text className="text-gray-400 text-xs font-medium uppercase tracking-wide">{label}</Text>
                <Text className="text-gray-800 font-semibold text-base mt-0.5">{value || 'N/A'}</Text>
            </View>
        </View>
    );

    const [idCardVisible, setIdCardVisible] = React.useState(false);

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <StatusBar style="dark" />

            {/* Header */}
            <View className="flex-row items-center px-6 py-4 bg-white border-b border-gray-100">
                <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
                    <ArrowLeft size={24} color={COLORS.gray} />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-900">My Profile</Text>
            </View>

            <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>

                {/* Profile Header Card */}
                <View className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-6 items-center">
                    <View className="h-24 w-24 rounded-full bg-emerald-100 p-1 mb-4">
                        {user?.photo?.asset?.url ? (
                            <Image
                                source={{ uri: user.photo.asset.url }}
                                style={{ width: '100%', height: '100%', borderRadius: 999 }}
                            />
                        ) : (
                            <View className="h-full w-full bg-emerald-200 rounded-full items-center justify-center">
                                <User size={40} color={COLORS.primary} />
                            </View>
                        )}
                    </View>
                    <Text className="text-2xl font-bold text-gray-900">{user?.fullName}</Text>
                    <Text className="text-gray-500 font-medium mt-1">Class {user?.admissionFor} • Roll #{user?.rollNumber}</Text>

                    <View className="flex-row items-center mt-4">
                        <View className="bg-emerald-100 px-4 py-1.5 rounded-full mr-2">
                            <CopyableText
                                value={`GR: ${user?.grNumber}`}
                                color="#047857"
                            />
                        </View>
                        <TouchableOpacity
                            onPress={() => setIdCardVisible(true)}
                            className="bg-gray-900 px-4 py-1.5 rounded-full flex-row items-center"
                        >
                            <CreditCard size={12} color="white" />
                            <Text className="text-white font-bold text-xs ml-1.5">Digital ID Card</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Details Card */}
                <View className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
                    <Text className="text-gray-400 font-bold text-xs uppercase tracking-wider mb-2">Personal Information</Text>

                    <InfoRow
                        icon={<Users size={20} color={COLORS.primary} />}
                        label="Father's Name"
                        value={user?.fatherName}
                    />
                    {/* Surname removed per request */}

                    <InfoRow
                        icon={<Calendar size={20} color={COLORS.primary} />}
                        label="Date of Birth"
                        value={user?.dob ? new Date(user.dob).toLocaleDateString() : null}
                    />
                    <InfoRow
                        icon={<Calendar size={20} color={COLORS.primary} />}
                        label="Admission Date"
                        value={user?.dateOfAdmission ? new Date(user.dateOfAdmission).toLocaleDateString() : 'N/A'}
                    />
                    <InfoRow
                        icon={<User size={20} color={COLORS.primary} />}
                        label="Gender"
                        value={user?.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) : 'N/A'}
                    />
                    <View className="flex-row items-center py-2 border-b border-gray-100">
                        <View className="bg-emerald-50 p-2.5 rounded-xl mr-4">
                            <CreditCard size={20} color={COLORS.primary} />
                        </View>
                        <View className="flex-1">
                            <CopyableText
                                label="CNIC / B-Form"
                                value={user?.cnicOrBform}
                                color="#1f2937"
                            />
                        </View>
                    </View>
                    <View className="flex-row items-center py-2 border-b border-gray-100">
                        <View className="bg-emerald-50 p-2.5 rounded-xl mr-4">
                            <CreditCard size={20} color={COLORS.primary} />
                        </View>
                        <View className="flex-1">
                            <CopyableText
                                label="Father CNIC"
                                value={user?.fatherCnic}
                                color="#1f2937"
                            />
                        </View>
                    </View>
                    <InfoRow
                        icon={<Globe size={20} color={COLORS.primary} />}
                        label="Nationality"
                        value={user?.nationality}
                    />
                    <InfoRow
                        icon={<Globe size={20} color={COLORS.primary} />}
                        label="Religion"
                        value={user?.religion}
                    />
                    <InfoRow
                        icon={<CreditCard size={20} color={COLORS.primary} />}
                        label="Blood Group"
                        value={user?.bloodGroup}
                    />
                    <InfoRow
                        icon={<Phone size={20} color={COLORS.primary} />}
                        label="Contact Number"
                        value={user?.phoneNumber}
                    />
                    <InfoRow
                        icon={<MapPin size={20} color={COLORS.primary} />}
                        label="Address"
                        value={user?.address}
                    />

                    <Text className="text-gray-400 font-bold text-xs uppercase tracking-wider mb-2 mt-6">Guardian Information</Text>

                    <InfoRow
                        icon={<Users size={20} color={COLORS.primary} />}
                        label="Guardian Name"
                        value={user?.guardianName}
                    />
                    <InfoRow
                        icon={<Users size={20} color={COLORS.primary} />}
                        label="Relation"
                        value={user?.guardianRelation}
                    />
                    <InfoRow
                        icon={<Phone size={20} color={COLORS.primary} />}
                        label="Guardian Contact"
                        value={user?.guardianContact}
                    />

                    <Text className="text-gray-400 font-bold text-xs uppercase tracking-wider mb-2 mt-6">Additional Details</Text>

                    <InfoRow
                        icon={<Phone size={20} color={COLORS.primary} />}
                        label="WhatsApp Number"
                        value={user?.whatsappNumber}
                    />
                    <InfoRow
                        icon={<AlertTriangle size={20} color={COLORS.primary} />}
                        label="Medical Condition"
                        value={user?.medicalCondition}
                    />
                </View>
            </ScrollView>

            {/* ID Card Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={idCardVisible}
                onRequestClose={() => setIdCardVisible(false)}
            >
                <View className="flex-1 bg-black/80 justify-center items-center p-6">
                    <View className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden">
                        {/* Card Header (Green) */}
                        <View className="bg-emerald-600 p-6 flex-row justify-between items-start">
                            <View>
                                <Text className="text-emerald-100 font-bold text-xs uppercase tracking-widest">Student Card</Text>
                                <Text className="text-white text-xl font-extrabold mt-1">Al-Ghazali High School</Text>
                            </View>
                            <TouchableOpacity onPress={() => setIdCardVisible(false)} className="bg-black/20 p-2 rounded-full">
                                <X size={20} color="white" />
                            </TouchableOpacity>
                        </View>

                        {/* Card Body */}
                        <View className="p-6 items-center -mt-6">
                            {/* Photo */}
                            <View className="w-28 h-28 rounded-full border-4 border-white shadow-xl bg-gray-200 p-1 mb-4">
                                {user?.photo?.asset?.url ? (
                                    <Image
                                        source={{ uri: user.photo.asset.url }}
                                        style={{ width: '100%', height: '100%', borderRadius: 999 }}
                                    />
                                ) : (
                                    <View className="h-full w-full bg-emerald-100 rounded-full items-center justify-center">
                                        <User size={48} color={COLORS.primary} />
                                    </View>
                                )}
                            </View>

                            <Text className="text-2xl font-bold text-gray-900 text-center mb-1">{user?.fullName}</Text>
                            <Text className="text-gray-500 font-medium mb-6">Class {user?.admissionFor} • Roll #{user?.rollNumber}</Text>

                            {/* QR Code */}
                            <View className="bg-white p-4 rounded-xl border-2 border-dashed border-gray-200 mb-6">
                                <QRCode
                                    value={`GR NO: ${user?.grNumber}`}
                                    size={150}
                                    color="black"
                                    backgroundColor="white"
                                />
                            </View>

                            {/* Footer Info */}
                            <View className="w-full bg-gray-50 rounded-2xl p-4 flex-row justify-between">
                                <View>
                                    <Text className="text-gray-400 text-[10px] font-bold uppercase">GR Number</Text>
                                    <Text className="text-gray-900 font-bold text-lg">{user?.grNumber}</Text>
                                </View>
                                <View className="items-end">
                                    <Text className="text-gray-400 text-[10px] font-bold uppercase">Valid Until</Text>
                                    <Text className="text-gray-900 font-bold text-lg">Dec 2026</Text>
                                </View>
                            </View>
                        </View>

                        {/* Decorative Bottom Strip */}
                        <View className="bg-emerald-600 h-2 w-full" />
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
