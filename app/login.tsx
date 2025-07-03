import { View, Text, TextInput, Pressable, StyleSheet, StatusBar, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWebSocket } from './context/WebSocketContext';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const {
    sendEncryptedMessage,
    sessionKey,
    decryptMessage,
    addMessageListener,
    removeMessageListener,
  } = useWebSocket();

  useEffect(() => {
    if (!sessionKey) return; // wait for sessionKey before listening

    const handleLoginResponse = (data: any) => {
      console.log('🔐 Login response received:', data);

      if (data.success) {
        console.log('✅ Login successful:', data);

        AsyncStorage.setItem('username', data.username);
        AsyncStorage.setItem('password', data.password);

        setLoading(false);
        router.replace('/home');
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
  }, [sessionKey, addMessageListener, removeMessageListener, router]);

  const handleLogin = () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Please enter username and password');
      return;
    }
    setLoading(true);

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
          returnKeyType="done"
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
  container: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  logo: { color: '#1DB954', fontSize: 48, fontWeight: 'bold', marginBottom: 50 },
  inputGroup: { width: '100%', marginBottom: 25 },
  input: { backgroundColor: '#282828', borderRadius: 25, paddingVertical: 15, paddingHorizontal: 20, fontSize: 16, color: 'white', marginBottom: 15 },
  loginButton: { backgroundColor: '#1DB954', borderRadius: 25, paddingVertical: 15, paddingHorizontal: 30, width: '80%', alignItems: 'center', marginBottom: 20 },
  loginButtonPressed: { backgroundColor: '#17a94d' },
  loginButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  signupText: { color: '#b3b3b3', fontSize: 14, marginTop: 10 },
});
