import React, { useState, useEffect, useRef } from "react";
import { Text, View, StyleSheet, TouchableOpacity, Alert, Dimensions, Modal, TextInput, ActivityIndicator, Vibration, Animated, InteractionManager, AppState } from "react-native";
import { CameraView, Camera } from "expo-camera";
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { X, Zap, ZapOff, Keyboard, CheckCircle, AlertTriangle, XCircle } from 'lucide-react-native';
import { useAudioPlayer } from 'expo-audio';
import { useAlert } from '../context/AlertContext';
import { ALERT_TYPES } from '../components/CustomAlert';

import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { COLORS } from '../theme/colors';
import { getStudentFromCache, isOnline, queueAttendance } from '../lib/offline';
import { getLocalDateString } from '../lib/date.utils';

const { width } = Dimensions.get('window');
const SCAN_SIZE = 250;
const SUCCESS_SOUND = require('../assets/sounds/beep_short.ogg');

export default function ScannerScreen() {
    const navigation = useNavigation();
    const isFocused = useIsFocused();
    const [hasPermission, setHasPermission] = useState(null);
    const [scanned, setScanned] = useState(false);
    const [torch, setTorch] = useState(false);
    const [zoom, setZoom] = useState(0);
    const [processing, setProcessing] = useState(false);
    const [manualModalVisible, setManualModalVisible] = useState(false);
    const [manualGr, setManualGr] = useState('');
    const { showAlert } = useAlert();

    // Continuous Mode State
    const [sessionCount, setSessionCount] = useState(0);
    const [scanResult, setScanResult] = useState(null); // { name, status, color, message }
    const slideAnim = useRef(new Animated.Value(-150)).current;

    const player = useAudioPlayer(SUCCESS_SOUND);

    const [appActive, setAppActive] = useState(true);
    const lastScanTime = useRef(0);

    // App State Listener (Pause Camera in Background)
    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            setAppActive(nextAppState === 'active');
        });
        return () => subscription.remove();
    }, []);

    useEffect(() => {
        if (isFocused) {
            setScanned(false);
            setProcessing(false);
            setZoom(0);
            lastScanTime.current = 0;
        }
    }, [isFocused]);

    useEffect(() => {
        InteractionManager.runAfterInteractions(async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === "granted");
        });
    }, []);

    const showScanFeedback = (result) => {
        setScanResult(result);

        // Slide Down Effect
        Animated.spring(slideAnim, {
            toValue: 50, // Top margin
            useNativeDriver: true,
            friction: 5
        }).start();

        // Auto Hide & Reset after 2 seconds
        setTimeout(() => {
            Animated.timing(slideAnim, {
                toValue: -150,
                duration: 300,
                useNativeDriver: true
            }).start(() => setScanResult(null));

            // Reset Scanner (Continuous Mode)
            setScanned(false);
        }, 2000);
    };

    const processGrNumber = async (grNumber) => {
        setProcessing(true);
        try {
            // Offline logic imported at top-level
            const student = await getStudentFromCache(grNumber);

            if (!student) {
                Vibration.vibrate(400);
                showScanFeedback({
                    status: 'error',
                    title: 'Not Found',
                    message: `GR ${grNumber} missing`,
                    color: '#EF4444'
                });
                return;
            }

            const today = getLocalDateString();
            const timestamp = Date.now();
            const record = {
                grNumber,
                studentName: student.fullName,
                class: student.admissionFor || 'N/A',
                rollNumber: student.rollNumber || 'N/A',
                photoUrl: student.photo?.asset?.url || null,
                date: today,
                timestamp
            };

            // Timeout wrapper for network check to prevent hanging
            const onlinePromise = isOnline();
            const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(false), 3000)); // Assume offline after 3s
            const online = await Promise.race([onlinePromise, timeoutPromise]);

            if (!online) {
                await queueAttendance(record);
                Vibration.vibrate(100);
                setSessionCount(prev => prev + 1);
                showScanFeedback({
                    status: 'success',
                    title: 'Saved Offline',
                    message: student.fullName,
                    color: '#F59E0B' // Amber for offline
                });
            } else {
                const studentRef = doc(db, 'attendance', String(grNumber), 'history', today);
                const snapshot = await getDoc(studentRef);

                if (snapshot.exists()) {
                    Vibration.vibrate([0, 50, 50, 50]); // Short double vibe
                    showScanFeedback({
                        status: 'warning',
                        title: 'Already Marked',
                        message: student.fullName,
                        color: '#3B82F6' // Blue for info
                    });
                    return;
                }

                await setDoc(studentRef, { status: 'present', timestamp, studentName: student.fullName, class: student.admissionFor || 'N/A', grNumber });
                await setDoc(doc(db, 'daily_attendance', `${today}_${grNumber}`), record);

                // RECORD CLASS SESSION (for implicit absent calculation)
                if (student.admissionFor) {
                    await setDoc(doc(db, 'class_sessions', `${student.admissionFor}_${today}`), {
                        className: student.admissionFor,
                        date: today,
                        timestamp
                    });
                }

                Vibration.vibrate(100);
                player.play();
                setSessionCount(prev => prev + 1);

                showScanFeedback({
                    status: 'success',
                    title: 'Marked Present',
                    message: student.fullName,
                    color: '#10B981' // Green
                });
            }
        } catch (error) {
            Vibration.vibrate(400);
            showScanFeedback({
                status: 'error',
                title: 'Error',
                message: "Scan Failed",
                color: '#EF4444'
            });
        } finally {
            setProcessing(false);
        }
    };

    const resetScan = () => {
        setScanned(false);
        setProcessing(false);
        setManualGr('');
    };

    const handleBarCodeScanned = async ({ data }) => {
        const now = Date.now();
        if (now - lastScanTime.current < 2000) return; // Throttle: 2 seconds

        if (processing || scanned) return;

        lastScanTime.current = now;
        setScanned(true);
        const match = data.match(/GR\s*N?O?\.?\s*[:\-\s]?\s*(\d+)/i);
        if (!match) {
            // Only show alert if enough time has passed to avoid spamming
            showAlert({ title: "Parse Error", message: "GR No not found.", type: ALERT_TYPES.ERROR, buttons: [{ text: "Retry", onPress: resetScan }] });
            return;
        }
        await processGrNumber(match[1]);
    };

    const handleManualSubmit = () => {
        if (!manualGr.trim()) return;
        setManualModalVisible(false);
        setScanned(true);
        processGrNumber(manualGr.trim());
    };

    if (hasPermission === null) return <View style={styles.center}><Text>Requesting camera...</Text></View>;
    if (hasPermission === false) return <View style={styles.center}><Text>No camera access</Text></View>;

    return (
        <View style={styles.container}>
            {/* Camera */}
            {/* Camera - Only render when focused to prevent freezing */}
            {isFocused && appActive && hasPermission && (
                <CameraView
                    style={StyleSheet.absoluteFill}
                    enableTorch={torch}
                    zoom={zoom}
                    autoFocus="on"
                    onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                    barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                />
            )}

            {/* Dim Overlay with Cutout */}
            <View style={styles.overlay}>
                <View style={styles.dimArea} />
                <View style={styles.middleRow}>
                    <View style={styles.dimArea} />
                    <View style={styles.scanBox}>
                        {/* Top-Left */}
                        <View style={[styles.cornerBase, { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4 }]} />
                        {/* Top-Right */}
                        <View style={[styles.cornerBase, { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4 }]} />
                        {/* Bottom-Left */}
                        <View style={[styles.cornerBase, { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4 }]} />
                        {/* Bottom-Right */}
                        <View style={[styles.cornerBase, { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4 }]} />
                    </View>
                    <View style={styles.dimArea} />
                </View>
                <View style={styles.dimArea} />
            </View>

            {/* Top Buttons - Moved zIndex up */}
            <View style={[styles.topBar, { zIndex: 20 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btn}>
                    <X color="white" size={26} />
                </TouchableOpacity>

                {/* Session Counter */}
                <View style={styles.counterPill}>
                    <Text style={styles.counterLabel}>Session</Text>
                    <Text style={styles.counterValue}>{sessionCount}</Text>
                </View>

                <TouchableOpacity onPress={() => setTorch(t => !t)} style={[styles.btn, torch && { backgroundColor: '#facc15' }]}>
                    {torch ? <Zap color="black" size={22} /> : <ZapOff color="white" size={22} />}
                </TouchableOpacity>
            </View>

            {/* Custom Top Toast Notification */}
            <Animated.View
                style={[
                    styles.toastContainer,
                    { transform: [{ translateY: slideAnim }] },
                    scanResult?.color && { borderLeftColor: scanResult.color }
                ]}
            >
                <View style={[styles.toastIcon, { backgroundColor: scanResult ? scanResult.color + '20' : 'transparent' }]}>
                    {scanResult?.status === 'success' && <CheckCircle size={24} color={scanResult.color} />}
                    {scanResult?.status === 'error' && <XCircle size={24} color={scanResult.color} />}
                    {scanResult?.status === 'warning' && <AlertTriangle size={24} color={scanResult.color} />}
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.toastTitle}>{scanResult?.title}</Text>
                    <Text style={styles.toastMessage}>{scanResult?.message}</Text>
                </View>
            </Animated.View>

            {/* Bottom Controls */}
            <View style={styles.bottomBar}>
                <Text style={styles.hint}>Align QR Code</Text>
                <View style={styles.zoomRow}>
                    {[0, 0.15, 0.35].map((z, i) => (
                        <TouchableOpacity key={i} onPress={() => setZoom(z)} style={[styles.zoomBtn, zoom === z && styles.zoomActive]}>
                            <Text style={[styles.zoomTxt, zoom === z && { color: '#fff' }]}>{['1x', '1.5x', '2x'][i]}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <TouchableOpacity onPress={() => setManualModalVisible(true)} style={styles.manualBtn}>
                    <Keyboard color="white" size={18} />
                    <Text style={styles.manualTxt}>Enter GR</Text>
                </TouchableOpacity>
            </View>

            {/* Loading */}
            {processing && (
                <View style={styles.loading}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={{ color: '#fff', marginTop: 10 }}>Processing...</Text>
                </View>
            )}

            {/* Manual Modal */}
            <Modal visible={manualModalVisible} transparent animationType="fade" onRequestClose={() => setManualModalVisible(false)}>
                <View style={styles.modalBg}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Enter GR Number</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={manualGr}
                            onChangeText={setManualGr}
                            placeholder="e.g. 4291"
                            keyboardType="numeric"
                            autoFocus
                        />
                        <View style={styles.modalBtns}>
                            <TouchableOpacity onPress={() => setManualModalVisible(false)} style={styles.cancelBtn}>
                                <Text style={{ color: '#555' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleManualSubmit} style={styles.submitBtn}>
                                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Submit</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    overlay: { ...StyleSheet.absoluteFillObject },
    dimArea: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
    middleRow: { flexDirection: 'row', height: SCAN_SIZE },
    scanBox: { width: SCAN_SIZE, height: SCAN_SIZE, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
    cornerBase: { position: 'absolute', width: 28, height: 28, borderColor: COLORS.primary },

    topBar: { position: 'absolute', top: 50, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    btn: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },

    counterPill: { backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    counterLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginRight: 6, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    counterValue: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

    toastContainer: {
        position: 'absolute',
        top: 0,
        left: 20,
        right: 20,
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 10,
        zIndex: 100,
        borderLeftWidth: 5,
    },
    toastIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    toastTitle: { fontWeight: 'bold', fontSize: 16, color: '#1F2937' },
    toastMessage: { color: '#6B7280', fontSize: 14, marginTop: 2 },

    bottomBar: { position: 'absolute', bottom: 60, left: 0, right: 0, alignItems: 'center' },
    hint: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 16 },
    zoomRow: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 24, padding: 4, marginBottom: 20 },
    zoomBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 18 },
    zoomActive: { backgroundColor: COLORS.primary },
    zoomTxt: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600' },
    manualBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 22, paddingVertical: 14, borderRadius: 28 },
    manualTxt: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },

    loading: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center' },

    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalCard: { width: '100%', maxWidth: 300, backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center' },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
    modalInput: { width: '100%', height: 50, borderWidth: 1, borderColor: '#ddd', borderRadius: 12, textAlign: 'center', fontSize: 20, marginBottom: 20 },
    modalBtns: { flexDirection: 'row', gap: 12 },
    cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#eee', alignItems: 'center' },
    submitBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center' },
});
