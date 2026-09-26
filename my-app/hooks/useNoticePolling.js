import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { getNotices } from '../lib/sanity';
import { NotificationService } from '../services/notification.service';

const LAST_NOTICE_KEY = 'last_notice_id';
const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Custom hook to poll for new notices and send push notifications
 * @param {string} className - Student's class for filtering notices
 */
export const useNoticePolling = (className) => {
    const intervalRef = useRef(null);
    const appState = useRef(AppState.currentState);

    const checkForNewNotices = async () => {
        try {
            // Get last seen notice ID from storage
            const lastNoticeId = await AsyncStorage.getItem(LAST_NOTICE_KEY);

            // Fetch latest notices
            const notices = await getNotices(className);

            if (notices && notices.length > 0) {
                const latestNotice = notices[0]; // Already sorted by createdAt desc

                // If this is a new notice (different from last seen)
                if (lastNoticeId !== latestNotice._id) {
                    // Send push notification
                    await NotificationService.scheduleNoticeNotification(
                        latestNotice.title,
                        latestNotice.content
                    );

                    // Update last seen notice ID
                    await AsyncStorage.setItem(LAST_NOTICE_KEY, latestNotice._id);
                    console.log('🔔 New notice detected and notification sent');
                }
            }
        } catch (error) {
            console.error('Error checking for new notices:', error);
        }
    };

    const startPolling = () => {
        // Clear any existing interval
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        // Check immediately on start
        checkForNewNotices();

        // Then poll every 5 minutes
        intervalRef.current = setInterval(checkForNewNotices, POLL_INTERVAL);
        console.log('✅ Notice polling started');
    };

    const stopPolling = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
            console.log('⏸️ Notice polling stopped');
        }
    };

    useEffect(() => {
        // Handle app state changes (foreground/background)
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (
                appState.current.match(/inactive|background/) &&
                nextAppState === 'active'
            ) {
                // App came to foreground, start polling
                startPolling();
            } else if (nextAppState.match(/inactive|background/)) {
                // App went to background, stop polling
                stopPolling();
            }
            appState.current = nextAppState;
        });

        // Start polling when hook mounts (if app is active)
        if (AppState.currentState === 'active') {
            startPolling();
        }

        // Cleanup on unmount
        return () => {
            stopPolling();
            subscription.remove();
        };
    }, [className]);

    return { checkForNewNotices }; // Export manual check function if needed
};
