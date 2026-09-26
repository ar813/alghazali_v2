import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { getFeesByGR } from '../lib/sanity';
import { NotificationService } from '../services/notification.service';

const LAST_FEES_STATE_KEY = 'last_fees_state'; // Stores { id: status } map
const POLL_INTERVAL = 15 * 60 * 1000; // 15 minutes (Fees don't change as often as notices)

/**
 * Custom hook to poll for Fee status changes
 * @param {string} grNumber - Student's GR Number
 */
export const useFeePolling = (grNumber) => {
    const intervalRef = useRef(null);
    const appState = useRef(AppState.currentState);

    const checkForFeeChanges = async () => {
        if (!grNumber) return;

        try {
            // Get last known fee states
            const lastStateStr = await AsyncStorage.getItem(LAST_FEES_STATE_KEY);
            const lastState = lastStateStr ? JSON.parse(lastStateStr) : {};

            // Fetch latest fees
            const currentFees = await getFeesByGR(grNumber);

            // Build current state map { id: status }
            const currentState = {};
            currentFees.forEach(fee => {
                currentState[fee._id] = fee.status;
            });

            // Compare and Notify
            let newStateToSave = { ...lastState };
            let hasChanges = false;

            // Check for status changes or new fees
            for (const fee of currentFees) {
                const oldStatus = lastState[fee._id];
                const newStatus = fee.status;

                // Case 1: Fee was 'pending' or 'overdue' and is now 'paid'
                if (oldStatus && (oldStatus === 'pending' || oldStatus === 'overdue') && newStatus === 'paid') {
                    await NotificationService.scheduleNoticeNotification(
                        "Fee Paid Successfully ✅",
                        `Your fee for ${fee.month} has been confirmed.`
                    );
                    hasChanges = true;
                }

                // Case 2: New Fee Added (that is not paid)
                if (!oldStatus && (newStatus === 'pending' || newStatus === 'overdue')) {
                    await NotificationService.scheduleNoticeNotification(
                        "New Fee Pending 📅",
                        `Fee voucher for ${fee.month} is now available.`
                    );
                    hasChanges = true;
                }

                // Update state
                newStateToSave[fee._id] = newStatus;
            }

            // Save if there were any relevant updates (to avoid re-notifying)
            // We save the *full* current state to ensure we stay in sync
            if (JSON.stringify(lastState) !== JSON.stringify(currentState)) {
                await AsyncStorage.setItem(LAST_FEES_STATE_KEY, JSON.stringify(currentState));
                console.log('💰 Fee state updated');
            }

        } catch (error) {
            console.error('Error checking for fee updates:', error);
        }
    };

    const startPolling = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);

        checkForFeeChanges(); // Check immediately
        intervalRef.current = setInterval(checkForFeeChanges, POLL_INTERVAL);
        console.log('✅ Fee polling started');
    };

    const stopPolling = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
            console.log('⏸️ Fee polling stopped');
        }
    };

    useEffect(() => {
        if (!grNumber) return;

        const subscription = AppState.addEventListener('change', nextAppState => {
            if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
                startPolling();
            } else if (nextAppState.match(/inactive|background/)) {
                stopPolling();
            }
            appState.current = nextAppState;
        });

        if (AppState.currentState === 'active') {
            startPolling();
        }

        return () => {
            stopPolling();
            subscription.remove();
        };
    }, [grNumber]);

    return { checkForFeeChanges };
};
