import React, { useEffect } from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AlertProvider } from './context/AlertContext';
import { AuthProvider } from './context/AuthContext';
import { NotificationService } from './services/notification.service';

// Screens
import SplashScreen from './app/SplashScreen';
import LoginScreen from './app/LoginScreen';
import DashboardScreen from './app/DashboardScreen';
import StudentListScreen from './app/StudentListScreen';
import AddStudentScreen from './app/AddStudentScreen';
import AttendanceListScreen from './app/AttendanceListScreen';
import StudentDetailScreen from './app/StudentDetailScreen';
import ScannerScreen from './app/ScannerScreen';
import HolidaysScreen from './app/HolidaysScreen';
import AboutScreen from './app/AboutScreen';
import StudentDashboard from './app/StudentDashboard';
import StudentHolidaysScreen from './app/StudentHolidaysScreen';
import ProfileScreen from './app/ProfileScreen';
import ScheduleScreen from './app/ScheduleScreen';
import QuizResultsScreen from './app/QuizResultsScreen';
import NoticesScreen from './app/NoticesScreen';
import FeesScreen from './app/FeesScreen';
import AttendanceHistoryScreen from './app/AttendanceHistoryScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  useEffect(() => {
    async function setupNotifications() {
      try {
        const hasPermission = await NotificationService.registerForPushNotificationsAsync();
        if (hasPermission) {
          await NotificationService.scheduleDailyReminder();
          console.log('🔔 Notifications setup complete');
        } else {
          console.warn('⚠️ Notification permission not granted');
        }
      } catch (error) {
        console.error('❌ Notification setup failed:', error);
      }
    }
    setupNotifications();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AlertProvider>
        <AuthProvider>
          <NavigationContainer>
            <StatusBar style="dark" />
            <Stack.Navigator
              initialRouteName="Splash"
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#FFFFFF' },
                animation: 'fade_from_bottom',
                animationDuration: 400,
              }}
            >
              <Stack.Screen name="Splash" component={SplashScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Dashboard" component={DashboardScreen} />
              <Stack.Screen name="StudentList" component={StudentListScreen} />
              <Stack.Screen name="StudentDetail" component={StudentDetailScreen} />
              <Stack.Screen name="AttendanceList" component={AttendanceListScreen} />
              <Stack.Screen name="AddStudent" component={AddStudentScreen} />
              <Stack.Screen name="Scanner" component={ScannerScreen} />
              <Stack.Screen name="Holidays" component={HolidaysScreen} />
              <Stack.Screen name="About" component={AboutScreen} />
              {/* Student Portal Screens */}
              <Stack.Screen name="StudentDashboard" component={StudentDashboard} />
              <Stack.Screen name="StudentHolidays" component={StudentHolidaysScreen} />
              <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
              <Stack.Screen name="ScheduleScreen" component={ScheduleScreen} />
              <Stack.Screen name="QuizResultsScreen" component={QuizResultsScreen} />
              <Stack.Screen name="NoticesScreen" component={NoticesScreen} />
              <Stack.Screen name="FeesScreen" component={FeesScreen} />
              <Stack.Screen name="AttendanceHistoryScreen" component={AttendanceHistoryScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </AuthProvider>
      </AlertProvider>
    </GestureHandlerRootView>
  );
}
