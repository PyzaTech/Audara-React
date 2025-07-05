import { useState, useEffect } from 'react';
import { View, TextInput, Text, Pressable, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useWebSocket } from './context/WebSocketContext';

export default function SelectServer() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { connect, isConnected } = useWebSocket();

  const isValidWebSocketUrl = (input: string): boolean => {
    try {
      const url = new URL(input);
      return url.protocol === 'ws:' || url.protocol === 'wss:';
    } catch {
      return false;
    }
  };

  const normalizeWebSocketUrl = (input: string): string => {
    let formatted = input.trim();

    // If user just types example.com -> make it ws://example.com
    if (!formatted.startsWith('ws://') && !formatted.startsWith('wss://')) {
      formatted = 'ws://' + formatted;
    }

    return formatted;
  };

  // const connectToServer = async () => {
  //   if (!url.trim()) {
  //     Alert.alert('Missing URL', 'Please enter a server URL.');
  //     return;
  //   }

  //   const normalizedUrl = normalizeWebSocketUrl(url);

  //   if (!isValidWebSocketUrl(normalizedUrl)) {
  //     Alert.alert('Invalid URL', 'Please enter a valid WebSocket URL starting with ws:// or wss://');
  //     return;
  //   }

  //   setLoading(true);

  //   try {
  //     // Connect and wait until connected or error
  //     const ws = new WebSocket(normalizedUrl);

  //     ws.onopen = async () => {
  //       console.log('WebSocket connected');
  //       await AsyncStorage.setItem('server_url', normalizedUrl);

  //       connect(normalizedUrl); // Now safe to register to your WebSocketContext
  //       setLoading(false);
  //       router.replace('/start');
  //     };

  //     ws.onerror = () => {
  //       setLoading(false);
  //       Alert.alert('Connection Failed', 'Unable to connect to the provided server.');
  //     };

  //     ws.onclose = () => {
  //       if (!isConnected) {
  //         setLoading(false);
  //         Alert.alert('Disconnected', 'The connection was closed.');
  //       }
  //     };
  //   } catch (e) {
  //     console.error('Unexpected error during connect:', e);
  //     setLoading(false);
  //     Alert.alert('Connection Error', 'Something went wrong while trying to connect.');
  //   }
  // };

  const connectToServer = async () => {
    if (!url.trim()) {
      Alert.alert('Missing URL', 'Please enter a server URL.');
      return;
    }

    console.log('Original URL:', url);
    const normalizedUrl = normalizeWebSocketUrl(url);
    console.log('Normalized URL:', normalizedUrl);

    if (!isValidWebSocketUrl(normalizedUrl)) {
      Alert.alert('Invalid URL', `Invalid WebSocket URL: ${normalizedUrl}`);
      setLoading(false);
      return;
    }


    setLoading(true);

    try {
      // Call the context connect method directly
      await connect(normalizedUrl);
    } catch (e) {
      console.error('Unexpected error during connect:', e);
      setLoading(false);
      Alert.alert('Connection Error', 'Something went wrong while trying to connect.');
    }
  };

  // Navigate when connected
  useEffect(() => {
    if (isConnected) {
      const normalizedUrl = normalizeWebSocketUrl(url);
      AsyncStorage.setItem('server_url', normalizedUrl)
        .then(() => {
          setLoading(false);
          router.replace('/start');
        })
        .catch((err) => {
          setLoading(false);
          console.error('Failed to save server URL:', err);
          Alert.alert('Error', 'Failed to save server URL.');
        });
    }
  }, [isConnected]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      style={styles.container}
    >
      <View style={styles.logoContainer}>
        <Text style={styles.logo}>Audara</Text>
      </View>
      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Enter your server URL"
          placeholderTextColor="#b3b3b3"
          value={url}
          onChangeText={setUrl}
          style={styles.input}
          autoCapitalize="none"
          keyboardType="url"
          autoCorrect={false}
          editable={!loading}
          returnKeyType="go"
          onSubmitEditing={connectToServer}
        />
      </View>

      <Pressable
        onPress={connectToServer}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
          loading && styles.buttonDisabled,
        ]}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Connecting...' : 'CONNECT'}</Text>
      </Pressable>

      <Text style={styles.footerText}>
        Enter the WebSocket server URL to connect.
      </Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    paddingHorizontal: 30,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logo: {
    color: '#1DB954',
    fontSize: 48,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  inputContainer: {
    marginBottom: 25,
  },
  input: {
    backgroundColor: '#282828',
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 20,
    fontSize: 18,
    color: 'white',
  },
  button: {
    backgroundColor: '#1DB954',
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: 'center',
  },
  buttonPressed: {
    backgroundColor: '#17a94d',
  },
  buttonDisabled: {
    backgroundColor: '#888',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 1,
  },
  footerText: {
    marginTop: 40,
    color: '#b3b3b3',
    textAlign: 'center',
    fontSize: 14,
  },
});
