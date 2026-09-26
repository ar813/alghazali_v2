import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications behave when the app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export const NotificationService = {
    // 1. Request Permissions
    async registerForPushNotificationsAsync() {
        let token;

        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('daily-reminder', {
                name: 'Daily Attendance Reminder',
                importance: Notifications.AndroidImportance.HIGH,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            return null;
        }

        // We aren't using remote push, so we strictly don't need a token, 
        // but it's good practice for future.
        // token = (await Notifications.getExpoPushTokenAsync()).data;
        return true;
    },

    // 2. Schedule Daily Notification
    async scheduleDailyReminder() {
        // Cancel existing first to avoid duplicates
        await Notifications.cancelAllScheduledNotificationsAsync();

        // Schedule for 12:00 PM daily
        const identifier = await Notifications.scheduleNotificationAsync({
            content: {
                title: "📊 Attendance Update",
                body: "Daily attendance summary is ready to view. Tap to check!",
                sound: true,
                badge: 1,
            },
            trigger: {
                type: 'daily',           // Required for daily repeating
                hour: 12,
                minute: 0,
                channelId: 'daily-reminder',  // Must match channel created above
            },
        });

        console.log('✅ Daily notification scheduled with ID:', identifier);
        return identifier;
    },

    // 3. Test triggering immediately (for developer testing)
    async triggerTestNotification() {
        await Notifications.scheduleNotificationAsync({
            content: {
                title: "Test Notification",
                body: "This is how the reminder will look!",
                sound: true,
            },
            trigger: null, // Instant
        });
    },

    // 4. Schedule Notice Notification
    async scheduleNoticeNotification(noticeTitle, noticeContent) {
        try {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: `📢 ${noticeTitle}`,
                    body: noticeContent || 'New announcement posted. Tap to view!',
                    sound: true,
                    badge: 1,
                    data: { type: 'notice', screen: 'NoticesScreen' },
                },
                trigger: null, // Instant notification
            });
            console.log('✅ Notice notification sent');
        } catch (error) {
            console.error('Error scheduling notice notification:', error);
        }
    },
};
