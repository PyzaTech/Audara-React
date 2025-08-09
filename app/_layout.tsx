import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { WebSocketProvider } from './context/WebSocketContext';
import { AudioPlayerProvider } from './context/AudioPlayerContext';
import { AdminProvider } from './context/AdminContext';
import { StatusBar } from 'expo-status-bar';

export default function Layout() {
  return (
    <SafeAreaProvider style={{ backgroundColor: '#121212', flex: 1 }}>
      <StatusBar style="light" backgroundColor="#121212" />
      <WebSocketProvider>
        <AudioPlayerProvider>
          <AdminProvider>
            <Stack 
              screenOptions={{ 
                headerShown: false,
                animation: 'slide_from_right',
                animationDuration: 150,
                contentStyle: {
                  backgroundColor: '#121212',
                },
                animationTypeForReplace: 'push',
                presentation: 'card',
              }} 
            />
          </AdminProvider>
        </AudioPlayerProvider>
      </WebSocketProvider>
    </SafeAreaProvider>
  );
}