import { View, Text, TextInput, Pressable, StyleSheet, StatusBar, Alert } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWebSocket } from '../context/WebSocketContext';
import { Platform } from 'react-native';

export default function LoginScreen() {
  const loginPasswordRef = useRef<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const {
    sendEncryptedMessage,
    sessionKey,
    addMessageListener,
    removeMessageListener,
  } = useWebSocket();

  useEffect(() => {
    if (!sessionKey) return;

    const handleLoginResponse = async (data: any) => {
      console.log('🔐 Login response received:', data);

      if (data.success) {
        console.log('✅ Login successful:', data);
        console.log(`Password: ${loginPasswordRef.current}`);

        await AsyncStorage.setItem('username', username);
        if (loginPasswordRef.current) {
          await AsyncStorage.setItem('password', loginPasswordRef.current);
        }

        setTimeout(() => {
          setLoading(false);
          router.replace('/screens/Home');
        }, 300);
      } else {
        console.log('❌ Login failed:', data.error);
        Alert.alert('Login Failed', data.error || 'Unknown error');
        setLoading(false);
      }
    };

    addMessageListener('login', handleLoginResponse);

    return () => {
      removeMessageListener('login', handleLoginResponse);
    };
  }, [sessionKey, addMessageListener, removeMessageListener, router, username]);

  const handleLogin = () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Please enter username and password');
      return;
    }
    setLoading(true);
    loginPasswordRef.current = password; // Set password for this attempt

    sendEncryptedMessage({
      action: 'login',
      username: username.trim(),
      password: password.trim(),
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />

      <Text style={styles.logo}>Audara</Text>

      <View style={styles.inputGroup}>
        <TextInput
          placeholder="Username"
          placeholderTextColor="#b3b3b3"
          value={username}
          onChangeText={setUsername}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
        />

        <TextInput
          placeholder="Password"
          placeholderTextColor="#b3b3b3"
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          secureTextEntry
          autoCapitalize="none"
          returnKeyType="go"
        />
      </View>

      <Pressable
        style={({ pressed }) => [styles.loginButton, pressed && styles.loginButtonPressed]}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.loginButtonText}>{loading ? 'Logging in...' : 'Log In'}</Text>
      </Pressable>

      <Pressable onPress={() => router.push('/signup')}>
        <Text style={styles.signupText}>Don't have an account? Sign up.</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#121212', 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 30 
  },
  logo: { 
    color: '#1DB954', 
    fontSize: 48, 
    fontWeight: 'bold', 
    marginBottom: 50 
  },
  inputGroup: { 
    width: '100%', 
    maxWidth: Platform.OS === 'web' ? 400 : undefined, // Limit width on web
    marginBottom: 25 
  },
  input: { 
    backgroundColor: '#282828', 
    borderRadius: 25, 
    paddingVertical: 15, 
    paddingHorizontal: 20, 
    fontSize: 16, 
    color: 'white', 
    marginBottom: 15, 
    width: '100%' 
  },
  loginButton: { 
    backgroundColor: '#1DB954', 
    borderRadius: 25, 
    paddingVertical: 15, 
    paddingHorizontal: 30, 
    width: '80%', 
    maxWidth: Platform.OS === 'web' ? 250 : undefined, // Limit width on web
    alignItems: 'center', 
    marginBottom: 20 
  },
  loginButtonPressed: { 
    backgroundColor: '#17a94d' 
  },
  loginButtonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  signupText: { 
    color: '#b3b3b3', 
    fontSize: 14, 
    marginTop: 10 
  },
});
