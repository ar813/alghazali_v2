import React, { useEffect, useState, useCallback, memo } from 'react';
import { View, Text, Dimensions, ActivityIndicator } from 'react-native';
import { LineChart } from "react-native-chart-kit";
import { COLORS } from '../theme/colors';
import { getLocalDateString } from '../lib/date.utils';
import { db } from '../lib/firebase';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';

const { width } = Dimensions.get("window");

function AttendanceChart() {
    const [data, setData] = useState([0, 0, 0, 0, 0]);
    const [labels, setLabels] = useState(["", "", "", "", ""]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const days = [];
            const queriesPromise = [];

            // Get last 7 days (Weekly View)
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const format = getLocalDateString(d);

                days.push(d.toLocaleDateString('en-GB', { weekday: 'short' })); // Mon, Tue...

                const q = query(
                    collection(db, "daily_attendance"),
                    where("date", "==", format),
                    where("status", "==", "present")
                );
                queriesPromise.push(getCountFromServer(q));
            }

            // Execute all queries in PARALLEL
            const snapshots = await Promise.all(queriesPromise);
            const countsData = snapshots.map(snap => snap.data().count);

            setLabels(days);
            setData(countsData);

            // Calculate Average (Optional: could be displayed)
            const total = countsData.reduce((a, b) => a + b, 0);
            const avg = Math.round(total / 7);
            // We can pass this to parent or store in state if needed later
        } catch (error) {
            console.error("Chart Data Error:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) {
        return (
            <View className="h-48 justify-center items-center bg-white rounded-3xl m-6 mt-0 shadow-sm border border-gray-100">
                <ActivityIndicator color={COLORS.primary} />
            </View>
        );
    }

    // Chart Data Fix: If data is all zeros, we still want to render the graph (just flat)
    const chartData = data.every(val => val === 0) ? [0, 0, 0, 0, 0] : data;

    return (
        <View className="w-full bg-white rounded-[24px] p-5 shadow-lg shadow-gray-200 border border-gray-50 mb-8">
            <View className="flex-row justify-between items-center mb-4">
                <View>
                    <Text className="text-gray-900 font-bold text-lg">Weekly Trends</Text>
                    <Text className="text-gray-400 text-xs">Last 7 days activity</Text>
                </View>
                <View className="bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                    <Text className="text-emerald-700 font-bold text-[10px] uppercase">Live</Text>
                </View>
            </View>

            <LineChart
                data={{
                    labels: labels,
                    datasets: [{ data: chartData }]
                }}
                width={width - 88} // Adjusted for padding
                height={160}
                yAxisInterval={1}
                withInnerLines={false}
                withOuterLines={false}
                withVerticalLines={false}
                withHorizontalLines={true}
                chartConfig={{
                    backgroundColor: "#ffffff",
                    backgroundGradientFrom: "#ffffff",
                    backgroundGradientTo: "#ffffff",
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, // Emerald Color
                    labelColor: (opacity = 1) => `rgba(156, 163, 175, ${opacity})`, // Gray-400
                    style: { borderRadius: 16 },
                    propsForDots: {
                        r: "4",
                        strokeWidth: "2",
                        stroke: "#ffffff"
                    },
                    fillShadowGradientFrom: "#10B981",
                    fillShadowGradientTo: "#ffffff",
                    fillShadowGradientOpacity: 0.3,
                }}
                bezier
                style={{
                    marginVertical: 4,
                    borderRadius: 16,
                    paddingRight: 30 // Fix right label clipping
                }}
            />
        </View>
    );
}

export default memo(AttendanceChart);
