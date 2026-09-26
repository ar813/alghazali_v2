import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useAlert } from '../context/AlertContext';
import { ALERT_TYPES } from '../components/CustomAlert';
import { useNavigation } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function AddStudentScreen() {
    const navigation = useNavigation();
    const [name, setName] = useState('');
    const [grNumber, setGrNumber] = useState('');
    const [studentClass, setStudentClass] = useState('');
    const [generatedQR, setGeneratedQR] = useState(null);
    const [loading, setLoading] = useState(false);
    const { showAlert } = useAlert();

    const handleSave = async () => {
        if (!name || !grNumber || !studentClass) {
            showAlert({ title: "Error", message: "Please fill all fields", type: ALERT_TYPES.ERROR });
            return;
        }

        setLoading(true);
        try {
            // 1. Add to Firestore
            await addDoc(collection(db, "students"), {
                fullName: name,
                grNumber: grNumber,
                admissionFor: studentClass,
                created_at: serverTimestamp()
            });

            // 2. Generate QR Value
            setGeneratedQR(grNumber);
            showAlert({ title: "Success", message: "Student Added Successfully!", type: ALERT_TYPES.SUCCESS });
        } catch (error) {
            showAlert({ title: "Error", message: error.message, type: ALERT_TYPES.ERROR });
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView className="flex-1 bg-white p-6">
            <View className="flex-row items-center mt-8 mb-6">
                <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
                    <Text className="text-xl">←</Text>
                </TouchableOpacity>
                <Text className="text-2xl font-bold text-gray-800">Add New Student</Text>
            </View>

            <View className="space-y-4">
                <View>
                    <Text className="text-gray-700 mb-1 ml-1">Full Name</Text>
                    <TextInput
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-700"
                        placeholder="e.g. Rafay"
                        value={name}
                        onChangeText={setName}
                    />
                </View>

                <View>
                    <Text className="text-gray-700 mb-1 ml-1">GR Number</Text>
                    <TextInput
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-700"
                        placeholder="e.g. 2024-001"
                        value={grNumber}
                        onChangeText={setGrNumber}
                        autoCapitalize="none"
                    />
                </View>

                <View>
                    <Text className="text-gray-700 mb-1 ml-1">Class</Text>
                    <TextInput
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-700"
                        placeholder="e.g. 8-A"
                        value={studentClass}
                        onChangeText={setStudentClass}
                    />
                </View>

                <TouchableOpacity
                    className={`w-full bg-primary p-4 rounded-xl items-center mt-6 ${loading ? 'opacity-50' : ''}`}
                    onPress={handleSave}
                    disabled={loading}
                >
                    <Text className="text-white font-bold text-lg">{loading ? 'Saving...' : 'Save & Generate QR'}</Text>
                </TouchableOpacity>
            </View>

            {/* QR Display Section */}
            {generatedQR && (
                <View className="mt-10 items-center bg-gray-50 p-6 rounded-2xl border border-dashed border-gray-300">
                    <Text className="text-gray-500 mb-4">Student QR Code</Text>
                    <View className="bg-white p-4 rounded-lg shadow-sm">
                        <QRCode value={generatedQR} size={200} />
                    </View>
                    <Text className="mt-4 font-bold text-lg">{name}</Text>
                    <Text className="text-gray-500">{generatedQR}</Text>
                </View>
            )}
        </ScrollView>
    );
}
