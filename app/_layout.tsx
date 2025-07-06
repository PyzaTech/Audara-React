import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { WebSocketProvider } from './context/WebSocketContext';
import { AudioPlayerProvider } from './context/AudioPlayerContext';

export default function Layout() {
  return (
    <SafeAreaProvider>
      <WebSocketProvider>
        <AudioPlayerProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </AudioPlayerProvider>
      </WebSocketProvider>
    </SafeAreaProvider>
  );
}
