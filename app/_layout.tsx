import "../global.css";
import { Stack } from "expo-router";
import { AuthProvider } from "../context/AuthContext";
import { LabelProvider } from '../context/LabelContext';
import { ThemeProvider } from '../context/ThemeContext';
import { NetworkProvider } from '../context/NetworkContext';
import { WebSocketProvider } from '../context/WebSocketContext';
import { useAuth } from "../context/AuthContext";
import { useEffect } from "react";
import { useRouter, useSegments } from "expo-router";
import { View, ActivityIndicator, Platform } from "react-native";
// Configure how notifications are handled when the app is open
/*
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});
*/

// Separate component to handle protection logic since it needs to be inside AuthProvider
function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Request notification permissions
    /*
    async function requestPermissions() {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        await Notifications.requestPermissionsAsync();
      }

      if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }
    }

    requestPermissions();
    */

    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Redirect to tabs if authenticated
      router.replace('/(drawer)');
    }
  }, [user, segments, isLoading]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(drawer)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="notes/create" />
      <Stack.Screen name="notes/edit/[id]" />
    </Stack>
  );
}

import { AudioProvider } from '../context/AudioContext';
import MiniAudioPlayer from '../components/MiniAudioPlayer';

// ... existing code ...

export default function RootLayout() {
  return (
    <NetworkProvider>
      <AuthProvider>
        <WebSocketProvider>
          <ThemeProvider>
            <LabelProvider>
              <AudioProvider>
                <View style={{ flex: 1 }}>
                  <RootLayoutNav />
                  <MiniAudioPlayer />
                </View>
              </AudioProvider>
            </LabelProvider>
          </ThemeProvider>
        </WebSocketProvider>
      </AuthProvider>
    </NetworkProvider>
  );
}
