import React, { useEffect, useState, useCallback, memo, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, RefreshControl, ScrollView, InteractionManager } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { StudentService } from '../services/student.service';
import { ChevronLeft, Search } from 'lucide-react-native';
import { COLORS } from '../theme/colors';
import FloatingScannerButton from '../components/FloatingScannerButton';
import SkeletonCard from '../components/SkeletonCard';

// ----------------------------------------------------------------------
// Optimized Item Component
// ----------------------------------------------------------------------
const StudentItem = memo(({ item, onPress }) => {
    return (
        <TouchableOpacity
            onPress={() => onPress(item)}
            activeOpacity={0.7}
            className="bg-white p-4 mb-4 mx-6 rounded-2xl border border-gray-100 flex-row items-center active:bg-gray-50"
            style={{ elevation: 2 }}
        >
            {/* Student Image */}
            <View className="h-14 w-14 rounded-full bg-gray-200 mr-4 overflow-hidden border border-gray-100">
                {item.photo && item.photo.asset && item.photo.asset.url ? (
                    <Image
                        source={item.photo.asset.url}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                    />
                ) : (
                    <View className="h-full w-full justify-center items-center">
                        <Text className="text-2xl">👤</Text>
                    </View>
                )}
            </View>

            <View className="flex-1">
                <Text className="text-lg font-bold text-gray-800">{item.fullName}</Text>
                <View className="flex-row items-center mt-1 flex-wrap gap-2">
                    <View className="bg-blue-50 px-2 py-1 rounded-md">
                        <Text className="text-xs text-blue-600 font-bold">GR: {item.grNumber}</Text>
                    </View>
                    <View className="bg-purple-50 px-2 py-1 rounded-md">
                        <Text className="text-xs text-purple-600 font-bold">Roll: {item.rollNumber || 'N/A'}</Text>
                    </View>
                    <View className="bg-green-50 px-2 py-1 rounded-md">
                        <Text className="text-xs text-green-600 font-bold">Class: {item.admissionFor}</Text>
                    </View>
                </View>
            </View>

            <View className="bg-gray-50 p-2 rounded-full">
                <ChevronLeft size={20} color="#9CA3AF" style={{ transform: [{ rotate: '180deg' }] }} />
            </View>
        </TouchableOpacity>
    );
});

export default function StudentListScreen() {
    const navigation = useNavigation();
    const [students, setStudents] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Filters
    const [selectedClass, setSelectedClass] = useState("All");
    const [classes, setClasses] = useState(["All"]);

    const fetchStudents = async () => {
        try {
            const data = await StudentService.fetchAll();
            if (Array.isArray(data)) {
                setStudents(data);

                // Extract unique classes
                const classSet = new Set(["All"]);
                data.forEach(s => {
                    if (s.admissionFor) classSet.add(s.admissionFor);
                });

                setClasses(Array.from(classSet).sort((a, b) => {
                    if (a === 'All') return -1;
                    if (b === 'All') return 1;
                    return a.localeCompare(b, undefined, { numeric: true });
                }));
            }
        } catch (error) {
            console.error("Error fetching students list:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        InteractionManager.runAfterInteractions(() => {
            fetchStudents();
        });
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchStudents();
    };

    // Memoized Filter Logic - Extremely Fast
    const filteredStudents = useMemo(() => {
        let result = students;

        // Class Filter
        if (selectedClass !== "All") {
            result = result.filter(s => s.admissionFor === selectedClass);
        }

        // Search Filter
        if (search) {
            const lowerSearch = search.toLowerCase();
            result = result.filter(s =>
                (s.fullName && s.fullName.toLowerCase().includes(lowerSearch)) ||
                (s.grNumber && String(s.grNumber).toLowerCase().includes(lowerSearch)) ||
                (s.rollNumber && String(s.rollNumber).toLowerCase().includes(lowerSearch))
            );
        }

        // Sort by Roll Number
        return result.sort((a, b) => {
            const rollA = parseInt(a.rollNumber) || 0;
            const rollB = parseInt(b.rollNumber) || 0;
            return rollA - rollB;
        });
    }, [students, search, selectedClass]);

    const handleSearch = (text) => {
        setSearch(text);
    };

    const handleClassFilter = (cls) => {
        setSelectedClass(cls);
    };

    const renderSkeleton = () => (
        <View className="px-6 pt-4">
            {[1, 2, 3, 4, 5].map((key) => (
                <View key={key} className="flex-row items-center mb-4">
                    <SkeletonCard height={60} style={{ width: 60, borderRadius: 30, marginRight: 16, marginBottom: 0 }} />
                    <View className="flex-1">
                        <SkeletonCard height={20} style={{ width: '60%', marginBottom: 8 }} />
                        <SkeletonCard height={16} style={{ width: '40%', marginBottom: 0 }} />
                    </View>
                </View>
            ))}
        </View>
    );

    const renderItem = useCallback(({ item }) => (
        <StudentItem
            item={item}
            onPress={(student) => navigation.navigate('StudentDetail', { student })}
        />
    ), []);

    return (
        <View className="flex-1 bg-gray-50">
            {loading ? (
                renderSkeleton()
            ) : (
                <FlatList
                    data={filteredStudents}
                    keyExtractor={item => item._id || String(item.grNumber)}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} progressViewOffset={10} />
                    }
                    ListHeaderComponent={
                        <View className="pt-14 px-6 pb-4 bg-white rounded-b-3xl shadow-sm z-10 mb-6">
                            <View className="flex-row items-center mb-6">
                                <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4 bg-gray-50 p-2 rounded-full border border-gray-100">
                                    <ChevronLeft color="#374151" size={24} />
                                </TouchableOpacity>
                                <Text className="text-2xl font-bold text-gray-800">Students Directory</Text>
                            </View>

                            {/* Search Bar */}
                            <View className="flex-row items-center bg-gray-50 p-3 rounded-2xl border border-gray-200 mb-4">
                                <Search color={COLORS.gray} size={20} style={{ marginRight: 10 }} />
                                <TextInput
                                    placeholder="Search by name, roll or GR..."
                                    className="flex-1 text-gray-700 font-medium text-base h-full"
                                    placeholderTextColor={COLORS.textLight}
                                    value={search}
                                    onChangeText={handleSearch}
                                    style={{ paddingVertical: 0 }} // Fix Android text clipping
                                />
                            </View>

                            {/* Class Filters */}
                            {!loading && (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pb-1">
                                    {classes.map((cls, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            onPress={() => handleClassFilter(cls)}
                                            className={`mr-2 px-4 py-2 rounded-xl border ${selectedClass === cls ? 'bg-emerald-600 border-emerald-600' : 'bg-gray-50 border-gray-200'}`}
                                        >
                                            <Text className={`font-semibold text-xs ${selectedClass === cls ? 'text-white' : 'text-gray-600'}`}>{cls === 'All' ? 'All Classes' : `Class ${cls}`}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            )}
                        </View>
                    }
                    renderItem={({ item }) => (
                        <StudentItem
                            item={item}
                            onPress={(student) => navigation.navigate('StudentDetail', { student })}
                        />
                    )}
                    initialNumToRender={8}
                    maxToRenderPerBatch={5}
                    windowSize={5}
                    removeClippedSubviews={true}
                    getItemLayout={(data, index) => ({
                        length: 100, // Adjusted for margin/padding
                        offset: 100 * index,
                        index,
                    })}
                    ListEmptyComponent={() => (
                        <View className="items-center mt-20">
                            <Text className="text-gray-400 text-lg">No students found</Text>
                        </View>
                    )}
                />
            )}

            <FloatingScannerButton />
        </View>
    );
}
